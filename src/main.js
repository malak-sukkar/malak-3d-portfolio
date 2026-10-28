import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { gsap } from  "gsap";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./style.css";
import { getCvConfig, getPublicCvPdfUrl } from "./cv-storage.js";

//variabels
let chair;
let computerScreen;
let room;
let certificate;
let drawing;
let github;
let instagram;
let linkedin;
let cvIcon;
let cvText;
let hoveredObject = null;
let hoverEnabled = true;
let interactiveObjects = [];
let objectsClickable = true;
let musicPlaying = false;
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
const cvViewer = document.getElementById("cvViewer");
const closeCv = document.getElementById("closeCv");
const downloadCv = document.getElementById("downloadCv");
const cvContent = document.getElementById("cvContent");
const cvZoomIn = document.getElementById("cvZoomIn");
const cvZoomOut = document.getElementById("cvZoomOut");
const cvFitWidth = document.getElementById("cvFitWidth");
const musicToggle = document.getElementById("musicToggle");
const certificateCard = document.getElementById("certificateCard");
const drawingCard = document.getElementById("drawingCard");

const isMobile = window.innerWidth <= 768;
const fallbackCvPdfUrl = `${import.meta.env.BASE_URL}cv/cv.pdf`;
let cvPdfSource = "";
let cvPdfLoadingTask;
let cvPdfDocument;
let pdfjsLib;
let cvPdfRenderId = 0;
let cvPdfRenderTasks = [];
let cvZoom = 1;
let cvScenePinchStartDistance = 0;
let cvScenePinchStartGap = 0;
let cvDownloadFile = null;

async function cacheCvDownloadFile(source) {
  try {
    const response = await fetch(source);
    if (!response.ok) return;
    const blob = await response.blob();
    cvDownloadFile = new File([blob], "Malak-Sukkar-CV.pdf", { type: "application/pdf" });
  } catch (error) {
    console.warn("Could not prepare the CV for mobile sharing.", error);
  }
}

// On phones, offer the native share sheet so visitors can choose Save to Files.
downloadCv.addEventListener("click", async (event) => {
  if (!isMobile || !cvDownloadFile || !navigator.canShare || !navigator.share) return;
  if (!navigator.canShare({ files: [cvDownloadFile] })) return;

  event.preventDefault();
  try {
    await navigator.share({ files: [cvDownloadFile], title: "Malak Sukkar CV" });
  } catch (error) {
    if (error?.name !== "AbortError") window.location.href = downloadCv.href;
  }
});

async function loadPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
  return pdfjsLib;
}

