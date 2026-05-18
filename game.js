// =========================
// 設定
// =========================
const GAME_TIME = 60.0; // 秒
const TIME_BONUS_PER_WORD = 1.5; // 正解ごとの時間ボーナス
const TIME_PENALTY_MISS = 2.0;   // ミス時の減少秒数

// CSV パス（漢字,ローマ字 の2列想定）
const CSV_PATHS = {
  greeting: "words_greeting.csv",
  business: "words_business.csv",
  it: "words_engineer.csv",   // IT業界あるある
  mail: "words_mail.csv"      // メール文言
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

let currentWordIndex = 0;
let currentWord = null;      // { kanji, romaji }
let currentRomaji = "";
let currentRomajiIndex = 0;

let score = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let isPlaying = false;
let isInvincible = false;    // keepitreal 用

// タイトルでの隠しコマンド検出
let titleKeyBuffer = "";
let titleKeyStartTime = null;
const SECRET_CODE = "keepitreal";
const SECRET_TIME_LIMIT = 10 * 1000; // 10秒

// =========================
// DOM 取得
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

// =========================
// CSV 読み込み
// =========================
async function loadCsv(path) {
  const res = await fetch(path);
  const text = await res.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const result = [];

  // 1行目はヘッダ想定：日本語,ローマ字
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(",");
    if (cols.length < 2) continue;
    const kanji = cols[0].trim();
    const romaji = cols[1].trim().toLowerCase();
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
// ゲーム制御
// =========================
function resetGameState() {
  score = 0;
  timeLeft = GAME_TIME;
  currentWordIndex = 0;
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

  const words = wordsByStage[stageKey] || [];
  if (!words.length) {
    alert("このステージの単語が読み込めていません。CSV を確認してください。");
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
  let label = "STAGE: -";
  if (stageKey === "greeting") label = "STAGE: 挨拶";
  else if (stageKey === "business") label = "STAGE: ビジネス会話";
  else if (stageKey === "it") label = "STAGE: IT業界あるある";
  else if (stageKey === "mail") label = "STAGE: メール文言";
  stageLabel.textContent = label;
}

function pickNextWord() {
  const words = wordsByStage[currentStageKey];
  if (!words || !words.length) return;

  currentWordIndex = Math.floor(Math.random() * words.length);
  currentWord = words[currentWordIndex];
  currentRomaji = currentWord.romaji;
  currentRomajiIndex = 0;

  renderWord();
}

function renderWord() {
  if (!currentWord) return;
  kanjiDisplay.textContent = currentWord.kanji;

  // ローマ字を1文字ずつ span に
  romajiDisplay.innerHTML = "";
  for (let i = 0; i < currentRomaji.length; i++) {
    const ch = currentRomaji[i];
    const span = document.createElement("span");
    span.textContent = ch;
    if (i < currentRomajiIndex) {
      span.classList.add("used");
    }
    romajiDisplay.appendChild(span);
  }
}

function startTimer() {
  if (timerId) clearInterval(timerId);
  const startTime = performance.now();
  let lastTime = startTime;

  timerId = setInterval(() => {
    if (!isPlaying) return;
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    timeLeft -= dt;
    if (timeLeft < 0) timeLeft = 0;
    updateTimeLabel();
    updateTimerBar();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 50);
}

function updateScoreLabel() {
  scoreLabel.textContent = score.toString();
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
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  gameoverScore.textContent = `SCORE: ${score}`;
  gameoverScreen.style.display = "flex";
  retryButton.style.display = "inline-block";
}

// =========================
// キー入力（疑似寿司打）
// =========================
function handleGameKeydown(e) {
  if (!isPlaying) return;
  if (!currentWord || !currentRomaji) return;

  const key = e.key.toLowerCase();

  // アルファベット以外は無視
  if (!/^[a-z]$/.test(key)) return;

  const expected = currentRomaji[currentRomajiIndex];

  if (key === expected) {
    // 正解
    currentRomajiIndex++;
    if (currentRomajiIndex >= currentRomaji.length) {
      // 単語クリア
      score += 10;
      updateScoreLabel();
      timeLeft = Math.min(GAME_TIME, timeLeft + TIME_BONUS_PER_WORD);
      messageLabel.textContent = "GOOD!";
      pickNextWord();
    } else {
      renderWord();
    }
  } else {
    // ミス
    if (!isInvincible) {
      timeLeft = Math.max(0, timeLeft - TIME_PENALTY_MISS);
      updateTimeLabel();
      updateTimerBar();
    }
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
    startGame(stageKey);
  });
});

randomButton.addEventListener("click", () => {
  const keys = Object.keys(CSV_PATHS);
  const stageKey = keys[Math.floor(Math.random() * keys.length)];
  const name = playerNameInput.value.trim();
  playerNameLabel.textContent = name || "GUEST";
  startGame(stageKey);
});

// =========================
// タイトル画面：隠しコマンド keepitreal
// =========================
document.addEventListener("keydown", (e) => {
  // タイトル画面表示中のみ
  if (titleScreen.style.display === "none") return;

  const key = e.key;
  if (key.length !== 1) return;

  const ch = key.toLowerCase();
  if (!/[a-z]/.test(ch)) return;

  const now = performance.now();
  if (!titleKeyStartTime || now - titleKeyStartTime > SECRET_TIME_LIMIT) {
    titleKeyStartTime = now;
    titleKeyBuffer = "";
  }

  titleKeyBuffer += ch;

  if (titleKeyBuffer.endsWith(SECRET_CODE)) {
    const name = playerNameInput.value.trim();
    playerNameLabel.textContent = name || "GUEST";
    // 無敵モードで IT業界あるあるステージへ
    startGame("it", { invincible: true });
    messageLabel.textContent = "KEEP IT REAL MODE!";
    titleKeyBuffer = "";
    titleKeyStartTime = null;
  }
});

// =========================
// ゲーム中キー入力
// =========================
document.addEventListener("keydown", (e) => {
  // タイトル画面中のキーは上のハンドラで処理
  if (titleScreen.style.display !== "none") return;
  if (gameoverScreen.style.display !== "none") return;
  handleGameKeydown(e);
});

// =========================
// リトライ
// =========================
retryButton.addEventListener("click", () => {
  titleScreen.style.display = "flex";
  gameoverScreen.style.display = "none";
  kanjiDisplay.textContent = "準備OK？";
  romajiDisplay.textContent = "";
  messageLabel.textContent = "";
});

gameoverRetry.addEventListener("click", () => {
  titleScreen.style.display = "flex";
  gameoverScreen.style.display = "none";
  kanjiDisplay.textContent = "準備OK？";
  romajiDisplay.textContent = "";
  messageLabel.textContent = "";
});

// =========================
// 初期化
// =========================
window.addEventListener("load", async () => {
  await loadAllCsv();
  kanjiDisplay.textContent = "準備OK？";
  romajiDisplay.textContent = "";
});
