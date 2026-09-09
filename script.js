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
let milkyWayTexture = null;
let cosmicWebTexture = null;

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

function drawSaturn(context2d, x, y, radius, opacity) {
  context2d.save();
  context2d.globalAlpha = opacity;
  context2d.translate(x, y);
  context2d.rotate(-0.16);
  context2d.strokeStyle = "rgba(205, 190, 153, 0.62)";
  context2d.lineWidth = Math.max(0.65, radius * 0.28);
  context2d.beginPath();
  context2d.ellipse(0, 0, radius * 1.85, radius * 0.62, 0, 0, Math.PI * 2);
  context2d.stroke();
  context2d.fillStyle = "#c3ab79";
  context2d.beginPath();
  context2d.arc(0, 0, radius, 0, Math.PI * 2);
  context2d.fill();
  context2d.restore();
}

function drawDistantStar(context2d, x, y, radius, color, opacity) {
  if (opacity <= 0) return;
  context2d.save();
  context2d.globalAlpha = opacity;
  const glow = context2d.createRadialGradient(x, y, 0, x, y, radius * 7);
  glow.addColorStop(0, color);
  glow.addColorStop(0.15, color);
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context2d.fillStyle = glow;
  context2d.beginPath();
  context2d.arc(x, y, radius * 7, 0, Math.PI * 2);
  context2d.fill();
  context2d.fillStyle = "rgba(255, 252, 235, 0.95)";
  context2d.beginPath();
  context2d.arc(x, y, Math.max(0.8, radius), 0, Math.PI * 2);
  context2d.fill();
  context2d.restore();
}

function drawStarName(context2d, label, x, y, opacity, align = "left") {
  context2d.save();
  context2d.globalAlpha = opacity * 0.48;
  context2d.fillStyle = "#dfe5e2";
  context2d.font = "500 8px Inter, Helvetica Neue, Arial, sans-serif";
  context2d.textAlign = align;
  context2d.fillText(label, x, y);
  context2d.restore();
}

function createMilkyWayTexture() {
  const size = 1024;
  const texture = document.createElement("canvas");
  texture.width = texture.height = size;
  const galaxy = texture.getContext("2d");
  galaxy.translate(size / 2, size / 2);
  galaxy.globalCompositeOperation = "lighter";

  const core = galaxy.createRadialGradient(0, 0, 0, 0, 0, size * 0.16);
  core.addColorStop(0, "rgba(255, 241, 199, 0.78)");
  core.addColorStop(0.18, "rgba(224, 196, 147, 0.34)");
  core.addColorStop(1, "rgba(125, 147, 160, 0)");
  galaxy.fillStyle = core;
  galaxy.beginPath();
  galaxy.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  galaxy.fill();

  for (let index = 0; index < 3200; index++) {
    const arm = index % 4;
    const radialNoise = seededNoise(index, 17);
    const radius = Math.pow(radialNoise, 0.72) * size * 0.43;
    const angle = arm * Math.PI / 2 + radius / size * 11.5 + (seededNoise(index, 29) - 0.5) * 0.5;
    const scatter = (seededNoise(index, 41) - 0.5) * (12 + radius * 0.11);
    const x = Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * scatter;
    const y = Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * scatter;
    const brightness = 0.12 + seededNoise(index, 53) * 0.48;
    const pointRadius = 0.35 + seededNoise(index, 67) * 1.15;
    const warm = radius < size * 0.16;
    galaxy.fillStyle = warm
      ? `rgba(238, 211, 166, ${brightness})`
      : `rgba(166, 200, 215, ${brightness})`;
    galaxy.beginPath();
    galaxy.arc(x, y, pointRadius, 0, Math.PI * 2);
    galaxy.fill();
  }
  return texture;
}

function drawMilkyWay(context2d, x, y, radius, opacity, rotation = -0.18, flatten = 0.58) {
  if (opacity <= 0) return;
  milkyWayTexture ||= createMilkyWayTexture();
  context2d.save();
  context2d.globalAlpha = opacity;
  context2d.translate(x, y);
  context2d.rotate(rotation);
  context2d.scale(1, flatten);
  context2d.drawImage(milkyWayTexture, -radius, -radius, radius * 2, radius * 2);
  context2d.restore();
}

