let state = "title";
let selectedCourse = null;
let words = [];
let currentJP = "";
let currentRomaji = "";
let originalRomaji = "";

// -----------------------------
// スコア・コンボ・タイマー
// -----------------------------
let score = 0;
let combo = 0;
let timeLeft = 60;
let timerInterval = null;

// -----------------------------
// BGM（最初は無音で再生）
// -----------------------------
const bgm = new Audio("sounds/BGM.mp3");
bgm.loop = true;
bgm.volume = 0;

bgm.play().catch(() => {
  document.addEventListener("click", tryPlayOnce, { once: true });
  document.addEventListener("keydown", tryPlayOnce, { once: true });
});

function tryPlayOnce() {
  bgm.play().catch(()=>{});
}

// 音量スライダー
const volumeSlider = document.getElementById("volume-slider");
volumeSlider.addEventListener("input", () => {
  bgm.volume = volumeSlider.value / 100;
});

// 効果音（今は使わないが残しておく）
const seHit = new Audio("sounds/hit.mp3");
seHit.volume = 0.6;

const seBeep = new Audio("sounds/beep.mp3");
seBeep.volume = 0.6;

// -----------------------------
// 名前入力
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
}

// -----------------------------
// コース選択
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

  score = 0;
  combo = 0;
  timeLeft = 60;
  updateHUD();

  startTimer();
  loadCSV(selectedCourse);
}

// -----------------------------
// タイマー開始
// -----------------------------
function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    updateHUD();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

// -----------------------------
// 終了処理（今は仮）
// -----------------------------
function endGame() {
  state = "end";
  alert(`終了！\nスコア：${score}\n最大コンボ：${combo}`);
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
// HUD更新（スコア・コンボ・タイマー）
// -----------------------------
function updateHUD() {
  document.getElementById("hud-score").textContent = score;
  document.getElementById("hud-combo").textContent = combo;
  document.getElementById("hud-time").textContent = timeLeft;
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

  if (key === target) {
    // 正解
    currentRomaji = currentRomaji.slice(1);
    updateDisplay();

    // スコア加算（倍率）
    let add = 1;
    if (combo >= 5) add = 5;
    else if (combo >= 3) add = 3;

    score += add;
    updateHUD();

    // 単語クリア
    if (currentRomaji.length === 0) {
      combo++;
      updateHUD();
      setTimeout(nextWord, 200);
    }

  } else {
    // ミス → コンボリセット
    combo = 0;
    updateHUD();
  }
});

// -----------------------------
// キーボード光らせる
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
