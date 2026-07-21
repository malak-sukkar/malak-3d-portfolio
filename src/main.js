import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { gsap } from  "gsap";
import "./style.css";

//variabels
let chair;
let computerScreen;
let room;
let certificate;
let drawing;
let github;
let instagram;
let linkedin;
let hoveredObject = null;
let hoverEnabled = true;
let interactiveObjects = [];
let objectsClickable = true;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");
const loadingScreen = document.getElementById("loadingScreen");
const progressBar = document.getElementById("progressBar");
const loadingText = document.getElementById("loadingText");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const startButton = document.getElementById("startButton");
const backButton = document.getElementById("backButton");
const guide = document.getElementById("guide");
const cvFileButton = document.getElementById("cvFileButton");
const cvViewer = document.getElementById("cvViewer");
const closeCv = document.getElementById("closeCv");

const isMobile = window.innerWidth <= 768;


//audio
const music = new Audio(`${import.meta.env.BASE_URL}audio/ambient.mp3`);
music.loop = true;
music.volume = 0.25;


//Scene
const scene = new THREE.Scene();

//Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / innerHeight,
  0.1,
  100
);


//Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0x000000, 0);

//Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true;
controls.enablePan = false;

controls.minAzimuthAngle = -Math.PI /18;
controls.maxAzimuthAngle = Math.PI /2;

controls.minDistance = 1;
controls.maxDistance = 10;

controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = Math.PI / 2.1;

controls.enableZoom = true;



//update responsive setting
function updatResponsiveSetting() {

  if(isMobile) {
    camera.fov = 90;
    controls.maxDistance = 10;
    controls.minDistance = 0.1;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TOW = THREE.TOUCH.DOLLY_ROTATE;

  }  else{
    camera.fov = 50;
    controls.maxDistance = 10;
  }
  camera.updateProjectionMatrix();
}

updatResponsiveSetting();

//Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

//camera positions
const cameraViewsDesktop = {
  start: {
    position: new THREE.Vector3(4, 2, 4.9),
    target: new THREE.Vector3(-0.2, 1, 0),
  },
  screen: {
    position: new THREE.Vector3(-1.3, 1.2, -1.4),
    target: new THREE.Vector3(-1.3, 1.5, 0.15),
  },
  certificate: {
    position: new THREE.Vector3(-0.1, 1.9, -0.001),
    target: new THREE.Vector3(-0.1, 1.9, -0.4),
  },
  drawing: {
    position: new THREE.Vector3(-1, 1.5, 1),
    target: new THREE.Vector3(-1.15, 1.9, 1.15),
  },
};

const cameraViewsMobile = {
  start: {
    position: new THREE.Vector3(3, 2, 4.9),
    target: new THREE.Vector3(-0.3, 1, 0),
  },
  screen: {
    position: new THREE.Vector3(-1.1, 1.2, -1),
    target: new THREE.Vector3(-1.15, 1.5, 0.3),
  },
  certificate: {
    position: new THREE.Vector3(-0.7, 1.9, -0.1),
    target: new THREE.Vector3(-0.7, 1.9, -1.2),
  },
  drawing: {
    position: new THREE.Vector3(-0.8, 1.8, 1.1),
    target: new THREE.Vector3(-0.9, 2, 1.3),
  },
};

function getCameraViews() {
  const isMobile = window.innerWidth <= 768;

  return isMobile
      ?cameraViewsMobile
      :cameraViewsDesktop;
}


function moveCameraTo(viewName) {
  const cameraViews = getCameraViews();
  const view = cameraViews[viewName];


  controls.enabled = false;

  gsap.to(camera.position, {
    duration: 1,
    x: view.position.x,
    y: view.position.y,
    z: view.position.z,
    ease: "sine.inOut"
  });
  gsap.to(controls.target, {
    duration: 1,
    x: view.target.x,
    y: view.target.y,
    z: view.target.z,
    ease: "sine.inOut",
    onUpdate: () => {
      camera.lookAt(controls.target);
    },
    
    onComplete: () => {
      controls.update();
      controls.enabled = true;
    },
    });
}

