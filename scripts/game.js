// Pro jistotu: všechny buttony a odkazy bez kurzoru
window.addEventListener('load', () => {
  document.querySelectorAll('button, a, [role="button"], .btn')
    .forEach(el => {
      el.style.cursor = 'none';
    });
  document.body.style.cursor = 'none';
});

const lightningOverlay = document.getElementById('lightningOverlay');
// Zákaz přetahování obrázků (ghost image při drag & drop)
document.addEventListener('dragstart', function (e) {
  e.preventDefault();
});
function updateScoreHud() {
  scoreInfo.textContent = 'Skóre: ' + score;
}

function updateSoulVisual() {
  // detekce typu pointeru – jestli je dostupná „jemná“ myš
  const hasFinePointer =
    window.matchMedia &&
    window.matchMedia('(any-pointer: fine)').matches;

  // na zařízeních bez myši (mobil / tablet) uděláme duši menší
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
    if (extraSoulParticles >= MAX_EXTRA_PARTICLES) return;

    const dot = document.createElement('div');
    dot.className = 'soul-extra-particle';

    // náhodná pozice na kružnici okolo jádra
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

function loadLevelAssets() {
  const lvl = levels[currentLevelKey];
  if (!lvl) return;
  scrollTrack.style.opacity = 0;
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

  const window = durationSec - startOffset - endReserve - BASE_TRAVEL_TIME_SEC;
  if (window <= 0) {
    pattern = createPattern(20, BUBBLE_INTERVAL_SEC);
    totalScheduled = pattern.length;
    return;
  }

  const avgInterval = (startInterval + endInterval) / 2;
  let count = Math.floor(window / avgInterval);
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

function updateBackgroundProgress(progress) {
  const p = Math.max(0, Math.min(1, progress));
  let opacity, grayscale;

  if (p < 0.5) {
    const phase = p / 0.5;
    opacity = 0.1 + 0.9 * phase;
    grayscale = 1;
  } else {
    const phase = (p - 0.5) / 0.5;
    opacity = 1;
    grayscale = 1 - phase;
  }

  scrollTrack.style.opacity = opacity;
  scrollTrack.style.filter = `grayscale(${grayscale})`;
}

function registerMiss() {
  if (!levelRunning) return;

  misses++;
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
  hits = 0;
  misses = 0;
  gameOverBySoul = false;
  score = 0;
  updateScoreHud();
  statsEl.textContent = '';
  statusText.textContent = '';

  lastFrameTime = 0;
  resetSoul();
}

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
  setCurrentLevel(key);
  resetLevelState();
  menuScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  showLevelIntro();
}

function endLevel(reason = 'Level je u konce.') {
  if (!levelRunning) return;
  levelRunning = false;
  clearAllSpawnTimers();
  clearAllSplashes();
  clearAllBubbles();

  statusText.textContent = reason;

  const totalEvents = hits + misses;
  const effectiveShown = shownBubbles;
  const accuracy = totalEvents > 0 ? (hits / totalEvents * 100).toFixed(1) : 0;
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

function createSplashColor(clientX, clientY, isSuper) {
  if (!world) return;

  const worldRect = world.getBoundingClientRect();
  const patchSize = isSuper ? 180 : 110; // větší pro super hit

  const patch = document.createElement('div');
  patch.className = 'world-splash-color';
  if (isSuper) patch.classList.add('world-splash-color-super');

  // pozice v procentech vzhledem k WORLD
  const xPercent = ((clientX - worldRect.left) / worldRect.width) * 100;
  const yPercent = ((clientY - worldRect.top)  / worldRect.height) * 100;

  patch.style.left  = xPercent + '%';
  patch.style.top   = yPercent + '%';
  patch.style.width  = patchSize + 'px';
  patch.style.height = patchSize + 'px';

  // pozadí bereme z posouvajícího se obrázku (bgImage1 / bgImage2)
  let srcImg = null;
  const imgCandidates = [bgImage1, bgImage2].filter(Boolean);

  for (const img of imgCandidates) {
    const r = img.getBoundingClientRect();
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      srcImg = img;
      break;
    }
  }

  // fallback – kdyby click byl mimo, vezmeme první obrázek
  if (!srcImg && imgCandidates.length > 0) {
    srcImg = imgCandidates[0];
  }

  if (srcImg && srcImg.src) {
    const imgRect = srcImg.getBoundingClientRect();

    patch.style.backgroundImage  = `url('${srcImg.src}')`;
    patch.style.backgroundRepeat = 'no-repeat';
    patch.style.backgroundSize   = imgRect.width + 'px ' + imgRect.height + 'px';

    const imgX = clientX - imgRect.left;
    const imgY = clientY - imgRect.top;

    const bgPosX = imgX - patchSize / 2;
    const bgPosY = imgY - patchSize / 2;

    patch.style.backgroundPosition = `-${bgPosX}px -${bgPosY}px`;
  }

  world.appendChild(patch);

  setTimeout(() => {
    if (patch.parentNode) patch.parentNode.removeChild(patch);
  }, isSuper ? 550 : 420);
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
function createSplashColor(clientX, clientY, isSuper) {
  if (!world) return;

  const worldRect = world.getBoundingClientRect();
  const patchSize = isSuper ? 180 : 110; // super hit je o něco větší

  const patch = document.createElement('div');
  patch.className = 'splash-color';
  if (isSuper) patch.classList.add('splash-color-super');

  // pozice v % v rámci WORLD – stejně jako šplouch
  const xPercent = ((clientX - worldRect.left) / worldRect.width) * 100;
  const yPercent = ((clientY - worldRect.top)  / worldRect.height) * 100;

  patch.style.left  = xPercent + '%';
  patch.style.top   = yPercent + '%';
  patch.style.width  = patchSize + 'px';
  patch.style.height = patchSize + 'px';

  // zjistíme, přes který z obrázků jsme reálně klikli (bgImage1 / bgImage2)
  let srcImg = null;
  const imgCandidates = [bgImage1, bgImage2].filter(Boolean);

  for (const img of imgCandidates) {
    const r = img.getBoundingClientRect();
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      srcImg = img;
      break;
    }
  }

  // fallback – když klikneš mimo, vezmeme prostě první obrázek
  if (!srcImg && imgCandidates.length > 0) {
    srcImg = imgCandidates[0];
  }

  if (srcImg && srcImg.src) {
    const imgRect = srcImg.getBoundingClientRect();

    patch.style.backgroundImage  = `url('${srcImg.src}')`;
    patch.style.backgroundRepeat = 'no-repeat';
    patch.style.backgroundSize   = imgRect.width + 'px ' + imgRect.height + 'px';

    // souřadnice kliknutí vůči samotnému obrázku
    const imgX = clientX - imgRect.left;
    const imgY = clientY - imgRect.top;

    // zarovnání výřezu tak, aby střed odpovídal místu kliknutí
    const bgPosX = imgX - patchSize / 2;
    const bgPosY = imgY - patchSize / 2;

    patch.style.backgroundPosition = `-${bgPosX}px -${bgPosY}px`;
  }

  world.appendChild(patch);

  // jemné rozplynutí – krátké, aby nerušilo pohyb pozadí
  setTimeout(() => {
    if (patch.parentNode) patch.parentNode.removeChild(patch);
  }, isSuper ? 550 : 420);
}

function createSplashAtClient(clientX, clientY, isSuper) {
  if (!world) return;

  const rect = world.getBoundingClientRect();
  const xPercent = ((clientX - rect.left) / rect.width) * 100;
  const yPercent = ((clientY - rect.top)  / rect.height) * 100;

  // kruhové vlnky – „šplouch“
  const splash = document.createElement('div');
  splash.className = 'splash';
  if (isSuper) {
    splash.classList.add('splash-super', 'splash-hit');
  }
  splash.style.left = xPercent + '%';
  splash.style.top  = yPercent + '%';
  world.appendChild(splash);

  // *** tady přidáme barevný výřez obrázku přesně v místě kliku ***
  createSplashColor(clientX, clientY, isSuper);

  const createdAt = performance.now();
  const lifeMs = isSuper ? 550 : 450;
  const maxRadius = isSuper ? 180 : 110;

  // tohle používá gameLoop pro „vlnu“, která může trefit bublinu
  activeSplashes.push({
    el: splash,
    createdAt,
    lifeMs,
    xPx: clientX,
    yPx: clientY,
    maxRadius,
    isSuper,
    used: false
  });

  setTimeout(() => {
    if (splash.parentNode) splash.parentNode.removeChild(splash);
  }, lifeMs + 50);
}



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

function handleBubbleHit(bubbleObj, isSuper, clickX, clickY) {
  if (!levelRunning) return;
  if (!bubbleObj || bubbleObj.hit || bubbleObj.missed) return;

  hits++;

  const rectWorld  = world.getBoundingClientRect();
  const rectBubble = bubbleObj.el.getBoundingClientRect();
  const centerX = rectBubble.left + rectBubble.width / 2;
  const centerY = rectBubble.top + rectBubble.height / 2;
  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top) / rectWorld.height) * 100;

  function spawnBubbleFragments(bubbleObj) {
  if (!world || !bubbleObj || !bubbleObj.el) return;

  const rectWorld  = world.getBoundingClientRect();
  const rectBubble = bubbleObj.el.getBoundingClientRect();
  const centerX = rectBubble.left + rectBubble.width / 2;
  const centerY = rectBubble.top + rectBubble.height / 2;

  const xPercent = ((centerX - rectWorld.left) / rectWorld.width) * 100;
  const yPercent = ((centerY - rectWorld.top) / rectWorld.height) * 100;

  const glow = document.createElement('div');
  glow.className = 'world-bubble-light';
  glow.style.left = xPercent + '%';
  glow.style.top  = yPercent + '%';
  world.appendChild(glow);

  setTimeout(() => {
    if (glow.parentNode) glow.parentNode.removeChild(glow);
  }, 500);
}


  moveSoulTo(xPercent, yPercent);

  const growAmount = SOUL_GROW_PER_HIT * (isSuper ? 1.6 : 1.0);
  soulSize = Math.min(SOUL_MAX_SIZE, soulSize + growAmount);
  soul.classList.remove('soul-grow', 'soul-flash');
  void soul.offsetWidth;
  soul.classList.add('soul-grow', 'soul-flash');
  updateSoulVisual();
      // Přidáme další částici do duše – vizuálně se „naplňuje“
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
  const gained = basePoints + timingBonus + precisionBonus;
  score += gained;
  updateScoreHud();

  statusText.textContent = `Zásah: +${gained} (čas +${timingBonus}, přesnost +${precisionBonus})`;
  showFloatingScore('+' + gained, soulX, soulY - 6);

  const progress = totalScheduled > 0 ? hits / totalScheduled : 0;
  updateBackgroundProgress(progress);

  if (hits >= totalScheduled) {
    music.pause();
    endLevel('Odklikal jsi všechny kapky! 🎉');
  }
}
function createSplashColor(clientX, clientY, isSuper) {
  if (!world) return;

  const worldRect = world.getBoundingClientRect();
  const patchSize = isSuper ? 180 : 110; // super zásah = větší okno

  const patch = document.createElement('div');
  patch.className = 'splash-color';
  if (isSuper) patch.classList.add('splash-color-super');

  // pozice v procentech v rámci WORLD – stejně jako šplouch
  const xPercent = ((clientX - worldRect.left) / worldRect.width) * 100;
  const yPercent = ((clientY - worldRect.top)  / worldRect.height) * 100;

  patch.style.left  = xPercent + '%';
  patch.style.top   = yPercent + '%';
  patch.style.width  = patchSize + 'px';
  patch.style.height = patchSize + 'px';

  // vybereme, přes který z pozadí (bgImage1 / bgImage2) jsme klikli
  let srcImg = null;
  const imgCandidates = [bgImage1, bgImage2].filter(Boolean);

  for (const img of imgCandidates) {
    const r = img.getBoundingClientRect();
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      srcImg = img;
      break;
    }
  }

  // fallback – když klikneš mimo obrázek, vezmeme prostě první
  if (!srcImg && imgCandidates.length > 0) {
    srcImg = imgCandidates[0];
  }

  if (srcImg && srcImg.src) {
    const imgRect = srcImg.getBoundingClientRect();

    patch.style.backgroundImage  = `url('${srcImg.src}')`;
    patch.style.backgroundRepeat = 'no-repeat';
    patch.style.backgroundSize   = imgRect.width + 'px ' + imgRect.height + 'px';

    // souřadnice kliknutí vůči samotnému obrázku
    const imgX = clientX - imgRect.left;
    const imgY = clientY - imgRect.top;

    // zarovnání výřezu tak, aby střed odpovídal místu kliknutí
    const bgPosX = imgX - patchSize / 2;
    const bgPosY = imgY - patchSize / 2;

    patch.style.backgroundPosition = `-${bgPosX}px -${bgPosY}px`;
  }

  world.appendChild(patch);

  // jemné rozplynutí – krátké, aby nerušilo pohyb pozadí
  setTimeout(() => {
    if (patch.parentNode) patch.parentNode.removeChild(patch);
  }, isSuper ? 550 : 420);
}

