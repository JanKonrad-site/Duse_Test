const menuSections = document.querySelectorAll('.menu-section');
const playPauseBtn = document.getElementById('playPauseBtn');

function setMenuActive(which) {
  // aktivní záložky vlevo
  menuNewGame.classList.toggle('active', which === 'new');
  menuLevels.classList.toggle('active', which === 'levels');
  if (menuPlayer) {
    menuPlayer.classList.toggle('active', which === 'player');
  }
  menuHowTo.classList.toggle('active', which === 'how');

  // přepínání sekcí vpravo
  menuSections.forEach(section => {
    const isActive = section.dataset.section === which;
    section.classList.toggle('menu-section-active', isActive);
  });
}

// -------------------------------------------------
// MENU – základní záložky
// -------------------------------------------------
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

playMajakFromMenu.addEventListener('click', () => {
  goToLevel('majak');
});

// -------------------------------------------------
// KONTROLA LEVELŮ V MENU – play / buy tlačítka
// -------------------------------------------------

function refreshLevelsUI() {
  const cards = document.querySelectorAll('.level-card[data-level-key]');
  cards.forEach(card => {
    const key = card.dataset.levelKey;
    if (!key) return;

    const unlocked = isLevelUnlocked(key);
    const playBtn = card.querySelector('.level-play-btn');
    const buyBtn  = card.querySelector('.level-buy-btn');

    if (unlocked) {
      card.classList.remove('level-card-disabled');
      if (playBtn) {
        playBtn.disabled = false;
      }
      if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = 0.4;
      }
    } else {
      if (key === 'majak') {
        // pro jistotu: první level je vždy odemčený
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
      alert('Tento level je zatím zamčený. Zkus nejdřív 100 % v předchozím levelu nebo ho odemknout za měnu.');
      return;
    }
    goToLevel(key);
  });
});

