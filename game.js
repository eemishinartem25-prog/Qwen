// ПРОВЕРКА ЗАГРУЗКИ
if(typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="color:#ff0;font-size:24px;text-align:center;padding:50px;">⚠️ Ошибка загрузки движка.<br>Обновите страницу (F5)</div>';
} else {

var isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||('ontouchstart' in window);
var gameState='LOBBY',gameMode='bomb',selectedMap='inferno',selectedAgent=0;
var totalWins=parseInt(localStorage.getItem('ms_wins')||'0');
var weaponRecoil=0,weaponBob=0,weaponSwayX=0,weaponSwayY=0,reloadAnim=0,headBob=0;
var soundEvents=[];
var zeus={charges:1,maxCharges:1,rechargeTime:30,rechargeTimer:0,range:3.5,damage:500};
var knife={damage:100,range:2.5,cooldown:800,lastSwing:0,swingAnim:0,speedBoost:1.4};
var ability={cooldown:0,maxCooldown:30,active:false,timer:0};
var settings=JSON.parse(localStorage.getItem('ms_settings')||'null')||{chColor:'#00ff00',chSize:12,chThick:2,chGap:4,chDynamic:true,sndVol:50};
var grenades={he:0,flash:0,smoke:0,molotov:0};
var currentGrenade='he';
var sliding=false,slideTimer=0;
var droppedWeapons=[];
var doorList=[];
var soundVol=0.5;
function applyCrosshairSettings(){var ch=document.getElementById('crosshair');ch.style.setProperty('--ch-color',settings.chColor);ch.style.setProperty('--ch-size',settings.chSize+'px');ch.style.setProperty('--ch-thick',settings.chThick+'px');ch.style.setProperty('--ch-gap',settings.chGap+'px');}
applyCrosshairSettings();
function addSoundEvent(pos,team,type){soundEvents.push({pos:pos.clone(),team:team,type:type,time:performance.now(),radius:type==='shot'?45:20});if(soundEvents.length>20)soundEvents.shift();}
function getActiveSoundEvents(now){return soundEvents.filter(function(e){return now-e.time<3000;});}
var agents=[
{name:'РЕКРУТ',color:0x4488cc,accentColor:0x2266aa,wins:0,speedBonus:0,hpBonus:0,accuracyBonus:0,ability:'none',abilityName:'-',abilityDesc:'Нет способности',desc:'Базовый агент'},
{name:'ШТУРМ',color:0x2244aa,accentColor:0x1133aa,wins:3,speedBonus:0.08,hpBonus:0,accuracyBonus:0.05,ability:'dash',abilityName:'РЫВОК',abilityDesc:'Быстрый рывок вперёд',desc:'+8% скорость'},
{name:'ЩИТ',color:0x555577,accentColor:0x333355,wins:7,speedBonus:0,hpBonus:15,accuracyBonus:0.08,ability:'shield',abilityName:'ЩИТ',abilityDesc:'Мобильный щит на 5с',desc:'+15 HP'},
{name:'IDF',color:0x886644,accentColor:0x664422,wins:15,speedBonus:0.12,hpBonus:10,accuracyBonus:0.03,ability:'none',abilityName:'-',abilityDesc:'Нет',desc:'+12% скорость'},
{name:'SEAL',color:0x224422,accentColor:0x113311,wins:25,speedBonus:0.05,hpBonus:20,accuracyBonus:0.1,ability:'drone',abilityName:'ДРОН',abilityDesc:'Разведка 3с',desc:'+20 HP'},
{name:'СПЕЦНАЗ',color:0x8b0000,accentColor:0x550000,wins:40,speedBonus:0.1,hpBonus:30,accuracyBonus:0.12,ability:'dash',abilityName:'РЫВОК',abilityDesc:'Рывок',desc:'+30 HP'},
{name:'ЭЛИТА',color:0xddaa00,accentColor:0xbb8800,wins:60,speedBonus:0.15,hpBonus:40,accuracyBonus:0.15,ability:'thermo',abilityName:'ТЕРМО',abilityDesc:'Видишь врагов сквозь дым 4с',desc:'+40 HP'},
{name:'БОГ',color:0xffffff,accentColor:0xffd700,wins:100,speedBonus:0.25,hpBonus:100,accuracyBonus:0.2,ability:'all',abilityName:'ОМНИ',abilityDesc:'Все способности сразу',desc:'🔱 +100 HP',isGod:true}
];
var mapsByMode={bomb:['inferno','dust2','mirage','cache'],dm:['nuke','vertigo','train','overpass']};
var scene=new THREE.Scene();scene.background=new THREE.Color(0xd4a574);scene.fog=new THREE.FogExp2(0xd4a574,0.006);
var camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,500);
var renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
renderer.outputEncoding=THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffeecc,0x886644,1.05));
scene.add(new THREE.AmbientLight(0xffddaa,0.55));
var sun=new THREE.DirectionalLight(0xffeecc,1.45);sun.position.set(60,120,50);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;
sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.bias=-0.0003;scene.add(sun);
var fillLight=new THREE.DirectionalLight(0x88aacc,0.65);fillLight.position.set(-40,60,-30);scene.add(fillLight);
var particles=[],grenadeProjectiles=[];
function createParticle(opts){var geo=opts.geo||new THREE.SphereGeometry(0.05,4,4);var mat=opts.mat||new THREE.MeshBasicMaterial({color:opts.color||0xffff00});var mesh=new THREE.Mesh(geo,mat);mesh.position.copy(opts.pos);scene.add(mesh);particles.push({mesh:mesh,vel:opts.vel||new THREE.Vector3(),life:opts.life||2,maxLife:opts.life||2,gravity:opts.gravity!==undefined?opts.gravity:9.8,onDeath:opts.onDeath,rotSpeed:opts.rotSpeed||0});return mesh;}
function ejectShell(pos,yaw){var geo=new THREE.CylinderGeometry(0.015,0.02,0.1,6);var mat=new THREE.MeshStandardMaterial({color:0xddaa44,metalness:0.95,roughness:0.15});var right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));createParticle({geo:geo,mat:mat,pos:pos.clone().add(right.clone().multiplyScalar(0.3)).add(new THREE.Vector3(0,1.5,0)),vel:new THREE.Vector3(right.x*2+Math.random()*0.5,3+Math.random()*2,right.z*2+Math.random()*0.5),life:4,gravity:12,rotSpeed:15});}
function createBlood(pos){for(var i=0;i<12;i++){var geo=new THREE.SphereGeometry(0.04+Math.random()*0.06,4,4);var mat=new THREE.MeshBasicMaterial({color:i%2===0?0xaa0000:0x880000,transparent:true,opacity:0.9});createParticle({geo:geo,mat:mat,pos:pos.clone(),vel:new THREE.Vector3((Math.random()-0.5)*4,Math.random()*4,(Math.random()-0.5)*4),life:1.8});}}
function createMuzzleFlash(pos){var geo=new THREE.SphereGeometry(0.22,6,6);var mat=new THREE.MeshBasicMaterial({color:0xffaa00,transparent:true,opacity:1});createParticle({geo:geo,mat:mat,pos:pos.clone(),vel:new THREE.Vector3(0,0,0),life:0.1,gravity:0});var light=new THREE.PointLight(0xffaa00,5,12);light.position.copy(pos);scene.add(light);setTimeout(function(){scene.remove(light);},60);}
function createDust(pos){for(var i=0;i<5;i++){var geo=new THREE.SphereGeometry(0.12,4,4);var mat=new THREE.MeshBasicMaterial({color:0x886644,transparent:true,opacity:0.5});createParticle({geo:geo,mat:mat,pos:pos.clone(),vel:new THREE.Vector3((Math.random()-0.5)*0.7,0.5+Math.random()*0.5,(Math.random()-0.5)*0.7),life:1.3,gravity:0.5});}}
function createZeusEffect(from,to){var dist=from.distanceTo(to);var seg=Math.floor(dist*3);var pts=[from.clone()];for(var i=1;i<seg;i++){var t=i/seg;var p=from.clone().lerp(to,t);p.x+=(Math.random()-0.5)*0.3;p.y+=(Math.random()-0.5)*0.3;p.z+=(Math.random()-0.5)*0.3;pts.push(p);}pts.push(to.clone());for(var i=0;i<pts.length-1;i++){var geo=new THREE.CylinderGeometry(0.03,0.03,pts[i].distanceTo(pts[i+1]),4);var mat=new THREE.MeshBasicMaterial({color:0x55aaff,transparent:true,opacity:1});var mesh=new THREE.Mesh(geo,mat);mesh.position.copy(pts[i].clone().add(pts[i+1]).multiplyScalar(0.5));mesh.lookAt(pts[i+1]);mesh.rotateX(Math.PI/2);scene.add(mesh);(function(m,t){setTimeout(function(){scene.remove(m);},t);})(mesh,150+i*20);}var light=new THREE.PointLight(0x55aaff,8,15);light.position.copy(to);scene.add(light);setTimeout(function(){scene.remove(light);},200);var ov=document.getElementById('shock-overlay');ov.style.background='rgba(100,180,255,0.4)';setTimeout(function(){ov.style.background='rgba(100,180,255,0)';},150);}
function throwGrenade(type){if(grenades[type]<=0)return;grenades[type]--;updHUD();var fwd=new THREE.Vector3(-Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch)+0.3,-Math.cos(player.yaw)*Math.cos(player.pitch));var startPos=camera.position.clone().add(fwd.clone().multiplyScalar(0.5));var colors={he:0x445566,flash:0xcccccc,smoke:0x888888,molotov:0xaa4400};var geo=new THREE.SphereGeometry(0.15,8,8);var mat=new THREE.MeshStandardMaterial({color:colors[type],metalness:0.5});var mesh=new THREE.Mesh(geo,mat);mesh.position.copy(startPos);scene.add(mesh);grenadeProjectiles.push({mesh:mesh,vel:fwd.clone().multiplyScalar(18),type:type,life:2.0,bounces:0});}
function updateGrenades(dt){for(var i=grenadeProjectiles.length-1;i>=0;i--){var g=grenadeProjectiles[i];g.life-=dt;g.vel.y-=18*dt;g.mesh.position.add(g.vel.clone().multiplyScalar(dt));g.mesh.rotation.x+=dt*5;g.mesh.rotation.z+=dt*3;if(g.mesh.position.y<0.15){g.mesh.position.y=0.15;g.vel.y*=-0.4;g.vel.x*=0.7;g.vel.z*=0.7;g.bounces++;}for(var j=0;j<walls.length;j++){var w=walls[j];if(w.userData.isDoor&&w.userData.doorOpen)continue;var dx=Math.abs(g.mesh.position.x-w.position.x);var dz=Math.abs(g.mesh.position.z-w.position.z);if(dx<w.userData.w/2+0.15&&dz<w.userData.d/2+0.15&&g.mesh.position.y<w.userData.topY){if(dx-w.userData.w/2<w.userData.d/2-dz+0.3){g.vel.x*=-0.5;g.mesh.position.x=w.position.x+Math.sign(g.mesh.position.x-w.position.x)*(w.userData.w/2+0.2);}else{g.vel.z*=-0.5;g.mesh.position.z=w.position.z+Math.sign(g.mesh.position.z-w.position.z)*(w.userData.d/2+0.2);}g.bounces++;break;}}if(g.life<=0){detonateGrenade(g.type,g.mesh.position.clone());scene.remove(g.mesh);grenadeProjectiles.splice(i,1);}}}
function detonateGrenade(type,pos){if(type==='he'){snd('explode');for(var i=0;i<40;i++){var geo=new THREE.SphereGeometry(0.1+Math.random()*0.25,6,6);var mat=new THREE.MeshBasicMaterial({color:Math.random()>0.5?0xff6600:0xffaa00,transparent:true,opacity:1});createParticle({geo:geo,mat:mat,pos:pos.clone(),vel:new THREE.Vector3((Math.random()-0.5)*12,Math.random()*12,(Math.random()-0.5)*12),life:1.2,gravity:5});}var el=new THREE.PointLight(0xff6600,5,15);el.position.copy(pos);scene.add(el);setTimeout(function(){scene.remove(el);},200);var r=6;allBots.forEach(function(b){if(b.userData.alive){var d=b.position.distanceTo(pos);if(d<r&&b.userData.team!==player.team){b.userData.hp-=80*(1-d/r);createBlood(b.position.clone().add(new THREE.Vector3(0,1,0)));if(b.userData.hp<=0)killEntity(b,player);}}});if(player.alive){var d=player.pos.distanceTo(pos);if(d<r){player.hp-=80*(1-d/r)*0.5;showDamageOverlay();if(player.hp<=0){player.hp=0;player.alive=false;onPlayerDeath();}updHUD();}}}else if(type==='flash'){snd('flash');var fg=new THREE.SphereGeometry(2,8,8);var fm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1});var fmesh=new THREE.Mesh(fg,fm);fmesh.position.copy(pos);scene.add(fmesh);var fs=performance.now();var ff=function(){var el=(performance.now()-fs)/1000;if(el<0.5){fm.opacity=1-el*2;requestAnimationFrame(ff);}else scene.remove(fmesh);};ff();var r=20,d=player.pos.distanceTo(pos);if(player.alive&&d<r){var dir=new THREE.Vector3().subVectors(pos,player.pos).normalize();var fwd=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));var dot=dir.dot(fwd);player.blindTimer=Math.max(player.blindTimer,3*(dot>0.5?(1-d/r):(0.3*(1-d/r))));}allBots.forEach(function(b){if(b.userData.alive){var d=b.position.distanceTo(pos);if(d<r){var dir=new THREE.Vector3().subVectors(pos,b.position).normalize();var fwd=new THREE.Vector3(-Math.sin(b.rotation.y),0,-Math.cos(b.rotation.y));b.userData.blindTimer=Math.max(b.userData.blindTimer,3*(dir.dot(fwd)>0.5?(1-d/r):(0.3*(1-d/r))));}}});}else if(type==='smoke'){for(var i=0;i<25;i++)setTimeout(function(){var geo=new THREE.SphereGeometry(0.6+Math.random()*0.4,8,8);var mat=new THREE.MeshBasicMaterial({color:0xcccccc,transparent:true,opacity:0.7});createParticle({geo:geo,mat:mat,pos:pos.clone().add(new THREE.Vector3((Math.random()-0.5)*2,Math.random()*2,(Math.random()-0.5)*2)),vel:new THREE.Vector3((Math.random()-0.5)*0.5,0.5+Math.random()*0.5,(Math.random()-0.5)*0.5),life:10,gravity:-0.3});},i*40);}else if(type==='molotov'){snd('explode');for(var i=0;i<40;i++)setTimeout(function(){var geo=new THREE.SphereGeometry(0.2+Math.random()*0.3,6,6);var mat=new THREE.MeshBasicMaterial({color:Math.random()>0.5?0xff4400:0xffaa00,transparent:true,opacity:0.8});createParticle({geo:geo,mat:mat,pos:pos.clone().add(new THREE.Vector3((Math.random()-0.5)*3,0,(Math.random()-0.5)*3)),vel:new THREE.Vector3((Math.random()-0.5)*2,2+Math.random()*3,(Math.random()-0.5)*2),life:2,gravity:-1});},i*100);var r=4,ticks=0;var iv=setInterval(function(){ticks++;if(ticks>10){clearInterval(iv);return;}allBots.forEach(function(b){if(b.userData.alive&&b.userData.team!==player.team){var d=b.position.distanceTo(pos);if(d<r){b.userData.hp-=12;if(b.userData.hp<=0)killEntity(b,player);}}});if(player.alive){var d=player.pos.distanceTo(pos);if(d<r){player.hp-=6;if(player.hp<=0){player.hp=0;player.alive=false;onPlayerDeath();}updHUD();}}},500);}}
function updateParticles(dt){for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.life-=dt;if(p.life<=0){scene.remove(p.mesh);if(p.onDeath){try{p.onDeath();}catch(e){}}particles.splice(i,1);continue;}p.vel.y-=p.gravity*dt;p.mesh.position.add(p.vel.clone().multiplyScalar(dt));if(p.mesh.position.y<0.05){p.mesh.position.y=0.05;p.vel.y*=-0.4;p.vel.x*=0.6;p.vel.z*=0.6;}if(p.mesh.material.transparent)p.mesh.material.opacity=Math.min(1,p.life/p.maxLife*1.5);if(p.rotSpeed){p.mesh.rotation.x+=p.rotSpeed*dt;p.mesh.rotation.z+=p.rotSpeed*dt*0.7;}}}
function makeTex5(base,line,size,type){if(!size)size=512;var c=document.createElement('canvas');c.width=c.height=size;var ctx=c.getContext('2d');var grad=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size*0.8);grad.addColorStop(0,base);grad.addColorStop(0.5,line);grad.addColorStop(1,base);ctx.fillStyle=grad;ctx.fillRect(0,0,size,size);for(var i=0;i<2000;i++){ctx.fillStyle='rgba(0,0,0,'+(Math.random()*0.35)+')';ctx.beginPath();ctx.arc(Math.random()*size,Math.random()*size,Math.random()*2+0.5,0,6.28);ctx.fill();}if(type==='brick'){ctx.strokeStyle='rgba(0,0,0,0.7)';ctx.lineWidth=3;for(var y=0;y<size;y+=32){var off=(y/32)%2===0?0:32;ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,y+30,size,2);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();for(var x=off;x<size;x+=64){ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x+62,y,2,32);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke();}}}else if(type==='wood'){ctx.strokeStyle='rgba(40,20,0,0.5)';ctx.lineWidth=1.5;for(var i=0;i<80;i++){var y=Math.random()*size;ctx.beginPath();ctx.moveTo(0,y);for(var x=0;x<size;x+=8)ctx.lineTo(x,y+(Math.random()-0.5)*4);ctx.stroke();}for(var i=0;i<5;i++){var x=Math.random()*size,y=Math.random()*size;ctx.fillStyle='rgba(60,30,10,0.4)';ctx.beginPath();ctx.ellipse(x,y,10,6,Math.random()*3.14,0,6.28);ctx.fill();}}else if(type==='concrete'){ctx.strokeStyle='rgba(0,0,0,0.6)';ctx.lineWidth=2;for(var i=0;i<15;i++){ctx.beginPath();var x=Math.random()*size,y=Math.random()*size;ctx.moveTo(x,y);for(var j=0;j<8;j++){x+=(Math.random()-0.5)*50;y+=(Math.random()-0.5)*50;ctx.lineTo(x,y);}ctx.stroke();}}else if(type==='metal'){ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;for(var i=0;i<50;i++){ctx.beginPath();var x=Math.random()*size,y=Math.random()*size;ctx.moveTo(x,y);ctx.lineTo(x+(Math.random()-0.5)*150,y+(Math.random()-0.5)*150);ctx.stroke();}}for(var i=0;i<500;i++){ctx.fillStyle='rgba(255,255,255,'+(Math.random()*0.2)+')';ctx.beginPath();ctx.arc(Math.random()*size,Math.random()*size,Math.random()*4+1,0,6.28);ctx.fill();}for(var i=0;i<300;i++){var colors=['rgba(139,115,85,0.25)','rgba(100,80,60,0.25)','rgba(180,150,100,0.15)'];ctx.fillStyle=colors[Math.floor(Math.random()*colors.length)];ctx.beginPath();ctx.arc(Math.random()*size,Math.random()*size,Math.random()*5+2,0,6.28);ctx.fill();}for(var i=0;i<20;i++){var x=Math.random()*size,y=Math.random()*size,r=Math.random()*30+10;var g2=ctx.createRadialGradient(x,y,0,x,y,r);g2.addColorStop(0,'rgba(255,255,255,0.15)');g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(x-r,y-r,r*2,r*2);}for(var i=0;i<15;i++){var x=Math.random()*size,y=Math.random()*size,r=Math.random()*25+10;var g2=ctx.createRadialGradient(x,y,0,x,y,r);g2.addColorStop(0,'rgba(0,0,0,0.2)');g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(x-r,y-r,r*2,r*2);}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=16;return t;}
var sandTex=makeTex5('#c9a57a','#8b6f47',512,'brick');
var woodTex=makeTex5('#6b4423','#3d2410',512,'wood');
var stoneTex=makeTex5('#8a8070','#5a5040',512,'concrete');
var groundTex=makeTex5('#b89968','#7a6540',512,'concrete');groundTex.repeat.set(30,30);
var concreteTex=makeTex5('#999988','#666655',512,'concrete');
var metalTex=makeTex5('#666677','#444455',512,'metal');
var penWoodTex=(function(){var c=document.createElement('canvas');c.width=c.height=256;var ctx=c.getContext('2d');ctx.fillStyle='#5a3a1a';ctx.fillRect(0,0,256,256);for(var i=0;i<60;i++){ctx.strokeStyle='rgba(40,20,0,0.5)';ctx.lineWidth=1;var y=Math.random()*256;ctx.beginPath();ctx.moveTo(0,y);for(var x=0;x<256;x+=10)ctx.lineTo(x,y+(Math.random()-0.5)*3);ctx.stroke();}for(var i=0;i<8;i++){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.arc(Math.random()*256,Math.random()*256,Math.random()*8+3,0,6.28);ctx.fill();}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
var walls=[];
var wallMats={sand:new THREE.MeshStandardMaterial({map:sandTex,roughness:0.85}),wood:new THREE.MeshStandardMaterial({map:woodTex,roughness:0.7}),stone:new THREE.MeshStandardMaterial({map:stoneTex,roughness:0.9}),concrete:new THREE.MeshStandardMaterial({map:concreteTex,roughness:0.9}),metal:new THREE.MeshStandardMaterial({map:metalTex,roughness:0.4,metalness:0.7}),penWood:new THREE.MeshStandardMaterial({map:penWoodTex,roughness:0.7,transparent:true,opacity:0.85})};
function addWall(x,z,w,h,d,matKey,canStandOn,isDoor,penetrable){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMats[matKey]||wallMats.sand);m.position.set(x,h/2,z);m.castShadow=true;m.receiveShadow=true;m.userData={w:w,h:h,d:d,topY:h,canStandOn:canStandOn!==false,matKey:matKey,isDoor:isDoor||false,doorOpen:false,penetrable:penetrable||false};scene.add(m);walls.push(m);if(isDoor)doorList.push(m);return m;}
var floorMesh,mapSpawns={},bombSites={},mapPOIs=[];
function clearMap(){walls.forEach(function(w){scene.remove(w);});walls=[];if(floorMesh)scene.remove(floorMesh);particles.forEach(function(p){scene.remove(p.mesh);});particles=[];grenadeProjectiles.forEach(function(g){scene.remove(g.mesh);});grenadeProjectiles=[];droppedWeapons.forEach(function(d){scene.remove(d.mesh);});droppedWeapons=[];mapPOIs=[];doorList=[];}
function loadMap(name){clearMap();
if(name==='inferno'){scene.background=new THREE.Color(0xd4a574);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:groundTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-65,130,6,1,'stone');addWall(0,65,130,6,1,'stone');addWall(-65,0,1,6,130,'stone');addWall(65,0,1,6,130,'stone');
addWall(-10,-55,1,5,12,'sand');addWall(10,-55,1,5,12,'sand');addWall(0,-61,20,5,1,'sand');
addWall(-10,55,1,5,12,'sand');addWall(10,55,1,5,12,'sand');addWall(0,61,20,5,1,'sand');
addWall(-40,-35,1,5,18,'sand');addWall(-20,-35,1,5,18,'sand');addWall(-30,-44,20,5,1,'sand');addWall(-30,-26,20,5,1,'sand');
addWall(-35,-40,6,4,1,'sand');addWall(-25,-40,6,4,1,'sand');
addWall(-38,-35,1,3,4,'penWood',false,false,true);addWall(-22,-35,1,3,4,'penWood',false,false,true);
addWall(-35,-28,2,2,2,'wood');addWall(-25,-28,2,2,2,'wood');addWall(-30,-32,2,2,2,'wood');
addWall(-33,-30,3,2,3,'wood');addWall(-27,-40,3,2,3,'wood');
addWall(-55,-15,1,5,30,'sand');addWall(-40,-15,1,5,30,'sand');
addWall(-47.5,0,15,5,1,'sand');addWall(-47.5,0,4,5,1,'wood',false,true);
addWall(-52,-10,2,2,2,'wood');addWall(-43,-20,2,2,2,'wood');
addWall(-18,-12,1,4,12,'sand');addWall(-10,-12,1,4,12,'sand');addWall(-14,-22,8,4,1,'stone');
addWall(-7,8,1,5,22,'sand');addWall(7,8,1,5,22,'sand');addWall(0,-3,14,5,1,'stone');addWall(0,-13,14,5,1,'stone');
addWall(-3,5,2,2,2,'wood');addWall(3,12,2,2,2,'wood');
addWall(30,20,1,5,22,'sand');addWall(45,20,1,5,22,'sand');
addWall(37.5,31,15,5,1,'sand');addWall(37.5,31,4,5,1,'wood',false,true);
addWall(33,13,2,2,2,'wood');addWall(42,25,2,2,2,'wood');
addWall(22,35,1,5,18,'sand');addWall(42,35,1,5,18,'sand');addWall(32,44,20,5,1,'sand');addWall(32,26,20,5,1,'sand');
addWall(27,30,2,2,2,'wood');addWall(37,40,2,2,2,'wood');addWall(32,35,2,2,2,'wood');
addWall(28,38,2,2,2,'wood');addWall(38,32,2,2,2,'wood');
addWall(30,33,3,2,3,'wood');addWall(35,28,3,2,3,'wood');
addWall(15,42,1,4,12,'stone');addWall(22,42,1,4,12,'stone');addWall(18.5,36,7,4,1,'stone');
addWall(-20,20,2,2,2,'wood');addWall(20,-20,2,2,2,'wood');addWall(0,25,3,2,2,'wood');addWall(0,-25,3,2,2,'wood');
mapSpawns={ct:{x:0,z:-55},t:{x:0,z:55}};bombSites={a:{x:-30,z:-35,r:8},b:{x:32,z:35,r:8}};
mapPOIs=[{x:-30,z:-35,type:'site'},{x:32,z:35,type:'site'},{x:-47,z:0,type:'cover'},{x:0,z:0,type:'cover'},{x:37,z:31,type:'cover'},{x:-14,z:-22,type:'cover'},{x:18,z:36,type:'cover'}];}
else if(name==='dust2'){scene.background=new THREE.Color(0xe8c888);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:groundTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-65,130,6,1,'stone');addWall(0,65,130,6,1,'stone');addWall(-65,0,1,6,130,'stone');addWall(65,0,1,6,130,'stone');
addWall(-15,55,1,5,14,'sand');addWall(15,55,1,5,14,'sand');addWall(0,62,30,5,1,'sand');
addWall(-45,-50,1,5,14,'sand');addWall(-25,-50,1,5,14,'sand');addWall(-35,-57,20,5,1,'sand');
addWall(-45,-25,1,5,14,'sand');addWall(-25,-25,1,5,14,'sand');addWall(-35,-32,20,5,1,'sand');addWall(-35,-18,20,5,1,'sand');
addWall(-38,-28,1,3,4,'penWood',false,false,true);addWall(-32,-42,1,3,4,'penWood',false,false,true);
addWall(-42,-40,2,2,2,'wood');addWall(-28,-30,2,2,2,'wood');addWall(-35,-35,2,2,2,'wood');
addWall(-15,20,1,5,30,'sand');addWall(0,20,1,5,30,'sand');addWall(-7.5,5,15,5,1,'stone');addWall(-10,15,2,2,2,'wood');
addWall(-15,-5,1,5,14,'sand');addWall(0,-5,1,5,14,'sand');
addWall(25,-25,1,5,14,'sand');addWall(45,-25,1,5,14,'sand');addWall(35,-32,20,5,1,'sand');addWall(35,-18,20,5,1,'sand');
addWall(37.5,-25,4,5,1,'wood',false,true);
addWall(28,-35,2,2,2,'wood');addWall(42,-28,2,2,2,'wood');
addWall(15,40,1,4,14,'stone');addWall(25,40,1,4,14,'stone');addWall(20,33,10,4,1,'stone');
addWall(28,5,1,4,14,'stone');addWall(40,5,1,4,14,'stone');
addWall(15,0,2,2,2,'wood');addWall(-20,10,2,2,2,'wood');addWall(5,-15,3,2,2,'wood');
mapSpawns={ct:{x:-35,z:-50},t:{x:0,z:55}};bombSites={a:{x:-35,z:-25,r:8},b:{x:35,z:-25,r:8}};
mapPOIs=[{x:-35,z:-25,type:'site'},{x:35,z:-25,type:'site'},{x:-7,z:5,type:'cover'},{x:20,z:33,type:'cover'}];}
else if(name==='mirage'){scene.background=new THREE.Color(0xddc899);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:groundTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-65,130,6,1,'stone');addWall(0,65,130,6,1,'stone');addWall(-65,0,1,6,130,'stone');addWall(65,0,1,6,130,'stone');
addWall(-10,55,1,5,14,'sand');addWall(10,55,1,5,14,'sand');addWall(0,62,20,5,1,'sand');
addWall(-45,-50,1,5,14,'sand');addWall(-25,-50,1,5,14,'sand');addWall(-35,-57,20,5,1,'sand');addWall(-35,-30,2,2,2,'wood');
addWall(-10,-5,1,5,22,'sand');addWall(0,-5,1,5,22,'sand');addWall(-5,-15,10,5,1,'stone');addWall(-5,5,10,5,1,'stone');
addWall(25,-25,1,5,14,'sand');addWall(45,-25,1,5,14,'sand');addWall(35,-32,20,5,1,'sand');addWall(35,-18,20,5,1,'sand');
addWall(37.5,-25,4,5,1,'wood',false,true);
addWall(30,-30,1,3,4,'penWood',false,false,true);addWall(40,-22,1,3,4,'penWood',false,false,true);
addWall(-50,-10,1,5,22,'sand');addWall(-38,-10,1,5,22,'sand');addWall(-44,-21,12,5,1,'sand');addWall(-44,1,12,5,1,'sand');
addWall(15,10,1,5,14,'sand');addWall(27,10,1,5,14,'sand');addWall(21,3,12,5,1,'stone');addWall(21,17,12,5,1,'stone');
addWall(-15,25,2,2,2,'wood');addWall(15,-15,2,2,2,'wood');addWall(0,35,3,2,2,'wood');addWall(-20,35,3,2,2,'wood');
mapSpawns={ct:{x:-35,z:-50},t:{x:0,z:55}};bombSites={a:{x:-35,z:-25,r:8},b:{x:35,z:-25,r:8}};
mapPOIs=[{x:-35,z:-25,type:'site'},{x:35,z:-25,type:'site'},{x:-5,z:-15,type:'cover'},{x:21,z:10,type:'cover'}];}
else if(name==='cache'){scene.background=new THREE.Color(0x8899aa);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(130,130),new THREE.MeshStandardMaterial({map:concreteTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-60,120,6,1,'metal');addWall(0,60,120,6,1,'metal');addWall(-60,0,1,6,120,'metal');addWall(60,0,1,6,120,'metal');
addWall(-10,50,1,5,12,'concrete');addWall(10,50,1,5,12,'concrete');addWall(-10,-50,1,5,12,'concrete');addWall(10,-50,1,5,12,'concrete');
addWall(-30,-25,1,5,14,'concrete');addWall(-15,-25,1,5,14,'concrete');addWall(-22.5,-32,15,5,1,'concrete');addWall(-22.5,-18,15,5,1,'concrete');
addWall(-22.5,-25,4,5,1,'metal',false,true);
addWall(-27,-30,1,3,4,'penWood',false,false,true);addWall(-18,-20,1,3,4,'penWood',false,false,true);
addWall(25,-25,1,5,14,'concrete');addWall(40,-25,1,5,14,'concrete');addWall(32.5,-32,15,5,1,'concrete');addWall(32.5,-18,15,5,1,'concrete');
addWall(32.5,-25,4,5,1,'metal',false,true);
addWall(-7,0,1,5,22,'concrete');addWall(7,0,1,5,22,'concrete');addWall(0,-11,14,5,1,'concrete');addWall(0,11,14,5,1,'concrete');
addWall(-40,10,6,3,3,'metal');addWall(40,10,6,3,3,'metal');addWall(-40,-10,6,3,3,'metal');addWall(40,-10,6,3,3,'metal');
addWall(0,25,6,3,3,'metal');addWall(0,-25,6,3,3,'metal');
mapSpawns={ct:{x:0,z:-50},t:{x:0,z:50}};bombSites={a:{x:-22.5,z:-25,r:8},b:{x:32.5,z:-25,r:8}};
mapPOIs=[{x:-22.5,z:-25,type:'site'},{x:32.5,z:-25,type:'site'},{x:0,z:0,type:'cover'}];}
else if(name==='nuke'){scene.background=new THREE.Color(0x8899aa);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshStandardMaterial({map:concreteTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-50,100,6,1,'metal');addWall(0,50,100,6,1,'metal');addWall(-50,0,1,6,100,'metal');addWall(50,0,1,6,100,'metal');
addWall(-15,-15,1,4,30,'metal');addWall(15,-15,1,4,30,'metal');addWall(0,-30,30,4,1,'metal');addWall(0,0,30,4,1,'metal');
addWall(0,-15,4,4,1,'metal',false,true);
addWall(-35,20,1,4,16,'concrete');addWall(-20,20,1,4,16,'concrete');addWall(20,20,1,4,16,'concrete');addWall(35,20,1,4,16,'concrete');
addWall(-27.5,12,15,4,1,'concrete');addWall(-27.5,28,15,4,1,'concrete');addWall(27.5,12,15,4,1,'concrete');addWall(27.5,28,15,4,1,'concrete');
addWall(-8,-8,2,2,2,'metal');addWall(8,-8,2,2,2,'metal');addWall(-8,8,2,2,2,'metal');addWall(8,8,2,2,2,'metal');
mapSpawns={ct:{x:0,z:-40},t:{x:0,z:40}};bombSites={};
mapPOIs=[{x:0,z:0,type:'cover'},{x:-27.5,z:20,type:'cover'},{x:27.5,z:20,type:'cover'}];}
else if(name==='vertigo'){scene.background=new THREE.Color(0x99aacc);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:concreteTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-65,130,6,1,'concrete');addWall(0,65,130,6,1,'concrete');addWall(-65,0,1,6,130,'concrete');addWall(65,0,1,6,130,'concrete');
addWall(-10,55,1,5,12,'concrete');addWall(10,55,1,5,12,'concrete');addWall(0,61,20,5,1,'concrete');
addWall(-10,-55,1,5,12,'concrete');addWall(10,-55,1,5,12,'concrete');addWall(0,-61,20,5,1,'concrete');
addWall(-30,-30,1,5,14,'concrete');addWall(-10,-30,1,5,14,'concrete');addWall(-20,-37,20,5,1,'concrete');addWall(-20,-23,20,5,1,'concrete');
addWall(-20,-30,4,5,1,'concrete',false,true);
addWall(-25,-32,1,3,4,'penWood',false,false,true);addWall(-15,-28,1,3,4,'penWood',false,false,true);
addWall(20,25,1,5,14,'concrete');addWall(40,25,1,5,14,'concrete');addWall(30,18,20,5,1,'concrete');addWall(30,32,20,5,1,'concrete');
addWall(30,25,4,5,1,'concrete',false,true);
addWall(-7,0,1,5,22,'concrete');addWall(7,0,1,5,22,'concrete');addWall(0,-11,14,5,1,'concrete');addWall(0,11,14,5,1,'concrete');
addWall(-35,-10,4,2,4,'concrete',true);addWall(-35,-2,4,4,4,'concrete',true);
addWall(35,10,4,2,4,'concrete',true);addWall(35,2,4,4,4,'concrete',true);
addWall(-20,15,2,2,2,'wood');addWall(20,-15,2,2,2,'wood');addWall(0,20,3,2,2,'wood');addWall(0,-20,3,2,2,'wood');
mapSpawns={ct:{x:0,z:-55},t:{x:0,z:55}};bombSites={a:{x:-20,z:-30,r:8},b:{x:30,z:25,r:8}};
mapPOIs=[{x:-20,z:-30,type:'site'},{x:30,z:25,type:'site'},{x:0,z:0,type:'cover'}];}
else if(name==='train'){scene.background=new THREE.Color(0x778899);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:concreteTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-65,130,6,1,'metal');addWall(0,65,130,6,1,'metal');addWall(-65,0,1,6,130,'metal');addWall(65,0,1,6,130,'metal');
addWall(-35,0,4,4,30,'metal');addWall(-20,15,4,4,20,'metal');addWall(20,-15,4,4,20,'metal');addWall(35,0,4,4,30,'metal');
addWall(-35,20,8,2,3,'concrete',true);addWall(35,-20,8,2,3,'concrete',true);
addWall(-10,-55,1,5,12,'concrete');addWall(10,-55,1,5,12,'concrete');addWall(-10,55,1,5,12,'concrete');addWall(10,55,1,5,12,'concrete');
addWall(-15,-25,2,2,2,'metal');addWall(15,25,2,2,2,'metal');
mapSpawns={ct:{x:0,z:-55},t:{x:0,z:55}};bombSites={a:{x:-20,z:15,r:8},b:{x:20,z:-15,r:8}};
mapPOIs=[{x:-20,z:15,type:'site'},{x:20,z:-15,type:'site'},{x:0,z:0,type:'cover'}];}
else if(name==='overpass'){scene.background=new THREE.Color(0x88aa88);floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:groundTex,roughness:0.9}));floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
addWall(0,-65,130,6,1,'stone');addWall(0,65,130,6,1,'stone');addWall(-65,0,1,6,130,'stone');addWall(65,0,1,6,130,'stone');
addWall(0,0,45,1,6,'concrete',true);addWall(-22,0,1,3,6,'concrete');addWall(22,0,1,3,6,'concrete');
addWall(-38,25,1,4,22,'stone');addWall(-22,25,1,4,22,'stone');addWall(-30,14,16,4,1,'stone');addWall(-30,36,16,4,1,'stone');
addWall(-30,25,4,4,1,'wood',false,true);
addWall(-33,20,1,3,4,'penWood',false,false,true);addWall(-27,30,1,3,4,'penWood',false,false,true);
addWall(28,25,1,4,22,'stone');addWall(44,25,1,4,22,'stone');addWall(36,14,16,4,1,'stone');addWall(36,36,16,4,1,'stone');
addWall(36,25,4,4,1,'wood',false,true);
addWall(-10,55,1,5,12,'stone');addWall(10,55,1,5,12,'stone');addWall(-10,-55,1,5,12,'stone');addWall(10,-55,1,5,12,'stone');
addWall(-50,0,2,2,2,'wood');addWall(50,0,2,2,2,'wood');addWall(0,45,3,2,2,'wood');addWall(0,-45,3,2,2,'wood');
mapSpawns={ct:{x:0,z:-55},t:{x:0,z:55}};bombSites={a:{x:-30,z:25,r:8},b:{x:36,z:25,r:8}};
mapPOIs=[{x:-30,z:25,type:'site'},{x:36,z:25,type:'site'},{x:0,z:0,type:'cover'}];}}
var routesByMap={
inferno:{tToA:[{x:0,z:70},{x:0,z:40},{x:-5,z:15},{x:-15,z:-5},{x:-20,z:-20},{x:-30,z:-35},{x:-42,z:-48},{x:-42,z:-55}],tToB:[{x:0,z:70},{x:20,z:65},{x:30,z:60},{x:40,z:55},{x:47,z:55}],tToMid:[{x:0,z:70},{x:0,z:40},{x:0,z:15},{x:0,z:5}],ctToA:[{x:0,z:-80},{x:-20,z:-70},{x:-42,z:-60},{x:-42,z:-55}],ctToB:[{x:0,z:-80},{x:0,z:-50},{x:0,z:-10},{x:0,z:5},{x:15,z:20},{x:30,z:35},{x:40,z:45},{x:47,z:55}],ctToMid:[{x:0,z:-80},{x:0,z:-50},{x:0,z:-10},{x:0,z:-5}]},
dust2:{tToA:[{x:0,z:80},{x:-10,z:60},{x:-10,z:40},{x:-10,z:20},{x:-30,z:0},{x:-50,z:-20},{x:-50,z:-40}],tToB:[{x:0,z:80},{x:20,z:70},{x:30,z:60},{x:40,z:40},{x:50,z:20},{x:50,z:-20},{x:50,z:-40}],tToMid:[{x:0,z:80},{x:-10,z:60},{x:-10,z:40},{x:-10,z:20},{x:-10,z:0}],ctToA:[{x:-50,z:-70},{x:-50,z:-55},{x:-50,z:-40}],ctToB:[{x:-50,z:-70},{x:-30,z:-50},{x:-10,z:-30},{x:10,z:-10},{x:30,z:10},{x:50,z:-20},{x:50,z:-40}],ctToMid:[{x:-50,z:-70},{x:-30,z:-50},{x:-10,z:-30},{x:-10,z:0}]},
mirage:{tToA:[{x:0,z:80},{x:-20,z:60},{x:-40,z:40},{x:-60,z:20},{x:-62,z:0},{x:-40,z:-40}],tToB:[{x:0,z:80},{x:20,z:60},{x:40,z:40},{x:50,z:20},{x:50,z:-40}],tToMid:[{x:0,z:80},{x:-10,z:60},{x:-7,z:40},{x:-7,z:20},{x:-7,z:0}],ctToA:[{x:-50,z:-70},{x:-50,z:-50},{x:-40,z:-40}],ctToB:[{x:-50,z:-70},{x:-30,z:-50},{x:-10,z:-30},{x:20,z:-10},{x:40,z:-20},{x:50,z:-40}],ctToMid:[{x:-50,z:-70},{x:-30,z:-50},{x:-10,z:-30},{x:-7,z:0}]},
cache:{tToA:[{x:0,z:70},{x:-10,z:50},{x:-20,z:30},{x:-30,z:10},{x:-35,z:-20},{x:-35,z:-40}],tToB:[{x:0,z:70},{x:10,z:50},{x:20,z:30},{x:30,z:10},{x:40,z:-20},{x:45,z:-40}],tToMid:[{x:0,z:70},{x:0,z:40},{x:0,z:20},{x:0,z:0}],ctToA:[{x:0,z:-70},{x:-15,z:-50},{x:-30,z:-30},{x:-35,z:-40}],ctToB:[{x:0,z:-70},{x:15,z:-50},{x:30,z:-30},{x:45,z:-40}],ctToMid:[{x:0,z:-70},{x:0,z:-40},{x:0,z:-20},{x:0,z:0}]},
nuke:{tToA:[{x:0,z:50},{x:0,z:30},{x:0,z:10},{x:0,z:-15}],tToB:[{x:0,z:50},{x:20,z:40},{x:35,z:30},{x:35,z:10}],tToMid:[{x:0,z:50},{x:0,z:30},{x:0,z:10}],ctToA:[{x:0,z:-50},{x:0,z:-30},{x:0,z:-10}],ctToB:[{x:0,z:-50},{x:-20,z:-30},{x:-35,z:-10},{x:-35,z:10}],ctToMid:[{x:0,z:-50},{x:0,z:-30},{x:0,z:-10}]},
vertigo:{tToA:[{x:0,z:75},{x:-10,z:50},{x:-20,z:20},{x:-27,z:-20},{x:-27,z:-40}],tToB:[{x:0,z:75},{x:20,z:50},{x:42,z:20},{x:42,z:40}],tToMid:[{x:0,z:75},{x:0,z:40},{x:0,z:15},{x:0,z:0}],ctToA:[{x:0,z:-75},{x:-15,z:-55},{x:-27,z:-40}],ctToB:[{x:0,z:-75},{x:20,z:-50},{x:42,z:-20},{x:42,z:10},{x:42,z:40}],ctToMid:[{x:0,z:-75},{x:0,z:-50},{x:0,z:-20},{x:0,z:0}]},
train:{tToA:[{x:0,z:80},{x:-15,z:60},{x:-25,z:40},{x:-30,z:20}],tToB:[{x:0,z:80},{x:15,z:60},{x:25,z:40},{x:30,z:-20}],tToMid:[{x:0,z:80},{x:0,z:50},{x:0,z:20},{x:0,z:0}],ctToA:[{x:0,z:-80},{x:-20,z:-50},{x:-30,z:-20}],ctToB:[{x:0,z:-80},{x:20,z:-50},{x:30,z:-20}],ctToMid:[{x:0,z:-80},{x:0,z:-50},{x:0,z:-20},{x:0,z:0}]},
overpass:{tToA:[{x:0,z:80},{x:-15,z:60},{x:-30,z:40},{x:-40,z:40}],tToB:[{x:0,z:80},{x:15,z:60},{x:30,z:40},{x:50,z:40}],tToMid:[{x:0,z:80},{x:0,z:50},{x:0,z:20},{x:0,z:0}],ctToA:[{x:0,z:-80},{x:-20,z:-50},{x:-40,z:-20},{x:-40,z:20}],ctToB:[{x:0,z:-80},{x:20,z:-50},{x:40,z:-20},{x:50,z:20}],ctToMid:[{x:0,z:-80},{x:0,z:-50},{x:0,z:-20},{x:0,z:0}]}};
var weaponsData={
glock:{name:'GLOCK-18',damage:22,fireRate:150,maxAmmo:20,reserve:60,reloadTime:1800,price:0,spread:0.025,type:'pistol',recoil:0.05,slot:'pistol'},
usp:{name:'USP-S',damage:30,fireRate:200,maxAmmo:12,reserve:36,reloadTime:1900,price:500,spread:0.018,type:'pistol',recoil:0.06,slot:'pistol'},
p250:{name:'P250',damage:35,fireRate:180,maxAmmo:13,reserve:39,reloadTime:1800,price:600,spread:0.02,type:'pistol',recoil:0.07,slot:'pistol'},
deagle:{name:'DESERT EAGLE',damage:85,fireRate:400,maxAmmo:7,reserve:21,reloadTime:2200,price:1200,spread:0.03,type:'pistol',recoil:0.15,slot:'pistol'},
fiveseven:{name:'FIVE-SEVEN',damage:32,fireRate:170,maxAmmo:20,reserve:60,reloadTime:1900,price:700,spread:0.019,type:'pistol',recoil:0.05,slot:'pistol'},
tec9:{name:'TEC-9',damage:30,fireRate:140,maxAmmo:24,reserve:72,reloadTime:2000,price:650,spread:0.028,type:'pistol',recoil:0.07,slot:'pistol'},
uzi:{name:'MICRO UZI',damage:9,fireRate:30,maxAmmo:30,reserve:90,reloadTime:2000,price:1800,spread:0.045,type:'smg',recoil:0.03,slot:'primary'},
mp5:{name:'MP5',damage:25,fireRate:90,maxAmmo:30,reserve:90,reloadTime:2200,price:1500,spread:0.03,type:'smg',recoil:0.04,slot:'primary'},
famas:{name:'FAMAS',damage:35,fireRate:95,maxAmmo:25,reserve:75,reloadTime:2300,price:2100,spread:0.024,type:'rifle',recoil:0.06,slot:'primary'},
galil:{name:'GALIL AR',damage:33,fireRate:100,maxAmmo:35,reserve:105,reloadTime:2500,price:2200,spread:0.027,type:'rifle',recoil:0.07,slot:'primary'},
ak47:{name:'AK-47',damage:45,fireRate:100,maxAmmo:30,reserve:90,reloadTime:2500,price:2700,spread:0.025,type:'rifle',recoil:0.09,slot:'primary'},
m4a4:{name:'M4A4',damage:38,fireRate:90,maxAmmo:30,reserve:90,reloadTime:2400,price:2900,spread:0.02,type:'rifle',recoil:0.07,slot:'primary'},
aug:{name:'AUG',damage:40,fireRate:95,maxAmmo:30,reserve:90,reloadTime:2400,price:3100,spread:0.018,type:'rifle',recoil:0.06,slot:'primary'},
sg553:{name:'SG 553',damage:38,fireRate:95,maxAmmo:30,reserve:90,reloadTime:2400,price:3000,spread:0.019,type:'rifle',recoil:0.065,slot:'primary'},
awp:{name:'AWP',damage:200,fireRate:1500,maxAmmo:5,reserve:20,reloadTime:3500,price:4750,spread:0.005,type:'sniper',recoil:0.25,slot:'primary'}
};
var player={pos:new THREE.Vector3(0,1.7,0),vel:new THREE.Vector3(),moveVel:new THREE.Vector3(),yaw:0,pitch:0,hp:100,maxHp:100,armor:0,money:800,score:0,kills:0,deaths:0,currentWeapon:'glock',weapons:{glock:{name:'GLOCK-18',damage:22,fireRate:150,ammo:20,maxAmmo:20,reserve:60,reloadTime:1800,spread:0.025,type:'pistol',recoil:0.05,slot:'pistol'}},reloading:false,onGround:true,alive:true,team:'CT',name:'ТЫ',hasBomb:false,respawnTimer:0,moving:false,weaponSlots:{pistol:'glock',primary:null,knife:true},blindTimer:0};
