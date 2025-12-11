// ----------------------------------------------
// DUŠE – jedno-souborová verze (config + game + UI + monetizace)
// Vzniklo sloučením původních config.js, game.js a ui.js
// ----------------------------------------------

// DOM prvky
const menuScreen   = document.getElementById('menuScreen');
const gameScreen   = document.getElementById('gameScreen');

const menuNewGame  = document.getElementById('menuNewGame');
const menuLevels   = document.getElementById('menuLevels');
const menuHowTo    = document.getElementById('menuHowTo');
const playMajakFromMenu = document.getElementById('playMajakFromMenu');

const startBtn      = document.getElementById('startBtn');
const playAgainBtn  = document.getElementById('playAgainBtn');
const restartBtn    = document.getElementById('restartBtn');
const muteBtn       = document.getElementById('muteBtn');
const backToMenuFromIntro  = document.getElementById('backToMenuFromIntro');
const backToMenuFromResult = document.getElementById('backToMenuFromResult');
const backToMenuInHud      = document.getElementById('backToMenuInHud');

const statusText    = document.getElementById('statusText');
const statsEl       = document.getElementById('stats');
const resultStatsEl = document.getElementById('resultStats');

const world         = document.getElementById('world');
const bubbleTemplate = document.getElementById('bubbleTemplate');
const scrollTrack   = document.getElementById('scrollTrack');

const bgImage1      = document.getElementById('bgImage1');
const bgImage2      = document.getElementById('bgImage2');
const imageStatus   = document.getElementById('imageStatus');

const timeInfo      = document.getElementById('timeInfo');
const scoreInfo     = document.getElementById('scoreInfo');

const levelIntroOverlay = document.getElementById('levelIntroOverlay');
const resultOverlay     = document.getElementById('resultOverlay');

const music        = document.getElementById('music');

const soulWrapper  = document.getElementById('soulWrapper');
const soul         = document.getElementById('soul');
const soulParticlesContainer = document.getElementById('soul');

const currentLevelNameEls =
  document.querySelectorAll('[data-current-level-name]');

const cursorLight  = document.getElementById('cursorLight');

// -------------------------------------------------
// Konstanty
// -------------------------------------------------

// Soul (hráč)
const SOUL_BASE_SIZE       = 80;    // základní velikost (px)
const SOUL_MAX_SIZE        = 1.6;   // maximální násobek velikosti duše
const SOUL_MIN_SIZE        = 0.25;  // minimální velikost (při 0 game over)
const SOUL_GROW_PER_HIT    = 0.05;  // o kolik se zvětší při zásahu
const SOUL_SHRINK_PER_MISS = 0.08;  // o kolik se zmenší při minutí

// Bubliny
const BUBBLE_START_X       = 88;    // kde se bublina objeví (v % šířky)
const BUBBLE_END_X         = 14;    // hranice, při které se počítá jako minutá
const BASE_TRAVEL_TIME_SEC = 3.2;   // základní čas cesty bubliny z prava do leva
const BUBBLE_INTERVAL_SEC  = 1.2;   // fallback interval, když neznáme délku hudby

// Šplouchnutí
const SPLASH_BASE_SIZE     = 140;   // základní velikost šplouchnutí v px
const POP_DURATION         = 260;   // délka animace bubliny při zásahu (ms)

// Duše – částice
const MAX_EXTRA_PARTICLES  = 40;    // maximální počet extra částic okolo duše

// -------------------------------------------------
// Stav duše (hráče)
// -------------------------------------------------
let soulSize   = 1.0;  // 1.0 = základní velikost, 0 = zmizí
let soulX      = 25;   // v procentech šířky
let soulY      = 60;   // v procentech výšky
let extraSoulParticles = 0;

// ----------------------------------------------
// Doplňkové globální proměnné pro vizuální efekty
// ----------------------------------------------
let bgProgressValue = 0;   // poslední progress pozadí (0–1)
let comboStreak = 0;       // počet zásahů po sobě pro flash
let flashTimeoutId = null; // timeout pro návrat z flash efektu
let isFlashActive = false; // právě probíhá full-screen flash?

// -------------------------------------------------
// Herní stav
// -------------------------------------------------
let currentLevelKey = 'majak';

let levelRunning    = false;
let gameOverBySoul  = false;

let pattern         = [];
let totalScheduled  = 0;
let shownBubbles    = 0;

let hits            = 0;
let misses          = 0;
let score           = 0;

let bubbles         = [];
let activeSplashes  = [];

let spawnTimeouts   = [];
let endTimeoutId    = null;

let lastFrameTime   = 0;

// ----------------------------------------------
// Zákaz přetahování obrázků (ghost image při drag & drop)
// ----------------------------------------------
document.addEventListener('dragstart', function (e) {
  e.preventDefault();
});

// -------------------------------------------------
// HUD / DUŠE – verze s podporou jemného pointeru
// -------------------------------------------------
function updateScoreHud() {
  scoreInfo.textContent = 'Skóre: ' + score;
}

function updateSoulVisual() {
  // menší duše na zařízeních bez jemného pointeru (mobil / tablet)
  const hasFinePointer =
    window.matchMedia &&
    window.matchMedia('(any-pointer: fine)').matches;

  const baseFactor = hasFinePointer ? 1.0 : 0.75;
  const size = SOUL_BASE_SIZE * baseFactor * soulSize;

  soul.style.width = size + 'px';
  soul.style.height = size + 'px';
  soul.style.opacity = Math.max(0, soulSize);
}

function resetSoulParticles() {
  if (!soulParticlesContainer) return;
  const extras = soulParticlesContainer.querySelectorAll('.soul-extra-particle');
  extras.forEach(el => el.remove());
  extraSoulParticles = 0;
}

function addSoulParticle() {
  // ambient: částice kolem duše – můžou být vypnuté v profilu hráče
  if (
    typeof playerState !== 'undefined' &&
    playerState.ambients &&
    playerState.ambients.particles === false
  ) {
    return;
  }

  if (!soulParticlesContainer) return;
  if (extraSoulParticles >= MAX_EXTRA_PARTICLES) return;

  const dot = document.createElement('div');
  dot.className = 'soul-extra-particle';

  const angle = Math.random() * 360;
  const radius = 18 + Math.random() * 16;
  dot.style.setProperty('--angle', angle + 'deg');
  dot.style.setProperty('--radius', radius + 'px');
  dot.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';

  soulParticlesContainer.appendChild(dot);
  extraSoulParticles++;
}

