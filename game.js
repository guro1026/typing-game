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
// 漢字 → ひらがな辞書（CSV読み込み）
//------------------------------------------------------
let kanjiDict = {};

async function loadKanjiDict() {
  const res = await fetch("kanji_dict.csv");
  const text = await res.text();

  const lines = text.replace(/^\uFEFF/, "").trim().split("\n");
  lines.shift();

  lines.forEach(line => {
    const [kanji, hira] = line.split(",");
    if (kanji && hira) kanjiDict[kanji] = hira;
  });
}

function toHiraganaFull(text) {
  let result = text;

  for (const [kanji, hira] of Object.entries(kanjiDict)) {
    result = result.replaceAll(kanji, hira);
  }

  return wanakana.toHiragana(result);
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
let combo = 0;
let maxCombo = 0;

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

const readyGoOverlay = document.getElementById("readyGoOverlay");
const readyGoText = document.getElementById("readyGoText");

const flash = document.getElementById("flash");
const comboEl = document.getElementById("combo");

const showRankingBtn = document.getElementById("showRanking");
const retryBtn = document.getElementById("retry");
const backTitleBtn = document.getElementById("backTitle");

//------------------------------------------------------
// 音
//------------------------------------------------------
const hitSound = new Audio("./sounds/hit.mp3?v=1");
const missSound = new Audio("./sounds/beep.mp3?v=1");
const bgm = new Audio("./sounds/music.mp3?v=1");

bgm.loop = true;
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
// IME 強制オフ
//------------------------------------------------------
inputEl.setAttribute("inputmode", "latin");
inputEl.setAttribute("autocomplete", "off");
inputEl.setAttribute("autocorrect", "off");
inputEl.setAttribute("autocapitalize", "off");
inputEl.setAttribute("spellcheck", "false");

inputEl.addEventListener("compositionstart", (e) => {
  e.preventDefault();
});

//------------------------------------------------------
// CSV 読み込み
//------------------------------------------------------
async function loadWords(csvFile) {
  const res = await fetch(csvFile);
  const text = await res.text();

  const lines = text.replace(/^\uFEFF/, "").trim().split("\n");
  lines.shift();

  words = lines.map(line => line.trim());
}

//------------------------------------------------------
// 難易度選択（色変化＋メッセージ）
//------------------------------------------------------
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", async () => {

    document.querySelectorAll(".diff-btn").forEach(b => {
      b.classList.remove("selected");
      b.style.transform = "scale(1)";
    });

    btn.classList.add("selected");

    selectedCSV = btn.dataset.csv;

    await loadKanjiDict();
    await loadWords(selectedCSV);

    const modeName =
      selectedCSV.includes("easy") ? "挨拶編" :
      selectedCSV.includes("business") ? "ビジネス用語" :
      selectedCSV.includes("it") ? "IT用語" : "選択したモード";

    alert(`${modeName}を選びました。\nEnter を押すとゲームがスタートします。`);
  });
});

//------------------------------------------------------
// Enter キーでゲーム開始
//------------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  const name = document.getElementById("playerName").value.trim();

  if (!name) {
    alert("名前を入力してください。");
    return;
  }

  if (!selectedCSV) {
    alert("難易度を選んでください。");
    return;
  }

  playerName = name;
  startCountdown();
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
      showReadyGo();
    }
  }, 1000);
}

//------------------------------------------------------
// Ready → Go! 演出
//------------------------------------------------------
function showReadyGo() {
  readyGoOverlay.style.display = "flex";

  readyGoText.textContent = "Ready";
  readyGoText.style.animation = "pop 0.6s ease-out";

  setTimeout(() => {
    readyGoText.textContent = "Go!";
    readyGoText.style.animation = "pop 0.6s ease-out";
  }, 700);

  setTimeout(() => {
    readyGoOverlay.style.display = "none";
    startGame();
  }, 1300);
}