//load room model
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(
  `${import.meta.env.BASE_URL}models/Room.glb`,
  (gltf) => {
    room = gltf.scene;
    scene.add(room);

    chair = room.getObjectByName("Chair_Top");
    computerScreen = room.getObjectByName("Computer");
    certificate = room.getObjectByName("Certificate");
    drawing = room.getObjectByName("Drawing");
    github = room.getObjectByName("Github");
    instagram = room.getObjectByName("Instagram");
    linkedin = room.getObjectByName("Linkedin");

    interactiveObjects = [
      computerScreen,
      certificate,
      drawing,
      github,
      instagram,
      linkedin,
    ].filter(Boolean);

    startButton.style.display =  "block";
    progressBar.style.display =  "none";
    progressFill.style.width = "100%";
    progressPercent.innerText = "100%";
    progressPercent.style.display = "none";
    loadingText.innerText = "Quick Start Guide";
    guide.style.display = "block";

  },
  (progress) => {
    if (progress.lengthComputable) {
      const percent = Math.min(100, Math.round((progress.loaded/ progress.total) * 100));
      progressFill.style.width = `${percent}%`;
      progressPercent.innerText = `${percent}%`;
    }
  },
  (error) => {
    console.log("error loading room", error);
  }
  

);


//click on objects
window.addEventListener("pointerup", (event) => {

  if(!objectsClickable) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 -1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 +1;

  raycaster.setFromCamera(mouse, camera);
  const clickableObjects = [
    { object: computerScreen, type: "camera", view:"screen"},
    { object: certificate, type: "camera", view:"certificate"},
    { object: drawing, type: "camera", view:"drawing"},
    { object: github, type: "link", url:"https://github.com/malak-sukkar"},
    { object: instagram, type: "link", url:"https://www.instagram.com/malak__sukkar"},
    { object: linkedin, type: "link", url:"https://www.linkedin.com/in/malak-sukkar-23a467299/"},
  ];
  for(const item of clickableObjects) {
     if( !item.object) continue;
     const intersects = raycaster.intersectObject(item.object, true);
    
     if(intersects.length > 0) {
      if (item.type ==="camera"){
        objectsClickable = false;

        if(hoveredObject){
          hoveredObject.scale.set(1, 1, 1);
          hoveredObject = null;
        }

        hoverEnabled = false;
        document.body.style.cursor = "default";
        tooltip.style.display = "none";

        moveCameraTo(item.view);

        if(item.view === "screen") {
          cvFileButton.style.display = "block";
        } else{
          cvFileButton.style.display = "none";
        }

        controls.enableRotate = false;
        controls.enablePan = true;
        controls.enableZoom = isMobile;
        if(isMobile){
          controls.maxDistance = 1;
        }

        backButton.style.display = "block";
      }
      if (item.type ==="link"){
        if(isMobile){
          window.location.href = item.url;
        }else{
          window.open(item.url, "_blank");
        }
      }
      break;
     }
    }
    });

//hover effect
 window.addEventListener("mousemove", (event) => {
  if (!hoverEnabled) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 -1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 +1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(interactiveObjects, true);
  
  if (hoveredObject) {
    hoveredObject.scale.set(1, 1, 1);
    hoveredObject = null;
  }
  if(intersects.length > 0) {
    document.body.style.cursor = "pointer";
    hoveredObject = intersects[0].object;
    while (hoveredObject.parent && !interactiveObjects.includes(hoveredObject)){
      hoveredObject = hoveredObject.parent;
    }

    hoveredObject.scale.set(1.1, 1.1, 1.1);

    tooltip.style.display = "block";
    tooltip.style.left = event.clientX + 15 + "px";
    tooltip.style.top = event.clientY + 15 + "px";
    tooltip.innerText = "Click to interact";

  } else {
    document.body.style.cursor = "default";
    tooltip.style.display = "none";
  }
});


//click start button
startButton.addEventListener("pointerup", (event)=> {
  music.play();
  loadingScreen.style.display = "none";
  moveCameraTo("start");
});

//click back button
backButton.addEventListener("click", ()=> {
  moveCameraTo("start");

  controls.enableRotate = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.maxDistance = 10;


  hoverEnabled = true;
  objectsClickable = true;

  cvFileButton.style.display = "none";
  cvViewer.style.display = "none";
  backButton.style.display = "none";

});

//click cv file
cvFileButton.addEventListener("click", ()=> {
  cvViewer.style.display = "flex";
  backButton.style.display = "none";
  cvFileButton.style.display = "none";
});

//click close cv 
closeCv.addEventListener("click", ()=> {
  cvViewer.style.display = "none";
  backButton.style.display = "block";
  cvFileButton.style.display = "block";
});


//Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  
  updatResponsiveSetting();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
});


//Animation loop
function animate() {
  requestAnimationFrame(animate);

  if(chair){
    chair.rotation.y= Math.sin(Date.now() * 0.001)* 0.3;
  }
  controls.update();
  renderer.render(scene, camera);
}

animate();