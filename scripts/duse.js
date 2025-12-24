// -------------------------------------------------
// DUŠE – jedno-souborová verze (game + UI + monetizace)
// -------------------------------------------------

// ------------------------ DOM PRVKY ----------------------------

// Hlavní obrazovky
const menuScreen   = document.getElementById('menuScreen');
const gameScreen   = document.getElementById('gameScreen');

// Levé menu
const menuNewGame  = document.getElementById('menuNewGame');
const menuLevels   = document.getElementById('menuLevels');
const menuHowTo    = document.getElementById('menuHowTo');
const menuPlayer   = document.getElementById('menuPlayer');

// Tlačítka v menu
const playMajakFromMenu = document.getElementById('playMajakFromMenu');

// HUD / overlaye
const levelIntroOverlay = document.getElementById('levelIntroOverlay');
const resultOverlay     = document.getElementById('resultOverlay');

const startBtn          = document.getElementById('startBtn');
const playAgainBtn      = document.getElementById('playAgainBtn');
const restartBtn        = document.getElementById('restartBtn');
const muteBtn           = document.getElementById('muteBtn');

const backToMenuFromIntro  = document.getElementById('backToMenuFromIntro');
const backToMenuFromResult = document.getElementById('backToMenuFromResult');
const backToMenuInHud      = document.getElementById('backToMenuInHud');

const statusText       = document.getElementById('statusText');
const statsEl          = document.getElementById('stats');
const resultStatsEl    = document.getElementById('resultStats');
const imageStatus      = document.getElementById('imageStatus');

const timeInfo         = document.getElementById('timeInfo');
const scoreInfo        = document.getElementById('scoreInfo');

const world            = document.getElementById('world');
const scrollTrack      = document.getElementById('scrollTrack');
const bgImage1         = document.getElementById('bgImage1');
const bgImage2         = document.getElementById('bgImage2');

const soulWrapper      = document.getElementById('soulWrapper');
const soul             = document.getElementById('soul');
const soulParticlesContainer = document.getElementById('soul');

const bubbleTemplate   = document.getElementById('bubbleTemplate');

const cursorLight      = document.getElementById('cursorLight');
const music            = document.getElementById('music');

// Jméno aktuálního levelu (více míst v UI)
const currentLevelNameEls =
  document.querySelectorAll('[data-current-level-name]');

// Sekce vpravo v menu
const menuSections = document.querySelectorAll('.menu-section');

// Tlačítko pauzy – ale logicky ho NEPOUŽIJEME (aby se nedalo cheatovat)
const playPauseBtn = document.getElementById('playPauseBtn');
if (playPauseBtn) {
  playPauseBtn.style.display = 'none';
}

// --------------------- HRÁČ / MONETIZACE -----------------------

const currencyValueEl      = document.getElementById('currencyValue');
const playerSettingsStatus = document.getElementById('playerSettingsStatus');

// Preview
const effectPreviewNameEl = document.getElementById('effectPreviewName');
const previewPlayBtn      = document.getElementById('previewPlayBtn');
const previewBg           = document.getElementById('previewBg');
const previewSoul         = document.getElementById('previewSoul');
const previewBurst        = document.getElementById('previewBurst');
const previewFlash        = document.getElementById('previewFlash');

// Saved visual (ponecháno)
const savedVisualText      = document.getElementById('savedVisualText');
const replaySavedVisualBtn = document.getElementById('replaySavedVisualBtn');
const clearSavedVisualBtn  = document.getElementById('clearSavedVisualBtn');

const saveVisualBtn            = document.getElementById('saveVisualBtn');
const currencyInfoEl           = document.getElementById('currencyInfo');

// Shrnutí posledního dohraného levelu
let lastRunSummary = null;

// ------------------------- KONSTANTY ---------------------------

// Soul (hráč)
const SOUL_BASE_SIZE       = 80;
const SOUL_MAX_SIZE        = 1.6;
const SOUL_MIN_SIZE        = 0.25;
const SOUL_GROW_PER_HIT    = 0.05;
const SOUL_SHRINK_PER_MISS = 0.08;

// Bubliny
const BUBBLE_START_X       = 110;
const BUBBLE_END_X         = -10;
const BASE_TRAVEL_TIME_SEC = 3.2;
const BUBBLE_INTERVAL_SEC  = 1.2;

// Šplouch
const SPLASH_BASE_SIZE     = 140;
const POP_DURATION         = 260;

// Duše – částice
const MAX_EXTRA_PARTICLES  = 40;

// Monetizace
const PLAYER_STATE_KEY           = 'duse_player_state_v1';
const VISUAL_SAVE_PRICE          = 500;  // cena za uložený / přepsaný vizuál
const LEVEL_BASE_UNLOCK_PRICE    = 1500;

// dočasné vizuální nastavení (flash, ambients)
const EFFECT_CHARGE_PRICE = 100; // 1 kolo pro 1 efekt
const EFFECT_MAX_CHARGES  = 3;   // max nabití na efekt

// -------------------------- LEVELY -----------------------------

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

// Pořadí levelů pro automatické odemykání
const levelOrder = Object.keys(levels);

// ---------------------- HERNÍ STAV -----------------------------

let currentLevelKey = 'majak';

let soulX = 25;
let soulY = 60;
let soulSize = 1.0;
let extraSoulParticles = 0;

let bgProgressValue = 0;
let comboStreak = 0;
let flashTimeoutId = null;
let isFlashActive = false;

let levelRunning   = false;
let gameOverBySoul = false;

// REŽIM PŘEHRÁNÍ ULOŽENÉHO VIZUÁLU
let isReplayingVisual       = false;
let currentReplayVisual     = null;
let replayWaitingForMetadata = false;
let replayPopped            = 0;
let replaySettingsBackup   = null; // dočasný snapshot nastavení pro replay


// dočasné přepnutí nastavení (jen pro přehrání uloženého vizuálu)
let replayVisualSettingsBackup = null;

let pattern        = [];
let totalScheduled = 0;
let shownBubbles   = 0;
let hits           = 0;
let misses         = 0;
let score          = 0;

let spawnTimeouts  = [];
let endTimeoutId   = null;
let bubbles        = [];
let activeSplashes = [];

let lastFrameTime  = 0;

// --------------------- PLAYER STATE (LS) ------------------------