function resetSoul() {
  soulSize = 1.0;
  soulX = 25;
  soulY = 60;
  soulWrapper.style.left = soulX + '%';
  soulWrapper.style.top  = soulY + '%';
  soul.classList.remove('soul-dash', 'soul-grow', 'soul-flash');
  resetSoulParticles();
  updateSoulVisual();
}

function moveSoulTo(xPercent, yPercent) {
  soulX = xPercent;
  soulY = yPercent + 8; // lehký offset, aby se nelepila přesně na kapku
  soul.classList.remove('soul-dash', 'soul-grow', 'soul-flash');
  // reflow pro restart animace
  void soul.offsetWidth;
  soulWrapper.style.left = soulX + '%';
  soulWrapper.style.top  = soulY + '%';
  soul.classList.add('soul-dash');
}

function showFloatingScore(text, xPercent, yPercent) {
  const ft = document.createElement('div');
  ft.className = 'float-text';
  ft.textContent = text;
  ft.style.left = xPercent + '%';
  ft.style.top  = yPercent + '%';
  world.appendChild(ft);
  setTimeout(() => {
    if (ft.parentNode) ft.parentNode.removeChild(ft);
  }, 900);
}

// -------------------------------------------------
// LEVELY + PATTERN
// -------------------------------------------------
function loadLevelAssets() {
  const lvl = levels[currentLevelKey];
  if (!lvl) return;
  scrollTrack.style.opacity = 0;
  scrollTrack.style.filter = 'grayscale(1)';
  bgImage1.src = lvl.image;
  bgImage2.src = lvl.image;
  music.src    = lvl.music;
  imageStatus.textContent = '';
}

function setCurrentLevel(key) {
  if (!levels[key]) return;
  currentLevelKey = key;
  const lvl = levels[key];
  currentLevelNameEls.forEach(el => el.textContent = lvl.name);
  loadLevelAssets();
}

function createPattern(count, intervalSec) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      t: (i + 1) * intervalSec,
      y: 30 + Math.random() * 40,
      travelTimeSec: BASE_TRAVEL_TIME_SEC
    });
  }
  return out;
}

function buildPatternForMusic() {
  const durationSec = music.duration;
  if (!isFinite(durationSec) || durationSec <= 0) {
    pattern = createPattern(20, BUBBLE_INTERVAL_SEC);
    totalScheduled = pattern.length;
    return;
  }

  const startOffset = 1.0;
  const endReserve  = 1.0;
  const startInterval = 1.8;
  const endInterval   = 0.8;
  const startTravelFactor = 1.1;
  const endTravelFactor   = 0.6;

  const windowSec = durationSec - startOffset - endReserve - BASE_TRAVEL_TIME_SEC;
  if (windowSec <= 0) {
    pattern = createPattern(20, BUBBLE_INTERVAL_SEC);
    totalScheduled = pattern.length;
    return;
  }

  const avgInterval = (startInterval + endInterval) / 2;
  let count = Math.floor(windowSec / avgInterval);
  if (count < 5) count = 5;

  const newPattern = [];
  let t = startOffset;

  for (let i = 0; i < count; i++) {
    const r = count > 1 ? i / (count - 1) : 0;
    const travelFactor = startTravelFactor + (endTravelFactor - startTravelFactor) * r;
    const travelTimeSec = BASE_TRAVEL_TIME_SEC * travelFactor;

    newPattern.push({
      t,
      y: 30 + Math.random() * 40,
      travelTimeSec
    });

    if (i < count - 1) {
      const interval = startInterval + (endInterval - startInterval) * r;
      t += interval;
    }
  }

  pattern = newPattern;
  totalScheduled = pattern.length;
}

// -------------------------------------------------
// POZADÍ – černá → šedá → barevná + FLASH
// -------------------------------------------------
function updateBackgroundProgress(progress) {
  const p = Math.max(0, Math.min(1, progress));
  bgProgressValue = p;

  // 0: zcela černá – skryjeme obrázek
  if (p === 0) {
    scrollTrack.style.opacity = 0;
    scrollTrack.style.filter  = 'grayscale(1)';
    return;
  }

  let opacity, grayscale;

  // 0–0.5: černá → šedá (obrázek postupně vystupuje, ale je šedý)
  if (p < 0.5) {
    const phase = p / 0.5;       // 0→1
    opacity = phase;             // 0→1
    grayscale = 1;               // stále šedý
  } else {
    // 0.5–1: šedá → barevná
    const phase = (p - 0.5) / 0.5; // 0→1
    opacity = 1;
    grayscale = 1 - phase;        // 1→0
  }

  scrollTrack.style.opacity = opacity;
  scrollTrack.style.filter  = `grayscale(${grayscale})`;
}

// smaže všechny existující barevné výseče (color-burst)
function clearAllColorBursts() {
  if (!world) return;
  const bursts = world.querySelectorAll('.color-burst');
  bursts.forEach(b => b.remove());
}

// krátký flash – délka a síla podle tieru (5, 10, 15…)
// nově respektuje hráčské nastavení flashEffect
function triggerComboFlash(tier) {
  if (!scrollTrack) return;

  const effect = (playerState && playerState.flashEffect) || 'classic';
  if (effect === 'off') {
    return; // hráč flash vypnul
  }

  // zruš případný předchozí timeout
  if (flashTimeoutId !== null) {
    clearTimeout(flashTimeoutId);
    flashTimeoutId = null;
  }

  // tier = 1 pro 5 zásahů, 2 pro 10, atd. – omezíme, aby to neulítlo
  const cappedTier = Math.min(tier, 20);

  let strengthBase = 1.0 + cappedTier * 0.12;  // 1.0–3.4
  let durationBase = 200 + cappedTier * 40;    // 240–1000 ms

  let strengthScale = 1.0;
  let durationScale = 1.0;

  switch (effect) {
    case 'soft':
      strengthScale = 0.6;
      durationScale = 0.7;
      break;
    case 'strong':
      strengthScale = 1.3;
      durationScale = 1.05;
      break;
    case 'mono':
      strengthScale = 0.9;
      durationScale = 1.0;
      break;
    case 'classic':
    default:
      strengthScale = 1.0;
      durationScale = 1.0;
      break;
  }

  const strength = strengthBase * strengthScale;
  const duration = durationBase * durationScale;

  isFlashActive = true;

  // při startu flash efektu okamžitě smažeme všechny lokální výseče,
  // aby se už nemohly „rozsvítit“ přes backdrop-filter
  clearAllColorBursts();

  scrollTrack.style.setProperty('--flashStrength', strength.toFixed(2));
  scrollTrack.classList.add('flash-fullcolor');

  flashTimeoutId = window.setTimeout(() => {
    scrollTrack.classList.remove('flash-fullcolor');
    // návrat do stavu podle aktuálního progresu
    updateBackgroundProgress(bgProgressValue);
    isFlashActive = false;
    flashTimeoutId = null;
  }, duration);
}

