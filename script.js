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

function drawEarth(context2d, x, y, radius, reveal) {
  const atmosphere = context2d.createRadialGradient(x, y, radius * 0.78, x, y, radius * 1.08);
  atmosphere.addColorStop(0.88, "rgba(98, 155, 185, 0)");
  atmosphere.addColorStop(0.97, `rgba(124, 190, 220, ${0.18 + reveal * 0.16})`);
  atmosphere.addColorStop(1, "rgba(124, 190, 220, 0)");
  context2d.fillStyle = atmosphere;
  context2d.beginPath();
  context2d.arc(x, y, radius * 1.1, 0, Math.PI * 2);
  context2d.fill();

  context2d.save();
  context2d.beginPath();
  context2d.arc(x, y, radius, 0, Math.PI * 2);
  context2d.clip();

  const ocean = context2d.createRadialGradient(
    x - radius * 0.38,
    y - radius * 0.42,
    radius * 0.08,
    x,
    y,
    radius * 1.12,
  );
  ocean.addColorStop(0, "#527c8c");
  ocean.addColorStop(0.42, "#1c3b49");
  ocean.addColorStop(0.78, "#0b1820");
  ocean.addColorStop(1, "#020506");
  context2d.fillStyle = ocean;
  context2d.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  context2d.fillStyle = `rgba(94, 115, 91, ${0.48 + reveal * 0.18})`;
  const landforms = [
    [
      [-0.73, -0.44], [-0.58, -0.56], [-0.38, -0.52], [-0.25, -0.39],
      [-0.31, -0.26], [-0.44, -0.19], [-0.5, -0.06], [-0.61, -0.14],
      [-0.67, -0.28],
    ],
    [
      [-0.43, -0.05], [-0.29, -0.02], [-0.22, 0.11], [-0.27, 0.3],
      [-0.39, 0.52], [-0.49, 0.36], [-0.53, 0.14],
    ],
    [
      [-0.07, -0.5], [0.09, -0.58], [0.31, -0.5], [0.46, -0.4],
      [0.35, -0.28], [0.15, -0.3], [0.08, -0.18], [-0.05, -0.22],
    ],
    [
      [0.02, -0.17], [0.19, -0.22], [0.35, -0.08], [0.29, 0.12],
      [0.16, 0.34], [0.02, 0.22], [-0.05, 0.02],
    ],
    [[0.38, 0.26], [0.53, 0.23], [0.58, 0.34], [0.45, 0.42], [0.34, 0.36]],
  ];
  landforms.forEach((points) => {
    context2d.beginPath();
    points.forEach(([pointX, pointY], index) => {
      const method = index === 0 ? "moveTo" : "lineTo";
      context2d[method](x + pointX * radius, y + pointY * radius);
    });
    context2d.closePath();
    context2d.fill();
  });

  const cloudBands = [
    [-0.52, -0.3, 0.72, 0.055, -0.18],
    [-0.18, 0.12, 0.85, 0.045, 0.08],
    [0.16, 0.43, 0.58, 0.038, -0.12],
  ];
  context2d.fillStyle = "rgba(225, 234, 232, 0.22)";
  cloudBands.forEach(([offsetX, offsetY, width, height, rotation]) => {
    context2d.save();
    context2d.translate(x + offsetX * radius, y + offsetY * radius);
    context2d.rotate(rotation);
    context2d.beginPath();
    context2d.ellipse(0, 0, width * radius, height * radius, 0, 0, Math.PI * 2);
    context2d.fill();
    context2d.restore();
  });

  const night = context2d.createLinearGradient(x - radius, y, x + radius, y);
  night.addColorStop(0, "rgba(0, 0, 0, 0)");
  night.addColorStop(0.42, "rgba(0, 0, 0, 0.06)");
  night.addColorStop(0.73, "rgba(0, 0, 0, 0.7)");
  night.addColorStop(1, "rgba(0, 0, 0, 0.98)");
  context2d.fillStyle = night;
  context2d.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  context2d.restore();

  context2d.strokeStyle = `rgba(158, 211, 233, ${0.22 + reveal * 0.18})`;
  context2d.lineWidth = Math.max(1, radius * 0.004);
  context2d.beginPath();
  context2d.arc(x, y, radius + context2d.lineWidth, Math.PI * 1.03, Math.PI * 1.72);
  context2d.stroke();
}

function drawMoon(context2d, x, y, radius, opacity) {
  context2d.save();
  context2d.globalAlpha = opacity;
  const surface = context2d.createRadialGradient(
    x - radius * 0.28,
    y - radius * 0.3,
    radius * 0.1,
    x,
    y,
    radius,
  );
  surface.addColorStop(0, "#b9bab4");
  surface.addColorStop(0.68, "#676a68");
  surface.addColorStop(1, "#171a1a");
  context2d.fillStyle = surface;
  context2d.beginPath();
  context2d.arc(x, y, radius, 0, Math.PI * 2);
  context2d.fill();

  context2d.fillStyle = "rgba(25, 28, 28, 0.2)";
  [[-0.25, -0.18, 0.15], [0.2, 0.28, 0.11], [0.32, -0.22, 0.08]].forEach(
    ([offsetX, offsetY, size]) => {
      context2d.beginPath();
      context2d.arc(x + offsetX * radius, y + offsetY * radius, size * radius, 0, Math.PI * 2);
      context2d.fill();
    },
  );
  context2d.restore();
}

function drawJourney(progress) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const reveal = smoothstep(range(progress, 0.02, 0.28));
  const pullback = smoothstep(range(progress, 0.28, 0.83));
  const moonReveal = smoothstep(range(progress, 0.74, 0.91));
  const mobile = width < 700;

  journeyContext.clearRect(0, 0, width, height);

  const initialRadius = Math.max(width, height) * (mobile ? 0.88 : 0.72);
  const finalRadius = Math.min(width, height) * (mobile ? 0.15 : 0.13);
  const radius = mix(initialRadius, finalRadius, pullback);
  const startX = width * (mobile ? 0.58 : 0.66);
  const startY = height + initialRadius * 0.58;
  const endX = width * (mobile ? 0.38 : 0.57);
  const endY = height * (mobile ? 0.58 : 0.56);
  const earthX = mix(startX, endX, pullback);
  const earthY = mix(startY, endY, pullback);

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
    const driftX = pointer.x * star.depth * 9;
    const driftY = pointer.y * star.depth * 7;
    const twinkle = motionQuery.matches
      ? 1
      : 0.82 + Math.sin(time * 0.00045 + star.phase) * 0.18;
    const x = star.x * window.innerWidth + driftX;
    const y = star.y * window.innerHeight + driftY;

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
  const earthLabelOpacity = smoothstep(range(departureProgress, 0.3, 0.43)) *
    (1 - smoothstep(range(departureProgress, 0.58, 0.7)));
  const moonLabelOpacity = smoothstep(range(departureProgress, 0.78, 0.9));

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
