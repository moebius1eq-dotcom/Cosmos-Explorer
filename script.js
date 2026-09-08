const page = document.body;
const loader = document.querySelector(".loader");
const loaderStatus = document.querySelector(".loader__status");
const canvas = document.querySelector(".starfield");
const context = canvas.getContext("2d", { alpha: true });
const heroContent = document.querySelector(".hero__content");
const departure = document.querySelector(".departure");

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
let stars = [];
let animationFrame = 0;
let pixelRatio = 1;

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
  const departureProgress = Math.min(
    1,
    Math.max(0, (window.scrollY - departureTop + viewport * 0.72) / (viewport * 0.82)),
  );

  heroContent.style.opacity = `${1 - heroProgress * 1.15}`;
  heroContent.style.transform = `translate3d(0, ${heroProgress * -6}vh, 0) scale(${1 - heroProgress * 0.08})`;
  departure.style.setProperty("--departure-progress", departureProgress.toFixed(3));
  departure.style.setProperty(
    "--departure-opacity",
    Math.min(1, departureProgress * 1.45).toFixed(3),
  );
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

window.addEventListener("resize", resizeStarfield, { passive: true });
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
updateScrollScene();
animationFrame = requestAnimationFrame(drawStarfield);
initializeLoadingSequence();
