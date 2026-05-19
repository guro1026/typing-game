// ===============================
//  4言語巨大フェードイン
// ===============================

const lines = [
  "最速は誰だ！！スピードキングを目指せ！",
  "Who is the fastest? Aim for the Speed King!",
  "Qui est le plus rapide ? Deviens le Speed King !",
  "Chi è il più veloce? Punta al Speed King!"
];

const lineElems = [
  document.getElementById("line1"),
  document.getElementById("line2"),
  document.getElementById("line3"),
  document.getElementById("line4")
];

// 1文字ずつフェードイン（1文字5秒）
async function fadeInLine(text, elem) {
  elem.innerHTML = "";

  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.textContent = text[i];
    span.style.opacity = 0;
    span.style.transition = "opacity 5s linear";
    elem.appendChild(span);

    // 少し遅れてフェードイン開始
    setTimeout(() => {
      span.style.opacity = 1;
    }, 50);

    // 次の文字まで5秒待つ
    await new Promise(res => setTimeout(res, 5000));
  }
}

// 4行を順番にフェードイン（常に表示）
async function startFadeIn() {
  for (let i = 0; i < lines.length; i++) {
    await fadeInLine(lines[i], lineElems[i]);
  }
}

startFadeIn();


// ===============================
//  名前入力処理
// ===============================

const nameInput = document.getElementById("fullname");
const nameBtn = document.getElementById("name-confirm");
const nameError = document.getElementById("name-error");
const courseContainer = document.getElementById("course-container");

// 既存の名前があれば自動入力
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
//  コース選択 → ゲーム開始
// ===============================

document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const course = btn.dataset.course;
    hideTitleScreen();
    startGame(course);
  });
});

function hideTitleScreen() {
  const title = document.querySelector(".title-logo");
  if (title) title.style.display = "none";

  const fade = document.getElementById("fadein-container");
  if (fade) fade.style.display = "none";

  const nameBox = document.getElementById("name-container");
  if (nameBox) nameBox.style.display = "none";

  const courseBox = document.getElementById("course-container");
  if (courseBox) courseBox.style.display = "none";
}


// ===============================
//  ゲーム開始（仮UI）
// ===============================

function startGame(course) {
  const name = localStorage.getItem("kir_fullname") || "NO_NAME";

  const gameArea = document.createElement("div");
  gameArea.id = "game-area";
  gameArea.innerHTML = `
    <div>${name}</div>
    <div style="margin-top:10px;">コース：${course}</div>
    <div style="margin-top:20px;">ここからゲーム本編を実装</div>
  `;
  document.body.appendChild(gameArea);

  // ここに本編ロジックを統合していく
}
