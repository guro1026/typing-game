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

let currentWord = "";
let currentRomaji = "";
let inputIndex = 0;

// ===============================
// 裏モード入力判定（10秒以内）
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
// ゲーム開始
// ===============================
function startGame(stageKey) {
  currentStage = stageKey;

  document.getElementById("title-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  score = 0;
  combo = 0;
  multiplier = 1;
  timeLeft = 60;

  updateHud();
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
// 単語リスト（仮）
// ===============================
const wordList = [
  "hello",
  "system",
  "engineer",
  "project",
  "meeting",
  "keyboard",
  "monitor",
  "network",
  "server",
  "cloud"
];

// ===============================
// 次の単語
// ===============================
function nextWord() {
  currentWord = wordList[Math.floor(Math.random() * wordList.length)];
  currentRomaji = currentWord;
  inputIndex = 0;

  document.getElementById("kanji-display").textContent = currentWord;
  document.getElementById("romaji-display").textContent = currentRomaji;
}

// ===============================
// キー入力（ゲーム中）
// ===============================
document.addEventListener("keydown", (e) => {
  const gameVisible = !document.getElementById("game-screen").classList.contains("hidden");
  if (!gameVisible) return;

  if (e.key === "Escape") {
    endGame();
    return;
  }

  const expected = currentRomaji[inputIndex];
  const key = e.key.toLowerCase();

  if (key === expected) {
    inputIndex++;

    // 全部打ち切ったらワードクリア
    if (inputIndex >= currentRomaji.length) {
      combo++;
      applyComboBonus();
      score += 10 * multiplier;
      updateHud();
      nextWord();
    } else {
      // 途中の文字更新
      document.getElementById("romaji-display").textContent =
        currentRomaji.slice(inputIndex);
    }
  } else {
    onMiss();
  }
});

// ===============================
// コンボボーナス（裏モードぶっ壊し版）
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
    // 通常モード
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
