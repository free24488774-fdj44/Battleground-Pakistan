import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { useGame } from "@/contexts/GameContext";
import { VEHICLES, getVehicle, applyMods, toArcadePhysics, DEFAULT_MODS } from "@/lib/vehicles";

// ─────────────────────────────────────────────────────────────────────────────
//  PointerLockControls (desktop)
// ─────────────────────────────────────────────────────────────────────────────
class PointerLockControls extends THREE.EventDispatcher {
  camera:THREE.Camera; domElement:HTMLElement; isLocked=false;
  private _euler=new THREE.Euler(0,0,0,"YXZ");
  private _PI2=Math.PI/2;
  private _onMouse:(e:MouseEvent)=>void;
  private _onLC:()=>void;
  constructor(cam:THREE.Camera,el:HTMLElement){
    super();this.camera=cam;this.domElement=el;
    this._onMouse=(e)=>{ if(!this.isLocked)return;
      this._euler.setFromQuaternion(cam.quaternion);
      this._euler.y-=(e.movementX||0)*0.002;
      this._euler.x-=(e.movementY||0)*0.002;
      this._euler.x=Math.max(-this._PI2*0.88,Math.min(this._PI2*0.88,this._euler.x));
      cam.quaternion.setFromEuler(this._euler);};
    this._onLC=()=>{ this.isLocked=document.pointerLockElement===el;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.dispatchEvent({type:this.isLocked?"lock":"unlock"} as any);};
    document.addEventListener("mousemove",this._onMouse);
    document.addEventListener("pointerlockchange",this._onLC);
  }
  lock(){this.domElement.requestPointerLock();}
  unlock(){document.exitPointerLock();}
  moveForward(d:number){const v=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,0);
    v.crossVectors(this.camera.up,v);this.camera.position.addScaledVector(v,d);}
  moveRight(d:number){const v=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,0);
    this.camera.position.addScaledVector(v,d);}
  dispose(){document.removeEventListener("mousemove",this._onMouse);
    document.removeEventListener("pointerlockchange",this._onLC);}
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map configs
// ─────────────────────────────────────────────────────────────────────────────
interface MapConfig{id:string;name:string;emoji:string;desc:string;
  skyDay:THREE.Color;fogDensity:number;biome:string;sunColor:number;
  ambientHex:number;groundHex:number;
  skinTone:number;shirtColor:number;pantsColor:number;}
const MAPS:MapConfig[]=[
  {id:"hunza",name:"Hunza Valley",emoji:"🏔",desc:"Karakoram ranges — glaciers, sharp peaks, green valley floor",
   skyDay:new THREE.Color(0x5588bb),fogDensity:0.004,biome:"mountains",sunColor:0xfff0cc,ambientHex:0x8899bb,groundHex:0x3a5a1a,
   skinTone:0xcda882,shirtColor:0xe8dfc0,pantsColor:0x9a9070},
  {id:"lahore",name:"Lahore Fort",emoji:"🕌",desc:"Abandoned Mughal city — broken arches, red brick, overgrown ruins",
   skyDay:new THREE.Color(0xcc8844),fogDensity:0.006,biome:"ruins",sunColor:0xffcc88,ambientHex:0xaa7755,groundHex:0x8b6040,
   skinTone:0xc08858,shirtColor:0x6a4030,pantsColor:0x3a2418},
  {id:"multan",name:"Multan Desert",emoji:"🏜",desc:"Sandy dunes, abandoned mud structures, dusty battle royale terrain",
   skyDay:new THREE.Color(0xddaa66),fogDensity:0.008,biome:"desert",sunColor:0xffaa44,ambientHex:0xcc9955,groundHex:0xd4a84b,
   skinTone:0xb87840,shirtColor:0xc4a860,pantsColor:0x9a8040},
  {id:"karachi",name:"Karachi Coast",emoji:"🌊",desc:"Ocean waves, beach, modern ruins, coastal battle royale",
   skyDay:new THREE.Color(0x88bbdd),fogDensity:0.005,biome:"coastal",sunColor:0xffffff,ambientHex:0x99aabb,groundHex:0xd4c090,
   skinTone:0xc09060,shirtColor:0x2a4488,pantsColor:0x1a2236},
  {id:"islamabad",name:"Margalla Hills",emoji:"🕌",desc:"Capital city — wide boulevards, Faisal Masjid, green parks under the hills",
   skyDay:new THREE.Color(0x7fb0e0),fogDensity:0.004,biome:"capital",sunColor:0xfff2d8,ambientHex:0x8fae8f,groundHex:0x4a7a3a,
   skinTone:0xc4986a,shirtColor:0x3a5a3a,pantsColor:0x2a2a2a},
  {id:"faisalabad",name:"Clock Tower",emoji:"🕰",desc:"Faisalabad's iconic 8-spoke bazaar wheel, radiating out from Ghanta Ghar",
   skyDay:new THREE.Color(0xcfa878),fogDensity:0.006,biome:"bazaar",sunColor:0xffcc99,ambientHex:0xb09878,groundHex:0x8a7860,
   skinTone:0xb8865a,shirtColor:0x6a5a3a,pantsColor:0x2a2420},
  {id:"skardu",name:"Skardu Lakes",emoji:"🏞",desc:"K2's gateway — turquoise lakes, Shangrila's red-roof cottages, snow giants",
   skyDay:new THREE.Color(0x6fa8e0),fogDensity:0.003,biome:"lakes",sunColor:0xffffff,ambientHex:0x9ab0c8,groundHex:0x7a8060,
   skinTone:0xc4a078,shirtColor:0x8a3838,pantsColor:0x3a3630},
  {id:"murree",name:"Murree Hills",emoji:"🌲",desc:"Pine-forested hill station — colorful cottages, cool mist, winding hill roads",
   skyDay:new THREE.Color(0x9ab8cf),fogDensity:0.008,biome:"hillstation",sunColor:0xeef2ea,ambientHex:0x7a9a7a,groundHex:0x2a4a28,
   skinTone:0xc4a082,shirtColor:0x6a3838,pantsColor:0x2a2a2a},
  {id:"peshawar",name:"Peshawar Bazaar",emoji:"🏪",desc:"Old-city bazaar streets — dense shopfronts, motorbikes, decorated trucks",
   skyDay:new THREE.Color(0xd8c0a0),fogDensity:0.007,biome:"bazaar2",sunColor:0xffddaa,ambientHex:0xb8a888,groundHex:0x8a7a5a,
   skinTone:0xb8865a,shirtColor:0x4a5a3a,pantsColor:0xe8e0d0},
  {id:"quetta",name:"Quetta Highlands",emoji:"⛰",desc:"Balochistan's dry highland city — sandy tones, university district",
   skyDay:new THREE.Color(0xe0c8a0),fogDensity:0.004,biome:"highland",sunColor:0xffe8c0,ambientHex:0xc0a880,groundHex:0xa08858,
   skinTone:0xb8886a,shirtColor:0x5a4a3a,pantsColor:0x8a7858},
  {id:"kaghan",name:"Naran-Kaghan",emoji:"🏔",desc:"Kunhar River valley — hotels lining the water, snow peaks on both sides",
   skyDay:new THREE.Color(0x7fb0dd),fogDensity:0.003,biome:"river",sunColor:0xffffff,ambientHex:0x9ab0b8,groundHex:0x5a7050,
   skinTone:0xc4a078,shirtColor:0x4a5a6a,pantsColor:0x2a2a2a},
  {id:"fortress",name:"Fortress Stadium",emoji:"🏟",desc:"Lahore's Fortress Stadium & Square Mall district — cricket ground, market lanes",
   skyDay:new THREE.Color(0x8fb8dd),fogDensity:0.005,biome:"stadium",sunColor:0xffe8c8,ambientHex:0x9aa898,groundHex:0x5a7a3a,
   skinTone:0xc4986a,shirtColor:0x2a4a6a,pantsColor:0x2a2a2a},
];

// ─────────────────────────────────────────────────────────────────────────────
//  Sky
// ─────────────────────────────────────────────────────────────────────────────
const SKY_BASE=[
  {t:0.00,c:new THREE.Color(0x060810),a:0.04,s:0.0},
  {t:0.18,c:new THREE.Color(0xff7040),a:0.28,s:0.55},
  {t:0.30,c:new THREE.Color(0x87ceeb),a:0.65,s:1.3},
  {t:0.68,c:new THREE.Color(0x87ceeb),a:0.65,s:1.3},
  {t:0.78,c:new THREE.Color(0xff5520),a:0.25,s:0.4},
  {t:0.87,c:new THREE.Color(0x060810),a:0.04,s:0.0},
  {t:1.00,c:new THREE.Color(0x060810),a:0.04,s:0.0},
];
function sampleSky(t:number,tint:THREE.Color){
  let i=0;
  for(let j=0;j<SKY_BASE.length-1;j++){if(t>=SKY_BASE[j].t&&t<SKY_BASE[j+1].t){i=j;break;}}
  const a=SKY_BASE[i],b=SKY_BASE[i+1],f=(t-a.t)/(b.t-a.t);
  return{color:a.c.clone().lerp(b.c,f).lerp(tint,0.28),ambient:a.a+(b.a-a.a)*f,sun:a.s+(b.s-a.s)*f};
}

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
type NPCState="patrol"|"investigate"|"chase"|"attack"|"dead";
interface NPC{group:THREE.Group;bodyMesh:THREE.Mesh;hp:number;maxHp:number;
  speed:number;dir:THREE.Vector3;changeT:number;state:NPCState;id:number;
  waypoints:THREE.Vector3[];wpIdx:number;alertTimer:number;attackCooldown:number;}
