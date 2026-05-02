import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

// ─────────────────────────────────────────────────────────────────────────────
//  Inline PointerLockControls
// ─────────────────────────────────────────────────────────────────────────────
class PointerLockControls extends THREE.EventDispatcher {
  camera: THREE.Camera; domElement: HTMLElement; isLocked = false;
  private _euler = new THREE.Euler(0,0,0,"YXZ");
  private _PI2 = Math.PI/2;
  private _onMouse: (e:MouseEvent)=>void;
  private _onLC: ()=>void;
  constructor(cam:THREE.Camera, el:HTMLElement) {
    super(); this.camera=cam; this.domElement=el;
    this._onMouse=(e)=>{ if(!this.isLocked)return;
      this._euler.setFromQuaternion(cam.quaternion);
      this._euler.y-=(e.movementX||0)*0.002;
      this._euler.x-=(e.movementY||0)*0.002;
      this._euler.x=Math.max(-this._PI2*0.88,Math.min(this._PI2*0.88,this._euler.x));
      cam.quaternion.setFromEuler(this._euler);
    };
    this._onLC=()=>{ this.isLocked=document.pointerLockElement===el;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.dispatchEvent({type:this.isLocked?"lock":"unlock"} as any);
    };
    document.addEventListener("mousemove",this._onMouse);
    document.addEventListener("pointerlockchange",this._onLC);
  }
  lock(){ this.domElement.requestPointerLock(); }
  unlock(){ document.exitPointerLock(); }
  moveForward(d:number){ const v=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,0);
    v.crossVectors(this.camera.up,v); this.camera.position.addScaledVector(v,d); }
  moveRight(d:number){ const v=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,0);
    this.camera.position.addScaledVector(v,d); }
  dispose(){ document.removeEventListener("mousemove",this._onMouse);
    document.removeEventListener("pointerlockchange",this._onLC); }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map configs
