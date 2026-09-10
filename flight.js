import * as THREE from './vendor/three.module.js';

// A perspective camera follows authored positions and look-at targets. Geometry
// occupies actual depth; distances are composed for storytelling, not an ephemeris.
const viewport = document.querySelector('.journey-viewport');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' }); }
catch { console.info('WebGL unavailable: retaining the canvas journey.'); }
if (renderer) initialize();

function initialize() {
  renderer.domElement.className = 'flight-canvas';
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.015,500000);
  const ambient = new THREE.AmbientLight(0xb3c6e1,.28); scene.add(ambient);
  const earthFill = new THREE.Color(0x9db9d6), solarFill = new THREE.Color(0xe6d4b9);
  const light = new THREE.DirectionalLight(0xfff0d7,2.8); light.position.set(-30,25,40); scene.add(light);
  const solar = new THREE.Group(); scene.add(solar);
  const loader = new THREE.TextureLoader();
  let progress = 0, lastRendered = -1, renderCount = 0, lastRenderMs = 0;
  const target = new THREE.Vector3(), projected = new THREE.Vector3();
  const textures = [];
  function map(url) {
    const texture = loader.load(url,()=>render(progress,true),undefined,()=>console.info('Texture unavailable:',url));
    texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); textures.push(texture); return texture;
  }
  const geometry = new THREE.SphereGeometry(1,64,48);
  const bodies = {};
  function body(id,radius,position,url,emissive=false) {
    const texture=map(url);
    const material=emissive ? new THREE.MeshBasicMaterial({map:texture}) : new THREE.MeshStandardMaterial({map:texture,roughness:1});
    const mesh=new THREE.Mesh(geometry,material); mesh.scale.setScalar(radius); mesh.position.set(...position); mesh.userData={id,radius}; solar.add(mesh); bodies[id]=mesh; return mesh;
  }
  body('earth',1,[0,0,0],'assets/earth-blue-marble.jpg');
  body('moon',.273,[3.4,.3,-1.2],'assets/moon-lroc.jpg');
  body('sun',7,[-45,-3,-35],'assets/maps/sun.jpg',true);
  body('mercury',.38,[-31,1,-26],'assets/maps/mercury.jpg');
  body('venus',.95,[-18,-1,-12],'assets/maps/venus_atmosphere.jpg');
  body('mars',.53,[16,2,-14],'assets/maps/mars.jpg');
  body('jupiter',4,[45,-2,-38],'assets/maps/jupiter.jpg');
  const saturn=body('saturn',3.3,[90,5,-70],'assets/maps/saturn.jpg');
  body('uranus',1.8,[130,-7,-120],'assets/maps/uranus.jpg');
  body('neptune',1.7,[165,3,-185],'assets/maps/neptune.jpg');
  const ringGeometry = new THREE.RingGeometry(1.25,2.25,180,10);
  const ring=new THREE.Mesh(ringGeometry,new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:'varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 p; void main(){float r=length(p);float band=0.58+0.2*sin(r*210.0)+0.12*sin(r*530.0);float gap=1.0-smoothstep(1.89,1.91,r)*(1.0-smoothstep(1.96,1.98,r));float edge=smoothstep(1.25,1.38,r)*(1.0-smoothstep(2.18,2.25,r));gl_FragColor=vec4(vec3(0.66,0.59,0.46)*band,edge*gap*0.72);}'
  }));
  ring.rotation.x=-Math.PI/2; saturn.add(ring);saturn.rotation.z=.42;
  const atmosphere=new THREE.Mesh(geometry,new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n; varying vec3 v; void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0); gl_FragColor=vec4(0.15,0.43,0.75,rim*0.45);}'
  })); atmosphere.scale.setScalar(1.012);bodies.earth.add(atmosphere);
  // Seeded particles make forward and reverse travel render the same universe.
  let seed=721; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=32;
  const glowContext=glowCanvas.getContext('2d');const glow=glowContext.createRadialGradient(16,16,0,16,16,16);
  glow.addColorStop(0,'#fff');glow.addColorStop(.2,'#ffffffc0');glow.addColorStop(1,'#ffffff00');glowContext.fillStyle=glow;glowContext.fillRect(0,0,32,32);
  const starMap=new THREE.CanvasTexture(glowCanvas);
  function points(count,generate,size) {
    const vertices=[],colors=[];
    for(let i=0;i<count;i++){const [x,y,z,w,tint=[.82,.85,.88]]=generate(i);vertices.push(x,y,z);colors.push(tint[0]*w,tint[1]*w,tint[2]*w);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const m=new THREE.PointsMaterial({size,map:starMap,vertexColors:true,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});return new THREE.Points(g,m);
  }
  const spectrum=[[1,.65,.42],[1,.87,.68],[.9,.93,1],[.63,.76,1]];
  const stars=points(3500,()=>[(random()-.5)*180000,(random()-.5)*180000,(random()-.5)*180000,.2+Math.pow(random(),3)*.8,spectrum[Math.floor(random()*4)]],22);scene.add(stars);
  const field=(x,z)=>.5+.22*Math.sin(x*13+Math.sin(z*9))+.17*Math.sin(z*23-x*7)+.1*Math.cos(x*41+z*29);
  const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(random(),1e-8)))*Math.cos(random()*Math.PI*2);
  function galaxy(radius,count,phase=0) {
    const result = points(count,i=>{
      const core=i%5===0;
      if(core) return [gaussian()*radius*.10,gaussian()*radius*.026,gaussian()*radius*.06,.22+random()*.55,[1,.76,.48]];
      const r=Math.pow(random(),.85)*radius;
      const u=r/radius;
      // Unequal arm strengths, a diffuse disk and a vertically warped outer disk.
      const arm=i%4, armPhase=[0,1.7,3.3,4.65][arm];
      const angle=u*4.8+armPhase+phase+(random()-.5)*(i%6===0?5.8:.85+u*.6);
      const x=Math.cos(angle)*r*(1+.07*Math.sin(angle+phase));
      const z=Math.sin(angle)*r;
      const y=(random()-.5)*radius*.035*(1-u)+Math.sin(angle*2+phase)*u*u*radius*.035;
      const clump=field(x/radius,z/radius);
      // Dust preferentially suppresses the disk near the inner edge of each arm.
      const lane=Math.pow(Math.max(0,Math.sin(angle-u*4.8-phase+.3)),10);
      const extinction=Math.exp(-lane*(.6+clump)*2.3);
      const brightness=.18+Math.pow(random(),3)*.7;
      const tint=i%7===0?[.6,.76,1]:[.87,.85,.8];
      return [x,y,z,brightness*(.45+clump*.75)*extinction,tint];
    },radius*.006);
    const nucleus=new THREE.Sprite(new THREE.SpriteMaterial({map:starMap,color:0xe8b879,transparent:true,opacity:.32,depthWrite:false,blending:THREE.AdditiveBlending}));
    nucleus.scale.set(radius*.38,radius*.21,1);result.add(nucleus);return result;
  }
  const milky=galaxy(2200,18000);scene.add(milky);
  const andromeda=galaxy(2800,12000,.7);andromeda.position.set(8500,900,-5000);andromeda.rotation.set(.4,.3,.2);scene.add(andromeda);
  const nodes=Array.from({length:65},()=>new THREE.Vector3((random()-.5)*54000,(random()-.5)*40000,(random()-.5)*54000));
  const edges=[];
  nodes.forEach((node,index)=>{nodes.map((other,j)=>({j,d:node.distanceTo(other)})).filter(x=>x.j!==index).sort((a,b)=>a.d-b.d).slice(0,3).forEach(({j})=>{if(j>index)edges.push([node,nodes[j]]);});});
  const web=points(14000,i=>{
    const edge=edges[i%edges.length];
    // More galaxies collect around nodes; connecting filaments stay faint and narrow.
    const t=i%4===0?Math.pow(random(),3):(i%4===1?1-Math.pow(random(),3):random());
    const v=edge[0].clone().lerp(edge[1],t), bend=Math.sin(t*Math.PI);
    const thickness=180+700*Math.pow(Math.abs(t-.5)*2,3);
    const spread=i%9===0?1800:thickness;
    v.x+=bend*Math.sin(i%edges.length*1.73)*1100;v.y+=bend*Math.cos(i%edges.length*2.31)*800;
    const density=.2+.6*Math.pow(Math.abs(t-.5)*2,2);
    return [v.x+(random()-.5)*spread,v.y+(random()-.5)*spread,v.z+(random()-.5)*spread,density*(.25+random()*.75),[.8,.83,.85]];
  },65);scene.add(web);
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(47000,64,32),new THREE.ShaderMaterial({uniforms:{reveal:{value:0}},transparent:true,side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:'uniform float reveal;varying vec3 n;varying vec3 v;void main(){float edge=pow(1.0-abs(dot(normalize(n),normalize(v))),5.0);gl_FragColor=vec4(0.35,0.55,0.68,edge*0.13*reveal);}'
  }));scene.add(horizon);
  const keys=[];
  const add=(p,id,pos,target,roll=0)=>keys.push({p,id,pos:new THREE.Vector3(...pos),target:new THREE.Vector3(...target),roll});
  add(0,'earth',[0,.8,1.3],[0,.5,0],-.12);
  add(.04,'earth',[1.6,.7,2.7],[0,0,0],.06);
  add(.08,'earth',[-1,1.8,4.2],[0,0,0],.12);
  add(.12,'moon',[4.2,.7,-.4],[3.4,.3,-1.2],-.1);
  add(.15,'earth',[5,3,9],[1.2,0,0],0);
  const visits=[['sun',.18],['mercury',.225],['venus',.27],['mars',.315],['jupiter',.365],['saturn',.42],['uranus',.475],['neptune',.525]];
  visits.forEach(([id,p],index)=>{const mesh=bodies[id],r=mesh.userData.radius*(id==='saturn'?1.65:1),c=mesh.position;const side=index%2?1:-1;add(p-.016,id,[c.x+side*r*1.8,c.y+r*.85,c.z+r*3.2],c.toArray(),side*.08);add(p+.016,id,[c.x-side*r*1.3,c.y+r*1.3,c.z+r*3.5],c.toArray(),-side*.08);});
  add(.565,'sun',[220,110,350],[0,0,0],.05);
  add(.63,'milky-way',[0,850,2100],[0,0,0],-.18);
  add(.69,'milky-way',[3200,2400,3600],[0,0,0],.12);
  add(.755,'milky-way',[-2500,4100,6800],[0,0,0],.06);
  add(.81,'andromeda',[10000,4500,2500],[8500,900,-5000],-.15);
  add(.865,'cosmic-web',[11000,15000,21000],[2000,0,-1000],.14);
  add(.935,'cosmic-web',[-16000,21000,48000],[0,0,0],-.12);
  add(1,'universe',[18000,33000,105000],[0,0,0],0);
  const path=new THREE.CatmullRomCurve3(keys.map(k=>k.pos),false,'centripetal');
  const caption=document.createElement('div');caption.className='flight-caption';caption.innerHTML='<p>CAMERA FLIGHT / EARTH SYSTEM</p><h2>Earth</h2><a href="planets.html#earth">Explore Earth ↗</a>';viewport.append(caption);
  const controls=document.createElement('div');controls.className='flight-controls';controls.innerHTML='<button class="flight-play">▶ Play flight</button><button class="flight-scales">Choose a stop</button><span>SCROLL TO FLY · CLICK + TO EXPLORE</span>';viewport.append(controls);
  const marker=document.createElement('button');marker.className='flight-marker';marker.textContent='+';viewport.append(marker);
  const annotation=document.createElement('aside');annotation.className='flight-annotation';annotation.setAttribute('aria-label','Scale measurement');
  annotation.innerHTML='<strong></strong><span></span>';viewport.append(annotation);
  // Rounded reference quantities, not distances inferred from the composed geometry.
  const annotations=[
    [.10,.145,'384,400 KM','EARTH–MOON · MEAN DISTANCE'],
    [.17,.20,'1 AU ≈ 149.6 MILLION KM','EARTH’S MEAN DISTANCE FROM THE SUN'],
    [.635,.68,'≈ 26,000 LIGHT-YEARS','SUN TO GALACTIC CENTER'],
    [.685,.748,'≈ 100,000 LIGHT-YEARS','MILKY WAY · STELLAR DISK DIAMETER'],
    [.755,.79,'THE LOCAL GROUP','GALAXIES ON MILLION-LIGHT-YEAR SCALES'],
    [.795,.845,'≈ 2.5 MILLION LIGHT-YEARS','ANDROMEDA · DISTANCE FROM EARTH'],
    [.87,.94,'FILAMENTS & VOIDS','ILLUSTRATED LARGE-SCALE GALAXY DENSITY'],
    [.955,1.01,'≈ 92 BILLION LIGHT-YEARS','OBSERVABLE UNIVERSE · DIAMETER TODAY'],
  ];
  let previousAnnotation=null,previousSubject='',previousChapter='';
  let id='earth',running=false,raf=0,last=0;
  const title=caption.querySelector('h2'),link=caption.querySelector('a');
  const names={'milky-way':'The Milky Way','cosmic-web':'The cosmic web',universe:'The observable universe'};
  const href=value=>(['milky-way','andromeda','cosmic-web','universe'].includes(value)?'deep-space.html#':'planets.html#')+value;
  marker.addEventListener('click',()=>location.href=href(id));
  controls.querySelector('.flight-scales').addEventListener('click',()=>{pause();document.querySelector('.menu-button').click();});
  const play=controls.querySelector('.flight-play');
  function pause(){running=false;cancelAnimationFrame(raf);play.textContent=progress>=.999?'↻ Replay flight':'▶ Play flight';play.setAttribute('aria-pressed','false');}
  function tick(now){if(!running)return;const dt=Math.min(now-last,50);last=now;const departure=document.querySelector('.departure');const total=departure.offsetHeight-innerHeight;const p=Math.max(0,(scrollY-departure.offsetTop)/total)+dt/240000;scrollTo({top:departure.offsetTop+Math.min(1,p)*total,behavior:'instant'});if(p>=1)pause();else raf=requestAnimationFrame(tick);}
  play.setAttribute('aria-pressed','false');play.addEventListener('click',()=>{if(running){pause();return;}if(progress>=.999){const departure=document.querySelector('.departure');scrollTo({top:departure.offsetTop,behavior:'instant'});render(0);}running=true;last=performance.now();play.textContent='Ⅱ Pause flight';play.setAttribute('aria-pressed','true');raf=requestAnimationFrame(tick);});
  ['wheel','touchstart','keydown'].forEach(event=>window.addEventListener(event,pause,{passive:true}));
  document.addEventListener('visibilitychange',()=>{pause();if(!document.hidden)render(progress,true);});
  document.addEventListener('click',event=>{if(event.target.closest('.burger'))pause();});
  function render(p,force=false) {
    progress=p;
    if(document.hidden || (!force && p===lastRendered)) return;
    const renderStart=performance.now();lastRendered=p;
    let index=keys.findIndex(k=>k.p>=p);if(index<1)index=1;
    const a=keys[index-1],b=keys[index];const t=THREE.MathUtils.clamp((p-a.p)/(b.p-a.p),0,1);const ease=t*t*(3-2*t);
    camera.position.copy(path.getPoint((index-1+t)/(keys.length-1)));
    target.copy(a.target).lerp(b.target,ease);
    // Increase camera stand-off only for narrow screens to preserve whole subjects.
    if(innerWidth<700)camera.position.sub(target).multiplyScalar(1.45).add(target);
    camera.up.set(Math.sin(THREE.MathUtils.lerp(a.roll,b.roll,ease)),1,0);camera.lookAt(target);camera.updateMatrixWorld();
    id=t<.5?a.id:b.id;
    // Keep the title and inspection target with the visible subject during handoffs.
    if(p>=.59) id=p<.775?'milky-way':p<.865?'andromeda':p<.955?'cosmic-web':'universe';
    const localSpace=THREE.MathUtils.smoothstep(p,.71,.82);
    stars.material.opacity=THREE.MathUtils.lerp(.7,.12,localSpace);
    const sunlight=THREE.MathUtils.smoothstep(p,.135,.175);
    ambient.color.copy(earthFill).lerp(solarFill,sunlight);
    ambient.intensity=THREE.MathUtils.lerp(.25,.19,sunlight);
    solar.visible=p<.63;
    Object.values(bodies).forEach((mesh,i)=>{mesh.rotation.y=p*(i%2?1:-1)*1.6;});
    const shrink=1-THREE.MathUtils.smoothstep(p,.55,.62);solar.scale.setScalar(Math.max(.001,shrink));
    milky.visible=p>.55&&p<.89;andromeda.visible=p>.71&&p<.89;web.visible=p>.83;horizon.visible=p>.93;horizon.material.uniforms.reveal.value=THREE.MathUtils.smoothstep(p,.93,.975);
    const groupFade=1-THREE.MathUtils.smoothstep(p,.845,.89);
    milky.material.opacity=THREE.MathUtils.smoothstep(p,.55,.63)*.85*groupFade;
    andromeda.material.opacity=.8*groupFade*THREE.MathUtils.smoothstep(p,.71,.77);
    milky.children[0].material.opacity=.32*groupFade;andromeda.children[0].material.opacity=.26*groupFade*THREE.MathUtils.smoothstep(p,.71,.77);
    web.material.opacity=THREE.MathUtils.smoothstep(p,.83,.91)*.65;
    if(!running)play.textContent=p>=.999?'↻ Replay flight':'▶ Play flight';
    const name=names[id]||id[0].toUpperCase()+id.slice(1);
    const chapter=p<.15?'EARTH SYSTEM':p<.55?'SOLAR SYSTEM':p<.59?'STELLAR NEIGHBORHOOD':p<.755?'MILKY WAY':p<.865?'LOCAL GROUP':'COSMOLOGICAL SCALES';
    if(previousSubject!==id){title.textContent=name;link.textContent=`Explore ${name} ↗`;link.href=href(id);marker.setAttribute('aria-label',`Explore ${name}`);previousSubject=id;}
    if(previousChapter!==chapter){caption.querySelector('p').textContent=chapter;previousChapter=chapter;}
    const note=annotations.find(row=>p>=row[0]&&p<=row[1]);
    if(note!==previousAnnotation){annotation.querySelector('strong').textContent=note?.[2]||'';annotation.querySelector('span').textContent=note?.[3]||'';previousAnnotation=note;}
    const noteOpacity=note?THREE.MathUtils.smoothstep(p,note[0],note[0]+.006)*(1-THREE.MathUtils.smoothstep(p,note[1]-.006,note[1])):0;
    annotation.style.opacity=noteOpacity.toFixed(3);annotation.setAttribute('aria-hidden',String(noteOpacity<.15));
    const point=(bodies[id]?bodies[id].getWorldPosition(projected):id==='andromeda'?projected.copy(andromeda.position):projected.set(0,0,0)).project(camera);
    const markerVisible=point.z>=-1 && point.z<=1 && Math.abs(point.x)<.92 && Math.abs(point.y)<.86;
    marker.hidden=!markerVisible;
    marker.style.left=`${THREE.MathUtils.clamp((point.x*.5+.5)*innerWidth,45,innerWidth-45)}px`;marker.style.top=`${THREE.MathUtils.clamp((-point.y*.5+.5)*innerHeight,100,innerHeight-240)}px`;
    renderer.render(scene,camera);renderCount++;lastRenderMs=performance.now()-renderStart;
    viewport.dataset.subject=id;
  }
  window.setFlightStops?.(true);
  window.renderCosmosFlight=render;
  document.body.classList.add('has-flight');render(0);
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render(progress,true);});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();delete window.renderCosmosFlight;window.setFlightStops?.(false);document.body.classList.remove('has-flight');renderer.domElement.hidden=true;caption.hidden=true;controls.hidden=true;marker.hidden=true;annotation.hidden=true;window.dispatchEvent(new Event('scroll'));});
  // Read-only camera and render diagnostics for path and performance checks.
  window.cosmosFlightState=()=>({progress,renderCount,lastRenderMs,drawCalls:renderer.info.render.calls,points:renderer.info.render.points,triangles:renderer.info.render.triangles,subject:id,camera:camera.position.toArray(),target:keys.find(k=>k.id===id)?.target.toArray()});
  if(location.hash) { const stop=[...document.querySelectorAll('.scale-index__list a')].find(a=>a.hash===location.hash);if(stop){const d=document.querySelector('.departure');scrollTo({top:d.offsetTop+(d.offsetHeight-innerHeight)*Number(stop.dataset.progress),behavior:'instant'});} }
  window.dispatchEvent(new Event('scroll'));
}
