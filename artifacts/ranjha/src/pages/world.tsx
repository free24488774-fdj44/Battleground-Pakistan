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
  yaw = 0; // track horizontal rotation for NPC aim
  private _euler = new THREE.Euler(0, 0, 0, "YXZ");
  private _PI2 = Math.PI / 2;
  private _onMouse: (e: MouseEvent) => void;
  private _onLC: () => void;

  constructor(cam: THREE.Camera, el: HTMLElement) {
    super();
    this.camera = cam; this.domElement = el;
    this._onMouse = (e: MouseEvent) => {
      if (!this.isLocked) return;
      this._euler.setFromQuaternion(cam.quaternion);
      this._euler.y -= (e.movementX || 0) * 0.002;
      this._euler.x -= (e.movementY || 0) * 0.002;
      this._euler.x = Math.max(-this._PI2 * 0.88, Math.min(this._PI2 * 0.88, this._euler.x));
      this.yaw = this._euler.y;
      cam.quaternion.setFromEuler(this._euler);
    };
    this._onLC = () => {
      this.isLocked = document.pointerLockElement === el;
      this.dispatchEvent({ type: this.isLocked ? "lock" : "unlock" });
    };
    document.addEventListener("mousemove", this._onMouse);
    document.addEventListener("pointerlockchange", this._onLC);
  }
  lock() { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }
  getForward(): THREE.Vector3 {
    const v = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    return v.crossVectors(this.camera.up, v).normalize();
  }
  moveForward(d: number) {
    this.camera.position.addScaledVector(this.getForward(), d);
  }
  moveRight(d: number) {
    const v = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    this.camera.position.addScaledVector(v, d);
  }
  dispose() {
    document.removeEventListener("mousemove", this._onMouse);
    document.removeEventListener("pointerlockchange", this._onLC);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map Configs
// ─────────────────────────────────────────────────────────────────────────────
interface MapConfig {
  id: string; name: string; emoji: string; desc: string;
  terrainHeight: number; terrainScale: number;
  grassColor: THREE.Color; rockColor: THREE.Color; snowColor: THREE.Color;
  skyDay: THREE.Color; fogDensity: number;
  riverColor: number; npcColor: number; buildingColor: number;
}
const MAPS: MapConfig[] = [
  { id:"hunza", name:"Hunza Valley", emoji:"🏔", desc:"Karakoram ranges — glaciers and deep gorges",
    terrainHeight:65, terrainScale:1.8,
    grassColor:new THREE.Color(0x3a7d44), rockColor:new THREE.Color(0x8a7460), snowColor:new THREE.Color(0xf0f0f8),
    skyDay:new THREE.Color(0x87ceeb), fogDensity:0.005, riverColor:0x1a78c2, npcColor:0xe05c2a, buildingColor:0xd4b896 },
  { id:"lahore", name:"Lahore", emoji:"🕌", desc:"Mughal plains — dense urban sprawl and bazaars",
    terrainHeight:12, terrainScale:0.7,
    grassColor:new THREE.Color(0x8cb87a), rockColor:new THREE.Color(0xc4a97a), snowColor:new THREE.Color(0xddd5c0),
    skyDay:new THREE.Color(0x9ab8d4), fogDensity:0.007, riverColor:0x4e8fb5, npcColor:0xd46030, buildingColor:0xc8a870 },
  { id:"karachi", name:"Karachi", emoji:"🌊", desc:"Coastal metropolis — ocean, beaches, concrete",
    terrainHeight:8, terrainScale:0.5,
    grassColor:new THREE.Color(0xc8b870), rockColor:new THREE.Color(0xa08850), snowColor:new THREE.Color(0xe8e0c0),
    skyDay:new THREE.Color(0x88bbdd), fogDensity:0.009, riverColor:0x0066aa, npcColor:0x2288cc, buildingColor:0xb0c0d0 },
  { id:"skardu", name:"Skardu", emoji:"❄️", desc:"High-altitude desert — cliffs, icy rivers, vast sky",
    terrainHeight:80, terrainScale:2.2,
    grassColor:new THREE.Color(0x7a8f60), rockColor:new THREE.Color(0x6a6050), snowColor:new THREE.Color(0xe8eef8),
    skyDay:new THREE.Color(0x6699cc), fogDensity:0.004, riverColor:0x55aadd, npcColor:0xcc4422, buildingColor:0xb09070 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Sky phases
// ─────────────────────────────────────────────────────────────────────────────
const SKY = [
  { t:0.00, c:new THREE.Color(0x080815), a:0.04, s:0.0 },
  { t:0.18, c:new THREE.Color(0xff7040), a:0.28, s:0.55 },
  { t:0.30, c:new THREE.Color(0x87ceeb), a:0.65, s:1.3 },
  { t:0.68, c:new THREE.Color(0x87ceeb), a:0.65, s:1.3 },
  { t:0.78, c:new THREE.Color(0xff5520), a:0.25, s:0.4 },
  { t:0.87, c:new THREE.Color(0x080815), a:0.04, s:0.0 },
  { t:1.00, c:new THREE.Color(0x080815), a:0.04, s:0.0 },
];
function sampleSky(t: number, tint: THREE.Color) {
  let i = 0;
  for (let j = 0; j < SKY.length - 1; j++) {
    if (t >= SKY[j].t && t < SKY[j+1].t) { i=j; break; }
  }
  const a = SKY[i], b = SKY[i+1], f = (t - a.t) / (b.t - a.t);
  return {
    color: a.c.clone().lerp(b.c, f).lerp(tint, 0.22),
    ambient: a.a + (b.a - a.a) * f,
    sun: a.s + (b.s - a.s) * f,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  NPC type
// ─────────────────────────────────────────────────────────────────────────────
type NPCState = "patrol" | "investigate" | "chase" | "attack" | "dead";
interface NPC {
  group: THREE.Group; bodyMesh: THREE.Mesh; hp: number; maxHp: number;
  speed: number; dir: THREE.Vector3; changeT: number;
  state: NPCState; id: number;
  waypoints: THREE.Vector3[]; wpIdx: number;
  alertTimer: number; attackCooldown: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ammo pickup type
// ─────────────────────────────────────────────────────────────────────────────
interface AmmoPack { mesh: THREE.Mesh; active: boolean; }

// ─────────────────────────────────────────────────────────────────────────────
//  Floating damage number
// ─────────────────────────────────────────────────────────────────────────────
interface DmgNum { id: number; x: number; y: number; val: number; life: number; }

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const TERRAIN_SIZE = 600;
const TERRAIN_SEGS = 100;
const NPC_COUNT = 16;
const RAIN_COUNT = 2400;
const DAY_SPEED = 0.000055;
const GRAVITY = -22;
const JUMP_VEL = 9;
const DETECTION_RANGE = 32;
const ATTACK_RANGE = 5;
const NPC_DAMAGE = 8;
const SPRINT_MULT = 2.1;
const BASE_SPEED = 11;

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function World() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const [selectedMap, setSelectedMap] = useState<MapConfig | null>(null);
  const [locked, setLocked]     = useState(false);
  const [hp, setHp]             = useState(100);
  const [ammo, setAmmo]         = useState(30);
  const [stamina, setStamina]   = useState(100);
  const [kills, setKills]       = useState(0);
  const [combo, setCombo]       = useState(0);
  const [timeLabel, setTimeLabel] = useState("Dawn");
  const [weather, setWeather]   = useState<"clear"|"rain"|"storm">("clear");
  const [notice, setNotice]     = useState("");
  const [miniDots, setMiniDots] = useState<{x:number;z:number;state:NPCState}[]>([]);
  const [thunderFlash, setThunderFlash] = useState(0);
  const [hitMarker, setHitMarker]       = useState(false);
  const [muzzleFlash, setMuzzleFlash]   = useState(false);
  const [dmgNums, setDmgNums]           = useState<DmgNum[]>([]);
  const [isOnGround, setIsOnGround]     = useState(true);

  const noticeTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const hitMarkerTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const muzzleTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const dmgIdRef      = useRef(0);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 1800);
  }, []);

  const showHitMarker = useCallback(() => {
    setHitMarker(true);
    if (hitMarkerTimer.current) clearTimeout(hitMarkerTimer.current);
    hitMarkerTimer.current = setTimeout(() => setHitMarker(false), 180);
  }, []);

  const showMuzzle = useCallback(() => {
    setMuzzleFlash(true);
    if (muzzleTimer.current) clearTimeout(muzzleTimer.current);
    muzzleTimer.current = setTimeout(() => setMuzzleFlash(false), 90);
  }, []);

  // Mutable refs shared with game loop
  const hpRef      = useRef(100);
  const ammoRef    = useRef(30);
  const staminaRef = useRef(100);
  const killsRef   = useRef(0);
  const comboRef   = useRef(0);
  const comboTimerRef = useRef(0);
  const keysRef    = useRef<Record<string,boolean>>({});
  const npcsRef    = useRef<NPC[]>([]);
  const ammoPacksRef = useRef<AmmoPack[]>([]);
  const weatherRef = useRef<"clear"|"rain"|"storm">("clear");
  const canShootRef = useRef(true);
  const velYRef    = useRef(0);
  const onGroundRef = useRef(true);
  const mapCfgRef  = useRef<MapConfig|null>(null);

  useEffect(() => {
    if (!selectedMap) return;
    mapCfgRef.current = selectedMap;
    hpRef.current=100;    setHp(100);
    ammoRef.current=30;   setAmmo(30);
    staminaRef.current=100; setStamina(100);
    killsRef.current=0;   setKills(0);
    comboRef.current=0;   setCombo(0);
    npcsRef.current=[];
    ammoPacksRef.current=[];
    weatherRef.current="clear"; setWeather("clear");
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, container.clientWidth/container.clientHeight, 0.1, 900);
    camera.position.set(0, cfg.terrainHeight * 0.25 + 8, 0);

    // ── Controls ──────────────────────────────────────────────────────────
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener("lock",   () => setLocked(true));
    controls.addEventListener("unlock", () => setLocked(false));

    // ── Lights ────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.65); scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near=1; sun.shadow.camera.far=600;
    sun.shadow.camera.left=-200; sun.shadow.camera.right=200;
    sun.shadow.camera.top=200;  sun.shadow.camera.bottom=-200;
    scene.add(sun);
    const moon = new THREE.DirectionalLight(0x334466, 0);
    moon.position.set(-100, 120, -80); scene.add(moon);

    // ── Terrain + vertex colours ───────────────────────────────────────────
    const noise2D = createNoise2D();
    function getH(x: number, z: number): number {
      const nx=x/(TERRAIN_SIZE*cfg.terrainScale), nz=z/(TERRAIN_SIZE*cfg.terrainScale);
      return (noise2D(nx*2,nz*2)*0.5+noise2D(nx*4,nz*4)*0.25+
              noise2D(nx*8,nz*8)*0.125+noise2D(nx*16,nz*16)*0.0625) * cfg.terrainHeight;
    }

    const tGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
    tGeo.rotateX(-Math.PI/2);
    const posArr = tGeo.attributes.position.array as Float32Array;
    const vCount = posArr.length/3;
    const cols   = new Float32Array(vCount*3);
    for (let i=0;i<vCount;i++) {
      const x=posArr[i*3], z=posArr[i*3+2];
      const h=getH(x,z); posArr[i*3+1]=h;
      const n=Math.max(0,Math.min(1,h/cfg.terrainHeight));
      const col = n<0.35 ? cfg.grassColor.clone().lerp(cfg.rockColor,n/0.35)
                : n<0.7  ? cfg.rockColor.clone()
                : cfg.rockColor.clone().lerp(cfg.snowColor,(n-0.7)/0.3);
      cols[i*3]=col.r; cols[i*3+1]=col.g; cols[i*3+2]=col.b;
    }
    tGeo.setAttribute("color", new THREE.BufferAttribute(cols,3));
    tGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors:true }));
    terrain.receiveShadow=true; scene.add(terrain);

    // ── Water ─────────────────────────────────────────────────────────────
    const waterMat = new THREE.MeshLambertMaterial({ color:cfg.riverColor, transparent:true, opacity:0.78 });
    if (cfg.id==="karachi") {
      const og = new THREE.PlaneGeometry(TERRAIN_SIZE*1.2, TERRAIN_SIZE*0.5); og.rotateX(-Math.PI/2);
      const ocean = new THREE.Mesh(og, waterMat); ocean.position.set(0,-1,-TERRAIN_SIZE*0.7); scene.add(ocean);
      const bg = new THREE.PlaneGeometry(TERRAIN_SIZE,40); bg.rotateX(-Math.PI/2);
      const beach = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({color:0xd4c090}));
      beach.position.set(0,0.1,-TERRAIN_SIZE*0.4); scene.add(beach);
    } else {
      const rg = new THREE.PlaneGeometry(20,TERRAIN_SIZE); rg.rotateX(-Math.PI/2);
      const river = new THREE.Mesh(rg, waterMat); river.position.set(-38,0.5,0); scene.add(river);
    }

    // ── Roads ─────────────────────────────────────────────────────────────
    const roadMat = new THREE.MeshLambertMaterial({ color:0x444444 });
    const markMat = new THREE.MeshLambertMaterial({ color:0xddcc22 });
    function mkRoad(x1:number,z1:number,x2:number,z2:number) {
      const dx=x2-x1,dz=z2-z1, len=Math.sqrt(dx*dx+dz*dz);
      const cx=(x1+x2)/2, cz=(z1+z2)/2;
      const angle = Math.atan2(dx,dz);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(len,6),roadMat);
      road.rotateX(-Math.PI/2); road.rotation.y=angle;
      road.position.set(cx,0.14,cz); scene.add(road);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(len*0.85,0.3),markMat);
      mark.rotateX(-Math.PI/2); mark.rotation.y=angle;
      mark.position.set(cx,0.17,cz); scene.add(mark);
    }
    [[0,0,50,30],[50,30,80,60],[0,0,-30,-40],[-30,-40,-60,-65],
     [0,0,30,-50],[0,0,-25,45],[50,30,20,70],[-30,-40,-70,-10],
     [20,70,60,80],[-70,-10,-80,20]].forEach(([x1,z1,x2,z2])=>mkRoad(x1,z1,x2,z2));

    // ── Buildings ─────────────────────────────────────────────────────────
    const bldBoxes: THREE.Box3[] = [];
    const wallM = new THREE.MeshLambertMaterial({ color:cfg.buildingColor });
    const roofM = new THREE.MeshLambertMaterial({ color:cfg.id==="lahore"?0x336644:0x8b3535 });
    const winM  = new THREE.MeshLambertMaterial({ color:0x88aacc });
    function mkBuilding(bx:number,bz:number,w:number,h:number,d:number) {
      const by=getH(bx,bz);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallM);
      body.position.set(bx,by+h/2,bz); body.castShadow=true; body.receiveShadow=true; scene.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.9,d+0.6), roofM);
      roof.position.set(bx,by+h+0.45,bz); scene.add(roof);
      if (h>5) {
        for (let f=0;f<Math.floor(h/3);f++) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2), winM);
          win.position.set(bx+w/2+0.01,by+2+f*3,bz); win.rotation.y=Math.PI/2; scene.add(win);
        }
      }
      bldBoxes.push(new THREE.Box3().setFromObject(body));
    }
    [[20,20,10,8,8],[38,28,8,6,7],[52,12,11,9,10],[-22,32,9,7,9],[-42,16,7,5,7],
     [62,-18,10,8,8],[32,-38,8,6,8],[-32,-28,14,12,12],[78,52,9,7,9],[-68,-48,8,6,7],
     [12,68,11,9,9],[-58,42,7,5,8],[45,-60,9,7,9],[-20,-70,8,5,8],[90,-30,10,8,10],
     [10,-90,7,6,7],[-80,20,9,7,9],[60,80,8,5,8],[-90,60,10,7,8],[70,-70,9,6,9],
    ].forEach(([x,z,w,h,d])=>mkBuilding(x,z,w,h,d));

    // ── Trees ─────────────────────────────────────────────────────────────
    const trunkM = new THREE.MeshLambertMaterial({ color:0x5c3d1a });
    const leafM  = new THREE.MeshLambertMaterial({ color:cfg.id==="karachi"?0x55aa22:0x2a5e2c });
    for (let i=0;i<130;i++) {
      const a=Math.random()*Math.PI*2, dist=15+Math.random()*210;
      const tx=Math.cos(a)*dist, tz=Math.sin(a)*dist;
      const th=getH(tx,tz);
      if (th>cfg.terrainHeight*0.8) continue;
      const g=new THREE.Group();
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.44,3.2,6),trunkM);
      const leaf=new THREE.Mesh(new THREE.ConeGeometry(2.4,5.2,7),leafM);
      leaf.position.y=4.2; trunk.castShadow=true; leaf.castShadow=true;
      g.add(trunk,leaf); g.position.set(tx,th+1.6,tz); scene.add(g);
    }

    // ── Rocks ─────────────────────────────────────────────────────────────
    const rockM = new THREE.MeshLambertMaterial({ color:0x808070 });
    for (let i=0;i<45;i++) {
      const rx=(Math.random()-0.5)*400, rz=(Math.random()-0.5)*400;
      const s=0.6+Math.random()*2;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0), rockM);
      rock.position.set(rx,getH(rx,rz)+s*0.4,rz);
      rock.rotation.set(Math.random(),Math.random(),Math.random());
      rock.castShadow=true; scene.add(rock);
    }

    // ── Ammo Packs ────────────────────────────────────────────────────────
    const ammoPackMat  = new THREE.MeshLambertMaterial({ color:0xffcc00 });
    const ammoPackMat2 = new THREE.MeshLambertMaterial({ color:0xff6600 });
    const ammoPositions = [
      [15,15],[40,5],[5,40],[-20,10],[10,-20],[55,55],
      [-50,20],[20,-50],[80,10],[10,80],[-80,-20],[-20,-80],
    ];
    for (const [ax,az] of ammoPositions) {
      const boxGeo = new THREE.BoxGeometry(1.2,0.8,0.6);
      const pack = new THREE.Mesh(boxGeo, ammoPackMat);
      const ay = getH(ax,az);
      pack.position.set(ax, ay+1.0, az);
      scene.add(pack);
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.7), ammoPackMat2);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,0.12), ammoPackMat2);
      cross1.position.set(0,0.5,0); cross2.position.set(0,0.5,0);
      pack.add(cross1, cross2);
      ammoPacksRef.current.push({ mesh: pack, active: true });
    }

    // ── NPCs ──────────────────────────────────────────────────────────────
    const npcBodyBase = new THREE.MeshLambertMaterial({ color:cfg.npcColor });
    const npcHeadM    = new THREE.MeshLambertMaterial({ color:0xffcba4 });

    function makeWaypoints(cx:number,cz:number): THREE.Vector3[] {
      const pts: THREE.Vector3[] = [];
      for (let i=0;i<4;i++) {
        const a=Math.random()*Math.PI*2, d=8+Math.random()*18;
        const wx=cx+Math.cos(a)*d, wz=cz+Math.sin(a)*d;
        pts.push(new THREE.Vector3(wx, getH(wx,wz)+0.75, wz));
      }
      return pts;
    }

    function mkNPC(id:number): NPC {
      const group = new THREE.Group();
      const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.42,1.5,8), npcBodyBase.clone());
      const head     = new THREE.Mesh(new THREE.SphereGeometry(0.42,8,8), npcHeadM.clone());
      const gun      = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.85),
                        new THREE.MeshLambertMaterial({color:0x222222}));
      gun.position.set(0.45,0.3,0.35);
      bodyMesh.castShadow=true; head.castShadow=true;
      head.position.y=1.15;
      group.add(bodyMesh, head, gun);
      const a=Math.random()*Math.PI*2, d=18+Math.random()*95;
      const nx=Math.cos(a)*d, nz=Math.sin(a)*d;
      group.position.set(nx, getH(nx,nz)+0.75, nz);
      scene.add(group);
      return {
        group, bodyMesh, hp:100, maxHp:100,
        speed: 2.0+Math.random()*1.5,
        dir: new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize(),
        changeT: 2+Math.random()*4,
        state:"patrol", id,
        waypoints: makeWaypoints(nx,nz), wpIdx:0,
        alertTimer:0, attackCooldown:0,
      };
    }
    for (let i=0;i<NPC_COUNT;i++) npcsRef.current.push(mkNPC(i));

    // ── Rain ──────────────────────────────────────────────────────────────
    const rainPos = new Float32Array(RAIN_COUNT*3);
    for (let i=0;i<RAIN_COUNT;i++) {
      rainPos[i*3]=(Math.random()-0.5)*260;
      rainPos[i*3+1]=Math.random()*100;
      rainPos[i*3+2]=(Math.random()-0.5)*260;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos,3));
    const rainMesh = new THREE.Points(rainGeo,
      new THREE.PointsMaterial({color:0xaaddff,size:0.16,transparent:true,opacity:0.45}));
    rainMesh.visible=false; scene.add(rainMesh);

    // ── Raycaster ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();

    function spawnAmmoDrop(pos: THREE.Vector3) {
      const geo = new THREE.SphereGeometry(0.5,6,6);
      const mat = new THREE.MeshLambertMaterial({color:0xffcc00});
      const mesh = new THREE.Mesh(geo,mat);
      mesh.position.copy(pos).setY(pos.y+1.0);
      scene.add(mesh);
      ammoPacksRef.current.push({ mesh, active:true });
    }

    function shoot() {
      if (!canShootRef.current) return;
      if (ammoRef.current<=0) { flash("No ammo! Press R to reload"); return; }
      canShootRef.current=false;
      ammoRef.current-=1; setAmmo(ammoRef.current);
      showMuzzle();
      setTimeout(() => { canShootRef.current=true; }, 190);

      raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
      const targets = npcsRef.current
        .filter(n=>n.state!=="dead")
        .flatMap(n=>n.group.children);
      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length) return;

      const npc = npcsRef.current.find(
        n=>n.state!=="dead" && n.group.children.includes(hits[0].object)
      );
      if (!npc) return;

      const dmg = 30+Math.floor(Math.random()*20);
      npc.hp -= dmg;
      showHitMarker();

      // floating damage number using screen projection
      const worldPos = npc.group.position.clone().add(new THREE.Vector3(0,2,0));
      const projected = worldPos.clone().project(camera);
      const sx = (projected.x*0.5+0.5)*100;
      const sy = (1-(projected.y*0.5+0.5))*100;
      const newId = ++dmgIdRef.current;
      setDmgNums(prev=>[...prev,{id:newId,x:sx,y:sy,val:dmg,life:1}]);
      setTimeout(()=>setDmgNums(prev=>prev.filter(d=>d.id!==newId)), 800);

      // flash red
      (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff2200);
      setTimeout(()=>{
        if(npc.state!=="dead")
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);
      }, 280);

      if (npc.hp<=0) {
        npc.state="dead"; npc.group.visible=false;
        killsRef.current+=1; setKills(killsRef.current);
        // combo
        comboTimerRef.current=3;
        comboRef.current+=1; setCombo(comboRef.current);
        const comboMsg = comboRef.current>=5?"RAMPAGE! 🔥":comboRef.current>=3?"MULTI-KILL! ⚡":"Enemy down! 💀";
        flash(comboMsg);
        // drop ammo at NPC position
        spawnAmmoDrop(npc.group.position.clone());
        // respawn
        setTimeout(()=>{
          const ra=Math.random()*Math.PI*2, rd=35+Math.random()*80;
          const rx=Math.cos(ra)*rd, rz=Math.sin(ra)*rd;
          npc.group.position.set(rx, getH(rx,rz)+0.75, rz);
          npc.waypoints=makeWaypoints(rx,rz); npc.wpIdx=0;
          npc.hp=npc.maxHp; npc.state="patrol"; npc.group.visible=true;
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);
        }, 7000);
      } else {
        npc.state="chase";
        npc.alertTimer=12;
      }
    }

    // ── Input ─────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code]=true;
      if (e.code==="KeyR") {
        ammoRef.current=30; setAmmo(30); flash("Reloaded ✓");
      }
      if (e.code==="KeyP") {
        const c:{[k:string]:"clear"|"rain"|"storm"} = {clear:"rain",rain:"storm",storm:"clear"};
        const w=c[weatherRef.current]; weatherRef.current=w; setWeather(w);
        rainMesh.visible=w!=="clear"; flash(`Weather: ${w.toUpperCase()}`);
      }
    };
    const onKeyUp   = (e:KeyboardEvent) => { keysRef.current[e.code]=false; };
    const onClick   = () => { if (!controls.isLocked) controls.lock(); else shoot(); };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup",   onKeyUp);
    renderer.domElement.addEventListener("click", onClick);

    // ── Game loop ──────────────────────────────────────────────────────────
    const clock     = new THREE.Clock();
    const playerBox = new THREE.Box3();
    let dayTime     = 0.25;
    let weatherTimer = 40;
    let dmgTimer    = 0;
    let thunderTimer = 0;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // ── Day / Night ───────────────────────────────────────────────────
      dayTime = (dayTime + DAY_SPEED) % 1;
      const sky = sampleSky(dayTime, cfg.skyDay);
      renderer.setClearColor(sky.color);
      ambient.intensity = sky.ambient;
      sun.intensity     = sky.sun;
      moon.intensity    = (dayTime>0.82||dayTime<0.18) ? 0.2 : 0;
      const sunA=dayTime*Math.PI*2;
      sun.position.set(Math.cos(sunA)*220, Math.sin(sunA)*180, 100);
      const fogD = weatherRef.current==="storm"?cfg.fogDensity*4
                 : weatherRef.current==="rain" ?cfg.fogDensity*2
                 : (dayTime>0.82||dayTime<0.18)?cfg.fogDensity*1.5 : cfg.fogDensity;
      scene.fog = new THREE.FogExp2(sky.color.getHex(), fogD);
      const hr=Math.floor(dayTime*24);
      setTimeLabel(hr<5?"Night":hr<8?"Dawn":hr<17?"Day":hr<20?"Sunset":"Night");

      // ── Weather ───────────────────────────────────────────────────────
      weatherTimer-=dt;
      if (weatherTimer<=0) {
        weatherTimer=30+Math.random()*50;
        const opts:("clear"|"rain"|"storm")[] = ["clear","clear","rain","storm"];
        const w=opts[Math.floor(Math.random()*opts.length)];
        weatherRef.current=w; setWeather(w); rainMesh.visible=w!=="clear";
      }
      if (weatherRef.current==="storm") {
        thunderTimer-=dt;
        if (thunderTimer<=0) {
          thunderTimer=5+Math.random()*9;
          setThunderFlash(1); ambient.intensity=3;
          setTimeout(()=>{ ambient.intensity=sky.ambient; setThunderFlash(0); }, 110);
          setTimeout(()=>{ ambient.intensity=3; setThunderFlash(0.6);
            setTimeout(()=>{ ambient.intensity=sky.ambient; setThunderFlash(0); },80);
          }, 200);
        }
      }

      // ── Rain ──────────────────────────────────────────────────────────
      if (rainMesh.visible) {
        const spd=weatherRef.current==="storm"?32:18;
        const ra=rainMesh.geometry.attributes.position.array as Float32Array;
        for (let i=0;i<RAIN_COUNT;i++) {
          ra[i*3+1]-=spd*dt;
          if (ra[i*3+1]<-2) {
            ra[i*3]=camera.position.x+(Math.random()-0.5)*160;
            ra[i*3+1]=camera.position.y+55+Math.random()*30;
            ra[i*3+2]=camera.position.z+(Math.random()-0.5)*160;
          }
        }
        rainMesh.geometry.attributes.position.needsUpdate=true;
      }

      // ── Ammo packs rotate + collect ───────────────────────────────────
      for (const pack of ammoPacksRef.current) {
        if (!pack.active) continue;
        pack.mesh.rotation.y+=dt*1.8;
        if (camera.position.distanceTo(pack.mesh.position)<2.5) {
          pack.active=false; pack.mesh.visible=false;
          ammoRef.current=Math.min(30, ammoRef.current+10); setAmmo(ammoRef.current);
          flash("+10 Ammo 🔫");
        }
      }

      // ── Combo timer ───────────────────────────────────────────────────
      if (comboTimerRef.current>0) {
        comboTimerRef.current-=dt;
        if (comboTimerRef.current<=0) { comboRef.current=0; setCombo(0); }
      }

      // ── Player movement ───────────────────────────────────────────────
      if (controls.isLocked) {
        const k = keysRef.current;
        const sprinting = k["ShiftLeft"]||k["ShiftRight"];

        // Stamina
        if (sprinting && (k["KeyW"]||k["ArrowUp"]||k["KeyS"]||k["ArrowDown"]||k["KeyA"]||k["KeyD"])) {
          staminaRef.current=Math.max(0,staminaRef.current-30*dt);
        } else {
          staminaRef.current=Math.min(100,staminaRef.current+18*dt);
        }
        setStamina(Math.round(staminaRef.current));

        const speed = (sprinting && staminaRef.current>5) ? BASE_SPEED*SPRINT_MULT : BASE_SPEED;
        let fx=0,fz=0;
        if (k["KeyW"]||k["ArrowUp"])    fz-=1;
        if (k["KeyS"]||k["ArrowDown"])  fz+=1;
        if (k["KeyA"]||k["ArrowLeft"])  fx-=1;
        if (k["KeyD"]||k["ArrowRight"]) fx+=1;

        if (fx!==0||fz!==0) {
          const len=Math.sqrt(fx*fx+fz*fz);
          controls.moveRight((fx/len)*speed*dt);
          controls.moveForward((-fz/len)*speed*dt);
        }

        // Jump + gravity
        if ((k["Space"]||k["KeyE"]) && onGroundRef.current) {
          velYRef.current = JUMP_VEL; onGroundRef.current=false; setIsOnGround(false);
        }
        velYRef.current += GRAVITY*dt;
        camera.position.y += velYRef.current*dt;

        // Terrain clamp
        const gy=getH(camera.position.x, camera.position.z)+1.9;
        if (camera.position.y<=gy) {
          camera.position.y=gy; velYRef.current=0;
          if (!onGroundRef.current) { onGroundRef.current=true; setIsOnGround(true); }
        }

        // World bounds
        camera.position.x=Math.max(-270,Math.min(270,camera.position.x));
        camera.position.z=Math.max(-270,Math.min(270,camera.position.z));

        // Building collision
        playerBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1.2,2,1.2));
        for (const box of bldBoxes) {
          if (playerBox.intersectsBox(box)) {
            const c=new THREE.Vector3(); box.getCenter(c);
            camera.position.add(camera.position.clone().sub(c).setY(0).normalize().multiplyScalar(0.6));
          }
        }

        // NPC damage to player
        dmgTimer+=dt;
        if (dmgTimer>=2.5) {
          dmgTimer=0;
          for (const npc of npcsRef.current) {
            if (npc.state==="dead") continue;
            if (npc.group.position.distanceTo(camera.position)<ATTACK_RANGE) {
              hpRef.current=Math.max(0,hpRef.current-NPC_DAMAGE); setHp(hpRef.current);
            }
          }
        }
      }

      // ── NPC AI ────────────────────────────────────────────────────────
      for (const npc of npcsRef.current) {
        if (npc.state==="dead") continue;

        const toPlayer = camera.position.clone().sub(npc.group.position).setY(0);
        const distToPlayer = toPlayer.length();

        npc.changeT-=dt;
        npc.attackCooldown=Math.max(0,npc.attackCooldown-dt);
        if (npc.alertTimer>0) npc.alertTimer-=dt;

        switch (npc.state) {
          case "patrol": {
            // detect player
            if (distToPlayer<DETECTION_RANGE) {
              npc.state="investigate"; npc.alertTimer=3; break;
            }
            const wp=npc.waypoints[npc.wpIdx];
            const toWp=wp.clone().sub(npc.group.position).setY(0);
            if (toWp.length()<2) { npc.wpIdx=(npc.wpIdx+1)%npc.waypoints.length; break; }
            toWp.normalize();
            npc.group.position.addScaledVector(toWp, npc.speed*dt);
            npc.dir.copy(toWp);
            break;
          }
          case "investigate": {
            if (distToPlayer<DETECTION_RANGE*0.6) { npc.state="chase"; npc.alertTimer=15; break; }
            if (npc.alertTimer<=0) { npc.state="patrol"; break; }
            // walk toward last known direction, then stop
            toPlayer.normalize();
            npc.group.position.addScaledVector(toPlayer, npc.speed*0.6*dt);
            npc.dir.copy(toPlayer);
            break;
          }
          case "chase": {
            if (distToPlayer>DETECTION_RANGE*1.5 && npc.alertTimer<=0) {
              npc.state="patrol"; break;
            }
            if (distToPlayer<=ATTACK_RANGE+1) { npc.state="attack"; break; }
            toPlayer.normalize();
            npc.group.position.addScaledVector(toPlayer, npc.speed*2*dt);
            npc.dir.copy(toPlayer);
            if (npc.alertTimer>0) npc.alertTimer-=dt;
            break;
          }
          case "attack": {
            if (distToPlayer>ATTACK_RANGE+3) { npc.state="chase"; npc.alertTimer=10; break; }
            // bob body as attack animation
            npc.group.position.y = getH(npc.group.position.x,npc.group.position.z)+0.75
              + Math.abs(Math.sin(Date.now()*0.01))*0.15;
            // damage handled by player dmgTimer above
            break;
          }
        }

        // Keep on terrain
        const nx=npc.group.position.x, nz=npc.group.position.z;
        npc.group.position.set(
          Math.max(-245,Math.min(245,nx)),
          getH(nx,nz)+0.75,
          Math.max(-245,Math.min(245,nz))
        );
        if (npc.dir.length()>0.01)
          npc.group.rotation.y=Math.atan2(npc.dir.x,npc.dir.z);
      }

      // ── Minimap ───────────────────────────────────────────────────────
      setMiniDots(
        npcsRef.current.filter(n=>n.state!=="dead").map(n=>({
          x:(n.group.position.x-camera.position.x)/5,
          z:(n.group.position.z-camera.position.z)/5,
          state:n.state,
        }))
      );

      renderer.render(scene, camera);
    }
    animate();

    const onResize=()=>{
      camera.aspect=container.clientWidth/container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth,container.clientHeight);
    };
    window.addEventListener("resize",onResize);

    return ()=>{
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown",onKeyDown);
      document.removeEventListener("keyup",onKeyUp);
      renderer.domElement.removeEventListener("click",onClick);
      window.removeEventListener("resize",onResize);
      controls.dispose(); renderer.dispose();
      if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      npcsRef.current=[]; ammoPacksRef.current=[];
    };
  }, [selectedMap, flash, showHitMarker, showMuzzle]);

  // ── Derived UI ────────────────────────────────────────────────────────────
  const timeColor = timeLabel==="Night"?"text-blue-200":timeLabel==="Dawn"?"text-orange-300"
                  :timeLabel==="Sunset"?"text-red-300":"text-yellow-200";
  const weatherIcon = weather==="storm"?"⛈":weather==="rain"?"🌧":"☀️";
  const hpGrad = hp>60?"from-green-600 to-green-400":hp>30?"from-yellow-600 to-yellow-400":"from-red-700 to-red-400";
  const stGrad = stamina>50?"from-sky-600 to-sky-400":stamina>25?"from-amber-500 to-amber-300":"from-orange-600 to-orange-400";

  // ── Map select ────────────────────────────────────────────────────────────
  if (!selectedMap) {
    return (
      <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans select-none">
        <div className="absolute inset-0 opacity-8" style={{
          backgroundImage:"linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)",
          backgroundSize:"44px 44px",
        }}/>
        <div className="relative z-10 w-full max-w-4xl px-6 text-center">
          <div className="text-6xl mb-3">🌍</div>
          <h1 className="font-display text-5xl font-bold text-amber-400 mb-2 drop-shadow-[0_0_24px_rgba(244,180,26,0.4)]">
            Ranjha World
          </h1>
          <p className="text-white/45 font-display uppercase tracking-widest text-sm mb-8">Choose your battlefield</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {MAPS.map(m=>(
              <button key={m.id} onClick={()=>setSelectedMap(m)}
                className="group relative p-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-left transition-all hover:scale-[1.02]">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl font-bold text-white uppercase tracking-wider mb-0.5">{m.name}</div>
                    <div className="text-white/45 text-sm">{m.desc}</div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {m.id==="hunza"||m.id==="skardu"?"Mountains":m.id==="lahore"?"Plains":"Coastal"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        {NPC_COUNT} NPCs • Patrol AI
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-300">
                        Jump • Sprint • Ammo drops
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 right-4 text-amber-400 opacity-0 group-hover:opacity-80 font-display text-sm uppercase tracking-widest transition-opacity">Play →</div>
              </button>
            ))}
          </div>
          <button onClick={()=>setLocation("/lobby")}
            className="px-6 py-2 bg-white/6 hover:bg-white/12 border border-white/12 rounded-lg text-white/50 font-display uppercase tracking-widest text-sm transition-colors">
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
      {/* WebGL */}
      <div ref={mountRef} className="absolute inset-0"/>

      {/* Thunder flash */}
      {thunderFlash>0&&(
        <div className="absolute inset-0 z-30 pointer-events-none"
          style={{background:`rgba(220,235,255,${thunderFlash*0.55})`}}/>
      )}

      {/* Muzzle flash */}
      {muzzleFlash&&(
        <div className="absolute inset-0 z-20 pointer-events-none"
          style={{background:"rgba(255,220,100,0.12)"}}/>
      )}

      {/* Lock overlay */}
      {!locked&&hp>0&&(
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/78 backdrop-blur-sm cursor-pointer"
          onClick={()=>mountRef.current?.querySelector("canvas")?.requestPointerLock()}>
          <div className="text-center space-y-4 px-8 max-w-sm">
            <div className="text-5xl">{selectedMap.emoji}</div>
            <h1 className="font-display text-4xl font-bold text-amber-400">{selectedMap.name}</h1>
            <p className="text-white/70 font-display uppercase tracking-widest">Click to Enter World</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/50 font-display text-left max-w-xs mx-auto">
              <p>WASD — Move</p>       <p>Mouse — Look</p>
              <p>Click — Shoot</p>     <p>R — Reload</p>
              <p>Shift — Sprint</p>    <p>Space — Jump</p>
              <p>P — Weather</p>       <p>ESC — Unlock</p>
            </div>
            <button onClick={e=>{e.stopPropagation();setSelectedMap(null);}}
              className="mt-2 px-5 py-2 bg-white/8 hover:bg-white/15 border border-white/12 rounded-lg text-white/50 font-display uppercase tracking-widest text-sm">
              ← Change Map
            </button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      {locked&&hp>0&&(
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {hitMarker ? (
            <div className="relative w-10 h-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-400 text-2xl font-bold leading-none">✕</div>
            </div>
          ) : (
            <div className="relative w-9 h-9">
              <div className="absolute top-1/2 left-0 w-full h-px bg-amber-400 opacity-80"/>
              <div className="absolute left-1/2 top-0 h-full w-px bg-amber-400 opacity-80"/>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-amber-400 opacity-80"/>
            </div>
          )}
        </div>
      )}

      {/* Floating damage numbers */}
      {dmgNums.map(d=>(
        <div key={d.id}
          className="absolute z-40 pointer-events-none font-display font-bold text-red-400 text-lg drop-shadow animate-bounce"
          style={{left:`${d.x}%`,top:`${d.y}%`,transform:"translate(-50%,-100%)"}}>
          -{d.val}
        </div>
      ))}

      {/* ── HUD ── */}
      {locked&&hp>0&&(
        <>
          {/* Minimap */}
          <div className="absolute top-4 left-4 z-20" style={{width:152,height:152}}>
            <div className="relative w-full h-full rounded-xl bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 opacity-14" style={{
                backgroundImage:"linear-gradient(rgba(255,255,255,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.18) 1px,transparent 1px)",
                backgroundSize:"19px 19px",
              }}/>
              {/* Player */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-300/50 z-10"/>
              {/* Ammo packs */}
              {ammoPacksRef.current.filter(p=>p.active).map((p,i)=>{
                const cx=50+(p.mesh.position.x)/5+50*0;
                const cy=50+(p.mesh.position.z)/5+50*0;
                if(cx<2||cx>98||cy<2||cy>98) return null;
                return <div key={i} className="absolute w-2 h-2 rounded-sm bg-yellow-400 -translate-x-1/2 -translate-y-1/2"
                  style={{left:`${cx}%`,top:`${cy}%`}}/>;
              })}
              {/* NPCs */}
              {miniDots.map((d,i)=>{
                const cx=50+d.x, cy=50+d.z;
                if(cx<2||cx>98||cy<2||cy>98) return null;
                const col = d.state==="attack"?"bg-orange-500 animate-ping":
                            d.state==="chase"?"bg-orange-400 animate-pulse":
                            d.state==="investigate"?"bg-yellow-400":"bg-red-500";
                return <div key={i} className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${col}`}
                  style={{left:`${cx}%`,top:`${cy}%`}}/>;
              })}
              <div className="absolute bottom-1 left-2 text-[8px] font-display uppercase tracking-widest text-white/45 truncate max-w-[90%]">
                {selectedMap.name}
              </div>
              {/* Compass */}
              <div className="absolute top-1 right-2 text-[8px] font-display text-white/40">N↑</div>
            </div>
          </div>

          {/* Top centre — time + weather */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span>{weatherIcon}</span>
              <span className={`font-display text-sm font-bold uppercase tracking-wider ${timeColor}`}>{timeLabel}</span>
              {weather!=="clear"&&<span className="text-white/35 font-display text-xs uppercase">· {weather}</span>}
            </div>
          </div>

          {/* Top right — kills + combo */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
            <div className="px-3 py-2 rounded-lg bg-black/65 border border-amber-500/40 backdrop-blur-md flex items-center gap-2">
              <span className="text-amber-400 text-xs font-display uppercase tracking-widest">Kills</span>
              <span className="font-display text-2xl font-bold text-amber-400 tabular-nums">{kills}</span>
            </div>
            {combo>=2&&(
              <div className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                <span className="font-display text-xs uppercase tracking-wider text-red-300">x{combo} COMBO</span>
                <span className="text-base">{combo>=5?"🔥":"⚡"}</span>
              </div>
            )}
          </div>

          {/* Bottom left — HP / Stamina / Ammo */}
          <div className="absolute bottom-5 left-5 z-20 w-64 space-y-2">
            <div className="rounded-xl bg-black/72 border border-white/10 backdrop-blur-md p-3 space-y-2.5">
              {/* HP */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-red-400 w-8">HP</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${hpGrad} transition-all duration-300`} style={{width:`${hp}%`}}/>
                </div>
                <span className="font-display text-sm font-bold tabular-nums text-white/80 w-7 text-right">{hp}</span>
              </div>
              {/* Stamina */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-sky-400 w-8">STM</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${stGrad} transition-all duration-150`} style={{width:`${stamina}%`}}/>
                </div>
                <span className="font-display text-xs tabular-nums text-white/50 w-7 text-right">{stamina}</span>
              </div>
              {/* Ammo */}
              <div className="flex items-center gap-2">
                <span className="text-base">🔫</span>
                <span className={`font-display text-2xl font-bold tabular-nums ${ammo<=5?"text-red-400 animate-pulse":"text-amber-300"}`}>{ammo}</span>
                <span className="text-white/30 text-xs font-display">/ 30</span>
                <span className="ml-auto text-[9px] text-white/28 font-display uppercase">[R]</span>
              </div>
            </div>
            {/* Air indicator */}
            {!isOnGround&&(
              <div className="px-2 py-1 rounded-md bg-sky-500/20 border border-sky-500/40 text-sky-300 font-display text-[9px] uppercase tracking-widest text-center">
                ✦ Airborne
              </div>
            )}
            <div className="text-[9px] font-display uppercase tracking-widest text-white/22 text-center">
              [P] weather · [Shift] sprint · [Space] jump · ESC unlock
            </div>
          </div>

          {/* Vignette on low HP */}
          {hp<30&&(
            <div className="absolute inset-0 pointer-events-none z-10 animate-pulse"
              style={{boxShadow:"inset 0 0 160px rgba(200,10,10,0.65)"}}/>
          )}

          {/* Notice */}
          {notice&&(
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-lg bg-black/82 border border-amber-500/40 backdrop-blur-md font-display text-sm uppercase tracking-widest text-amber-300">
              {notice}
            </div>
          )}

          {/* NPC state legend — bottom right */}
          <div className="absolute bottom-5 right-5 z-20 space-y-1">
            {[
              {col:"bg-orange-500",label:"Attacking"},
              {col:"bg-orange-400",label:"Chasing"},
              {col:"bg-yellow-400",label:"Alert"},
              {col:"bg-red-500",   label:"Patrol"},
              {col:"bg-yellow-400",label:"Ammo drop"},
            ].slice(0,4).map((l,i)=>(
              <div key={i} className="flex items-center gap-2 text-[9px] font-display uppercase tracking-widest text-white/40">
                <div className={`w-2 h-2 rounded-full ${l.col}`}/> {l.label}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Death */}
      {hp<=0&&(
        <div className="absolute inset-0 z-40 bg-red-950/88 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="text-7xl mb-4">💀</div>
          <h2 className="font-display text-6xl font-bold text-red-400 mb-2">Eliminated</h2>
          <p className="text-white/60 font-display uppercase tracking-widest text-sm">
            Kills: <span className="text-amber-400 font-bold">{kills}</span>
            {kills>=5&&<span className="ml-2 text-red-300">{kills>=10?"🏆 Legend":kills>=5?"⭐ Warrior":""}</span>}
          </p>
          <div className="flex gap-3 mt-8">
            <button onClick={()=>setSelectedMap(null)}
              className="px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-display uppercase tracking-widest rounded-lg transition-colors text-sm">
              Change Map
            </button>
            <button onClick={()=>{ hpRef.current=100; setHp(100); ammoRef.current=30; setAmmo(30); }}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-display uppercase tracking-widest rounded-lg transition-colors text-sm">
              Respawn
            </button>
            <button onClick={()=>setLocation("/lobby")}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 font-display uppercase tracking-widest rounded-lg transition-colors text-sm">
              Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
