// ==============================
// 設定
// ==============================
const GAME_TIME_SECONDS = 60;
const HIDDEN_CODE = "keepitreal";
const HIDDEN_CODE_TIME_LIMIT_MS = 10000;

// ステージ定義
const STAGES = {
  greeting: {
    id: "greeting",
    label: "挨拶",
    csv: "words_easy.csv",
    background: "car",
    correctSound: "gear_shift",
    missSound: "car_crash",
    bgLoop: "car_pass",
    invincible: false
  },
  business: {
    id: "business",
    label: "ビジネス会話",
    csv: "words_business.csv",
    background: "car",
    correctSound: "gear_shift",
    missSound: "car_crash",
    bgLoop: "car_pass",
    invincible: false
  },
  it: {
    id: "it",
    label: "IT用語",
    csv: "words_it.csv",
    background: "space",
    correctSound: "warp",
    missSound: "beep",
    bgLoop: "space_charge",
    invincible: false
  },
  flight_cheat: {
    id: "flight_cheat",
    label: "KEEPITREAL（無敵）",
    csv: "words_business.csv", // 好きなCSVに変えてOK
    background: "flight",
    correctSound: "hit",
    missSound: "beep",
    bgLoop: "plane_flyby",
    invincible: true
  }
};

// ==============================
// DOM 取得
// ==============================
const root = document.getElementById("game-root");
const titleScreen = document.getElementById("title-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const gameoverScore = document.getElementById("gameover-score");
const gameoverRetry = document.getElementById("gameover-retry");

const playerNameInput = document.getElementById("player-name-input");
const playerNameLabel = document.getElementById("player-name-label");

const scoreLabel = document.getElementById("score-label");
const timeLabel = document.getElementById("time-label");
const timerBar = document.getElementById("timer-bar");

const kanjiDisplay = document.getElementById("kanji-display");
const readingDisplay = document.getElementById("reading-display");
const romajiInput = document.getElementById("romaji-input");

const stageLabel = document.getElementById("stage-label");
const messageLabel = document.getElementById("message");
const retryButton = document.getElementById("retry-button");

const titleStageButtons = document.querySelectorAll("#title-screen .btn[data-stage]");
const titleStartRandom = document.getElementById("title-start-random");

// ==============================
// サウンド管理（簡易ラッパ）
// ==============================
const soundFiles = {
  beep: "sounds/beep.mp3",
  hit: "sounds/hit.mp3",
  music: "sounds/music.mp3",
  car_pass: "sounds/car_pass.mp3",
  car_crash: "sounds/car_crash.mp3",
  gear_shift: "sounds/gear_shift.mp3",
  plane_flyby: "sounds/plane_flyby.mp3",
  space_charge: "sounds/space_charge.mp3",
  warp: "sounds/warp.mp3"
};

const sounds = {};
let bgmAudio = null;
let bgLoopAudio = null;

function loadSounds() {
  for (const [key, path] of Object.entries(soundFiles)) {
    const audio = new Audio(path);
    audio.preload = "auto";
    sounds[key] = audio;
  }
  // BGM
  bgmAudio = new Audio(soundFiles.music);
  bgmAudio.loop = true;
  bgmAudio.volume = 0.2;
}

function playOneShot(name, volume = 1.0) {
  const base = sounds[name];
  if (!base) return;
  const a = base.cloneNode(true);
  a.volume = volume;
  a.play().catch(() => {});
}

function startBgLoop(name, volume = 0.4) {
  stopBgLoop();
  const base = sounds[name];
  if (!base) return;
  bgLoopAudio = base.cloneNode(true);
  bgLoopAudio.loop = true;
  bgLoopAudio.volume = volume;
  bgLoopAudio.play().catch(() => {});
}

function stopBgLoop() {
  if (bgLoopAudio) {
    bgLoopAudio.pause();
    bgLoopAudio.currentTime = 0;
    bgLoopAudio = null;
  }
}

function startBgm() {
  if (!bgmAudio) return;
  bgmAudio.play().catch(() => {});
}

function stopBgm() {
  if (!bgmAudio) return;
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
}

// ==============================
// ゲーム状態
// ==============================
let currentStage = null;
let words = []; // {kanji, reading, romaji}
let currentIndex = 0;
let score = 0;
let timeLeft = GAME_TIME_SECONDS;
let timerId = null;
let running = false;
let hiddenCodeBuffer = "";
let hiddenCodeStartTime = null;
let hiddenCodeActive = false;

// ==============================
// CSV ロード
// ==============================
async function loadCsv(path) {
  const res = await fetch(path);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const result = [];
  for (const line of lines) {
    const cols = line.split(",");
    if (cols.length >= 3) {
      const [kanji, reading, romaji] = cols;
      result.push({
        kanji: kanji.trim(),
        reading: reading.trim(),
        romaji: romaji.trim().toLowerCase()
      });
    }
  }
  return result;
}

// ==============================
// ステージ背景切り替え
// ==============================
function setBackgroundForStage(stage) {
  let bgPath = "";
  if (stage.background === "car") {
    bgPath = "assets/car/car_background.png";
  } else if (stage.background === "flight") {
    bgPath = "assets/flight/flight_background.png";
  } else if (stage.background === "space") {
    bgPath = "assets/space/space_background.png";
  } else {
    bgPath = "assets/title/title_background.png";
  }
  root.style.backgroundImage = `url("${bgPath}")`;
}

// ==============================
// ゲーム開始・終了
// ==============================
async function startGame(stageId) {
  currentStage = STAGES[stageId];
  if (!currentStage) return;

  // 名前
  const name = playerNameInput.value.trim();
  playerNameLabel.textContent = name || "GUEST";

  // 背景
  setBackgroundForStage(currentStage);

  // スコア・タイム初期化
  score = 0;
  timeLeft = GAME_TIME_SECONDS;
  scoreLabel.textContent = "0";
  timeLabel.textContent = timeLeft.toFixed(1);
  timerBar.style.transform = "scaleX(1)";
  messageLabel.textContent = "";
  retryButton.style.display = "none";

  // ステージラベル
  stageLabel.textContent = `STAGE: ${currentStage.label}`;

  // CSV ロード
  words = await loadCsv(currentStage.csv);
  shuffle(words);
  currentIndex = 0;

  // 最初の問題
  showCurrentWord();

  // 入力有効化
  romajiInput.disabled = false;
  romajiInput.value = "";
  romajiInput.focus();

  // タイトル・ゲームオーバー非表示
  titleScreen.style.display = "none";
  gameoverScreen.style.display = "none";

  // サウンド
  startBgm();
  startBgLoop(currentStage.bgLoop);

  // タイマー開始
  running = true;
  if (timerId) clearInterval(timerId);
  const startTime = performance.now();
  timerId = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const remain = GAME_TIME_SECONDS - elapsed;
    timeLeft = Math.max(0, remain);
    timeLabel.textContent = timeLeft.toFixed(1);
    timerBar.style.transform = `scaleX(${timeLeft / GAME_TIME_SECONDS})`;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 50);
}

