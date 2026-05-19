// ===============================
//  キャッチコピー 4行（TYPE-ATTACK）
// ===============================

const lines = [
  "最速は誰だ！！スピードキングを目指せ！",
  "Who is the fastest? Aim for the Speed King!",
  "Qui est le plus rapide ? Deviens le Speed King!",
  "Chi è il più veloce? Punta al Speed King!"
];

const lineElems = [
  document.getElementById("line1"),
  document.getElementById("line2"),
  document.getElementById("line3"),
  document.getElementById("line4")
];

function randomColor() {
  const colors = [
    "#ff4d4d", "#ff884d", "#ffd24d", "#a6ff4d",
    "#4dffb8", "#4dd2ff", "#4d6aff", "#b84dff",
    "#ff4df2", "#ff4d88"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 4行同時 TYPE-ATTACK（1行5秒・ランダム順・ランダム色）
async function typeAttackAllLines(lines, elems) {
  const allSpans = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const elem = elems[i];
    elem.innerHTML = "";

    const chars = text.split("");
    const totalTime = 5000;
    const perChar = totalTime / chars.length;

    const spans = chars.map(c => {
      const span = document.createElement("span");
      span.textContent = c;
      span.style.opacity = 0;
      span.style.display = "inline-block";
      span.style.transform = "scale(0.2) rotate(0deg)";
      span.style.transition = `opacity 0.1s linear, transform 0.15s ease-out`;
      span.style.color = randomColor();
      elem.appendChild(span);
      return span;
    });

    const order = [...Array(chars.length).keys()].sort(() => Math.random() - 0.5);
    allSpans.push({ spans, order, perChar });
  }

  const maxLen = Math.max(...allSpans.map(x => x.order.length));

  for (let step = 0; step < maxLen; step++) {
    for (let row = 0; row < allSpans.length; row++) {
      const { spans, order } = allSpans[row];
      if (step < order.length) {
        const idx = order[step];
        const span = spans[idx];
        span.style.opacity = 1;
        span.style.transform = "scale(1.4) rotate(8deg)";
        setTimeout(() => {
          span.style.transform = "scale(1.0) rotate(0deg)";
        }, 120);
      }
    }
    await new Promise(res => setTimeout(res, allSpans[0].perChar));
  }
}

typeAttackAllLines(lines, lineElems);

// ===============================
//  名前入力
// ===============================

const nameInput = document.getElementById("fullname");
const nameBtn = document.getElementById("name-confirm");
const nameError = document.getElementById("name-error");
const courseContainer = document.getElementById("course-container");

const savedName = localStorage.getItem("kir_fullname");
if (savedName) {
  nameInput.value = savedName;
  courseContainer.classList.remove("hidden");
}

nameBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();

  if (!name.includes(" ")) {
    nameError.textContent = "姓と名の間にスペースを入れてください。";
    return;
  }

  if (!/^[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+\s[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/.test(name)) {
    nameError.textContent = "日本語のフルネーム（姓＋名）を入力してください。";
    return;
  }

  localStorage.setItem("kir_fullname", name);
  nameError.textContent = "";
  courseContainer.classList.remove("hidden");
});

// ===============================
//  コース選択 → READY画面
// ===============================

document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const course = btn.dataset.course;
    hideTitleScreen();
    showReadyScreen(course);
  });
});

function hideTitleScreen() {
  const title = document.querySelector(".title-logo");
  if (title) title.style.display = "none";

  const catchContainer = document.getElementById("catch-container");
  if (catchContainer) catchContainer.style.display = "none";

  const nameBox = document.getElementById("name-container");
  if (nameBox) nameBox.style.display = "none";

  const courseBox = document.getElementById("course-container");
  if (courseBox) courseBox.style.display = "none";
}

// ===============================
//  READY画面（スペースで開始）
// ===============================

const overlay = document.getElementById("overlay");
let waitingForSpace = false;
let selectedCourse = null;