interface PickupItem{mesh:THREE.Object3D;active:boolean;respawnTimer:number;}
interface CarState{group:THREE.Group;vel:number;heading:number;steer:number;inUse:boolean;}
type WeaponType="pistol"|"ak47"|"shotgun"|"sniper";
interface WeaponPickup{mesh:THREE.Group;active:boolean;type:WeaponType;respawnTimer:number;}
interface GrenadeObj{mesh:THREE.Mesh;vel:THREE.Vector3;alive:boolean;timer:number;exploded:boolean;}
const WEAPON_CFG:{[k in WeaponType]:{dmg:number;rate:number;spread:number;maxAmmo:number;pellets:number;label:string;col:number}}={
  pistol: {dmg:28,rate:320, spread:0.025,maxAmmo:12,pellets:1,label:"Pistol",  col:0x8899aa},
  ak47:   {dmg:36,rate:110, spread:0.035,maxAmmo:30,pellets:1,label:"AK-47",   col:0x554422},
  shotgun:{dmg:18,rate:850, spread:0.18, maxAmmo:8, pellets:6,label:"Shotgun", col:0x774433},
  sniper: {dmg:90,rate:1600,spread:0.003,maxAmmo:5, pellets:1,label:"Sniper",  col:0x334455},
};

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const TSIZE=600;const TSEGS=110;const NPC_COUNT=16;const RAIN_COUNT=1800;
const DAY_SPEED=0.000055;const GRAVITY=-22;const JUMP_VEL=9;
const DET_RANGE=0;const ATK_RANGE=5;const BASE_SPD=11;const SPRINT_M=2.1; // NPCs ab combat nahi kartay — sirf ambient pedestrians hain (driving game)

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function World(){
  const mountRef=useRef<HTMLDivElement>(null);
  const [,setLocation]=useLocation();
  const { selectedPet, selectedVehicleId, getVehicleMods } = useGame();

  // Mobile detection (stable, computed once)
  const isMobile=typeof window!=="undefined"&&('ontouchstart' in window||navigator.maxTouchPoints>1);

  const [selectedMap,setSelectedMap]=useState<MapConfig|null>(null);
  const [locked,setLocked]    =useState(false);
  const [playing,setPlaying]  =useState(false); // mobile active state
  const [hp,setHp]            =useState(100);
  const [carSpeedKmh,setCarSpeedKmh]=useState(0);
  const [ammo,setAmmo]        =useState(30);
  const [stamina,setStamina]  =useState(100);
  const [kills,setKills]      =useState(0);
  const [combo,setCombo]      =useState(0);
  const [timeLabel,setTimeLabel]=useState("Dawn");
  const [weather,setWeather]  =useState<"clear"|"rain"|"storm">("clear");
  const [notice,setNotice]    =useState("");
  const [miniDots,setMiniDots]=useState<{x:number;z:number;state:NPCState}[]>([]);
  const [thunderFlash,setThunderFlash]=useState(0);
  const [hitMarker,setHitMarker]=useState(false);
  const [muzzleFlash,setMuzzleFlash]=useState(false);
  const [dmgNums,setDmgNums]  =useState<{id:number;x:number;y:number;v:number}[]>([]);
  const [isOnGround,setIsOnGround]=useState(true);
  const [inCar,setInCar]      =useState(false);
  const [nearCar,setNearCar]  =useState(false);
  const [sprintOn,setSprintOn]=useState(false);
  const [weapon,setWeapon]    =useState<WeaponType>("ak47");
  const [shield,setShield]    =useState(0);
  const [grenadeCount,setGrenadeCount]=useState(2);
  const [zoneRadius,setZoneRadius]    =useState(260);
  const [outsideZone,setOutsideZone]  =useState(false);
  const [npcBars,setNpcBars]  =useState<{id:number;x:number;y:number;hp:number;maxHp:number}[]>([]);
  const [explFlash,setExplFlash]=useState(false);

  // ── Refs accessible from both useEffect AND JSX buttons ─────────────────
  const playingRef   =useRef(false);
  const jsKnobRef    =useRef<HTMLDivElement>(null);
  const jsTouchId    =useRef(-1);
  const jsBaseX      =useRef(0);const jsBaseY=useRef(0);
  const jsDx         =useRef(0); const jsDy  =useRef(0);
  const lookTouchId  =useRef(-1);
  const lookLastX    =useRef(0); const lookLastY=useRef(0);
  const mEulerY      =useRef(0); const mEulerX =useRef(-0.05);
  const mShoot       =useRef(false);
  const mJump        =useRef(false);
  const mCarTrigger  =useRef(false);
  const mSprintToggle=useRef(false);

  const noticeT =useRef<ReturnType<typeof setTimeout>|null>(null);
  const hitT    =useRef<ReturnType<typeof setTimeout>|null>(null);
  const muzzT   =useRef<ReturnType<typeof setTimeout>|null>(null);
  const dmgId   =useRef(0);

  const flash=useCallback((msg:string)=>{setNotice(msg);if(noticeT.current)clearTimeout(noticeT.current);
    noticeT.current=setTimeout(()=>setNotice(""),1800);},[]);
  const showHit=useCallback(()=>{setHitMarker(true);if(hitT.current)clearTimeout(hitT.current);
    hitT.current=setTimeout(()=>setHitMarker(false),180);},[]);
  const showMuzzle=useCallback(()=>{setMuzzleFlash(true);if(muzzT.current)clearTimeout(muzzT.current);
    muzzT.current=setTimeout(()=>setMuzzleFlash(false),90);},[]);

  const hpRef    =useRef(100);const ammoRef  =useRef(30);
  const stamRef  =useRef(100);const killsRef =useRef(0);
  const comboRef =useRef(0);  const comboT   =useRef(0);
  const keysRef  =useRef<Record<string,boolean>>({});
  const npcsRef  =useRef<NPC[]>([]);
  const ammoPickRef=useRef<PickupItem[]>([]);
  const hpPickRef  =useRef<PickupItem[]>([]);
  const weatherRef =useRef<"clear"|"rain"|"storm">("clear");
  const canShoot =useRef(true);
  const velYRef  =useRef(0);const onGnd=useRef(true);
  const carRef   =useRef<CarState|null>(null);
  const inCarRef =useRef(false);
  const weaponRef       =useRef<WeaponType>("ak47");
  const shieldRef       =useRef(0);
  const grenadeCountRef =useRef(2);
  const weaponPickRef   =useRef<WeaponPickup[]>([]);
  const armorPickRef    =useRef<PickupItem[]>([]);
  const activeGrnadesRef=useRef<GrenadeObj[]>([]);
  const zoneRadiusRef   =useRef(260);
  const zoneTargetRef   =useRef(140);
  const zoneShrinkTimerRef=useRef(55);
  const mGrenadeRef     =useRef(false);

  useEffect(()=>{
    if(!selectedMap)return;
    hpRef.current=100;setHp(100);ammoRef.current=30;setAmmo(30);
    stamRef.current=100;setStamina(100);killsRef.current=0;setKills(0);
    comboRef.current=0;setCombo(0);npcsRef.current=[];
    ammoPickRef.current=[];hpPickRef.current=[];armorPickRef.current=[];
    weaponPickRef.current=[];activeGrnadesRef.current=[];
    weatherRef.current="clear";setWeather("clear");
    velYRef.current=0;onGnd.current=true;
    inCarRef.current=false;setInCar(false);
    playingRef.current=false;setPlaying(false);
    weaponRef.current="ak47";setWeapon("ak47");
    shieldRef.current=0;setShield(0);
    grenadeCountRef.current=2;setGrenadeCount(2);
    zoneRadiusRef.current=260;zoneTargetRef.current=140;zoneShrinkTimerRef.current=55;
    setZoneRadius(260);setOutsideZone(false);setNpcBars([]);setExplFlash(false);
  },[selectedMap]);

  useEffect(()=>{
    if(!selectedMap)return;
    const container=mountRef.current;if(!container)return;
    const cfg=selectedMap;
    const isMobileLocal=isMobile;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer=new THREE.WebGLRenderer({antialias:!isMobileLocal,powerPreference:"high-performance"});
    renderer.setSize(container.clientWidth,container.clientHeight);
    renderer.shadowMap.enabled=!isMobileLocal; // shadows off on mobile for perf
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,isMobileLocal?1.2:1.5));
    // Cinematic tone mapping — behtar contrast/colors, professional look ke liye
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene=new THREE.Scene();

    // ── Noise (must be before getH_hunza is called) ────────────────────────
    const noise2D=createNoise2D();const noise2D2=createNoise2D();

    const farPlane=cfg.id==="hunza"?2000:900;
    const camera=new THREE.PerspectiveCamera(72,container.clientWidth/container.clientHeight,0.2,farPlane);

    // ── Home spawn point (per map) — player match shuru hotay hi ghar ke andar spawn hota hai ──
    const carSpawns:{[k:string]:[number,number]}={hunza:[15,-40],lahore:[25,-25],multan:[-18,30],karachi:[35,-85],islamabad:[20,-30],faisalabad:[45,45],skardu:[20,50],murree:[15,25],peshawar:[20,20],quetta:[20,20],kaghan:[15,20],fortress:[20,20]};
    const [csx,csz]=carSpawns[cfg.id]||[20,-20];
    const homeCX=csx,homeCZ=csz-5; // home center thora peeche, darwaza car ki taraf (+z) khulta hai
    camera.position.set(homeCX,getH(homeCX,homeCZ)+1.9,homeCZ); // ghar ke andar, beech mein (deewaron se clash nahi hoga)

    const controls=new PointerLockControls(camera,renderer.domElement);
    if(!isMobileLocal){
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (controls as any).addEventListener("lock",()=>setLocked(true));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (controls as any).addEventListener("unlock",()=>setLocked(false));
    }

    // ── Lighting ──────────────────────────────────────────────────────────
    const hemi=new THREE.HemisphereLight(cfg.ambientHex,cfg.groundHex,0.65);scene.add(hemi);
    const ambient=new THREE.AmbientLight(0xffffff,0.35);scene.add(ambient);
    const sun=new THREE.DirectionalLight(cfg.sunColor,2.2);
    if(!isMobileLocal){sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-0.0005;
      const sf=cfg.id==="hunza"?350:200;
      sun.shadow.camera.left=-sf;sun.shadow.camera.right=sf;
      sun.shadow.camera.top=sf;sun.shadow.camera.bottom=-sf;sun.shadow.camera.far=800;}
    scene.add(sun);
    const fill=new THREE.DirectionalLight(0x6a88bb,0.35);fill.position.set(-150,80,-100);scene.add(fill);
    const moon=new THREE.DirectionalLight(0x223355,0);moon.position.set(-100,120,-80);scene.add(moon);

    // ── Per-map height functions ───────────────────────────────────────────
    function getH_hunza(x:number,z:number):number{
      const S=900,nx=x/S,nz=z/S;
      const wx=nx+0.65*noise2D2(nx*2+1.7,nz*2+9.2),wz=nz+0.65*noise2D2(nx*2+8.3,nz*2+2.8);
      const vm=Math.pow(Math.min(1,Math.abs(x)/110),1.5);
      let r=0,a=1,f=1,ma=0;
      for(let o=0;o<7;o++){r+=(1-Math.abs(noise2D(wx*f*3+o*7.13,wz*f*3+o*3.94)))*a;ma+=a;a*=0.55;f*=2.07;}
      return Math.max(0,(noise2D(nx*9,nz*9)*0.35+noise2D(nx*18,nz*18)*0.15)*9*(1-vm*0.85)+Math.pow(r/ma,2.4)*275*vm);
    }
    function getH(x:number,z:number):number{
      switch(cfg.id){
        case"hunza":return getH_hunza(x,z);
        case"lahore":{const nx=x/500,nz=z/500;return noise2D(nx*4,nz*4)*1.8+noise2D(nx*10,nz*10)*0.8+3.5;}
        case"multan":{const nx=x/400,nz=z/400;const d=noise2D(nx*1.8,nz*1.8)*0.55+noise2D(nx*3.5,nz*3.5)*0.28+noise2D(nx*9,nz*9)*0.1;return(d*0.5+0.5)*22+1;}
        case"karachi":{const nx=x/600,nz=z/600;return Math.max(-1,noise2D(nx*8,nz*8)*1.2+noise2D(nx*20,nz*20)*0.4+2.5+(z<-80?(z+80)*0.03:0));}
        case"islamabad":{const nx=x/500,nz=z/500;const flat=noise2D(nx*3,nz*3)*0.6+noise2D(nx*8,nz*8)*0.25;
          const hills=z>90?Math.pow(Math.max(0,(z-90)/90),1.3)*60+noise2D(nx*2,nz*2)*8:0;
          return flat+hills+1.5;}
        case"faisalabad":{const nx=x/500,nz=z/500;return noise2D(nx*4,nz*4)*0.8+noise2D(nx*12,nz*12)*0.3+1.2;}
        case"skardu":{const nx=x/500,nz=z/500;const valley=noise2D(nx*4,nz*4)*1.5+noise2D(nx*10,nz*10)*0.4;
          const peaks=Math.abs(x)>140?Math.pow((Math.abs(x)-140)/100,1.4)*90+noise2D(nx*3,nz*3)*15:0;
          return valley+peaks+2;}
        case"murree":{const nx=x/400,nz=z/400;return noise2D(nx*3,nz*3)*12+noise2D(nx*9,nz*9)*3+8;}
        case"peshawar":{const nx=x/500,nz=z/500;return noise2D(nx*4,nz*4)*0.7+noise2D(nx*12,nz*12)*0.25+1;}
        case"quetta":{const nx=x/500,nz=z/500;const flat=noise2D(nx*4,nz*4)*1.2+noise2D(nx*10,nz*10)*0.3;
          const ridge=Math.abs(z)>130?Math.pow((Math.abs(z)-130)/90,1.3)*50:0;
          return flat+ridge+1.5;}
        case"kaghan":{const nx=x/500,nz=z/500;const valley=noise2D(nx*4,nz*4)*1.2+noise2D(nx*10,nz*10)*0.3;
          const peaks=Math.abs(x)>90?Math.pow((Math.abs(x)-90)/80,1.3)*80+noise2D(nx*3,nz*3)*12:0;
          return valley+peaks+2;}
        case"fortress":{const nx=x/500,nz=z/500;return noise2D(nx*4,nz*4)*0.5+noise2D(nx*12,nz*12)*0.2+1;}
        default:return 0;
      }
    }

    // ── Terrain ───────────────────────────────────────────────────────────
    const tGeo=new THREE.PlaneGeometry(TSIZE,TSIZE,TSEGS,TSEGS);tGeo.rotateX(-Math.PI/2);
    const posArr=tGeo.attributes.position.array as Float32Array;
    const vCount=posArr.length/3;const vcols=new Float32Array(vCount*3);
    for(let i=0;i<vCount;i++){
      const x=posArr[i*3],z=posArr[i*3+2];const h=getH(x,z);posArr[i*3+1]=h;
      const sX=(getH(x+2.5,z)-getH(x-2.5,z))/5,sZ=(getH(x,z+2.5)-getH(x,z-2.5))/5;
      const slope=Math.sqrt(sX*sX+sZ*sZ);
      let col:THREE.Color;
      if(cfg.id==="hunza"){
        const isCliff=slope>3.2,hN=Math.min(1,h/275);
        if(isCliff&&hN>0.04)col=new THREE.Color(0x504030);
        else if(hN<0.025)col=new THREE.Color(0x2a5a18);
        else if(hN<0.07) col=new THREE.Color(0x3a7d44);
        else if(hN<0.16) col=new THREE.Color(0x3a7d44).lerp(new THREE.Color(0x7a6850),(hN-0.07)/0.09);
        else if(hN<0.45) col=new THREE.Color(0x7a6850);
        else if(hN<0.62) col=new THREE.Color(0x5a5048);
        else if(hN<0.72) col=new THREE.Color(0x5a5048).lerp(new THREE.Color(0xdeeef8),(hN-0.62)/0.1);
        else              col=new THREE.Color(0xeeeef8);
      }else if(cfg.id==="lahore"){
        col=new THREE.Color(slope>0.6?0xaa7755:0x9a6a48).lerp(new THREE.Color(0xbb8855),Math.random()*0.15);
      }else if(cfg.id==="multan"){
        col=new THREE.Color(0xdbb84a).lerp(new THREE.Color(0xc49030),Math.min(1,h/23)*0.6+slope*0.08);
      }else{
        col=new THREE.Color(z<-60||z>180?0xd4c090:0x9ab87a).lerp(new THREE.Color(0xc8b075),Math.random()*0.1);
      }
      vcols[i*3]=col.r;vcols[i*3+1]=col.g;vcols[i*3+2]=col.b;
    }
    tGeo.setAttribute("color",new THREE.BufferAttribute(vcols,3));tGeo.computeVertexNormals();
    const terrain=new THREE.Mesh(tGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95,metalness:0.02}));
    if(!isMobileLocal)terrain.receiveShadow=true;scene.add(terrain);

    // ── Water ─────────────────────────────────────────────────────────────
    let waterMeshRef:THREE.Mesh|null=null;
    if(cfg.id==="karachi"){
      const wG=new THREE.PlaneGeometry(TSIZE*1.5,TSIZE*0.8,20,20);wG.rotateX(-Math.PI/2);
      waterMeshRef=new THREE.Mesh(wG,new THREE.MeshLambertMaterial({color:0x1a66aa,transparent:true,opacity:0.82}));
      waterMeshRef.position.set(-40,-0.6,-TSIZE*0.62);scene.add(waterMeshRef);
      const bG=new THREE.PlaneGeometry(TSIZE,55);bG.rotateX(-Math.PI/2);
      const beach=new THREE.Mesh(bG,new THREE.MeshLambertMaterial({color:0xddd0a0}));
      beach.position.set(0,0.18,-TSIZE*0.36);scene.add(beach);
    }else if(cfg.id==="hunza"){
      const gG=new THREE.PlaneGeometry(18,TSIZE*0.9);gG.rotateX(-Math.PI/2);
      const glacier=new THREE.Mesh(gG,new THREE.MeshLambertMaterial({color:0x88d0e8,transparent:true,opacity:0.75}));
      glacier.position.set(-8,0.8,0);scene.add(glacier);
    }else if(cfg.id!=="multan"){
      const rG=new THREE.PlaneGeometry(18,TSIZE);rG.rotateX(-Math.PI/2);
      const river=new THREE.Mesh(rG,new THREE.MeshLambertMaterial({color:0x4488bb,transparent:true,opacity:0.75}));
      river.position.set(-35,0.6,0);scene.add(river);
    }

    // ── Roads ─────────────────────────────────────────────────────────────
    const bldBoxes:THREE.Box3[]=[];
    const roadMat=new THREE.MeshLambertMaterial({color:cfg.id==="multan"?0xc4a860:0x404040});
    function mkRoad(x1:number,z1:number,x2:number,z2:number,w=5){
      const dx=x2-x1,dz=z2-z1,len=Math.sqrt(dx*dx+dz*dz);
      const cx=(x1+x2)/2,cz=(z1+z2)/2,ang=Math.atan2(dx,dz);
      const rd=new THREE.Mesh(new THREE.PlaneGeometry(len,w),roadMat);
      rd.rotateX(-Math.PI/2);rd.rotation.y=ang;rd.position.set(cx,0.12,cz);scene.add(rd);
    }
    if(cfg.id==="hunza"){
      [[0,80,0,-80],[0,-80,-15,-160],[0,80,15,160],[0,20,-30,0],[0,-20,25,-5]].forEach(([x1,z1,x2,z2])=>mkRoad(x1,z1,x2,z2,6));
    }else{
      [[0,0,50,30],[50,30,80,60],[0,0,-30,-40],[-30,-40,-60,-65],[0,0,30,-50],[0,0,-25,45],
       [50,30,20,70],[-30,-40,-70,-10],[0,0,80,-20],[0,0,-60,40]].forEach(([x1,z1,x2,z2])=>mkRoad(x1,z1,x2,z2));
    }

    // ── Player's Home (spawn point per map, region-style hut/house) ─────────
    {
      const HOME_STYLE:{[k:string]:{wall:number;roof:number;door:number}}={
        hunza:{wall:0xb8a888,roof:0xa09070,door:0x4a3520},
        lahore:{wall:0xaa3322,roof:0x6b3320,door:0x5a3018},
        multan:{wall:0xd4a84b,roof:0xb08030,door:0x5a3a1a},
        karachi:{wall:0xe0d8c8,roof:0x8899aa,door:0x40342a},
        islamabad:{wall:0xe8e4d8,roof:0xc84040,door:0x3a2818},
        faisalabad:{wall:0xc8a878,roof:0x8a5a3a,door:0x4a3018},
        skardu:{wall:0xb8ac98,roof:0x8a3030,door:0x3a2818},
        murree:{wall:0xc8b898,roof:0x3a6a5a,door:0x3a2818},
        peshawar:{wall:0xc8b088,roof:0x6a5838,door:0x3a2818},
        quetta:{wall:0xd8c098,roof:0x8a7050,door:0x3a2818},
        kaghan:{wall:0xc8b8a0,roof:0x5a4838,door:0x3a2818},
        fortress:{wall:0xd8d0c0,roof:0x4a5a6a,door:0x3a2818},
      };
      const hs=HOME_STYLE[cfg.id]||HOME_STYLE.lahore;
      const wallM=new THREE.MeshLambertMaterial({color:hs.wall});
      const roofM=new THREE.MeshLambertMaterial({color:hs.roof});
      const doorM=new THREE.MeshLambertMaterial({color:hs.door});
      const hy=getH(homeCX,homeCZ);
      const HW=4.2,HD=4.2,HH=2.6; // home width/depth/height
      // Back + side walls (solid)
      const backWall=new THREE.Mesh(new THREE.BoxGeometry(HW,HH,0.25),wallM);
      backWall.position.set(homeCX,hy+HH/2,homeCZ-HD/2);scene.add(backWall);
      const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.25,HH,HD),wallM);
      leftWall.position.set(homeCX-HW/2,hy+HH/2,homeCZ);scene.add(leftWall);
      const rightWall=leftWall.clone();rightWall.position.set(homeCX+HW/2,hy+HH/2,homeCZ);scene.add(rightWall);
      // Front wall with door gap (2 segments, gap in middle facing car spawn +z)
      const frontSegW=(HW-1.6)/2;
      const frontL=new THREE.Mesh(new THREE.BoxGeometry(frontSegW,HH,0.25),wallM);
      frontL.position.set(homeCX-HW/2+frontSegW/2,hy+HH/2,homeCZ+HD/2);scene.add(frontL);
      const frontR=frontL.clone();frontR.position.set(homeCX+HW/2-frontSegW/2,hy+HH/2,homeCZ+HD/2);scene.add(frontR);
      // Door lintel (bar above the doorway gap)
      const lintel=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.4,0.25),doorM);
      lintel.position.set(homeCX,hy+HH-0.2,homeCZ+HD/2);scene.add(lintel);
      // Roof
      const roof=new THREE.Mesh(new THREE.BoxGeometry(HW+0.6,0.35,HD+0.6),roofM);
      roof.position.set(homeCX,hy+HH+0.18,homeCZ);scene.add(roof);
      // Floor
      const floor=new THREE.Mesh(new THREE.BoxGeometry(HW,0.1,HD),new THREE.MeshLambertMaterial({color:hs.wall}));
      floor.position.set(homeCX,hy+0.05,homeCZ);scene.add(floor);
      // Simple bed/charpai inside as a landmark
      const bed=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.32,0.8),new THREE.MeshLambertMaterial({color:0x6b4a2a}));
      bed.position.set(homeCX-HW/2+1.1,hy+0.16,homeCZ-HD/2+0.7);scene.add(bed);
      // Register walls as solid collision so player can't walk through them (door stays open)
      bldBoxes.push(new THREE.Box3().setFromObject(backWall));
      bldBoxes.push(new THREE.Box3().setFromObject(leftWall));
      bldBoxes.push(new THREE.Box3().setFromObject(rightWall));
      bldBoxes.push(new THREE.Box3().setFromObject(frontL));
      bldBoxes.push(new THREE.Box3().setFromObject(frontR));
    }

    // ── Pet companion (3D animal model, follows player) ─────────────────────
    type PetKind="bird"|"quad"|"reptile";
    interface PetVisualCfg{kind:PetKind;scale:number;bodyColor:number;secondaryColor:number;
      earType?:"round"|"long"|"pointed"|"none";tailType?:"bushy"|"thin"|"short"|"trunk"|"none";
      hasMane?:boolean;hasHorn?:boolean;pattern?:"stripes"|"spots"|"none";glow?:boolean;}
    const PET_VISUALS:{[name:string]:PetVisualCfg}={
      "Squirrel":{kind:"quad",scale:0.45,bodyColor:0xa56a3a,secondaryColor:0xd8b98a,earType:"round",tailType:"bushy"},
      "Rabbit":{kind:"quad",scale:0.5,bodyColor:0xe8e2d5,secondaryColor:0xffffff,earType:"long",tailType:"short"},
      "Monkey":{kind:"quad",scale:0.6,bodyColor:0x7a5230,secondaryColor:0xd8b98a,earType:"round",tailType:"thin"},
      "Hawk":{kind:"bird",scale:0.55,bodyColor:0x6b4426,secondaryColor:0xd8c8a0},
      "Wolf":{kind:"quad",scale:0.85,bodyColor:0x9098a0,secondaryColor:0xe8e8e8,earType:"pointed",tailType:"bushy"},
      "Elephant":{kind:"quad",scale:1.6,bodyColor:0x8a8a8a,secondaryColor:0xb0b0b0,earType:"round",tailType:"trunk"},
      "Panther":{kind:"quad",scale:0.85,bodyColor:0x0d0d10,secondaryColor:0x1a1a1e,earType:"pointed",tailType:"bushy"},
      "Falcon":{kind:"bird",scale:0.5,bodyColor:0x556270,secondaryColor:0xdedede},
      "Bear":{kind:"quad",scale:1.3,bodyColor:0x4a3524,secondaryColor:0x6a4f38,earType:"round",tailType:"short"},
      "Lion":{kind:"quad",scale:1.2,bodyColor:0xc79a4b,secondaryColor:0x8a5a20,earType:"round",tailType:"bushy",hasMane:true},
      "Tiger":{kind:"quad",scale:1.2,bodyColor:0xe08a2e,secondaryColor:0x1a1a1a,earType:"round",tailType:"bushy",pattern:"stripes"},
      "Snow Leopard":{kind:"quad",scale:1.0,bodyColor:0xe6e6e0,secondaryColor:0x888880,earType:"round",tailType:"bushy",pattern:"spots"},
      "Rhino":{kind:"quad",scale:1.5,bodyColor:0x7a7a70,secondaryColor:0x5a5a50,earType:"round",tailType:"short",hasHorn:true},
      "Komodo":{kind:"reptile",scale:1.0,bodyColor:0x5a6a48,secondaryColor:0x3a4530},
      "Phoenix":{kind:"bird",scale:0.65,bodyColor:0xff6a1a,secondaryColor:0xffcc33,glow:true},
    };
    function hexToCss(h:number){return "#"+h.toString(16).padStart(6,"0");}
    function makeStripeTexture(base:number,stripe:number):THREE.CanvasTexture{
      const c=document.createElement("canvas");c.width=64;c.height=64;
      const ctx=c.getContext("2d")!;ctx.fillStyle=hexToCss(base);ctx.fillRect(0,0,64,64);
      ctx.strokeStyle=hexToCss(stripe);ctx.lineWidth=6;
      for(let i=-2;i<10;i++){ctx.beginPath();ctx.moveTo(i*10,0);ctx.lineTo(i*10-30,64);ctx.stroke();}
      const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,1);return tex;
    }
    function makeSpotTexture(base:number,spot:number):THREE.CanvasTexture{
      const c=document.createElement("canvas");c.width=64;c.height=64;
      const ctx=c.getContext("2d")!;ctx.fillStyle=hexToCss(base);ctx.fillRect(0,0,64,64);
      ctx.fillStyle=hexToCss(spot);
      for(let i=0;i<14;i++){const x=Math.random()*64,y=Math.random()*64,r=2+Math.random()*3;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
      const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;
    }
    function mkQuadruped(cfg:PetVisualCfg):THREE.Group{
      const g=new THREE.Group();
      let bodyMat:THREE.Material;
      if(cfg.pattern==="stripes")bodyMat=new THREE.MeshLambertMaterial({map:makeStripeTexture(cfg.bodyColor,cfg.secondaryColor)});
      else if(cfg.pattern==="spots")bodyMat=new THREE.MeshLambertMaterial({map:makeSpotTexture(cfg.bodyColor,cfg.secondaryColor)});
      else bodyMat=new THREE.MeshLambertMaterial({color:cfg.bodyColor});
      const darkMat=new THREE.MeshLambertMaterial({color:cfg.secondaryColor});
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.16,0.32,4,8),bodyMat);
      body.rotation.z=Math.PI/2;body.position.y=0.22;g.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,6),bodyMat);
      head.position.set(0.28,0.30,0);g.add(head);
      const snout=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.14,6),darkMat);
      snout.rotation.z=-Math.PI/2;snout.position.set(0.40,0.27,0);g.add(snout);
      if(cfg.earType==="round"){
        const eg=new THREE.SphereGeometry(0.05,6,4);
        const l=new THREE.Mesh(eg,darkMat);l.position.set(0.26,0.40,0.09);g.add(l);
        const r=l.clone();r.position.z=-0.09;g.add(r);
      }else if(cfg.earType==="long"){
        const eg=new THREE.CapsuleGeometry(0.02,0.18,2,4);
        const l=new THREE.Mesh(eg,darkMat);l.position.set(0.26,0.48,0.05);l.rotation.x=0.2;g.add(l);
        const r=l.clone();r.position.z=-0.05;g.add(r);
      }else if(cfg.earType==="pointed"){
        const eg=new THREE.ConeGeometry(0.045,0.1,5);
        const l=new THREE.Mesh(eg,darkMat);l.position.set(0.26,0.42,0.08);g.add(l);
        const r=l.clone();r.position.z=-0.08;g.add(r);
      }
      const legGeo=new THREE.CylinderGeometry(0.035,0.03,0.22,5);
      const legs:THREE.Mesh[]=[];
      ([[0.16,0.10],[0.16,-0.10],[-0.16,0.10],[-0.16,-0.10]] as [number,number][]).forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(legGeo,darkMat);leg.position.set(lx,0.11,lz);g.add(leg);legs.push(leg);
      });
      if(cfg.tailType==="bushy"){
        const tail=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.34,6),bodyMat);
        tail.position.set(-0.30,0.30,0);tail.rotation.z=Math.PI/2.6;g.add(tail);
      }else if(cfg.tailType==="thin"){
        const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.015,0.34,5),darkMat);
        tail.position.set(-0.30,0.30,0);tail.rotation.z=Math.PI/2.3;g.add(tail);
      }else if(cfg.tailType==="short"){
        const tail=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4),darkMat);
        tail.position.set(-0.24,0.24,0);g.add(tail);
      }else if(cfg.tailType==="trunk"){
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.02,0.28,5),bodyMat);
        trunk.position.set(0.40,0.16,0);trunk.rotation.z=Math.PI/2.2;g.add(trunk);
        const eg=new THREE.CircleGeometry(0.14,10);
        const l=new THREE.Mesh(eg,darkMat);l.position.set(0.22,0.34,0.16);l.rotation.y=Math.PI/2.5;g.add(l);
        const r=l.clone();r.position.z=-0.16;r.rotation.y=-Math.PI/2.5;g.add(r);
      }
      if(cfg.hasMane){
        const mane=new THREE.Mesh(new THREE.SphereGeometry(0.19,8,6),darkMat);
        mane.position.set(0.26,0.30,0);g.add(mane);
      }
      if(cfg.hasHorn){
        const horn=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.16,5),new THREE.MeshLambertMaterial({color:0xe8e0c8}));
        horn.position.set(0.42,0.30,0);horn.rotation.z=-Math.PI/2.3;g.add(horn);
      }
      g.scale.setScalar(cfg.scale);g.userData.legs=legs;g.userData.kind="quad";
      return g;
    }
    function mkBird(cfg:PetVisualCfg):THREE.Group{
      const g=new THREE.Group();
      const bodyMat=new THREE.MeshLambertMaterial({color:cfg.bodyColor,emissive:cfg.glow?cfg.bodyColor:0x000000,emissiveIntensity:cfg.glow?0.6:0});
      const wingMat=new THREE.MeshLambertMaterial({color:cfg.secondaryColor,emissive:cfg.glow?cfg.secondaryColor:0x000000,emissiveIntensity:cfg.glow?0.5:0,side:THREE.DoubleSide});
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.09,0.22,4,8),bodyMat);
      body.rotation.z=Math.PI/2;g.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,6),bodyMat);
      head.position.set(0.18,0.05,0);g.add(head);
      const beak=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.08,5),new THREE.MeshLambertMaterial({color:0xffaa00}));
      beak.rotation.z=-Math.PI/2;beak.position.set(0.27,0.04,0);g.add(beak);
      const wingGeo=new THREE.PlaneGeometry(0.32,0.14);
      const lWing=new THREE.Mesh(wingGeo,wingMat);lWing.position.set(0,0.02,0.10);lWing.rotation.y=0.3;g.add(lWing);
      const rWing=new THREE.Mesh(wingGeo,wingMat);rWing.position.set(0,0.02,-0.10);rWing.rotation.y=-0.3;g.add(rWing);
      const tail=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.22,5),wingMat);
      tail.rotation.z=Math.PI/2;tail.position.set(-0.20,0.02,0);g.add(tail);
      if(cfg.glow){const light=new THREE.PointLight(cfg.bodyColor,1.2,3);g.add(light);}
      g.scale.setScalar(cfg.scale);g.userData.wings=[lWing,rWing];g.userData.kind="bird";
      return g;
    }
    function mkReptile(cfg:PetVisualCfg):THREE.Group{
      const g=new THREE.Group();
      const bodyMat=new THREE.MeshLambertMaterial({color:cfg.bodyColor});
      const darkMat=new THREE.MeshLambertMaterial({color:cfg.secondaryColor});
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.11,0.4,4,8),bodyMat);
      body.rotation.z=Math.PI/2;body.position.y=0.12;g.add(body);
      const head=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.2,6),bodyMat);
      head.rotation.z=-Math.PI/2;head.position.set(0.34,0.12,0);g.add(head);
      const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.09,0.5,6),darkMat);
      tail.rotation.z=Math.PI/2;tail.position.set(-0.42,0.10,0);g.add(tail);
      const legGeo=new THREE.CylinderGeometry(0.025,0.02,0.14,5);
      const legs:THREE.Mesh[]=[];
      ([[0.14,0.10],[0.14,-0.10],[-0.10,0.10],[-0.10,-0.10]] as [number,number][]).forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(legGeo,darkMat);leg.position.set(lx,0.07,lz);leg.rotation.x=0.6*(lz>0?1:-1);g.add(leg);legs.push(leg);
      });
      g.scale.setScalar(cfg.scale);g.userData.legs=legs;g.userData.kind="quad";
      return g;
    }
    function mkPetModel(name:string):THREE.Group{
      const cfg=PET_VISUALS[name]||PET_VISUALS["Squirrel"];
      if(cfg.kind==="bird")return mkBird(cfg);
      if(cfg.kind==="reptile")return mkReptile(cfg);
      return mkQuadruped(cfg);
    }
    let petGroup:THREE.Group|null=null;let petBobT=Math.random()*10;
    if(selectedPet&&selectedPet.name){
      petGroup=mkPetModel(selectedPet.name);
      petGroup.position.set(homeCX+0.8,getH(homeCX+0.8,homeCZ+0.5),homeCZ+0.5);
      scene.add(petGroup);
    }

    // ── Humanoid person builder ────────────────────────────────────────────
    function mkHuman(skin:number,shirt:number,pants:number,isEnemy:boolean):{group:THREE.Group;torso:THREE.Mesh}{
      const skinM=new THREE.MeshLambertMaterial({color:skin});
      const shirtM=new THREE.MeshLambertMaterial({color:shirt});
      const pantsM=new THREE.MeshLambertMaterial({color:pants});
      const hairM=new THREE.MeshLambertMaterial({color:0x110500});
      const shoeM=new THREE.MeshLambertMaterial({color:0x1a1008});
      const gunM=new THREE.MeshLambertMaterial({color:0x111111});

      const g=new THREE.Group();
      // Head
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),skinM);
      head.position.y=1.58;head.castShadow=!isMobileLocal;g.add(head);
      // Hair cap
      const hair=new THREE.Mesh(new THREE.SphereGeometry(0.235,8,4,0,Math.PI*2,0,Math.PI*0.52),hairM);
      hair.position.y=1.65;g.add(hair);
      // Neck
      const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.1,0.14,6),skinM);
      neck.position.y=1.35;g.add(neck);
      // Torso
      const torso=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.52,0.24),shirtM);
      torso.position.y=1.02;torso.castShadow=!isMobileLocal;g.add(torso);
      // Hips
      const hips=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.28,0.22),pantsM);
      hips.position.y=0.70;g.add(hips);
      // Legs
      const lLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.09,0.52,6),pantsM);
      lLeg.position.set(-0.13,0.41,0);g.add(lLeg);
      const rLeg=lLeg.clone();rLeg.position.set(0.13,0.41,0);g.add(rLeg);
      // Shoes
      const lShoe=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.09,0.22),shoeM);
      lShoe.position.set(-0.13,0.14,0.04);g.add(lShoe);
      const rShoe=lShoe.clone();rShoe.position.set(0.13,0.14,0.04);g.add(rShoe);
      // Arms
      const lArm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.07,0.44,6),shirtM);
      lArm.position.set(-0.3,1.0,0);lArm.rotation.z=0.25;g.add(lArm);
      const rArm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.07,0.44,6),shirtM);
      rArm.position.set(0.3,1.0,0);rArm.rotation.z=-0.25;g.add(rArm);
      // Hands
      const lHand=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,4),skinM);
      lHand.position.set(-0.36,0.8,0);g.add(lHand);
      const rHand=lHand.clone();rHand.position.set(0.36,0.8,0);g.add(rHand);
      // Gun (enemies only)
      if(isEnemy){
        const gun=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.5),gunM);
        gun.position.set(0.36,0.85,-0.28);g.add(gun);
        const stock=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.14,0.12),gunM);
        stock.position.set(0.36,0.78,0.12);g.add(stock);
      }
      return{group:g,torso};
    }

    // ── Buildings (per map) ───────────────────────────────────────────────
    const civilianPositions:{x:number;z:number}[]=[];

    if(cfg.id==="hunza"){
      const stoneM=new THREE.MeshLambertMaterial({color:0xb8a888});
      const mudRoofM=new THREE.MeshLambertMaterial({color:0xa09070});
      const terraceM=new THREE.MeshLambertMaterial({color:0x5a7a3a});
      let seedH=5;const hrand=()=>{seedH=(seedH*9301+49297)%233280;return seedH/233280;};

      // ══ Ganish/Altit style — ghar bilkul sath-sath, dense clusters (video ke layout ke hisab se) ══
      const villageClusters:[number,number][]=[[15,30],[20,-45],[-10,90],[25,-100]];
      villageClusters.forEach(([vcx,vcz])=>{
        const houseCount=6+Math.floor(hrand()*4);
        for(let i=0;i<houseCount;i++){
          const dx=vcx+(hrand()-0.5)*16,dz=vcz+(hrand()-0.5)*16;
          if(Math.abs(dx-homeCX)<8&&Math.abs(dz-homeCZ)<8)continue;
          const by=getH(dx,dz);const w=3.5+hrand()*2,h=2.5+hrand()*1.5,d=3.5+hrand()*2;
          const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),stoneM);
          body.position.set(dx,by+h/2,dz);body.rotation.y=hrand()*0.4-0.2;body.castShadow=!isMobileLocal;scene.add(body);
          const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.4,0.5,d+0.4),mudRoofM);
          roof.position.set(dx,by+h+0.25,dz);roof.rotation.y=body.rotation.y;scene.add(roof);
          bldBoxes.push(new THREE.Box3().setFromObject(body));
          if(hrand()<0.5)civilianPositions.push({x:dx+2,z:dz+2});
        }
      });

      // ══ Terraced khetiyan (seerhi-numa fields) — pahar ki dhalwan par ══
      for(let t=0;t<10;t++){
        const tx=-55+hrand()*20,tz=-130+t*26;
        const ty=getH(tx,tz);
        const terrace=new THREE.Mesh(new THREE.BoxGeometry(14,0.3,5),terraceM);
        terrace.position.set(tx,ty+0.15,tz);terrace.rotation.y=hrand()*0.2-0.1;scene.add(terrace);
      }
    }else if(cfg.id==="lahore"){
      const brickM=new THREE.MeshLambertMaterial({color:0xaa3322});
      const mortarM=new THREE.MeshLambertMaterial({color:0xccaa88});
      const marbleM=new THREE.MeshLambertMaterial({color:0xe8ddc8});
      const domeM=new THREE.MeshLambertMaterial({color:0xf0ead8});
      const pathM=new THREE.MeshLambertMaterial({color:0xc8a878});
      const grassM=new THREE.MeshLambertMaterial({color:0x4a7a2a});

      // ══ Badshahi Mosque — video se mila layout: bara courtyard, 3 gumbad, 4 minaret ══
      // Poora mosque solid/non-enterable hai (sirf bahir se dekh saktay hain, andar nahi ja saktay)
      const mosqueCX=-40,mosqueCZ=55,mosqueW=46,mosqueD=34;
      {
        const my=getH(mosqueCX,mosqueCZ);
        const wallH=6;
        // Bahir ki chardiwari (poori tarah solid — koi darwaza nahi, andar nahi ja saktay)
        const outerWall=new THREE.Mesh(new THREE.BoxGeometry(mosqueW,wallH,mosqueD),brickM);
        outerWall.position.set(mosqueCX,my+wallH/2,mosqueCZ);outerWall.castShadow=!isMobileLocal;scene.add(outerWall);
        bldBoxes.push(new THREE.Box3().setFromObject(outerWall));
        // Prayer hall block (courtyard ke south end mein, jahan gumbad hain)
        const hallW=mosqueW*0.55,hallD=8,hallH=9;
        const hall=new THREE.Mesh(new THREE.BoxGeometry(hallW,hallH,hallD),marbleM);
        hall.position.set(mosqueCX,my+wallH+hallH/2,mosqueCZ-mosqueD/2+hallD/2+1);hall.castShadow=!isMobileLocal;scene.add(hall);
        // 3 safed gumbad (domes)
        [-hallW/3,0,hallW/3].forEach(dx=>{
          const dome=new THREE.Mesh(new THREE.SphereGeometry(3.2,12,8,0,Math.PI*2,0,Math.PI/1.9),domeM);
          dome.position.set(mosqueCX+dx,my+wallH+hallH+1.5,mosqueCZ-mosqueD/2+hallD/2+1);scene.add(dome);
        });
        // 4 corner minaret (lambe pointed towers)
        [[-mosqueW/2+2,-mosqueD/2+2],[mosqueW/2-2,-mosqueD/2+2],[-mosqueW/2+2,mosqueD/2-2],[mosqueW/2-2,mosqueD/2-2]].forEach(([mx,mz])=>{
          const minH=22;
          const minaret=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.7,minH,10),marbleM);
          minaret.position.set(mosqueCX+mx,my+minH/2,mosqueCZ+mz);minaret.castShadow=!isMobileLocal;scene.add(minaret);
          const cap=new THREE.Mesh(new THREE.ConeGeometry(1.7,2.5,10),domeM);
          cap.position.set(mosqueCX+mx,my+minH+1.25,mosqueCZ+mz);scene.add(cap);
          bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(mosqueCX+mx,my+minH/2,mosqueCZ+mz),new THREE.Vector3(3.4,minH,3.4)));
        });
        civilianPositions.push({x:mosqueCX,z:mosqueCZ+mosqueD/2+4});
      }

      // ══ Hazuri Bagh — mosque ke bahar, cross-pattern (X) pathways wala bagh ══
      const bagCX=-40,bagCZ=10,bagSize=34;
      {
        const by=getH(bagCX,bagCZ);
        const floor=new THREE.Mesh(new THREE.BoxGeometry(bagSize,0.1,bagSize),grassM);
        floor.position.set(bagCX,by+0.05,bagCZ);scene.add(floor);
        // X (cross) pathways — 4 diagonal + 2 seedhi lakeerein
        const mkPath=(w:number,d:number,rot:number,ox:number,oz:number)=>{
          const p=new THREE.Mesh(new THREE.BoxGeometry(w,0.12,d),pathM);
          p.position.set(bagCX+ox,by+0.1,bagCZ+oz);p.rotation.y=rot;scene.add(p);
        };
        mkPath(bagSize,4,0,0,0); // seedha (north-south... yahan x-axis wide)
        mkPath(4,bagSize,0,0,0); // seedha (z-axis)
        mkPath(bagSize*1.3,4,Math.PI/4,0,0); // diagonal 1
        mkPath(bagSize*1.3,4,-Math.PI/4,0,0); // diagonal 2
        // Beech mein Hazuri Bagh Baradari (chota marble pavilion)
        const pavH=3.5;
        const pav=new THREE.Mesh(new THREE.BoxGeometry(6,pavH,6),marbleM);
        pav.position.set(bagCX,by+pavH/2,bagCZ);pav.castShadow=!isMobileLocal;scene.add(pav);
        const pavRoof=new THREE.Mesh(new THREE.ConeGeometry(4.5,2,4),domeM);
        pavRoof.position.set(bagCX,by+pavH+1,bagCZ);pavRoof.rotation.y=Math.PI/4;scene.add(pavRoof);
        bldBoxes.push(new THREE.Box3().setFromObject(pav));
        civilianPositions.push({x:bagCX+6,z:bagCZ+6});civilianPositions.push({x:bagCX-6,z:bagCZ-6});
      }

      // ══ Lahore Fort — Alamgiri Gate + deewaren (bagh ke doosri taraf) ══
      const fortCX=-40,fortCZ=-30;
      {
        const by=getH(fortCX,fortCZ);
        const gateH=16,gateW=10;
        const gateArch=new THREE.Group();
        const lp=new THREE.Mesh(new THREE.CylinderGeometry(3,3.2,gateH,10),brickM);lp.position.set(-gateW/2,gateH/2,0);
        const rp=new THREE.Mesh(new THREE.CylinderGeometry(3,3.2,gateH,10),brickM);rp.position.set(gateW/2,gateH/2,0);
        const domeL=new THREE.Mesh(new THREE.SphereGeometry(3,10,6,0,Math.PI*2,0,Math.PI/2),domeM);domeL.position.set(-gateW/2,gateH,0);
        const domeR=new THREE.Mesh(new THREE.SphereGeometry(3,10,6,0,Math.PI*2,0,Math.PI/2),domeM);domeR.position.set(gateW/2,gateH,0);
        const lintel=new THREE.Mesh(new THREE.BoxGeometry(gateW+6,3,4),brickM);lintel.position.set(0,gateH-1,0);
        gateArch.add(lp,rp,domeL,domeR,lintel);gateArch.position.set(fortCX,by,fortCZ);scene.add(gateArch);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(fortCX,by+gateH/2,fortCZ),new THREE.Vector3(gateW+8,gateH,6)));
        // Fort ki lambi deewar (dono taraf)
        [-1,1].forEach(side=>{
          const wallLen=40;
          const wall=new THREE.Mesh(new THREE.BoxGeometry(wallLen,12,3),brickM);
          wall.position.set(fortCX+side*(gateW/2+8+wallLen/2),by+6,fortCZ);wall.castShadow=!isMobileLocal;scene.add(wall);
          bldBoxes.push(new THREE.Box3().setFromObject(wall));
        });
        civilianPositions.push({x:fortCX,z:fortCZ+8});
      }

      // ══ Food Street — Fort ki deewar ke saath, dono taraf restaurant buildings ══
      {
        const fsZ=fortCZ-14; // fort ki deewar ke bilkul saath
        for(let i=0;i<6;i++){
          const fx=fortCX+18+i*7;
          const by=getH(fx,fsZ);
          const h=5+Math.random()*3;
          const bld=new THREE.Mesh(new THREE.BoxGeometry(6,h,6),brickM);
          bld.position.set(fx,by+h/2,fsZ);bld.castShadow=!isMobileLocal;scene.add(bld);
          bldBoxes.push(new THREE.Box3().setFromObject(bld));
          civilianPositions.push({x:fx,z:fsZ+4+Math.random()*2});
        }
      }

      // Chota bakhera (misc) arches — baaki khuli jaga mein ambience ke liye
      [[40,40],[60,-10]].forEach(([ax,az])=>{
        const by=getH(ax,az);const archG=new THREE.Group();
        const ph=7,pw=1.5,ad=5;
        const lp=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pw),brickM);lp.position.set(-ad/2,ph/2,0);
        const rp=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pw),brickM);rp.position.set(ad/2,ph/2,0);
        const lintel=new THREE.Mesh(new THREE.BoxGeometry(ad+pw,pw,pw),mortarM);lintel.position.set(0,ph,0);
        const arc=new THREE.Mesh(new THREE.TorusGeometry(ad*0.5,pw*0.45,8,16,Math.PI),brickM);
        arc.rotation.z=Math.PI;arc.position.set(0,ph,0);
        archG.add(lp,rp,lintel,arc);archG.position.set(ax,by,az);scene.add(archG);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(ax,by+ph/2,az),new THREE.Vector3(ad+2,ph,pw+2)));
        civilianPositions.push({x:ax+(Math.random()-0.5)*6,z:az+3+Math.random()*2});
      });

      // Overgrown vines
      const vineM=new THREE.MeshLambertMaterial({color:0x2a5e18,transparent:true,opacity:0.85});
      for(let i=0;i<40;i++){const px=(Math.random()-0.5)*220,pz=(Math.random()-0.5)*220;
        const vine=new THREE.Mesh(new THREE.PlaneGeometry(1.5+Math.random(),1.5+Math.random()*1.5),vineM);
        vine.position.set(px,getH(px,pz)+0.5,pz);vine.rotation.y=Math.random()*Math.PI;scene.add(vine);}
    }else if(cfg.id==="multan"){
      const adobeM=new THREE.MeshLambertMaterial({color:0xc8a060});
      const shrineM=new THREE.MeshLambertMaterial({color:0xd8c8a8});
      const tileM=new THREE.MeshLambertMaterial({color:0x2288aa});

      // ══ Purani shehar — dense, tang galiyan, ghar bilkul sath-sath (organic, no-grid) ══
      let seedA=1;const jrand=()=>{seedA=(seedA*9301+49297)%233280;return seedA/233280;};
      for(let ring=0;ring<5;ring++){
        const count=8+ring*4,radius=15+ring*13;
        for(let i=0;i<count;i++){
          const a=(i/count)*Math.PI*2+jrand()*0.3;
          const dx=Math.cos(a)*radius+(jrand()-0.5)*6,dz=Math.sin(a)*radius+(jrand()-0.5)*6;
          if(Math.abs(dx-homeCX)<8&&Math.abs(dz-homeCZ)<8)continue; // home ke pass building na banao
          const by=getH(dx,dz);const h=3+jrand()*3.5;
          const w=3+jrand()*2.5,d=3+jrand()*2.5;
          const bld=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),adobeM);
          bld.position.set(dx,by+h/2,dz);bld.rotation.y=jrand()*Math.PI*2;bld.castShadow=!isMobileLocal;scene.add(bld);
          bldBoxes.push(new THREE.Box3().setFromObject(bld));
          if(jrand()<0.4)civilianPositions.push({x:dx+(jrand()-0.5)*4,z:dz+(jrand()-0.5)*4});
        }
      }

      // ══ Sufi shrine (Multan = "City of Saints") — nili tile ka gumbad, landmark ══
      const shrineCX=0,shrineCZ=0;
      {
        const my=getH(shrineCX,shrineCZ);
        const base=new THREE.Mesh(new THREE.CylinderGeometry(9,10,8,10),shrineM);
        base.position.set(shrineCX,my+4,shrineCZ);base.castShadow=!isMobileLocal;scene.add(base);
        const dome=new THREE.Mesh(new THREE.SphereGeometry(8.5,14,10,0,Math.PI*2,0,Math.PI/1.9),tileM);
        dome.position.set(shrineCX,my+8+6,shrineCZ);dome.castShadow=!isMobileLocal;scene.add(dome);
        const finial=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,3,6),new THREE.MeshLambertMaterial({color:0xd4af37}));
        finial.position.set(shrineCX,my+8+12,shrineCZ);scene.add(finial);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(shrineCX,my+8,shrineCZ),new THREE.Vector3(20,16,20)));
        civilianPositions.push({x:shrineCX+12,z:shrineCZ+12});civilianPositions.push({x:shrineCX-12,z:shrineCZ-12});
      }
    }else if(cfg.id==="karachi"){
      const marbleM=new THREE.MeshLambertMaterial({color:0xe8ded0});
      const domeM=new THREE.MeshLambertMaterial({color:0xf0ead8});
      const grassM=new THREE.MeshLambertMaterial({color:0x4a8e2a});
      const pathM=new THREE.MeshLambertMaterial({color:0xc8b898});
      const concreteKM=new THREE.MeshLambertMaterial({color:0xd8d0c0});
      const roofKM=new THREE.MeshLambertMaterial({color:0x8899aa});
      const boatM=new THREE.MeshLambertMaterial({color:0xffffff});
      const boatStripeM=new THREE.MeshLambertMaterial({color:0xdd4422});

      // ══ Mazar-e-Quaid — star-shape marble platform, beech mein gumbad ══
      const mazCX=0,mazCZ=50;
      {
        const my=getH(mazCX,mazCZ);
        const platform=new THREE.Mesh(new THREE.CylinderGeometry(16,17,3,8),marbleM);
        platform.position.set(mazCX,my+1.5,mazCZ);platform.castShadow=!isMobileLocal;scene.add(platform);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(mazCX,my+1.5,mazCZ),new THREE.Vector3(34,3,34)));
        const dome=new THREE.Mesh(new THREE.SphereGeometry(7,14,10,0,Math.PI*2,0,Math.PI/1.8),domeM);
        dome.position.set(mazCX,my+3+6,mazCZ);dome.castShadow=!isMobileLocal;scene.add(dome);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(mazCX,my+7,mazCZ),new THREE.Vector3(14,14,14)));
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,10,6),new THREE.MeshLambertMaterial({color:0x888888}));
        pole.position.set(mazCX,my+3+10,mazCZ+20);scene.add(pole);
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sz])=>{
          const lawn=new THREE.Mesh(new THREE.BoxGeometry(14,0.1,14),grassM);
          lawn.position.set(mazCX+sx*22,my+0.05,mazCZ+sz*22);scene.add(lawn);
        });
        const p1=new THREE.Mesh(new THREE.BoxGeometry(60,0.12,4),pathM);p1.position.set(mazCX,my+0.1,mazCZ);scene.add(p1);
        const p2=new THREE.Mesh(new THREE.BoxGeometry(4,0.12,60),pathM);p2.position.set(mazCX,my+0.1,mazCZ);scene.add(p2);
        civilianPositions.push({x:mazCX+18,z:mazCZ+18});civilianPositions.push({x:mazCX-18,z:mazCZ-18});
      }

      // ══ Clifton / DHA — grid-pattern blocks, coast ke qareeb ══
      const gridOX=-55,gridOZ=-35;
      for(let row=0;row<3;row++){
        for(let col=0;col<3;col++){
          const bx=gridOX+col*16,bz=gridOZ+row*16;
          if(Math.random()<0.15)continue;
          const by=getH(bx,bz);const h=6+Math.random()*8;
          const bld=new THREE.Mesh(new THREE.BoxGeometry(9,h,9),concreteKM);
          bld.position.set(bx,by+h/2,bz);bld.castShadow=!isMobileLocal;scene.add(bld);
          const roof=new THREE.Mesh(new THREE.BoxGeometry(9.3,0.5,9.3),roofKM);
          roof.position.set(bx,by+h+0.25,bz);scene.add(roof);
          bldBoxes.push(new THREE.Box3().setFromObject(bld));
          civilianPositions.push({x:bx+5,z:bz+5});
        }
      }

      // ══ Sea View kashti-shape (boat) landmark — beach ke kinare ══
      {
        const boatCX=-70,boatCZ=-72;
        const by=getH(boatCX,boatCZ);
        const hull=new THREE.Mesh(new THREE.ConeGeometry(9,20,3),boatM);
        hull.rotation.x=Math.PI/2;hull.rotation.y=Math.PI/6;
        hull.position.set(boatCX,by+2,boatCZ);hull.castShadow=!isMobileLocal;scene.add(hull);
        const stripe=new THREE.Mesh(new THREE.CylinderGeometry(6,6,1.5,3,1,true),boatStripeM);
        stripe.position.set(boatCX,by+1,boatCZ);scene.add(stripe);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(boatCX,by+3,boatCZ),new THREE.Vector3(14,8,20)));
        civilianPositions.push({x:boatCX+10,z:boatCZ+5});
      }
    }else if(cfg.id==="islamabad"){
      const marbleM=new THREE.MeshLambertMaterial({color:0xf0f0e8});
      const roofTentM=new THREE.MeshLambertMaterial({color:0xe8e8e0});
      const curbM=new THREE.MeshLambertMaterial({color:0xf0c840});
      const roadM2=new THREE.MeshLambertMaterial({color:0x383838});
      const grassIM=new THREE.MeshLambertMaterial({color:0x4a8a2a});

      // ══ Faisal Masjid — tent-shape roof, 4 minaret, Margalla Hills ke neeche ══
      const fmCX=0,fmCZ=60;
      {
        const my=getH(fmCX,fmCZ);
        const base=new THREE.Mesh(new THREE.BoxGeometry(30,3,30),marbleM);
        base.position.set(fmCX,my+1.5,fmCZ);base.castShadow=!isMobileLocal;scene.add(base);
        // Tent (Bedouin) shape roof — 4 triangular panels ek point ki taraf
        const roofH=16;
        const roof=new THREE.Mesh(new THREE.ConeGeometry(15,roofH,4),roofTentM);
        roof.position.set(fmCX,my+3+roofH/2,fmCZ);roof.rotation.y=Math.PI/4;roof.castShadow=!isMobileLocal;scene.add(roof);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(fmCX,my+3+roofH/2,fmCZ),new THREE.Vector3(22,roofH+3,22)));
        // 4 lambe pointed minaret, corners par
        [[16,16],[-16,16],[16,-16],[-16,-16]].forEach(([mx,mz])=>{
          const minH=30;
          const minaret=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,minH,8),marbleM);
          minaret.position.set(fmCX+mx,my+minH/2,fmCZ+mz);minaret.castShadow=!isMobileLocal;scene.add(minaret);
          const cap=new THREE.Mesh(new THREE.ConeGeometry(1.1,3,8),roofTentM);
          cap.position.set(fmCX+mx,my+minH+1.5,fmCZ+mz);scene.add(cap);
          bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(fmCX+mx,my+minH/2,fmCZ+mz),new THREE.Vector3(2.5,minH,2.5)));
        });
        civilianPositions.push({x:fmCX+18,z:fmCZ-18});civilianPositions.push({x:fmCX-18,z:fmCZ-18});
      }

      // ══ Wide boulevard road — kaali-peeli curb, hara median ══
      {
        const rz=10;
        const road=new THREE.Mesh(new THREE.BoxGeometry(140,0.15,14),roadM2);
        road.position.set(0,getH(0,rz)+0.08,rz);scene.add(road);
        const median=new THREE.Mesh(new THREE.BoxGeometry(140,0.3,2.5),grassIM);
        median.position.set(0,getH(0,rz)+0.2,rz);scene.add(median);
        [-1,1].forEach(side=>{
          const curb=new THREE.Mesh(new THREE.BoxGeometry(140,0.25,0.6),curbM);
          curb.position.set(0,getH(0,rz)+0.2,rz+side*7);scene.add(curb);
        });
      }

      // ══ F-9 Park — organic gol shape, winding paths ══
      const parkCX=-55,parkCZ=-40;
      {
        const my=getH(parkCX,parkCZ);
        const lawn=new THREE.Mesh(new THREE.CylinderGeometry(28,28,0.15,20),grassIM);
        lawn.position.set(parkCX,my+0.08,parkCZ);scene.add(lawn);
        const track=new THREE.Mesh(new THREE.RingGeometry(20,21.5,24),new THREE.MeshLambertMaterial({color:0xc8b898}));
        track.rotation.x=-Math.PI/2;track.position.set(parkCX,my+0.15,parkCZ);scene.add(track);
        civilianPositions.push({x:parkCX+15,z:parkCZ+5});civilianPositions.push({x:parkCX-10,z:parkCZ-15});
      }
    }else if(cfg.id==="faisalabad"){
      const bazaarM=new THREE.MeshLambertMaterial({color:0xc4a878});
      const roadFM=new THREE.MeshLambertMaterial({color:0x3a3632});
      const towerM=new THREE.MeshLambertMaterial({color:0xd8c8a0});

      // ══ Ghanta Ghar (Clock Tower) — center mein, 8 sadkein yahan se phailti hain ══
      {
        const my=getH(0,0);
        const towerH=18;
        const base=new THREE.Mesh(new THREE.CylinderGeometry(4,5,8,4),towerM);
        base.position.set(0,my+4,0);base.rotation.y=Math.PI/8;base.castShadow=!isMobileLocal;scene.add(base);
        const spire=new THREE.Mesh(new THREE.CylinderGeometry(2.2,3,towerH-8,4),towerM);
        spire.position.set(0,my+8+(towerH-8)/2,0);spire.rotation.y=Math.PI/8;spire.castShadow=!isMobileLocal;scene.add(spire);
        const cap=new THREE.Mesh(new THREE.ConeGeometry(2.5,3,4),new THREE.MeshLambertMaterial({color:0x6a5838}));
        cap.position.set(0,my+towerH+1.5,0);cap.rotation.y=Math.PI/8;scene.add(cap);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0,my+towerH/2,0),new THREE.Vector3(10,towerH,10)));
      }

      // ══ 8 spokes — sadkein center se bahar phailti hain, har spoke ke saath dukanein ══
      for(let s=0;s<8;s++){
        const ang=s*(Math.PI*2/8);
        const road=new THREE.Mesh(new THREE.BoxGeometry(6,0.12,75),roadFM);
        road.position.set(Math.sin(ang)*40,getH(Math.sin(ang)*40,Math.cos(ang)*40)+0.06,Math.cos(ang)*40);
        road.rotation.y=ang;scene.add(road);
        // Har spoke ke sath dukanein (dono taraf)
        for(let d=12;d<70;d+=10){
          [-1,1].forEach(side=>{
            const perpAng=ang+Math.PI/2;
            const bx=Math.sin(ang)*d+Math.sin(perpAng)*side*5,bz=Math.cos(ang)*d+Math.cos(perpAng)*side*5;
            if(Math.abs(bx-homeCX)<8&&Math.abs(bz-homeCZ)<8)return; // home ke pass nahi
            const by=getH(bx,bz);const h=3+Math.random()*3;
            const bld=new THREE.Mesh(new THREE.BoxGeometry(4.5,h,4.5),bazaarM);
            bld.position.set(bx,by+h/2,bz);bld.rotation.y=ang;bld.castShadow=!isMobileLocal;scene.add(bld);
            bldBoxes.push(new THREE.Box3().setFromObject(bld));
            if(Math.random()<0.3)civilianPositions.push({x:bx+(Math.random()-0.5)*3,z:bz+(Math.random()-0.5)*3});
          });
        }
      }
    }else if(cfg.id==="skardu"){
      const cottageM=new THREE.MeshLambertMaterial({color:0x8a6858});
      const roofRedM=new THREE.MeshLambertMaterial({color:0x8a3030});
      const lakeM=new THREE.MeshLambertMaterial({color:0x1a8ea0,transparent:true,opacity:0.85});
      const deckM=new THREE.MeshLambertMaterial({color:0xa89880});

      // ══ Turquoise lake (Kachura-style) ══
      const lakeCX=-60,lakeCZ=0;
      {
        const lG=new THREE.PlaneGeometry(70,110,10,10);lG.rotateX(-Math.PI/2);
        const lake=new THREE.Mesh(lG,lakeM);
        lake.position.set(lakeCX,getH(lakeCX,lakeCZ)-1.2,lakeCZ);scene.add(lake);
      }

      // ══ Shangrila Resort — maroon triangular-roof cottages, jhil ke kinare ══
      for(let i=0;i<7;i++){
        const cx=lakeCX+42,cz=-45+i*14;
        if(Math.abs(cx-homeCX)<8&&Math.abs(cz-homeCZ)<8)continue;
        const by=getH(cx,cz);const h=4.5;
        const body=new THREE.Mesh(new THREE.BoxGeometry(6,h,5),cottageM);
        body.position.set(cx,by+h/2,cz);body.castShadow=!isMobileLocal;scene.add(body);
        const roof=new THREE.Mesh(new THREE.ConeGeometry(4.5,3.5,4),roofRedM);
        roof.position.set(cx,by+h+1.75,cz);roof.rotation.y=Math.PI/4;scene.add(roof);
        bldBoxes.push(new THREE.Box3().setFromObject(body));
        civilianPositions.push({x:cx+4,z:cz});
      }
      // Lake ke kinare deck/walkway
      const deck=new THREE.Mesh(new THREE.BoxGeometry(4,0.15,100),deckM);
      deck.position.set(lakeCX+32,getH(lakeCX+32,0)+0.08,0);scene.add(deck);
    }else if(cfg.id==="murree"){
      const cottageMurM=new THREE.MeshLambertMaterial({color:0xd8d0c0});
      const roofColors=[0x8a3838,0x3a5a8a,0x3a6a4a,0x8a6a2a];
      let seedM=7;const mrand=()=>{seedM=(seedM*9301+49297)%233280;return seedM/233280;};

      // ══ Rangeen cottages, pine forest ke beech organic (non-grid) bikhri hui ══
      for(let i=0;i<26;i++){
        const cx=(mrand()-0.5)*160,cz=(mrand()-0.5)*160;
        if(Math.abs(cx-homeCX)<8&&Math.abs(cz-homeCZ)<8)continue;
        const by=getH(cx,cz);const h=3.5+mrand()*2;
        const body=new THREE.Mesh(new THREE.BoxGeometry(4.5,h,4),cottageMurM);
        body.position.set(cx,by+h/2,cz);body.rotation.y=mrand()*Math.PI*2;body.castShadow=!isMobileLocal;scene.add(body);
        const roof=new THREE.Mesh(new THREE.ConeGeometry(3.5,2.5,4),new THREE.MeshLambertMaterial({color:roofColors[Math.floor(mrand()*roofColors.length)]}));
        roof.position.set(cx,by+h+1.25,cz);roof.rotation.y=Math.PI/4;scene.add(roof);
        bldBoxes.push(new THREE.Box3().setFromObject(body));
        if(mrand()<0.4)civilianPositions.push({x:cx+3,z:cz+3});
      }
    }else if(cfg.id==="peshawar"){
      const shopM=new THREE.MeshLambertMaterial({color:0xc4a878});
      const shopM2=new THREE.MeshLambertMaterial({color:0xb89868});
      const roadPM=new THREE.MeshLambertMaterial({color:0x383430});
      let seedP=3;const prand=()=>{seedP=(seedP*9301+49297)%233280;return seedP/233280;};

      // ══ Bazaar road, dono taraf dense dukanein (shopfronts) ══
      const road=new THREE.Mesh(new THREE.BoxGeometry(10,0.12,150),roadPM);
      road.position.set(0,getH(0,0)+0.06,0);scene.add(road);
      for(let i=0;i<20;i++){
        const bz=-70+i*7;
        [-1,1].forEach(side=>{
          const bx=side*9;
          if(Math.abs(bx-homeCX)<8&&Math.abs(bz-homeCZ)<8)return;
          const by=getH(bx,bz);const h=3+prand()*3;
          const shop=new THREE.Mesh(new THREE.BoxGeometry(5,h,5),prand()<0.5?shopM:shopM2);
          shop.position.set(bx,by+h/2,bz);shop.castShadow=!isMobileLocal;scene.add(shop);
          bldBoxes.push(new THREE.Box3().setFromObject(shop));
          if(prand()<0.5)civilianPositions.push({x:bx-side*3,z:bz+prand()*2});
        });
      }
    }else if(cfg.id==="quetta"){
      const sandyM=new THREE.MeshLambertMaterial({color:0xd4b888});
      const uniM=new THREE.MeshLambertMaterial({color:0xc8b078});
      let seedQ=11;const qrand=()=>{seedQ=(seedQ*9301+49297)%233280;return seedQ/233280;};

      // ══ University campus block ══
      const uniCX=-50,uniCZ=30;
      {
        const by=getH(uniCX,uniCZ);
        const uni=new THREE.Mesh(new THREE.BoxGeometry(28,7,16),uniM);
        uni.position.set(uniCX,by+3.5,uniCZ);uni.castShadow=!isMobileLocal;scene.add(uni);
        bldBoxes.push(new THREE.Box3().setFromObject(uni));
        const playground=new THREE.Mesh(new THREE.BoxGeometry(20,0.1,20),new THREE.MeshLambertMaterial({color:0xc4a868}));
        playground.position.set(uniCX,by+0.05,uniCZ-24);scene.add(playground);
        civilianPositions.push({x:uniCX+16,z:uniCZ});
      }

      // ══ Irregular residential blocks (dusty/sandy) ══
      for(let i=0;i<16;i++){
        const bx=(qrand()-0.5)*150,bz=(qrand()-0.5)*150;
        if(Math.abs(bx-homeCX)<8&&Math.abs(bz-homeCZ)<8)continue;
        if(Math.abs(bx-uniCX)<20&&Math.abs(bz-uniCZ)<16)continue;
        const by=getH(bx,bz);const h=3+qrand()*3;
        const bld=new THREE.Mesh(new THREE.BoxGeometry(5+qrand()*3,h,5+qrand()*3),sandyM);
        bld.position.set(bx,by+h/2,bz);bld.rotation.y=qrand()*Math.PI*2;bld.castShadow=!isMobileLocal;scene.add(bld);
        bldBoxes.push(new THREE.Box3().setFromObject(bld));
        if(qrand()<0.3)civilianPositions.push({x:bx+3,z:bz+3});
      }
    }else if(cfg.id==="kaghan"){
      const hotelM=new THREE.MeshLambertMaterial({color:0xe0d8c8});
      const hotelRoofM=new THREE.MeshLambertMaterial({color:0x6a5040});
      const riverM=new THREE.MeshLambertMaterial({color:0x5aa8c0,transparent:true,opacity:0.8});

      // ══ Kunhar River — sadak ke saath saath ══
      {
        const rG=new THREE.PlaneGeometry(16,TSIZE*0.9);rG.rotateX(-Math.PI/2);
        const river=new THREE.Mesh(rG,riverM);
        river.position.set(-24,getH(-24,0)-0.8,0);scene.add(river);
      }
      // Sadak river ke doosri taraf
      const road=new THREE.Mesh(new THREE.BoxGeometry(6,0.12,TSIZE*0.9),new THREE.MeshLambertMaterial({color:0x3a3632}));
      road.position.set(-8,getH(-8,0)+0.06,0);scene.add(road);

      // ══ Hotels — sadak ke kinare ek line mein ══
      for(let i=0;i<10;i++){
        const hz=-90+i*20;
        const hx=8;
        if(Math.abs(hx-homeCX)<8&&Math.abs(hz-homeCZ)<8)continue;
        const by=getH(hx,hz);const h=5+Math.random()*3;
        const hotel=new THREE.Mesh(new THREE.BoxGeometry(8,h,7),hotelM);
        hotel.position.set(hx,by+h/2,hz);hotel.castShadow=!isMobileLocal;scene.add(hotel);
        const roof=new THREE.Mesh(new THREE.BoxGeometry(8.4,0.6,7.4),hotelRoofM);
        roof.position.set(hx,by+h+0.3,hz);scene.add(roof);
        bldBoxes.push(new THREE.Box3().setFromObject(hotel));
        civilianPositions.push({x:hx+5,z:hz});
      }
    }else if(cfg.id==="fortress"){
      const mallM=new THREE.MeshLambertMaterial({color:0xd8d0b8});
      const mallGlassM=new THREE.MeshLambertMaterial({color:0x88aac8,transparent:true,opacity:0.65});
      const standM=new THREE.MeshLambertMaterial({color:0xb8a888});
      const pitchM=new THREE.MeshLambertMaterial({color:0x3a8a3a});
      const marbleFM=new THREE.MeshLambertMaterial({color:0xe8ded0});

      // ══ Fortress Stadium — gol/oval cricket ground, stands charon taraf ══
      const stadCX=0,stadCZ=40;
      {
        const my=getH(stadCX,stadCZ);
        const pitch=new THREE.Mesh(new THREE.CylinderGeometry(32,32,0.15,24),pitchM);
        pitch.position.set(stadCX,my+0.08,stadCZ);scene.add(pitch);
        // Stands (ring ke around, chand segments)
        for(let s=0;s<12;s++){
          const ang=s*(Math.PI*2/12);
          const sx=stadCX+Math.sin(ang)*36,sz=stadCZ+Math.cos(ang)*36;
          const stand=new THREE.Mesh(new THREE.BoxGeometry(9,4,5),standM);
          stand.position.set(sx,my+2,sz);stand.rotation.y=ang;scene.add(stand);
          bldBoxes.push(new THREE.Box3().setFromObject(stand));
        }
        civilianPositions.push({x:stadCX+40,z:stadCZ});
      }

      // ══ Fortress Square Mall — bara building, glass front ══
      const mallCX=-45,mallCZ=-10;
      {
        const my=getH(mallCX,mallCZ);
        const mall=new THREE.Mesh(new THREE.BoxGeometry(30,10,20),mallM);
        mall.position.set(mallCX,my+5,mallCZ);mall.castShadow=!isMobileLocal;scene.add(mall);
        const glassFront=new THREE.Mesh(new THREE.BoxGeometry(28,8,0.3),mallGlassM);
        glassFront.position.set(mallCX,my+4,mallCZ+10.2);scene.add(glassFront);
        bldBoxes.push(new THREE.Box3().setFromObject(mall));
        civilianPositions.push({x:mallCX+2,z:mallCZ+14});civilianPositions.push({x:mallCX-8,z:mallCZ+14});
      }

      // ══ Market lane (Fortress Market) ══
      for(let i=0;i<8;i++){
        const mx=-10+i*6,mz=-40;
        if(Math.abs(mx-homeCX)<8&&Math.abs(mz-homeCZ)<8)continue;
        const by=getH(mx,mz);const h=3+Math.random()*2;
        const shop=new THREE.Mesh(new THREE.BoxGeometry(4.5,h,4.5),mallM);
        shop.position.set(mx,by+h/2,mz);shop.castShadow=!isMobileLocal;scene.add(shop);
        bldBoxes.push(new THREE.Box3().setFromObject(shop));
        if(Math.random()<0.4)civilianPositions.push({x:mx,z:mz+4});
      }

      // ══ Garrison Masjid — chota, safed marble ══
      const gmCX=30,gmCZ=-20;
      {
        const my=getH(gmCX,gmCZ);
        const hall=new THREE.Mesh(new THREE.BoxGeometry(12,5,10),marbleFM);
        hall.position.set(gmCX,my+2.5,gmCZ);hall.castShadow=!isMobileLocal;scene.add(hall);
        const dome=new THREE.Mesh(new THREE.SphereGeometry(3.5,10,6,0,Math.PI*2,0,Math.PI/2),marbleFM);
        dome.position.set(gmCX,my+5,gmCZ);scene.add(dome);
        bldBoxes.push(new THREE.Box3().setFromObject(hall));
        civilianPositions.push({x:gmCX+8,z:gmCZ});
      }
    }else{
      const concreteM=new THREE.MeshLambertMaterial({color:0xb0b8c0});
      const glassM=new THREE.MeshLambertMaterial({color:0x4477aa,transparent:true,opacity:0.7});
      const roofKM=new THREE.MeshLambertMaterial({color:0x506070});
      [[20,20,10,18,10],[38,28,8,14,7],[52,12,11,22,11],[-22,32,9,16,9],[-42,16,7,12,7],
       [62,-18,10,20,10],[32,-38,8,14,8],[-32,-28,14,28,14],[78,52,9,16,9],[-68,-48,8,12,7],
       [12,68,11,18,10],[-58,42,7,10,8],[45,-60,9,14,9],[-20,-70,8,10,8],[90,-30,10,16,10],
      ].forEach(([x,z,w,h,d])=>{
        const by=getH(x,z);const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),concreteM);
        body.position.set(x,by+h/2,z);body.castShadow=!isMobileLocal;scene.add(body);
        const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.4,0.6,d+0.4),roofKM);
        roof.position.set(x,by+h+0.3,z);scene.add(roof);
        bldBoxes.push(new THREE.Box3().setFromObject(body));
        civilianPositions.push({x:x+(Math.random()-0.5)*6,z:z+d/2+1.5});
      });
      const glassT=new THREE.Mesh(new THREE.BoxGeometry(12,35,12),glassM);
      glassT.position.set(-5,17.5,-5);scene.add(glassT);bldBoxes.push(new THREE.Box3().setFromObject(glassT));
    }

    // ── Static civilians near buildings ───────────────────────────────────
    const civOutfits=[
      [0xd4a870,0xf5eedd,0xb09870],[0xc08850,0x3a6030,0x2a4020],[0xb87840,0xe8d080,0x907840],
      [0xc09060,0x4488cc,0x223355],[0xcda882,0xddccaa,0x887060],[0xb88060,0xcc4422,0x442211],
    ];
    civilianPositions.slice(0,Math.min(civilianPositions.length,12)).forEach((cp)=>{
      const outfit=civOutfits[Math.floor(Math.random()*civOutfits.length)];
      const{group}=mkHuman(outfit[0],outfit[1],outfit[2],false);
      const by=getH(cp.x,cp.z);
      group.position.set(cp.x,by,cp.z);
      group.rotation.y=Math.random()*Math.PI*2;
      scene.add(group);
    });

    // ── Trees ─────────────────────────────────────────────────────────────
    const trunkM=new THREE.MeshLambertMaterial({color:0x5c3d1a});
    const leafColors:{[k:string]:number}={hunza:0x2a5a2c,lahore:0x3a6e1a,multan:0xaa8833,karachi:0x4a8e22,islamabad:0x2a6e1a,faisalabad:0x5a6e2a,skardu:0x2a5a3a,murree:0x1a4a20,peshawar:0x6a7a3a,quetta:0x7a8858,kaghan:0x2a5a38,fortress:0x3a6e2a};
    const leafM=new THREE.MeshLambertMaterial({color:leafColors[cfg.id]||0x3a6e1a});
    for(let i=0;i<(cfg.id==="multan"?30:80);i++){
      const a=Math.random()*Math.PI*2,dist=20+Math.random()*(cfg.id==="hunza"?80:180);
      const tx=Math.cos(a)*dist,tz=Math.sin(a)*dist;
      if(cfg.id==="hunza"&&Math.abs(tx)>85)continue;
      if(cfg.id==="karachi"&&tz<-50)continue;
      const th=getH(tx,tz);if(cfg.id==="hunza"&&th>80)continue;
      const g=new THREE.Group();
      const tH=3+Math.random()*2;
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.38,tH,6),trunkM);
      trunk.position.y=tH/2;const leaf=new THREE.Mesh(new THREE.ConeGeometry(2.2,4.5,7),leafM);
      leaf.position.y=tH+2.2;g.add(trunk,leaf);g.position.set(tx,th+1.4,tz);scene.add(g);
    }

    // ── Rocks ─────────────────────────────────────────────────────────────
    const rockM=new THREE.MeshLambertMaterial({color:cfg.id==="multan"?0xc09050:0x808070});
    for(let i=0;i<(cfg.id==="hunza"?60:30);i++){
      const rx=(Math.random()-0.5)*(cfg.id==="hunza"?220:360);
      const rz=(Math.random()-0.5)*(cfg.id==="hunza"?200:360);
      if(cfg.id==="hunza"&&Math.abs(rx)>80)continue;
      const s=cfg.id==="hunza"?1.5+Math.random()*4:0.6+Math.random()*1.8;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockM);
      rock.position.set(rx,getH(rx,rz)+s*0.3,rz);rock.rotation.set(Math.random(),Math.random(),Math.random());
      rock.castShadow=!isMobileLocal;scene.add(rock);
    }

    // ── Ammo pickups ───────────────────────────────────────────────────────
    const ammoBoxM=new THREE.MeshLambertMaterial({color:0xffcc00});
    const ammoMkM=new THREE.MeshLambertMaterial({color:0xff6600});
    [[5,15],[20,-25],[-15,30],[30,-50],[-25,55],[0,-80],[40,80],[-45,-60],[55,20],[-55,-20],[10,110],[-10,-110]
    ].forEach(([ax,az])=>{
      const pack=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.75,0.6),ammoBoxM);
      pack.position.set(ax,getH(ax,az)+1.0,az);scene.add(pack);
      const c1=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.7),ammoMkM);
      const c2=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.1,0.1),ammoMkM);
      c1.position.y=0.45;c2.position.y=0.45;pack.add(c1,c2);
      ammoPickRef.current.push({mesh:pack,active:true,respawnTimer:0});
    });

    // ── Health packs ───────────────────────────────────────────────────────
    const hpBoxM=new THREE.MeshLambertMaterial({color:0x22cc44});
    const hpCrossM=new THREE.MeshLambertMaterial({color:0xffffff});
    [[25,-10],[-25,25],[10,50],[-10,-45],[60,30],[-60,-15],[0,-90],[75,-60],
     [-75,40],[35,80],[-35,-70],[50,-50]].forEach(([hx,hz])=>{
      const g=new THREE.Group();
      const box=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),hpBoxM);
      const cv=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.85,0.25),hpCrossM);
      const ch=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.25,0.25),hpCrossM);
      g.add(box,cv,ch);g.position.set(hx,getH(hx,hz)+1.0,hz);scene.add(g);
      hpPickRef.current.push({mesh:g,active:true,respawnTimer:0});
    });

    // ── Car ────────────────────────────────────────────────────────────────
    const carY=getH(csx,csz); // csx,csz already defined above (home door-front point)
    // ══ Active vehicle (VehicleSystem) — Garage se select ki hui gaari aur uske mods ══
    const activeVehicleDef=getVehicle(selectedVehicleId);
    const activeMods=getVehicleMods(selectedVehicleId);
    const activeVehicleStats=applyMods(activeVehicleDef.baseStats,activeMods);
    const vehiclePhysics=toArcadePhysics(activeVehicleStats);

    const carBodyM=new THREE.MeshPhysicalMaterial({color:activeMods.paintColor,roughness:activeMods.finish==="matte"?0.75:0.35,metalness:0.65,clearcoat:activeMods.finish==="gloss"?0.9:0.3,clearcoatRoughness:0.15});
    const carGlassM=new THREE.MeshStandardMaterial({color:0x91b6d8,transparent:true,opacity:0.55,roughness:0.12,metalness:0.08});
    const wheelM2=new THREE.MeshLambertMaterial({color:activeMods.wheelColor});
    const CATEGORY_SCALE:{[k:string]:[number,number,number]}={
      Hatchback:[0.92,1.0,0.82],Sedan:[1,1,1],SUV:[1.08,1.32,1.05],
      Sports:[1.05,0.74,1.12],Muscle:[1.1,0.94,1.15],Pickup:[1.05,1.05,1.32],
      Offroad:[1.06,1.24,1.06],Classic:[0.98,1.08,0.92],
      Rally:[1.04,0.98,1.08],Electric:[1.02,0.9,1.08],Van:[1.1,1.3,1.28],
    };
    const [csX,csY,csZ]=CATEGORY_SCALE[activeVehicleDef.category]||[1,1,1];

    const carGroup=new THREE.Group();
    const bodyGroup=new THREE.Group(); // sirf body scale hoga, wheels gol hi rahenge
    bodyGroup.scale.set(csX,csY,csZ);
    const carBody=new THREE.Mesh(new THREE.BoxGeometry(2.45,0.58,4.7),carBodyM);carBody.position.y=0.55;bodyGroup.add(carBody);
    const hood=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.38,1.25),carBodyM);hood.position.set(0,0.62,-1.52);hood.rotation.x=-0.08;bodyGroup.add(hood);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(2.08,0.78,2.05),carBodyM);cab.position.set(0,1.18,0.2);bodyGroup.add(cab);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(1.85,0.14,1.55),carBodyM);roof.position.set(0,1.62,0.18);bodyGroup.add(roof);
    const grille=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.2,0.14),new THREE.MeshStandardMaterial({color:0xdddddd,roughness:0.35,metalness:0.65}));grille.position.set(0,0.7,-2.34);bodyGroup.add(grille);
    const bumper=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.18,0.18),new THREE.MeshStandardMaterial({color:0x1b1f25,roughness:0.85,metalness:0.1}));bumper.position.set(0,0.34,-2.22);bodyGroup.add(bumper);
    const windshield=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.72),carGlassM);windshield.position.set(0,1.28,-0.92);windshield.rotation.x=0.35;bodyGroup.add(windshield);
    const rearWindow=new THREE.Mesh(new THREE.PlaneGeometry(1.62,0.58),carGlassM);rearWindow.position.set(0,1.33,1.0);rearWindow.rotation.x=-0.27;bodyGroup.add(rearWindow);
    [[-0.92,0.98,-0.12],[0.92,0.98,-0.12],[-0.92,0.98,0.88],[0.92,0.98,0.88]].forEach(([wx,wy,wz])=>{
      const win=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.48,0.58),new THREE.MeshStandardMaterial({color:0x6c8094,transparent:true,opacity:0.3,roughness:0.15,metalness:0.05}));
      win.position.set(wx,wy,wz);bodyGroup.add(win);
    });
    [[-1.45,0.28,-1.55],[1.45,0.28,-1.55],[-1.45,0.28,1.55],[1.45,0.28,1.55]].forEach(([wx,wy,wz])=>{
      const arch=new THREE.Mesh(new THREE.TorusGeometry(0.52,0.08,8,12),new THREE.MeshStandardMaterial({color:0x1b1b1b,roughness:0.95,metalness:0.05}));
      arch.rotation.y=Math.PI/2;arch.position.set(wx,wy,wz);bodyGroup.add(arch);
    });
    carGroup.add(bodyGroup);
    // Wheels seedhe carGroup mein (unscaled — hamesha gol), position sirf lambai/chaurai ke hisab se badalti hai
    const wheelYOffset=activeVehicleDef.category==="SUV"||activeVehicleDef.category==="Offroad"?0.5:activeVehicleDef.category==="Sports"?0.32:0.4;
    [[-1.4,-1.8],[1.4,-1.8],[-1.4,1.8],[1.4,1.8]].forEach(([wx,wz])=>{
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.32,10),wheelM2);
      wheel.rotation.z=Math.PI/2;wheel.position.set(wx*csX,wheelYOffset,wz*csZ);
      carGroup.add(wheel);
    });
    carGroup.position.set(csx,carY+0.36,csz);
    scene.add(carGroup);
    carRef.current={group:carGroup,vel:0,heading:0,steer:0,inUse:false};

    // ── NPCs (humanoid models) ─────────────────────────────────────────────
    const npcSkin=cfg.skinTone;const npcShirt=cfg.shirtColor;const npcPants=cfg.pantsColor;

    function makeWaypoints(cx:number,cz:number):THREE.Vector3[]{
      return Array.from({length:4},()=>{
        let wx=cx+(Math.random()-0.5)*30,wz=cz+(Math.random()-0.5)*30;
        if(cfg.id==="hunza")wx=Math.max(-80,Math.min(80,wx));
        return new THREE.Vector3(wx,getH(wx,wz)+0.12,wz);
      });
    }

    function mkNPC(id:number):NPC{
      const{group,torso}=mkHuman(npcSkin,npcShirt,npcPants,true);
      let nx=0,nz=0;
      if(cfg.id==="hunza"){nx=(Math.random()-0.5)*160;nz=(Math.random()-0.5)*160;nx=Math.max(-80,Math.min(80,nx));}
      else{const a=Math.random()*Math.PI*2,d=20+Math.random()*100;nx=Math.cos(a)*d;nz=Math.sin(a)*d;}
      group.position.set(nx,getH(nx,nz)+0.12,nz);scene.add(group);
      return{group,bodyMesh:torso,hp:100,maxHp:100,speed:2.0+Math.random()*1.5,
        dir:new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize(),
        changeT:2+Math.random()*4,state:"patrol",id,waypoints:makeWaypoints(nx,nz),
        wpIdx:0,alertTimer:0,attackCooldown:1+Math.random()*2};
    }
    for(let i=0;i<NPC_COUNT;i++)npcsRef.current.push(mkNPC(i));

    // ── Rain ──────────────────────────────────────────────────────────────
    const rainPos=new Float32Array(RAIN_COUNT*3);
    for(let i=0;i<RAIN_COUNT;i++){rainPos[i*3]=(Math.random()-0.5)*200;rainPos[i*3+1]=Math.random()*80;rainPos[i*3+2]=(Math.random()-0.5)*200;}
    const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute("position",new THREE.BufferAttribute(rainPos,3));
    const rainMesh=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0xaaddff,size:0.16,transparent:true,opacity:0.45}));
    rainMesh.visible=false;scene.add(rainMesh);

    // ── Safe zone ring ────────────────────────────────────────────────────
    const zoneRingMat=new THREE.MeshBasicMaterial({color:0x22aaff,transparent:true,opacity:0.5,side:THREE.DoubleSide});
    const zoneRingGeo=new THREE.TorusGeometry(zoneRadiusRef.current,1.5,8,80);
    const zoneRing=new THREE.Mesh(zoneRingGeo,zoneRingMat);zoneRing.rotation.x=Math.PI/2;zoneRing.position.y=2;zoneRing.visible=false;scene.add(zoneRing);
    const zoneWallMat=new THREE.MeshBasicMaterial({color:0x2255ff,transparent:true,opacity:0.06,side:THREE.DoubleSide});
    const zoneWall=new THREE.Mesh(new THREE.CylinderGeometry(zoneRadiusRef.current,zoneRadiusRef.current,80,80,1,true),zoneWallMat);
    zoneWall.visible=false; // battle royale zone hata diya — driving game hai
    zoneWall.position.y=40;scene.add(zoneWall);

    // ── Weapon pickups — driving game hai, ab weapons spawn nahi hotay ──────
    const wPositions:[number,number][]=[]; // khali rakha (Phase 1: shooter mechanics hata diye)
    wPositions.forEach(([px,pz],i)=>{
      const wt="pistol" as WeaponType;const wcfg=WEAPON_CFG[wt];
      const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.09,0.44),new THREE.MeshStandardMaterial({color:wcfg.col,roughness:0.45,metalness:0.5}));
      body.castShadow=false;g.add(body);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.055,6,20),new THREE.MeshBasicMaterial({color:0xffcc00,transparent:true,opacity:0.82}));
      ring.rotation.x=Math.PI/2;ring.position.y=-0.18;g.add(ring);
      const gy=getH(px,pz);g.position.set(px,gy+0.55,pz);scene.add(g);
      weaponPickRef.current.push({mesh:g,active:true,type:wt,respawnTimer:0});
    });

    // ── Armor pickups (blue cubes) ─────────────────────────────────────────
    [[12,-22],[-16,36],[44,12],[-44,-22],[26,70],[-30,-65],[66,44],[-64,26],[0,45],[-50,10]].forEach(([ax,az])=>{
      const ay=getH(ax,az);const ag=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.85,0.85),new THREE.MeshStandardMaterial({color:0x2255ff,roughness:0.4,metalness:0.3,emissive:0x112244,emissiveIntensity:0.5}));
      const c1=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.55,0.2),new THREE.MeshBasicMaterial({color:0xffffff}));
      const c2=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.2,0.2),new THREE.MeshBasicMaterial({color:0xffffff}));
      ag.add(body,c1,c2);ag.position.set(ax,ay+0.8,az);scene.add(ag);
      armorPickRef.current.push({mesh:ag,active:true,respawnTimer:0});
    });

    // ── Grenade pickup ────────────────────────────────────────────────────
    [[20,-15],[-20,20],[55,-10],[-40,55],[0,-60],[70,30],[-70,-30],[30,90]].forEach(([gx,gz])=>{
      const gm=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,6),new THREE.MeshStandardMaterial({color:0x44aa22,roughness:0.6,metalness:0.3}));
      gm.position.set(gx,getH(gx,gz)+0.55,gz);scene.add(gm);
      ammoPickRef.current.push({mesh:gm,active:true,respawnTimer:0});  // tag on ammo for respawn logic
    });

    // ── Raycaster / Shooting ───────────────────────────────────────────────
    const raycaster=new THREE.Raycaster();
    function spawnDrop(pos:THREE.Vector3){
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,6),new THREE.MeshLambertMaterial({color:0xffcc00}));
      m.position.copy(pos).setY(pos.y+1.0);scene.add(m);ammoPickRef.current.push({mesh:m,active:true,respawnTimer:0});
    }
    function throwGrenade(){
      if(grenadeCountRef.current<=0){flash("No grenades!");return;}
      grenadeCountRef.current--;setGrenadeCount(grenadeCountRef.current);
      const dir=new THREE.Vector3();camera.getWorldDirection(dir);
      const vel=dir.multiplyScalar(14).add(new THREE.Vector3(0,6,0));
      const gMesh=new THREE.Mesh(new THREE.SphereGeometry(0.22,7,6),new THREE.MeshStandardMaterial({color:0x44aa22,roughness:0.6,metalness:0.3}));
      gMesh.position.copy(camera.position).addScaledVector(dir.normalize(),1.2);
      scene.add(gMesh);
      activeGrnadesRef.current.push({mesh:gMesh,vel,alive:true,timer:2.8,exploded:false});
      flash("Grenade! 💣");
    }
    function shoot(){
      if(!canShoot.current)return;
      if(ammoRef.current<=0){flash("No ammo! R to reload");return;}
      const wcfg=WEAPON_CFG[weaponRef.current];
      canShoot.current=false;ammoRef.current-=1;setAmmo(ammoRef.current);showMuzzle();
      setTimeout(()=>{canShoot.current=true;},wcfg.rate);
      for(let p=0;p<wcfg.pellets;p++){
        const sx=(Math.random()-0.5)*wcfg.spread*2,sy=(Math.random()-0.5)*wcfg.spread*2;
        raycaster.setFromCamera(new THREE.Vector2(sx,sy),camera);
        const tgts=npcsRef.current.filter(n=>n.state!=="dead").map(n=>n.bodyMesh);
        const hits=raycaster.intersectObjects(tgts,false);
        if(!hits.length)continue;
        const npc=npcsRef.current.find(n=>n.state!=="dead"&&n.bodyMesh===hits[0].object);
        if(!npc)continue;
        const headshot=hits[0].point.y>npc.group.position.y+1.5;
        const dmg=Math.round(wcfg.dmg*(headshot?2.0:1)*(0.85+Math.random()*0.3));
        npc.hp-=dmg;showHit();
        const wp2=npc.group.position.clone().add(new THREE.Vector3(0,1.6,0));
        const pr2=wp2.clone().project(camera);
        const newId=++dmgId.current;
        const label=headshot?`${dmg} 🎯`:String(dmg);
        setDmgNums(prev=>[...prev,{id:newId,x:(pr2.x*0.5+0.5)*100,y:(1-(pr2.y*0.5+0.5))*100,v:headshot?dmg*10:dmg}]);
        setTimeout(()=>setDmgNums(prev=>prev.filter(d=>d.id!==newId)),800);
        (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff2200);
        setTimeout(()=>{if(npc.state!=="dead")(npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(npcShirt);},280);
        if(npc.hp<=0){
          npc.state="dead";npc.group.visible=false;
          killsRef.current+=1;setKills(killsRef.current);
          comboT.current=3.5;comboRef.current+=1;setCombo(comboRef.current);
          flash(comboRef.current>=5?"RAMPAGE! 🔥":comboRef.current>=3?"MULTI-KILL! ⚡":headshot?"HEADSHOT! 💀":"Enemy down! 💀");
          spawnDrop(npc.group.position.clone());
          setTimeout(()=>{
            let rx=0,rz=0;
            if(cfg.id==="hunza"){rx=(Math.random()-0.5)*160;rz=(Math.random()-0.5)*160;rx=Math.max(-80,Math.min(80,rx));}
            else{const ra=Math.random()*Math.PI*2,rd=35+Math.random()*80;rx=Math.cos(ra)*rd;rz=Math.sin(ra)*rd;}
            npc.group.position.set(rx,getH(rx,rz)+0.12,rz);
            npc.waypoints=makeWaypoints(rx,rz);npc.wpIdx=0;npc.hp=npc.maxHp;
            npc.state="patrol";npc.group.visible=true;
            (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(npcShirt);
          },7000);
        }else{npc.state="chase";npc.alertTimer=12;}
        void label;
      }
    }

    // ── Keyboard input (desktop) ───────────────────────────────────────────
    const onKeyDown=(e:KeyboardEvent)=>{
      keysRef.current[e.code]=true;
      if(e.code==="KeyP"){const c:{[k:string]:"clear"|"rain"|"storm"}={clear:"rain",rain:"storm",storm:"clear"};
        const w=c[weatherRef.current];weatherRef.current=w;setWeather(w);rainMesh.visible=w!=="clear";flash(`Weather: ${w.toUpperCase()}`);}
      if(e.code==="KeyF"){
        const car=carRef.current;if(!car)return;
        if(inCarRef.current){inCarRef.current=false;setInCar(false);car.inUse=false;flash("Exited vehicle");}
        else if(camera.position.distanceTo(car.group.position)<4.5){inCarRef.current=true;setInCar(true);car.inUse=true;flash("Driving! WASD · F to exit");}
      }
      if(e.code==="KeyG")throwGrenade();
      if(e.code==="Digit1"){weaponRef.current="pistol";setWeapon("pistol");ammoRef.current=Math.min(ammoRef.current,WEAPON_CFG.pistol.maxAmmo);setAmmo(ammoRef.current);flash("Pistol");}
      if(e.code==="Digit2"){weaponRef.current="ak47";setWeapon("ak47");flash("AK-47");}
      if(e.code==="Digit3"){weaponRef.current="shotgun";setWeapon("shotgun");ammoRef.current=Math.min(ammoRef.current,WEAPON_CFG.shotgun.maxAmmo);setAmmo(ammoRef.current);flash("Shotgun");}
      if(e.code==="Digit4"){weaponRef.current="sniper";setWeapon("sniper");ammoRef.current=Math.min(ammoRef.current,WEAPON_CFG.sniper.maxAmmo);setAmmo(ammoRef.current);flash("Sniper");}
      if(e.code==="KeyR"){
        const maxA=WEAPON_CFG[weaponRef.current].maxAmmo;
        ammoRef.current=maxA;setAmmo(maxA);flash(`Reloaded ${WEAPON_CFG[weaponRef.current].label} ✓`);
      }
    };
    const onKeyUp=(e:KeyboardEvent)=>{keysRef.current[e.code]=false;};
    const onClick=()=>{
      if(isMobileLocal)return;
      if(!controls.isLocked)controls.lock(); // shoot() hata diya — ab ye driving game hai, shooter nahi
    };
    document.addEventListener("keydown",onKeyDown);document.addEventListener("keyup",onKeyUp);
    renderer.domElement.addEventListener("click",onClick);

    // ── Touch input (mobile) ───────────────────────────────────────────────
    const onTouchStart=(e:TouchEvent)=>{
      if(!playingRef.current){playingRef.current=true;setPlaying(true);}
      for(const t of Array.from(e.changedTouches)){
        const leftSide=t.clientX<window.innerWidth*0.44;
        if(leftSide&&jsTouchId.current===-1){
          jsTouchId.current=t.identifier;jsBaseX.current=t.clientX;jsBaseY.current=t.clientY;
          jsDx.current=0;jsDy.current=0;
          if(jsKnobRef.current)jsKnobRef.current.style.transform="translate(-50%,-50%)";
        }else if(!leftSide&&lookTouchId.current===-1){
          lookTouchId.current=t.identifier;lookLastX.current=t.clientX;lookLastY.current=t.clientY;
        }
      }
    };
    const onTouchMove=(e:TouchEvent)=>{
      e.preventDefault();
      for(const t of Array.from(e.changedTouches)){
        if(t.identifier===jsTouchId.current){
          const dx=t.clientX-jsBaseX.current,dy=t.clientY-jsBaseY.current;
          const d=Math.sqrt(dx*dx+dy*dy),maxR=52;
          const cx=d>maxR?(dx/d)*maxR:dx,cy=d>maxR?(dy/d)*maxR:dy;
          jsDx.current=cx;jsDy.current=cy;
          if(jsKnobRef.current)jsKnobRef.current.style.transform=`translate(calc(-50% + ${cx}px),calc(-50% + ${cy}px))`;
        }else if(t.identifier===lookTouchId.current){
          const dx=t.clientX-lookLastX.current,dy=t.clientY-lookLastY.current;
          mEulerY.current-=dx*0.004;mEulerX.current-=dy*0.004;
          mEulerX.current=Math.max(-Math.PI/2*0.88,Math.min(Math.PI/2*0.88,mEulerX.current));
          camera.quaternion.setFromEuler(new THREE.Euler(mEulerX.current,mEulerY.current,0,"YXZ"));
          lookLastX.current=t.clientX;lookLastY.current=t.clientY;
        }
      }
    };
    const onTouchEnd=(e:TouchEvent)=>{
      for(const t of Array.from(e.changedTouches)){
        if(t.identifier===jsTouchId.current){jsTouchId.current=-1;jsDx.current=0;jsDy.current=0;
          if(jsKnobRef.current)jsKnobRef.current.style.transform="translate(-50%,-50%)";}
        else if(t.identifier===lookTouchId.current){lookTouchId.current=-1;}
      }
    };
    if(isMobileLocal){
      container.addEventListener("touchstart",onTouchStart,{passive:false});
      container.addEventListener("touchmove",onTouchMove,{passive:false});
      container.addEventListener("touchend",onTouchEnd,{passive:false});
    }

    // ── Game loop ──────────────────────────────────────────────────────────
    const clock=new THREE.Clock();const playerBox=new THREE.Box3();
    let dayTime=0.28;let weatherTimer=40;let dmgTimer=0;let thunderTimer=0;
    let waterTime=0;let animId:number;let zoneDmgTimer=0;let speedHudAccum=0;

    function animate(){
      animId=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),0.05);

      // Pet companion — player ke peeche follow karta hai, chal/udd ke animate hota hai
      if(petGroup){
        petBobT+=dt;
        const targetX=camera.position.x-1.4,targetZ=camera.position.z-1.4;
        petGroup.position.x+=(targetX-petGroup.position.x)*Math.min(1,dt*3);
        petGroup.position.z+=(targetZ-petGroup.position.z)*Math.min(1,dt*3);
        const groundY=getH(petGroup.position.x,petGroup.position.z);
        if(petGroup.userData.kind==="bird"){
          petGroup.position.y=groundY+1.3+Math.sin(petBobT*3)*0.15;
          const wings=petGroup.userData.wings as THREE.Mesh[]|undefined;
          if(wings)wings.forEach((w,i)=>{w.rotation.z=Math.sin(petBobT*10)*0.5*(i===0?1:-1);});
        }else{
          petGroup.position.y=groundY+0.02+Math.abs(Math.sin(petBobT*6))*0.04;
          const legs=petGroup.userData.legs as THREE.Mesh[]|undefined;
          if(legs)legs.forEach((l,i)=>{l.rotation.x=Math.sin(petBobT*6+i*Math.PI/2)*0.3;});
        }
        const dx=camera.position.x-petGroup.position.x,dz=camera.position.z-petGroup.position.z;
        if(Math.abs(dx)+Math.abs(dz)>0.05)petGroup.rotation.y=Math.atan2(dx,dz);
      }

      // Day/Night
      dayTime=(dayTime+DAY_SPEED)%1;
      const sky=sampleSky(dayTime,cfg.skyDay);
      renderer.setClearColor(sky.color);ambient.intensity=sky.ambient;sun.intensity=sky.sun;
      moon.intensity=(dayTime>0.82||dayTime<0.18)?0.2:0;hemi.intensity=sky.ambient*0.5;
      sun.position.set(Math.cos(dayTime*Math.PI*2)*280,Math.sin(dayTime*Math.PI*2)*220,80);
      const fogD=weatherRef.current==="storm"?cfg.fogDensity*4:weatherRef.current==="rain"?cfg.fogDensity*2:(dayTime>0.82||dayTime<0.18)?cfg.fogDensity*1.5:cfg.fogDensity;
      scene.fog=new THREE.FogExp2(sky.color.getHex(),fogD);
      const hr=Math.floor(dayTime*24);setTimeLabel(hr<5?"Night":hr<8?"Dawn":hr<17?"Day":hr<20?"Sunset":"Night");

      // Weather
      weatherTimer-=dt;if(weatherTimer<=0){weatherTimer=30+Math.random()*50;
        const opts:("clear"|"rain"|"storm")[]=["clear","clear","rain","storm"];
        const w=opts[Math.floor(Math.random()*opts.length)];weatherRef.current=w;setWeather(w);rainMesh.visible=w!=="clear";}
      if(weatherRef.current==="storm"){thunderTimer-=dt;if(thunderTimer<=0){thunderTimer=5+Math.random()*9;
        setThunderFlash(1);ambient.intensity=3;
        setTimeout(()=>{ambient.intensity=sky.ambient;setThunderFlash(0);},110);
        setTimeout(()=>{ambient.intensity=3;setThunderFlash(0.6);setTimeout(()=>{ambient.intensity=sky.ambient;setThunderFlash(0);},80);},200);}}

      // Rain
      if(rainMesh.visible){const spd=weatherRef.current==="storm"?32:18;
        const ra=rainMesh.geometry.attributes.position.array as Float32Array;
        for(let i=0;i<RAIN_COUNT;i++){ra[i*3+1]-=spd*dt;if(ra[i*3+1]<-2){
          ra[i*3]=camera.position.x+(Math.random()-0.5)*140;ra[i*3+1]=camera.position.y+55+Math.random()*22;ra[i*3+2]=camera.position.z+(Math.random()-0.5)*140;}}
        rainMesh.geometry.attributes.position.needsUpdate=true;}

      // Water animation
      if(waterMeshRef){waterTime+=dt;waterMeshRef.position.y=-0.5+Math.sin(waterTime*0.55)*0.38;}

      // Pickups
      for(const p of ammoPickRef.current){
        if(!p.active){if(p.respawnTimer>0){p.respawnTimer-=dt;if(p.respawnTimer<=0){p.active=true;(p.mesh as THREE.Mesh).visible=true;}}continue;}
        p.mesh.rotation.y+=dt*1.8;
        if(camera.position.distanceTo((p.mesh as THREE.Mesh).position)<2.5){
          p.active=false;(p.mesh as THREE.Mesh).visible=false;p.respawnTimer=25;
          ammoRef.current=Math.min(30,ammoRef.current+10);setAmmo(ammoRef.current);flash("+10 Ammo 🔫");}
      }
      for(const p of hpPickRef.current){
        if(!p.active){if(p.respawnTimer>0){p.respawnTimer-=dt;if(p.respawnTimer<=0){p.active=true;(p.mesh as THREE.Group).visible=true;}}continue;}
        p.mesh.rotation.y+=dt*1.2;
        const mp=(p.mesh as THREE.Group).position;
        if(hpRef.current<100&&camera.position.distanceTo(mp)<2.8){
          p.active=false;(p.mesh as THREE.Group).visible=false;p.respawnTimer=30;
          hpRef.current=Math.min(100,hpRef.current+35);setHp(hpRef.current);flash("+35 HP 💊");}
      }

      // ── Safe zone shrink & damage ────────────────────────────────────────
      zoneShrinkTimerRef.current-=dt;
      if(zoneShrinkTimerRef.current<=0&&zoneRadiusRef.current>30){
        zoneShrinkTimerRef.current=50;
        zoneTargetRef.current=Math.max(30,zoneTargetRef.current-55);
        flash("⚠️ Zone shrinking!");
      }
      if(zoneRadiusRef.current>zoneTargetRef.current){
        zoneRadiusRef.current=Math.max(zoneTargetRef.current,zoneRadiusRef.current-8*dt);
        setZoneRadius(Math.round(zoneRadiusRef.current));
        (zoneRingGeo as THREE.TorusGeometry).dispose();
        const newGeo=new THREE.TorusGeometry(zoneRadiusRef.current,1.5,8,80);
        zoneRing.geometry=newGeo;
        const wScale=zoneRadiusRef.current/260;
        zoneWall.geometry=new THREE.CylinderGeometry(zoneRadiusRef.current,zoneRadiusRef.current,80,80,1,true);
        void wScale;
      }
      // Zone shrink/damage disabled — driving game hai, battle royale nahi
      const isOutside=false;
      if(false){zoneDmgTimer+=dt;if(zoneDmgTimer>=1.2){zoneDmgTimer=0;
        const zoneDmg=2+Math.floor((0)*0.08);
        if(shieldRef.current>0){const absorbed=Math.min(shieldRef.current,zoneDmg);shieldRef.current=Math.max(0,shieldRef.current-absorbed);setShield(shieldRef.current);const rem=zoneDmg-absorbed;if(rem>0){hpRef.current=Math.max(0,hpRef.current-rem);setHp(hpRef.current);}}
        else{hpRef.current=Math.max(0,hpRef.current-zoneDmg);setHp(hpRef.current);}
      }}else{zoneDmgTimer=0;}

      // ── Grenade physics ──────────────────────────────────────────────────
      for(const g of activeGrnadesRef.current){
        if(!g.alive)continue;
        g.timer-=dt;
        g.vel.y+=GRAVITY*dt*0.7;
        g.mesh.position.addScaledVector(g.vel,dt);
        const groundY=getH(g.mesh.position.x,g.mesh.position.z)+0.22;
        if(g.mesh.position.y<groundY){g.mesh.position.y=groundY;g.vel.y*=-0.35;g.vel.x*=0.8;g.vel.z*=0.8;}
        if(g.timer<=0&&!g.exploded){
          g.exploded=true;g.alive=false;scene.remove(g.mesh);
          setExplFlash(true);setTimeout(()=>setExplFlash(false),220);
          const exPos=g.mesh.position.clone();
          for(const npc of npcsRef.current){
            if(npc.state==="dead")continue;
            const d=npc.group.position.distanceTo(exPos);
            if(d<9){const dmg=Math.round((9-d)/9*120*(0.8+Math.random()*0.4));npc.hp-=dmg;
              if(npc.hp<=0){npc.state="dead";npc.group.visible=false;
                killsRef.current+=1;setKills(killsRef.current);spawnDrop(npc.group.position.clone());}}
          }
          const selfD=camera.position.distanceTo(exPos);
          if(selfD<9){const sd=Math.round((9-selfD)/9*55);hpRef.current=Math.max(0,hpRef.current-sd);setHp(hpRef.current);}
          flash("💥 BOOM!");
        }
      }
      activeGrnadesRef.current=activeGrnadesRef.current.filter(g=>g.alive||!g.exploded);

      // ── Mobile grenade trigger ───────────────────────────────────────────
      if(mGrenadeRef.current){mGrenadeRef.current=false;throwGrenade();}

      // ── Weapon pickups ───────────────────────────────────────────────────
      for(const p of weaponPickRef.current){
        if(!p.active){p.respawnTimer-=dt;if(p.respawnTimer<=0){p.active=true;p.mesh.visible=true;}continue;}
        p.mesh.rotation.y+=dt*1.4;p.mesh.position.y+=Math.sin(Date.now()*0.003)*0.0012;
        if(camera.position.distanceTo(p.mesh.position)<2.4){
          p.active=false;p.mesh.visible=false;p.respawnTimer=35;
          weaponRef.current=p.type;setWeapon(p.type);
          ammoRef.current=WEAPON_CFG[p.type].maxAmmo;setAmmo(ammoRef.current);
          flash(`Picked up ${WEAPON_CFG[p.type].label}! [${p.type==="pistol"?"1":p.type==="ak47"?"2":p.type==="shotgun"?"3":"4"}]`);
        }
      }
      // ── Armor pickups ────────────────────────────────────────────────────
      for(const p of armorPickRef.current){
        if(!p.active){p.respawnTimer-=dt;if(p.respawnTimer<=0){p.active=true;(p.mesh as THREE.Group).visible=true;}continue;}
        p.mesh.rotation.y+=dt*1.0;
        const aPos=(p.mesh as THREE.Group).position;
        if(shieldRef.current<75&&camera.position.distanceTo(aPos)<2.8){
          p.active=false;(p.mesh as THREE.Group).visible=false;p.respawnTimer=45;
          shieldRef.current=Math.min(75,shieldRef.current+35);setShield(shieldRef.current);flash("+35 Armor 🛡");
        }
      }

      // ── NPC health bars (project to screen) ─────────────────────────────
      const bars:{id:number;x:number;y:number;hp:number;maxHp:number}[]=[];
      for(const npc of npcsRef.current){
        if(npc.state==="dead")continue;
        const distToNpc=npc.group.position.distanceTo(camera.position);
        if(distToNpc>28)continue;
        const barPos=npc.group.position.clone().add(new THREE.Vector3(0,2.6,0));
        const proj=barPos.project(camera);
        if(proj.z<0||proj.z>1)continue;
        bars.push({id:npc.id,x:(proj.x*0.5+0.5)*100,y:(1-(proj.y*0.5+0.5))*100,hp:npc.hp,maxHp:npc.maxHp});
      }
      setNpcBars(bars);

      // ── Shield absorbs damage ────────────────────────────────────────────
      // (NPC attack and zone damage already call setHp; we patch it via shield here - shield updates happen in pickup)

      // Combo
      if(comboT.current>0){comboT.current-=dt;if(comboT.current<=0){comboRef.current=0;setCombo(0);}}

      // Near car check
      const car=carRef.current;
      setNearCar(!inCarRef.current&&car!=null&&camera.position.distanceTo(car.group.position)<4.5);

      // ── Car physics ──────────────────────────────────────────────────────
      const K=keysRef.current;
      if(car&&inCarRef.current){
        let throttle=(K["KeyW"]||K["ArrowUp"]?1:0)-(K["KeyS"]||K["ArrowDown"]?0.7:0);
        let steerInput=(K["KeyA"]||K["ArrowLeft"]?1:0)-(K["KeyD"]||K["ArrowRight"]?1:0);
        if(isMobileLocal){
          // Mobile: wahi left joystick ab driving steering-wheel + gas/brake ki tarah kaam karta hai
          const jx=jsDx.current/52,jz=jsDy.current/52;
          if(Math.abs(jz)>0.08)throttle=-jz*(jz<0?1:0.7);
          if(Math.abs(jx)>0.08)steerInput=-jx;
        }
        const speed=Math.abs(car.vel);
        car.vel+=throttle*(vehiclePhysics.accelForce-speed*0.18)*dt;
        if(K["Space"]) car.vel*=vehiclePhysics.brakeForce;
        car.vel*=weatherRef.current==="storm"?vehiclePhysics.massDrag-0.007:weatherRef.current==="rain"?vehiclePhysics.massDrag-0.002:vehiclePhysics.massDrag;
        car.vel=Math.max(-vehiclePhysics.maxFwd*0.35,Math.min(vehiclePhysics.maxFwd,car.vel));
        car.steer += (steerInput-car.steer)*Math.min(1,dt*5.5);
        const steerRate=(vehiclePhysics.turnRate-(Math.min(24,Math.abs(car.vel))*0.07))*dt;
        car.heading += car.steer*steerRate*(car.vel>=0?1:-1);
        const slip=vehiclePhysics.gripSlip+Math.min(0.12,Math.abs(car.vel)*0.004);
        car.group.position.x+=Math.sin(car.heading)*car.vel*dt*slip;
        car.group.position.z+=Math.cos(car.heading)*car.vel*dt*slip;
        car.group.position.x=Math.max(-265,Math.min(265,car.group.position.x));
        car.group.position.z=Math.max(-265,Math.min(265,car.group.position.z));
        const groundY=getH(car.group.position.x,car.group.position.z);
        car.group.position.y=groundY+0.32+Math.sin(Date.now()*0.01+car.vel*0.08)*0.03;
        car.group.rotation.y=car.heading;
        car.group.rotation.z=-car.steer*0.05;
        car.group.rotation.x=Math.sin(car.vel*0.02)*0.01;
        camera.position.set(car.group.position.x,car.group.position.y+3.15,car.group.position.z);
        speedHudAccum+=dt;
        if(speedHudAccum>0.12){speedHudAccum=0;setCarSpeedKmh(Math.round(Math.abs(car.vel)*11.5));}
      }else if(inCarRef.current===false){
        speedHudAccum=0;
      }

      // ── Mobile car trigger ───────────────────────────────────────────────
      if(mCarTrigger.current){mCarTrigger.current=false;
        if(car){if(inCarRef.current){inCarRef.current=false;setInCar(false);car.inUse=false;flash("Exited vehicle");}
          else if(camera.position.distanceTo(car.group.position)<4.5){inCarRef.current=true;setInCar(true);car.inUse=true;flash("Driving! F/button to exit");}}}

      // ── Player on foot ───────────────────────────────────────────────────
      const isDesktopActive=!isMobileLocal&&controls.isLocked;
      const isMobileActive=isMobileLocal&&playingRef.current;

      if(!inCarRef.current&&(isDesktopActive||isMobileActive)){
        let fx=0,fz=0;let sprint=false;

        if(isMobileLocal){
          const jx=jsDx.current/52,jz=jsDy.current/52;
          if(Math.abs(jx)>0.08||Math.abs(jz)>0.08){fx=jx;fz=jz;}
          sprint=mSprintToggle.current;
          // Jump
          if(mJump.current&&onGnd.current){velYRef.current=JUMP_VEL;onGnd.current=false;setIsOnGround(false);}
          mJump.current=false;
          // Shoot
          if(mShoot.current){mShoot.current=false;shoot();}
        }else{
          sprint=K["ShiftLeft"]||K["ShiftRight"];
          if(K["KeyW"]||K["ArrowUp"])   fz=-1;if(K["KeyS"]||K["ArrowDown"]) fz+=1;
          if(K["KeyA"]||K["ArrowLeft"]) fx=-1;if(K["KeyD"]||K["ArrowRight"]) fx+=1;
          // Jump
          if((K["Space"]||K["KeyE"])&&onGnd.current){velYRef.current=JUMP_VEL;onGnd.current=false;setIsOnGround(false);}
        }

        // Stamina
        if(sprint&&(Math.abs(fx)>0.1||Math.abs(fz)>0.1))stamRef.current=Math.max(0,stamRef.current-30*dt);
        else stamRef.current=Math.min(100,stamRef.current+18*dt);
        setStamina(Math.round(stamRef.current));

        const spd=(sprint&&stamRef.current>5)?BASE_SPD*SPRINT_M:BASE_SPD;
        if(fx!==0||fz!==0){const len=Math.sqrt(fx*fx+fz*fz);
          controls.moveRight((fx/len)*spd*dt);controls.moveForward((-fz/len)*spd*dt);}

        // Gravity
        velYRef.current+=GRAVITY*dt;camera.position.y+=velYRef.current*dt;
        const gy=getH(camera.position.x,camera.position.z)+1.9;
        if(camera.position.y<=gy){camera.position.y=gy;velYRef.current=0;
          if(!onGnd.current){onGnd.current=true;setIsOnGround(true);}}
        camera.position.x=Math.max(-265,Math.min(265,camera.position.x));
        camera.position.z=Math.max(-265,Math.min(265,camera.position.z));

        // Building collision
        playerBox.setFromCenterAndSize(camera.position,new THREE.Vector3(1.2,2,1.2));
        for(const box of bldBoxes){if(playerBox.intersectsBox(box)){
          const c=new THREE.Vector3();box.getCenter(c);
          camera.position.add(camera.position.clone().sub(c).setY(0).normalize().multiplyScalar(0.6));}}

        // NPC melee
        dmgTimer+=dt;if(dmgTimer>=2.5){dmgTimer=0;
          for(const npc of npcsRef.current){if(npc.state==="dead")continue;
            if(npc.group.position.distanceTo(camera.position)<ATK_RANGE){
              const rawDmg=8;
              if(shieldRef.current>0){const abs=Math.min(shieldRef.current,rawDmg);shieldRef.current=Math.max(0,shieldRef.current-abs);setShield(shieldRef.current);const rem=rawDmg-abs;if(rem>0){hpRef.current=Math.max(0,hpRef.current-rem);setHp(hpRef.current);}}
              else{hpRef.current=Math.max(0,hpRef.current-rawDmg);setHp(hpRef.current);}}}}
      }

      // NPC AI
      const playerPos=inCarRef.current&&car?car.group.position.clone():camera.position.clone();
      for(const npc of npcsRef.current){
        if(npc.state==="dead")continue;
        const toP=playerPos.clone().sub(npc.group.position).setY(0);const dist=toP.length();
        npc.changeT-=dt;npc.attackCooldown=Math.max(0,npc.attackCooldown-dt);
        if(npc.alertTimer>0)npc.alertTimer-=dt;
        switch(npc.state){
          case"patrol":{if(dist<DET_RANGE){npc.state="investigate";npc.alertTimer=3;break;}
            const wp=npc.waypoints[npc.wpIdx];const toWp=wp.clone().sub(npc.group.position).setY(0);
            if(toWp.length()<2){npc.wpIdx=(npc.wpIdx+1)%npc.waypoints.length;break;}
            toWp.normalize();npc.group.position.addScaledVector(toWp,npc.speed*dt);npc.dir.copy(toWp);break;}
          case"investigate":{if(dist<DET_RANGE*0.6){npc.state="chase";npc.alertTimer=15;break;}
            if(npc.alertTimer<=0){npc.state="patrol";break;}
            toP.normalize();npc.group.position.addScaledVector(toP,npc.speed*0.6*dt);npc.dir.copy(toP);break;}
          case"chase":{if(dist>DET_RANGE*1.5&&npc.alertTimer<=0){npc.state="patrol";break;}
            if(dist<=ATK_RANGE+1){npc.state="attack";break;}
            toP.normalize();npc.group.position.addScaledVector(toP,npc.speed*2*dt);npc.dir.copy(toP);break;}
          case"attack":{if(dist>ATK_RANGE+3){npc.state="chase";npc.alertTimer=10;break;}
            if(npc.attackCooldown<=0){npc.attackCooldown=2.2+Math.random()*1.5;
              (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff8800);
              setTimeout(()=>{if(npc.state!=="dead")(npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(npcShirt);},120);
              if(Math.random()<0.42){hpRef.current=Math.max(0,hpRef.current-(10+Math.floor(Math.random()*10)));setHp(hpRef.current);}}
            break;}
        }
        const nx=npc.group.position.x,nz=npc.group.position.z;
        npc.group.position.set(Math.max(-240,Math.min(240,nx)),getH(nx,nz)+0.12,Math.max(-240,Math.min(240,nz)));
        // Animate walking legs
        if(npc.state!=="dead"&&npc.state!=="attack"){
          const swing=Math.sin(Date.now()*0.006)*0.28;
          if(npc.group.children[5])npc.group.children[5].rotation.x=swing;  // lLeg
          if(npc.group.children[6])npc.group.children[6].rotation.x=-swing; // rLeg
          if(npc.group.children[9])npc.group.children[9].rotation.z=0.25+swing*0.4;  // lArm
          if(npc.group.children[10])npc.group.children[10].rotation.z=-0.25-swing*0.4; // rArm
        }
        if(npc.dir.length()>0.01)npc.group.rotation.y=Math.atan2(npc.dir.x,npc.dir.z);
      }

      setMiniDots(npcsRef.current.filter(n=>n.state!=="dead").map(n=>({
        x:(n.group.position.x-camera.position.x)/5,z:(n.group.position.z-camera.position.z)/5,state:n.state})));
      renderer.render(scene,camera);
    }
    animate();

    const onResize=()=>{camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);};
    window.addEventListener("resize",onResize);

    return()=>{
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown",onKeyDown);document.removeEventListener("keyup",onKeyUp);
      renderer.domElement.removeEventListener("click",onClick);window.removeEventListener("resize",onResize);
      if(isMobileLocal){container.removeEventListener("touchstart",onTouchStart);
        container.removeEventListener("touchmove",onTouchMove);container.removeEventListener("touchend",onTouchEnd);}
      controls.dispose();renderer.dispose();
      if(container.contains(renderer.domElement))container.removeChild(renderer.domElement);
      npcsRef.current=[];ammoPickRef.current=[];hpPickRef.current=[];armorPickRef.current=[];
      weaponPickRef.current=[];activeGrnadesRef.current=[];carRef.current=null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedMap,flash,showHit,showMuzzle]);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const isActive=isMobile?playing:locked;
  const timeColor=timeLabel==="Night"?"text-blue-200":timeLabel==="Dawn"?"text-orange-300":timeLabel==="Sunset"?"text-red-300":"text-yellow-200";
  const weatherIcon=weather==="storm"?"⛈":weather==="rain"?"🌧":"☀️";
  const hpGrad=hp>60?"from-green-600 to-green-400":hp>30?"from-yellow-600 to-yellow-400":"from-red-700 to-red-400";
  const stGrad=stamina>50?"from-sky-600 to-sky-400":stamina>25?"from-amber-500 to-amber-300":"from-orange-600 to-orange-400";

  // ── Map select screen ─────────────────────────────────────────────────────
  if(!selectedMap)return(
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans select-none">
      <div className="absolute inset-0 opacity-7" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
      <div className="relative z-10 w-full max-w-4xl px-4 text-center">
        <div className="text-5xl mb-2">🌍</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-amber-400 mb-1 drop-shadow-[0_0_24px_rgba(244,180,26,0.4)]">Ranjha World</h1>
        <p className="text-white/40 font-display uppercase tracking-widest text-xs sm:text-sm mb-6">{isMobile?"Touch to select battlefield":"Select your battlefield"}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {MAPS.map(m=>(
            <button key={m.id} onClick={()=>setSelectedMap(m)}
              className="group relative rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-amber-500/50 text-left transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
              {/* AI-generated map preview image */}
              <div className="relative w-full h-32 overflow-hidden">
                <img
                  src={`/map-${m.id}.png`}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                <div className="absolute bottom-2 left-3 text-2xl drop-shadow-lg">{m.emoji}</div>
                <div className="absolute bottom-2 right-3">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-amber-500/80 text-black font-bold">{m.biome}</span>
                </div>
              </div>
              <div className="p-3">
                <div className="font-display text-base font-bold text-white uppercase tracking-wider mb-0.5">{m.name}</div>
                <div className="text-white/40 text-xs leading-relaxed">{m.desc}</div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-blue-500/12 border border-blue-500/25 text-blue-300">{isMobile?"Touch Controls":"Car • Loot • AI"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={()=>setLocation("/lobby")} className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 font-display uppercase tracking-widest text-xs transition-colors">← Lobby</button>
      </div>
    </div>
  );

  // ── Game screen ───────────────────────────────────────────────────────────
  return(
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
      {/* Canvas mount */}
      <div ref={mountRef} className="absolute inset-0"/>

      {/* Landscape warning (mobile portrait) */}
      {isMobile&&(
        <div className="landscape:hidden absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-4">
          <div className="text-6xl">📱</div>
          <p className="font-display text-white text-lg uppercase tracking-widest">Rotate to Landscape</p>
          <p className="text-white/40 text-sm font-display">Game requires landscape mode</p>
        </div>
      )}

      {/* Thunder flash */}
      {thunderFlash>0&&<div className="absolute inset-0 z-30 pointer-events-none" style={{background:`rgba(220,235,255,${thunderFlash*0.55})`}}/>}

      {/* Muzzle flash */}
      {muzzleFlash&&<div className="absolute inset-0 z-20 pointer-events-none" style={{background:"rgba(255,220,100,0.11)"}}/>}

      {/* Explosion flash */}
      {explFlash&&<div className="absolute inset-0 z-25 pointer-events-none" style={{background:"rgba(255,140,20,0.35)"}}/>}

      {/* Zone outside warning */}
      {outsideZone&&isActive&&hp>0&&<div className="absolute inset-0 z-10 pointer-events-none animate-pulse" style={{boxShadow:"inset 0 0 120px rgba(30,100,255,0.55)"}}/>}

      {/* ── Desktop lock overlay ─────────────────────────────────────────── */}
      {!isMobile&&!locked&&hp>0&&(
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/78 backdrop-blur-sm cursor-pointer"
          onClick={()=>mountRef.current?.querySelector("canvas")?.requestPointerLock()}>
          <div className="text-center space-y-4 px-8 max-w-xs">
            <div className="text-5xl">{selectedMap.emoji}</div>
            <h1 className="font-display text-4xl font-bold text-amber-400">{selectedMap.name}</h1>
            <p className="text-white/65 font-display uppercase tracking-widest text-sm">Click to Enter</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs text-white/40 font-display text-left">
              <p>WASD — Move</p><p>Mouse — Look</p>
              <p>Click — Shoot</p><p>R — Reload</p>
              <p>Shift — Sprint</p><p>Space — Jump</p>
              <p>F — Car</p><p>G — Grenade</p>
              <p>1-4 — Weapons</p><p>P — Weather</p>
            </div>
            <button onClick={e=>{e.stopPropagation();setSelectedMap(null);}}
              className="px-4 py-2 bg-white/7 border border-white/10 rounded-lg text-white/40 font-display uppercase tracking-widest text-xs">← Change Map</button>
          </div>
        </div>
      )}

      {/* ── Mobile "tap to play" overlay ────────────────────────────────── */}
      {isMobile&&!playing&&hp>0&&(
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          onTouchStart={()=>{playingRef.current=true;setPlaying(true);}}>
          <div className="text-center space-y-3 px-8 max-w-xs">
            <div className="text-5xl">{selectedMap.emoji}</div>
            <h1 className="font-display text-3xl font-bold text-amber-400">{selectedMap.name}</h1>
            <p className="text-white/65 font-display uppercase tracking-widest text-sm">Tap to Enter</p>
            <div className="text-white/35 text-xs font-display space-y-0.5">
              <p>🕹 Left side — Move joystick</p>
              <p>👀 Right side — Look / rotate</p>
              <p>🔫 Shoot button — Fire</p>
              <p>⬆️ Jump · 🚗 Car · R Reload</p>
            </div>
            <button onTouchStart={e=>{e.stopPropagation();setSelectedMap(null);}}
              className="px-4 py-2 bg-white/7 border border-white/10 rounded-lg text-white/40 font-display uppercase tracking-widest text-xs mt-2">← Change Map</button>
          </div>
        </div>
      )}

      {/* Crosshair (desktop only) */}
      {!isMobile&&locked&&hp>0&&!inCar&&(
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {hitMarker?<div className="w-10 h-10 flex items-center justify-center text-red-400 text-2xl font-bold">✕</div>:(
            <div className="relative w-9 h-9">
              <div className="absolute top-1/2 left-0 w-full h-px bg-amber-400 opacity-80"/>
              <div className="absolute left-1/2 top-0 h-full w-px bg-amber-400 opacity-80"/>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-amber-400 opacity-80"/>
            </div>)}
        </div>
      )}
      {/* Mobile crosshair dot */}
      {isMobile&&playing&&hp>0&&!inCar&&(
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className={`w-4 h-4 rounded-full border-2 ${hitMarker?"border-red-400 bg-red-400/30":"border-amber-400/70"}`}/>
        </div>
      )}

      {/* Floating damage numbers */}
      {dmgNums.map(d=>(
        <div key={d.id} className={`absolute z-40 pointer-events-none font-display font-bold drop-shadow text-base ${d.v>100?"text-yellow-300 text-xl":"text-red-400"}`}
          style={{left:`${d.x}%`,top:`${d.y}%`,transform:"translate(-50%,-100%)"}}>-{d.v>100?`${d.v}💀`:d.v}</div>
      ))}

      {/* NPC floating health bars */}
      {npcBars.map(b=>(
        <div key={b.id} className="absolute z-30 pointer-events-none" style={{left:`${b.x}%`,top:`${b.y}%`,transform:"translate(-50%,-50%)"}}>
          <div className="w-20 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/20">
            <div className="h-full rounded-full transition-all duration-100"
              style={{width:`${(b.hp/b.maxHp)*100}%`,background:b.hp/b.maxHp>0.5?"#22c55e":b.hp/b.maxHp>0.25?"#eab308":"#ef4444"}}/>
          </div>
          <div className="text-center text-[8px] font-display text-white/60 mt-0.5">{b.hp}</div>
        </div>
      ))}

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      {isActive&&hp>0&&(
        <>
          {/* Minimap */}
          <div className="absolute top-3 left-3 z-20" style={{width:isMobile?120:148,height:isMobile?120:148}}>
            <div className="relative w-full h-full rounded-xl bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.18) 1px,transparent 1px)",backgroundSize:"18px 18px"}}/>
              {/* Zone ring on minimap */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400/70 pointer-events-none z-5"
                style={{width:`${Math.min(98,(zoneRadius/260)*98)}%`,height:`${Math.min(98,(zoneRadius/260)*98)}%`}}/>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-300/50 z-10"/>
              {hpPickRef.current.filter(p=>p.active).slice(0,6).map((p,i)=>{
                const mp=(p.mesh as THREE.Group).position;const cx=50+mp.x/5;const cy=50+mp.z/5;
                if(cx<2||cx>98||cy<2||cy>98)return null;
                return<div key={i} className="absolute w-2 h-2 rounded-sm bg-green-400 -translate-x-1/2 -translate-y-1/2" style={{left:`${cx}%`,top:`${cy}%`}}/>;
              })}
              {miniDots.map((d,i)=>{const cx=50+d.x,cy=50+d.z;if(cx<2||cx>98||cy<2||cy>98)return null;
                const col=d.state==="attack"?"bg-orange-500 animate-ping":d.state==="chase"?"bg-orange-400 animate-pulse":d.state==="investigate"?"bg-yellow-400":"bg-red-500";
                return<div key={i} className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${col}`} style={{left:`${cx}%`,top:`${cy}%`}}/>;
              })}
              <div className="absolute bottom-1 left-2 text-[8px] font-display uppercase tracking-widest text-white/38 truncate max-w-[85%]">{selectedMap.name}</div>
              <div className="absolute top-1 right-1.5 text-[7px] font-display text-white/35">⬆N</div>
            </div>
          </div>

          {/* Top centre — zone + weather */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
            <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span className="text-sm">{weatherIcon}</span>
              <span className={`font-display text-xs font-bold uppercase tracking-wider ${timeColor}`}>{timeLabel}</span>
            </div>
            {/* Zone indicator hidden — battle royale zone system disabled */}
          </div>

          {/* Combat HUD (Kills/Zone) removed — ye ab driving game hai, battle royale nahi */}

          {/* Bottom left — Driving HUD (speedometer) ya on-foot HP */}
          <div className={`absolute z-20 space-y-1.5 ${isMobile?"bottom-3 left-1/2 -translate-x-1/2 w-52":"bottom-4 left-4 w-60"}`}>
            <div className="rounded-xl bg-black/72 border border-white/10 backdrop-blur-md p-2.5 space-y-2">
              {inCar?(
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚗</span>
                  <div className="flex-1">
                    <div className="font-display text-3xl font-bold tabular-nums text-sky-300 leading-none">{carSpeedKmh}</div>
                    <div className="font-display text-[9px] uppercase tracking-widest text-white/40">km/h</div>
                  </div>
                </div>
              ):(
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-display uppercase tracking-widest text-red-400 w-7">HP</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${hpGrad} transition-all duration-300`} style={{width:`${hp}%`}}/>
                  </div>
                  <span className="font-display text-xs font-bold tabular-nums text-white/75 w-6 text-right">{hp}</span>
                </div>
              )}
            </div>
          </div>

          {/* Near car prompt */}
          {nearCar&&<div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-black/80 border border-blue-400/40 backdrop-blur-md font-display text-xs uppercase tracking-widest text-blue-300">
            {isMobile?"🚗 Tap car button":"[F] Enter Vehicle"}</div>}

          {/* Low HP vignette */}
          {hp<30&&<div className="absolute inset-0 pointer-events-none z-10 animate-pulse" style={{boxShadow:"inset 0 0 160px rgba(200,10,10,0.65)"}}/>}

          {notice&&<div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-lg bg-black/82 border border-amber-500/40 backdrop-blur-md font-display text-xs uppercase tracking-widest text-amber-300 text-center">{notice}</div>}

          {/* Legend hataya — combat states ab NPCs ke liye relevant nahi (driving game) */}
        </>
      )}

      {/* ── Mobile touch controls overlay ────────────────────────────────── */}
      {isMobile&&playing&&hp>0&&(
        <>
          {/* Left joystick base */}
          <div className="landscape:block hidden absolute bottom-20 left-8 z-30 w-32 h-32 rounded-full bg-white/8 border-2 border-white/22 pointer-events-none">
            <div ref={jsKnobRef} className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-white/28 border-2 border-white/50" style={{transform:"translate(-50%,-50%)",willChange:"transform"}}/>
          </div>

          {/* Shoot button */}
          <div className="landscape:flex hidden absolute bottom-8 right-8 z-30 w-20 h-20 rounded-full bg-red-500/55 border-2 border-red-400/70 items-center justify-center text-3xl cursor-pointer active:bg-red-400/70 touch-none"
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();mShoot.current=true;}}>🔫</div>

          {/* Jump button */}
          <div className="landscape:flex hidden absolute bottom-32 right-10 z-30 w-16 h-16 rounded-full bg-sky-500/50 border-2 border-sky-400/70 items-center justify-center text-2xl cursor-pointer active:bg-sky-400/70 touch-none"
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();mJump.current=true;}}>⬆️</div>

          {/* Reload button */}
          <div className="landscape:flex hidden absolute bottom-8 right-32 z-30 w-14 h-14 rounded-full bg-amber-500/50 border-2 border-amber-400/70 items-center justify-center text-white font-bold text-sm cursor-pointer active:bg-amber-400/70 touch-none font-display tracking-widest"
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();const ma=WEAPON_CFG[weaponRef.current].maxAmmo;ammoRef.current=ma;setAmmo(ma);flash(`Reloaded ${WEAPON_CFG[weaponRef.current].label} ✓`);}}>R</div>

          {/* Grenade button */}
          <div className="landscape:flex hidden absolute z-30 w-16 h-16 rounded-full border-2 items-center justify-center text-xl cursor-pointer touch-none"
            style={{bottom:"10rem",right:"7rem",background:grenadeCount>0?"rgba(34,197,94,0.5)":"rgba(100,100,100,0.3)",borderColor:grenadeCount>0?"rgba(134,239,172,0.7)":"rgba(150,150,150,0.4)"}}
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();mGrenadeRef.current=true;}}>
            <span>💣</span>
            {grenadeCount>0&&<span className="absolute top-0 right-0 w-5 h-5 bg-green-500 rounded-full text-[10px] font-display font-bold text-white flex items-center justify-center">{grenadeCount}</span>}
          </div>

          {/* Car button */}
          <div className="landscape:flex hidden absolute bottom-26 right-32 z-30 w-14 h-14 rounded-full bg-cyan-500/50 border-2 border-cyan-400/70 items-center justify-center text-xl cursor-pointer active:bg-cyan-400/70 touch-none"
            style={{bottom:"6.5rem"}}
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();mCarTrigger.current=true;}}>🚗</div>

          {/* Sprint toggle */}
          <div className={`landscape:flex hidden absolute bottom-32 left-8 z-30 w-14 h-14 rounded-full border-2 items-center justify-center text-xs cursor-pointer touch-none font-display uppercase tracking-widest ${sprintOn?"bg-amber-500/70 border-amber-400 text-black font-bold":"bg-white/10 border-white/25 text-white/60"}`}
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();const s=!mSprintToggle.current;mSprintToggle.current=s;setSprintOn(s);}}>
            {sprintOn?"RUN":"JOG"}</div>

          {/* Weather button */}
          <div className="landscape:flex hidden absolute top-16 right-3 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/20 items-center justify-center text-base cursor-pointer touch-none"
            onTouchStart={e=>{e.preventDefault();e.stopPropagation();
              const c:{[k:string]:"clear"|"rain"|"storm"}={clear:"rain",rain:"storm",storm:"clear"};
              const w=c[weatherRef.current];weatherRef.current=w;setWeather(w);flash(`${w.toUpperCase()}`);
            }}>{weatherIcon}</div>
        </>
      )}

      {/* Death */}
      {hp<=0&&(
        <div className="absolute inset-0 z-40 bg-red-950/88 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="text-6xl mb-3">💀</div>
          <h2 className="font-display text-5xl font-bold text-red-400 mb-1">Eliminated</h2>
          <p className="text-white/50 font-display uppercase tracking-widest text-sm">Kills: <span className="text-amber-400 font-bold">{kills}</span>{kills>=10?<span className="ml-2">🏆</span>:kills>=5?<span className="ml-2">⭐</span>:null}</p>
          <div className="flex gap-3 mt-6 flex-wrap justify-center px-4">
            <button onClick={()=>setSelectedMap(null)} className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-display uppercase tracking-widest rounded-lg text-sm">Change Map</button>
            <button onClick={()=>{hpRef.current=100;setHp(100);ammoRef.current=30;setAmmo(30);playingRef.current=true;setPlaying(true);}} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/18 text-white font-display uppercase tracking-widest rounded-lg text-sm">Respawn</button>
            <button onClick={()=>setLocation("/lobby")} className="px-4 py-2.5 bg-white/5 border border-white/8 text-white/40 font-display uppercase tracking-widest rounded-lg text-sm">Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}
