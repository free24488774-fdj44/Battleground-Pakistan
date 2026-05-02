import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

// ─────────────────────────────────────────────────────────────────────────────
//  Inline PointerLockControls
// ─────────────────────────────────────────────────────────────────────────────
class PointerLockControls extends THREE.EventDispatcher {
  camera: THREE.Camera;
  domElement: HTMLElement;
  isLocked = false;
  private _euler = new THREE.Euler(0, 0, 0, "YXZ");
  private _PI2 = Math.PI / 2;
  private _onMouse: (e: MouseEvent) => void;
  private _onLockChange: () => void;
  private _onLockError: () => void;

  constructor(cam: THREE.Camera, el: HTMLElement) {
    super();
    this.camera = cam;
    this.domElement = el;
    this._onMouse = (e: MouseEvent) => {
      if (!this.isLocked) return;
      this._euler.setFromQuaternion(cam.quaternion);
      this._euler.y -= (e.movementX || 0) * 0.002;
      this._euler.x -= (e.movementY || 0) * 0.002;
      this._euler.x = Math.max(-this._PI2 * 0.88, Math.min(this._PI2 * 0.88, this._euler.x));
      cam.quaternion.setFromEuler(this._euler);
    };
    this._onLockChange = () => {
      this.isLocked = document.pointerLockElement === el;
      this.dispatchEvent({ type: this.isLocked ? "lock" : "unlock" });
    };
    this._onLockError = () => console.warn("PointerLock error");
    document.addEventListener("mousemove", this._onMouse);
    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("pointerlockerror", this._onLockError);
  }
  lock() { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }
  moveForward(d: number) {
    const v = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    v.crossVectors(this.camera.up, v);
    this.camera.position.addScaledVector(v, d);
  }
  moveRight(d: number) {
    const v = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    this.camera.position.addScaledVector(v, d);
  }
  dispose() {
    document.removeEventListener("mousemove", this._onMouse);
    document.removeEventListener("pointerlockchange", this._onLockChange);
    document.removeEventListener("pointerlockerror", this._onLockError);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map Configs
// ─────────────────────────────────────────────────────────────────────────────
interface MapConfig {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  terrainHeight: number;
  terrainScale: number;
  grassColor: THREE.Color;
  rockColor: THREE.Color;
  snowColor: THREE.Color;
  skyDay: THREE.Color;
  fogDensity: number;
  riverColor: number;
  npcColor: number;
  buildingColor: number;
}

const MAPS: MapConfig[] = [
  {
    id: "hunza",
    name: "Hunza Valley",
    emoji: "🏔",
    desc: "Karakoram mountain ranges with deep gorges and glaciers",
    terrainHeight: 65,
    terrainScale: 1.8,
    grassColor: new THREE.Color(0x3a7d44),
    rockColor: new THREE.Color(0x8a7460),
    snowColor: new THREE.Color(0xf0f0f8),
    skyDay: new THREE.Color(0x87ceeb),
    fogDensity: 0.005,
    riverColor: 0x1a78c2,
    npcColor: 0xe05c2a,
    buildingColor: 0xd4b896,
  },
  {
    id: "lahore",
    name: "Lahore",
    emoji: "🕌",
    desc: "Historic plains with Mughal architecture and urban sprawl",
    terrainHeight: 12,
    terrainScale: 0.7,
    grassColor: new THREE.Color(0x8cb87a),
    rockColor: new THREE.Color(0xc4a97a),
    snowColor: new THREE.Color(0xddd5c0),
    skyDay: new THREE.Color(0x9ab8d4),
    fogDensity: 0.007,
    riverColor: 0x4e8fb5,
    npcColor: 0xd46030,
    buildingColor: 0xc8a870,
  },
  {
    id: "karachi",
    name: "Karachi",
    emoji: "🌊",
    desc: "Coastal city with ocean, beaches, and concrete districts",
    terrainHeight: 8,
    terrainScale: 0.5,
    grassColor: new THREE.Color(0xc8b870),
    rockColor: new THREE.Color(0xa08850),
    snowColor: new THREE.Color(0xe8e0c0),
    skyDay: new THREE.Color(0x88bbdd),
    fogDensity: 0.009,
    riverColor: 0x0066aa,
    npcColor: 0x2288cc,
    buildingColor: 0xb0c0d0,
  },
  {
    id: "skardu",
    name: "Skardu",
    emoji: "❄️",
    desc: "High-altitude desert with dramatic cliffs and icy rivers",
    terrainHeight: 80,
    terrainScale: 2.2,
    grassColor: new THREE.Color(0x7a8f60),
    rockColor: new THREE.Color(0x6a6050),
    snowColor: new THREE.Color(0xe8eef8),
    skyDay: new THREE.Color(0x6699cc),
    fogDensity: 0.004,
    riverColor: 0x55aadd,
    npcColor: 0xcc4422,
    buildingColor: 0xb09070,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const TERRAIN_SIZE = 600;
const TERRAIN_SEGS = 100;
const NPC_COUNT = 16;
const RAIN_COUNT = 2800;
const DAY_SPEED = 0.000055;

const SKY_PHASES = [
  { t: 0.0, color: new THREE.Color(0x201020), ambient: 0.05, sun: 0.0 },   // midnight
  { t: 0.2, color: new THREE.Color(0xff8860), ambient: 0.3, sun: 0.6 },    // dawn
  { t: 0.35, color: new THREE.Color(0x87ceeb), ambient: 0.65, sun: 1.3 },  // day
  { t: 0.65, color: new THREE.Color(0x87ceeb), ambient: 0.65, sun: 1.3 },  // day
  { t: 0.75, color: new THREE.Color(0xff6030), ambient: 0.28, sun: 0.55 }, // sunset
  { t: 0.85, color: new THREE.Color(0x201020), ambient: 0.05, sun: 0.0 },  // night
  { t: 1.0, color: new THREE.Color(0x201020), ambient: 0.05, sun: 0.0 },   // midnight wrap
];

function sampleSky(t: number, tintColor: THREE.Color) {
  let i = 0;
  for (let j = 0; j < SKY_PHASES.length - 1; j++) {
    if (t >= SKY_PHASES[j].t && t < SKY_PHASES[j + 1].t) { i = j; break; }
  }
  const a = SKY_PHASES[i], b = SKY_PHASES[i + 1];
  const f = (t - a.t) / (b.t - a.t);
  const base = a.color.clone().lerp(b.color, f);
  // blend with map sky tint
  base.lerp(tintColor, 0.25);
  return { color: base, ambient: a.ambient + (b.ambient - a.ambient) * f, sun: a.sun + (b.sun - a.sun) * f };
}

interface NPC {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  dir: THREE.Vector3;
  changeT: number;
  state: "wander" | "chase" | "dead";
  id: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function World() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const [selectedMap, setSelectedMap] = useState<MapConfig | null>(null);
  const [locked, setLocked] = useState(false);
  const [hp, setHp] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [kills, setKills] = useState(0);
  const [timeLabel, setTimeLabel] = useState("Dawn");
  const [weather, setWeather] = useState<"clear" | "rain" | "storm">("clear");
  const [notice, setNotice] = useState("");
  const [miniDots, setMiniDots] = useState<{ x: number; z: number; chase: boolean }[]>([]);
  const [thunderFlash, setThunderFlash] = useState(0);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 1800);
  }, []);

  const hpRef = useRef(100);
  const ammoRef = useRef(30);
  const killsRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const npcsRef = useRef<NPC[]>([]);
  const weatherRef = useRef<"clear" | "rain" | "storm">("clear");
  const canShootRef = useRef(true);
  const mapRef = useRef<MapConfig | null>(null);

  // reset game state when map changes
  useEffect(() => {
    if (!selectedMap) return;
    mapRef.current = selectedMap;
    hpRef.current = 100; setHp(100);
    ammoRef.current = 30; setAmmo(30);
    killsRef.current = 0; setKills(0);
    npcsRef.current = [];
    weatherRef.current = "clear"; setWeather("clear");
  }, [selectedMap]);

  useEffect(() => {
    if (!selectedMap) return;
    const container = mountRef.current;
    if (!container) return;

    const cfg = selectedMap;

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 900);
    camera.position.set(0, cfg.terrainHeight * 0.3 + 8, 0);

    // ── Controls ──────────────────────────────────────────────────────────
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener("lock", () => setLocked(true));
    controls.addEventListener("unlock", () => setLocked(false));

    // ── Lights ────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 600;
    sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
    scene.add(sun);
    const moon = new THREE.DirectionalLight(0x334466, 0);
    moon.position.set(-100, 120, -80);
    scene.add(moon);

    // ── Terrain with vertex colors ─────────────────────────────────────────
    const noise2D = createNoise2D();
    function getH(x: number, z: number): number {
      const nx = x / (TERRAIN_SIZE * cfg.terrainScale);
      const nz = z / (TERRAIN_SIZE * cfg.terrainScale);
      return (
        noise2D(nx * 2, nz * 2) * 0.5 +
        noise2D(nx * 4, nz * 4) * 0.25 +
        noise2D(nx * 8, nz * 8) * 0.125 +
        noise2D(nx * 16, nz * 16) * 0.0625
      ) * cfg.terrainHeight;
    }

    const tGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
    tGeo.rotateX(-Math.PI / 2);
    const posArr = tGeo.attributes.position.array as Float32Array;
    const vCount = posArr.length / 3;
    const colors = new Float32Array(vCount * 3);

    for (let i = 0; i < vCount; i++) {
      const x = posArr[i * 3], z = posArr[i * 3 + 2];
      const h = getH(x, z);
      posArr[i * 3 + 1] = h;
      const hNorm = Math.max(0, Math.min(1, h / cfg.terrainHeight));
      let col: THREE.Color;
      if (hNorm < 0.35) {
        col = cfg.grassColor.clone().lerp(cfg.rockColor, hNorm / 0.35);
      } else if (hNorm < 0.7) {
        col = cfg.rockColor.clone();
      } else {
        col = cfg.rockColor.clone().lerp(cfg.snowColor, (hNorm - 0.7) / 0.3);
      }
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    tGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();

    const terrain = new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    terrain.receiveShadow = true;
    scene.add(terrain);

    // ── Ocean / River ──────────────────────────────────────────────────────
    const waterMat = new THREE.MeshLambertMaterial({ color: cfg.riverColor, transparent: true, opacity: 0.78 });
    if (cfg.id === "karachi") {
      // coastal water on one side
      const oceanGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 1.2, TERRAIN_SIZE * 0.5);
      oceanGeo.rotateX(-Math.PI / 2);
      const ocean = new THREE.Mesh(oceanGeo, waterMat);
      ocean.position.set(0, -1, -TERRAIN_SIZE * 0.7);
      scene.add(ocean);
      // beach strip
      const beachGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, 40);
      beachGeo.rotateX(-Math.PI / 2);
      const beach = new THREE.Mesh(beachGeo, new THREE.MeshLambertMaterial({ color: 0xd4c090 }));
      beach.position.set(0, 0.1, -TERRAIN_SIZE * 0.4);
      scene.add(beach);
    } else {
      const riverGeo = new THREE.PlaneGeometry(20, TERRAIN_SIZE);
      riverGeo.rotateX(-Math.PI / 2);
      const river = new THREE.Mesh(riverGeo, waterMat);
      river.position.set(-38, 0.5, 0);
      scene.add(river);
    }

    // ── Roads ─────────────────────────────────────────────────────────────
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const roadMarkMat = new THREE.MeshLambertMaterial({ color: 0xdddd44 });
    function mkRoad(x1: number, z1: number, x2: number, z2: number) {
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(len, 5), roadMat);
      road.rotateX(-Math.PI / 2);
      road.rotation.y = Math.atan2(dx, dz);
      road.position.set(cx, 0.15, cz);
      scene.add(road);
      // center line
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.9, 0.3), roadMarkMat);
      mark.rotateX(-Math.PI / 2);
      mark.rotation.y = road.rotation.y;
      mark.position.set(cx, 0.18, cz);
      scene.add(mark);
    }
    mkRoad(0, 0, 50, 30); mkRoad(50, 30, 80, 60);
    mkRoad(0, 0, -30, -40); mkRoad(-30, -40, -60, -65);
    mkRoad(0, 0, 30, -50); mkRoad(0, 0, -25, 45);
    mkRoad(50, 30, 20, 70); mkRoad(-30, -40, -70, -10);

    // ── Buildings ─────────────────────────────────────────────────────────
    const bldBoxes: THREE.Box3[] = [];
    const wallM = new THREE.MeshLambertMaterial({ color: cfg.buildingColor });
    const roofM = new THREE.MeshLambertMaterial({ color: cfg.id === "lahore" ? 0x336644 : 0x8b3535 });
    const windowM = new THREE.MeshLambertMaterial({ color: 0x88aacc });

    function mkBuilding(bx: number, bz: number, w: number, h: number, d: number) {
      const by = getH(bx, bz);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM);
      body.position.set(bx, by + h / 2, bz);
      body.castShadow = true; body.receiveShadow = true;
      scene.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.9, d + 0.6), roofM);
      roof.position.set(bx, by + h + 0.45, bz);
      scene.add(roof);
      // windows
      if (h > 5) {
        for (let f = 0; f < Math.floor(h / 3); f++) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), windowM);
          win.position.set(bx + w / 2 + 0.01, by + 2 + f * 3, bz);
          win.rotation.y = Math.PI / 2;
          scene.add(win);
        }
      }
      bldBoxes.push(new THREE.Box3().setFromObject(body));
    }

    [
      [20, 20, 10, 8, 8], [38, 28, 8, 6, 7], [52, 12, 11, 9, 10],
      [-22, 32, 9, 7, 9], [-42, 16, 7, 5, 7], [62, -18, 10, 8, 8],
      [32, -38, 8, 6, 8], [-32, -28, 14, 12, 12], [78, 52, 9, 7, 9],
      [-68, -48, 8, 6, 7], [12, 68, 11, 9, 9], [-58, 42, 7, 5, 8],
      [45, -60, 9, 7, 9], [-20, -70, 8, 5, 8], [90, -30, 10, 8, 10],
      [10, -90, 7, 6, 7], [-80, 20, 9, 7, 9], [60, 80, 8, 5, 8],
    ].forEach(([x, z, w, h, d]) => mkBuilding(x, z, w, h, d));

    // ── Trees ─────────────────────────────────────────────────────────────
    const trunkM = new THREE.MeshLambertMaterial({ color: 0x5c3d1a });
    const leafM = new THREE.MeshLambertMaterial({ color: cfg.id === "karachi" ? 0x55aa22 : 0x2a5e2c });
    for (let i = 0; i < 130; i++) {
      const a = Math.random() * Math.PI * 2, dist = 15 + Math.random() * 210;
      const tx = Math.cos(a) * dist, tz = Math.sin(a) * dist;
      const th = getH(tx, tz);
      if (th > cfg.terrainHeight * 0.8) continue; // no trees on snowy peaks
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 3.2, 6), trunkM);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.2, 7), leafM);
      leaf.position.y = 4.2; trunk.castShadow = true; leaf.castShadow = true;
      g.add(trunk, leaf);
      g.position.set(tx, th + 1.6, tz);
      scene.add(g);
    }

    // ── Rocks ─────────────────────────────────────────────────────────────
    const rockM = new THREE.MeshLambertMaterial({ color: 0x808070 });
    for (let i = 0; i < 45; i++) {
      const rx = (Math.random() - 0.5) * 400, rz = (Math.random() - 0.5) * 400;
      const s = 0.6 + Math.random() * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      rock.position.set(rx, getH(rx, rz) + s * 0.4, rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      scene.add(rock);
    }

    // ── NPCs ──────────────────────────────────────────────────────────────
    const npcBodyM = new THREE.MeshLambertMaterial({ color: cfg.npcColor });
    const npcHeadM = new THREE.MeshLambertMaterial({ color: 0xffcba4 });

    function mkNPC(id: number): NPC {
      const group = new THREE.Group();
      const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.5, 8), npcBodyM.clone());
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), npcHeadM.clone());
      // gun prop
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      gun.position.set(0.45, 0.3, 0.3);
      bodyMesh.castShadow = true; head.castShadow = true;
      head.position.y = 1.15;
      group.add(bodyMesh, head, gun);
      const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 95;
      const nx = Math.cos(a) * d, nz = Math.sin(a) * d;
      group.position.set(nx, getH(nx, nz) + 0.75, nz);
      scene.add(group);
      return {
        group, bodyMesh, hp: 100, maxHp: 100,
        speed: 1.8 + Math.random() * 1.5,
        dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        changeT: 2 + Math.random() * 4,
        state: "wander", id,
      };
    }
    for (let i = 0; i < NPC_COUNT; i++) npcsRef.current.push(mkNPC(i));

    // ── Rain ──────────────────────────────────────────────────────────────
    const rainPos = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 260;
      rainPos[i * 3 + 1] = Math.random() * 100;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 260;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rainMesh = new THREE.Points(rainGeo,
      new THREE.PointsMaterial({ color: 0xaaddff, size: 0.16, transparent: true, opacity: 0.45 })
    );
    rainMesh.visible = false;
    scene.add(rainMesh);

    // ── Raycaster (shooting) ───────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();

    function shoot() {
      if (!canShootRef.current) return;
      if (ammoRef.current <= 0) { flash("No ammo — R to reload"); return; }
      canShootRef.current = false;
      ammoRef.current -= 1; setAmmo(ammoRef.current);
      setTimeout(() => { canShootRef.current = true; }, 190);

      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const targets = npcsRef.current.filter(n => n.state !== "dead").flatMap(n => n.group.children);
      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length) return;

      const npc = npcsRef.current.find(
        n => n.state !== "dead" && n.group.children.includes(hits[0].object)
      );
      if (!npc) return;

      npc.hp -= 34;
      (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff2200);
      setTimeout(() => {
        if (npc.state !== "dead")
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);
      }, 260);

      if (npc.hp <= 0) {
        npc.state = "dead"; npc.group.visible = false;
        killsRef.current += 1; setKills(killsRef.current);
        flash("Enemy down! 💀");
        setTimeout(() => {
          const a = Math.random() * Math.PI * 2, d = 35 + Math.random() * 80;
          const rx = Math.cos(a) * d, rz = Math.sin(a) * d;
          npc.group.position.set(rx, getH(rx, rz) + 0.75, rz);
          npc.hp = npc.maxHp; npc.state = "wander"; npc.group.visible = true;
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);
        }, 7000);
      } else {
        npc.state = "chase";
        flash("Enemy alerted!");
      }
    }

    // ── Input ─────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === "KeyR") { ammoRef.current = 30; setAmmo(30); flash("Reloaded ✓"); }
      if (e.code === "KeyP") {
        const cycle: Record<string, "clear" | "rain" | "storm"> = { clear: "rain", rain: "storm", storm: "clear" };
        const w = cycle[weatherRef.current];
        weatherRef.current = w; setWeather(w);
        rainMesh.visible = w !== "clear";
        flash(`Weather: ${w.toUpperCase()}`);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const onClick = () => { if (!controls.isLocked) controls.lock(); else shoot(); };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("click", onClick);

    // ── Game Loop ──────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const playerBox = new THREE.Box3();
    let dayTime = 0.25;
    let weatherTimer = 40;
    let dmgTimer = 0;
    let thunderTimer = 0;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // ── Day/Night cycle ──────────────────────────────────────────────
      dayTime = (dayTime + DAY_SPEED) % 1;
      const sky = sampleSky(dayTime, cfg.skyDay);
      renderer.setClearColor(sky.color);
      ambient.intensity = sky.ambient;
      sun.intensity = sky.sun;
      moon.intensity = dayTime > 0.82 || dayTime < 0.18 ? 0.2 : 0;
      const sunAngle = dayTime * Math.PI * 2;
      sun.position.set(Math.cos(sunAngle) * 220, Math.sin(sunAngle) * 180, 100);

      const fogBase = weatherRef.current === "storm" ? cfg.fogDensity * 4
        : weatherRef.current === "rain" ? cfg.fogDensity * 2
        : dayTime > 0.82 || dayTime < 0.18 ? cfg.fogDensity * 1.5
        : cfg.fogDensity;
      scene.fog = new THREE.FogExp2(sky.color.getHex(), fogBase);

      const hr = Math.floor(dayTime * 24);
      setTimeLabel(hr < 5 ? "Night" : hr < 8 ? "Dawn" : hr < 17 ? "Day" : hr < 20 ? "Sunset" : "Night");

      // ── Weather & Thunder ─────────────────────────────────────────────
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weatherTimer = 30 + Math.random() * 50;
        const opts: ("clear" | "rain" | "storm")[] = ["clear", "clear", "rain", "storm"];
        const w = opts[Math.floor(Math.random() * opts.length)];
        weatherRef.current = w; setWeather(w);
        rainMesh.visible = w !== "clear";
      }

      if (weatherRef.current === "storm") {
        thunderTimer -= dt;
        if (thunderTimer <= 0) {
          thunderTimer = 4 + Math.random() * 8;
          // lightning flash
          setThunderFlash(1);
          ambient.intensity = 3;
          setTimeout(() => { ambient.intensity = sky.ambient; setThunderFlash(0); }, 120);
          setTimeout(() => {
            ambient.intensity = 3; setThunderFlash(0.7);
            setTimeout(() => { ambient.intensity = sky.ambient; setThunderFlash(0); }, 80);
          }, 200);
        }
      }

      // ── Rain ─────────────────────────────────────────────────────────
      if (rainMesh.visible) {
        const spd = weatherRef.current === "storm" ? 32 : 18;
        const ra = rainMesh.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < RAIN_COUNT; i++) {
          ra[i * 3 + 1] -= spd * dt;
          if (ra[i * 3 + 1] < -2) {
            ra[i * 3] = camera.position.x + (Math.random() - 0.5) * 160;
            ra[i * 3 + 1] = camera.position.y + 55 + Math.random() * 30;
            ra[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 160;
          }
        }
        rainMesh.geometry.attributes.position.needsUpdate = true;
      }

      // ── Player movement ───────────────────────────────────────────────
      if (controls.isLocked) {
        const spd = 13;
        const k = keysRef.current;
        let fx = 0, fz = 0;
        if (k["KeyW"] || k["ArrowUp"]) fz -= 1;
        if (k["KeyS"] || k["ArrowDown"]) fz += 1;
        if (k["KeyA"] || k["ArrowLeft"]) fx -= 1;
        if (k["KeyD"] || k["ArrowRight"]) fx += 1;
        if (fx !== 0 || fz !== 0) {
          const len = Math.sqrt(fx * fx + fz * fz);
          controls.moveRight((fx / len) * spd * dt);
          controls.moveForward((-fz / len) * spd * dt);
        }

        camera.position.x = Math.max(-270, Math.min(270, camera.position.x));
        camera.position.z = Math.max(-270, Math.min(270, camera.position.z));
        const gy = getH(camera.position.x, camera.position.z);
        if (camera.position.y < gy + 1.9) camera.position.y = gy + 1.9;

        // Building collision
        playerBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1.2, 2, 1.2));
        for (const box of bldBoxes) {
          if (playerBox.intersectsBox(box)) {
            const c = new THREE.Vector3(); box.getCenter(c);
            camera.position.add(camera.position.clone().sub(c).setY(0).normalize().multiplyScalar(0.6));
          }
        }

        // NPC proximity damage
        dmgTimer += dt;
        if (dmgTimer >= 2.5) {
          dmgTimer = 0;
          for (const npc of npcsRef.current) {
            if (npc.state === "dead") continue;
            if (npc.group.position.distanceTo(camera.position) < 5) {
              hpRef.current = Math.max(0, hpRef.current - (7 + Math.floor(Math.random() * 9)));
              setHp(hpRef.current);
            }
          }
        }
      }

      // ── NPCs ──────────────────────────────────────────────────────────
      for (const npc of npcsRef.current) {
        if (npc.state === "dead") continue;
        npc.changeT -= dt;
        if (npc.state === "chase") {
          const toP = camera.position.clone().sub(npc.group.position).setY(0);
          const dist = toP.length();
          if (dist > 115) { npc.state = "wander"; }
          else { toP.normalize(); npc.group.position.addScaledVector(toP, npc.speed * 2 * dt); npc.dir.copy(toP); }
        } else {
          if (npc.changeT <= 0) {
            npc.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            npc.changeT = 2 + Math.random() * 5;
          }
          npc.group.position.addScaledVector(npc.dir, npc.speed * dt);
        }
        const nx = npc.group.position.x, nz = npc.group.position.z;
        npc.group.position.set(
          Math.max(-245, Math.min(245, nx)),
          getH(nx, nz) + 0.75,
          Math.max(-245, Math.min(245, nz))
        );
        if (npc.dir.length() > 0.01) npc.group.rotation.y = Math.atan2(npc.dir.x, npc.dir.z);
      }

      setMiniDots(
        npcsRef.current.filter(n => n.state !== "dead").map(n => ({
          x: (n.group.position.x - camera.position.x) / 5,
          z: (n.group.position.z - camera.position.z) / 5,
          chase: n.state === "chase",
        }))
      );

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      controls.dispose(); renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      npcsRef.current = [];
    };
  }, [selectedMap, flash]);

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const timeColor = timeLabel === "Night" ? "text-blue-200" : timeLabel === "Dawn" ? "text-orange-300"
    : timeLabel === "Sunset" ? "text-red-300" : "text-yellow-200";
  const weatherIcon = weather === "storm" ? "⛈" : weather === "rain" ? "🌧" : "☀️";
  const hpColor = hp > 60 ? "from-green-600 to-green-400" : hp > 30 ? "from-yellow-600 to-yellow-400" : "from-red-700 to-red-400";

  // ── Map Select Screen ───────────────────────────────────────────────────────
  if (!selectedMap) {
    return (
      <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute inset-0 bg-gradient-radial from-amber-900/20 via-transparent to-transparent" />

        <div className="relative z-10 w-full max-w-4xl px-6 text-center">
          <div className="text-6xl mb-3">🌍</div>
          <h1 className="font-display text-5xl font-bold text-amber-400 drop-shadow-[0_0_20px_rgba(244,180,26,0.4)] mb-2">
            Ranjha World
          </h1>
          <p className="text-white/50 font-display uppercase tracking-widest text-sm mb-8">
            Select your battlefield
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {MAPS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMap(m)}
                className="group relative p-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-left transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(244,180,26,0.15)]"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl font-bold text-white uppercase tracking-wider mb-0.5">{m.name}</div>
                    <div className="text-white/50 text-sm leading-relaxed">{m.desc}</div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {m.id === "hunza" || m.id === "skardu" ? "Mountains" : m.id === "lahore" ? "Plains" : "Coastal"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        {NPC_COUNT} NPCs
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-300">
                        Day/Night + Weather
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 right-3 text-amber-400/0 group-hover:text-amber-400/80 font-display text-sm uppercase tracking-widest transition-colors">
                  Play →
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setLocation("/lobby")}
            className="px-6 py-2 bg-white/8 hover:bg-white/15 border border-white/15 rounded-lg text-white/55 font-display uppercase tracking-widest text-sm transition-colors"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ── Game Screen ─────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
      {/* WebGL canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Thunder flash overlay */}
      {thunderFlash > 0 && (
        <div
          className="absolute inset-0 z-30 pointer-events-none"
          style={{ background: `rgba(220,235,255,${thunderFlash * 0.55})` }}
        />
      )}

      {/* Lock overlay */}
      {!locked && hp > 0 && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/78 backdrop-blur-sm cursor-pointer"
          onClick={() => mountRef.current?.querySelector("canvas")?.requestPointerLock()}
        >
          <div className="text-center space-y-4 px-8 max-w-sm">
            <div className="text-5xl">{selectedMap.emoji}</div>
            <h1 className="font-display text-4xl font-bold text-amber-400">{selectedMap.name}</h1>
            <p className="text-white/70 font-display uppercase tracking-widest text-sm">Click to Enter</p>
            <div className="space-y-1 text-sm text-white/50 font-display">
              <p>WASD / Arrows — Move</p>
              <p>Mouse — Look &nbsp;·&nbsp; Click — Shoot</p>
              <p>R — Reload &nbsp;·&nbsp; P — Weather &nbsp;·&nbsp; ESC — Unlock</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedMap(null); }}
              className="mt-2 px-5 py-2 bg-white/8 hover:bg-white/15 border border-white/15 rounded-lg text-white/55 font-display uppercase tracking-widest text-sm transition-colors"
            >
              ← Change Map
            </button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      {locked && hp > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="relative w-9 h-9">
            <div className="absolute top-1/2 left-0 w-full h-px bg-amber-400 opacity-80" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-amber-400 opacity-80" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-amber-400 opacity-80" />
          </div>
        </div>
      )}

      {/* ── HUD (only when locked & alive) ── */}
      {locked && hp > 0 && (
        <>
          {/* Minimap – top left */}
          <div className="absolute top-4 left-4 z-20 w-38 h-38" style={{ width: 152, height: 152 }}>
            <div className="relative w-full h-full rounded-xl bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0" style={{
                background: `radial-gradient(ellipse at center, ${
                  selectedMap.id === "karachi" ? "rgba(0,80,120,0.4)" :
                  selectedMap.id === "lahore" ? "rgba(60,90,40,0.4)" :
                  "rgba(20,60,30,0.35)"
                }, transparent 80%)`,
              }} />
              <div className="absolute inset-0 opacity-15" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.2) 1px,transparent 1px)",
                backgroundSize: "19px 19px",
              }} />
              {/* Player dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-300/50 z-10" />
              {/* NPC dots */}
              {miniDots.map((d, i) => {
                const cx = 50 + d.x, cy = 50 + d.z;
                if (cx < 2 || cx > 98 || cy < 2 || cy > 98) return null;
                return (
                  <div key={i} className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${d.chase ? "bg-orange-400 animate-pulse" : "bg-red-500"}`}
                    style={{ left: `${cx}%`, top: `${cy}%` }} />
                );
              })}
              <div className="absolute bottom-1 left-2 text-[8px] font-display uppercase tracking-widest text-white/50 truncate max-w-[90%]">
                {selectedMap.name}
              </div>
            </div>
          </div>

          {/* Top centre – time + weather */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span className="text-base">{weatherIcon}</span>
              <span className={`font-display text-sm font-bold uppercase tracking-wider ${timeColor}`}>{timeLabel}</span>
              {weather !== "clear" && (
                <span className="text-white/40 font-display text-xs uppercase tracking-wider">· {weather}</span>
              )}
            </div>
          </div>

          {/* Top right – kills */}
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-2 rounded-lg bg-black/65 border border-amber-500/40 backdrop-blur-md flex items-center gap-2">
              <span className="text-amber-400 text-xs font-display uppercase tracking-widest">Kills</span>
              <span className="font-display text-2xl font-bold text-amber-400 tabular-nums">{kills}</span>
            </div>
          </div>

          {/* Bottom left – HP + ammo */}
          <div className="absolute bottom-5 left-5 z-20 w-64 space-y-2">
            <div className="rounded-xl bg-black/72 border border-white/10 backdrop-blur-md p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-red-400 w-6">HP</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${hpColor} transition-all duration-300`} style={{ width: `${hp}%` }} />
                </div>
                <span className="font-display text-sm font-bold tabular-nums text-white/80 w-7 text-right">{hp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🔫</span>
                <span className="font-display text-2xl font-bold tabular-nums text-amber-300">{ammo}</span>
                <span className="text-white/30 text-xs font-display">/ 30</span>
                <span className="ml-auto text-[9px] text-white/30 font-display uppercase tracking-wider">[R] reload</span>
              </div>
            </div>
            <div className="text-[9px] font-display uppercase tracking-widest text-white/25 text-center">
              [P] weather &nbsp;·&nbsp; ESC release mouse &nbsp;·&nbsp; Click → shoot
            </div>
          </div>

          {/* Low HP vignette */}
          {hp < 30 && (
            <div className="absolute inset-0 pointer-events-none z-10 animate-pulse"
              style={{ boxShadow: "inset 0 0 160px rgba(200,10,10,0.65)" }} />
          )}

          {/* Notice flash */}
          {notice && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-lg bg-black/82 border border-amber-500/40 backdrop-blur-md font-display text-sm uppercase tracking-widest text-amber-300">
              {notice}
            </div>
          )}
        </>
      )}

      {/* Death screen */}
      {hp <= 0 && (
        <div className="absolute inset-0 z-40 bg-red-950/88 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="text-7xl mb-4">💀</div>
          <h2 className="font-display text-6xl font-bold text-red-400 mb-2">Eliminated</h2>
          <p className="text-white/60 font-display uppercase tracking-widest text-sm">
            Kills: <span className="text-amber-400 font-bold">{kills}</span>
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => { setSelectedMap(null); }}
              className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-display uppercase tracking-widest rounded-lg transition-colors"
            >
              Change Map
            </button>
            <button
              onClick={() => {
                hpRef.current = 100; setHp(100);
                ammoRef.current = 30; setAmmo(30);
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-display uppercase tracking-widest rounded-lg transition-colors"
            >
              Respawn
            </button>
            <button
              onClick={() => setLocation("/lobby")}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-display uppercase tracking-widest rounded-lg transition-colors"
            >
              Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