function createCosmicWebTexture() {
  const size = 1024;
  const texture = document.createElement("canvas");
  texture.width = texture.height = size;
  const web = texture.getContext("2d");
  const nodes = Array.from({ length: 72 }, (_, index) => ({
    x: size * (0.08 + seededNoise(index, 101) * 0.84),
    y: size * (0.08 + seededNoise(index, 113) * 0.84),
    weight: seededNoise(index, 127),
  }));

  web.globalCompositeOperation = "lighter";
  for (let index = 0; index < nodes.length; index++) {
    const source = nodes[index];
    const nearest = nodes
      .map((node, target) => ({ target, distance: Math.hypot(node.x - source.x, node.y - source.y) }))
      .filter(({ target }) => target !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, source.weight > 0.7 ? 3 : 2);
    for (const { target, distance } of nearest) {
      if (target < index || distance > size * 0.22) continue;
      const destination = nodes[target];
      const gradient = web.createLinearGradient(source.x, source.y, destination.x, destination.y);
      gradient.addColorStop(0, "rgba(120, 174, 193, 0.2)");
      gradient.addColorStop(0.5, "rgba(178, 201, 207, 0.08)");
      gradient.addColorStop(1, "rgba(120, 174, 193, 0.2)");
      web.strokeStyle = gradient;
      web.lineWidth = 0.6 + Math.min(source.weight, destination.weight) * 1.2;
      web.beginPath();
      web.moveTo(source.x, source.y);
      const bend = (seededNoise(index, target) - 0.5) * 55;
      web.quadraticCurveTo(
        (source.x + destination.x) / 2 + bend,
        (source.y + destination.y) / 2 - bend,
        destination.x,
        destination.y,
      );
      web.stroke();
    }
  }

  for (const node of nodes) {
    const radius = 1.2 + node.weight * 3.4;
    const glow = web.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 5);
    glow.addColorStop(0, `rgba(224, 231, 218, ${0.34 + node.weight * 0.32})`);
    glow.addColorStop(0.18, "rgba(154, 194, 205, 0.22)");
    glow.addColorStop(1, "rgba(110, 158, 177, 0)");
    web.fillStyle = glow;
    web.beginPath();
    web.arc(node.x, node.y, radius * 5, 0, Math.PI * 2);
    web.fill();
  }
  return texture;
}

function drawCosmicWeb(context2d, x, y, radius, opacity) {
  if (opacity <= 0) return;
  cosmicWebTexture ||= createCosmicWebTexture();
  context2d.save();
  context2d.globalAlpha = opacity;
  context2d.drawImage(cosmicWebTexture, x - radius, y - radius, radius * 2, radius * 2);
  context2d.restore();
}

