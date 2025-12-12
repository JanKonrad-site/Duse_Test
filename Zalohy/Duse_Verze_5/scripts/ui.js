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

    // PAUSE
    if (!music.paused) {
      music.pause();
      levelRunning = false;
      playPauseBtn.textContent = '►';
      statusText.textContent = 'Pauza';
      return;
    }

    // PLAY
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