async function renderCvPdf(source = fallbackCvPdfUrl, resetZoom = false) {
  if (resetZoom) {
    cvZoom = 1;
    cvContent.scrollTop = 0;
    cvContent.scrollLeft = 0;
  }
  const renderId = ++cvPdfRenderId;
  cvPdfRenderTasks.forEach((task) => task.cancel());
  cvPdfRenderTasks = [];
  cvContent.replaceChildren();
  cvContent.setAttribute("aria-busy", "true");
  cvContent.classList.toggle("is-zoomed", cvZoom > 1.001);
  const loadingMessage = document.createElement("p");
  loadingMessage.className = "cv-pdf-status";
  loadingMessage.textContent = "Loading CV…";
  cvContent.append(loadingMessage);

  try {
    if (!cvPdfDocument || cvPdfSource !== source) {
      if (cvPdfLoadingTask) await cvPdfLoadingTask.destroy();
      cvPdfDocument = null;
      cvPdfSource = source;
      const pdfjs = await loadPdfJs();
      if (renderId !== cvPdfRenderId) return;
      cvPdfLoadingTask = pdfjs.getDocument({ url: source });
      const loadedDocument = await cvPdfLoadingTask.promise;
      if (renderId !== cvPdfRenderId) return;
      cvPdfDocument = loadedDocument;
    }

    const contentWidth = cvContent.clientWidth;
    if (!contentWidth) return;
    cvContent.replaceChildren();

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    for (let pageNumber = 1; pageNumber <= cvPdfDocument.numPages; pageNumber += 1) {
      if (renderId !== cvPdfRenderId) return;
      const page = await cvPdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = (contentWidth / baseViewport.width) * cvZoom;
      const viewport = page.getViewport({ scale: scale * pixelRatio });
      const pageElement = document.createElement("div");
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });
      pageElement.className = "cv-pdf-page";
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${cvZoom * 100}%`;
      canvas.style.height = "auto";
      canvas.setAttribute("aria-label", `CV page ${pageNumber}`);
      pageElement.append(canvas);
      cvContent.append(pageElement);

      const renderTask = page.render({ canvasContext: context, viewport });
      cvPdfRenderTasks.push(renderTask);
      await renderTask.promise;
    }
  } catch (error) {
    if (error?.name !== "RenderingCancelledException" && renderId === cvPdfRenderId) {
      console.error("Could not render the CV PDF.", error);
      const message = document.createElement("p");
      message.className = "cv-pdf-error";
      message.textContent = "The CV could not be displayed. Please use the download button to open it.";
      cvContent.replaceChildren(message);
    }
  } finally {
    if (renderId === cvPdfRenderId) cvContent.removeAttribute("aria-busy");
  }
}

function changeCvZoom(amount) {
  cvZoom = Math.min(4, Math.max(0.75, cvZoom * amount));
  renderCvPdf(cvPdfSource || fallbackCvPdfUrl);
}

function getTouchGap(touches) {
  const [first, second] = touches;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

// A pinch on the HTML overlay zooms the 3D scene camera, never the PDF itself.
cvViewer.addEventListener("touchstart", (event) => {
  if (!cvViewer.classList.contains("cv-on-monitor") || event.touches.length !== 2) return;
  event.preventDefault();
  cvScenePinchStartGap = getTouchGap(event.touches);
  cvScenePinchStartDistance = camera.position.distanceTo(controls.target);
}, { passive: false });

cvViewer.addEventListener("touchmove", (event) => {
  if (!cvScenePinchStartGap || event.touches.length !== 2) return;
  event.preventDefault();

  const currentGap = getTouchGap(event.touches);
  if (!currentGap) return;
  const nextDistance = THREE.MathUtils.clamp(
    cvScenePinchStartDistance * (cvScenePinchStartGap / currentGap),
    controls.minDistance,
    controls.maxDistance,
  );
  const cameraDirection = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(cameraDirection, nextDistance);
  controls.update();
  fitCvViewerToMonitor();
}, { passive: false });

cvViewer.addEventListener("touchend", (event) => {
  if (event.touches.length < 2 && cvScenePinchStartGap) {
    cvScenePinchStartGap = 0;
  }
});

cvZoomIn.addEventListener("click", () => changeCvZoom(1.25));
cvZoomOut.addEventListener("click", () => changeCvZoom(0.8));
cvFitWidth.addEventListener("click", () => renderCvPdf(cvPdfSource || fallbackCvPdfUrl, true));


//audio
const music = new Audio(`${import.meta.env.BASE_URL}audio/ambient.mp3`);
music.loop = true;
music.volume = 0.25;


//Scene
const scene = new THREE.Scene();
RectAreaLightUniformsLib.init();

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

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


//Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 6, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);

directionalLight.shadow.camera.left = -6;

directionalLight.shadow.camera.right = 6;

directionalLight.shadow.camera.top = 6;

directionalLight.shadow.camera.bottom = -6;

directionalLight.shadow.camera.near = 0.5;

directionalLight.shadow.camera.far = 20;

directionalLight.shadow.bias = -0.0002;

directionalLight.shadow.normalBias = 0.05;

directionalLight.shadow.radius = 2;

directionalLight.shadow.camera.updateProjectionMatrix();

scene.add(directionalLight);


const windowLight = new THREE.RectAreaLight(
    0xddeeff,
    3,
    1.5,
    2
);

windowLight.position.set(1.2, 2, -0.9);
windowLight.rotation.y = Math.PI;
scene.add(windowLight);



//update responsive setting
function updatResponsiveSetting() {

  if(isMobile) {
    camera.fov = 90;
    controls.maxDistance = 10;
    controls.minDistance = 0.1;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TOW = THREE.TOUCH.DOLLY_PAN;

  }  else{
    camera.fov = 50;
    controls.maxDistance = 10;
  }
  camera.updateProjectionMatrix();
}

updatResponsiveSetting();


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

    const screenLight = new THREE.PointLight(0xbfdfff, 0.15, 3);
    screenLight.position.set(-1.07, 1.3, 0.27);
    scene.add(screenLight);

    room.traverse((child) =>{
      if (child.isMesh){
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    

    chair = room.getObjectByName("Chair_Top");
    computerScreen = room.getObjectByName("Computer");
    certificate = room.getObjectByName("Certificate");
    drawing = room.getObjectByName("Drawing");
    github = room.getObjectByName("Github");
    instagram = room.getObjectByName("Instagram");
    linkedin = room.getObjectByName("Linkedin");
    cvIcon = room.getObjectByName("CV-Icon");
    cvText = room.getObjectByName("Text");
    cvIcon.visible = false;
    cvText.visible = false;

    if(cvIcon) {
      cvIcon.traverse((child) => {
        child.userData.isCV= true;
      });
    }

    interactiveObjects = [
      computerScreen,
      certificate,
      drawing,
      github,
      instagram,
      linkedin,
      cvIcon,
    ].filter(Boolean);

    const labels = [
    "View my projects",
    "View my certificate",
    "View my artwork",
    "Visit my GitHub",
    "Visit my Instagram",
    "Connect on LinkedIn",
    "Open my CV"
    ];

    interactiveObjects.forEach((object, index) => {
    object.userData.label = labels[index];
    });

    startButton.style.display =  "flex";
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
    { object: cvIcon, type: "cv"},
  ];
  for(const item of clickableObjects) {
     if(!objectsClickable &&  item.type !== "cv") continue;
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
        showInfoCard(item.view);

        if(item.view === "screen") {
          cvIcon.visible = true;
          cvText.visible = true;
        }

        controls.enableRotate = false;
        // On the monitor, mobile pinch-to-zoom must not pan the camera away
        // from the screen or the HTML CV overlay appears to drift across it.
        controls.enablePan = item.view !== "screen";
        controls.enableZoom = isMobile;
        if(isMobile){
          controls.maxDistance = 1;
        }

        backButton.style.display = "block";
      }
      
      if (item.type ==="cv"){
        // Let mobile users pinch to zoom the scene while keeping the overlay on the monitor.
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableZoom = isMobile;
        controls.minDistance = isMobile ? 0.7 : 1;
        cvViewer.style.display = "block";
        cvViewer.classList.add("cv-on-monitor");
        fitCvViewerToMonitor();
        renderCvPdf(cvPdfSource || fallbackCvPdfUrl, true);
        showLatestCv();
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

async function showLatestCv() {
  if (!getCvConfig()) {
    await cacheCvDownloadFile(fallbackCvPdfUrl);
    return;
  }

  try {
    const response = await fetch(`${getPublicCvPdfUrl()}?v=${Date.now()}`);
    if (!response.ok) throw new Error("The uploaded CV PDF is not available yet.");
    const pdf = await response.blob();
    const signature = await pdf.slice(0, 5).text();
    if (pdf.type !== "application/pdf" && signature !== "%PDF-") {
      throw new Error("The uploaded CV file is not a PDF.");
    }

    cvDownloadFile = new File([pdf], "Malak-Sukkar-CV.pdf", { type: "application/pdf" });
    const previousUrl = downloadCv.dataset.objectUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const objectUrl = URL.createObjectURL(pdf);
    downloadCv.dataset.objectUrl = objectUrl;
    // Ask Supabase to serve the CV as an attachment so browsers download it
    // instead of opening the PDF inline. The blob URL remains for the preview.
    downloadCv.href = `${getPublicCvPdfUrl()}?download=Malak-Sukkar-CV.pdf&v=${Date.now()}`;
    await renderCvPdf(objectUrl, true);
  } catch (error) {
    console.warn("Could not load the latest CV PDF; showing the saved preview instead.", error);
    await cacheCvDownloadFile(fallbackCvPdfUrl);
  }
}

function fitCvViewerToMonitor() {
  const displayMesh = computerScreen?.getObjectByName("Computer_Screen");
  if (!displayMesh?.isMesh) return;

  displayMesh.geometry.computeBoundingBox();
  displayMesh.updateWorldMatrix(true, false);
  camera.updateMatrixWorld(true);

  const bounds = displayMesh.geometry.boundingBox;
  const projectedCorners = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z)
          .applyMatrix4(displayMesh.matrixWorld)
          .project(camera);
        if (point.z >= -1 && point.z <= 1) projectedCorners.push(point);
      }
    }
  }

  if (!projectedCorners.length) return;

  const canvasRect = renderer.domElement.getBoundingClientRect();
  const left = canvasRect.left + (Math.min(...projectedCorners.map((point) => point.x)) + 1) * canvasRect.width / 2;
  const right = canvasRect.left + (Math.max(...projectedCorners.map((point) => point.x)) + 1) * canvasRect.width / 2;
  const top = canvasRect.top + (1 - Math.max(...projectedCorners.map((point) => point.y))) * canvasRect.height / 2;
  const bottom = canvasRect.top + (1 - Math.min(...projectedCorners.map((point) => point.y))) * canvasRect.height / 2;
  const insetX = (right - left) * 0.07;
  const insetY = (bottom - top) * 0.045;
  const availableWidth = Math.max(0, right - left - insetX * 2);
  const height = Math.max(0, bottom - top - insetY * 2);
  const width = availableWidth * 0.8;
  const centeredLeft = left + (right - left - width) / 2;

  cvViewer.style.left = `${centeredLeft}px`;
  cvViewer.style.top = `${top + insetY}px`;
  cvViewer.style.width = `${width}px`;
  cvViewer.style.height = `${height}px`;
  cvViewer.style.transform = "none";
  cvViewer.style.setProperty("--cv-screen-height", `${height}px`);
}

function resetCvViewerPosition() {
  cvViewer.classList.remove("cv-on-monitor");
  cvViewer.style.removeProperty("left");
  cvViewer.style.removeProperty("top");
  cvViewer.style.removeProperty("width");
  cvViewer.style.removeProperty("height");
  cvViewer.style.removeProperty("transform");
  cvViewer.style.removeProperty("--cv-screen-height");
}

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
    tooltip.innerText =
    hoveredObject.userData.label || "Click to interact";

  } else {
    document.body.style.cursor = "default";
    tooltip.style.display = "none";
  }
});

//play or pause music
musicToggle.addEventListener("click", async () => {
    try {
        if (musicPlaying) {
            music.pause();
            musicToggle.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            musicPlaying = false;
        } else {
            await music.play();
            musicToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            musicPlaying = true;
        }
    } catch (error) {
        console.error("Could not play music:", error);
    }
});

//click start button
startButton.addEventListener("pointerup", (event)=> {
  music.play();
  musicPlaying = true;
  musicToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  musicToggle.style.display = "block";
  loadingScreen.style.display = "none";
  moveCameraTo("start");
});

//click back button
backButton.addEventListener("click", ()=> {
  hideInfoCards();
  
  moveCameraTo("start");

  controls.enableRotate = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.maxDistance = 10;

  hoverEnabled = true;
  objectsClickable = true;

  cvIcon.visible = false;
  cvText.visible = false;

  cvViewer.style.display = "none";
  resetCvViewerPosition();
  backButton.style.display = "none";

});


//click close cv 
closeCv.addEventListener("click", ()=> {
  cvViewer.style.display = "none";
  resetCvViewerPosition();
  controls.enableZoom = isMobile;
  controls.minDistance = isMobile ? 0.1 : 1;
  backButton.style.display = "block";
});

// hide all cards
function hideInfoCards() {
    certificateCard.style.display = "none";
    drawingCard.style.display = "none";
}

//show suitable card
function showInfoCard(view) {
    hideInfoCards();

    if (view === "certificate") {
        certificateCard.style.display = "block";
    }

    if (view === "drawing") {
        drawingCard.style.display = "block";
    }
}


//Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  
  updatResponsiveSetting();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));

  if (cvViewer.style.display !== "none") {
    requestAnimationFrame(() => renderCvPdf(cvPdfSource || fallbackCvPdfUrl));
  }
});


//Animation loop
function animate() {
  requestAnimationFrame(animate);

  if(chair){
    chair.rotation.y= Math.sin(Date.now() * 0.001)* 0.3;
  }
  controls.update();
  if (cvViewer.classList.contains("cv-on-monitor")) fitCvViewerToMonitor();
  renderer.render(scene, camera);
}

animate();
