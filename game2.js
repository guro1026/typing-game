let state = "title";
let selectedCourse = null;
let words = [];
let currentWord = "";
let typed = "";

// -----------------------------
// 名前入力チェック
// -----------------------------
document.getElementById("name-submit").addEventListener("click", validateName);

function validateName() {
  const input = document.getElementById("name-input");
  const error = document.getElementById("name-error");
  const name = input.value.trim();

  // 漢字/ひらがな/カタカナ + 全角スペース + 漢字/ひらがな/カタカナ
  const fullNameRegex =
    /^[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+　[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+$/;

  if (!fullNameRegex.test(name)) {
    error.textContent = "※ フルネーム（姓　名）を全角スペースで入力してください";
    input.classList.add("error");
    return;
  }

  // OK
  input.classList.remove("error");
  error.textContent = "";

  // 保存
  localStorage.setItem("playerName", name);

  // 名前入力エリアを非表示
  document.getElementById("name-area").style.display = "none";

  // 名前ボタンを表示
  const nameBtn = document.getElementById("name-display");
  nameBtn.textContent = name;
  nameBtn.style.display = "inline-block";

  // コース選択ボタンを表示
  document.getElementById("course-buttons").style.display = "block";
}

// -----------------------------
// コース選択 → ゲーム開始
// -----------------------------
document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedCourse = btn.dataset.course;
    startGame();
  });
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
