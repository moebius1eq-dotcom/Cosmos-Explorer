const page = document.body;
const loader = document.querySelector(".loader");
const loaderStatus = document.querySelector(".loader__status");
const canvas = document.querySelector(".starfield");
const context = canvas.getContext("2d", { alpha: true });
const heroContent = document.querySelector(".hero__content");
const departure = document.querySelector(".departure");
const journeyViewport = document.querySelector(".journey-viewport");
const journeyCanvas = document.querySelector(".journey-canvas");
const journeyContext = journeyCanvas.getContext("2d", { alpha: true });
const journeyProgressValue = document.querySelector(".journey-progress__value");

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
let stars = [];
let animationFrame = 0;
let pixelRatio = 1;
let journeyPixelRatio = 1;
let currentJourneyProgress = 0;
let earthTexture = null;
let moonTexture = null;

const earthImage = new Image();
earthImage.src = "assets/earth-blue-marble.jpg";
earthImage.addEventListener("load", () => {
  earthTexture = createEarthTexture(earthImage);
  drawJourney(currentJourneyProgress);
});

const loadingStates = [
  [450, "CALIBRATING OPTICS"],
  [1050, "LOCATING DEEP SPACE"],
  [1700, "OBSERVATORY ONLINE"],
];

function createStar(index) {
  const depth = Math.random();

  return {
    x: Math.random(),
    y: Math.random(),
    radius: 0.25 + depth * 0.9,
    alpha: 0.14 + depth * 0.62,
    depth: 0.15 + depth * 0.85,
    phase: index * 0.61,
  };
}

function resizeStarfield() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const area = window.innerWidth * window.innerHeight;
  const density = window.innerWidth < 700 ? 12500 : 9200;
  const starCount = Math.max(80, Math.min(240, Math.floor(area / density)));
  stars = Array.from({ length: starCount }, (_, index) => createStar(index));
}

function resizeJourneyCanvas() {
  journeyPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  journeyCanvas.width = Math.floor(window.innerWidth * journeyPixelRatio);
  journeyCanvas.height = Math.floor(window.innerHeight * journeyPixelRatio);
  journeyCanvas.style.width = `${window.innerWidth}px`;
  journeyCanvas.style.height = `${window.innerHeight}px`;
  journeyContext.setTransform(journeyPixelRatio, 0, 0, journeyPixelRatio, 0, 0);
  drawJourney(currentJourneyProgress);
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function range(progress, start, end) {
  return clamp((progress - start) / (end - start));
}

function smoothstep(value) {
  const amount = clamp(value);
  return amount * amount * (3 - 2 * amount);
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}

function createEarthTexture(image) {
  const size = 1024;
  const texture = document.createElement("canvas");
  const textureContext = texture.getContext("2d");
  texture.width = size;
  texture.height = size;

  textureContext.save();
  textureContext.beginPath();
  textureContext.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  textureContext.clip();

  for (let row = 0; row < size; row += 1) {
    const latitude = row / size * 2 - 1;
    const chord = Math.sqrt(Math.max(0, 1 - latitude * latitude));
    const destinationWidth = size * chord;
    const sourceY = Math.floor((row / size) * image.height);
    textureContext.drawImage(
      image,
      image.width * 0.04,
      sourceY,
      image.width * 0.5,
      Math.max(1, image.height / size + 0.5),
      (size - destinationWidth) / 2,
      row,
      destinationWidth,
      1.4,
    );
  }

  textureContext.restore();
  return texture;
}

function seededNoise(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function createMoonTexture() {
  const size = 512;
  const texture = document.createElement("canvas");
  texture.width = size;
  texture.height = size;
  const textureContext = texture.getContext("2d");
  const imageData = textureContext.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const normalizedX = x / size * 2 - 1;
      const normalizedY = y / size * 2 - 1;
      const distance = normalizedX * normalizedX + normalizedY * normalizedY;
      const index = (y * size + x) * 4;

      if (distance > 1) {
        imageData.data[index + 3] = 0;
        continue;
      }

      const largeNoise = seededNoise(Math.floor(x / 18), Math.floor(y / 18));
      const mediumNoise = seededNoise(Math.floor(x / 5), Math.floor(y / 5));
      const fineNoise = seededNoise(x, y);
      const surface = largeNoise * 0.48 + mediumNoise * 0.34 + fineNoise * 0.18;
      const sphereZ = Math.sqrt(Math.max(0, 1 - distance));
      const directional = clamp(
        sphereZ * 0.78 - normalizedX * 0.34 - normalizedY * 0.1,
        0.08,
        1,
      );
      const edgeShade = Math.pow(sphereZ, 0.42);
      const value = Math.round((70 + surface * 78) * directional * edgeShade);

      imageData.data[index] = value;
      imageData.data[index + 1] = value;
      imageData.data[index + 2] = Math.min(255, value + 2);
      imageData.data[index + 3] = 255;
    }
  }

  textureContext.putImageData(imageData, 0, 0);
  return texture;
}