// -------------------------------------------------
// LOKÁLNÍ RIPPLE – barevná vlna v místě zásahu
// -------------------------------------------------
function spawnColorBurst(centerX, centerY, strength) {
  if (!world) return;

  // pokud právě jede full-screen flash, lokální výseč vůbec nespouštěj
  if (isFlashActive) {
    return;
  }

  // ambient: hráč může shockwave vypnout
  if (
    typeof playerState !== 'undefined' &&
    playerState.ambients &&
    playerState.ambients.shockwave === false
  ) {
    return;
  }

  const rectWorld = world.getBoundingClientRect();
  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top) / rectWorld.height) * 100;

  const burst = document.createElement('div');
  burst.className = 'color-burst';
  burst.style.left = xPercent + '%';
  burst.style.top  = yPercent + '%';

  // normalizace síly zásahu (super / normální hit)
  const s = Math.max(0, strength || 0);
  const sNorm = Math.min(1, s / 1.2);

  // jak moc už je obrázek vybarvený (0 = černá/šedá, 1 = plná barva)
  const p = Math.max(0, Math.min(1, bgProgressValue || 0));

  // základní intenzita podle progresu:
  //  - p = 0   -> intensity = 1   (max WOW)
  //  - p = 1   -> intensity = 0   (mizí)
  let intensity = Math.pow(1 - p, 1.2);

  // saturace – čím větší intensity, tím víc barvy
  const baseSat = 1.0;
  let sat =
    baseSat +
    3.0 * intensity +
    0.7 * sNorm * intensity;

  // jas – opatrnější, ať nespálíme barvy
  const baseBright = 1.0;
  let bright =
    baseBright +
    0.6 * intensity +
    0.3 * sNorm * intensity;

  // ambient: extra saturace
  if (playerState && playerState.ambients && playerState.ambients.saturate) {
    sat *= 1.2;
    bright *= 1.05;
  }

  // hodnoty pro CSS (viz .color-burst v game.css)
  burst.style.setProperty('--burst-saturate', sat.toFixed(2));
  burst.style.setProperty('--burst-bright',   bright.toFixed(2));

  world.appendChild(burst);

  setTimeout(() => {
    if (burst.parentNode) burst.parentNode.removeChild(burst);
  }, 700);
}

// vizuální pop-up pro combo bonus
function showComboPopup(comboValue, bonus) {
  const popup = document.createElement('div');
  popup.className = 'combo-popup';
  popup.innerHTML = `COMBO <span>x${comboValue}</span> +${bonus}`;
  world.appendChild(popup);

  setTimeout(() => {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 900);
}

// -------------------------------------------------
// MISS / RESET
// -------------------------------------------------
function registerMiss() {
  if (!levelRunning) return;

  misses++;
  comboStreak = 0; // přerušíme combo

  soulSize = Math.max(0, soulSize - SOUL_SHRINK_PER_MISS);
  updateSoulVisual();

  if (soulSize <= SOUL_MIN_SIZE) {
    gameOverBySoul = true;
    music.pause();
    endLevel('Duše se rozplynula… Game Over.');
  }
}

function resetScrollTrackAnimation() {
  scrollTrack.style.animation = 'none';
  void scrollTrack.offsetWidth; // reflow
  scrollTrack.style.animation = '';
}

function clearAllSpawnTimers() {
  spawnTimeouts.forEach(id => clearTimeout(id));
  spawnTimeouts = [];
  if (endTimeoutId !== null) {
    clearTimeout(endTimeoutId);
    endTimeoutId = null;
  }
}

function clearAllSplashes() {
  activeSplashes.forEach(s => {
    if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el);
  });
  activeSplashes = [];
}

function clearAllBubbles() {
  bubbles.forEach(b => {
    if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
  });
  bubbles = [];
}

function resetLevelState() {
  levelRunning = false;
  clearAllSpawnTimers();
  clearAllSplashes();
  clearAllBubbles();

  updateBackgroundProgress(0);
  shownBubbles = 0;
  hits = 0;
  misses = 0;
  gameOverBySoul = false;
  score = 0;
  comboStreak = 0;
  updateScoreHud();
  statsEl.textContent = '';
  statusText.textContent = '';

  lastFrameTime = 0;
  lastRunSummary = null;
  resetSoul();
}

// -------------------------------------------------
// MENU / PŘECHODY
// -------------------------------------------------
function showMenuScreen() {
  music.pause();
  menuScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  levelIntroOverlay.classList.add('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');
}

function showLevelIntro() {
  levelIntroOverlay.classList.remove('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');
}

function goToLevel(key) {
  if (!levels[key]) return;
  // pokud level není odemčený, ignoruj
  if (!isLevelUnlocked(key)) {
    alert('Tento level je zatím zamčený. Zkus ho odemknout v menu LEVELY.');
    return;
  }

  setCurrentLevel(key);
  resetLevelState();
  menuScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  showLevelIntro();
}

// -------------------------------------------------
// KONEC LEVELU – základní verze (bude obalena monetizací)
// -------------------------------------------------
function endLevel(reason = 'Level je u konce.') {
  if (!levelRunning) return;
  levelRunning = false;
  clearAllSpawnTimers();
  clearAllSplashes();
  clearAllBubbles();

  statusText.textContent = reason;

  const totalEvents = hits + misses;
  const effectiveShown = shownBubbles;
  const accuracyNum = totalEvents > 0 ? (hits / totalEvents * 100) : 0;
  const accuracy = accuracyNum.toFixed(1);
  const avgScorePerHit = hits > 0 ? (score / hits).toFixed(2) : 0;

  const statsHtml = `
    <p><em>${reason}</em></p>
    <p>
      Kapek v patternu: <strong>${totalScheduled}</strong><br>
      Opravdu zobrazených kapek: <strong>${effectiveShown}</strong><br>
      Zásahy: <strong>${hits}</strong><br>
      Minuté: <strong>${misses}</strong><br>
      Úspěšnost (zásah / zásah+minuté): <strong>${accuracy}%</strong><br>
      Celkové skóre: <strong>${score}</strong><br>
      Průměrné body za zásah: <strong>${avgScorePerHit}</strong>
    </p>
  `;

  statsEl.innerHTML = statsHtml;
  resultStatsEl.innerHTML = statsHtml;
  resultOverlay.classList.remove('overlay-hidden');

  restartBtn.disabled = false;
  startBtn.disabled = false;
  playAgainBtn.disabled = false;
}