function drawJourney(progress) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const groupProgress = clamp(progress / 0.8);
  const galacticProgress = clamp(groupProgress / 0.8);
  const stellarProgress = clamp(galacticProgress / 0.78);
  const solarProgress = clamp(stellarProgress / 0.75);
  const innerProgress = clamp(solarProgress / 0.72);
  const earthProgress = clamp(innerProgress / 0.6);
  const reveal = smoothstep(range(earthProgress, 0.02, 0.34));
  const pullback = smoothstep(Math.pow(range(earthProgress, 0.08, 1), 1.35));
  const solarPullback = smoothstep(range(innerProgress, 0.58, 0.82));
  const systemReveal = smoothstep(range(innerProgress, 0.72, 0.92));
  const outerPullback = smoothstep(range(solarProgress, 0.7, 0.94));
  const outerReveal = smoothstep(range(solarProgress, 0.76, 0.96));
  const stellarPullback = smoothstep(range(stellarProgress, 0.74, 0.94));
  const stellarReveal = smoothstep(range(stellarProgress, 0.8, 0.97));
  const galacticPullback = smoothstep(range(galacticProgress, 0.76, 0.94));
  const galacticReveal = smoothstep(range(galacticProgress, 0.8, 0.97));
  const groupPullback = smoothstep(range(groupProgress, 0.78, 0.95));
  const groupReveal = smoothstep(range(groupProgress, 0.82, 0.97));
  const webPullback = smoothstep(range(progress, 0.78, 0.95));
  const webReveal = smoothstep(range(progress, 0.82, 0.98));
  const mobile = width < 700;

  journeyContext.clearRect(0, 0, width, height);

  const initialRadius = Math.max(width, height) * (mobile ? 0.88 : 0.72);
  const finalRadius = Math.min(width, height) * (mobile ? 0.095 : 0.085);
  const radius = initialRadius * Math.pow(finalRadius / initialRadius, pullback);
  const framing = smoothstep(range(earthProgress, 0.08, 0.65));
  const neighborhoodCenterX = mix(width * (mobile ? 0.28 : 0.34), width * 0.58, galacticPullback);
  const neighborhoodCenterY = mix(height * 0.62, height * 0.57, galacticPullback);
  const solarCenterX = mix(width * (mobile ? 0.5 : 0.52), neighborhoodCenterX, stellarPullback);
  const solarCenterY = mix(height * 0.53, neighborhoodCenterY, stellarPullback);
  const galaxyScale = mix(1, 0.01, galacticPullback);
  const stellarSystemScale = mix(1, 0.045, stellarPullback) * galaxyScale;
  const bodyScale = mix(1, 0.18, stellarPullback) * galaxyScale;
  const innerSystemScale = mix(1, mobile ? 0.34 : 0.29, outerPullback) * stellarSystemScale;
  const innerOrbitScale = mix(0.86, 1, systemReveal) * innerSystemScale;
  const earthOrbitX = width * (mobile ? 0.39 : 0.34) * innerOrbitScale;
  const earthOrbitY = height * (mobile ? 0.12 : 0.15) * innerOrbitScale;
  const earthOrbit = orbitPoint(solarCenterX, solarCenterY, earthOrbitX, earthOrbitY, 0.12);
  const earthSystemX = mix(width * (mobile ? 0.58 : 0.66), width * (mobile ? 0.3 : 0.46), framing);
  const earthSystemY = mix(height + initialRadius * 0.58, height * 0.55, framing);
  const earthX = mix(earthSystemX, earthOrbit.x, solarPullback);
  const earthY = mix(earthSystemY, earthOrbit.y, solarPullback);
  const solarEarthRadius = mix(mobile ? 2.1 : 2.4, 1.05, outerPullback) * bodyScale;
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

  const orbitOpacity = systemReveal * 0.62 * (1 - stellarPullback * 0.72);
  const orbits = [
    { x: 0.13, y: 0.055, angle: 3.85, radius: 1.05, color: "#aaa59b" },
    { x: 0.23, y: 0.095, angle: 2.18, radius: 1.45, color: "#c5a16b" },
    { x: mobile ? 0.39 : 0.34, y: mobile ? 0.12 : 0.15, angle: 0.12, radius: solarEarthRadius, color: "#75a9bf" },
    { x: mobile ? 0.47 : 0.43, y: mobile ? 0.15 : 0.19, angle: 5.08, radius: 1.3, color: "#b86f50" },
  ];

  for (const orbit of orbits) {
    const orbitX = width * orbit.x * innerOrbitScale;
    const orbitY = height * orbit.y * innerOrbitScale;
    drawOrbit(journeyContext, solarCenterX, solarCenterY, orbitX, orbitY, orbitOpacity);
    if (orbit.color !== "#75a9bf") {
      const planet = orbitPoint(solarCenterX, solarCenterY, orbitX, orbitY, orbit.angle);
      drawPlanet(journeyContext, planet.x, planet.y, orbit.radius * bodyScale, orbit.color, systemReveal * galaxyScale);
    }
  }

  const outerOrbitScale = mix(0.86, 1, outerReveal) * stellarSystemScale;
  const outerOrbits = [
    { x: mobile ? 0.18 : 0.17, y: 0.085, angle: 3.62, radius: mobile ? 3.7 : 5.8, color: "#b99372", kind: "planet" },
    { x: mobile ? 0.27 : 0.26, y: 0.13, angle: 1.82, radius: mobile ? 3.3 : 5.1, color: "#c3ab79", kind: "saturn" },
    { x: mobile ? 0.36 : 0.35, y: 0.18, angle: 4.58, radius: mobile ? 2.3 : 3.2, color: "#83b9bd", kind: "planet" },
    { x: mobile ? 0.45 : 0.44, y: 0.235, angle: 5.72, radius: mobile ? 2.2 : 3.1, color: "#527cae", kind: "planet" },
  ];

  for (const orbit of outerOrbits) {
    const orbitX = width * orbit.x * outerOrbitScale;
    const orbitY = height * orbit.y * outerOrbitScale;
    drawOrbit(journeyContext, solarCenterX, solarCenterY, orbitX, orbitY, outerReveal * 0.58 * (1 - stellarPullback * 0.72));
    const planet = orbitPoint(solarCenterX, solarCenterY, orbitX, orbitY, orbit.angle);
    if (orbit.kind === "saturn") {
      drawSaturn(journeyContext, planet.x, planet.y, orbit.radius * bodyScale, outerReveal * galaxyScale);
    } else {
      drawPlanet(journeyContext, planet.x, planet.y, orbit.radius * bodyScale, orbit.color, outerReveal * galaxyScale);
    }
  }

  drawSun(
    journeyContext,
    solarCenterX,
    solarCenterY,
    mix(height * 0.025, height * (mobile ? 0.075 : 0.09), systemReveal) * innerSystemScale,
    smoothstep(range(innerProgress, 0.64, 0.79)),
  );

  const neighborhoodOpacity = 1 - galacticPullback;
  const sunPointOpacity = smoothstep(range(stellarProgress, 0.78, 0.9)) * neighborhoodOpacity;
  drawDistantStar(journeyContext, solarCenterX, solarCenterY, mobile ? 1.1 : 1.35, "rgba(255, 225, 158, 0.92)", sunPointOpacity);

  const alphaAX = width * (mobile ? 0.67 : 0.65);
  const alphaAY = height * (mobile ? 0.39 : 0.42);
  const alphaSeparation = mobile ? 6 : 10;
  const collapsingAlphaX = mix(alphaAX, neighborhoodCenterX, galacticPullback);
  const collapsingAlphaY = mix(alphaAY, neighborhoodCenterY, galacticPullback);
  drawDistantStar(journeyContext, collapsingAlphaX, collapsingAlphaY, mobile ? 1.45 : 1.8, "rgba(255, 222, 154, 0.9)", stellarReveal * neighborhoodOpacity);
  drawDistantStar(journeyContext, collapsingAlphaX + alphaSeparation * neighborhoodOpacity, collapsingAlphaY + alphaSeparation * 0.42 * neighborhoodOpacity, mobile ? 1.15 : 1.45, "rgba(255, 196, 121, 0.86)", stellarReveal * neighborhoodOpacity);

  const proximaX = width * (mobile ? 0.74 : 0.76);
  const proximaY = height * (mobile ? 0.67 : 0.64);
  const collapsingProximaX = mix(proximaX, neighborhoodCenterX, galacticPullback);
  const collapsingProximaY = mix(proximaY, neighborhoodCenterY, galacticPullback);
  drawDistantStar(journeyContext, collapsingProximaX, collapsingProximaY, mobile ? 1.15 : 1.5, "rgba(210, 93, 67, 0.88)", stellarReveal * neighborhoodOpacity);
  const starNameOpacity = smoothstep(range(stellarProgress, 0.9, 0.98)) * neighborhoodOpacity;
  drawStarName(journeyContext, "SUN", solarCenterX - 10, solarCenterY + 17, starNameOpacity, "right");
  drawStarName(journeyContext, "α CENTAURI", alphaAX + 14, alphaAY - 11, starNameOpacity);

  journeyContext.save();
  journeyContext.globalAlpha = stellarReveal * neighborhoodOpacity * 0.24;
  journeyContext.strokeStyle = "rgba(221, 228, 225, 0.38)";
  journeyContext.lineWidth = 0.75;
  journeyContext.setLineDash([2, 8]);
  journeyContext.beginPath();
  journeyContext.moveTo(solarCenterX, solarCenterY);
  journeyContext.lineTo(collapsingProximaX, collapsingProximaY);
  journeyContext.stroke();
  journeyContext.restore();

  const fullGalaxyRadius = Math.min(width, height) * (mobile ? 0.46 : 0.48);
  const groupPointX = width * (mobile ? 0.38 : 0.42);
  const groupPointY = height * 0.57;
  const groupScale = mix(1, 0.04, webPullback);
  const galaxyRadius = mix(fullGalaxyRadius, Math.min(width, height) * (mobile ? 0.075 : 0.085), groupPullback) * groupScale;
  const galaxyX = mix(mix(width * (mobile ? 0.5 : 0.54), width * (mobile ? 0.29 : 0.34), groupPullback), groupPointX, webPullback);
  const galaxyY = mix(mix(height * 0.52, height * (mobile ? 0.58 : 0.6), groupPullback), groupPointY, webPullback);
  drawMilkyWay(journeyContext, galaxyX, galaxyY, galaxyRadius, galacticReveal);

  const localMarkerX = galaxyX + galaxyRadius * (mobile ? 0.38 : 0.42);
  const localMarkerY = galaxyY + galaxyRadius * 0.04;
  drawDistantStar(journeyContext, localMarkerX, localMarkerY, 0.9, "rgba(126, 190, 218, 0.82)", galacticReveal * (1 - groupPullback));
  drawStarName(journeyContext, "ORION SPUR · SUN", localMarkerX + 10, localMarkerY - 8, galacticReveal * (1 - groupPullback));

  const andromedaX = mix(width * (mobile ? 0.68 : 0.7), groupPointX, webPullback);
  const andromedaY = mix(height * (mobile ? 0.39 : 0.4), groupPointY, webPullback);
  const andromedaRadius = Math.min(width, height) * (mobile ? 0.13 : 0.16) * groupScale;
  drawMilkyWay(journeyContext, andromedaX, andromedaY, andromedaRadius, groupReveal * 0.9, 0.26, 0.3);
  drawStarName(journeyContext, "M31 · ANDROMEDA", andromedaX + andromedaRadius * 0.45, andromedaY - andromedaRadius * 0.18, groupReveal * (1 - webPullback));

  const triangulumX = mix(width * (mobile ? 0.69 : 0.67), groupPointX, webPullback);
  const triangulumY = mix(height * (mobile ? 0.69 : 0.72), groupPointY, webPullback);
  const triangulumRadius = Math.min(width, height) * (mobile ? 0.06 : 0.07) * groupScale;
  drawMilkyWay(journeyContext, triangulumX, triangulumY, triangulumRadius, groupReveal * 0.72, -0.52, 0.7);
  drawStarName(journeyContext, "M33 · TRIANGULUM", triangulumX + triangulumRadius * 0.65, triangulumY + triangulumRadius * 0.45, groupReveal * (1 - webPullback));
  drawStarName(journeyContext, "MILKY WAY", galaxyX - galaxyRadius * 0.4, galaxyY + galaxyRadius * 0.82, groupReveal * (1 - webPullback), "right");

  const dwarfs = [
    [0.46, 0.34, 0.75],
    [0.51, 0.73, 0.55],
    [0.79, 0.56, 0.68],
    [0.22, 0.43, 0.5],
    [0.42, 0.82, 0.42],
  ];
  for (const [x, y, strength] of dwarfs) {
    drawDistantStar(journeyContext, mix(width * x, groupPointX, webPullback), mix(height * y, groupPointY, webPullback), mobile ? 0.65 : 0.8, "rgba(185, 204, 210, 0.6)", groupReveal * strength * (1 - webPullback));
  }

  journeyContext.save();
  journeyContext.globalAlpha = groupReveal * (1 - webPullback) * 0.2;
  journeyContext.strokeStyle = "rgba(221, 228, 225, 0.38)";
  journeyContext.lineWidth = 0.75;
  journeyContext.setLineDash([2, 8]);
  journeyContext.beginPath();
  journeyContext.moveTo(galaxyX, galaxyY);
  journeyContext.lineTo(andromedaX, andromedaY);
  journeyContext.stroke();
  journeyContext.restore();

  const webRadius = Math.min(width, height) * (mobile ? 0.62 : 0.65);
  const webX = width * (mobile ? 0.5 : 0.52);
  const webY = height * 0.52;
  drawCosmicWeb(journeyContext, webX, webY, webRadius, webReveal * 0.9);
  const groupMarkerX = webX - webRadius * 0.16;
  const groupMarkerY = webY + webRadius * 0.09;
  drawDistantStar(journeyContext, groupMarkerX, groupMarkerY, 0.9, "rgba(142, 205, 219, 0.9)", webReveal);
  drawStarName(journeyContext, "LOCAL GROUP", groupMarkerX + 10, groupMarkerY - 8, webReveal);
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
  const groupProgress = clamp(departureProgress / 0.8);
  const galacticProgress = clamp(groupProgress / 0.8);
  const stellarProgress = clamp(galacticProgress / 0.78);
  const solarProgress = clamp(stellarProgress / 0.75);
  const innerProgress = clamp(solarProgress / 0.72);
  const copyEntrance = smoothstep(range(innerProgress, 0, 0.12));
  const copyExit = 1 - smoothstep(range(innerProgress, 0.18, 0.34));
  const earthLabelOpacity = smoothstep(range(innerProgress, 0.27, 0.36)) *
    (1 - smoothstep(range(innerProgress, 0.48, 0.56)));
  const moonLabelOpacity = smoothstep(range(innerProgress, 0.5, 0.57)) *
    (1 - smoothstep(range(innerProgress, 0.62, 0.68)));
  const solarCopyOpacity = smoothstep(range(innerProgress, 0.62, 0.69)) *
    (1 - smoothstep(range(innerProgress, 0.74, 0.82)));
  const sunLabelOpacity = smoothstep(range(innerProgress, 0.78, 0.88)) *
    (1 - smoothstep(range(solarProgress, 0.76, 0.84)));
  const auLabelOpacity = smoothstep(range(innerProgress, 0.86, 0.96)) *
    (1 - smoothstep(range(solarProgress, 0.73, 0.8)));
  const outerCopyOpacity = smoothstep(range(solarProgress, 0.73, 0.79)) *
    (1 - smoothstep(range(solarProgress, 0.84, 0.9)));
  const neptuneLabelOpacity = smoothstep(range(solarProgress, 0.9, 0.98)) *
    (1 - smoothstep(range(stellarProgress, 0.76, 0.83)));
  const stellarCopyOpacity = smoothstep(range(stellarProgress, 0.76, 0.82)) *
    (1 - smoothstep(range(stellarProgress, 0.87, 0.92)));
  const proximaLabelOpacity = smoothstep(range(stellarProgress, 0.9, 0.98)) *
    (1 - smoothstep(range(galacticProgress, 0.77, 0.84)));
  const galacticCopyOpacity = smoothstep(range(galacticProgress, 0.77, 0.83)) *
    (1 - smoothstep(range(galacticProgress, 0.88, 0.93)));
  const galaxyLabelOpacity = smoothstep(range(galacticProgress, 0.91, 0.98)) *
    (1 - smoothstep(range(groupProgress, 0.79, 0.86)));
  const groupCopyOpacity = smoothstep(range(groupProgress, 0.79, 0.84)) *
    (1 - smoothstep(range(groupProgress, 0.88, 0.93)));
  const andromedaLabelOpacity = smoothstep(range(groupProgress, 0.91, 0.98)) *
    (1 - smoothstep(range(departureProgress, 0.79, 0.86)));
  const webCopyOpacity = smoothstep(range(departureProgress, 0.79, 0.84)) *
    (1 - smoothstep(range(departureProgress, 0.88, 0.93)));
  const laniakeaLabelOpacity = smoothstep(range(departureProgress, 0.91, 0.98));

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
  journeyViewport.style.setProperty("--outer-copy-opacity", outerCopyOpacity.toFixed(3));
  journeyViewport.style.setProperty("--neptune-label-opacity", neptuneLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--stellar-copy-opacity", stellarCopyOpacity.toFixed(3));
  journeyViewport.style.setProperty("--proxima-label-opacity", proximaLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--galactic-copy-opacity", galacticCopyOpacity.toFixed(3));
  journeyViewport.style.setProperty("--galaxy-label-opacity", galaxyLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--group-copy-opacity", groupCopyOpacity.toFixed(3));
  journeyViewport.style.setProperty("--andromeda-label-opacity", andromedaLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--web-copy-opacity", webCopyOpacity.toFixed(3));
  journeyViewport.style.setProperty("--laniakea-label-opacity", laniakeaLabelOpacity.toFixed(3));
  journeyViewport.style.setProperty("--guide-opacity", mix(0.1, 0.32, copyEntrance).toFixed(3));
  journeyViewport.style.setProperty("--journey-ui-opacity", smoothstep(range(departureProgress, 0.15, 0.3)).toFixed(3));
  journeyProgressValue.textContent = String(Math.round(departureProgress * 100)).padStart(3, "0");
  journeyProgressStage.textContent = departureProgress < 0.18
    ? "EARTH SYSTEM"
    : departureProgress < 0.28
      ? "INNER SOLAR SYSTEM"
      : departureProgress < 0.38
        ? "SOLAR SYSTEM"
        : departureProgress < 0.5
          ? "STELLAR NEIGHBORHOOD"
          : departureProgress < 0.64
            ? "MILKY WAY"
            : departureProgress < 0.8
              ? "LOCAL GROUP"
              : "COSMIC WEB";
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