//------------------------------------------------------
// 光エフェクト
//------------------------------------------------------
function flashEffect() {
  flash.classList.add("active");
  setTimeout(() => flash.classList.remove("active"), 300);
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
  combo = 0;
  maxCombo = 0;
  timer = 60;
  isPlaying = true;

  timerEl.textContent = timer;
  nextWord();

  inputEl.value = "";
  inputEl.focus();

  fadeInBgm(1200);

  timerId = setInterval(() => {
    timer--;
    timerEl.textContent = timer;
    if (timer <= 0) endGame();
  }, 1000);
}

//------------------------------------------------------
// 単語更新（漢字→ひらがな→ローマ字）
//------------------------------------------------------
function nextWord() {
  currentWord = words[Math.floor(Math.random() * words.length)];
  wordEl.textContent = currentWord;

  let hira = toHiraganaFull(currentWord);

  currentRomaji = wanakana.toRomaji(hira)
    .replace(/-/g, "")
    .replace(/ /g, "")
    .toLowerCase();

  romajiEl.textContent = currentRomaji;
  inputEl.value = "";
}

//------------------------------------------------------
// コンボ表示
//------------------------------------------------------
function showCombo() {
  if (combo < 2) {
    comboEl.style.display = "none";
    return;
  }

  comboEl.style.display = "block";
  comboEl.textContent = combo + " Combo!";

  comboEl.style.transform = "scale(1.3)";
  setTimeout(() => comboEl.style.transform = "scale(1)", 150);
}

//------------------------------------------------------
// 入力処理（寿司打方式＋コンボ）
//------------------------------------------------------
inputEl.addEventListener("input", () => {
  if (!isPlaying) return;

  const val = inputEl.value.toLowerCase();
  totalTyped++;

  if (currentRomaji.startsWith(val)) {
    hitSound.currentTime = 0;
    hitSound.play();

    if (val === currentRomaji) {
      score++;

      combo++;
      maxCombo = Math.max(maxCombo, combo);
      showCombo();

      if (combo % 5 === 0) hitSound.playbackRate = 1.4;
      else hitSound.playbackRate = 1.0;

      if (combo % 10 === 0) flashEffect();

      inputEl.value = "";
      nextWord();
    }
  } else {
    missCount++;
    combo = 0;
    comboEl.style.display = "none";

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
    `総タイプ数：${totalTyped} / ミス：${missCount} / 最大コンボ：${maxCombo} / 正確率：${(accuracy * 100).toFixed(1)}%`;

  saveScore({
    name: playerName,
    score: score,
    total: totalTyped,
    miss: missCount,
    accuracy: accuracy,
    maxCombo: maxCombo,
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
// 管理者用：複合語対応 辞書自動生成
generateDictBtn.addEventListener("click", () => {
  const text = dictSrc.value.trim();
  if (!text) {
    alert("CSVテキストを入力してください。");
    return;
  }

  const lines = text.split("\n");
  const dict = {};

  lines.forEach(line => {
    const word = line.trim();
    if (!word) return;

    // ひらがな化（漢字はそのまま残る）
    const hiraAll = wanakana.toHiragana(word);

    let i = 0;
    while (i < word.length) {
      if (wanakana.isKanji(word[i])) {
        // ★複合語として漢字が続く部分を抽出
        let j = i;
        let kanji = "";
        while (j < word.length && wanakana.isKanji(word[j])) {
          kanji += word[j];
          j++;
        }

        // ★複合語の読みを生成
        const hira = wanakana.toHiragana(kanji);

        // ★辞書に登録（重複は無視）
        if (!dict[kanji]) {
          dict[kanji] = hira;
        }

        i = j;
      } else {
        i++;
      }
    }
  });

  // CSV 出力
  let output = "kanji,hiragana\n";
  for (const [k, v] of Object.entries(dict)) {
    output += `${k},${v}\n`;
  }

  dictOut.value = output;
  alert("複合語対応の辞書を生成しました！");
});
