// ============================
//  グローバル変数
// ============================
let words = []; // ← CSVから読み込む
let currentIndex = 0;
let currentPos = 0;

let timeLeft = 60;
let timerId = null;

let score = 0;
let combo = 0;

let kiPower = 0; // 0〜100

// ============================
//  初期化
// ============================
window.addEventListener("load", () => {
  setupTitle();
  setupKeyboardHighlight();
});

// ============================
//  タイトル画面まわり
// ============================
function setupTitle() {
  const nameInput = document.getElementById("name-input");
  const nameSubmit = document.getElementById("name-submit");
  const nameError = document.getElementById("name-error");
  const nameDisplay = document.getElementById("name-display");
  const courseButtons = document.getElementById("course-buttons");

  nameSubmit.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name || !name.includes(" ")) {
      nameError.textContent = "姓と名の間にスペースを入れてください";
      nameInput.classList.add("error");
      return;
    }
    nameError.textContent = "";
    nameInput.classList.remove("error");

    nameDisplay.textContent = name;
    nameDisplay.style.display = "inline-block";
    courseButtons.style.display = "block";
  });

  document.querySelectorAll(".course-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const course = btn.dataset.course;
      loadCSV(course);
    });
  });
}

// ============================
//  CSV 読み込み
// ============================
function loadCSV(course) {
  const fileMap = {
    easy: "words_easy.csv",
    business: "words_business.csv",
    it: "words_it.csv",
    mail: "words_mail.csv"
  };

  const file = fileMap[course];

  fetch(file)
    .then(res => res.text())
    .then(text => {
      words = parseCSV(text);
      startGame();
    })
    .catch(err => {
      alert("CSV の読み込みに失敗しました: " + err);
    });
}

// ============================
//  CSV → 配列変換
// ============================
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const [jp, hira, roma] = lines[i].split(",");
    result.push({ jp, hira, roma });
  }
  return result;
}

// ============================
//  ゲーム開始
// ============================
function startGame() {
  document.getElementById("title-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";

  score = 0;
  combo = 0;
  kiPower = 0;
  timeLeft = 60;
  currentIndex = 0;
  currentPos = 0;

  updateHUD();
  updateKiBall();
  updateKiColor(combo);

  setWord(words[currentIndex]);

  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      clearInterval(timerId);
      endGame();
    } else {
      updateHUD();
    }
  }, 1000);

  window.addEventListener("keydown", handleKey);
}

// ============================
//  単語セット
// ============================
function setWord(wordObj) {
  document.getElementById("word-jp").textContent = wordObj.jp;
  document.getElementById("word-romaji").textContent = wordObj.roma;

  currentPos = 0;
  updateRomajiDisplay();
}

function updateRomajiDisplay() {
  const roma = document.getElementById("word-romaji");
  const word = words[currentIndex].roma;
  const done = word.slice(0, currentPos);
  const rest = word.slice(currentPos);
  roma.innerHTML = `<span style="color:#888">${done}</span><span>${rest}</span>`;
}

// ============================
//  キー入力処理
// ============================
function handleKey(e) {
  const key = e.key.toLowerCase();
  const word = words[currentIndex].roma;
  const expected = word[currentPos];

  if (!expected) return;

  if (key === expected.toLowerCase()) {
    // 正解
    currentPos++;
    score += 10;
    combo++;

    // 気弾成長
    kiPower += 2;
    if (kiPower > 100) kiPower = 100;
    updateKiBall();
    updateKiColor(combo);

    updateHUD();
    updateRomajiDisplay();
    highlightKeyboard(key);

    if (currentPos >= word.length) {
      currentIndex = (currentIndex + 1) % words.length;
      setWord(words[currentIndex]);
    }
  } else {
    // ミス
    combo = 0;
    updateKiColor(combo);
    updateHUD();
    highlightKeyboard(key, true);
  }
}

// ============================
//  HUD 更新
// ============================
function updateHUD() {
  document.getElementById("hud-time").textContent = timeLeft;
  document.getElementById("hud-score").textContent = score;
  document.getElementById("hud-combo").textContent = combo;
}

// ============================
//  気弾関連
// ============================
function updateKiBall() {
  const ball = document.getElementById("ki-ball");
  const scale = 0.2 + (kiPower / 100) * 1.0;
  ball.style.transform = `translateX(-50%) scale(${scale})`;

  if (kiPower > 40) {
    ball.classList.add("pulse");
  }
}

function updateKiColor(combo) {
  const ball = document.getElementById("ki-ball");
  ball.classList.remove("blue", "white", "gold");

  if (combo >= 20) {
    ball.classList.add("gold");
  } else if (combo >= 10) {
    ball.classList.add("white");
  } else {
    ball.classList.add("blue");
  }
}

// ============================
//  ビーム発射 & 終了演出
// ============================
function fireBeam() {
  const beam = document.getElementById("beam");
  beam.classList.add("beam-fire");
  setTimeout(() => {
    beam.classList.remove("beam-fire");
  }, 500);
}

function endGame() {
  window.removeEventListener("keydown", handleKey);

  kiPower = 100;
  updateKiBall();

  document.body.classList.add("flash");
  setTimeout(() => {
    document.body.classList.remove("flash");
  }, 300);

  fireBeam();

  setTimeout(() => {
    alert(`修行終了！\nSCORE: ${score}\nMAX COMBO: ${combo}`);
    location.reload();
  }, 600);
}

// ============================
//  キーボードハイライト
// ============================
let keyMap = {};

function setupKeyboardHighlight() {
  document.querySelectorAll("#keyboard .key").forEach(el => {
    const label = el.textContent.trim().toLowerCase();
    if (label.length === 1) {
      keyMap[label] = el;
    }
  });
}

function highlightKeyboard(key, miss = false) {
  const el = keyMap[key];
  if (!el) return;
  el.classList.add("active");
  if (miss) {
    el.style.background = "#f44";
  }
  setTimeout(() => {
    el.classList.remove("active");
    el.style.background = "";
  }, 120);
}