// -------------------------------------------------
// SPAWN BUBLIN
// -------------------------------------------------
function spawnBubbleAt(yPercent, travelTimeSec) {
  if (!levelRunning) return;

  shownBubbles++;

  const startX = BUBBLE_START_X;
  const endX   = BUBBLE_END_X;
  const distance = startX - endX;
  const travel = travelTimeSec || BASE_TRAVEL_TIME_SEC;
  const speed = distance / travel;

  const el = bubbleTemplate.cloneNode(true);
  el.id = '';
  el.style.display = 'block';
  el.classList.remove('bubble-pop');
  world.appendChild(el);

  const progressIndex = totalScheduled > 0 ? (shownBubbles - 1) / totalScheduled : 0;
  const minOpacity = 0.4;
  const maxOpacity = 1.0;
  const opacity = minOpacity + (maxOpacity - minOpacity) * progressIndex;
  el.style.opacity = opacity;

  const waveAmp  = 3 + Math.random() * 5;
  const waveFreq = 1.5 + Math.random() * 1.5;

  const bubbleObj = {
    el,
    xPercent: startX,
    baseY: yPercent,
    yPercent: yPercent,
    speedPercentPerSec: speed,
    waveAmp,
    waveFreq,
    ageSec: 0,
    hit: false,
    missed: false
  };

  el.style.left = bubbleObj.xPercent + '%';
  el.style.top  = bubbleObj.yPercent + '%';

  bubbles.push(bubbleObj);
}

function schedulePattern() {
  if (!pattern.length) return;

  pattern.forEach(p => {
    const id = setTimeout(() => {
      if (!levelRunning) return;
      spawnBubbleAt(p.y, p.travelTimeSec);
    }, p.t * 1000);
    spawnTimeouts.push(id);
  });

  if (pattern.length > 0) {
    const last = pattern[pattern.length - 1];
    const lastTimeMs = last.t * 1000 + (last.travelTimeSec || BASE_TRAVEL_TIME_SEC) * 1000;
    endTimeoutId = setTimeout(() => {
      if (levelRunning && !gameOverBySoul) {
        music.pause();
        endLevel('Vzor kapek je u konce.');
      }
    }, lastTimeMs + 150);
    spawnTimeouts.push(endTimeoutId);
  }
}

// -------------------------------------------------
// START LEVELU
// -------------------------------------------------
function startLevel() {
  resetLevelState();
  levelIntroOverlay.classList.add('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');
  resetScrollTrackAnimation();

  if (!pattern.length || totalScheduled === 0) {
    buildPatternForMusic();
  }

  levelRunning = true;
  statusText.textContent = 'Level běží – klikej na kapky rytmicky.';

  restartBtn.disabled = true;
  playAgainBtn.disabled = true;
  startBtn.disabled = true;

  music.currentTime = 0;
  music.play();

  schedulePattern();
}

// -------------------------------------------------
// ŠPLOUCHNUTÍ A FRAGMENTY
// -------------------------------------------------
function createSplashAtClient(clientX, clientY, isSuper) {
  const rect = world.getBoundingClientRect();
  const xPercent = ((clientX - rect.left) / rect.width) * 100;
  const yPercent = ((clientY - rect.top) / rect.height) * 100;

  const splash = document.createElement('div');
  splash.className = 'splash';
  if (isSuper) splash.classList.add('splash-super', 'splash-hit');
  splash.style.left = xPercent + '%';
  splash.style.top  = yPercent + '%';
  world.appendChild(splash);

  const createdAt = performance.now();
  const lifeMs    = isSuper ? 450 : 350;
  const maxRadius = (SPLASH_BASE_SIZE / 2) * (isSuper ? 2.0 : 1.4);

  activeSplashes.push({
    el: splash,
    xPx: clientX,
    yPx: clientY,
    createdAt,
    lifeMs,
    maxRadius,
    isSuper,
    used: false
  });

  setTimeout(() => {
    if (splash.parentNode) splash.parentNode.removeChild(splash);
  }, lifeMs + 120);
}

// světlý glow kolem bubliny
function spawnBubbleFragments(bubbleObj) {
  const rectWorld  = world.getBoundingClientRect();
  const rectBubble = bubbleObj.el.getBoundingClientRect();
  const centerX = rectBubble.left + rectBubble.width / 2;
  const centerY = rectBubble.top + rectBubble.height / 2;

  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top) / rectWorld.height) * 100;

  const glow = document.createElement('div');
  glow.className = 'bubble-light';
  glow.style.left = xPercent + '%';
  glow.style.top  = yPercent + '%';
  world.appendChild(glow);

  setTimeout(() => {
    if (glow.parentNode) glow.parentNode.removeChild(glow);
  }, 500);
}

