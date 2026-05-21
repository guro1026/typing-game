// 状態
let state = "title";
let selectedCourse = null;
let words = [];
let currentJP = "";
let currentRomaji = "";
let originalRomaji = "";

let score = 0;
let combo = 0;
let maxCombo = 0;
let timeLeft = 60;
let timerInterval = null;

// BGM
const bgm = new Audio("sounds/BGM.mp3");
bgm.loop = true;
bgm.volume = 0;

bgm.play().catch(() => {
  const once = () => {
    bgm.play().catch(() => {});
    document.removeEventListener("click", once);
    document.removeEventListener("keydown", once);
  };
  document.addEventListener("click", once);
  document.addEventListener("keydown", once);
});

// 音量スライダー（タイトル＆ゲーム）
const volumeSliderTitle = document.getElementById("volume-slider");
const volumeSliderGame = document.getElementById("volume-slider-game");

function syncVolumeSlider(v) {
  bgm.volume = v / 100;
  volumeSliderTitle.value = v;
  volumeSliderGame.value = v;
}

volumeSliderTitle.addEventListener("input", () => {
  syncVolumeSlider(volumeSliderTitle.value);
});
volumeSliderGame.addEventListener("input", () => {
  syncVolumeSlider(volumeSliderGame.value);
});

// 効果音
const seHit = new Audio("sounds/hit.mp3");
seHit.volume = 0.6;

const seBeep = new Audio("sounds/beep.mp3");
seBeep.volume = 0.6;

// ESCでタイトルへ
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    returnToTitle();
  }
});

function returnToTitle() {
  if (timerInterval) clearInterval(timerInterval);

  state = "title";
  score = 0;
  combo = 0;
  maxCombo = 0;
  timeLeft = 60;

  syncVolumeSlider(0);

  document.getElementById("game-screen").style.display = "none";
  document.getElementById("title-screen").style.display = "block";

  updateHUD();
}

// 名前入力（全角スペース）
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
    seBeep.currentTime = 0;
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

// コース選択
document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedCourse = btn.dataset.course;
    startGame();
  });
});

// ゲーム開始
function startGame() {
  state = "loading";
  document.getElementById("title-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";

  score = 0;
  combo = 0;
  maxCombo = 0;
  timeLeft = 60;
  updateHUD();

  // キャラ切替（男/女ランダム）
  const charImg = document.getElementById("character");
  const isWoman = Math.random() < 0.5;
  if (isWoman) {
    charImg.src = "images/character_women_kiball.png";
  } else {
    charImg.src = "images/character_men_kiball.png";
  }

  // 気弾初期化
  kiPower = 0;
  const ball = document.getElementById("ki-ball");
  ball.classList.remove("white", "gold");
  ball.classList.add("blue");
  ball.classList.remove("pulse");
  ball.style.transform = "translateX(-50%) scale(0.2)";

  startTimer();
  loadCSV(selectedCourse);
}

// タイマー
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timeLeft--;
    updateHUD();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

// 終了
function endGame() {
  state = "end";

  kiPower = 100;
  updateKiBall();

  document.body.classList.add("flash");
  setTimeout(() => {
    document.body.classList.remove("flash");
  }, 300);

  fireBeam();

  setTimeout(() => {
    alert(`修行終了！\nスコア：${score}\n最大コンボ：${maxCombo}`);
    location.reload();
  }, 700);
}

// CSV読み込み
function loadCSV(course) {
  fetch(`words_${course}.csv`)
    .then(res => res.text())
    .then(text => {
      const lines = text.trim().split("\n");
      words = lines.slice(1).map(line => line.trim());
      nextWord();
    });
}

// 次の単語
function nextWord() {
  if (timeLeft <= 0) return;

  const line = words[Math.floor(Math.random() * words.length)];
  const cols = line.split(",");

  currentJP = cols[0] || "";
  currentRomaji = cols[2] || "";
  originalRomaji = currentRomaji;

  updateDisplay();
  state = "playing";
}

// 表示更新
function updateDisplay() {
  document.getElementById("word-jp").textContent = currentJP;
  document.getElementById("word-romaji").textContent = currentRomaji;
}

// HUD更新
function updateHUD() {
  document.getElementById("hud-score").textContent = score;
  document.getElementById("hud-combo").textContent = combo;
  document.getElementById("hud-time").textContent = timeLeft;
}

// キー入力
document.addEventListener("keydown", e => {
  if (state !== "playing") return;
  if (timeLeft <= 0) return;

  const key = e.key.toLowerCase();
  const target = currentRomaji[0]?.toLowerCase();

  highlightKey(e.key);

  if (!target) return;

  if (key === target) {
    // 正解
    seHit.currentTime = 0;
    seHit.play();

    currentRomaji = currentRomaji.slice(1);
    updateDisplay();

    let add = 1;
    if (combo >= 5) add = 5;
    else if (combo >= 3) add = 3;

    score += add;
    updateHUD();

    kiPower += 2;
    if (kiPower > 100) kiPower = 100;
    updateKiBall();
    updateKiColor(combo);

    if (currentRomaji.length === 0) {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      updateHUD();
      setTimeout(nextWord, 200);
    }

  } else {
    // ミス
    seBeep.currentTime = 0;
    seBeep.play();

    combo = 0;
    updateHUD();
    updateKiColor(combo);
  }
});

// キーボード光
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

// 気弾
let kiPower = 0;

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

// ビーム
function fireBeam() {
  const beam = document.getElementById("beam");
  beam.classList.add("beam-fire");
  setTimeout(() => {
    beam.classList.remove("beam-fire");
  }, 500);
}
