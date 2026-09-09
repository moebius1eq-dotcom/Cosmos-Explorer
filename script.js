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
const journeyProgressStage = document.querySelector(".journey-progress__stage");

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
let stars = [];
let animationFrame = 0;
let pixelRatio = 1;
let journeyPixelRatio = 1;
let currentJourneyProgress = 0;
let earthTexture = null;
let moonTexture = null;
let sunTexture = null;

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

function seededNoise(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function interpolatedNoise(x, y, scale) {
  const sampleX = x / scale;
  const sampleY = y / scale;
  const x0 = Math.floor(sampleX);
  const y0 = Math.floor(sampleY);
  const fx = smoothstep(sampleX - x0);
  const fy = smoothstep(sampleY - y0);
  return mix(
    mix(seededNoise(x0, y0), seededNoise(x0 + 1, y0), fx),
    mix(seededNoise(x0, y0 + 1), seededNoise(x0 + 1, y0 + 1), fx),
    fy,
  );
}

function createSunTexture() {
  const size = 512;
  const texture = document.createElement("canvas");
  texture.width = texture.height = size;
  const textureContext = texture.getContext("2d");
  const imageData = textureContext.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size * 2 - 1;
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size * 2 - 1;
      const distance = Math.sqrt(nx * nx + ny * ny);
      if (distance >= 1) continue;
      const broad = interpolatedNoise(x, y, 34);
      const cells = interpolatedNoise(x + 71, y - 43, 8);
      const grain = broad * 0.58 + cells * 0.42;
      const limb = Math.pow(1 - distance * distance, 0.22);
      const brightness = 0.72 + grain * 0.28;
      const index = (y * size + x) * 4;
      imageData.data[index] = 255 * brightness * limb;
      imageData.data[index + 1] = 196 * brightness * limb;
      imageData.data[index + 2] = 86 * brightness * limb;
      imageData.data[index + 3] = 255 * clamp((1 - distance) * size / 2);
    }
  }
  textureContext.putImageData(imageData, 0, 0);
  return texture;
}

function drawSun(context2d, x, y, radius, opacity) {
  if (opacity <= 0 || radius <= 0) return;
  context2d.save();
  context2d.globalAlpha = opacity;
  const corona = context2d.createRadialGradient(x, y, radius * 0.72, x, y, radius * 1.85);
  corona.addColorStop(0, "rgba(255, 241, 190, 0.22)");
  corona.addColorStop(0.52, "rgba(222, 161, 70, 0.065)");
  corona.addColorStop(1, "rgba(196, 112, 38, 0)");
  context2d.fillStyle = corona;
  context2d.beginPath();
  context2d.arc(x, y, radius * 1.85, 0, Math.PI * 2);
  context2d.fill();

  sunTexture ||= createSunTexture();
  context2d.drawImage(sunTexture, x - radius, y - radius, radius * 2, radius * 2);
  const highlight = context2d.createRadialGradient(
    x - radius * 0.24,
    y - radius * 0.26,
    0,
    x,
    y,
    radius,
  );
  highlight.addColorStop(0, "rgba(255, 250, 216, 0.48)");
  highlight.addColorStop(0.42, "rgba(255, 224, 151, 0.08)");
  highlight.addColorStop(1, "rgba(112, 38, 16, 0.2)");
  context2d.fillStyle = highlight;
  context2d.beginPath();
  context2d.arc(x, y, radius, 0, Math.PI * 2);
  context2d.fill();
  context2d.restore();
}

function drawOrbit(context2d, x, y, radiusX, radiusY, opacity) {
  context2d.save();
  context2d.globalAlpha = opacity;
  context2d.strokeStyle = "rgba(214, 222, 219, 0.2)";
  context2d.lineWidth = 0.75;
  context2d.beginPath();
  context2d.ellipse(x, y, radiusX, radiusY, -0.08, 0, Math.PI * 2);
  context2d.stroke();
  context2d.restore();
}

function orbitPoint(centerX, centerY, radiusX, radiusY, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: centerX + cos * radiusX * Math.cos(-0.08) - sin * radiusY * Math.sin(-0.08),
    y: centerY + cos * radiusX * Math.sin(-0.08) + sin * radiusY * Math.cos(-0.08),
  };
}

function drawPlanet(context2d, x, y, radius, color, opacity) {
  context2d.save();
  context2d.globalAlpha = opacity;
  context2d.fillStyle = color;
  context2d.shadowColor = color;
  context2d.shadowBlur = radius * 2;
  context2d.beginPath();
  context2d.arc(x, y, Math.max(0.7, radius), 0, Math.PI * 2);
  context2d.fill();
  context2d.restore();
}