function drawEarth(context2d, x, y, radius, reveal) {
  const atmosphere = context2d.createRadialGradient(x, y, radius * 0.88, x, y, radius * 1.045);
  atmosphere.addColorStop(0.9, "rgba(98, 155, 185, 0)");
  atmosphere.addColorStop(0.982, `rgba(111, 183, 220, ${0.1 + reveal * 0.1})`);
  atmosphere.addColorStop(1, "rgba(124, 190, 220, 0)");
  context2d.fillStyle = atmosphere;
  context2d.beginPath();
  context2d.arc(x, y, radius * 1.1, 0, Math.PI * 2);
  context2d.fill();

  context2d.save();
  context2d.beginPath();
  context2d.arc(x, y, radius, 0, Math.PI * 2);
  context2d.clip();

  if (earthTexture) {
    context2d.drawImage(earthTexture, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    context2d.fillStyle = "#102a36";
    context2d.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const daylight = context2d.createRadialGradient(
    x - radius * 0.38,
    y - radius * 0.42,
    radius * 0.05,
    x,
    y,
    radius * 1.18,
  );
  daylight.addColorStop(0, "rgba(215, 233, 236, 0.2)");
  daylight.addColorStop(0.44, "rgba(56, 94, 111, 0.06)");
  daylight.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  context2d.fillStyle = daylight;
  context2d.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  const night = context2d.createLinearGradient(x - radius, y, x + radius, y);
  night.addColorStop(0, "rgba(0, 0, 0, 0)");
  night.addColorStop(0.36, "rgba(0, 0, 0, 0.02)");
  night.addColorStop(0.7, "rgba(0, 0, 0, 0.72)");
  night.addColorStop(1, "rgba(0, 0, 0, 0.98)");
  context2d.fillStyle = night;
  context2d.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  context2d.restore();

  context2d.strokeStyle = `rgba(145, 209, 237, ${0.28 + reveal * 0.16})`;
  context2d.lineWidth = Math.max(0.7, Math.min(1.8, radius * 0.0022));
  context2d.beginPath();
  context2d.arc(x, y, radius + context2d.lineWidth, Math.PI * 1.03, Math.PI * 1.72);
  context2d.stroke();
}

function drawMoon(context2d, x, y, radius, opacity) {
  context2d.save();
  context2d.globalAlpha = opacity;
  moonTexture ||= createMoonTexture();
  context2d.drawImage(moonTexture, x - radius, y - radius, radius * 2, radius * 2);
  context2d.strokeStyle = "rgba(215, 220, 216, 0.13)";
  context2d.lineWidth = Math.max(0.5, radius * 0.008);
  context2d.beginPath();
  context2d.arc(x, y, radius, Math.PI * 0.75, Math.PI * 1.72);
  context2d.stroke();
  context2d.restore();
}

function drawJourney(progress) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const reveal = smoothstep(range(progress, 0.02, 0.34));
  const linearPullback = smoothstep(range(progress, 0.24, 0.94));
  const pullback = Math.pow(linearPullback, 1.65);
  const positionPullback = Math.pow(linearPullback, 0.7);
  const moonReveal = smoothstep(range(progress, 0.8, 0.95));
  const mobile = width < 700;

  journeyContext.clearRect(0, 0, width, height);

  const initialRadius = Math.max(width, height) * (mobile ? 0.88 : 0.72);
  const finalRadius = Math.min(width, height) * (mobile ? 0.15 : 0.13);
  const radius = mix(initialRadius, finalRadius, pullback);
  const startX = width * (mobile ? 0.58 : 0.66);
  const startY = height + initialRadius * 0.58;
  const endX = width * (mobile ? 0.38 : 0.57);
  const endY = height * (mobile ? 0.53 : 0.44);
  const earthX = mix(startX, endX, pullback);
  const earthY = mix(startY, endY, positionPullback);

  drawEarth(journeyContext, earthX, earthY, radius, reveal);

  const moonX = width * (mobile ? 0.79 : 0.82);
  const moonY = height * (mobile ? 0.33 : 0.35);
  drawMoon(journeyContext, moonX, moonY, radius * 0.2727, moonReveal);

  if (moonReveal > 0.05) {
    journeyContext.save();
    journeyContext.globalAlpha = moonReveal * 0.28;
    journeyContext.strokeStyle = "rgba(224, 230, 229, 0.45)";
    journeyContext.lineWidth = 1;
    journeyContext.setLineDash([2, 7]);
    journeyContext.beginPath();
    journeyContext.moveTo(earthX + radius * 1.18, earthY - radius * 0.25);
    journeyContext.lineTo(moonX - radius * 0.42, moonY + radius * 0.08);
    journeyContext.stroke();
    journeyContext.restore();
  }
}

function drawStarfield(time = 0) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  pointer.x += (pointer.targetX - pointer.x) * 0.025;
  pointer.y += (pointer.targetY - pointer.y) * 0.025;

  for (const star of stars) {
    const retreat = smoothstep(range(currentJourneyProgress, 0.26, 0.96));
    const depthScale = 1 + retreat * star.depth * 0.055;
    const driftX = pointer.x * star.depth * 9;
    const driftY = pointer.y * star.depth * 7;
    const twinkle = motionQuery.matches
      ? 1
      : 0.82 + Math.sin(time * 0.00045 + star.phase) * 0.18;
    const x = (star.x - 0.5) * window.innerWidth * depthScale + window.innerWidth * 0.5 + driftX;
    const y = (star.y - 0.5) * window.innerHeight * depthScale + window.innerHeight * 0.5 + driftY;

    context.beginPath();
    context.fillStyle = `rgba(225, 236, 240, ${star.alpha * twinkle})`;
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  animationFrame = requestAnimationFrame(drawStarfield);
}

function updateScrollScene() {
  const viewport = Math.max(window.innerHeight, 1);
  const heroProgress = Math.min(1, Math.max(0, window.scrollY / (viewport * 0.82)));
  const departureTop = departure.offsetTop;
  const journeyLength = Math.max(departure.offsetHeight - viewport, 1);
  const departureProgress = clamp((window.scrollY - departureTop) / journeyLength);
  const copyEntrance = smoothstep(range(departureProgress, 0, 0.12));
  const copyExit = 1 - smoothstep(range(departureProgress, 0.18, 0.34));
  const earthLabelOpacity = smoothstep(range(departureProgress, 0.32, 0.45)) *
    (1 - smoothstep(range(departureProgress, 0.66, 0.76)));
  const moonLabelOpacity = smoothstep(range(departureProgress, 0.83, 0.95));

  heroContent.style.opacity = `${1 - heroProgress * 1.15}`;
  heroContent.style.transform = `translate3d(0, ${heroProgress * -6}vh, 0) scale(${1 - heroProgress * 0.08})`;
  currentJourneyProgress = departureProgress;
  journeyViewport.style.setProperty("--departure-copy-opacity", (copyEntrance * copyExit).toFixed(3));
  journeyViewport.style.setProperty("--departure-copy-y", `${mix(3, -2, copyEntrance).toFixed(2)}rem`);
  journeyViewport.style.setProperty("--earth-label-opacity", earthLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--moon-label-opacity", moonLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--guide-opacity", mix(0.1, 0.32, copyEntrance).toFixed(3));
  journeyViewport.style.setProperty("--journey-ui-opacity", smoothstep(range(departureProgress, 0.15, 0.3)).toFixed(3));
  journeyProgressValue.textContent = String(Math.round(departureProgress * 100)).padStart(3, "0");
  drawJourney(departureProgress);
}

function completeLoadingSequence() {
  loader.classList.add("is-exiting");

  window.setTimeout(() => {
    loader.classList.add("is-complete");
    page.classList.remove("is-loading");
    page.classList.add("is-ready");
  }, motionQuery.matches ? 20 : 720);
}

function initializeLoadingSequence() {
  if (sessionStorage.getItem("cosmos-intro-seen") || motionQuery.matches) {
    completeLoadingSequence();
    return;
  }

  loadingStates.forEach(([delay, label]) => {
    window.setTimeout(() => {
      loaderStatus.textContent = label;
    }, delay);
  });

  window.setTimeout(() => {
    sessionStorage.setItem("cosmos-intro-seen", "true");
    completeLoadingSequence();
  }, 2350);
}

window.addEventListener("pointermove", (event) => {
  pointer.targetX = event.clientX / window.innerWidth - 0.5;
  pointer.targetY = event.clientY / window.innerHeight - 0.5;
});

window.addEventListener("resize", () => {
  resizeStarfield();
  resizeJourneyCanvas();
}, { passive: true });
window.addEventListener("scroll", updateScrollScene, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animationFrame);
  } else {
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(drawStarfield);
  }
});

resizeStarfield();
resizeJourneyCanvas();
updateScrollScene();
animationFrame = requestAnimationFrame(drawStarfield);
initializeLoadingSequence();