// ─────────────────────────────────────────────────────────────────────────────
interface MapConfig {
  id:string; name:string; emoji:string; desc:string;
  skyDay:THREE.Color; fogDensity:number;
  npcColor:number; biome:string; sunColor:number; ambientHex:number;
  groundHex:number;
}
const MAPS:MapConfig[] = [
  { id:"hunza", name:"Hunza Valley", emoji:"🏔", desc:"Karakoram ranges — glaciers, sharp peaks, green valley floor",
    skyDay:new THREE.Color(0x5588bb), fogDensity:0.004, npcColor:0xe05c2a,
    biome:"mountains", sunColor:0xfff0cc, ambientHex:0x8899bb, groundHex:0x3a5a1a },
  { id:"lahore", name:"Lahore Fort", emoji:"🕌", desc:"Abandoned Mughal city — broken arches, red brick, overgrown ruins",
    skyDay:new THREE.Color(0xcc8844), fogDensity:0.006, npcColor:0xcc3311,
    biome:"ruins", sunColor:0xffcc88, ambientHex:0xaa7755, groundHex:0x8b6040 },
  { id:"multan", name:"Multan Desert", emoji:"🏜", desc:"Sandy dunes, abandoned mud structures, dusty battle royale terrain",
    skyDay:new THREE.Color(0xddaa66), fogDensity:0.008, npcColor:0xcc6622,
    biome:"desert", sunColor:0xffaa44, ambientHex:0xcc9955, groundHex:0xd4a84b },
  { id:"karachi", name:"Karachi Coast", emoji:"🌊", desc:"Ocean waves, beach, modern ruins, coastal battle royale",
    skyDay:new THREE.Color(0x88bbdd), fogDensity:0.005, npcColor:0x2266aa,
    biome:"coastal", sunColor:0xffffff, ambientHex:0x99aabb, groundHex:0xd4c090 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Sky system
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
  return{color:a.c.clone().lerp(b.c,f).lerp(tint,0.28),
    ambient:a.a+(b.a-a.a)*f, sun:a.s+(b.s-a.s)*f};
}

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
type NPCState="patrol"|"investigate"|"chase"|"attack"|"dead";
interface NPC{group:THREE.Group;bodyMesh:THREE.Mesh;hp:number;maxHp:number;
  speed:number;dir:THREE.Vector3;changeT:number;state:NPCState;id:number;
  waypoints:THREE.Vector3[];wpIdx:number;alertTimer:number;attackCooldown:number;}
interface PickupItem{mesh:THREE.Mesh|THREE.Group;active:boolean;respawnTimer:number;}
interface CarState{group:THREE.Group;vel:number;heading:number;steer:number;inUse:boolean;}

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const TSIZE=600; const TSEGS=110; const NPC_COUNT=16; const RAIN_COUNT=2000;
const DAY_SPEED=0.000055; const GRAVITY=-22; const JUMP_VEL=9;
const DET_RANGE=32; const ATK_RANGE=5; const BASE_SPD=11; const SPRINT_M=2.1;

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function World(){
  const mountRef=useRef<HTMLDivElement>(null);
  const [,setLocation]=useLocation();

  const [selectedMap,setSelectedMap]=useState<MapConfig|null>(null);
  const [locked,setLocked]   =useState(false);
  const [hp,setHp]           =useState(100);
  const [ammo,setAmmo]       =useState(30);
  const [stamina,setStamina] =useState(100);
  const [kills,setKills]     =useState(0);
  const [combo,setCombo]     =useState(0);
  const [timeLabel,setTimeLabel]=useState("Dawn");
  const [weather,setWeather] =useState<"clear"|"rain"|"storm">("clear");
  const [notice,setNotice]   =useState("");
  const [miniDots,setMiniDots]=useState<{x:number;z:number;state:NPCState}[]>([]);
  const [thunderFlash,setThunderFlash]=useState(0);
  const [hitMarker,setHitMarker]=useState(false);
  const [muzzleFlash,setMuzzleFlash]=useState(false);
  const [dmgNums,setDmgNums] =useState<{id:number;x:number;y:number;v:number}[]>([]);
  const [isOnGround,setIsOnGround]=useState(true);
  const [inCar,setInCar]     =useState(false);
  const [nearCar,setNearCar] =useState(false);

  const noticeT=useRef<ReturnType<typeof setTimeout>|null>(null);
  const hitT   =useRef<ReturnType<typeof setTimeout>|null>(null);
  const muzzT  =useRef<ReturnType<typeof setTimeout>|null>(null);
  const dmgId  =useRef(0);

  const flash=useCallback((msg:string)=>{
    setNotice(msg);
    if(noticeT.current)clearTimeout(noticeT.current);
    noticeT.current=setTimeout(()=>setNotice(""),1800);
  },[]);
  const showHit=useCallback(()=>{setHitMarker(true);if(hitT.current)clearTimeout(hitT.current);
    hitT.current=setTimeout(()=>setHitMarker(false),180);},[]);
  const showMuzzle=useCallback(()=>{setMuzzleFlash(true);if(muzzT.current)clearTimeout(muzzT.current);
    muzzT.current=setTimeout(()=>setMuzzleFlash(false),90);},[]);

  const hpRef    =useRef(100); const ammoRef  =useRef(30);
  const stamRef  =useRef(100); const killsRef =useRef(0);
  const comboRef =useRef(0);   const comboT   =useRef(0);
  const keysRef  =useRef<Record<string,boolean>>({});
  const npcsRef  =useRef<NPC[]>([]);
  const ammoPickRef=useRef<PickupItem[]>([]);
  const hpPickRef  =useRef<PickupItem[]>([]);
  const weatherRef =useRef<"clear"|"rain"|"storm">("clear");
  const canShoot =useRef(true);
  const velYRef  =useRef(0);   const onGnd    =useRef(true);
  const carRef   =useRef<CarState|null>(null);
  const inCarRef =useRef(false);

  useEffect(()=>{
    if(!selectedMap)return;
    hpRef.current=100;setHp(100);ammoRef.current=30;setAmmo(30);
    stamRef.current=100;setStamina(100);killsRef.current=0;setKills(0);
    comboRef.current=0;setCombo(0);npcsRef.current=[];
    ammoPickRef.current=[];hpPickRef.current=[];
    weatherRef.current="clear";setWeather("clear");
    velYRef.current=0;onGnd.current=true;inCarRef.current=false;setInCar(false);
  },[selectedMap]);

  useEffect(()=>{
    if(!selectedMap)return;
    const container=mountRef.current; if(!container)return;
    const cfg=selectedMap;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(container.clientWidth,container.clientHeight);
    renderer.shadowMap.enabled=true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    container.appendChild(renderer.domElement);

    const scene=new THREE.Scene();
    const farPlane=cfg.id==="hunza"?2000:900;
    const camera=new THREE.PerspectiveCamera(72,container.clientWidth/container.clientHeight,0.2,farPlane);

    const controls=new PointerLockControls(camera,renderer.domElement);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (controls as any).addEventListener("lock",()=>setLocked(true));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (controls as any).addEventListener("unlock",()=>setLocked(false));

    // ── Lighting (cinematic per-map) ───────────────────────────────────────
    const hemi=new THREE.HemisphereLight(cfg.ambientHex,cfg.groundHex,0.55);
    scene.add(hemi);
    const ambient=new THREE.AmbientLight(0xffffff,0.4); scene.add(ambient);
    const sun=new THREE.DirectionalLight(cfg.sunColor,1.4);
    sun.castShadow=true;
    sun.shadow.mapSize.set(cfg.id==="hunza"?2048:1024,cfg.id==="hunza"?2048:1024);
    const sf=cfg.id==="hunza"?350:200;
    sun.shadow.camera.left=-sf;sun.shadow.camera.right=sf;
    sun.shadow.camera.top=sf;sun.shadow.camera.bottom=-sf;
    sun.shadow.camera.near=1;sun.shadow.camera.far=800;
    scene.add(sun);
    // Fill light from opposite direction (blue atmospheric)
    const fill=new THREE.DirectionalLight(0x4466aa,0.3);
    fill.position.set(-150,80,-100); scene.add(fill);
    const moon=new THREE.DirectionalLight(0x223355,0);
    moon.position.set(-100,120,-80); scene.add(moon);

    // ── Noise generators ─────────────────────────────────────────────────
    const noise2D =createNoise2D(); // primary height
    const noise2D2=createNoise2D(); // domain warp / secondary

    // ── Per-map terrain height function ───────────────────────────────────
    function getH(x:number,z:number):number{
      switch(cfg.id){
        case "hunza":{
          // Ridged multifractal + domain warp → ultra-realistic Karakoram
          const S=900, nx=x/S, nz=z/S;
          const wx=nx+0.65*noise2D2(nx*2+1.7,nz*2+9.2);
          const wz=nz+0.65*noise2D2(nx*2+8.3,nz*2+2.8);
          const vm=Math.pow(Math.min(1,Math.abs(x)/110),1.5); // valley mask
          let r=0,a=1,f=1,ma=0;
          for(let o=0;o<7;o++){
            r+=(1-Math.abs(noise2D(wx*f*3.0+o*7.13,wz*f*3.0+o*3.94)))*a;
            ma+=a;a*=0.55;f*=2.07;
          }
          const peaks=Math.pow(r/ma,2.4)*275*vm;
          const floor=(noise2D(nx*9,nz*9)*0.35+noise2D(nx*18,nz*18)*0.15)*9*(1-vm*0.85);
          return Math.max(0,floor+peaks);
        }
        case "lahore":{
          // Almost flat ruins on ancient alluvial plain
          const nx=x/500,nz=z/500;
          return noise2D(nx*4,nz*4)*1.8+noise2D(nx*10,nz*10)*0.8+3.5;
        }
        case "multan":{
          // Smooth rolling sand dunes
          const nx=x/400,nz=z/400;
          const dune=noise2D(nx*1.8,nz*1.8)*0.55+noise2D(nx*3.5,nz*3.5)*0.28+noise2D(nx*9,nz*9)*0.1;
          return (dune*0.5+0.5)*22+1;
        }
        case "karachi":{
          // Very flat with gentle slope toward ocean
          const nx=x/600,nz=z/600;
          const flat=noise2D(nx*8,nz*8)*1.2+noise2D(nx*20,nz*20)*0.4;
          return Math.max(-1,flat+2.5+(z<-80?(z+80)*0.03:0));
        }
        default: return 0;
      }
    }

    // ── Terrain mesh with slope-aware vertex colors ────────────────────────
    const tGeo=new THREE.PlaneGeometry(TSIZE,TSIZE,TSEGS,TSEGS);
    tGeo.rotateX(-Math.PI/2);
    const posArr=tGeo.attributes.position.array as Float32Array;
    const vCount=posArr.length/3;
    const vcols=new Float32Array(vCount*3);

    for(let i=0;i<vCount;i++){
      const x=posArr[i*3],z=posArr[i*3+2];
      const h=getH(x,z); posArr[i*3+1]=h;
      // Slope from adjacent samples
      const sX=(getH(x+2.5,z)-getH(x-2.5,z))/5;
      const sZ=(getH(x,z+2.5)-getH(x,z-2.5))/5;
      const slope=Math.sqrt(sX*sX+sZ*sZ);
      let col:THREE.Color;

      if(cfg.id==="hunza"){
        const isCliff=slope>3.2, hN=Math.min(1,h/275);
        if(isCliff&&hN>0.04) col=new THREE.Color(0x504030);
        else if(hN<0.025)    col=new THREE.Color(0x2a5a18);
        else if(hN<0.07)     col=new THREE.Color(0x3a7d44);
        else if(hN<0.16)     col=new THREE.Color(0x3a7d44).lerp(new THREE.Color(0x7a6850),( hN-0.07)/0.09);
        else if(hN<0.45)     col=new THREE.Color(0x7a6850);
        else if(hN<0.62)     col=new THREE.Color(0x5a5048);
        else if(hN<0.72)     col=new THREE.Color(0x5a5048).lerp(new THREE.Color(0xdeeef8),(hN-0.62)/0.1);
        else                  col=new THREE.Color(0xeeeef8);
      } else if(cfg.id==="lahore"){
        const dusty=slope>0.6?0xaa7755:0x9a6a48;
        col=new THREE.Color(dusty).lerp(new THREE.Color(0xbb8855),Math.random()*0.15);
      } else if(cfg.id==="multan"){
        const hN=Math.min(1,h/23);
        col=new THREE.Color(0xdbb84a).lerp(new THREE.Color(0xc49030),hN*0.6+slope*0.08);
      } else { // karachi
        const isSand=z<-60||z>180;
        col=new THREE.Color(isSand?0xd4c090:0x9ab87a).lerp(new THREE.Color(0xc8b075),Math.random()*0.1);
      }
      vcols[i*3]=col.r;vcols[i*3+1]=col.g;vcols[i*3+2]=col.b;
    }
    tGeo.setAttribute("color",new THREE.BufferAttribute(vcols,3));
    tGeo.computeVertexNormals();
    const terrain=new THREE.Mesh(tGeo,new THREE.MeshLambertMaterial({vertexColors:true}));
    terrain.receiveShadow=true; scene.add(terrain);

    // ── Camera start position ─────────────────────────────────────────────
    if(cfg.id==="hunza") camera.position.set(0,getH(0,0)+3,30);
    else if(cfg.id==="karachi") camera.position.set(0,4,-30);
    else camera.position.set(0,getH(0,0)+4,0);

    // ── Water / ocean ──────────────────────────────────────────────────────
    let waterMeshRef:THREE.Mesh|null=null;
    if(cfg.id==="karachi"){
      const wG=new THREE.PlaneGeometry(TSIZE*1.5,TSIZE*0.8,40,40); wG.rotateX(-Math.PI/2);
      const wM=new THREE.MeshLambertMaterial({color:0x1a66aa,transparent:true,opacity:0.82});
      waterMeshRef=new THREE.Mesh(wG,wM);
      waterMeshRef.position.set(-40,-0.6,-TSIZE*0.62); scene.add(waterMeshRef);
      // Beach
      const bG=new THREE.PlaneGeometry(TSIZE,55); bG.rotateX(-Math.PI/2);
      const beach=new THREE.Mesh(bG,new THREE.MeshLambertMaterial({color:0xddd0a0}));
      beach.position.set(0,0.18,-TSIZE*0.36); scene.add(beach);
    } else if(cfg.id==="hunza"){
      // Glacier river in valley
      const gG=new THREE.PlaneGeometry(18,TSIZE*0.9); gG.rotateX(-Math.PI/2);
      const glacier=new THREE.Mesh(gG,new THREE.MeshLambertMaterial({color:0x88d0e8,transparent:true,opacity:0.75}));
      glacier.position.set(-8,0.8,0); scene.add(glacier);
      // Glacier surface shimmer plane
      const gG2=new THREE.PlaneGeometry(12,TSIZE*0.6); gG2.rotateX(-Math.PI/2);
      const glacierIce=new THREE.Mesh(gG2,new THREE.MeshLambertMaterial({color:0xaaeeff,transparent:true,opacity:0.35}));
      glacierIce.position.set(-8,1.0,0); scene.add(glacierIce);
    } else if(cfg.id!=="multan"){
      const rG=new THREE.PlaneGeometry(18,TSIZE); rG.rotateX(-Math.PI/2);
      const river=new THREE.Mesh(rG,new THREE.MeshLambertMaterial({color:0x4488bb,transparent:true,opacity:0.75}));
      river.position.set(-35,0.6,0); scene.add(river);
    }

    // ── Roads (per map) ───────────────────────────────────────────────────
    const bldBoxes:THREE.Box3[]=[];
    const roadMat=new THREE.MeshLambertMaterial({color:cfg.id==="multan"?0xc4a860:0x404040});
    const markMat=new THREE.MeshLambertMaterial({color:cfg.id==="multan"?0xddbb66:0xddcc22});
    function mkRoad(x1:number,z1:number,x2:number,z2:number,w=5){
      const dx=x2-x1,dz=z2-z1,len=Math.sqrt(dx*dx+dz*dz);
      const cx=(x1+x2)/2,cz=(z1+z2)/2,ang=Math.atan2(dx,dz);
      const rd=new THREE.Mesh(new THREE.PlaneGeometry(len,w),roadMat);
      rd.rotateX(-Math.PI/2);rd.rotation.y=ang;rd.position.set(cx,0.12,cz); scene.add(rd);
      const mk=new THREE.Mesh(new THREE.PlaneGeometry(len*0.85,0.3),markMat);
      mk.rotateX(-Math.PI/2);mk.rotation.y=ang;mk.position.set(cx,0.15,cz); scene.add(mk);
    }
    if(cfg.id==="hunza"){
      // Karakoram Highway running through valley
      [[0,80,0,-80],[0,-80,-15,-160],[0,80,15,160]].forEach(([x1,z1,x2,z2])=>mkRoad(x1,z1,x2,z2,7));
      [[0,20,-30,0],[0,-20,25,-5],[0,0,40,40]].forEach(([x1,z1,x2,z2])=>mkRoad(x1,z1,x2,z2,4));
    } else {
      [[0,0,50,30],[50,30,80,60],[0,0,-30,-40],[-30,-40,-60,-65],[0,0,30,-50],
       [0,0,-25,45],[50,30,20,70],[-30,-40,-70,-10],[20,70,60,80],[-70,-10,-80,20],
       [0,0,80,-20],[0,0,-60,40]].forEach(([x1,z1,x2,z2])=>mkRoad(x1,z1,x2,z2));
    }

    // ── Buildings (per map style) ─────────────────────────────────────────
    function mkBox(bx:number,bz:number,w:number,h:number,d:number,mat:THREE.Material,roofMat?:THREE.Material){
      const by=getH(bx,bz);
      const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      body.position.set(bx,by+h/2,bz);body.castShadow=true;body.receiveShadow=true;scene.add(body);
      if(roofMat){
        const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.5,0.7,d+0.5),roofMat);
        roof.position.set(bx,by+h+0.35,bz);scene.add(roof);
      }
      bldBoxes.push(new THREE.Box3().setFromObject(body));
    }

    if(cfg.id==="hunza"){
      // Stone houses in valley only (|x|<80)
      const stoneM=new THREE.MeshLambertMaterial({color:0xb8a888});
      const mudRoofM=new THREE.MeshLambertMaterial({color:0xa09070});
      const winM=new THREE.MeshLambertMaterial({color:0x334466});
      [[10,20,6,5,6],[25,35,7,4,6],[-18,25,5,4,5],[30,-30,8,6,7],
       [-28,-35,6,5,6],[50,10,7,5,7],[-45,15,5,4,5],[15,-55,6,5,6],
       [-10,60,7,4,6],[35,60,5,3,5],[55,-40,6,5,7],[-50,-10,5,4,5],
       [20,85,8,5,8],[-25,80,6,4,6],[0,-75,7,5,7],[-60,50,5,3,5],
      ].forEach(([x,z,w,h,d])=>{
        mkBox(x,z,w,h,d,stoneM,mudRoofM);
        // small window on front face
        const win=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),winM);
        win.position.set(x,getH(x,z)+h*0.55,z+d/2+0.02); scene.add(win);
      });
      // Large boulders in valley
      const boulderM=new THREE.MeshLambertMaterial({color:0x706050});
      [[35,-15,4],[-50,30,3.5],[-20,-60,5],[65,20,3],[-70,-30,4.5]].forEach(([rx,rz,rs])=>{
        const b=new THREE.Mesh(new THREE.DodecahedronGeometry(rs,1),boulderM);
        b.position.set(rx,getH(rx,rz)+rs*0.3,rz);b.castShadow=true;scene.add(b);
      });
    } else if(cfg.id==="lahore"){
      // ── Mughal Ruins ─────────────────────────────────────────────────
      const brickM =new THREE.MeshLambertMaterial({color:0xaa3322});
      const brickDkM=new THREE.MeshLambertMaterial({color:0x882211});
      const mortarM =new THREE.MeshLambertMaterial({color:0xccaa88});
      const vineM   =new THREE.MeshLambertMaterial({color:0x2a5e18,transparent:true,opacity:0.85});

      // Full walls
      [[20,20,18,9,1.5],[20,20,1.5,9,18],[-20,-20,18,9,1.5],[-20,-20,1.5,9,18],
       [55,10,16,7,1.5],[55,10,1.5,7,16],[-50,-15,14,8,1.5],[-50,-15,1.5,8,14],
       [80,50,12,6,1.5],[80,50,1.5,6,12],[-80,-40,15,7,1.5],[-80,-40,1.5,7,15],
       [30,-60,14,5,1.5],[-25,65,12,6,1.5],
      ].forEach(([x,z,w,h,d])=>mkBox(x,z,w,h,d,brickM));

      // Crumbled partial walls
      [[0,40,8,4,1.5],[40,0,1.5,3,10],[-40,5,10,3,1.5],[10,-40,1.5,4,8],
       [60,-30,6,3,1.5],[-30,55,9,3,1.5],[70,0,1.5,5,7],[-15,80,8,4,1.5],
       [45,70,1.5,3,9],[-65,30,7,4,1.5],
      ].forEach(([x,z,w,h,d])=>{
        const b=getH(x,z);
        // crumbled – shorter than original with random tilt
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,h*(0.5+Math.random()*0.4),d),brickM);
        m.position.set(x,b+h*0.3,z);m.rotation.y=Math.random()*0.25-0.125;
        m.rotation.z=Math.random()*0.08-0.04;m.castShadow=true;scene.add(m);
        bldBoxes.push(new THREE.Box3().setFromObject(m));
        // brick fragments on ground
        for(let f=0;f<4;f++){
          const frag=new THREE.Mesh(new THREE.BoxGeometry(0.7+Math.random()*0.6,0.3+Math.random()*0.4,0.5+Math.random()*0.4),brickDkM);
          frag.position.set(x+(Math.random()-0.5)*w*1.2,b+0.2,z+(Math.random()-0.5)*d*1.5);
          frag.rotation.set(Math.random()*0.4,Math.random()*Math.PI,Math.random()*0.3);
          scene.add(frag);
        }
      });

      // Mughal arches (pillar + lintel + half-torus arch)
      const archPositions=[[0,0],[30,0],[-30,0],[0,30],[0,-30],[50,50],[-50,-50],[70,-20],[-20,70]];
      archPositions.forEach(([ax,az])=>{
        const by=getH(ax,az);
        const archG=new THREE.Group();
        const ph=7,pw=1.5,ad=5;
        const lp=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pw),brickM);
        lp.position.set(-ad/2,ph/2,0);lp.castShadow=true;
        const rp=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pw),brickM);
        rp.position.set(ad/2,ph/2,0);rp.castShadow=true;
        const lintel=new THREE.Mesh(new THREE.BoxGeometry(ad+pw,pw,pw),mortarM);
        lintel.position.set(0,ph,0);
        // Half-torus arch keystone
        const archArc=new THREE.Mesh(new THREE.TorusGeometry(ad*0.5,pw*0.45,8,16,Math.PI),brickM);
        archArc.rotation.z=Math.PI;archArc.position.set(0,ph,0);
        archG.add(lp,rp,lintel,archArc);
        archG.position.set(ax,by,az);scene.add(archG);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(ax,by+ph/2,az),new THREE.Vector3(ad+2,ph,pw+2)));

        // Overgrown vines on arch
        for(let v=0;v<3;v++){
          const vine=new THREE.Mesh(new THREE.PlaneGeometry(1.2,2.5+Math.random()*2),vineM);
          vine.position.set(ax+(Math.random()-0.5)*ad,by+2+Math.random()*3,az+(Math.random()-0.5)*2);
          vine.rotation.y=Math.random()*Math.PI;scene.add(vine);
        }
      });

      // Fort towers
      [[-20,-20],[20,20],[-50,-15],[55,10]].forEach(([tx,tz])=>{
        const by=getH(tx,tz);
        const tw=8,th=14;
        const tower=new THREE.Mesh(new THREE.CylinderGeometry(tw/2,tw/2+0.5,th,8),brickM);
        tower.position.set(tx,by+th/2,tz);tower.castShadow=true;scene.add(tower);
        // battlements
        for(let b=0;b<8;b++){
          const bA=b*(Math.PI*2/8);
          const batt=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.5,1.5),brickDkM);
          batt.position.set(tx+Math.cos(bA)*(tw/2-0.2),by+th+1.25,tz+Math.sin(bA)*(tw/2-0.2));
          scene.add(batt);
        }
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(tx,by+th/2,tz),new THREE.Vector3(tw,th,tw)));
      });

      // Overgrown vegetation patches
      const weedM=new THREE.MeshLambertMaterial({color:0x3a6e22});
      for(let i=0;i<60;i++){
        const px=(Math.random()-0.5)*250,pz=(Math.random()-0.5)*250;
        const weed=new THREE.Mesh(new THREE.PlaneGeometry(1.5+Math.random()*1.5,1.5+Math.random()*2),weedM);
        weed.position.set(px,getH(px,pz)+0.5,pz);weed.rotation.y=Math.random()*Math.PI;scene.add(weed);
        const weed2=weed.clone();weed2.rotation.y+=Math.PI/2;scene.add(weed2);
      }
    } else if(cfg.id==="multan"){
      // ── Desert ruins ─────────────────────────────────────────────────
      const adobeM=new THREE.MeshLambertMaterial({color:0xc8a060});
      const adobeDkM=new THREE.MeshLambertMaterial({color:0xb08848});

      // Domed structures
      [[10,30],[-25,-20],[50,-15],[-40,40],[0,65],[70,25],[-60,-10],[30,-65],[-15,-75],[55,60]].forEach(([dx,dz])=>{
        const by=getH(dx,dz);
        const cylH=4+Math.random()*3;
        const body=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4,cylH,8),adobeM);
        body.position.set(dx,by+cylH/2,dz);body.castShadow=true;scene.add(body);
        const dome=new THREE.Mesh(new THREE.SphereGeometry(3.5,8,4,0,Math.PI*2,0,Math.PI/2),adobeM);
        dome.position.set(dx,by+cylH,dz);scene.add(dome);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(dx,by+cylH/2,dz),new THREE.Vector3(8,cylH+3.5,8)));
      });

      // Crumbled mud walls
      [[25,0,12,3.5,1.2],[-30,10,10,4,1.2],[0,-35,14,3,1.2],[40,-40,8,4,1.2],
       [-50,25,9,3.5,1.2],[0,50,11,3,1.2],[60,5,7,4,1.2],[-20,55,10,3.5,1.2],
      ].forEach(([x,z,w,h,d])=>{
        const by=getH(x,z);
        const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),adobeM);
        wall.position.set(x,by+h/2,z);wall.rotation.y=Math.random()*0.3-0.15;
        wall.castShadow=true;scene.add(wall);
        // crack texture via dark overlay
        const crack=new THREE.Mesh(new THREE.PlaneGeometry(w*0.8,h*0.6),adobeDkM);
        crack.position.set(x,by+h*0.5,z+d/2+0.02);scene.add(crack);
        bldBoxes.push(new THREE.Box3().setFromObject(wall));
      });

      // Abandoned market stalls
      for(let i=0;i<8;i++){
        const sx=(Math.random()-0.5)*180,sz=(Math.random()-0.5)*180;
        const by=getH(sx,sz);
        const frame=new THREE.Mesh(new THREE.BoxGeometry(4,2.5,3),adobeDkM);
        frame.position.set(sx,by+1.25,sz);scene.add(frame);
        const canopy=new THREE.Mesh(new THREE.BoxGeometry(5,0.2,4),new THREE.MeshLambertMaterial({color:0xdd8844}));
        canopy.position.set(sx,by+2.7,sz);scene.add(canopy);
        bldBoxes.push(new THREE.Box3().setFromObject(frame));
      }
    } else {
      // ── Karachi coastal city (modern + broken mix) ───────────────────
      const concreteM=new THREE.MeshLambertMaterial({color:0xb0b8c0});
      const concreteDkM=new THREE.MeshLambertMaterial({color:0x8090a0});
      const glassM=new THREE.MeshLambertMaterial({color:0x4477aa,transparent:true,opacity:0.7});
      const roofKM=new THREE.MeshLambertMaterial({color:0x506070});
      const winM=new THREE.MeshLambertMaterial({color:0x88aacc,transparent:true,opacity:0.8});

      // Modern buildings cluster
      [[20,20,10,18,10],[38,28,8,14,7],[52,12,11,22,11],[-22,32,9,16,9],[-42,16,7,12,7],
       [62,-18,10,20,10],[32,-38,8,14,8],[-32,-28,14,28,14],[78,52,9,16,9],[-68,-48,8,12,7],
       [12,68,11,18,10],[-58,42,7,10,8],[45,-60,9,14,9],[-20,-70,8,10,8],[90,-30,10,16,10],
       [10,-90,7,12,7],[-80,20,9,14,9],[60,80,8,8,8],
      ].forEach(([x,z,w,h,d])=>{
        const by=getH(x,z);
        const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),concreteM);
        body.position.set(x,by+h/2,z);body.castShadow=true;body.receiveShadow=true;scene.add(body);
        const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.4,0.6,d+0.4),roofKM);
        roof.position.set(x,by+h+0.3,z);scene.add(roof);
        // Glass windows grid
        for(let f=0;f<Math.floor(h/4);f++){
          for(let s=0;s<2;s++){
            const win=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.8),winM);
            win.position.set(x+w/2+0.01,by+2.5+f*4,z+(s-0.5)*3);win.rotation.y=Math.PI/2;scene.add(win);
          }
        }
        bldBoxes.push(new THREE.Box3().setFromObject(body));
      });

      // Damaged/broken buildings near coast
      [[-10,-50],[-35,-60],[10,-65],[-50,-45]].forEach(([bx,bz])=>{
        const by=getH(bx,bz);
        const h=6+Math.random()*4;
        const dm=new THREE.Mesh(new THREE.BoxGeometry(8,h,8),concreteDkM);
        dm.position.set(bx,by+h/2,bz);dm.castShadow=true;scene.add(dm);
        // Broken side
        const hole=new THREE.Mesh(new THREE.BoxGeometry(3,h*0.6,0.5),concreteDkM);
        hole.position.set(bx,by+h*0.4,bz+4.3);hole.rotation.z=0.3;scene.add(hole);
        bldBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(bx,by+h/2,bz),new THREE.Vector3(8,h,8)));
      });

      // Glass tower on beachfront
      const glassT=new THREE.Mesh(new THREE.BoxGeometry(12,35,12),glassM);
      glassT.position.set(-5,17.5,-5);glassT.castShadow=true;scene.add(glassT);
      bldBoxes.push(new THREE.Box3().setFromObject(glassT));
    }

    // ── Trees / Vegetation ────────────────────────────────────────────────
    const trunkM=new THREE.MeshLambertMaterial({color:0x5c3d1a});
    const leafColors={hunza:0x2a5a2c,lahore:0x3a6e1a,multan:0xaa8833,karachi:0x4a8e22};
    const leafM=new THREE.MeshLambertMaterial({color:leafColors[cfg.id as keyof typeof leafColors]});
    const palmLeafM=new THREE.MeshLambertMaterial({color:0x3a9e22});

    const treeCount=cfg.id==="multan"?35:cfg.id==="lahore"?50:100;
    for(let i=0;i<treeCount;i++){
      const a=Math.random()*Math.PI*2,dist=20+Math.random()*(cfg.id==="hunza"?85:190);
      const tx=Math.cos(a)*dist,tz=Math.sin(a)*dist;
      if(cfg.id==="hunza"&&Math.abs(tx)>90)continue; // valley only
      if(cfg.id==="karachi"&&tz<-50)continue; // no trees in ocean
      const th=getH(tx,tz);
      if(cfg.id==="hunza"&&th>80)continue;

      const g=new THREE.Group();
      if(cfg.id==="karachi"&&Math.random()<0.4){
        // Palm tree
        const palmH=5+Math.random()*4;
        const trunk2=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.3,palmH,6),trunkM);
        trunk2.position.y=palmH/2;g.add(trunk2);
        for(let p=0;p<6;p++){
          const frond=new THREE.Mesh(new THREE.PlaneGeometry(0.6,3.5),palmLeafM);
          frond.position.set(0,palmH,0);frond.rotation.y=p*(Math.PI/3);frond.rotation.z=0.8;scene.add(frond);
          g.add(frond);
        }
      } else {
        const tH=3+Math.random()*2;
        const trunk3=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.38,tH,6),trunkM);
        trunk3.position.y=tH/2;trunk3.castShadow=true;
        const leaf=new THREE.Mesh(new THREE.ConeGeometry(2.2,4.5,7),leafM);
        leaf.position.y=tH+2.2;leaf.castShadow=true;g.add(trunk3,leaf);
      }
      g.position.set(tx,th+1.4,tz);scene.add(g);
    }

    // ── Rocks & Desert details ────────────────────────────────────────────
    const rockM=new THREE.MeshLambertMaterial({color:cfg.id==="multan"?0xc09050:0x808070});
    const rockCount=cfg.id==="hunza"?80:cfg.id==="multan"?60:35;
    for(let i=0;i<rockCount;i++){
      const rx=(Math.random()-0.5)*(cfg.id==="hunza"?250:380);
      const rz=(Math.random()-0.5)*(cfg.id==="hunza"?220:380);
      if(cfg.id==="hunza"&&Math.abs(rx)>85)continue;
      const s=cfg.id==="hunza"?1.5+Math.random()*5:0.6+Math.random()*2;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockM);
      rock.position.set(rx,getH(rx,rz)+s*0.3,rz);
      rock.rotation.set(Math.random(),Math.random(),Math.random());
      rock.castShadow=true;scene.add(rock);
    }

    // ── Ammo pickups ───────────────────────────────────────────────────────
    const ammoBoxM=new THREE.MeshLambertMaterial({color:0xffcc00});
    const ammoMkM =new THREE.MeshLambertMaterial({color:0xff6600});
    const ammoPosMap:{[k:string]:number[][]}={
      hunza:[[5,15],[20,-25],[-15,30],[30,-50],[-25,55],[0,-80],[40,80],[-45,-60],[55,20],[-55,-20],[10,110],[-10,-110]],
      lahore:[[15,15],[40,5],[5,40],[-20,10],[10,-20],[55,55],[-50,20],[20,-50],[80,10],[10,80],[-80,-20],[-20,-80]],
      multan:[[10,20],[-20,-10],[35,-30],[-30,45],[60,10],[-10,-60],[45,55],[-55,-15],[0,70],[70,-20],[-40,65],[20,-75]],
      karachi:[[15,10],[40,5],[-15,-10],[30,-30],[-30,30],[60,-10],[-60,20],[10,60],[-10,-60],[50,50],[-50,-30],[20,-80]],
    };
    (ammoPosMap[cfg.id]||ammoPosMap.lahore).forEach(([ax,az])=>{
      const pack=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.75,0.6),ammoBoxM);
      const ay=getH(ax,az);pack.position.set(ax,ay+1.0,az);scene.add(pack);
      const c1=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.7),ammoMkM);
      const c2=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.1,0.1),ammoMkM);
      c1.position.y=0.45;c2.position.y=0.45;pack.add(c1,c2);
      ammoPickRef.current.push({mesh:pack,active:true,respawnTimer:0});
    });

    // ── Health packs ────────────────────────────────────────────────────────
    const hpBoxM=new THREE.MeshLambertMaterial({color:0x22cc44});
    const hpCrossM=new THREE.MeshLambertMaterial({color:0xffffff});
    [[25,-10],[-25,25],[10,50],[-10,-45],[60,30],[-60,-15],[0,-90],[75,-60],
     [-75,40],[35,80],[-35,-70],[50,-50]].forEach(([hx,hz])=>{
      const g=new THREE.Group();
      const box=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),hpBoxM);
      const cv=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.85,0.25),hpCrossM);
      const ch=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.25,0.25),hpCrossM);
      cv.position.y=0;ch.position.y=0;box.castShadow=true;g.add(box,cv,ch);
      g.position.set(hx,getH(hx,hz)+1.0,hz);scene.add(g);
      hpPickRef.current.push({mesh:g,active:true,respawnTimer:0});
    });

    // ── Car (drivable) ──────────────────────────────────────────────────────
    const carSpawns:{[k:string]:[number,number]}={hunza:[15,-40],lahore:[25,-25],multan:[-18,30],karachi:[35,-85]};
    const [csx,csz]=carSpawns[cfg.id]||[20,-20];
    const carY=getH(csx,csz);

    const carBodyM=new THREE.MeshLambertMaterial({color:cfg.id==="multan"?0xaa6622:cfg.id==="karachi"?0x2255aa:0x334455});
    const carGlassM=new THREE.MeshLambertMaterial({color:0x88aacc,transparent:true,opacity:0.65});
    const wheelM=new THREE.MeshLambertMaterial({color:0x222222});
    const wheelRimM=new THREE.MeshLambertMaterial({color:0x888888});

    const carGroup=new THREE.Group();
    // Body
    const carBody=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.65,5.0),carBodyM);
    carBody.position.y=0.55;carBody.castShadow=true;carGroup.add(carBody);
    // Hood/trunk
    const hood=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.3,1.8),carBodyM);
    hood.position.set(0,0.78,-1.4);carGroup.add(hood);
    const trunk=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.3,1.4),carBodyM);
    trunk.position.set(0,0.78,1.5);carGroup.add(trunk);
    // Cab
    const cab=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.62,2.2),carBodyM);
    cab.position.set(0,1.18,0.1);cab.castShadow=true;carGroup.add(cab);
    // Windshields
    const wshield=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.55),carGlassM);
    wshield.position.set(0,1.2,-0.98);wshield.rotation.x=0.28;carGroup.add(wshield);
    const rshield=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.55),carGlassM);
    rshield.position.set(0,1.2,1.18);rshield.rotation.x=-0.28;carGroup.add(rshield);
    // Wheels (4)
    [[-1.4,0.4,-1.8],[1.4,0.4,-1.8],[-1.4,0.4,1.8],[1.4,0.4,1.8]].forEach(([wx,wy,wz])=>{
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.32,12),wheelM);
      wheel.rotation.z=Math.PI/2;wheel.position.set(wx,wy,wz);carGroup.add(wheel);
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.34,6),wheelRimM);
      rim.rotation.z=Math.PI/2;rim.position.set(wx,wy,wz);carGroup.add(rim);
    });
    // Headlights
    const headlightM=new THREE.MeshLambertMaterial({color:0xffffcc,emissive:new THREE.Color(0x444433)});
    [[-0.85,-0.88],[0.85,-0.88]].forEach(([lx,lz])=>{
      const hl=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.25,0.12),headlightM);
      hl.position.set(lx,0.7,lz-2.1);carGroup.add(hl);
    });
    carGroup.position.set(csx,carY+0.42,csz);
    carGroup.castShadow=true;scene.add(carGroup);

    carRef.current={group:carGroup,vel:0,heading:0,steer:0,inUse:false};

    // ── NPCs ──────────────────────────────────────────────────────────────
    const npcBodyBase=new THREE.MeshLambertMaterial({color:cfg.npcColor});
    const npcHeadM=new THREE.MeshLambertMaterial({color:0xffcba4});
    const gunMat=new THREE.MeshLambertMaterial({color:0x1a1a1a});
    const flashMat=new THREE.MeshLambertMaterial({color:0xff8800,emissive:new THREE.Color(0xaa4400)});

    function makeWaypoints(cx:number,cz:number):THREE.Vector3[]{
      const pts:THREE.Vector3[]=[];
      for(let i=0;i<4;i++){
        let wx=cx+(Math.random()-0.5)*30, wz=cz+(Math.random()-0.5)*30;
        if(cfg.id==="hunza"){wx=Math.max(-80,Math.min(80,wx));}
        pts.push(new THREE.Vector3(wx,getH(wx,wz)+0.75,wz));
      }
      return pts;
    }

    function mkNPC(id:number):NPC{
      const g=new THREE.Group();
      const bodyMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.42,1.5,8),npcBodyBase.clone());
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,8),npcHeadM.clone());
      const gun=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.85),gunMat);
      gun.position.set(0.5,0.3,0.35);bodyMesh.castShadow=true;head.castShadow=true;
      head.position.y=1.15;g.add(bodyMesh,head,gun);
      let nx=0,nz=0;
      if(cfg.id==="hunza"){ nx=(Math.random()-0.5)*160; nz=(Math.random()-0.5)*160; nx=Math.max(-80,Math.min(80,nx)); }
      else { const a=Math.random()*Math.PI*2,d=20+Math.random()*100; nx=Math.cos(a)*d; nz=Math.sin(a)*d; }
      g.position.set(nx,getH(nx,nz)+0.75,nz);scene.add(g);
      return{group:g,bodyMesh,hp:100,maxHp:100,speed:2.0+Math.random()*1.5,
        dir:new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize(),
        changeT:2+Math.random()*4,state:"patrol",id,waypoints:makeWaypoints(nx,nz),
        wpIdx:0,alertTimer:0,attackCooldown:1+Math.random()*2};
    }
    for(let i=0;i<NPC_COUNT;i++)npcsRef.current.push(mkNPC(i));

    // ── Rain ──────────────────────────────────────────────────────────────
    const rainPos=new Float32Array(RAIN_COUNT*3);
    for(let i=0;i<RAIN_COUNT;i++){
      rainPos[i*3]=(Math.random()-0.5)*240;rainPos[i*3+1]=Math.random()*90;rainPos[i*3+2]=(Math.random()-0.5)*240;
    }
    const rainGeo=new THREE.BufferGeometry();
    rainGeo.setAttribute("position",new THREE.BufferAttribute(rainPos,3));
    const rainMesh=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0xaaddff,size:0.16,transparent:true,opacity:0.45}));
    rainMesh.visible=false;scene.add(rainMesh);

    // ── Raycaster ──────────────────────────────────────────────────────────
    const raycaster=new THREE.Raycaster();

    function spawnDrop(pos:THREE.Vector3){
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,6),new THREE.MeshLambertMaterial({color:0xffcc00}));
      m.position.copy(pos).setY(pos.y+1.0);scene.add(m);
      ammoPickRef.current.push({mesh:m,active:true,respawnTimer:0});
    }

    function shoot(){
      if(!canShoot.current)return;
      if(ammoRef.current<=0){flash("No ammo! R to reload");return;}
      canShoot.current=false; ammoRef.current-=1; setAmmo(ammoRef.current); showMuzzle();
      setTimeout(()=>{canShoot.current=true;},190);
      raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
      const tgts=npcsRef.current.filter(n=>n.state!=="dead").flatMap(n=>n.group.children);
      const hits=raycaster.intersectObjects(tgts,false);
      if(!hits.length)return;
      const npc=npcsRef.current.find(n=>n.state!=="dead"&&n.group.children.includes(hits[0].object));
      if(!npc)return;
      const dmg=28+Math.floor(Math.random()*24); npc.hp-=dmg; showHit();
      const wp=npc.group.position.clone().add(new THREE.Vector3(0,2,0));
      const pr=wp.clone().project(camera);
      const newId=++dmgId.current;
      setDmgNums(prev=>[...prev,{id:newId,x:(pr.x*0.5+0.5)*100,y:(1-(pr.y*0.5+0.5))*100,v:dmg}]);
      setTimeout(()=>setDmgNums(prev=>prev.filter(d=>d.id!==newId)),800);
      (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff2200);
      setTimeout(()=>{if(npc.state!=="dead")(npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);},280);
      if(npc.hp<=0){
        npc.state="dead";npc.group.visible=false;
        killsRef.current+=1;setKills(killsRef.current);
        comboT.current=3.5;comboRef.current+=1;setCombo(comboRef.current);
        flash(comboRef.current>=5?"RAMPAGE! 🔥":comboRef.current>=3?"MULTI-KILL! ⚡":"Enemy down! 💀");
        spawnDrop(npc.group.position.clone());
        setTimeout(()=>{
          let rx=0,rz=0;
          if(cfg.id==="hunza"){rx=(Math.random()-0.5)*160;rz=(Math.random()-0.5)*160;rx=Math.max(-80,Math.min(80,rx));}
          else{const ra=Math.random()*Math.PI*2,rd=35+Math.random()*80;rx=Math.cos(ra)*rd;rz=Math.sin(ra)*rd;}
          npc.group.position.set(rx,getH(rx,rz)+0.75,rz);
          npc.waypoints=makeWaypoints(rx,rz);npc.wpIdx=0;npc.hp=npc.maxHp;
          npc.state="patrol";npc.group.visible=true;
          (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);
        },7000);
      } else { npc.state="chase"; npc.alertTimer=12; }
    }

    // ── Input ──────────────────────────────────────────────────────────────
    const onKeyDown=(e:KeyboardEvent)=>{
      keysRef.current[e.code]=true;
      if(e.code==="KeyR"){ammoRef.current=30;setAmmo(30);flash("Reloaded ✓");}
      if(e.code==="KeyP"){
        const c:{[k:string]:"clear"|"rain"|"storm"}={clear:"rain",rain:"storm",storm:"clear"};
        const w=c[weatherRef.current];weatherRef.current=w;setWeather(w);
        rainMesh.visible=w!=="clear";flash(`Weather: ${w.toUpperCase()}`);
      }
      if(e.code==="KeyF"){
        const car=carRef.current;if(!car)return;
        if(inCarRef.current){inCarRef.current=false;setInCar(false);car.inUse=false;flash("Exited vehicle");}
        else if(camera.position.distanceTo(car.group.position)<4.5){
          inCarRef.current=true;setInCar(true);car.inUse=true;flash("In vehicle — WASD to drive, F to exit");
        }
      }
    };
    const onKeyUp=(e:KeyboardEvent)=>{keysRef.current[e.code]=false;};
    const onClick=()=>{if(!controls.isLocked)controls.lock();else if(!inCarRef.current)shoot();};

    document.addEventListener("keydown",onKeyDown);
    document.addEventListener("keyup",onKeyUp);
    renderer.domElement.addEventListener("click",onClick);

    // ── Game Loop ───────────────────────────────────────────────────────────
    const clock=new THREE.Clock();
    const playerBox=new THREE.Box3();
    let dayTime=0.28; let weatherTimer=40;
    let dmgTimer=0; let thunderTimer=0;
    let animId:number; let waterTime=0;

    function animate(){
      animId=requestAnimationFrame(animate);
      const dt=Math.min(clock.getDelta(),0.05);

      // Day / Night
      dayTime=(dayTime+DAY_SPEED)%1;
      const sky=sampleSky(dayTime,cfg.skyDay);
      renderer.setClearColor(sky.color); ambient.intensity=sky.ambient; sun.intensity=sky.sun;
      moon.intensity=(dayTime>0.82||dayTime<0.18)?0.2:0;
      hemi.intensity=sky.ambient*0.5;
      const sunA=dayTime*Math.PI*2;
      sun.position.set(Math.cos(sunA)*280,Math.sin(sunA)*220,80);
      const fogD=weatherRef.current==="storm"?cfg.fogDensity*4:weatherRef.current==="rain"?cfg.fogDensity*2:(dayTime>0.82||dayTime<0.18)?cfg.fogDensity*1.5:cfg.fogDensity;
      scene.fog=new THREE.FogExp2(sky.color.getHex(),fogD);
      const hr=Math.floor(dayTime*24);
      setTimeLabel(hr<5?"Night":hr<8?"Dawn":hr<17?"Day":hr<20?"Sunset":"Night");

      // Weather
      weatherTimer-=dt;
      if(weatherTimer<=0){
        weatherTimer=30+Math.random()*50;
        const opts:("clear"|"rain"|"storm")[]=["clear","clear","rain","storm"];
        const w=opts[Math.floor(Math.random()*opts.length)];
        weatherRef.current=w;setWeather(w);rainMesh.visible=w!=="clear";
      }
      if(weatherRef.current==="storm"){
        thunderTimer-=dt;
        if(thunderTimer<=0){
          thunderTimer=5+Math.random()*9;
          setThunderFlash(1);ambient.intensity=3;
          setTimeout(()=>{ambient.intensity=sky.ambient;setThunderFlash(0);},110);
          setTimeout(()=>{ambient.intensity=3;setThunderFlash(0.6);
            setTimeout(()=>{ambient.intensity=sky.ambient;setThunderFlash(0);},80);},200);
        }
      }

      // Rain
      if(rainMesh.visible){
        const spd=weatherRef.current==="storm"?32:18;
        const ra=rainMesh.geometry.attributes.position.array as Float32Array;
        for(let i=0;i<RAIN_COUNT;i++){
          ra[i*3+1]-=spd*dt;
          if(ra[i*3+1]<-2){ra[i*3]=camera.position.x+(Math.random()-0.5)*150;ra[i*3+1]=camera.position.y+55+Math.random()*25;ra[i*3+2]=camera.position.z+(Math.random()-0.5)*150;}
        }
        rainMesh.geometry.attributes.position.needsUpdate=true;
      }

      // Animated water (Karachi)
      if(waterMeshRef){waterTime+=dt;waterMeshRef.position.y=-0.5+Math.sin(waterTime*0.55)*0.38;}

      // Ammo pack rotate + collect
      for(const p of ammoPickRef.current){
        if(!p.active){
          if(p.respawnTimer>0){p.respawnTimer-=dt;if(p.respawnTimer<=0){p.active=true;(p.mesh as THREE.Mesh).visible=true;}}
          continue;
        }
        (p.mesh as THREE.Mesh|THREE.Group).rotation ? (p.mesh as THREE.Mesh).rotation.y+=dt*1.8 : null;
        if(camera.position.distanceTo((p.mesh as THREE.Mesh).position)<2.5){
          p.active=false;(p.mesh as THREE.Mesh).visible=false;p.respawnTimer=25;
          ammoRef.current=Math.min(30,ammoRef.current+10);setAmmo(ammoRef.current);flash("+10 Ammo 🔫");
        }
      }

      // Health pack collect
      for(const p of hpPickRef.current){
        if(!p.active){
          if(p.respawnTimer>0){p.respawnTimer-=dt;if(p.respawnTimer<=0){p.active=true;(p.mesh as THREE.Group).visible=true;}}
          continue;
        }
        p.mesh.rotation.y+=dt*1.2;
        const hpMeshPos=(p.mesh as THREE.Group).position;
        if(hpRef.current<100&&camera.position.distanceTo(hpMeshPos)<2.8){
          p.active=false;(p.mesh as THREE.Group).visible=false;p.respawnTimer=30;
          hpRef.current=Math.min(100,hpRef.current+35);setHp(hpRef.current);flash("+35 HP 💊");
        }
      }

      // Combo decay
      if(comboT.current>0){comboT.current-=dt;if(comboT.current<=0){comboRef.current=0;setCombo(0);}}

      // ── Car physics ─────────────────────────────────────────────────────
      const car=carRef.current;
      const K=keysRef.current;
      setNearCar(!inCarRef.current&&car!=null&&camera.position.distanceTo(car.group.position)<4.5);

      if(car&&inCarRef.current){
        // Accelerate / brake
        if(K["KeyW"]||K["ArrowUp"])    car.vel+=9*dt;
        if(K["KeyS"]||K["ArrowDown"])  car.vel-=6*dt;
        if(K["Space"])                  car.vel*=0.88;
        car.vel*=0.96; // friction
        car.vel=Math.max(-8,Math.min(24,car.vel));

        // Steering
        const steerRate=2.2*(1-Math.abs(car.vel)/30);
        if(K["KeyA"]||K["ArrowLeft"])   car.heading+=steerRate*dt*(car.vel>=0?1:-1);
        if(K["KeyD"]||K["ArrowRight"])  car.heading-=steerRate*dt*(car.vel>=0?1:-1);

        // Move car
        car.group.position.x+=Math.sin(car.heading)*car.vel*dt;
        car.group.position.z+=Math.cos(car.heading)*car.vel*dt;
        car.group.position.x=Math.max(-265,Math.min(265,car.group.position.x));
        car.group.position.z=Math.max(-265,Math.min(265,car.group.position.z));
        car.group.position.y=getH(car.group.position.x,car.group.position.z)+0.42;
        car.group.rotation.y=car.heading;

        // Camera follows car
        const camOff=new THREE.Vector3(-Math.sin(car.heading)*0,3.5,Math.cos(car.heading)*0);
        camera.position.set(car.group.position.x,car.group.position.y+3.5,car.group.position.z);

        // Wheel spin
        const wheelSpinRate=car.vel*1.5*dt;
        carGroup.children.forEach((c,idx)=>{ if(idx>=7&&idx<=14) c.rotation.x+=wheelSpinRate; });
      } else if(controls.isLocked){
        // ── Player on foot ───────────────────────────────────────────────
        const sprint=K["ShiftLeft"]||K["ShiftRight"];
        if(sprint&&(K["KeyW"]||K["ArrowUp"]||K["KeyS"]||K["ArrowDown"]||K["KeyA"]||K["KeyD"]))
          stamRef.current=Math.max(0,stamRef.current-30*dt);
        else stamRef.current=Math.min(100,stamRef.current+18*dt);
        setStamina(Math.round(stamRef.current));

        const spd=(sprint&&stamRef.current>5)?BASE_SPD*SPRINT_M:BASE_SPD;
        let fx=0,fz=0;
        if(K["KeyW"]||K["ArrowUp"])    fz-=1;
        if(K["KeyS"]||K["ArrowDown"])  fz+=1;
        if(K["KeyA"]||K["ArrowLeft"])  fx-=1;
        if(K["KeyD"]||K["ArrowRight"]) fx+=1;
        if(fx!==0||fz!==0){const len=Math.sqrt(fx*fx+fz*fz);controls.moveRight((fx/len)*spd*dt);controls.moveForward((-fz/len)*spd*dt);}

        // Jump + gravity
        if((K["Space"]||K["KeyE"])&&onGnd.current){velYRef.current=JUMP_VEL;onGnd.current=false;setIsOnGround(false);}
        velYRef.current+=GRAVITY*dt; camera.position.y+=velYRef.current*dt;
        const gy=getH(camera.position.x,camera.position.z)+1.9;
        if(camera.position.y<=gy){camera.position.y=gy;velYRef.current=0;if(!onGnd.current){onGnd.current=true;setIsOnGround(true);}}
        camera.position.x=Math.max(-265,Math.min(265,camera.position.x));
        camera.position.z=Math.max(-265,Math.min(265,camera.position.z));

        // Building collision
        playerBox.setFromCenterAndSize(camera.position,new THREE.Vector3(1.2,2,1.2));
        for(const box of bldBoxes){if(playerBox.intersectsBox(box)){
          const c=new THREE.Vector3();box.getCenter(c);
          camera.position.add(camera.position.clone().sub(c).setY(0).normalize().multiplyScalar(0.6));
        }}

        // NPC melee damage
        dmgTimer+=dt;
        if(dmgTimer>=2.5){dmgTimer=0;
          for(const npc of npcsRef.current){
            if(npc.state==="dead")continue;
            if(npc.group.position.distanceTo(camera.position)<ATK_RANGE){hpRef.current=Math.max(0,hpRef.current-8);setHp(hpRef.current);}
          }
        }
      }

      // ── NPC AI + Shooting ────────────────────────────────────────────────
      const playerPos=inCarRef.current&&car?car.group.position.clone():camera.position.clone();

      for(const npc of npcsRef.current){
        if(npc.state==="dead")continue;
        const toP=playerPos.clone().sub(npc.group.position).setY(0);
        const dist=toP.length();
        npc.changeT-=dt; npc.attackCooldown=Math.max(0,npc.attackCooldown-dt);
        if(npc.alertTimer>0)npc.alertTimer-=dt;

        switch(npc.state){
          case"patrol":{
            if(dist<DET_RANGE){npc.state="investigate";npc.alertTimer=3;break;}
            const wp=npc.waypoints[npc.wpIdx];
            const toWp=wp.clone().sub(npc.group.position).setY(0);
            if(toWp.length()<2){npc.wpIdx=(npc.wpIdx+1)%npc.waypoints.length;break;}
            toWp.normalize();npc.group.position.addScaledVector(toWp,npc.speed*dt);npc.dir.copy(toWp);break;
          }
          case"investigate":{
            if(dist<DET_RANGE*0.6){npc.state="chase";npc.alertTimer=15;break;}
            if(npc.alertTimer<=0){npc.state="patrol";break;}
            toP.normalize();npc.group.position.addScaledVector(toP,npc.speed*0.6*dt);npc.dir.copy(toP);break;
          }
          case"chase":{
            if(dist>DET_RANGE*1.5&&npc.alertTimer<=0){npc.state="patrol";break;}
            if(dist<=ATK_RANGE+1){npc.state="attack";break;}
            toP.normalize();npc.group.position.addScaledVector(toP,npc.speed*2*dt);npc.dir.copy(toP);break;
          }
          case"attack":{
            if(dist>ATK_RANGE+3){npc.state="chase";npc.alertTimer=10;break;}
            // NPC shoots player — hitscan with 42% accuracy
            if(npc.attackCooldown<=0){
              npc.attackCooldown=2.2+Math.random()*1.5;
              // Muzzle flash on NPC
              (npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(0xff8800);
              setTimeout(()=>{if(npc.state!=="dead")(npc.bodyMesh.material as THREE.MeshLambertMaterial).color.set(cfg.npcColor);},120);
              if(Math.random()<0.42){
                const dmgIn=10+Math.floor(Math.random()*10);
                hpRef.current=Math.max(0,hpRef.current-dmgIn);setHp(hpRef.current);
              }
            }
            break;
          }
        }

        const nx=npc.group.position.x,nz=npc.group.position.z;
        npc.group.position.set(Math.max(-240,Math.min(240,nx)),getH(nx,nz)+0.75,Math.max(-240,Math.min(240,nz)));
        if(npc.dir.length()>0.01)npc.group.rotation.y=Math.atan2(npc.dir.x,npc.dir.z);
      }

      setMiniDots(npcsRef.current.filter(n=>n.state!=="dead").map(n=>({
        x:(n.group.position.x-camera.position.x)/5,
        z:(n.group.position.z-camera.position.z)/5,state:n.state,
      })));

      renderer.render(scene,camera);
    }
    animate();

    const onResize=()=>{camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);};
    window.addEventListener("resize",onResize);

    return()=>{
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown",onKeyDown);document.removeEventListener("keyup",onKeyUp);
      renderer.domElement.removeEventListener("click",onClick);window.removeEventListener("resize",onResize);
      controls.dispose();renderer.dispose();
      if(container.contains(renderer.domElement))container.removeChild(renderer.domElement);
      npcsRef.current=[];ammoPickRef.current=[];hpPickRef.current=[];carRef.current=null;
    };
  },[selectedMap,flash,showHit,showMuzzle]);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const timeColor=timeLabel==="Night"?"text-blue-200":timeLabel==="Dawn"?"text-orange-300":timeLabel==="Sunset"?"text-red-300":"text-yellow-200";
  const weatherIcon=weather==="storm"?"⛈":weather==="rain"?"🌧":"☀️";
  const hpGrad=hp>60?"from-green-600 to-green-400":hp>30?"from-yellow-600 to-yellow-400":"from-red-700 to-red-400";
  const stGrad=stamina>50?"from-sky-600 to-sky-400":stamina>25?"from-amber-500 to-amber-300":"from-orange-600 to-orange-400";

  // ── Map select ────────────────────────────────────────────────────────────
  if(!selectedMap)return(
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans select-none">
      <div className="absolute inset-0 opacity-7" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
      <div className="relative z-10 w-full max-w-4xl px-6 text-center">
        <div className="text-6xl mb-3">🌍</div>
        <h1 className="font-display text-5xl font-bold text-amber-400 mb-2 drop-shadow-[0_0_24px_rgba(244,180,26,0.4)]">Ranjha World</h1>
        <p className="text-white/40 font-display uppercase tracking-widest text-sm mb-8">Select your battlefield</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {MAPS.map(m=>{
            const tags={hunza:["Mountains","Glacier","Snow Peaks"],lahore:["Mughal Ruins","Arches","Post-Apocalyptic"],multan:["Sand Dunes","Desert","Dry Terrain"],karachi:["Coastal","Ocean Waves","Beach"]}[m.id]||[];
            return(
              <button key={m.id} onClick={()=>setSelectedMap(m)}
                className="group relative p-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-left transition-all hover:scale-[1.02]">
                <div className="flex items-start gap-4">
                  <div className="text-4xl mt-0.5">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl font-bold text-white uppercase tracking-wider mb-0.5">{m.name}</div>
                    <div className="text-white/40 text-sm leading-relaxed">{m.desc}</div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {tags.map(t=><span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-amber-500/12 border border-amber-500/25 text-amber-400">{t}</span>)}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-blue-500/12 border border-blue-500/25 text-blue-300">Car • Loot • NPC AI</span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 right-4 text-amber-400 opacity-0 group-hover:opacity-80 font-display text-sm uppercase tracking-widest transition-opacity">Play →</div>
              </button>
            );
          })}
        </div>
        <button onClick={()=>setLocation("/lobby")} className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/45 font-display uppercase tracking-widest text-sm transition-colors">← Back to Lobby</button>
      </div>
    </div>
  );

  // ── Game screen ───────────────────────────────────────────────────────────
  return(
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
      <div ref={mountRef} className="absolute inset-0"/>

      {/* Thunder flash */}
      {thunderFlash>0&&<div className="absolute inset-0 z-30 pointer-events-none" style={{background:`rgba(220,235,255,${thunderFlash*0.55})`}}/>}

      {/* Muzzle flash */}
      {muzzleFlash&&<div className="absolute inset-0 z-20 pointer-events-none" style={{background:"rgba(255,220,100,0.11)"}}/>}

      {/* Lock overlay */}
      {!locked&&hp>0&&(
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/78 backdrop-blur-sm cursor-pointer"
          onClick={()=>mountRef.current?.querySelector("canvas")?.requestPointerLock()}>
          <div className="text-center space-y-4 px-8 max-w-sm">
            <div className="text-5xl">{selectedMap.emoji}</div>
            <h1 className="font-display text-4xl font-bold text-amber-400">{selectedMap.name}</h1>
            <p className="text-white/65 font-display uppercase tracking-widest">Click to Enter</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-white/45 font-display text-left max-w-xs mx-auto">
              <p>WASD — Move</p>    <p>Mouse — Look</p>
              <p>Click — Shoot</p>  <p>R — Reload</p>
              <p>Shift — Sprint</p> <p>Space — Jump</p>
              <p>F — Enter/Exit Car</p><p>P — Weather</p>
            </div>
            <button onClick={e=>{e.stopPropagation();setSelectedMap(null);}}
              className="mt-1 px-5 py-2 bg-white/7 hover:bg-white/14 border border-white/10 rounded-lg text-white/45 font-display uppercase tracking-widest text-sm">← Change Map</button>
          </div>
        </div>
      )}

      {/* Crosshair */}
      {locked&&hp>0&&!inCar&&(
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {hitMarker?(
            <div className="w-10 h-10 flex items-center justify-center text-red-400 text-2xl font-bold">✕</div>
          ):(
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
        <div key={d.id} className="absolute z-40 pointer-events-none font-display font-bold text-red-400 text-lg drop-shadow"
          style={{left:`${d.x}%`,top:`${d.y}%`,transform:"translate(-50%,-100%)",animation:"bounce 0.8s ease-out"}}>
          -{d.v}
        </div>
      ))}

      {/* ── HUD ── */}
      {locked&&hp>0&&(
        <>
          {/* Minimap */}
          <div className="absolute top-4 left-4 z-20" style={{width:152,height:152}}>
            <div className="relative w-full h-full rounded-xl bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 opacity-12" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.18) 1px,transparent 1px)",backgroundSize:"19px 19px"}}/>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-300/50 z-10"/>
              {/* Car on minimap */}
              {carRef.current&&(()=>{const cp=carRef.current!.group.position;const cx=50+(cp.x-0)/5;const cy=50+(cp.z-0)/5;if(cx<2||cx>98||cy<2||cy>98)return null;return<div className="absolute w-3 h-2 rounded-sm bg-blue-400 -translate-x-1/2 -translate-y-1/2" style={{left:`${cx}%`,top:`${cy}%`}}/>;})()}
              {/* Health packs */}
              {hpPickRef.current.filter(p=>p.active).map((p,i)=>{const mp=((p.mesh as THREE.Group).position);const cx=50+mp.x/5;const cy=50+mp.z/5;if(cx<2||cx>98||cy<2||cy>98)return null;return<div key={i} className="absolute w-2 h-2 rounded-sm bg-green-400 -translate-x-1/2 -translate-y-1/2" style={{left:`${cx}%`,top:`${cy}%`}}/>;}).slice(0,6)}
              {/* NPCs */}
              {miniDots.map((d,i)=>{const cx=50+d.x,cy=50+d.z;if(cx<2||cx>98||cy<2||cy>98)return null;
                const col=d.state==="attack"?"bg-orange-500 animate-ping":d.state==="chase"?"bg-orange-400 animate-pulse":d.state==="investigate"?"bg-yellow-400":"bg-red-500";
                return<div key={i} className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${col}`} style={{left:`${cx}%`,top:`${cy}%`}}/>;
              })}
              <div className="absolute bottom-1 left-2 text-[8px] font-display uppercase tracking-widest text-white/40 truncate max-w-[88%]">{selectedMap.name}</div>
              <div className="absolute top-1 right-2 text-[7px] font-display text-white/35">⬆N</div>
            </div>
          </div>

          {/* Top centre */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span>{weatherIcon}</span>
              <span className={`font-display text-sm font-bold uppercase tracking-wider ${timeColor}`}>{timeLabel}</span>
              {weather!=="clear"&&<span className="text-white/30 font-display text-xs uppercase">· {weather}</span>}
            </div>
          </div>

          {/* Top right */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
            <div className="px-3 py-2 rounded-lg bg-black/65 border border-amber-500/40 backdrop-blur-md flex items-center gap-2">
              <span className="text-amber-400 text-xs font-display uppercase tracking-widest">Kills</span>
              <span className="font-display text-2xl font-bold text-amber-400 tabular-nums">{kills}</span>
            </div>
            {combo>=2&&(
              <div className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                <span className="font-display text-xs uppercase text-red-300">x{combo} {combo>=5?"RAMPAGE":"MULTI"}</span>
                <span>{combo>=5?"🔥":"⚡"}</span>
              </div>
            )}
          </div>

          {/* Bottom left — bars */}
          <div className="absolute bottom-5 left-5 z-20 w-64 space-y-2">
            <div className="rounded-xl bg-black/72 border border-white/10 backdrop-blur-md p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-red-400 w-8">HP</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${hpGrad} transition-all duration-300`} style={{width:`${hp}%`}}/>
                </div>
                <span className="font-display text-sm font-bold tabular-nums text-white/80 w-7 text-right">{hp}</span>
              </div>
              {!inCar&&<div className="flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-widest text-sky-400 w-8">STM</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${stGrad} transition-all duration-150`} style={{width:`${stamina}%`}}/>
                </div>
                <span className="font-display text-xs tabular-nums text-white/45 w-7 text-right">{stamina}</span>
              </div>}
              <div className="flex items-center gap-2">
                {inCar?(<><span className="text-base">🚗</span><span className="font-display text-xl font-bold text-sky-300">Driving</span><span className="ml-auto text-[9px] font-display text-white/35 uppercase">[F] exit</span></>):(<>
                  <span className="text-base">🔫</span>
                  <span className={`font-display text-2xl font-bold tabular-nums ${ammo<=5?"text-red-400 animate-pulse":"text-amber-300"}`}>{ammo}</span>
                  <span className="text-white/28 text-xs font-display">/ 30</span>
                  <span className="ml-auto text-[9px] text-white/28 font-display uppercase">[R]</span>
                </>)}
              </div>
            </div>
            <div className="text-[9px] font-display uppercase tracking-widest text-white/20 text-center">
              [P] weather · [Shift] sprint · [Space] jump · [F] car
            </div>
          </div>

          {/* Near car prompt */}
          {nearCar&&(
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-black/80 border border-blue-400/40 backdrop-blur-md font-display text-sm uppercase tracking-widest text-blue-300">
              [F] Enter Vehicle
            </div>
          )}

          {hp<30&&<div className="absolute inset-0 pointer-events-none z-10 animate-pulse" style={{boxShadow:"inset 0 0 160px rgba(200,10,10,0.65)"}}/>}

          {notice&&(
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-lg bg-black/82 border border-amber-500/40 backdrop-blur-md font-display text-sm uppercase tracking-widest text-amber-300">{notice}</div>
          )}

          {/* Legend */}
          <div className="absolute bottom-5 right-5 z-20 space-y-1">
            {[{col:"bg-orange-500",l:"Shooting"},{col:"bg-orange-400",l:"Chasing"},{col:"bg-yellow-400",l:"Alert"},{col:"bg-red-500",l:"Patrol"},{col:"bg-green-400",l:"Health"},{col:"bg-blue-400",l:"Vehicle"}]
              .map((x,i)=><div key={i} className="flex items-center gap-2 text-[9px] font-display uppercase tracking-widest text-white/38"><div className={`w-2 h-2 rounded-full ${x.col}`}/>{x.l}</div>)}
          </div>
        </>
      )}

      {/* Death */}
      {hp<=0&&(
        <div className="absolute inset-0 z-40 bg-red-950/88 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="text-7xl mb-4">💀</div>
          <h2 className="font-display text-6xl font-bold text-red-400 mb-2">Eliminated</h2>
          <p className="text-white/55 font-display uppercase tracking-widest text-sm">
            Kills: <span className="text-amber-400 font-bold">{kills}</span>
            {kills>=10?<span className="ml-2 text-amber-300">🏆 Legend</span>:kills>=5?<span className="ml-2 text-white/60">⭐ Warrior</span>:null}
          </p>
          <div className="flex gap-3 mt-8">
            <button onClick={()=>setSelectedMap(null)} className="px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-display uppercase tracking-widest rounded-lg text-sm">Change Map</button>
            <button onClick={()=>{hpRef.current=100;setHp(100);ammoRef.current=30;setAmmo(30);}} className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/18 text-white font-display uppercase tracking-widest rounded-lg text-sm">Respawn</button>
            <button onClick={()=>setLocation("/lobby")} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/8 text-white/45 font-display uppercase tracking-widest rounded-lg text-sm">Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}