function handleClickAt(clientX, clientY) {
  if (!levelRunning) return;

  let bestBubble = null;
  let bestDist = Infinity;

  for (const b of bubbles) {
    if (b.hit || b.missed) continue;

    const rectBubble = b.el.getBoundingClientRect();
    const bx = rectBubble.left + rectBubble.width / 2;
    const by = rectBubble.top + rectBubble.height / 2;
    const bubbleRadius = rectBubble.width / 2;

    const dx = clientX - bx;
    const dy = clientY - by;
    const dist = Math.hypot(dx, dy);

    if (dist <= bubbleRadius && dist < bestDist) {
      bestDist = dist;
      bestBubble = b;
    }
  }

  const directHit = !!bestBubble;

  // šplouch + barevná výseč vždy – i při missu
  createSplashAtClient(clientX, clientY, directHit);

  if (directHit) {
    // super–hit, protože jsme klikli přímo do bubliny
    handleBubbleHit(bestBubble, true, clientX, clientY);
  }
  // miss – žádná penalizace, jen vizuál
}


  const directHit = !!target;
  const isSuper = directHit;
  createSplashAtClient(clientX, clientY, isSuper);

  if (directHit) {
    handleBubbleHit(target, true, clientX, clientY);
  }


world.addEventListener('pointerdown', (e) => {
  handleClickAt(e.clientX, e.clientY);
});
// === CUSTOM CURSOR LIGHT ===
const cursorLight = document.getElementById('cursorLight');

window.addEventListener('mousemove', (e) => {
  cursorLight.style.left = e.clientX + 'px';
  cursorLight.style.top = e.clientY + 'px';
});

// Záblesk při kliknutí
window.addEventListener('pointerdown', () => {
  cursorLight.classList.add('click');
  setTimeout(() => cursorLight.classList.remove('click'), 120);
});
