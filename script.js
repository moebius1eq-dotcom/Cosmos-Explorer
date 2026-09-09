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

function loadSurface(src, size, longitude, isEarth, assign) {
  const image = new Image();
  image.addEventListener("load", () => {
    try {
      assign(createSphereTexture(image, size, longitude, isEarth));
    } catch (error) {
      console.warn("Surface projection unavailable; use a local HTTP server.", error);
    }
    drawJourney(currentJourneyProgress);
  });
  image.addEventListener("error", () => drawJourney(currentJourneyProgress));
  image.src = src;
}

loadSurface("assets/earth-blue-marble.jpg", 1536, -70, true, value => earthTexture = value);
loadSurface("assets/moon-lroc.jpg", 512, 0, false, value => moonTexture = value);

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

function createSphereTexture(image, size, longitude, isEarth) {
  const source = document.createElement("canvas");
  source.width = Math.min(image.naturalWidth, 4096);
  source.height = Math.round(source.width / 2);
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0, source.width, source.height);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const texture = document.createElement("canvas");
  texture.width = texture.height = size;
  const target = texture.getContext("2d");
  const output = target.createImageData(size, size);
  const centralLongitude = longitude * Math.PI / 180;

  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size * 2 - 1;
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size * 2 - 1;
      const r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;
      const nz = Math.sqrt(1 - r2);
      const u = ((0.5 + (Math.atan2(nx, nz) + centralLongitude) / (2 * Math.PI)) % 1 + 1) % 1;
      const v = 0.5 + Math.asin(ny) / Math.PI;
      const sx = u * source.width;
      const sy = clamp(v * source.height, 0, source.height - 1);
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const x1 = (x0 + 1) % source.width;
      const y1 = Math.min(y0 + 1, source.height - 1);
      const indices = [
        (y0 * source.width + x0) * 4,
        (y0 * source.width + x1) * 4,
        (y1 * source.width + x0) * 4,
        (y1 * source.width + x1) * 4,
      ];
      const sun = -0.68 * nx - 0.32 * ny + 0.66 * nz;
      const illumination = 0.012 + 0.94 * Math.pow(Math.max(0, sun), 0.65);
      const rim = isEarth ? Math.pow(1 - nz, 4) * smoothstep(range(sun, -0.1, 0.3)) : 0;
      const index = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const surface = mix(
          mix(pixels[indices[0] + channel], pixels[indices[1] + channel], fx),
          mix(pixels[indices[2] + channel], pixels[indices[3] + channel], fx),
          fy,
        );
        output.data[index + channel] = surface * illumination + rim * [12, 48, 78][channel];
      }
      output.data[index + 3] = 255 * clamp((1 - Math.sqrt(r2)) * size / 2);
    }
  }
  target.putImageData(output, 0, 0);
  return texture;
}

function drawEarth(context2d, x, y, radius) {
  const atmosphere = context2d.createRadialGradient(x, y, radius * 0.997, x, y, radius * 1.012);
  atmosphere.addColorStop(0, "rgba(95, 166, 213, 0.24)");
  atmosphere.addColorStop(0.3, "rgba(65, 131, 184, 0.1)");
  atmosphere.addColorStop(1, "rgba(65, 131, 184, 0)");
  context2d.fillStyle = atmosphere;
  context2d.beginPath();
  context2d.arc(x, y, radius * 1.012, 0, Math.PI * 2);
  context2d.fill();
  if (earthTexture) {
    context2d.drawImage(earthTexture, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    drawFallbackSphere(context2d, x, y, radius, "#153440");
  }
}

function drawFallbackSphere(context2d, x, y, radius, color) {
  const shade = context2d.createRadialGradient(x - radius * 0.4, y - radius * 0.4, 0, x, y, radius);
  shade.addColorStop(0, color);
  shade.addColorStop(1, "#010203");
  context2d.fillStyle = shade;
  context2d.beginPath();
  context2d.arc(x, y, radius, 0, Math.PI * 2);
  context2d.fill();
}

function drawMoon(context2d, x, y, radius, opacity) {
  context2d.save();
  context2d.globalAlpha = opacity;
  if (moonTexture) {
    context2d.drawImage(moonTexture, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    drawFallbackSphere(context2d, x, y, radius, "#737370");
  }
  context2d.restore();
}

function drawJourney(progress) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const reveal = smoothstep(range(progress, 0.02, 0.34));
  const pullback = smoothstep(Math.pow(range(progress, 0.08, 1), 1.35));
  const mobile = width < 700;

  journeyContext.clearRect(0, 0, width, height);

  const initialRadius = Math.max(width, height) * (mobile ? 0.88 : 0.72);
  const finalRadius = Math.min(width, height) * (mobile ? 0.095 : 0.085);
  const radius = initialRadius * Math.pow(finalRadius / initialRadius, pullback);
  const framing = smoothstep(range(progress, 0.08, 0.65));
  const earthX = mix(width * (mobile ? 0.58 : 0.66), width * (mobile ? 0.3 : 0.46), framing);
  const earthY = mix(height + initialRadius * 0.58, height * 0.55, framing);

  drawEarth(journeyContext, earthX, earthY, radius, reveal);

  const separation = width * (mobile ? 0.52 : 0.34) / finalRadius;
  const moonX = earthX + radius * separation;
  const moonY = earthY - radius * (mobile ? 1.7 : 0.95);
  const moonReveal = smoothstep(range(progress, 0.58, 0.72));
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
    const driftX = (motionQuery.matches ? 0 : pointer.x) * star.depth * 9;
    const driftY = (motionQuery.matches ? 0 : pointer.y) * star.depth * 7;
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

  if (!motionQuery.matches) animationFrame = requestAnimationFrame(drawStarfield);
}

function updateScrollScene() {
  const viewport = Math.max(window.innerHeight, 1);
  const heroProgress = Math.min(1, Math.max(0, window.scrollY / (viewport * 0.82)));
  const departureTop = departure.offsetTop;
  const journeyLength = Math.max(departure.offsetHeight - viewport, 1);
  const departureProgress = clamp((window.scrollY - departureTop) / journeyLength);
  const copyEntrance = smoothstep(range(departureProgress, 0, 0.12));
  const copyExit = 1 - smoothstep(range(departureProgress, 0.18, 0.34));
  const earthLabelOpacity = smoothstep(range(departureProgress, 0.43, 0.56)) *
    (1 - smoothstep(range(departureProgress, 0.74, 0.84)));
  const moonLabelOpacity = smoothstep(range(departureProgress, 0.87, 0.97));

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
  if (motionQuery.matches) drawStarfield();
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
  updateScrollScene();
}, { passive: true });
window.addEventListener("scroll", updateScrollScene, { passive: true });

motionQuery.addEventListener("change", () => {
  cancelAnimationFrame(animationFrame);
  drawStarfield();
});

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