// -------------------------------------------------
// GAME LOOP
// -------------------------------------------------
function gameLoop() {
  const now = performance.now();
  if (!lastFrameTime) lastFrameTime = now;
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (levelRunning && bubbles.length > 0) {
    const stillAlive = [];
    for (const b of bubbles) {
      if (b.hit || b.missed) continue;

      b.ageSec += dt;

      b.xPercent -= b.speedPercentPerSec * dt;
      const wave = b.waveAmp * Math.sin(b.ageSec * b.waveFreq);
      b.yPercent = b.baseY + wave;

      if (b.yPercent < 20) b.yPercent = 20;
      if (b.yPercent > 80) b.yPercent = 80;

      b.el.style.left = b.xPercent + '%';
      b.el.style.top  = b.yPercent + '%';

      if (b.xPercent <= BUBBLE_END_X) {
        b.missed = true;
        if (b.el.parentNode) b.el.parentNode.removeChild(b.el);
        registerMiss();
        continue;
      }
      stillAlive.push(b);
    }
    bubbles = stillAlive;
  }

  // šplouchání – expandující kruh, který může trefit bublinu
  activeSplashes = activeSplashes.filter(s => {
    const age = now - s.createdAt;
    if (age > s.lifeMs) return false;

    if (levelRunning && !s.used && bubbles.length > 0) {
      for (const b of bubbles) {
        if (b.hit || b.missed) continue;
        const rectBubble = b.el.getBoundingClientRect();
        const bx = rectBubble.left + rectBubble.width / 2;
        const by = rectBubble.top + rectBubble.height / 2;
        const bubbleRadius = rectBubble.width / 2;

        const t = Math.min(1, age / s.lifeMs);
        const radius = s.maxRadius * t;

        const dx = s.xPx - bx;
        const dy = s.yPx - by;
        const dist = Math.hypot(dx, dy);

        if (dist <= bubbleRadius + radius) {
          s.used = true;
          if (s.el) s.el.classList.add('splash-hit');
          handleBubbleHit(b, s.isSuper, s.xPx, s.yPx);
          break;
        }
      }
    }
    return true;
  });

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// -------------------------------------------------
// ZÁSAH BUBLINY
// -------------------------------------------------
function handleBubbleHit(bubbleObj, isSuper, clickX, clickY) {
  if (!levelRunning) return;
  if (!bubbleObj || bubbleObj.hit || bubbleObj.missed) return;

  hits++;
  comboStreak++; // zásah do comba

  const rectWorld  = world.getBoundingClientRect();
  const rectBubble = bubbleObj.el.getBoundingClientRect();
  const centerX = rectBubble.left + rectBubble.width / 2;
  const centerY = rectBubble.top + rectBubble.height / 2;
  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top) / rectWorld.height) * 100;

  // glow + barevná vlna, která se rozplývá
  spawnBubbleFragments(bubbleObj);
  spawnColorBurst(centerX, centerY, isSuper ? 1.2 : 1.0);

  bubbleObj.hit = true;
  bubbleObj.el.classList.add('bubble-pop');
  setTimeout(() => {
    if (bubbleObj.el.parentNode) bubbleObj.el.parentNode.removeChild(bubbleObj.el);
  }, POP_DURATION + 30);

  moveSoulTo(xPercent, yPercent);

  const growAmount = SOUL_GROW_PER_HIT * (isSuper ? 1.6 : 1.0);
  soulSize = Math.min(SOUL_MAX_SIZE, soulSize + growAmount);
  soul.classList.remove('soul-grow', 'soul-flash');
  void soul.offsetWidth;

  // ambient: glow duše při zásahu může být vypnutý
  if (playerState && playerState.ambients && playerState.ambients.glow !== false) {
    soul.classList.add('soul-grow', 'soul-flash');
  } else {
    soul.classList.add('soul-grow');
  }

  updateSoulVisual();
  addSoulParticle();

  // timing bonus
  const normX = (centerX - rectWorld.left) / rectWorld.width;
  let zone = Math.floor(normX * 4);
  if (zone < 0) zone = 0;
  if (zone > 3) zone = 3;
  const timingBonus = zone + 1;

  let precisionBonus = 0;
  if (typeof clickX === 'number' && typeof clickY === 'number') {
    const dx = clickX - centerX;
    const dy = clickY - centerY;
    const dist = Math.hypot(dx, dy);
    const bubbleRadius = rectBubble.width / 2;
    const normPrec = Math.max(0, Math.min(1, 1 - dist / bubbleRadius));
    precisionBonus = Math.round(normPrec * 3);
  }

  const basePoints = 1;
  let gained = basePoints + timingBonus + precisionBonus;

  // COMBO bonus: každých 5 zásahů v řadě → +10 bodů + flash
  if (comboStreak > 0 && comboStreak % 5 === 0) {
    const tier = Math.floor(comboStreak / 5); // 1, 2, 3… pro 5, 10, 15…
    const comboBonus = 10;
    gained += comboBonus;        // přičteme k tomuto zásahu
    score += gained;
    updateScoreHud();
    triggerComboFlash(tier);
    showComboPopup(comboStreak, comboBonus);
  } else {
    score += gained;
    updateScoreHud();
  }

  statusText.textContent = `Zásah: +${gained} (čas +${timingBonus}, přesnost +${precisionBonus})`;
  showFloatingScore('+' + gained, soulX, soulY - 6);

  const progress = totalScheduled > 0 ? hits / totalScheduled : 0;
  updateBackgroundProgress(progress);

  if (hits >= totalScheduled) {
    music.pause();
    endLevel('Odklikal jsi všechny kapky! 🎉');
  }
}

// -------------------------------------------------
// KLIK DO SVĚTA
// -------------------------------------------------
function handleClickAt(clientX, clientY) {
  if (!levelRunning) return;
  if (!bubbles.length) return;

  let target = null;
  for (const b of bubbles) {
    if (b.hit || b.missed) continue;
    const rectBubble = b.el.getBoundingClientRect();
    if (
      clientX >= rectBubble.left &&
      clientX <= rectBubble.right &&
      clientY >= rectBubble.top &&
      clientY <= rectBubble.bottom
    ) {
      if (!target || b.xPercent > target.xPercent) {
        target = b;
      }
    }
  }

  const directHit = !!target;
  const isSuper = directHit;
  createSplashAtClient(clientX, clientY, isSuper);

  if (directHit) {
    handleBubbleHit(target, true, clientX, clientY);
  } else {
    // klik mimo → combo reset
    comboStreak = 0;
  }
}

world.addEventListener('pointerdown', e => {
  handleClickAt(e.clientX, e.clientY);
});

// -------------------------------------------------
// CUSTOM CURSOR LIGHT – jen vizuál, kurzor řeší CSS
// -------------------------------------------------
if (cursorLight) {
  window.addEventListener('mousemove', e => {
    cursorLight.style.left = e.clientX + 'px';
    cursorLight.style.top  = e.clientY + 'px';
  });

  window.addEventListener('pointerdown', () => {
    cursorLight.classList.add('click');
    setTimeout(() => cursorLight.classList.remove('click'), 120);
  });
}

// -------------------------------------------------
// LEVEL DEFINICE (včetně cen pro odemknutí)
// -------------------------------------------------
const levels = {
  majak: {
    key: 'majak',
    name: 'Maják',
    image: 'levels/level1/background.jpg',
    music: 'levels/level1/music.mp3',
    description: 'Noc, moře, vítr a osamělý maják.',
    unlockPrice: 0
  },
  majak2: {
    key: 'majak2',
    name: 'Maják II',
    image: 'levels/level2/background.jpg',
    music: 'levels/level2/music.mp3',
    description: 'Experimentální pokračování se silnějším rytmem.',
    unlockPrice: 1500
  }
};

// -------------------------------------------------
// DUŠE – UI, menu a monetizace
// -------------------------------------------------

// Základní DOM prvky pro menu sekce vpravo
const menuSections = document.querySelectorAll('.menu-section');

// Volitelné tlačítko pauzy v HUD
const playPauseBtn = document.getElementById('playPauseBtn');

// Volitelná záložka HRÁČ v levém menu (pokud ji máš v HTML)
const menuPlayer = document.getElementById('menuPlayer');

