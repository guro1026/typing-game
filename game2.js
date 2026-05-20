let state = "title";
let selectedCourse = null;
let words = [];
let currentJP = "";
let currentRomaji = "";
let originalRomaji = "";

// -----------------------------
// BGM & 効果音
// -----------------------------
const bgm = new Audio("sounds/BGM.mp3");
bgm.loop = true;
bgm.volume = 0.25;

const seHit = new Audio("sounds/hit.mp3");
seHit.volume = 0.6;

const seBeep = new Audio("sounds/beep.mp3");
seBeep.volume = 0.6;

// -----------------------------
// 名前入力チェック
// -----------------------------
document.getElementById("name-submit").addEventListener("click", validateName);

function validateName() {
  const input = document.getElementById("name-input");
  const error = document.getElementById("name-error");
  const name = input.value.trim();

  const fullNameRegex =
    /^[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+　[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+$/;

  if (!fullNameRegex.test(name)) {
    error.textContent = "※ フルネーム（姓　名）を全角スペースで入力してください";
    input.classList.add("error");
    seBeep.play();
    return;
  }

  input.classList.remove("error");
  error.textContent = "";

  localStorage.setItem("playerName", name);

  document.getElementById("name-area").style.display = "none";

  const nameBtn = document.getElementById("name-display");
  nameBtn.textContent = name;
  nameBtn.style.display = "inline-block";

  document.getElementById("course-buttons").style.display = "block";

  // ★ BGM 再生開始（初回入力成功時）
  bgm.play();
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
  document.getElementById("game-screen").style.display = "block";
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
      nextWord();
    });
}

// -----------------------------
// 次の単語へ
// -----------------------------
function nextWord() {
  const line = words[Math.floor(Math.random() * words.length)];
  const cols = line.split(",");

  currentJP = cols[1] || "";
  currentRomaji = cols[2] || "";
  originalRomaji = currentRomaji;

  updateDisplay();
  state = "playing";
}

// -----------------------------
// 表示更新
// -----------------------------
function updateDisplay() {
  document.getElementById("word-jp").textContent = currentJP;
  document.getElementById("word-romaji").textContent = currentRomaji;
}

// -----------------------------
// キー入力（寿司打方式）
// -----------------------------
document.addEventListener("keydown", e => {
  if (state !== "playing") return;

  const key = e.key.toLowerCase();
  const target = currentRomaji[0]?.toLowerCase();

  highlightKey(e.key);

  if (!target) return;

  // 正解
  if (key === target) {
    seHit.currentTime = 0;
    seHit.play();

    currentRomaji = currentRomaji.slice(1);
    updateDisplay();

    if (currentRomaji.length === 0) {
      setTimeout(nextWord, 200);
    }
  } else {
    // ミス音
    seBeep.currentTime = 0;
    seBeep.play();
  }
});

// -----------------------------
// キーボード光らせる（106/109配列）
// -----------------------------
function highlightKey(key) {
  const upper = key.toUpperCase();

  const keyEl = [...document.querySelectorAll(".key")]
    .find(k => k.textContent.toUpperCase() === upper);

  if (!keyEl) return;

  keyEl.classList.add("active");
  setTimeout(() => {
    keyEl.classList.remove("active");
  }, 150);
}