function endGame() {
  if (!running) return;
  running = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  romajiInput.disabled = true;
  stopBgLoop();
  // BGM はタイトルに戻るまで流しっぱなしでもOK（好み）

  gameoverScore.textContent = `SCORE: ${score}`;
  gameoverScreen.style.display = "flex";
}

// ==============================
// 問題表示・判定
// ==============================
function showCurrentWord() {
  if (!words.length) {
    kanjiDisplay.textContent = "単語がありません";
    readingDisplay.textContent = "";
    return;
  }
  const w = words[currentIndex % words.length];
  kanjiDisplay.textContent = w.kanji;
  readingDisplay.textContent = w.reading;
}

function handleInputEnter() {
  if (!running || !currentStage) return;
  const w = words[currentIndex % words.length];
  const input = romajiInput.value.trim().toLowerCase();
  romajiInput.value = "";

  if (!input) return;

  if (input === w.romaji) {
    // 正解
    score += 10;
    scoreLabel.textContent = String(score);
    messageLabel.textContent = "GOOD!";
    playOneShot(currentStage.correctSound, 0.9);
    currentIndex++;
    showCurrentWord();
  } else {
    // ミス
    messageLabel.textContent = "MISS...";
    playOneShot(currentStage.missSound, 0.9);
    if (!currentStage.invincible) {
      // 無敵でない場合のみペナルティ
      timeLeft = Math.max(0, timeLeft - 3);
    }
  }
}

// ==============================
// ユーティリティ
// ==============================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ==============================
// タイトル画面：ステージ選択
// ==============================
titleStageButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const stageId = btn.getAttribute("data-stage");
    startGame(stageId);
  });
});

titleStartRandom.addEventListener("click", () => {
  const keys = ["greeting", "business", "it"];
  const stageId = keys[(Math.random() * keys.length) | 0];
  startGame(stageId);
});

// ==============================
// タイトル画面：隠しコマンド keepitreal
// ==============================
document.addEventListener("keydown", (e) => {
  // タイトル画面中のみ
  if (titleScreen.style.display === "none") return;

  const key = e.key;
  if (key.length === 1 && /[a-zA-Z]/.test(key)) {
    const now = performance.now();
    if (!hiddenCodeActive) {
      hiddenCodeActive = true;
      hiddenCodeStartTime = now;
      hiddenCodeBuffer = "";
    }
    // 時間制限チェック
    if (now - hiddenCodeStartTime > HIDDEN_CODE_TIME_LIMIT_MS) {
      hiddenCodeBuffer = "";
      hiddenCodeStartTime = now;
    }
    hiddenCodeBuffer += key.toLowerCase();

    if (hiddenCodeBuffer === HIDDEN_CODE) {
      // 成功
      hiddenCodeActive = false;
      hiddenCodeBuffer = "";
      messageLabel.textContent = "KEEP IT REAL MODE!";
      startGame("flight_cheat");
    } else if (!HIDDEN_CODE.startsWith(hiddenCodeBuffer)) {
      // 途中で不一致 → リセット
      hiddenCodeBuffer = "";
      hiddenCodeStartTime = now;
    }
  }
});

// ==============================
// ゲームオーバー → タイトルへ
// ==============================
gameoverRetry.addEventListener("click", () => {
  gameoverScreen.style.display = "none";
  titleScreen.style.display = "flex";
  romajiInput.value = "";
  romajiInput.disabled = true;
  kanjiDisplay.textContent = "準備OK？";
  readingDisplay.textContent = "ステージを選んでください";
  messageLabel.textContent = "";
  stageLabel.textContent = "STAGE: -";
  stopBgLoop();
  stopBgm();
});

// 下部の「もう一度」ボタン（ゲーム中に使いたければ）
retryButton.addEventListener("click", () => {
  titleScreen.style.display = "flex";
  gameoverScreen.style.display = "none";
  romajiInput.value = "";
  romajiInput.disabled = true;
  kanjiDisplay.textContent = "準備OK？";
  readingDisplay.textContent = "ステージを選んでください";
  messageLabel.textContent = "";
  stageLabel.textContent = "STAGE: -";
  stopBgLoop();
  stopBgm();
});

// ==============================
// 初期化
// ==============================
window.addEventListener("load", () => {
  loadSounds();
  titleScreen.style.display = "flex";
  gameoverScreen.style.display = "none";
  romajiInput.disabled = true;
});