function showReadyScreen(course) {
  selectedCourse = course;
  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="main-text">【${course}】ゲーム開始</div>
    <div class="sub-text">スペースキーでスタート</div>
  `;
  waitingForSpace = true;
}

document.addEventListener("keydown", (e) => {
  if (!waitingForSpace) return;
  if (e.code === "Space") {
    waitingForSpace = false;
    startGame(selectedCourse);
  }
});

// ===============================
//  ゲーム本編
// ===============================

const gameUI = document.getElementById("game-ui");
const timeValue = document.getElementById("time-value");
const scoreValue = document.getElementById("score-value");
const comboValue = document.getElementById("combo-value");
const multiValue = document.getElementById("multi-value");
const currentWordElem = document.getElementById("current-word");
const typeInput = document.getElementById("type-input");

let words = [];
let currentIndex = 0;
let timeLeft = 60;
let timerId = null;
let score = 0;
let combo = 0;
let maxCombo = 0;
let multi = 1;
let isKeepItReal = false;

function getCsvFileForCourse(course) {
  switch (course) {
    case "easy": return "words_easy.csv";
    case "normal": return "words_business.csv";
    case "hard": return "words_it.csv";
    case "expert": return "words_mail.csv";
    default: return "words_easy.csv";
  }
}

async function loadCsv(course) {
  const file = getCsvFileForCourse(course);
  const res = await fetch(file);
  const text = await res.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  return lines.map(line => line.split(",")[0]);
}

async function startGame(course) {
  overlay.classList.add("hidden");

  const name = localStorage.getItem("kir_fullname") || "";
  isKeepItReal = name.toLowerCase().includes("keepitreal");

  words = await loadCsv(course);
  if (words.length === 0) {
    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <div class="main-text">辞書が空です</div>
      <div class="sub-text">${getCsvFileForCourse(course)} を確認してください</div>
    `;
    return;
  }

  gameUI.classList.remove("hidden");
  timeLeft = 60;
  score = 0;
  combo = 0;
  maxCombo = 0;
  multi = 1;
  updateHud();

  currentIndex = 0;
  showNextWord();

  typeInput.value = "";
  typeInput.focus();

  timerId = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHud();
      endGame();
    } else {
      updateHud();
    }
  }, 1000);
}

function updateHud() {
  timeValue.textContent = timeLeft;
  scoreValue.textContent = score;
  comboValue.textContent = combo;
  multiValue.textContent = `x${multi}`;
}

function showNextWord() {
  if (words.length === 0) return;
  currentWordElem.textContent = words[currentIndex];
  currentIndex = (currentIndex + 1) % words.length;
}

typeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const input = typeInput.value.trim();
    const target = currentWordElem.textContent.trim();
    if (!target) return;

    if (input === target) {
      handleCorrect();
    } else {
      handleMiss();
    }
    typeInput.value = "";
    showNextWord();
  }
});

function handleCorrect() {
  if (isKeepItReal) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    if (combo >= 20) {
      multi = 4;
      timeLeft += 10;
    } else if (combo >= 10) {
      multi = 4;
      timeLeft += 5;
    } else if (combo >= 5) {
      multi = 2;
    } else {
      multi = 1;
    }
  } else {
    combo = 0;
    multi = 1;
  }

  score += 10 * multi;
  updateHud();
}

function handleMiss() {
  combo = 0;
  multi = 1;
  updateHud();
}

function endGame() {
  clearInterval(timerId);
  timerId = null;
  gameUI.classList.add("hidden");

  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="main-text">結果</div>
    <div class="sub-text">SCORE：${score}</div>
    <div class="sub-text">MAX COMBO：${maxCombo}</div>
    <button id="retry-btn">タイトルに戻る</button>
  `;

  const retryBtn = document.getElementById("retry-btn");
  retryBtn.addEventListener("click", () => {
    location.reload();
  });
}