function drawJourney(progress) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const earthProgress = clamp(progress / 0.6);
  const reveal = smoothstep(range(earthProgress, 0.02, 0.34));
  const pullback = smoothstep(Math.pow(range(earthProgress, 0.08, 1), 1.35));
  const solarPullback = smoothstep(range(progress, 0.58, 0.82));
  const systemReveal = smoothstep(range(progress, 0.72, 0.92));
  const mobile = width < 700;

  journeyContext.clearRect(0, 0, width, height);

  const initialRadius = Math.max(width, height) * (mobile ? 0.88 : 0.72);
  const finalRadius = Math.min(width, height) * (mobile ? 0.095 : 0.085);
  const radius = initialRadius * Math.pow(finalRadius / initialRadius, pullback);
  const framing = smoothstep(range(earthProgress, 0.08, 0.65));
  const solarCenterX = width * (mobile ? 0.5 : 0.52);
  const solarCenterY = height * 0.53;
  const earthOrbitX = width * (mobile ? 0.39 : 0.34);
  const earthOrbitY = height * (mobile ? 0.12 : 0.15);
  const earthOrbit = orbitPoint(solarCenterX, solarCenterY, earthOrbitX, earthOrbitY, 0.12);
  const earthSystemX = mix(width * (mobile ? 0.58 : 0.66), width * (mobile ? 0.3 : 0.46), framing);
  const earthSystemY = mix(height + initialRadius * 0.58, height * 0.55, framing);
  const earthX = mix(earthSystemX, earthOrbit.x, solarPullback);
  const earthY = mix(earthSystemY, earthOrbit.y, solarPullback);
  const solarEarthRadius = mobile ? 2.1 : 2.4;
  const displayedEarthRadius = mix(radius, solarEarthRadius, solarPullback);

  drawEarth(journeyContext, earthX, earthY, displayedEarthRadius, reveal);

  const separation = width * (mobile ? 0.52 : 0.34) / finalRadius;
  const moonX = earthX + displayedEarthRadius * separation * (1 - solarPullback);
  const moonY = earthY - displayedEarthRadius * (mobile ? 1.7 : 0.95) * (1 - solarPullback);
  const moonReveal = smoothstep(range(earthProgress, 0.58, 0.72)) * (1 - solarPullback);
  drawMoon(journeyContext, moonX, moonY, displayedEarthRadius * 0.2727, moonReveal);

  if (moonReveal > 0.05) {
    journeyContext.save();
    journeyContext.globalAlpha = moonReveal * 0.28;
    journeyContext.strokeStyle = "rgba(224, 230, 229, 0.45)";
    journeyContext.lineWidth = 1;
    journeyContext.setLineDash([2, 7]);
    journeyContext.beginPath();
    journeyContext.moveTo(earthX + displayedEarthRadius * 1.18, earthY - displayedEarthRadius * 0.25);
    journeyContext.lineTo(moonX - displayedEarthRadius * 0.42, moonY + displayedEarthRadius * 0.08);
    journeyContext.stroke();
    journeyContext.restore();
  }

  const orbitOpacity = systemReveal * 0.62;
  const orbitScale = mix(0.86, 1, systemReveal);
  const orbits = [
    { x: 0.13, y: 0.055, angle: 3.85, radius: 1.05, color: "#aaa59b" },
    { x: 0.23, y: 0.095, angle: 2.18, radius: 1.45, color: "#c5a16b" },
    { x: mobile ? 0.39 : 0.34, y: mobile ? 0.12 : 0.15, angle: 0.12, radius: solarEarthRadius, color: "#75a9bf" },
    { x: mobile ? 0.47 : 0.43, y: mobile ? 0.15 : 0.19, angle: 5.08, radius: 1.3, color: "#b86f50" },
  ];

  for (const orbit of orbits) {
    const orbitX = width * orbit.x * orbitScale;
    const orbitY = height * orbit.y * orbitScale;
    drawOrbit(journeyContext, solarCenterX, solarCenterY, orbitX, orbitY, orbitOpacity);
    if (orbit.color !== "#75a9bf") {
      const planet = orbitPoint(solarCenterX, solarCenterY, orbitX, orbitY, orbit.angle);
      drawPlanet(journeyContext, planet.x, planet.y, orbit.radius, orbit.color, systemReveal);
    }
  }

  drawSun(
    journeyContext,
    solarCenterX,
    solarCenterY,
    mix(height * 0.025, height * (mobile ? 0.075 : 0.09), systemReveal),
    smoothstep(range(progress, 0.64, 0.79)),
  );
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
  const earthLabelOpacity = smoothstep(range(departureProgress, 0.27, 0.36)) *
    (1 - smoothstep(range(departureProgress, 0.48, 0.56)));
  const moonLabelOpacity = smoothstep(range(departureProgress, 0.5, 0.57)) *
    (1 - smoothstep(range(departureProgress, 0.62, 0.68)));
  const solarCopyOpacity = smoothstep(range(departureProgress, 0.62, 0.69)) *
    (1 - smoothstep(range(departureProgress, 0.74, 0.82)));
  const sunLabelOpacity = smoothstep(range(departureProgress, 0.78, 0.88));
  const auLabelOpacity = smoothstep(range(departureProgress, 0.86, 0.96));

  heroContent.style.opacity = `${1 - heroProgress * 1.15}`;
  heroContent.style.transform = `translate3d(0, ${heroProgress * -6}vh, 0) scale(${1 - heroProgress * 0.08})`;
  currentJourneyProgress = departureProgress;
  journeyViewport.style.setProperty("--departure-copy-opacity", (copyEntrance * copyExit).toFixed(3));
  journeyViewport.style.setProperty("--departure-copy-y", `${mix(3, -2, copyEntrance).toFixed(2)}rem`);
  journeyViewport.style.setProperty("--earth-label-opacity", earthLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--moon-label-opacity", moonLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--solar-copy-opacity", solarCopyOpacity.toFixed(3));
  journeyViewport.style.setProperty("--sun-label-opacity", sunLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--au-label-opacity", auLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--guide-opacity", mix(0.1, 0.32, copyEntrance).toFixed(3));
  journeyViewport.style.setProperty("--journey-ui-opacity", smoothstep(range(departureProgress, 0.15, 0.3)).toFixed(3));
  journeyProgressValue.textContent = String(Math.round(departureProgress * 100)).padStart(3, "0");
  journeyProgressStage.textContent = departureProgress < 0.68 ? "EARTH SYSTEM" : "INNER SOLAR SYSTEM";
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
