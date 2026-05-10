//------------------------------------------------------
// Supabase 設定
//------------------------------------------------------
const SUPABASE_URL = "https://bznzxcllyocfairwjzzk.supabase.co";
const SUPABASE_KEY = "sb_publishable_vEVMPFsuyISRzeX8helsHA_xO4y1m8e";

async function saveScore(data) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/score_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error("saveScore error", e);
  }
}

async function loadRanking() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/score_logs?select=name,score&order=score.desc&limit=10`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    return await res.json();
  } catch (e) {
    console.error("ranking error", e);
    return [];
  }
}

//------------------------------------------------------
// ゲーム変数
//------------------------------------------------------
let words = [];
let currentWord = "";
let currentRomaji = "";
let timer = 60;
let score = 0;
let totalTyped = 0;
let missCount = 0;
let timerId = null;
let playerName = "";
let isPlaying = false;
let selectedCSV = "";

//------------------------------------------------------
// DOM
//------------------------------------------------------
const title = document.getElementById("title");
const difficultySelect = document.getElementById("difficultySelect");
const game = document.getElementById("game");
const result = document.getElementById("result");
const ranking = document.getElementById("ranking");

const wordEl = document.getElementById("word");
const romajiEl = document.getElementById("romaji");
const timerEl = document.getElementById("timer");
const inputEl = document.getElementById("input");

const scoreText = document.getElementById("scoreText");
const detailText = document.getElementById("detailText");
const rankingList = document.getElementById("rankingList");

const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");
const flash = document.getElementById("flash");

const showRankingBtn = document.getElementById("showRanking");
const retryBtn = document.getElementById("retry");
const backTitleBtn = document.getElementById("backTitle");

//------------------------------------------------------
// 音
//------------------------------------------------------
const hitSound = new Audio("./sounds/hit.mp3?v=1");
const missSound = new Audio("./sounds/beep.mp3?v=1");
const bgm = new Audio("./sounds/music.mp3?v=1");

hitSound.preload = "auto";
missSound.preload = "auto";
bgm.preload = "auto";
bgm.loop = true;

// BGM 最大音量は 0.3
const BGM_MAX = 0.3;

//------------------------------------------------------
// BGM フェード
//------------------------------------------------------
function fadeInBgm(duration = 1500) {
  bgm.volume = 0;
  bgm.currentTime = 0;
  bgm.play();

  const step = 0.03;
  const interval = duration * step;

  const id = setInterval(() => {
    bgm.volume = Math.min(BGM_MAX, bgm.volume + step);
    if (bgm.volume >= BGM_MAX) clearInterval(id);
  }, interval);
}

function fadeOutBgm(duration = 1500) {
  const step = 0.03;
  const interval = duration * step;

  const id = setInterval(() => {
    bgm.volume = Math.max(0, bgm.volume - step);
    if (bgm.volume <= 0) {
      clearInterval(id);
      bgm.pause();
      bgm.currentTime = 0;
    }
  }, interval);
}

//------------------------------------------------------
// 入力欄の選択状態を強制解除（バグ対策）
//------------------------------------------------------
function clearInputSelection() {
  inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
}

//------------------------------------------------------
// CSV 読み込み
//------------------------------------------------------
async function loadWords(csvFile) {
  const res = await fetch(csvFile);
  const text = await res.text();

  const lines = text.trim().split("\n");
  lines.shift(); // ヘッダー削除

  words = lines.map(line => line.trim());
}

//------------------------------------------------------
// 難易度選択
//------------------------------------------------------
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    selectedCSV = btn.dataset.csv;
    playerName = document.getElementById("playerName").value || "名無し";

    await loadWords(selectedCSV);
    startCountdown();
  });
});

//------------------------------------------------------
// Enter キーで開始（難易度選択後）
//------------------------------------------------------
document.addEventListener("keydown", async (e) => {
  if (e.code === "Enter" && title.style.display !== "none") {
    playerName = document.getElementById("playerName").value || "名無し";
  }
});

//------------------------------------------------------
// カウントダウン
//------------------------------------------------------
function startCountdown() {
  title.style.display = "none";
  difficultySelect.style.display = "none";
  countdownOverlay.style.display = "flex";

  let count = 3;
  countdownNumber.textContent = count;

  const id = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
      countdownNumber.style.animation = "none";
      void countdownNumber.offsetWidth;
      countdownNumber.style.animation = "pop 0.6s ease-out";
    } else {
      clearInterval(id);
      countdownOverlay.style.display = "none";
      flashEffect();
      startGame();
    }
  }, 1000);
}

//------------------------------------------------------
// 光エフェクト
//------------------------------------------------------
function flashEffect() {
  flash.classList.add("active");
  setTimeout(() => {
    flash.classList.remove("active");
  }, 300);
}

//------------------------------------------------------
// ゲーム開始
//------------------------------------------------------
function startGame() {
  game.style.display = "block";
  result.style.display = "none";
  ranking.style.display = "none";

  score = 0;
  totalTyped = 0;
  missCount = 0;
  timer = 60;
  isPlaying = true;

  timerEl.textContent = timer;
  nextWord();

  inputEl.value = "";
  inputEl.focus();
  clearInputSelection();

  fadeInBgm(1200);

  timerId = setInterval(() => {
    timer--;
    timerEl.textContent = timer;
    if (timer <= 0) endGame();
  }, 1000);
}

//------------------------------------------------------
// 単語更新（日本語→ローマ字、英語入力も許可）
//------------------------------------------------------
function nextWord() {
  currentWord = words[Math.floor(Math.random() * words.length)];
  wordEl.textContent = currentWord;

  // 日本語 → ローマ字
  let romaji = wanakana.toRomaji(currentWord)
    .replace(/-/g, "")
    .replace(/ /g, "")
    .toLowerCase();

  currentRomaji = romaji;
  romajiEl.textContent = currentRomaji;

  inputEl.value = "";
  clearInputSelection();
}

//------------------------------------------------------
// 入力処理
//------------------------------------------------------
inputEl.addEventListener("input", () => {
  if (!isPlaying) return;

  const val = inputEl.value.toLowerCase();
  totalTyped++;

  // ローマ字一致
  const isRomajiOK = currentRomaji.startsWith(val);

  // 英語入力（server など）
  const isEnglishOK =
    currentWord.match(/^[ァ-ヶー]+$/) &&
    val.length > 0 &&
    wanakana.toKatakana(val) === currentWord;

  if (isRomajiOK || isEnglishOK) {
    hitSound.currentTime = 0;
    hitSound.play();

    if (val === currentRomaji || isEnglishOK) {
      score++;
      inputEl.value = "";
      clearInputSelection();
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
  if (!isPlaying) return;
  isPlaying = false;

  clearInterval(timerId);
  fadeOutBgm(1200);

  game.style.display = "none";
  result.style.display = "block";

  const accuracy = totalTyped > 0 ? score / totalTyped : 0;

  scoreText.textContent = `スコア：${score}`;
  detailText.textContent =
    `総タイプ数：${totalTyped} / ミス：${missCount} / 正確率：${(accuracy * 100).toFixed(1)}%`;

  saveScore({
    name: playerName,
    score: score,
    total: totalTyped,
    miss: missCount,
    accuracy: accuracy,
    mode: selectedCSV
  });
}

//------------------------------------------------------
// ランキング表示
//------------------------------------------------------
showRankingBtn.addEventListener("click", async () => {
  result.style.display = "none";
  ranking.style.display = "block";

  const data = await loadRanking();

  rankingList.innerHTML = data
    .map((r, i) => `${i + 1}位　${r.name}　${r.score}`)
    .join("<br>");
});

//------------------------------------------------------
// タイトルへ戻る
//------------------------------------------------------
backTitleBtn.addEventListener("click", () => {
  ranking.style.display = "none";
  title.style.display = "block";
  difficultySelect.style.display = "block";
});

//------------------------------------------------------
// リトライ
//------------------------------------------------------
retryBtn.addEventListener("click", () => {
  result.style.display = "none";
  title.style.display = "block";
  difficultySelect.style.display = "block";
});