// -------------------------------------------------
// VOLITELNÉ PRVKY PRO HRÁČSKÝ PROFIL / MĚNU (monetizace)
// -------------------------------------------------

// „Měna“ a nastavení hráče (tab HRÁČ)
const currencyValueEl          = document.getElementById('currencyValue');
const flashEffectSelect        = document.getElementById('flashEffectSelect');
const ambientGlowCheckbox      = document.getElementById('ambientGlow');
const ambientShockwaveCheckbox = document.getElementById('ambientShockwave');
const ambientParticlesCheckbox = document.getElementById('ambientParticles');
const ambientSaturateCheckbox  = document.getElementById('ambientSaturate');

const savedVisualText          = document.getElementById('savedVisualText');
const replaySavedVisualBtn     = document.getElementById('replaySavedVisualBtn');
const clearSavedVisualBtn      = document.getElementById('clearSavedVisualBtn');
const savePlayerSettingsBtn    = document.getElementById('savePlayerSettingsBtn');
const playerSettingsStatus     = document.getElementById('playerSettingsStatus');

// prvky ve výsledkovém overlayi
const saveVisualBtn            = document.getElementById('saveVisualBtn');
const currencyInfoEl           = document.getElementById('currencyInfo');

// shrnutí posledního dohraného runu – plní se v endLevel wrapperu
let lastRunSummary = null;

// -------------------------------------------------
// HRÁČSKÝ STAV / MĚNA (localStorage)
// -------------------------------------------------

const PLAYER_STATE_KEY          = 'duse_player_state_v1';
const VISUAL_SAVE_PRICE         = 500;
const LEVEL_BASE_UNLOCK_PRICE   = 1500;

// výchozí stav – funguje i když nic v localStorage není
function getDefaultPlayerState() {
  return {
    currency: 0,
    unlockedLevels: ['majak'], // první level vždy odemčený
    flashEffect: 'classic',
    ambients: {
      glow: true,
      shockwave: true,
      particles: true,
      saturate: false
    },
    savedVisual: null
  };
}

function loadPlayerState() {
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return getDefaultPlayerState();

    const parsed = JSON.parse(raw);
    const def    = getDefaultPlayerState();

    return {
      currency: Number.isFinite(parsed.currency) ? parsed.currency : def.currency,
      unlockedLevels: Array.isArray(parsed.unlockedLevels)
        ? Array.from(new Set(['majak', ...parsed.unlockedLevels]))
        : ['majak'],
      flashEffect: parsed.flashEffect || def.flashEffect,
      ambients: parsed.ambients || def.ambients,
      savedVisual: parsed.savedVisual || null
    };
  } catch (e) {
    console.warn('Nepodařilo se načíst playerState, resetuji.', e);
    return getDefaultPlayerState();
  }
}

let playerState = loadPlayerState();

function savePlayerState() {
  try {
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(playerState));
  } catch (e) {
    console.warn('Nepodařilo se uložit playerState.', e);
  }

  updateCurrencyUI();
  refreshPlayerSettingsUI();
  refreshLevelsUI();
}

// přičtení měny
function addCurrency(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const inc = Math.floor(amount);

  if (!Number.isFinite(playerState.currency)) {
    playerState.currency = 0;
  }
  playerState.currency = Math.max(0, playerState.currency + inc);
  savePlayerState();
}

// utracení měny
function spendCurrency(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const cost = Math.floor(amount);

  if (!Number.isFinite(playerState.currency)) {
    playerState.currency = 0;
  }
  if (playerState.currency < cost) return false;

  playerState.currency -= cost;
  savePlayerState();
  return true;
}

// je level odemčený?
function isLevelUnlocked(key) {
  if (!key) return false;
  if (key === 'majak') return true;

  const list = Array.isArray(playerState.unlockedLevels)
    ? playerState.unlockedLevels
    : ['majak'];

  return list.includes(key);
}

// odemknout další level (při 100% dokončení)
function unlockNextLevel(currentKey) {
  if (!currentKey || typeof levels !== 'object' || !levels) return;

  const keys = Object.keys(levels);
  const idx  = keys.indexOf(currentKey);
  if (idx === -1 || idx >= keys.length - 1) return;

  const nextKey = keys[idx + 1];
  if (!nextKey) return;

  if (!Array.isArray(playerState.unlockedLevels)) {
    playerState.unlockedLevels = ['majak'];
  }
  if (!playerState.unlockedLevels.includes(nextKey)) {
    playerState.unlockedLevels.push(nextKey);
    savePlayerState();
  }
}

// odemknutí konkrétního levelu za měnu (v menu LEVELY)
function tryUnlockLevelWithCurrency(key) {
  if (!key || typeof levels !== 'object' || !levels[key]) return false;

  const lvl   = levels[key];
  const price = (lvl && typeof lvl.unlockPrice === 'number')
    ? lvl.unlockPrice
    : LEVEL_BASE_UNLOCK_PRICE;

  if (!spendCurrency(price)) return false;

  if (!Array.isArray(playerState.unlockedLevels)) {
    playerState.unlockedLevels = ['majak'];
  }
  if (!playerState.unlockedLevels.includes(key)) {
    playerState.unlockedLevels.push(key);
  }

  savePlayerState();
  return true;
}

// uložení aktuálního běhu jako vizuálu
function saveCurrentRunAsVisual() {
  if (!lastRunSummary) return;
  playerState.savedVisual = {
    ...lastRunSummary,
    savedAt: Date.now()
  };
  savePlayerState();
}

// smazání uloženého vizuálu
function clearSavedVisual() {
  playerState.savedVisual = null;
  savePlayerState();
}

// nastavení typu flash efektu
function setFlashEffect(mode) {
  playerState.flashEffect = mode || 'classic';
  savePlayerState();
}

// nastavení ambientních efektů (checkboxy v tab HRÁČ)
function setAmbientsFromUI(glow, shockwave, particles, saturate) {
  playerState.ambients = {
    glow: !!glow,
    shockwave: !!shockwave,
    particles: !!particles,
    saturate: !!saturate
  };
  savePlayerState();
}

// -------------------------------------------------
// MENU – přepínání záložek
// -------------------------------------------------

function setMenuActive(which) {
  // levý sloupec
  menuNewGame.classList.toggle('active', which === 'new');
  menuLevels.classList.toggle('active', which === 'levels');
  if (menuPlayer) {
    menuPlayer.classList.toggle('active', which === 'player');
  }
  menuHowTo.classList.toggle('active', which === 'how');

  // pravá část – sekce
  menuSections.forEach(section => {
    const isActive = section.dataset.section === which;
    section.classList.toggle('menu-section-active', isActive);
  });
}

