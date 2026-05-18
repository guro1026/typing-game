// =========================
// 設定
// =========================
const GAME_TIME = 60.0;
const TIME_BONUS_PER_WORD = 1.5;
const TIME_PENALTY_MISS = 2.0;

const CSV_PATHS = {
  greeting: "words_easy.csv",
  business: "words_business.csv",
  it: "words_it.csv",
  mail: "words_mail.csv"
};

// =========================
// 状態
// =========================
let currentStageKey = null;
let wordsByStage = {
  greeting: [],
  business: [],
  it: [],
  mail: []
};

let currentWord = null;
let currentRomaji = "";
let currentRomajiIndex = 0;

let score = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let isPlaying = false;
let isInvincible = false;

// 隠しコマンド
let titleKeyBuffer = "";
let titleKeyStartTime = null;
const SECRET_CODE = "keepitreal";
const SECRET_TIME_LIMIT = 10 * 1000;

// =========================
// DOM
// =========================
const titleScreen = document.getElementById("title-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const gameoverScore = document.getElementById("gameover-score");
const gameoverRetry = document.getElementById("gameover-retry");

const playerNameInput = document.getElementById("player-name-input");
const playerNameLabel = document.getElementById("player-name-label");

const stageButtons = document.querySelectorAll(".stage-buttons .btn[data-stage]");
const randomButton = document.getElementById("title-start-random");

const kanjiDisplay = document.getElementById("kanji-display");
const romajiDisplay = document.getElementById("romaji-display");

const scoreLabel = document.getElementById("score-label");
const timeLabel = document.getElementById("time-label");
const timerBar = document.getElementById("timer-bar");

const stageLabel = document.getElementById("stage-label");
const messageLabel = document.getElementById("message");
const retryButton = document.getElementById("retry-button");

const seHit = document.getElementById("se-hit");
const seMiss = document.getElementById("se-miss");

const countdownEl = document.getElementById("countdown");

// =========================
// AudioContext 解放（音が鳴らない対策）
// =========================
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (e) {
    console.warn("Audio unlock failed:", e);
  }

  audioUnlocked = true;
}

document.addEventListener("keydown", unlockAudio, { once: true });
document.addEventListener("mousedown", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });

// =========================
// CSV 読み込み
// =========================
async function loadCsv(path) {
  const res = await fetch(path);
  const text = await res.text();

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 3) continue;

    const kanji = cols[0].trim();
    const romaji = cols[2].trim().toLowerCase(); // CSVローマ字をそのまま使う

    if (!kanji || !romaji) continue;
    result.push({ kanji, romaji });
  }
  return result;
}

async function loadAllCsv() {
  for (const [key, path] of Object.entries(CSV_PATHS)) {
    try {
      wordsByStage[key] = await loadCsv(path);
    } catch (e) {
      console.error("CSV load error:", key, e);
      wordsByStage[key] = [];
    }
  }
}

// =========================
// カウントダウン
// =========================
function startCountdown(stageKey, options = {}) {
  countdownEl.style.display = "flex";
  countdownEl.style.color = "#0ff";
  countdownEl.style.textShadow = "0 0 20px #0ff";

  let count = 3;
  countdownEl.textContent = count;

  let interval = setInterval(() => {
    count--;

    if (count > 0) {
      countdownEl.textContent = count;
    } else if (count === 0) {
      countdownEl.textContent = "GO!";
      countdownEl.style.color = "#0f0";
      countdownEl.style.textShadow = "0 0 30px #0f0";
    } else {
      clearInterval(interval);
      countdownEl.style.display = "none";
      startGame(stageKey, options);
    }
  }, 800);
}

// =========================
// ゲーム制御
// =========================
function resetGameState() {
  score = 0;
  timeLeft = GAME_TIME;
  currentWord = null;
  currentRomaji = "";
  currentRomajiIndex = 0;
  isPlaying = false;
  isInvincible = false;

  updateScoreLabel();
  updateTimeLabel();
  updateTimerBar();
  messageLabel.textContent = "";
  retryButton.style.display = "none";
}

function startGame(stageKey, options = {}) {
  currentStageKey = stageKey;
  isInvincible = !!options.invincible;

  const words = wordsByStage[stageKey];
  if (!words || !words.length) {
    alert("CSV が読み込めていません。");
    return;
  }

  resetGameState();
  setStageLabel(stageKey);

  titleScreen.style.display = "none";
  gameoverScreen.style.display = "none";

  isPlaying = true;
  pickNextWord();
  startTimer();
}