function getDefaultPlayerState() {
  return {
    currency: 0,
    unlockedLevels: ['majak'],

    // Aktivní nastavení (to, co se opravdu použije ve hře)
    flashEffect: 'classic', // zdarma
    ambients: {
      glow: true,       // zdarma (základní reakce)
      shockwave: false, // placené – default vypnuto
      particles: false, // placené – default vypnuto
      saturate: false   // placené – default vypnuto
    },

    // Nabití pro jednotlivé placené efekty (0–3 kol)
    effectCharges: {
      flash_soft: 0,
      flash_strong: 0,
      flash_mono: 0,
      amb_shockwave: 0,
      amb_particles: 0,
      amb_saturate: 0
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

    // Ambients normalizace
    const parsedAmb = parsed.ambients || {};
    const ambients = {
      glow: parsedAmb.glow !== false,              // default true
      shockwave: !!parsedAmb.shockwave,
      particles: !!parsedAmb.particles,
      saturate: !!parsedAmb.saturate
    };

    // Charges – výchozí + merge z uloženého stavu
    const effectCharges = { ...def.effectCharges };
    if (parsed.effectCharges && typeof parsed.effectCharges === 'object') {
      Object.keys(effectCharges).forEach(k => {
        const v = parsed.effectCharges[k];
        if (Number.isFinite(v)) effectCharges[k] = Math.max(0, Math.min(EFFECT_MAX_CHARGES, Math.floor(v)));
      });
    }

    // MIGRACE ze starého systému (balíček `visualBoostsLeft`)
    // Pokud měl hráč nabitý balíček a měl aktivní některé efekty, převedeme to na jejich counter.
    if (Number.isFinite(parsed.visualBoostsLeft) && parsed.visualBoostsLeft > 0) {
      const oldLeft = Math.max(0, Math.min(EFFECT_MAX_CHARGES, Math.floor(parsed.visualBoostsLeft)));

      // Flash (soft/strong/mono) – pokud byl aktivní, dostane nabití
      switch (parsed.flashEffect) {
        case 'soft':   effectCharges.flash_soft   = Math.max(effectCharges.flash_soft, oldLeft); break;
        case 'strong': effectCharges.flash_strong = Math.max(effectCharges.flash_strong, oldLeft); break;
        case 'mono':   effectCharges.flash_mono   = Math.max(effectCharges.flash_mono, oldLeft); break;
        default: break;
      }

      // Ambienty – pokud byly zapnuté, dostanou nabití
      const oa = parsed.ambients || {};
      if (oa.shockwave) effectCharges.amb_shockwave = Math.max(effectCharges.amb_shockwave, oldLeft);
      if (oa.particles) effectCharges.amb_particles = Math.max(effectCharges.amb_particles, oldLeft);
      if (oa.saturate)  effectCharges.amb_saturate  = Math.max(effectCharges.amb_saturate,  oldLeft);
    }

    return {
      currency: Number.isFinite(parsed.currency) ? parsed.currency : def.currency,

      unlockedLevels: Array.isArray(parsed.unlockedLevels)
        ? Array.from(new Set(['majak', ...parsed.unlockedLevels]))
        : ['majak'],

      flashEffect: parsed.flashEffect || def.flashEffect,
      ambients,
      effectCharges,

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

// Měna
function addCurrency(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const inc = Math.floor(amount);
  if (!Number.isFinite(playerState.currency)) playerState.currency = 0;
  playerState.currency = Math.max(0, playerState.currency + inc);
  savePlayerState();
}
// ---------------------- EFEKTY (jednotlivě) ----------------------

const EFFECTS = {
  // FLASH (1 aktivní)
  flash_classic: { id: 'flash_classic', kind: 'flash', value: 'classic', paid: false, label: 'Klasický flash' },
  flash_soft:    { id: 'flash_soft',    kind: 'flash', value: 'soft',    paid: true,  label: 'Měkčí flash' },
  flash_strong:  { id: 'flash_strong',  kind: 'flash', value: 'strong',  paid: true,  label: 'Silný flash' },
  flash_mono:    { id: 'flash_mono',    kind: 'flash', value: 'mono',    paid: true,  label: 'Mono flash' },
  flash_off:     { id: 'flash_off',     kind: 'flash', value: 'off',     paid: false, label: 'Flashe vypnout' },

  // AMBIENT (nezávislé toggly)
  amb_glow:      { id: 'amb_glow',      kind: 'ambient', key: 'glow',      paid: false, label: 'Glow duše' },
  amb_shockwave: { id: 'amb_shockwave', kind: 'ambient', key: 'shockwave', paid: true,  label: 'Shockwave' },
  amb_particles: { id: 'amb_particles', kind: 'ambient', key: 'particles', paid: true,  label: 'Particles+' },
  amb_saturate:  { id: 'amb_saturate',  kind: 'ambient', key: 'saturate',  paid: true,  label: 'Saturate' }
};

function getCharges(effectId) {
  const map = (playerState && playerState.effectCharges) ? playerState.effectCharges : {};
  const v = map[effectId];
  return Number.isFinite(v) ? Math.max(0, Math.min(EFFECT_MAX_CHARGES, Math.floor(v))) : 0;
}

function setCharges(effectId, value) {
  if (!playerState.effectCharges) playerState.effectCharges = {};
  playerState.effectCharges[effectId] =
    Math.max(0, Math.min(EFFECT_MAX_CHARGES, Math.floor(value || 0)));
}

function isEffectActive(effectId) {
  const e = EFFECTS[effectId];
  if (!e) return false;

  if (e.kind === 'flash') {
    return (playerState.flashEffect || 'classic') === e.value;
  }

  if (e.kind === 'ambient') {
    const a = playerState.ambients || {};
    return !!a[e.key];
  }

  return false;
}

function deactivateEffect(effectId) {
  const e = EFFECTS[effectId];
  if (!e) return false;

  if (e.kind === 'flash') {
    // návrat na free základ
    playerState.flashEffect = 'classic';
    return true;
  }

  if (e.kind === 'ambient') {
    if (!playerState.ambients) playerState.ambients = {};
    // glow může být vypínatelný (zdarma), ostatní jen false
    playerState.ambients[e.key] = false;
    return true;
  }

  return false;
}

function activateEffect(effectId) {
  const e = EFFECTS[effectId];
  if (!e) return { ok: false, msg: 'Neznámý efekt.' };

  // placené musí mít nabití
  if (e.paid && getCharges(effectId) <= 0) {
    return { ok: false, msg: 'Nemáš nabito. Kup alespoň 1 kolo (100 ✦).' };
  }

  if (e.kind === 'flash') {
    playerState.flashEffect = e.value;
    return { ok: true };
  }

  if (e.kind === 'ambient') {
    if (!playerState.ambients) playerState.ambients = {};
    playerState.ambients[e.key] = true;
    return { ok: true };
  }

  return { ok: false, msg: 'Neplatný typ efektu.' };
}

function sanitizeActiveEffects() {
  let changed = false;

  // cap + cleanup charges
  if (!playerState.effectCharges) playerState.effectCharges = {};
  Object.keys(getDefaultPlayerState().effectCharges).forEach(id => {
    const v = getCharges(id);
    if (playerState.effectCharges[id] !== v) {
      playerState.effectCharges[id] = v;
      changed = true;
    }
  });

  // pokud je placený aktivní bez nabití → vypnout
  Object.keys(EFFECTS).forEach(id => {
    const e = EFFECTS[id];
    if (!e || !e.paid) return;
    if (isEffectActive(id) && getCharges(id) <= 0) {
      deactivateEffect(id);
      changed = true;
    }
  });

  return changed;
}

function buyEffectCharge(effectId) {
  const e = EFFECTS[effectId];
  if (!e) return;
  if (!e.paid) return;

  const current = getCharges(effectId);
  if (current >= EFFECT_MAX_CHARGES) return;

  const cost = EFFECT_CHARGE_PRICE;
  if (playerState.currency < cost) {
    alert('Nemáš dost měny. 1 kolo stojí ' + cost + ' ✦.');
    return;
  }

  const ok = confirm('Koupit +1 kolo pro efekt „' + e.label + '“ za ' + cost + ' ✦?');
  if (!ok) return;

  if (!spendCurrency(cost)) {
    alert('Platba se nepodařila.');
    return;
  }

  setCharges(effectId, current + 1);
  savePlayerState();
}

function consumeChargesAfterRun() {
  // odečítáme jen placené EFEKTY, které jsou AKTIVNÍ v době dohrání
  const consumed = [];

  Object.keys(EFFECTS).forEach(id => {
    const e = EFFECTS[id];
    if (!e || !e.paid) return;
    if (!isEffectActive(id)) return;

    const before = getCharges(id);
    if (before <= 0) return;

    const after = before - 1;
    setCharges(id, after);
    consumed.push({ id, before, after });

    if (after <= 0) {
      deactivateEffect(id);
    }
  });

  // pokud jsme něco změnili (charges nebo auto-vypnutí), uložíme
  if (consumed.length > 0) {
    savePlayerState();
  }

  return consumed;
}


function spendCurrency(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const cost = Math.floor(amount);
  if (!Number.isFinite(playerState.currency)) playerState.currency = 0;
  if (playerState.currency < cost) return false;
  playerState.currency -= cost;
  savePlayerState();
  return true;
}

// Levely – odemčení
function isLevelUnlocked(key) {
  if (!key) return false;
  if (key === 'majak') return true;
  const list = Array.isArray(playerState.unlockedLevels)
    ? playerState.unlockedLevels
    : ['majak'];
  return list.includes(key);
}

function unlockNextLevel(currentKey) {
  const idx = levelOrder.indexOf(currentKey);
  if (idx === -1 || idx >= levelOrder.length - 1) return;
  const nextKey = levelOrder[idx + 1];
  if (!nextKey) return;

  if (!Array.isArray(playerState.unlockedLevels)) {
    playerState.unlockedLevels = ['majak'];
  }
  if (!playerState.unlockedLevels.includes(nextKey)) {
    playerState.unlockedLevels.push(nextKey);
    savePlayerState();
  }
}

function tryUnlockLevelWithCurrency(key) {
  if (!key || !levels[key]) return false;
  const lvl   = levels[key];
  const price = typeof lvl.unlockPrice === 'number'
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

// Uložený vizuál
function saveCurrentRunAsVisual() {
  if (!lastRunSummary) return;
  playerState.savedVisual = {
    ...lastRunSummary,
    bgProgress: bgProgressValue,
    // snapshot efektů v době uložení (ať replay vypadá stejně)
    flashEffect: (playerState && playerState.flashEffect) ? playerState.flashEffect : 'classic',
    ambients: (playerState && playerState.ambients) ? playerState.ambients : null,
    savedAt: Date.now()
  };
  savePlayerState();
}

function clearSavedVisual() {
  playerState.savedVisual = null;
  savePlayerState();
}

// Nastavení hráče (flash + ambients)
function setFlashEffect(mode) {
  playerState.flashEffect = mode || 'classic';
  savePlayerState();
}

function setAmbientsFromUI(glow, shockwave, particles, saturate) {
  playerState.ambients = {
    glow: !!glow,
    shockwave: !!shockwave,
    particles: !!particles,
    saturate: !!saturate
  };
  savePlayerState();
}

// Default / reset vizuálních nastavení
function isDefaultVisualSettings(state) {
  const s = state || playerState;
  const amb = s.ambients || {};
  return (
    (s.flashEffect || 'classic') === 'classic' &&
    amb.glow !== false &&
    amb.shockwave !== false &&
    amb.particles !== false &&
    !!amb.saturate === false
  );
}

function resetVisualSettingsToDefault() {
  playerState.flashEffect = 'classic';
  playerState.ambients = {
    glow: true,
    shockwave: true,
    particles: true,
    saturate: false
  };
  playerState.visualBoostsLeft = 0;
  savePlayerState();
}

// ------------------------ HUD / DUŠE ---------------------------

function updateScoreHud() {
  scoreInfo.textContent = 'Skóre: ' + score;
}

function updateSoulVisual() {
  const hasFinePointer =
    window.matchMedia &&
    window.matchMedia('(any-pointer: fine)').matches;

  const baseFactor = hasFinePointer ? 1.0 : 0.75;
  const size = SOUL_BASE_SIZE * baseFactor * soulSize;

  soul.style.width  = size + 'px';
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
  if (!soulParticlesContainer) return;

  // ambient – hráč může částice vypnout
  if (playerState && playerState.ambients && playerState.ambients.particles === false) {
    return;
  }

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
  soulY = yPercent + 8;

  soul.classList.remove('soul-dash', 'soul-grow', 'soul-flash');
  void soul.offsetWidth; // reflow

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

// ------------------------ LEVELY / PATTERN ---------------------

function loadLevelAssets() {
  const lvl = levels[currentLevelKey];
  if (!lvl) return;

  scrollTrack.style.opacity = 0;
  scrollTrack.style.filter  = 'grayscale(1)';

  bgImage1.src = lvl.image;
  bgImage2.src = lvl.image;
  music.src    = lvl.music;

  imageStatus.textContent = '';
  imageStatus.classList.remove('error');
  imageStatus.classList.remove('ok');
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

  const startOffset        = 1.0;
  const endReserve         = 1.0;
  const startInterval      = 1.8;
  const endInterval        = 0.8;
  const startTravelFactor  = 1.1;
  const endTravelFactor    = 0.6;

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
    const travelFactor  = startTravelFactor + (endTravelFactor - startTravelFactor) * r;
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

// ------------------------- POZADÍ / FLASH ----------------------

function updateBackgroundProgress(progress) {
  const p = Math.max(0, Math.min(1, progress));
  bgProgressValue = p;

  if (p === 0) {
    scrollTrack.style.opacity = 0;
    scrollTrack.style.filter  = 'grayscale(1)';
    return;
  }

  let opacity, grayscale;

  if (p < 0.5) {
    const phase = p / 0.5;
    opacity = phase;
    grayscale = 1;
  } else {
    const phase = (p - 0.5) / 0.5;
    opacity = 1;
    grayscale = 1 - phase;
  }

  scrollTrack.style.opacity = opacity;
  scrollTrack.style.filter  = `grayscale(${grayscale})`;
}

function clearAllColorBursts() {
  if (!world) return;
  const bursts = world.querySelectorAll('.color-burst');
  bursts.forEach(b => b.remove());
}

// krátký flash – délka a síla podle tieru (5, 10, 15…)
// respektuje hráčské nastavení flashEffect + náhodná variace
function triggerComboFlash(tier) {
  if (!scrollTrack) return;

  const effect = (playerState && playerState.flashEffect) || 'classic';
  if (effect === 'off') {
    return; // hráč flash vypnul
  }

  if (flashTimeoutId !== null) {
    clearTimeout(flashTimeoutId);
    flashTimeoutId = null;
  }

  const cappedTier = Math.min(tier, 20);

  let strengthBase = 1.0 + cappedTier * 0.12;
  let durationBase = 200 + cappedTier * 40;

  const randomStrengthDelta = (Math.random() * 0.4) - 0.2;
  const randomDurationDelta = (Math.random() * 120) - 60;

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

  let strength = strengthBase * strengthScale + randomStrengthDelta;
  let duration = durationBase * durationScale + randomDurationDelta;

  if (strength < 0.9) strength = 0.9;
  if (duration < 180) duration = 180;

  isFlashActive = true;

  clearAllColorBursts();

  scrollTrack.style.setProperty('--flashStrength', strength.toFixed(2));
  scrollTrack.classList.add('flash-fullcolor');

  flashTimeoutId = window.setTimeout(() => {
    scrollTrack.classList.remove('flash-fullcolor');
    updateBackgroundProgress(bgProgressValue);
    isFlashActive = false;
    flashTimeoutId = null;
  }, duration);
}

function spawnColorBurst(centerX, centerY, strength) {
  if (!world) return;
  if (isFlashActive) return;

  if (playerState && playerState.ambients && playerState.ambients.shockwave === false) {
    return;
  }

  const rectWorld = world.getBoundingClientRect();
  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top) / rectWorld.height) * 100;

  const burst = document.createElement('div');
  burst.className = 'color-burst';
  burst.style.left = xPercent + '%';
  burst.style.top  = yPercent + '%';

  const s = Math.max(0, strength || 0);
  const sNorm = Math.min(1, s / 1.2);

  const p = Math.max(0, Math.min(1, bgProgressValue || 0));
  let intensity = Math.pow(1 - p, 1.2);

  const baseSat = 1.0;
  const baseBright = 1.0;

  let sat =
    baseSat +
    3.0 * intensity +
    0.7 * sNorm * intensity;

  let bright =
    baseBright +
    0.6 * intensity +
    0.3 * sNorm * intensity;

  if (playerState && playerState.ambients && playerState.ambients.saturate) {
    sat *= 1.2;
    bright *= 1.05;
  }

  burst.style.setProperty('--burst-saturate', sat.toFixed(2));
  burst.style.setProperty('--burst-bright',   bright.toFixed(2));

  world.appendChild(burst);

  setTimeout(() => {
    if (burst.parentNode) burst.parentNode.removeChild(burst);
  }, 700);
}

// ------------------------ ŠPLOUCHNUTÍ --------------------------

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

// ------------------------ SPAWN BUBLIN -------------------------

function spawnBubbleAt(yPercent, travelTimeSec) {
  if (!levelRunning) return;

  shownBubbles++;

  const startX = BUBBLE_START_X;
  const endX   = BUBBLE_END_X;
  const distance = startX - endX;
  const travel   = travelTimeSec || BASE_TRAVEL_TIME_SEC;
  const speed    = distance / travel;

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

function schedulePattern(isReplay = false) {
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
    const lastTimeMs =
      last.t * 1000 + (last.travelTimeSec || BASE_TRAVEL_TIME_SEC) * 1000;

    endTimeoutId = setTimeout(() => {
      if (levelRunning && !gameOverBySoul) {
        music.pause();
        if (isReplay) {
          endReplay('Přehrávání uloženého vizuálu dokončeno.');
        } else {
          endLevel('Vzor kapek je u konce.');
        }
      }
    }, lastTimeMs + 150);
    spawnTimeouts.push(endTimeoutId);
  }
}

// ------------------------ MISS / RESET -------------------------

function registerMiss() {
  if (!levelRunning) return;
  if (isReplayingVisual) return; // v replay módu žádné miss / game over

  misses++;
  comboStreak = 0;

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
  void scrollTrack.offsetWidth;
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
  hits   = 0;
  misses = 0;
  gameOverBySoul = false;
  score  = 0;
  comboStreak = 0;
  updateScoreHud();
  statsEl.textContent = '';
  statusText.textContent = '';

  lastFrameTime   = 0;
  lastRunSummary  = null;
  resetSoul();
}

// ---------------------------- END LEVEL ------------------------

function endLevel(reason = 'Level je u konce.') {
  if (!levelRunning) return;
  if (isReplayingVisual) return; // normální endLevel se v replay módu nepoužívá

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

  statsEl.innerHTML      = statsHtml;
  resultStatsEl.innerHTML = statsHtml;
  resultOverlay.classList.remove('overlay-hidden');

  // shrnutí posledního běhu (pro uložení vizuálu)
  // Podmínka pro odemčení dalšího levelu: dohrát celý pattern (bez game over)
  // a mít alespoň 90 % úspěšnost.
  const completedAll =
    totalScheduled > 0 &&
    !gameOverBySoul &&
    shownBubbles >= totalScheduled &&
    accuracyNum >= 90;

  lastRunSummary = {
    levelKey: currentLevelKey,
    score: score,
    hits: hits,
    misses: misses,
    totalScheduled: totalScheduled,
    accuracy: accuracyNum,
    completedAll: completedAll
  };

  // 90 % úspěšnost + dohraný pattern → odemknout další level
  if (completedAll) {
    unlockNextLevel(currentLevelKey);
  }

  // Měna = skóre
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

  // Vyčerpání dočasných vizuálních nastavení
  if (!isDefaultVisualSettings(playerState) &&
      typeof playerState.visualBoostsLeft === 'number' &&
      playerState.visualBoostsLeft > 0) {

    playerState.visualBoostsLeft -= 1;

    if (playerState.visualBoostsLeft <= 0) {
      resetVisualSettingsToDefault();
      if (playerSettingsStatus) {
        playerSettingsStatus.textContent =
          'Dočasné vizuální nastavení vypršelo. Vrátilo se základní nastavení.';
        setTimeout(() => {
          if (playerSettingsStatus.textContent ===
              'Dočasné vizuální nastavení vypršelo. Vrátilo se základní nastavení.') {
            playerSettingsStatus.textContent = '';
          }
        }, 4000);
      }
    } else {
      savePlayerState();
      if (playerSettingsStatus) {
        playerSettingsStatus.textContent =
          'Zbývají ještě ' + playerState.visualBoostsLeft +
          ' dohrané hry s tímto vizuálním nastavením.';
        setTimeout(() => {
          if (playerSettingsStatus.textContent.startsWith('Zbývají ještě ')) {
            playerSettingsStatus.textContent = '';
          }
        }, 4000);
      }
    }
  }

  // Save vizuál tlačítko
  if (saveVisualBtn) {
    saveVisualBtn.disabled = !lastRunSummary;
    if (playerState && playerState.savedVisual) {
      saveVisualBtn.textContent =
        'Přepsat uložený vizuál (cena ' + VISUAL_SAVE_PRICE + ' ✦)';
    } else {
      saveVisualBtn.textContent =
        'Uložit tento vizuál (cena ' + VISUAL_SAVE_PRICE + ' ✦)';
    }
  }

  restartBtn.disabled   = false;
  startBtn.disabled     = false;
  playAgainBtn.disabled = false;

  refreshLevelsUI();
}

// ---------------------- END REPLAY (vizuál) --------------------

function endReplay(reason = 'Přehrávání uloženého vizuálu dokončeno.') {
  if (!isReplayingVisual) return;

  levelRunning = false;
  clearAllSpawnTimers();
  clearAllSplashes();
  clearAllBubbles();
  music.pause();
  // vrátit vizuální nastavení po replay
  if (replaySettingsBackup) {
    playerState.flashEffect = replaySettingsBackup.flashEffect || 'classic';
    playerState.ambients    = replaySettingsBackup.ambients || playerState.ambients;
    replaySettingsBackup = null;
  }
  // zobrazit zpět duši / kurzor
  if (soulWrapper) soulWrapper.style.display = '';
  if (cursorLight) cursorLight.style.display = '';

  statusText.textContent = reason;

  const sv = currentReplayVisual;
  if (!sv) {
    resultOverlay.classList.remove('overlay-hidden');
    return;
  }

  const accuracyNum = sv.accuracy || (
    (sv.hits + sv.misses) > 0
      ? (sv.hits / (sv.hits + sv.misses)) * 100
      : 0
  );
  const accuracy = accuracyNum.toFixed(1);
  const avgScorePerHit = sv.hits > 0
    ? (sv.score / sv.hits).toFixed(2)
    : '0.00';

  const lvlDef  = levels[sv.levelKey];
  const lvlName = (lvlDef && lvlDef.name) ? lvlDef.name : sv.levelKey;

  const statsHtml = `
    <p><em>Přehrál se uložený vizuál – nejde o nový run.</em></p>
    <p>
      Level: <strong>${lvlName}</strong><br>
      Kapek v patternu: <strong>${sv.totalScheduled}</strong><br>
      Zásahy: <strong>${sv.hits}</strong><br>
      Minuté: <strong>${sv.misses}</strong><br>
      Úspěšnost: <strong>${accuracy}%</strong><br>
      Celkové skóre: <strong>${sv.score}</strong><br>
      Průměrné body za zásah: <strong>${avgScorePerHit}</strong>
    </p>
  `;

  statsEl.innerHTML      = statsHtml;
  resultStatsEl.innerHTML = statsHtml;
  resultOverlay.classList.remove('overlay-hidden');

  // po replay vrátit duši/kurzor + původní nastavení
  if (soulWrapper) soulWrapper.style.display = '';
  if (cursorLight) cursorLight.style.display = '';
  restoreVisualSettingsAfterReplay();
}

// ----------------------------- GAME LOOP -----------------------

function gameLoop() {
  const now = performance.now();
  if (!lastFrameTime) lastFrameTime = now;
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (levelRunning && bubbles.length > 0) {
    const stillAlive = [];
    const rectWorld = world.getBoundingClientRect();

    for (const b of bubbles) {
      if (b.hit || b.missed) continue;

      b.ageSec += dt;

      b.xPercent -= b.speedPercentPerSec * dt;
      const wave  = b.waveAmp * Math.sin(b.ageSec * b.waveFreq);
      b.yPercent  = b.baseY + wave;

      if (b.yPercent < 20) b.yPercent = 20;
      if (b.yPercent > 80) b.yPercent = 80;

      b.el.style.left = b.xPercent + '%';
      b.el.style.top  = b.yPercent + '%';

      if (isReplayingVisual) {
        // REPLAY MÓD – automatické “popnutí” bublin uprostřed
        const centerThreshold = (BUBBLE_START_X + BUBBLE_END_X) / 2;
        if (b.xPercent <= centerThreshold) {
          const rectBubble = b.el.getBoundingClientRect();
          const centerX = rectBubble.left + rectBubble.width  / 2;
          const centerY = rectBubble.top  + rectBubble.height / 2;

          spawnBubbleFragments(b);
          spawnColorBurst(centerX, centerY, 1.0);

          if (b.el.parentNode) b.el.parentNode.removeChild(b.el);
          b.hit = true;
          replayPopped++;

          // i v replay chceme stejné flashe jako při hraní
          comboStreak++;
          if (comboStreak > 0 && comboStreak % 5 === 0) {
            triggerComboFlash(comboStreak / 5);
          }

          const progress = totalScheduled > 0
            ? replayPopped / totalScheduled
            : 0;
          updateBackgroundProgress(progress);

          continue;
        }
      } else {
        // Normální hra – miss, když doletí na konec
        if (b.xPercent <= BUBBLE_END_X) {
          b.missed = true;
          if (b.el.parentNode) b.el.parentNode.removeChild(b.el);
          registerMiss();
          continue;
        }
      }

      stillAlive.push(b);
    }
    bubbles = stillAlive;
  }

  // šplouchání → zásah bublin (jen ve hře, ne v replay)
  if (!isReplayingVisual) {
    activeSplashes = activeSplashes.filter(s => {
      const age = now - s.createdAt;
      if (age > s.lifeMs) return false;

      if (levelRunning && !s.used && bubbles.length > 0) {
        for (const b of bubbles) {
          if (b.hit || b.missed) continue;

          const rectBubble = b.el.getBoundingClientRect();
          const bx = rectBubble.left + rectBubble.width  / 2;
          const by = rectBubble.top  + rectBubble.height / 2;
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
  } else {
    // v replay módu splashy jen vizuálně dožijí
    activeSplashes = activeSplashes.filter(s => {
      const age = now - s.createdAt;
      return age <= s.lifeMs;
    });
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// -------------------------- ZÁSAH BUBLINY ----------------------

function handleBubbleHit(bubbleObj, isSuper, clickX, clickY) {
  if (!levelRunning) return;
  if (!bubbleObj || bubbleObj.hit || bubbleObj.missed) return;
  if (isReplayingVisual) return; // v replay módu nepočítáme score ani zásahy

  hits++;
  comboStreak++;

  const rectWorld  = world.getBoundingClientRect();
  const rectBubble = bubbleObj.el.getBoundingClientRect();
  const centerX = rectBubble.left + rectBubble.width  / 2;
  const centerY = rectBubble.top  + rectBubble.height / 2;
  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top)  / rectWorld.height) * 100;

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

  if (playerState && playerState.ambients && playerState.ambients.glow !== false) {
    soul.classList.add('soul-grow', 'soul-flash');
  } else {
    soul.classList.add('soul-grow');
  }

  updateSoulVisual();
  addSoulParticle();

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

  if (comboStreak > 0 && comboStreak % 5 === 0) {
    const tier = Math.floor(comboStreak / 5);
    const comboBonus = 10;
    gained += comboBonus;
    score += gained;
    updateScoreHud();
    triggerComboFlash(tier);
    showComboPopup(comboStreak, comboBonus);
  } else {
    score += gained;
    updateScoreHud();
  }

  statusText.textContent =
    `Zásah: +${gained} (čas +${timingBonus}, přesnost +${precisionBonus})`;
  showFloatingScore('+' + gained, soulX, soulY - 6);

  const progress = totalScheduled > 0 ? hits / totalScheduled : 0;
  updateBackgroundProgress(progress);

  if (hits >= totalScheduled) {
    music.pause();
    endLevel('Odklikal jsi všechny kapky! 🎉');
  }
}

function showComboPopup(comboValue, bonus) {
  const popup = document.createElement('div');
  popup.className = 'combo-popup';
  popup.innerHTML = `COMBO <span>x${comboValue}</span> +${bonus}`;
  world.appendChild(popup);

  setTimeout(() => {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 900);
}

// ----------------------- KLIK DO SVĚTA ------------------------

function handleClickAt(clientX, clientY) {
  if (!levelRunning) return;
  if (isReplayingVisual) return; // v režimu přehrání vizuálu ignorujeme kliky
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
    comboStreak = 0; // klik mimo
  }
}

world.addEventListener('pointerdown', e => {
  handleClickAt(e.clientX, e.clientY);
});

// ---------------------- CUSTOM CURSOR LIGHT --------------------

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

// ------------------------- MENU / UI ---------------------------

function setMenuActive(which) {
  menuNewGame.classList.toggle('active', which === 'new');
  menuLevels.classList.toggle('active', which === 'levels');
  if (menuPlayer) {
    menuPlayer.classList.toggle('active', which === 'player');
  }
  menuHowTo.classList.toggle('active', which === 'how');

  menuSections.forEach(section => {
    const isActive = section.dataset.section === which;
    section.classList.toggle('menu-section-active', isActive);
  });
}

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

if (playMajakFromMenu) {
  playMajakFromMenu.addEventListener('click', () => {
    goToLevel('majak');
  });
}

function showMenuScreen() {
  music.pause();
  menuScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  levelIntroOverlay.classList.add('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');

  // opustili jsme režim přehrávání vizuálu – vrátit duši a kurzor
  isReplayingVisual = false;
  currentReplayVisual = null;
  replayWaitingForMetadata = false;
  replayPopped = 0;
  if (soulWrapper) soulWrapper.style.display = '';
  if (cursorLight) cursorLight.style.display = '';
}

function showLevelIntro() {
  levelIntroOverlay.classList.remove('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');
}

function goToLevel(key) {
  if (!levels[key]) return;

  if (!isLevelUnlocked(key)) {
    alert('Tento level je zatím zamčený.');
    return;
  }

  isReplayingVisual = false;
  currentReplayVisual = null;
  replayWaitingForMetadata = false;
  replayPopped = 0;
  if (soulWrapper) soulWrapper.style.display = '';
  if (cursorLight) cursorLight.style.display = '';

  setCurrentLevel(key);
  resetLevelState();
  // pokud je něco aktivní bez nabití (např. po reloadu), vypneme to
if (sanitizeActiveEffects()) {
  savePlayerState();
}
  menuScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  showLevelIntro();
}

// Level karty
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

// HRÁČ – UI helpery
function updateCurrencyUI() {
  if (!currencyValueEl) return;
  const val = Number.isFinite(playerState.currency) ? playerState.currency : 0;
  currencyValueEl.textContent = val + ' ✦';
}

function refreshPlayerSettingsUI() {
  // 1) Oprava případných expirovaných aktivních efektů
  const changed = sanitizeActiveEffects();
  if (changed) {
    // nevolej savePlayerState() tady (jinak recursion); změny se dorovnají při dalších save
  }

  // 2) Stav efektů do karet (charges, aktivní badge, disable tlačítek)
  document.querySelectorAll('[data-charges-for]').forEach(el => {
    const id = el.dataset.chargesFor;
    const e = EFFECTS[id];
    if (!e) return;
    if (!e.paid) {
      el.textContent = 'ZDARMA';
      return;
    }
    el.textContent = getCharges(id) + '/' + EFFECT_MAX_CHARGES;
  });

  document.querySelectorAll('[data-active-for]').forEach(el => {
    const id = el.dataset.activeFor;
    const e = EFFECTS[id];
    if (!e) return;

    const active = isEffectActive(id);
    if (e.paid) {
      el.textContent = active ? 'AKTIVNÍ' : 'NEAKTIVNÍ';
      el.classList.toggle('is-active', active);
    } else {
      // u free efektů necháme badge spíš neutrální, ale zvýrazníme aktivní
      el.textContent = active ? 'AKTIVNÍ' : '—';
      el.classList.toggle('is-active', active);
    }
  });

  document.querySelectorAll('[data-buy]').forEach(btn => {
    const id = btn.dataset.buy;
    const e = EFFECTS[id];
    if (!e) return;

    if (!e.paid) {
      btn.disabled = true;
      return;
    }

    const c = getCharges(id);
    btn.disabled = c >= EFFECT_MAX_CHARGES;
    btn.textContent = (c >= EFFECT_MAX_CHARGES)
      ? 'Nabito (3/3)'
      : ('Koupit +1 (' + EFFECT_CHARGE_PRICE + ' ✦)');
  });

  document.querySelectorAll('[data-activate]').forEach(btn => {
    const id = btn.dataset.activate;
    const e = EFFECTS[id];
    if (!e) return;

    const active = isEffectActive(id);
    const canActivate = (!e.paid) ? true : (getCharges(id) > 0);

    // pokud není aktivní a nemá nabití → disable
    btn.disabled = (!active && !canActivate);

    // text
    if (e.kind === 'ambient') {
      btn.textContent = active ? 'Vypnout' : (e.paid ? 'Aktivovat' : 'Přepnout');
    } else {
      btn.textContent = active ? 'Aktivní' : 'Aktivovat';
    }

    // u flash tlačítek "Aktivní" necháme disabled, aby to bylo jasné
    if (e.kind === 'flash' && active) {
      btn.disabled = true;
    }
  });

  // 3) Saved visual (ponecháno)
  if (!savedVisualText || !replaySavedVisualBtn || !clearSavedVisualBtn) return;

  const sv = playerState.savedVisual;
  if (!sv) {
    savedVisualText.textContent =
      'Zatím nemáš uložený žádný vizuál z dohraného levelu.';
    replaySavedVisualBtn.disabled = true;
    clearSavedVisualBtn.disabled  = true;
    return;
  }

  const lvlDef  = levels[sv.levelKey];
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


// Uložení nastavení hráče (placené, dočasné)
if (savePlayerSettingsBtn) {
  savePlayerSettingsBtn.addEventListener('click', () => {
    if (!flashEffectSelect ||
        !ambientGlowCheckbox ||
        !ambientShockwaveCheckbox ||
        !ambientParticlesCheckbox ||
        !ambientSaturateCheckbox) {
      return;
    }

    // 1) Co chce hráč nově
    const desiredFlash = flashEffectSelect.value || 'classic';
    const desiredAmb = {
      glow: ambientGlowCheckbox.checked,
      shockwave: ambientShockwaveCheckbox.checked,
      particles: ambientParticlesCheckbox.checked,
      saturate: ambientSaturateCheckbox.checked
    };

    // 2) Co je aktuálně uloženo
    const currentFlash = playerState.flashEffect || 'classic';
    const currentAmb   = playerState.ambients || {};

    const changed =
      desiredFlash !== currentFlash ||
      desiredAmb.glow !== (currentAmb.glow !== false) ||
      desiredAmb.shockwave !== (currentAmb.shockwave !== false) ||
      desiredAmb.particles !== (currentAmb.particles !== false) ||
      !!desiredAmb.saturate !== !!currentAmb.saturate;

    if (!changed) {
      if (playerSettingsStatus) {
        playerSettingsStatus.textContent = 'Nastavení beze změny.';
        setTimeout(() => {
          if (playerSettingsStatus.textContent === 'Nastavení beze změny.') {
            playerSettingsStatus.textContent = '';
          }
        }, 1800);
      }
      return;
    }

    // 3) Bude nové nastavení "default" nebo "speciální"?
    const willBeDefault = isDefaultVisualSettings({
      flashEffect: desiredFlash,
      ambients: desiredAmb
    });

    // 3A) Přepnutí na default → ZDARMA, jen reset a hotovo
    if (willBeDefault) {
      playerState.flashEffect = 'classic';
      playerState.ambients = {
        glow: true,
        shockwave: true,
        particles: true,
        saturate: false
      };
      playerState.visualBoostsLeft = 0;
      savePlayerState();
      refreshPlayerSettingsUI();

      if (playerSettingsStatus) {
        playerSettingsStatus.textContent =
          'Vizuální nastavení vráceno na základní (zdarma).';
        setTimeout(() => {
          if (playerSettingsStatus.textContent ===
              'Vizuální nastavení vráceno na základní (zdarma).') {
            playerSettingsStatus.textContent = '';
          }
        }, 3000);
      }
      return;
    }
    // ---------------------- UI: efekty (preview / buy / activate) ----------------------

let selectedPreviewEffectId = 'flash_classic';

function selectEffectForPreview(effectId) {
  if (!EFFECTS[effectId]) return;
  selectedPreviewEffectId = effectId;

  if (effectPreviewNameEl) {
    effectPreviewNameEl.textContent = EFFECTS[effectId].label || effectId;
  }
}

function playPreview(effectId) {
  const e = EFFECTS[effectId];
  if (!e) return;

  // reset animací
  if (previewFlash) {
    previewFlash.classList.remove('play', 'fx-soft', 'fx-strong', 'fx-mono');
    void previewFlash.offsetWidth;
  }
  if (previewBurst) {
    previewBurst.classList.remove('play');
    void previewBurst.offsetWidth;
  }
  if (previewSoul) {
    previewSoul.classList.remove('play-glow');
    void previewSoul.offsetWidth;
  }
  const worldEl = previewFlash ? previewFlash.closest('.preview-world') : null;
  if (worldEl) {
    worldEl.classList.remove('play-saturate');
    void worldEl.offsetWidth;
  }

  // přehrání dle typu
  if (e.kind === 'flash') {
    if (!previewFlash) return;

    if (e.value === 'soft')   previewFlash.classList.add('play', 'fx-soft');
    if (e.value === 'strong') previewFlash.classList.add('play', 'fx-strong');
    if (e.value === 'mono')   previewFlash.classList.add('play', 'fx-mono');
    if (e.value === 'classic') previewFlash.classList.add('play', 'fx-soft'); // classic ukážeme jako soft vibe
    if (e.value === 'off') {
      // nic – jen krátké "ticho"
    }
  }

  if (e.kind === 'ambient') {
    if (e.key === 'shockwave' && previewBurst) previewBurst.classList.add('play');
    if (e.key === 'glow' && previewSoul) previewSoul.classList.add('play-glow');
    if (e.key === 'saturate' && worldEl) worldEl.classList.add('play-saturate');
    if (e.key === 'particles') {
      // částice jen symbolicky: krátký burst + glow
      if (previewBurst) previewBurst.classList.add('play');
      if (previewSoul) previewSoul.classList.add('play-glow');
    }
  }
}

// Clicky na kartách
document.querySelectorAll('[data-preview]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.preview;
    selectEffectForPreview(id);
    playPreview(id);
  });
});

document.querySelectorAll('[data-buy]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.buy;
    buyEffectCharge(id);
    refreshPlayerSettingsUI();
  });
});

document.querySelectorAll('[data-activate]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.activate;
    const e = EFFECTS[id];
    if (!e) return;

    // ambienty jsou toggle
    if (e.kind === 'ambient') {
      if (isEffectActive(id)) {
        deactivateEffect(id);
        savePlayerState();
        refreshPlayerSettingsUI();
        return;
      }
      const res = activateEffect(id);
      if (!res.ok) {
        if (playerSettingsStatus) playerSettingsStatus.textContent = res.msg || '';
        return;
      }
      savePlayerState();
      refreshPlayerSettingsUI();
      return;
    }

    // flash: přepíná se vždy na daný styl
    const res = activateEffect(id);
    if (!res.ok) {
      if (playerSettingsStatus) playerSettingsStatus.textContent = res.msg || '';
      return;
    }
    savePlayerState();
    refreshPlayerSettingsUI();
  });
});

if (previewPlayBtn) {
  previewPlayBtn.addEventListener('click', () => {
    playPreview(selectedPreviewEffectId);
  });
}


    // 3B) Ne-default → je to "boost balíček" na X her, musí stát měnu
    const price = VISUAL_SETTINGS_PRICE;
    if (playerState.currency < price) {
      alert(
        'Nemáš dost měny na nové vizuální nastavení.\n' +
        'Cena balíčku efektů je ' + price + ' ✦.'
      );
      return;
    }

    const ok = confirm(
      'Koupit toto vizuální nastavení (flashe / ambienty) za ' +
      price + ' ✦?\n' +
      'Nastavení bude platit pro ' + VISUAL_SETTINGS_RUNS_COUNT +
      ' dohrané hry.'
    );
    if (!ok) return;

    if (!spendCurrency(price)) {
      alert('Platba se nepodařila.');
      return;
    }

    // zaplatil → uložíme nové efekty + nabíjíme charge na X her
    playerState.flashEffect = desiredFlash;
    playerState.ambients = {
      glow: !!desiredAmb.glow,
      shockwave: !!desiredAmb.shockwave,
      particles: !!desiredAmb.particles,
      saturate: !!desiredAmb.saturate
    };
    playerState.visualBoostsLeft = VISUAL_SETTINGS_RUNS_COUNT;
    savePlayerState();
    refreshPlayerSettingsUI();

    if (playerSettingsStatus) {
      playerSettingsStatus.textContent =
        'Vizuální nastavení aktivováno. Zbývají ' +
        playerState.visualBoostsLeft + ' dohrané hry.';
      setTimeout(() => {
        if (playerSettingsStatus.textContent.startsWith('Vizuální nastavení aktivováno')) {
          playerSettingsStatus.textContent = '';
        }
      }, 4000);
    }
  });
}


// ----------------- PŘEHRÁNÍ ULOŽENÉHO VIZUÁLU ------------------

function startReplayFromSaved() {
  if (!currentReplayVisual) return;

  resetLevelState();            // vynuluj herní stav (ale duše se skryje viz níž)
  replayPopped = 0;

  // v replay módu duši a kurzor schováme
  if (soulWrapper) soulWrapper.style.display = 'none';
  if (cursorLight) cursorLight.style.display = 'none';

  levelIntroOverlay.classList.add('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');

  resetScrollTrackAnimation();
  updateBackgroundProgress(0);

  if (!pattern.length || totalScheduled === 0) {
    buildPatternForMusic();
  }

  levelRunning = true;
  statusText.textContent = 'Přehrávání uloženého vizuálu…';

  restartBtn.disabled   = true;
  startBtn.disabled     = true;
  playAgainBtn.disabled = true;

  music.currentTime = 0;
  music.play();

  schedulePattern(true); // isReplay = true
}


function applySavedVisualSettingsForReplay(sv) {
  // uloží původní nastavení, aby se po replay vrátilo
  replayVisualSettingsBackup = {
    flashEffect: playerState.flashEffect,
    ambients: playerState.ambients
  };

  if (sv && sv.flashEffect) {
    playerState.flashEffect = sv.flashEffect;
  }
  if (sv && sv.ambients) {
    playerState.ambients = {
      glow: sv.ambients.glow !== false,
      shockwave: sv.ambients.shockwave !== false,
      particles: sv.ambients.particles !== false,
      saturate: !!sv.ambients.saturate
    };
  }
}

function restoreVisualSettingsAfterReplay() {
  if (!replayVisualSettingsBackup) return;
  playerState.flashEffect = replayVisualSettingsBackup.flashEffect || 'classic';
  playerState.ambients = replayVisualSettingsBackup.ambients || {
    glow: true,
    shockwave: true,
    particles: true,
    saturate: false
  };
  replayVisualSettingsBackup = null;
}
function replaySavedVisual() {
  const sv = playerState.savedVisual;
  if (!sv) return;

  if (!isLevelUnlocked(sv.levelKey)) {
    alert('Level uloženého vizuálu je zatím zamčený.');
    return;
  }


  currentReplayVisual = sv;
  isReplayingVisual = true;
  replayWaitingForMetadata = false;
  replayPopped = 0;
  // REPLAY má být vizuálně stejný jako v době uložení – dočasně přepneme nastavení
  replaySettingsBackup = {
    flashEffect: playerState.flashEffect,
    ambients: playerState.ambients
  };
  if (sv.flashEffect) playerState.flashEffect = sv.flashEffect;
  if (sv.ambients) playerState.ambients = sv.ambients;


  setCurrentLevel(sv.levelKey);

  menuScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  levelIntroOverlay.classList.add('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');

  // pokud už má hudba načtenou délku, můžeme začít hned
  if (isFinite(music.duration) && music.duration > 0) {
    startReplayFromSaved();
  } else {
    replayWaitingForMetadata = true;
  }
}

// Uložený vizuál – ovládání
if (replaySavedVisualBtn) {
  replaySavedVisualBtn.addEventListener('click', () => {
    replaySavedVisual();
  });
}

if (clearSavedVisualBtn) {
  clearSavedVisualBtn.addEventListener('click', () => {
    const ok = confirm('Opravdu chceš smazat uložený vizuál?');
    if (!ok) return;
    clearSavedVisual();
  });
}

if (saveVisualBtn) {
  saveVisualBtn.addEventListener('click', () => {
    if (!lastRunSummary) return;

    const price = VISUAL_SAVE_PRICE;

    if (playerState.currency < price) {
      alert('Nemáš dost měny. Uložení vizuálu stojí ' + price + ' ✦.');
      return;
    }

    const hasSaved = !!playerState.savedVisual;
    const ok = confirm(
      (hasSaved ? 'Přepsat uložený vizuál' : 'Uložit tento vizuál') +
      ' za ' + price + ' ✦?'
    );
    if (!ok) return;

    if (!spendCurrency(price)) {
      alert('Platba se nepodařila.');
      return;
    }

    saveCurrentRunAsVisual();
    alert(hasSaved ? 'Vizuál byl přepsán.' : 'Vizuál byl uložen.');
  });
}

// Herní ovládání
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

// --------------------------- START LEVEL -----------------------

function startLevel() {
  // pokud jsme byli v režimu přehrávání vizuálu → vrátit do normálu
  if (isReplayingVisual) {
    isReplayingVisual = false;
    currentReplayVisual = null;
    replayWaitingForMetadata = false;
    replayPopped = 0;
    if (soulWrapper) soulWrapper.style.display = '';
    if (cursorLight) cursorLight.style.display = '';
  }

  resetLevelState();
  levelIntroOverlay.classList.add('overlay-hidden');
  resultOverlay.classList.add('overlay-hidden');
  resetScrollTrackAnimation();

  if (!pattern.length || totalScheduled === 0) {
    buildPatternForMusic();
  }

  levelRunning = true;
  statusText.textContent = 'Level běží – klikej na kapky rytmicky.';

  restartBtn.disabled   = true;
  playAgainBtn.disabled = true;
  startBtn.disabled     = true;

  music.currentTime = 0;
  music.play();

  schedulePattern(false);
}

// -------------------------- HUDBA / TIMELINE -------------------

music.addEventListener('loadedmetadata', () => {
  const durationSec = music.duration;

  timeInfo.style.setProperty('--progress', 0);

  if (!isFinite(durationSec) || durationSec <= 0) {
    startBtn.disabled   = false;
    restartBtn.disabled = false;
    pattern        = createPattern(20, BUBBLE_INTERVAL_SEC);
    totalScheduled = pattern.length;
    return;
  }

  buildPatternForMusic();
  startBtn.disabled   = false;
  restartBtn.disabled = false;

  // pokud čekáme na metadata pro replay uloženého vizuálu – spustíme ho
  if (isReplayingVisual && currentReplayVisual && replayWaitingForMetadata) {
    replayWaitingForMetadata = false;
    startReplayFromSaved();
  }
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
  if (levelRunning && !isReplayingVisual) {
    statusText.textContent = 'Hudba skončila, kapky ještě dobíhají.';
  }
});

// ----------------------- Background image status ----------------

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

// ------------------------ INITIALIZACE -------------------------

updateBackgroundProgress(0);
resetSoul();
setCurrentLevel('majak');
showMenuScreen();

updateCurrencyUI();
refreshPlayerSettingsUI();
refreshLevelsUI();