// kliky na hlavní záložky
menuNewGame.addEventListener('click', () => {
  setMenuActive('new');
});

menuLevels.addEventListener('click', () => {
  setMenuActive('levels');
});

if (menuPlayer) {
  menuPlayer.addEventListener('click', () => {
    setMenuActive('player');
  });
}

menuHowTo.addEventListener('click', () => {
  setMenuActive('how');
});

// tlačítko „Hrát Maják“ v menu
playMajakFromMenu.addEventListener('click', () => {
  goToLevel('majak');
});

// -------------------------------------------------
// LEVELY – play / buy tlačítka (volitelné v HTML)
// -------------------------------------------------

function refreshLevelsUI() {
  const cards = document.querySelectorAll('.level-card[data-level-key]');
  cards.forEach(card => {
    const key = card.dataset.levelKey;
    if (!key) return;

    const unlocked = isLevelUnlocked(key);
    const playBtn  = card.querySelector('.level-play-btn');
    const buyBtn   = card.querySelector('.level-buy-btn');

    if (unlocked) {
      card.classList.remove('level-card-disabled');
      if (playBtn) playBtn.disabled = false;
      if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = 0.4;
      }
    } else {
      if (key === 'majak') {
        // pro jistotu – první level vždy otevřený
        card.classList.remove('level-card-disabled');
        if (playBtn) playBtn.disabled = false;
        if (buyBtn) {
          buyBtn.disabled = true;
          buyBtn.style.opacity = 0.4;
        }
      } else {
        card.classList.add('level-card-disabled');
        if (playBtn) playBtn.disabled = true;
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.style.opacity = 1;
        }
      }
    }
  });
}

// eventy na play/buy tlačítka, pokud v HTML existují
document.querySelectorAll('.level-play-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.levelKey;
    if (!key) return;

    if (!isLevelUnlocked(key)) {
      alert('Tento level je zatím zamčený.');
      return;
    }
    goToLevel(key);
  });
});

document.querySelectorAll('.level-buy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.levelKey;
    if (!key) return;

    if (isLevelUnlocked(key)) {
      alert('Level je už odemčený.');
      return;
    }

    const lvl   = levels[key];
    const price = (lvl && typeof lvl.unlockPrice === 'number')
      ? lvl.unlockPrice
      : LEVEL_BASE_UNLOCK_PRICE;

    if (playerState.currency < price) {
      alert('Nemáš dost měny na odemknutí tohoto levelu.');
      return;
    }

    const ok = confirm('Odemknout level za ' + price + ' ✦?');
    if (!ok) return;

    if (!tryUnlockLevelWithCurrency(key)) {
      alert('Odemknutí levelu se nepodařilo.');
      return;
    }

    alert('Level byl odemčen.');
    refreshLevelsUI();
  });
});

// -------------------------------------------------
// HRÁČ – UI helpery (vše volitelné)
// -------------------------------------------------

function updateCurrencyUI() {
  if (!currencyValueEl) return;
  const val = Number.isFinite(playerState.currency) ? playerState.currency : 0;
  currencyValueEl.textContent = val + ' ✦';
}

function refreshPlayerSettingsUI() {
  const amb = playerState.ambients || {};

  if (flashEffectSelect) {
    flashEffectSelect.value = playerState.flashEffect || 'classic';
  }
  if (ambientGlowCheckbox) {
    ambientGlowCheckbox.checked = amb.glow !== false;
  }
  if (ambientShockwaveCheckbox) {
    ambientShockwaveCheckbox.checked = amb.shockwave !== false;
  }
  if (ambientParticlesCheckbox) {
    ambientParticlesCheckbox.checked = amb.particles !== false;
  }
  if (ambientSaturateCheckbox) {
    ambientSaturateCheckbox.checked = !!amb.saturate;
  }

  if (!savedVisualText || !replaySavedVisualBtn || !clearSavedVisualBtn) return;

  const sv = playerState.savedVisual;
  if (!sv) {
    savedVisualText.textContent =
      'Zatím nemáš uložený žádný vizuál z dohraného levelu.';
    replaySavedVisualBtn.disabled = true;
    clearSavedVisualBtn.disabled = true;
    return;
  }

  const lvlDef  = (typeof levels === 'object' && levels) ? levels[sv.levelKey] : null;
  const lvlName = (lvlDef && lvlDef.name) ? lvlDef.name : sv.levelKey;
  const dateStr = sv.savedAt ? new Date(sv.savedAt).toLocaleString('cs-CZ') : '';
  let accText   = sv.accuracy;

  if (typeof accText === 'number') {
    accText = accText.toFixed(1);
  }

  savedVisualText.textContent =
    'Uložený vizuál z levelu „' + lvlName +
    '“, skóre ' + sv.score +
    ', přesnost ' + accText + ' %. ' +
    (dateStr ? 'Uloženo: ' + dateStr + '.' : '');

  replaySavedVisualBtn.disabled = false;
  clearSavedVisualBtn.disabled  = false;
}

// uložení nastavení hráče (HRÁČ tab)
if (savePlayerSettingsBtn) {
  savePlayerSettingsBtn.addEventListener('click', () => {
    if (flashEffectSelect) {
      setFlashEffect(flashEffectSelect.value || 'classic');
    }
    if (ambientGlowCheckbox && ambientShockwaveCheckbox &&
        ambientParticlesCheckbox && ambientSaturateCheckbox) {
      setAmbientsFromUI(
        ambientGlowCheckbox.checked,
        ambientShockwaveCheckbox.checked,
        ambientParticlesCheckbox.checked,
        ambientSaturateCheckbox.checked
      );
    }

    refreshPlayerSettingsUI();

    if (playerSettingsStatus) {
      playerSettingsStatus.textContent = 'Nastavení uloženo.';
      setTimeout(() => {
        playerSettingsStatus.textContent = '';
      }, 1800);
    }
  });
}

// ovládání uloženého vizuálu
if (replaySavedVisualBtn) {
  replaySavedVisualBtn.addEventListener('click', () => {
    const sv = playerState.savedVisual;
    if (!sv) return;

    if (!isLevelUnlocked(sv.levelKey)) {
      alert('Level uloženého vizuálu je zatím zamčený.');
      return;
    }
    goToLevel(sv.levelKey);
  });
}

if (clearSavedVisualBtn) {
  clearSavedVisualBtn.addEventListener('click', () => {
    const ok = confirm('Opravdu chceš smazat uložený vizuál?');
    if (!ok) return;
    clearSavedVisual();
  });
}

