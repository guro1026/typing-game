// ===============================
//  TYPE-ATTACK（サブタイトル1行）
// ===============================

const mainLine = "最速は誰だ！！スピードキングを目指せ！";
const mainElem = document.getElementById("catch-main");

async function typeAttack(line, elem) {
  elem.innerHTML = "";
  const chars = line.split("");
  const totalTime = 5000;
  const perChar = totalTime / chars.length;

  const spans = chars.map(c => {
    const span = document.createElement("span");
    span.textContent = c;
    span.style.opacity = 0;
    span.style.display = "inline-block";
    span.style.transform = "scale(0.8)";
    span.style.transition = `opacity 0.1s linear, transform 0.12s ease-out`;
    span.style.color = "#ffffff";
    elem.appendChild(span);
    return span;
  });

  const order = [...Array(chars.length).keys()].sort(() => Math.random() - 0.5);

  for (let i = 0; i < order.length; i++) {
    const idx = order[i];
    const span = spans[idx];

    span.style.opacity = 1;
    span.style.transform = "scale(1.15)";

    setTimeout(() => {
      span.style.transform = "scale(1.0)";
    }, 100);

    await new Promise(res => setTimeout(res, perChar));
  }
}

typeAttack(mainLine, mainElem);


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

  localStorage.setItem("kir_fullname", name);
  nameError.textContent = "";
  courseContainer.classList.remove("hidden");
});


// ===============================
//  コース選択 → READY
// ===============================

document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const course = btn.dataset.course;
    hideTitleScreen();
    showReadyScreen(course);
  });
});

function hideTitleScreen() {
  document.querySelector(".title-logo").style.display = "none";
  document.getElementById("catch-container").style.display = "none";
  document.getElementById("multi-lang").style.display = "none";
  document.getElementById("name-container").style.display = "none";
  document.getElementById("course-container").style.display = "none";
}

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
  if (waitingForSpace && e.code === "Space") {
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
  }
}

async function loadCsv(course) {
  const file = getCsvFileForCourse(course);
  const res = await fetch(file);
  const text = await res.text();
  return text.split(/\r?\n/).map(l => l.trim()).filter(l => l).map(l => l.split(",")[0]);
}

async function startGame(course) {
  overlay.classList.add("hidden");

  const name = localStorage.getItem("kir_fullname") || "";
  isKeepItReal = name.toLowerCase().includes("keepitreal");

  words = await loadCsv(course);

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
    } else updateHud();
  }, 1000);
}

function updateHud() {
  timeValue.textContent = timeLeft;
  scoreValue.textContent = score;
  comboValue.textContent = combo;
  multiValue.textContent = `x${multi}`;
}

function showNextWord() {
  currentWordElem.textContent = words[currentIndex];
  currentIndex = (currentIndex + 1) % words.length;
}

typeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const input = typeInput.value.trim();
    const target = currentWordElem.textContent.trim();

    if (input === target) handleCorrect();
    else handleMiss();

    typeInput.value = "";
    showNextWord();
  }
});

function handleCorrect() {
  if (isKeepItReal) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    if (combo >= 20) { multi = 4; timeLeft += 10; }
    else if (combo >= 10) { multi = 4; timeLeft += 5; }
    else if (combo >= 5) multi = 2;
    else multi = 1;

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
  gameUI.classList.add("hidden");

  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="main-text">結果</div>
    <div class="sub-text">SCORE：${score}</div>
    <div class="sub-text">MAX COMBO：${maxCombo}</div>
    <button id="retry-btn">タイトルに戻る</button>
  `;

  document.getElementById("retry-btn").addEventListener("click", () => {
    location.reload();
  });
}
