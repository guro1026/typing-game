// ===============================
// 変数
// ===============================
let score = 0;
let combo = 0;
let multiplier = 1;
let timeLeft = 60;
let currentStage = "";
let timerId = null;

let isKeepItReal = false;
let secretBuffer = "";
let secretStartTime = 0;

let words = [];
let currentWord = null;
let inputIndex = 0;

// ===============================
// Web Audio API
// ===============================
let audioCtx;
let hitBuffer = null;
let beepBuffer = null;

async function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  async function loadSound(url) {
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuf);
  }

  hitBuffer = await loadSound("sounds/hit.mp3");
  beepBuffer = await loadSound("sounds/beep.mp3");
}

function playBuffer(buffer, volume = 0.25) {
  if (!audioCtx || !buffer) return;
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(audioCtx.destination);
  source.start(0);
}

// ===============================
// 裏モード入力判定
// ===============================
document.addEventListener("keydown", (e) => {
  const titleVisible = !document.getElementById("title-screen").classList.contains("hidden");
  if (!titleVisible) return;

  if (secretBuffer.length === 0) {
    secretStartTime = performance.now();
  }

  secretBuffer += e.key.toLowerCase();

  if (secretBuffer === "keepitreal") {
    const elapsed = (performance.now() - secretStartTime) / 1000;
    if (elapsed <= 10) {
      isKeepItReal = true;
      document.getElementById("secret-input").textContent = "裏モード発動";
    }
  }

  if (!"keepitreal".startsWith(secretBuffer)) {
    secretBuffer = "";
  }
});

// ===============================
// CSV読み込み（ヘッダー除外 + CRLF除去）
// ===============================
async function loadCSV(stageKey) {
  const fileMap = {
    greeting: "words_easy.csv",
    business: "words_business.csv",
    it: "words_it.csv",
    mail: "words_mail.csv"
  };

  const file = fileMap[stageKey];
  const res = await fetch(file);
  const text = await res.text();

  words = text
    .trim()
    .split("\n")
    .slice(1) // ★ ヘッダー行をスキップ
    .map(line => {
      const [jp, hira, romaRaw] = line.split(",");
      const roma = romaRaw.replace(/\r/g, "").trim(); // ★ CRLF対策
      return { jp, hira, roma };
    });
}

// ===============================
// ゲーム開始
// ===============================
async function startGame(stageKey) {
  currentStage = stageKey;

  document.getElementById("title-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  score = 0;
  combo = 0;
  multiplier = 1;
  timeLeft = 60;

  updateHud();

  if (!audioCtx) {
    await initAudio();
  }

  await loadCSV(stageKey);
  nextWord();

  timerId = setInterval(() => {
    timeLeft--;
    updateHud();
    if (timeLeft <= 0) endGame();
  }, 1000);
}

// ===============================
// HUD更新
// ===============================
function updateHud() {
  document.getElementById("score-label").textContent = `SCORE: ${score}`;
  document.getElementById("multi-label").textContent = `MULTI: x${multiplier}`;
  document.getElementById("time-label").textContent = `TIME: ${timeLeft}`;
  document.getElementById("combo-label").textContent = `COMBO: ${combo}`;
}

// ===============================
// 次の単語
// ===============================
function nextWord() {
  currentWord = words[Math.floor(Math.random() * words.length)];
  inputIndex = 0;

  document.getElementById("kanji-display").textContent = currentWord.jp;
  document.getElementById("romaji-display").textContent = currentWord.roma;
}

// ===============================
// キー入力
// ===============================
document.addEventListener("keydown", (e) => {
  const gameVisible = !document.getElementById("game-screen").classList.contains("hidden");
  if (!gameVisible) return;

  if (e.key === "Escape") {
    endGame();
    return;
  }

  const expected = currentWord.roma[inputIndex];
  const key = e.key.toLowerCase();

  if (key === expected) {

    playBuffer(hitBuffer, 0.25);

    inputIndex++;

    if (inputIndex >= currentWord.roma.length) {
      combo++;
      applyComboBonus();
      score += 10 * multiplier;
      updateHud();
      nextWord();
    } else {
      document.getElementById("romaji-display").textContent =
        currentWord.roma.slice(inputIndex);
    }
  } else {
    onMiss();
  }
});

// ===============================
// コンボボーナス
// ===============================
function applyComboBonus() {
  if (isKeepItReal) {
    if (combo >= 40) {
      multiplier = 32;
      timeLeft += 20;
    } else if (combo >= 30) {
      multiplier = 16;
      timeLeft += 15;
    } else if (combo >= 20) {
      multiplier = 8;
      timeLeft += 10;
    } else if (combo >= 10) {
      multiplier = 4;
      timeLeft += 5;
    } else if (combo >= 5) {
      multiplier = 2;
    } else {
      multiplier = 1;
    }
  } else {
    if (combo >= 10) multiplier = 3;
    else if (combo >= 5) multiplier = 2;
    else multiplier = 1;
  }
}

// ===============================
// ミス処理
// ===============================
function onMiss() {
  combo = 0;
  multiplier = 1;
  updateHud();

  playBuffer(beepBuffer, 0.25);

  document.getElementById("message").textContent = "MISS!";
  setTimeout(() => {
    document.getElementById("message").textContent = "";
  }, 300);
}

// ===============================
// ゲーム終了
// ===============================
function endGame() {
  clearInterval(timerId);

  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("title-screen").classList.remove("hidden");
}

// ===============================
// ステージボタン
// ===============================
document.querySelectorAll(".stage-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const stage = btn.dataset.stage;
    startGame(stage);
  });
});
