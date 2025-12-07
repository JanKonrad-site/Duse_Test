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
const timeInfo      = document.getElementById('timeInfo');
const statsEl       = document.getElementById('stats');
const resultStatsEl = document.getElementById('resultStats');
const imageStatus   = document.getElementById('imageStatus');
const scoreInfo     = document.getElementById('scoreInfo');

const world        = document.getElementById('world');
const scrollTrack  = document.getElementById('scrollTrack');
const bgImage1     = document.getElementById('bgImage1');
const bgImage2     = document.getElementById('bgImage2');
const bubbleTemplate = document.getElementById('bubbleTemplate');
const music        = document.getElementById('music');
const soul         = document.getElementById('soul');
const soulWrapper  = document.getElementById('soulWrapper');
 const soulParticlesContainer = document.querySelector('.soul-particles');

const levelIntroOverlay = document.getElementById('levelIntroOverlay');
const resultOverlay     = document.getElementById('resultOverlay');
const currentLevelNameEls = document.querySelectorAll('.current-level-name');

// Konstanta hry
const bubbleTravelTime      = 3200;
const BASE_TRAVEL_TIME_SEC  = bubbleTravelTime / 1000;
const BUBBLE_INTERVAL_SEC   = 2;
const BUBBLE_START_X        = 110;
const BUBBLE_END_X          = -10;

const SOUL_BASE_SIZE       = 80;
const SOUL_MIN_SIZE        = 0.25;
const SOUL_SHRINK_PER_MISS = 0.15;
const SOUL_MAX_SIZE        = 1.4;
const SOUL_GROW_PER_HIT    = SOUL_SHRINK_PER_MISS;
const POP_DURATION         = 220;
const SPLASH_BASE_SIZE     = 80;
 const MAX_EXTRA_PARTICLES = 30;

// Stav duše
let soulSize = 1.0;
let soulX = 25;
let soulY = 60;
let extraSoulParticles = 0;

// Levely
const levels = {
  majak: {
    key: 'majak',
    name: 'Maják',
    image: 'levels/level1/background.jpg', // tady nastav svoji texturu
    music: 'levels/level1/music.mp3',      // a hudbu
    description: 'Noc, moře, vítr a osamělý maják.'
  }
};

let currentLevelKey = 'majak';

// Herní stav
let pattern = [];
let totalScheduled = 0;

let levelRunning = false;
let shownBubbles = 0;
let hits = 0;
let misses = 0;
let gameOverBySoul = false;
let score = 0;

let bubbles = [];
let spawnTimeouts = [];
let endTimeoutId = null;
let lastFrameTime = 0;
let activeSplashes = [];

// COMBO / STREAK
let currentStreak = 0;
let maxStreak = 0;
const comboMilestones = [5, 10, 20, 30];
