//------------------------------------------------------
// Supabase 設定
//------------------------------------------------------
const SUPABASE_URL = "https://bznzxcllyocfairwjzzk.supabase.co";
const SUPABASE_KEY = "sb_publishable_vEVMPFsuyISRzeX8helsHA_xO4y1m8e";

async function saveScore(data) {
  await fetch(`${SUPABASE_URL}/rest/v1/score_logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(data)
  });
}

//------------------------------------------------------
// ゲーム変数
//------------------------------------------------------
const words = [
  "server", "database", "frontend", "backend", "router",
  "javascript", "python", "docker", "cloud", "security",
  "function", "variable", "object", "class", "module"
];

let currentWord = "";
let currentRomaji = "";
let timer = 60;
let score = 0;
let totalTyped = 0;
let missCount = 0;
let timerId = null;
let playerName = "";

//------------------------------------------------------
// DOM
//------------------------------------------------------
const title = document.getElementById("title");
const game = document.getElementById("game");
const result = document.getElementById("result");

const wordEl = document.getElementById("word");
const romajiEl = document.getElementById("romaji");
const timerEl = document.getElementById("timer");
const inputEl = document.getElementById("input");

const scoreText = document.getElementById("scoreText");
const detailText = document.getElementById("detailText");
const retryBtn = document.getElementById("retry");

//------------------------------------------------------
// 音
//------------------------------------------------------
const hitSound = new Audio("sounds/hit.mp3");
const missSound = new Audio("sounds/miss.mp3");
const bgm = new Audio("sounds/bgm.mp3");
bgm.loop = true;

//------------------------------------------------------
// ゲーム開始
//------------------------------------------------------
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && title.style.display !== "none") {
    playerName = document.getElementById("playerName").value || "名無し";
    startGame();
  }
});

function startGame() {
  title.style.display = "none";
  game.style.display = "block";

  score = 0;
  totalTyped = 0;
  missCount = 0;
  timer = 60;

  nextWord();
  inputEl.value = "";
  inputEl.focus();

  bgm.currentTime = 0;
  bgm.play();

  timerId = setInterval(() => {
    timer--;
    timerEl.textContent = timer;
    if (timer <= 0) endGame();
  }, 1000);
}

//------------------------------------------------------
// 単語更新
//------------------------------------------------------
function nextWord() {
  currentWord = words[Math.floor(Math.random() * words.length)];
  currentRomaji = currentWord; // 簡易ローマ字（必要なら A-2 に差し替え）
  wordEl.textContent = currentWord;
  romajiEl.textContent = currentRomaji;
}

//------------------------------------------------------
// 入力処理
//------------------------------------------------------
inputEl.addEventListener("input", () => {
  const val = inputEl.value;
  totalTyped++;

  if (currentRomaji.startsWith(val)) {
    hitSound.currentTime = 0;
    hitSound.play();

    if (val === currentRomaji) {
      score++;
      inputEl.value = "";
      nextWord();
    }
  } else {
    missCount++;
    missSound.currentTime = 0;
    missSound.play();
  }
});

//------------------------------------------------------
// ゲーム終了
//------------------------------------------------------
function endGame() {
  clearInterval(timerId);
  game.style.display = "none";
  result.style.display = "block";

  bgm.pause();
  bgm.currentTime = 0;

  const accuracy = totalTyped > 0 ? score / totalTyped : 0;

  scoreText.textContent = `スコア：${score}`;
  detailText.textContent =
    `総タイプ数：${totalTyped} / ミス：${missCount} / 正確率：${(accuracy * 100).toFixed(1)}%`;

  // Supabase に保存
  saveScore({
    name: playerName,
    score: score,
    total: totalTyped,
    miss: missCount,
    accuracy: accuracy,
    mode: "romaji"
  });
}

//------------------------------------------------------
// リトライ
//------------------------------------------------------
retryBtn.addEventListener("click", () => {
  result.style.display = "none";
  title.style.display = "block";
});
