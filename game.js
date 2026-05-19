// 多言語テキスト
const texts = [
  "最速は誰だ！！スピードキングを目指せ！",
  "Who is the fastest? Aim for the Speed King!",
  "Qui est le plus rapide ? Deviens le Speed King !",
  "Chi è il più veloce? Punta al Speed King!"
];

const fadeContainer = document.getElementById("fadein-container");

// ランダムフェードイン処理
async function fadeInText(text) {
  fadeContainer.innerHTML = "";
  const chars = text.split("");

  // ランダム順に並び替え
  const order = [...Array(chars.length).keys()].sort(() => Math.random() - 0.5);

  // 空の文字を先に配置
  chars.forEach(() => {
    const span = document.createElement("span");
    span.style.opacity = 0;
    span.style.display = "inline-block";
    span.style.transition = "0.3s";
    fadeContainer.appendChild(span);
  });

  // ランダム順にフェードイン
  for (let i = 0; i < order.length; i++) {
    const index = order[i];
    const span = fadeContainer.children[index];
    span.textContent = chars[index];
    span.style.opacity = 1;
    span.style.transform = "scale(1.2)";
    setTimeout(() => {
      span.style.transform = "scale(1)";
    }, 200);
    await new Promise(res => setTimeout(res, 120));
  }

  await new Promise(res => setTimeout(res, 800));
}

// 全言語を順番にフェードイン
async function startFadeIn() {
  for (let t of texts) {
    await fadeInText(t);
  }
}
startFadeIn();


// 名前入力処理
const nameInput = document.getElementById("fullname");
const nameBtn = document.getElementById("name-confirm");
const nameError = document.getElementById("name-error");
const courseContainer = document.getElementById("course-container");

// 既存の名前があれば自動入力
if (localStorage.getItem("kir_fullname")) {
  nameInput.value = localStorage.getItem("kir_fullname");
  courseContainer.classList.remove("hidden");
}

nameBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();

  // フルネーム（姓＋名）チェック
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
