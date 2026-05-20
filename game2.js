let state = "title";
let selectedCourse = null;
let words = [];
let currentJP = "";
let currentRomaji = "";
let originalRomaji = "";

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
  document.getElementById("game-screen").style.display = "block";
  loadCSV(selectedCourse);
}

// -----------------------------
// CSV読み込み（words_◯◯.csv）
// 形式：日本語,ひらがな,ローマ字
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
// 次の単語へ（ランダム）
// -----------------------------
function nextWord() {
  if (!words.length) return;

  const line = words[Math.floor(Math.random() * words.length)];
  const cols = line.split(",");

  currentJP = cols[1] || "";       // ひらがな
  currentRomaji = cols[2] || "";   // ローマ字（残り）
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

  const key = e.key;

  // 1文字も残ってないなら何もしない
  if (!currentRomaji || currentRomaji.length === 0) return;

  const target = currentRomaji[0].toLowerCase();
  const pressed = key.toLowerCase();

  // キーボード光らせる
  highlightKey(key);

  // 正解
  if (pressed === target) {
    currentRomaji = currentRomaji.slice(1);
    updateDisplay();

    // 単語終了
    if (currentRomaji.length === 0) {
      // ちょっと間を置いて次の単語へ
      setTimeout(nextWord, 200);
    }
  } else {
    // 寿司打方式なら「ミスは無視 or ミスカウントのみ」
    // ここでミス音を鳴らしたり、エフェクトを入れてもOK
  }
});

// -----------------------------
// キーボードUIを光らせる（106/109配列）
// -----------------------------
function highlightKey(key) {
  let label = key;

  // Shift付き記号などは必要に応じてマッピングしてもよい
  // ここでは単純に大文字化して比較
  const upper = label.toUpperCase();

  const keyEl = [...document.querySelectorAll(".key")]
    .find(k => k.textContent.toUpperCase() === upper);

  if (!keyEl) return;

  keyEl.classList.add("active");
  setTimeout(() => {
    keyEl.classList.remove("active");
  }, 150);
}
