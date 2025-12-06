const menuSections = document.querySelectorAll('.menu-section');

function setMenuActive(which) {
  // aktivní záložky vlevo
  menuNewGame.classList.toggle('active', which === 'new');
  menuLevels.classList.toggle('active', which === 'levels');
  menuHowTo.classList.toggle('active', which === 'how');

  // přepínání sekcí vpravo
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

menuHowTo.addEventListener('click', () => {
  setMenuActive('how');
});

playMajakFromMenu.addEventListener('click', () => {
  goToLevel('majak');
});

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

const playPauseBtn = document.getElementById('playPauseBtn');
/* -------------------------------------------------
   PLAY / PAUSE tlačítko
-------------------------------------------------- */

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
// inicializace hry
updateBackgroundProgress(0);
resetSoul();
setCurrentLevel('majak');
showMenuScreen();
