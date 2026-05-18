let score = 0;
let combo = 0;
let multiplier = 1;
let timeLeft = 60;
let currentStage = "";
let timerId = null;

let isKeepItReal = false;
let secretBuffer = "";
let secretStartTime = 0;

// ------------------------------
// 裏モード入力判定（10秒以内）
// ------------------------------
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("title-screen").classList.contains("hidden")) {
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
  }
});

// ------------------------------
// ゲーム開始
// ------------------------------
function startGame(stageKey) {
  currentStage = stageKey;

  document.getElementById("title-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  score = 0;
  combo = 0;
  multiplier = 1;
  timeLeft = 60;

  updateHud();

  timerId = setInterval(() => {
    timeLeft--;
    updateHud();
    if (timeLeft <= 0) endGame();
  }, 1000);

  nextWord();
}

// ------------------------------
// HUD更新
// ------------------------------
function updateHud() {
  document.getElementById("score-label").textContent = `SCORE: ${score}`;
  document.getElementById("multi-label").textContent = `MULTI: x${multiplier}`;
  document.getElementById("time-label").textContent = `TIME: ${timeLeft}`;
}

// ------------------------------
// 次の単語
// ------------------------------
function nextWord() {
  const words = ["hello", "system", "engineer", "project", "meeting"];
  const w = words[Math.floor(Math.random() * words.length)];

  document.getElementById("kanji-display").textContent = w;
  document.getElementById("romaji-display").textContent = w;
}

// ------------------------------
// キー入力（ゲーム中）
// ------------------------------
document.addEventListener("keydown", (e) => {
  if (document.getElementById("game-screen").classList.contains("hidden")) return;

  if (e.key === "Escape") {
    endGame();
    return;
  }

  // 正解扱い（仮）
  combo++;

  // 裏モード倍率
  if (isKeepItReal) {
    if (combo >= 20) {
      multiplier = 4;
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

  score += 10 * multiplier;
  updateHud();
  nextWord();
});

// ------------------------------
// ミス処理（仮）
// ------------------------------
function onMiss() {
  combo = 0;
  multiplier = 1;
  updateHud();
}

// ------------------------------
// ゲーム終了
// ------------------------------
function endGame() {
  clearInterval(timerId);

  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("title-screen").classList.remove("hidden");
}

// ------------------------------
// ステージボタン
// ------------------------------
document.querySelectorAll(".stage-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const stage = btn.dataset.stage;
    startGame(stage);
  });
});