// Uložení vizuálu z výsledkového overlaye
if (saveVisualBtn) {
  saveVisualBtn.addEventListener('click', () => {
    if (!lastRunSummary) return;

    // první uložení zdarma
    if (!playerState.savedVisual) {
      saveCurrentRunAsVisual();
      alert('Vizuál byl uložen.');
      return;
    }

    const price = VISUAL_SAVE_PRICE;
    if (playerState.currency < price) {
      alert('Nemáš dost měny. Přepsání vizuálu stojí ' + price + ' ✦.');
      return;
    }

    const ok = confirm('Přepsat uložený vizuál za ' + price + ' ✦?');
    if (!ok) return;

    if (!spendCurrency(price)) {
      alert('Platba se nepodařila.');
      return;
    }

    saveCurrentRunAsVisual();
    alert('Vizuál byl přepsán.');
  });
}

// -------------------------------------------------
// HERNÍ OVLÁDÁNÍ (start/restart/menu/mute)
// -------------------------------------------------

startBtn.addEventListener('click', () => {
  startLevel();
});

playAgainBtn.addEventListener('click', () => {
  startLevel();
});

restartBtn.addEventListener('click', () => {
  music.pause();
  music.currentTime = 0;
  timeInfo.style.setProperty('--progress', 0);
  resetLevelState();
  statusText.textContent = 'Restartováno. Připraveno na nový start.';
  showLevelIntro();
});

backToMenuFromIntro.addEventListener('click', () => {
  music.pause();
  music.currentTime = 0;
  timeInfo.style.setProperty('--progress', 0);
  showMenuScreen();
});

backToMenuFromResult.addEventListener('click', () => {
  music.pause();
  music.currentTime = 0;
  timeInfo.style.setProperty('--progress', 0);
  showMenuScreen();
});

backToMenuInHud.addEventListener('click', () => {
  music.pause();
  music.currentTime = 0;
  timeInfo.style.setProperty('--progress', 0);
  showMenuScreen();
});

muteBtn.addEventListener('click', () => {
  music.muted = !music.muted;
  muteBtn.textContent = music.muted ? 'Unmute' : 'Mute';
});

// -------------------------------------------------
// Hudba – načtení, timeline, dohrání
// -------------------------------------------------

music.addEventListener('loadedmetadata', () => {
  const durationSec = music.duration;

  timeInfo.style.setProperty('--progress', 0);

  if (!isFinite(durationSec) || durationSec <= 0) {
    // fallback – fixní pattern
    startBtn.disabled   = false;
    restartBtn.disabled = false;
    pattern         = createPattern(20, BUBBLE_INTERVAL_SEC);
    totalScheduled  = pattern.length;
    return;
  }

  buildPatternForMusic();
  startBtn.disabled   = false;
  restartBtn.disabled = false;
});

music.addEventListener('timeupdate', () => {
  const durationSec = music.duration;
  if (!isFinite(durationSec) || durationSec <= 0) return;

  let progress = music.currentTime / durationSec;
  if (progress < 0) progress = 0;
  if (progress > 1) progress = 1;

  timeInfo.style.setProperty('--progress', progress);
});

music.addEventListener('ended', () => {
  timeInfo.style.setProperty('--progress', 1);
  if (levelRunning) {
    statusText.textContent = 'Hudba skončila, kapky ještě dobíhají.';
  }
});

// -------------------------------------------------
// Background image status
// -------------------------------------------------

bgImage1.addEventListener('load', () => {
  imageStatus.textContent = 'Obrázek levelu načten.';
  imageStatus.classList.remove('error');
  imageStatus.classList.add('ok');
});

bgImage1.addEventListener('error', () => {
  imageStatus.innerHTML =
    'Obrázek levelu se nenačetl. Zkontroluj cestu v <code>levels[...].image</code>.';
  imageStatus.classList.remove('ok');
  imageStatus.classList.add('error');
});

// -------------------------------------------------
// PLAY / PAUSE tlačítko
// -------------------------------------------------

if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    if (!music.src) return;

    if (!music.paused) {
      music.pause();
      levelRunning = false;
      playPauseBtn.textContent = '►';
      statusText.textContent = 'Pauza';
      return;
    }

    music.play();
    levelRunning = true;
    playPauseBtn.textContent = '❚❚';
    statusText.textContent = '';
  });
}

// -------------------------------------------------
// MONETIZAČNÍ OBAL PRO endLevel
// -------------------------------------------------

// uložíme původní implementaci z game.js
const originalEndLevel = endLevel;

// přepíšeme endLevel – nejdřív se zavolá původní logika,
// pak se přičte měna, odemkne další level a připraví uložitelný vizuál
function endLevel(reason = 'Level je u konce.') {
  // původní herní logika (overlay, statistiky, atd.)
  originalEndLevel(reason);

  const totalEvents = hits + misses;
  const accuracyNum = totalEvents > 0 ? (hits / totalEvents) * 100 : 0;
  const completedAll =
    hits >= totalScheduled &&
    totalScheduled > 0 &&
    !gameOverBySoul;

  lastRunSummary = {
    levelKey: currentLevelKey,
    score: score,
    hits: hits,
    misses: misses,
    totalScheduled: totalScheduled,
    accuracy: accuracyNum,
    completedAll: completedAll
  };

  // 100 % completion → odemknout další level
  if (completedAll) {
    unlockNextLevel(currentLevelKey);
  }

  // přičtení měny = skóre
  if (score > 0) {
    addCurrency(score);
    if (currencyInfoEl) {
      currencyInfoEl.textContent =
        'Za tento run získáváš ' + score + ' ✦ měny.';
    }
  } else if (currencyInfoEl) {
    currencyInfoEl.textContent =
      'Tentokrát jsi nezískal žádnou měnu.';
  }

  // nastavení tlačítka pro uložení vizuálu
  if (saveVisualBtn) {
    saveVisualBtn.disabled = !lastRunSummary;
    if (playerState && playerState.savedVisual) {
      saveVisualBtn.textContent =
        'Přepsat uložený vizuál (cena ' + VISUAL_SAVE_PRICE + ' ✦)';
    } else {
      saveVisualBtn.textContent = 'Uložit tento vizuál';
    }
  }

  refreshLevelsUI();
}

// -------------------------------------------------
// Inicializace hry / UI
// -------------------------------------------------

updateBackgroundProgress(0);
resetSoul();
setCurrentLevel('majak');
showMenuScreen();

// refresh UI podle uloženého stavu hráče
updateCurrencyUI();
refreshPlayerSettingsUI();
refreshLevelsUI();
