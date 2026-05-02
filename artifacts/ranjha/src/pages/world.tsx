import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

// ── Inline PointerLockControls ─────────────────────────────────────────────
class PointerLockControls extends THREE.EventDispatcher {
  camera: THREE.Camera;
  domElement: HTMLElement;
  isLocked = false;
  private euler = new THREE.Euler(0, 0, 0, "YXZ");
  private PI_2 = Math.PI / 2;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onPointerlockChange: () => void;
  private _onPointerlockError: () => void;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;

    this._onMouseMove = (e: MouseEvent) => {
      if (!this.isLocked) return;
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * 0.002;
      this.euler.x -= movementY * 0.002;
      this.euler.x = Math.max(-this.PI_2 * 0.9, Math.min(this.PI_2 * 0.9, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    };

    this._onPointerlockChange = () => {
      if (document.pointerLockElement === this.domElement) {
        this.isLocked = true;
        this.dispatchEvent({ type: "lock" });
      } else {
        this.isLocked = false;
        this.dispatchEvent({ type: "unlock" });
      }
    };

    this._onPointerlockError = () => {
      console.warn("PointerLockControls: Unable to use Pointer Lock API");
    };

    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onPointerlockChange);
    document.addEventListener("pointerlockerror", this._onPointerlockError);
  }

  lock() { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }

  getObject() { return this.camera; }

  moveForward(distance: number) {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(this.camera.matrix, 0);
    v.crossVectors(this.camera.up, v);
    this.camera.position.addScaledVector(v, distance);
  }

  moveRight(distance: number) {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(this.camera.matrix, 0);
    this.camera.position.addScaledVector(v, distance);
  }

  dispose() {
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("pointerlockchange", this._onPointerlockChange);
    document.removeEventListener("pointerlockerror", this._onPointerlockError);
  }
}

// ── Constants ──────────────────────────────────────────────────────────────
const TERRAIN_SIZE = 600;
const TERRAIN_SEGS = 90;
const TERRAIN_HEIGHT = 50;
const NPC_COUNT = 14;
const RAIN_COUNT = 2500;
const DAY_SPEED = 0.00006;

const SKY_COLORS = [
  new THREE.Color(0xff7043),
  new THREE.Color(0x87ceeb),
  new THREE.Color(0xff6020),
  new THREE.Color(0x05050f),
];
const AMBIENT_I = [0.35, 0.65, 0.28, 0.04];
const SUN_I = [0.7, 1.3, 0.55, 0.0];

function lerpSky(t: number) {
  const n = SKY_COLORS.length;
  const idx = t * n;
  const i = Math.floor(idx) % n;
  const j = (i + 1) % n;
  return SKY_COLORS[i].clone().lerp(SKY_COLORS[j], idx - Math.floor(idx));
}
function lerpN(arr: number[], t: number) {
  const n = arr.length;
  const idx = t * n;
  const i = Math.floor(idx) % n;
  const j = (i + 1) % n;
  return arr[i] + (arr[j] - arr[i]) * (idx - Math.floor(idx));
}

interface NPC {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  hp: number;
  speed: number;
  dir: THREE.Vector3;
  changeT: number;
  state: "wander" | "chase" | "dead";
  id: number;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function World() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const [locked, setLocked] = useState(false);
  const [hp, setHp] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [kills, setKills] = useState(0);
  const [timeLabel, setTimeLabel] = useState("Dawn");
  const [weather, setWeather] = useState<"clear" | "rain" | "storm">("clear");
  const [notice, setNotice] = useState("");
  const [miniDots, setMiniDots] = useState<{ x: number; z: number }[]>([]);

