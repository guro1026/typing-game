let state = "title";
let selectedCourse = null;
let words = [];
let currentWord = "";
let typed = "";

// -----------------------------
// タイトル画面 → ゲーム開始
// -----------------------------
document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedCourse = btn.dataset.course;
    startGame();
  });
});

document.addEventListener("keydown", e => {
  if (state === "title" && e.code === "Space") {
    selectedCourse = "easy";
    startGame();
  }
});

function startGame() {
  state = "loading";
  document.getElementById("title-screen").style.display = "none";
  loadCSV(selectedCourse);
}

// -----------------------------
// CSV読み込み
// -----------------------------
function loadCSV(course) {
  fetch(`words_${course}.csv`)
    .then(res => res.text())
    .then(text => {
      words = text.trim().split("\n").map(w => w.trim());
      initGame();
    });
}

// -----------------------------
// ゲーム初期化
// -----------------------------
function initGame() {
  state = "playing";
  document.getElementById("game-screen").style.display = "block";

  nextWord();
}

// -----------------------------
// 次の単語
// -----------------------------
function nextWord() {
  typed = "";
  currentWord = words[Math.floor(Math.random() * words.length)];
  updateDisplay();
}

// -----------------------------
// 表示更新
// -----------------------------
function updateDisplay() {
  document.getElementById("word-box").textContent = currentWord;
  document.getElementById("input-box").textContent = typed;
}

// -----------------------------
// キー入力
// -----------------------------
document.addEventListener("keydown", e => {
  if (state !== "playing") return;

  const key = e.key.toLowerCase();
  const target = currentWord[typed.length]?.toLowerCase();

  if (key === target) {
    typed += key;

    if (typed.length === currentWord.length) {
      nextWord();
    }
  }

  updateDisplay();
});