function setStageLabel(stageKey) {
  const labels = {
    greeting: "挨拶",
    business: "ビジネス会話",
    it: "IT業界あるある",
    mail: "メール文言"
  };
  stageLabel.textContent = "STAGE: " + (labels[stageKey] || "-");
}

function pickNextWord() {
  const words = wordsByStage[currentStageKey];
  currentWord = words[Math.floor(Math.random() * words.length)];

  currentRomaji = currentWord.romaji;
  currentRomajiIndex = 0;

  renderWord();
}

function renderWord() {
  kanjiDisplay.textContent = currentWord.kanji;

  romajiDisplay.innerHTML = "";
  for (let i = 0; i < currentRomaji.length; i++) {
    const span = document.createElement("span");
    span.textContent = currentRomaji[i];
    if (i < currentRomajiIndex) span.classList.add("used");
    romajiDisplay.appendChild(span);
  }
}

function startTimer() {
  if (timerId) clearInterval(timerId);

  let last = performance.now();
  timerId = setInterval(() => {
    if (!isPlaying) return;

    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;

    timeLeft -= dt;
    if (timeLeft < 0) timeLeft = 0;

    updateTimeLabel();
    updateTimerBar();

    if (timeLeft <= 0) endGame();
  }, 50);
}

function updateScoreLabel() {
  scoreLabel.textContent = score;
}

function updateTimeLabel() {
  timeLabel.textContent = timeLeft.toFixed(1);
}

function updateTimerBar() {
  const ratio = Math.max(0, Math.min(1, timeLeft / GAME_TIME));
  timerBar.style.transform = `scaleX(${ratio})`;
}

function endGame() {
  isPlaying = false;
  if (timerId) clearInterval(timerId);

  gameoverScore.textContent = `SCORE: ${score}`;
  gameoverScreen.style.display = "flex";
  retryButton.style.display = "inline-block";
}

// =========================
// 演出
// =========================
function showScorePopup(text) {
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = text;

  const rect = romajiDisplay.getBoundingClientRect();
  popup.style.left = rect.left + rect.width / 2 + "px";
  popup.style.top = rect.top + "px";

  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 600);
}

function flashHit() {
  kanjiDisplay.classList.add("flash-hit");
  setTimeout(() => kanjiDisplay.classList.remove("flash-hit"), 250);
}

function flashMiss() {
  const root = document.getElementById("game-root");
  root.classList.add("flash-miss");
  setTimeout(() => root.classList.remove("flash-miss"), 250);
}

// =========================
// キー入力（寿司打式）
// =========================
function handleGameKeydown(e) {
  if (!isPlaying) return;

  // ESC → 中断
  if (e.code === "Escape") {
    isPlaying = false;
    if (timerId) clearInterval(timerId);

    titleScreen.style.display = "flex";
    gameoverScreen.style.display = "none";

    kanjiDisplay.textContent = "準備OK？";
    romajiDisplay.textContent = "";
    messageLabel.textContent = "";
    return;
  }

  const key = e.key.toLowerCase();
  if (!/^[a-z]$/.test(key)) return;

  const expected = currentRomaji[currentRomajiIndex];

  if (key === expected) {
    currentRomajiIndex++;

    seHit.currentTime = 0;
    seHit.play().catch(() => {});

    flashHit();

    if (currentRomajiIndex >= currentRomaji.length) {
      score += 10;
      updateScoreLabel();

      showScorePopup("+10");

      timeLeft = Math.min(GAME_TIME, timeLeft + TIME_BONUS_PER_WORD);
      messageLabel.textContent = "GOOD!";

      pickNextWord();
    } else {
      renderWord();
    }
  } else {
    if (!isInvincible) {
      timeLeft = Math.max(0, timeLeft - TIME_PENALTY_MISS);
      updateTimeLabel();
      updateTimerBar();
    }

    seMiss.currentTime = 0;
    seMiss.play().catch(() => {});

    flashMiss();

    messageLabel.textContent = "MISS!";
  }
}

// =========================
// タイトル画面：ステージ選択
// =========================
stageButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const stageKey = btn.dataset.stage;
    const name = playerNameInput.value.trim();
    playerNameLabel.textContent = name || "GUEST";

    startCountdown(stageKey);
  });
});

randomButton.addEventListener("click", () => {
  const keys = Object.keys(CSV_PATHS);
  const stageKey = keys[Math.floor(Math.random() * keys.length)];
  const name = playerNameInput.value.trim();
  playerName