  const noticeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeRef.current) clearTimeout(noticeRef.current);
    noticeRef.current = setTimeout(() => setNotice(""), 1800);
  }, []);

  const hpRef = useRef(100);
  const ammoRef = useRef(30);
  const killsRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const npcsRef = useRef<NPC[]>([]);
  const weatherRef = useRef<"clear" | "rain" | "storm">("clear");
  const canShootRef = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.006);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 800);
    camera.position.set(0, 12, 0);

    // ── Controls ──────────────────────────────────────────────────────────
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener("lock", () => setLocked(true));
    controls.addEventListener("unlock", () => setLocked(false));

    // ── Lights ────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
    sun.position.set(120, 200, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180;
    sun.shadow.camera.bottom = -180;
    scene.add(sun);

    const moon = new THREE.DirectionalLight(0x3355aa, 0);
    moon.position.set(-100, 120, -80);
    scene.add(moon);

    // ── Terrain ───────────────────────────────────────────────────────────
    const noise2D = createNoise2D();

    function getH(x: number, z: number): number {
      const nx = x / TERRAIN_SIZE;
      const nz = z / TERRAIN_SIZE;
      return (
        noise2D(nx * 2, nz * 2) * 0.5 +
        noise2D(nx * 4, nz * 4) * 0.25 +
        noise2D(nx * 8, nz * 8) * 0.125 +
        noise2D(nx * 16, nz * 16) * 0.0625
      ) * TERRAIN_HEIGHT;
    }

    const tGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
    tGeo.rotateX(-Math.PI / 2);
    const pos = tGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] = getH(pos[i], pos[i + 2]);
    }
    tGeo.computeVertexNormals();

    const terrain = new THREE.Mesh(
      tGeo,
      new THREE.MeshLambertMaterial({ color: 0x3a7d44 })
    );
    terrain.receiveShadow = true;
    scene.add(terrain);

    // ── River ─────────────────────────────────────────────────────────────
    const riverGeo = new THREE.PlaneGeometry(18, TERRAIN_SIZE);
    riverGeo.rotateX(-Math.PI / 2);
    const river = new THREE.Mesh(
      riverGeo,
      new THREE.MeshLambertMaterial({ color: 0x1a78c2, transparent: true, opacity: 0.75 })
    );
    river.position.set(-35, 0.6, 0);
    scene.add(river);

    // ── Trees ─────────────────────────────────────────────────────────────
    const trunkM = new THREE.MeshLambertMaterial({ color: 0x5c3d1a });
    const leafM = new THREE.MeshLambertMaterial({ color: 0x2a5e2c });
    for (let i = 0; i < 110; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 18 + Math.random() * 200;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 3, 6), trunkM);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 7), leafM);
      trunk.castShadow = true;
      leaf.castShadow = true;
      leaf.position.y = 4;
      g.add(trunk, leaf);
      g.position.set(x, getH(x, z) + 1.5, z);
      scene.add(g);
    }

    // ── Buildings ─────────────────────────────────────────────────────────
    const wallM = new THREE.MeshLambertMaterial({ color: 0xd4b896 });
    const roofM = new THREE.MeshLambertMaterial({ color: 0x8b3535 });
    const bldBoxes: THREE.Box3[] = [];

    function mkBuilding(x: number, z: number, w: number, h: number, d: number) {
      const y = getH(x, z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM);
      body.position.set(x, y + h / 2, z);
      body.castShadow = true;
      body.receiveShadow = true;
      scene.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1, d + 0.6), roofM);
      roof.position.set(x, y + h + 0.5, z);
      scene.add(roof);
      bldBoxes.push(new THREE.Box3().setFromObject(body));
    }

    [
      [20, 20, 10, 8, 8], [38, 28, 8, 6, 7], [52, 12, 11, 9, 10],
      [-22, 32, 9, 7, 9], [-42, 16, 7, 5, 7], [62, -18, 10, 8, 8],
      [32, -38, 8, 6, 8], [-32, -28, 12, 10, 10], [78, 52, 9, 7, 9],
      [-68, -48, 8, 6, 7], [12, 68, 11, 9, 9], [-58, 42, 7, 5, 8],
    ].forEach(([x, z, w, h, d]) => mkBuilding(x, z, w, h, d));

    // ── Rocks ─────────────────────────────────────────────────────────────
    const rockM = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let i = 0; i < 35; i++) {
      const x = (Math.random() - 0.5) * 380;
      const z = (Math.random() - 0.5) * 380;
      const s = 0.5 + Math.random() * 1.8;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      rock.position.set(x, getH(x, z) + s * 0.4, z);
      rock.castShadow = true;
      scene.add(rock);
    }

    // ── NPCs ──────────────────────────────────────────────────────────────
    const npcBodyBase = new THREE.MeshLambertMaterial({ color: 0xe05c2a });
    const npcHeadM = new THREE.MeshLambertMaterial({ color: 0xffcba4 });

    function mkNPC(id: number): NPC {
      const group = new THREE.Group();
      const bodyMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 1.5, 8),
        npcBodyBase.clone()
      );
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), npcHeadM.clone());
      bodyMesh.castShadow = true;
      head.castShadow = true;
      head.position.y = 1.15;
      group.add(bodyMesh, head);

      const a = Math.random() * Math.PI * 2;
      const d = 18 + Math.random() * 90;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      group.position.set(x, getH(x, z) + 0.75, z);
      scene.add(group);

      return {
        group, bodyMesh, hp: 100, speed: 1.8 + Math.random() * 1.5,
        dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        changeT: 2 + Math.random() * 4,
        state: "wander", id,
      };
    }
    for (let i = 0; i < NPC_COUNT; i++) npcsRef.current.push(mkNPC(i));

    // ── Rain ──────────────────────────────────────────────────────────────
    const rainPos = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 250;
      rainPos[i * 3 + 1] = Math.random() * 100;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 250;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rainMesh = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0xaaddff, size: 0.15, transparent: true, opacity: 0.45 })
    );
    rainMesh.visible = false;
    scene.add(rainMesh);

    // ── Raycaster ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();

    function shoot() {
      if (!canShootRef.current || ammoRef.current <= 0) {
        if (ammoRef.current <= 0) flash("No ammo — press R to reload");
        return;
      }
      canShootRef.current = false;
      ammoRef.current -= 1;
      setAmmo(ammoRef.current);
      setTimeout(() => { canShootRef.current = true; }, 200);

      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const allChildren = npcsRef.current
        .filter(n => n.state !== "dead")
        .flatMap(n => n.group.children);
      const hits = raycaster.intersectObjects(allChildren, false);
      if (hits.length === 0) return;

      const hitMesh = hits[0].object;
      const npc = npcsRef.current.find(
        n => n.state !== "dead" && n.group.children.includes(hitMesh)
      );
      if (!npc) return;

      npc.hp -= 34;
      // Flash red
      (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff2200);
      setTimeout(() => {
        if (npc.state !== "dead") {
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xe05c2a);
        }
      }, 250);

      if (npc.hp <= 0) {
        npc.state = "dead";
        npc.group.visible = false;
        killsRef.current += 1;
        setKills(killsRef.current);
        flash("Enemy eliminated!");
        // Respawn after 6s
        setTimeout(() => {
          const a = Math.random() * Math.PI * 2;
          const d = 30 + Math.random() * 80;
          const x = Math.cos(a) * d, z = Math.sin(a) * d;
          npc.group.position.set(x, getH(x, z) + 0.75, z);
          npc.hp = 100;
          npc.state = "wander";
          npc.group.visible = true;
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xe05c2a);
        }, 6000);
      } else {
        npc.state = "chase";
      }
    }

    // ── Input handlers ─────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === "KeyR") {
        ammoRef.current = 30;
        setAmmo(30);
        flash("Reloaded ✓");
      }
      if (e.code === "KeyP") {
        const next: Record<string, "clear" | "rain" | "storm"> = { clear: "rain", rain: "storm", storm: "clear" };
        const w = next[weatherRef.current];
        weatherRef.current = w;
        setWeather(w);
        rainMesh.visible = w !== "clear";
        flash(`Weather: ${w.toUpperCase()}`);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const onClick = () => {
      if (!controls.isLocked) { controls.lock(); return; }
      shoot();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("click", onClick);

    // ── Game loop ──────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const velocity = new THREE.Vector3();
    const playerBox = new THREE.Box3();
    let dayTime = 0.12;
    let weatherTimer = 35;
    let dmgTimer = 0;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Day/Night
      dayTime = (dayTime + DAY_SPEED) % 1;
      const skyCol = lerpSky(dayTime);
      renderer.setClearColor(skyCol);
      const fogDensity = weatherRef.current === "storm" ? 0.02 : weatherRef.current === "rain" ? 0.01 : 0.005;
      scene.fog = new THREE.FogExp2(skyCol.getHex(), fogDensity);
      ambient.intensity = lerpN(AMBIENT_I, dayTime);
      sun.intensity = lerpN(SUN_I, dayTime);
      moon.intensity = dayTime > 0.55 && dayTime < 0.95 ? 0.22 : 0;
      const sunA = dayTime * Math.PI * 2;
      sun.position.set(Math.cos(sunA) * 200, Math.sin(sunA) * 180, 80);

      const hour = Math.floor(dayTime * 24);
      const lbl = hour < 5 ? "Night" : hour < 8 ? "Dawn" : hour < 17 ? "Day" : hour < 20 ? "Sunset" : "Night";
      setTimeLabel(lbl);

      // Weather cycle
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weatherTimer = 28 + Math.random() * 45;
        const opts: ("clear" | "rain" | "storm")[] = ["clear", "clear", "rain", "storm"];
        const w = opts[Math.floor(Math.random() * opts.length)];
        weatherRef.current = w;
        setWeather(w);
        rainMesh.visible = w !== "clear";
      }

      // Rain animation
      if (rainMesh.visible) {
        const spd = weatherRef.current === "storm" ? 30 : 16;
        const ra = rainMesh.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < RAIN_COUNT; i++) {
          ra[i * 3 + 1] -= spd * dt;
          if (ra[i * 3 + 1] < -2) {
            ra[i * 3] = camera.position.x + (Math.random() - 0.5) * 160;
            ra[i * 3 + 1] = camera.position.y + 55 + Math.random() * 35;
            ra[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 160;
          }
        }
        rainMesh.geometry.attributes.position.needsUpdate = true;
      }

      // Player movement
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

        // Terrain follow
        const groundY = getH(camera.position.x, camera.position.z);
        if (camera.position.y < groundY + 1.9) camera.position.y = groundY + 1.9;

        // World bounds
        camera.position.x = Math.max(-270, Math.min(270, camera.position.x));
        camera.position.z = Math.max(-270, Math.min(270, camera.position.z));

        // Building collision
        playerBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1.2, 2, 1.2));
        for (const box of bldBoxes) {
          if (playerBox.intersectsBox(box)) {
            const c = new THREE.Vector3();
            box.getCenter(c);
            const push = camera.position.clone().sub(c).setY(0).normalize().multiplyScalar(0.6);
            camera.position.add(push);
          }
        }

        // NPC damage
        dmgTimer += dt;
        if (dmgTimer >= 2.5) {
          dmgTimer = 0;
          for (const npc of npcsRef.current) {
            if (npc.state === "dead") continue;
            if (npc.group.position.distanceTo(camera.position) < 5) {
              const dmg = 6 + Math.floor(Math.random() * 10);
              hpRef.current = Math.max(0, hpRef.current - dmg);
              setHp(hpRef.current);
            }
          }
        }

        velocity.set(0, 0, 0);
      }

      // NPCs
      for (const npc of npcsRef.current) {
        if (npc.state === "dead") continue;
        npc.changeT -= dt;

        if (npc.state === "chase") {
          const toP = camera.position.clone().sub(npc.group.position).setY(0);
          const dist = toP.length();
          if (dist > 110) {
            npc.state = "wander";
          } else {
            toP.normalize();
            npc.group.position.addScaledVector(toP, npc.speed * 1.9 * dt);
            npc.dir.copy(toP);
          }
        } else {
          if (npc.changeT <= 0) {
            npc.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            npc.changeT = 2 + Math.random() * 4;
          }
          npc.group.position.addScaledVector(npc.dir, npc.speed * dt);
        }

        const nx = npc.group.position.x, nz = npc.group.position.z;
        npc.group.position.y = getH(nx, nz) + 0.75;
        npc.group.position.x = Math.max(-240, Math.min(240, nx));
        npc.group.position.z = Math.max(-240, Math.min(240, nz));
        if (npc.dir.length() > 0.01) {
          npc.group.rotation.y = Math.atan2(npc.dir.x, npc.dir.z);
        }
      }

      // Minimap dots
      setMiniDots(
        npcsRef.current
          .filter(n => n.state !== "dead")
          .map(n => ({
            x: (n.group.position.x - camera.position.x) / 4.5,
            z: (n.group.position.z - camera.position.z) / 4.5,
          }))
      );

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const onResize = () => {
      if (!container) return;
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
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      npcsRef.current = [];
    };
  }, [flash]);

  const timeColor =
    timeLabel === "Night" ? "text-blue-200" :
    timeLabel === "Dawn" ? "text-orange-300" :
    timeLabel === "Sunset" ? "text-red-300" :
    "text-yellow-200";

  const weatherIcon = weather === "storm" ? "⛈" : weather === "rain" ? "🌧" : "☀️";

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
      {/* WebGL canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Lock overlay */}
      {!locked && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm cursor-pointer"
          onClick={() => {
            const cvs = mountRef.current?.querySelector("canvas");
            if (cvs) cvs.requestPointerLock();
          }}
        >
          <div className="text-center space-y-5 px-8 max-w-md">
            <div className="text-6xl">🌍</div>
            <h1 className="font-display text-5xl font-bold text-amber-400 drop-shadow-[0_0_20px_rgba(244,180,26,0.5)]">
              Ranjha World
            </h1>
            <p className="text-white/80 text-base font-display uppercase tracking-widest">
              Click anywhere to enter
            </p>
            <div className="mt-2 space-y-1 text-sm text-white/55 font-display">
              <p>WASD / Arrows — Move</p>
              <p>Mouse — Look around</p>
              <p>Left Click — Shoot NPCs</p>
              <p>R — Reload &nbsp;·&nbsp; P — Toggle Weather</p>
              <p>ESC — Release mouse</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setLocation("/lobby"); }}
              className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 font-display uppercase tracking-widest text-sm transition-colors"
            >
              ← Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      {locked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="relative w-9 h-9 opacity-85">
            <div className="absolute top-1/2 left-0 w-full h-px bg-amber-400" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-amber-400" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-amber-400" />
          </div>
        </div>
      )}

      {/* HUD */}
      {locked && (
        <>
          {/* Minimap */}
          <div className="absolute top-4 left-4 z-20 w-36 h-36 rounded-lg bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
            <div className="absolute inset-0 bg-emerald-900/25" />
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.2) 1px,transparent 1px)",
              backgroundSize: "18px 18px",
            }} />
            {/* Player */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-300/50 z-10" />
            {/* NPCs */}
            {miniDots.map((d, i) => {
              const cx = 50 + d.x, cy = 50 + d.z;
              if (cx < 3 || cx > 97 || cy < 3 || cy > 97) return null;
              return (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-red-500 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                />
              );
            })}
            <div className="absolute bottom-1 left-2 text-[8px] font-display uppercase tracking-widest text-white/50">
              Minimap
            </div>
          </div>

          {/* Time + Weather */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span>{weatherIcon}</span>
              <span className={`font-display text-sm font-bold uppercase tracking-wider ${timeColor}`}>{timeLabel}</span>
              <span className="text-white/30 text-xs">·</span>
              <span className="font-display text-xs text-white/60 uppercase">{weather}</span>
            </div>
          </div>

          {/* Kills */}
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-2 rounded-lg bg-black/60 border border-amber-500/40 backdrop-blur-md flex items-center gap-2">
              <span className="text-amber-400 text-xs font-display uppercase tracking-widest">Kills</span>
              <span className="font-display text-2xl font-bold text-amber-400 tabular-nums">{kills}</span>
            </div>
          </div>

          {/* HP + Ammo bottom-left */}
          <div className="absolute bottom-5 left-5 z-20 w-60 space-y-2">
            <div className="rounded-xl bg-black/70 border border-white/10 backdrop-blur-md p-3 space-y-2.5">
              {/* HP bar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-red-400 w-6">HP</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                    style={{ width: `${hp}%` }}
                  />
                </div>
                <span className="font-display text-sm font-bold tabular-nums text-white/80 w-7 text-right">{hp}</span>
              </div>
              {/* Ammo */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-amber-400 w-6">🔫</span>
                <span className="font-display text-2xl font-bold tabular-nums text-amber-300">{ammo}</span>
                <span className="text-white/30 text-xs font-display">/ 30</span>
                <span className="ml-auto text-[9px] text-white/35 font-display uppercase tracking-wider">[R]</span>
              </div>
            </div>
            <div className="text-[9px] font-display uppercase tracking-widest text-white/30 text-center">
              [P] Weather &nbsp;·&nbsp; ESC Release Mouse
            </div>
          </div>

          {/* Low HP vignette */}
          {hp < 30 && hp > 0 && (
            <div
              className="absolute inset-0 pointer-events-none z-10 animate-pulse"
              style={{ boxShadow: "inset 0 0 160px rgba(200,10,10,0.6)" }}
            />
          )}

          {/* Notice */}
          {notice && (
            <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-lg bg-black/80 border border-amber-500/40 backdrop-blur-md font-display text-sm uppercase tracking-widest text-amber-300">
              {notice}
            </div>
          )}

          {/* Death screen */}
          {hp <= 0 && (
            <div className="absolute inset-0 z-40 bg-red-950/85 backdrop-blur-md flex flex-col items-center justify-center">
              <div className="text-7xl mb-4">💀</div>
              <h2 className="font-display text-6xl font-bold text-red-400 mb-2">Eliminated</h2>
              <p className="text-white/60 font-display uppercase tracking-widest text-sm">
                Kills this run: <span className="text-amber-400 font-bold">{kills}</span>
              </p>
              <button
                onClick={() => setLocation("/lobby")}
                className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-display uppercase tracking-widest rounded-lg transition-colors"
              >
                Return to Lobby
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