document.querySelectorAll('.level-buy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.levelKey;
    if (!key) return;

    const lvl = levels[key];
    const price = lvl && typeof lvl.unlockPrice === 'number'
      ? lvl.unlockPrice
      : LEVEL_BASE_UNLOCK_PRICE;

    if (isLevelUnlocked(key)) {
      alert('Level je už odemčený.');
      return;
    }

    if (playerState.currency < price) {
      alert(`Nemáš dost měny. Na odemknutí je potřeba ${price} ✦.`);
      return;
    }

    const ok = confirm(`Opravdu chceš odemknout level za ${price} ✦?`);
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
// HRÁČSKÝ PROFIL – UI helpery
// -------------------------------------------------

function updateCurrencyUI() {
  if (!currencyValueEl) return;
  currencyValueEl.textContent = `${playerState.currency} ✦`;
}

function refreshPlayerSettingsUI() {
  if (flashEffectSelect) {
    flashEffectSelect.value = playerState.flashEffect || 'classic';
  }

  if (ambientGlowCheckbox) {
    ambientGlowCheckbox.checked = playerState.ambients?.glow !== false;
  }
  if (ambientShockwaveCheckbox) {
    ambientShockwaveCheckbox.checked = playerState.ambients?.shockwave !== false;
  }
  if (ambientParticlesCheckbox) {
    ambientParticlesCheckbox.checked = playerState.ambients?.particles !== false;
  }
  if (ambientSaturateCheckbox) {
    ambientSaturateCheckbox.checked = !!playerState.ambients?.saturate;
  }

  // uložený vizuál
  if (!savedVisualText || !replaySavedVisualBtn || !clearSavedVisualBtn) return;

  const sv = playerState.savedVisual;
  if (!sv) {
    savedVisualText.textContent = 'Zatím nemáš uložený žádný vizuál z dohraného levelu.';
    replaySavedVisualBtn.disabled = true;
    clearSavedVisualBtn.disabled = true;
    return;
  }

  const lvlName = levels[sv.levelKey]?.name || sv.levelKey;
  const dateStr = sv.savedAt
    ? new Date(sv.savedAt).toLocaleString('cs-CZ')
    : '';

  savedVisualText.textContent =
    `Uložený vizuál z levelu „${lvlName}“, skóre ${sv.score}, přesnost ${sv.accuracy.toFixed ? sv.accuracy.toFixed(1) : sv.accuracy} %. ` +
    (dateStr ? `Uloženo: ${dateStr}.` : '');

  replaySavedVisualBtn.disabled = false;
  clearSavedVisualBtn.disabled = false;
}

// Uložení nastavení hráče z UI
if (savePlayerSettingsBtn) {
  savePlayerSettingsBtn.addEventListener('click', () => {
    if (flashEffectSelect) {
      setFlashEffect(flashEffectSelect.value || 'classic');
    }
    if (ambientGlowCheckbox && ambientShockwaveCheckbox && ambientParticlesCheckbox && ambientSaturateCheckbox) {
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

// Ovládání uloženého vizuálu v menu Hráč
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

    // pokud ještě žádný vizuál není → první uložení zdarma
    if (!playerState.savedVisual) {
      saveCurrentRunAsVisual();
      alert('Vizuál byl uložen.');
      if (playerSettingsStatus) {
        playerSettingsStatus.textContent = 'Vizuál uložen.';
        setTimeout(() => (playerSettingsStatus.textContent = ''), 1800);
      }
      return;
    }

    // přepis vizuálu: stojí VISUAL_SAVE_PRICE
    const price = VISUAL_SAVE_PRICE;
    if (playerState.currency < price) {
      alert(`Nemáš dost měny. Přepsání vizuálu stojí ${price} ✦.`);
      return;
    }

    const ok = confirm(`Přepsat uložený vizuál za ${price} ✦?`);
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
  // pouze restartuje level, menu screen zůstává schovaný
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

/* -------------------------------------------------
   Hudba – načtení, timeline, dohrání
-------------------------------------------------- */

music.addEventListener('loadedmetadata', () => {
  const durationSec = music.duration;

  // reset timeline na začátek
  timeInfo.style.setProperty('--progress', 0);

  if (!isFinite(durationSec) || durationSec <= 0) {
    // necháme text v #timeInfo tak, jak je v HTML (např. ♪ Maják)
    startBtn.disabled = false;
    restartBtn.disabled = false;
    pattern = createPattern(20, BUBBLE_INTERVAL_SEC);
    totalScheduled = pattern.length;
    return;
  }

  // Vzor bublin stavíme podle reálné délky skladby
  buildPatternForMusic();
  startBtn.disabled = false;
  restartBtn.disabled = false;
});

// Aktualizace timeline podle času skladby
music.addEventListener('timeupdate', () => {
  const durationSec = music.duration;
  if (!isFinite(durationSec) || durationSec <= 0) return;

  let progress = music.currentTime / durationSec;
  if (progress < 0) progress = 0;
  if (progress > 1) progress = 1;

  timeInfo.style.setProperty('--progress', progress);
});

// Po dohrání skladby natvrdo nastavíme progress na 100 %
music.addEventListener('ended', () => {
  timeInfo.style.setProperty('--progress', 1);
  if (levelRunning) {
    statusText.textContent = 'Hudba skončila, kapky ještě dobíhají.';
  }
});

/* -------------------------------------------------
   Background image status
-------------------------------------------------- */

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

/* -------------------------------------------------
   PLAY / PAUSE tlačítko
-------------------------------------------------- */

if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    if (!music.src) return;

    // PAUSE → zastaví hudbu i gameplay
    if (!music.paused) {
      music.pause();
      levelRunning = false; // hra se pozastaví
      playPauseBtn.textContent = '►';
      statusText.textContent = 'Pauza';
      return;
    }

    // PLAY → pokračuje hudba i gameplay
    music.play();
    levelRunning = true;
    playPauseBtn.textContent = '❚❚';
    statusText.textContent = '';
  });
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
