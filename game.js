// ===== CSV URL =====
const CSV_URL =
  "https://b750490c-c969-4351-92b6-891d5a1963a7.usrfiles.com/ugd/b75049_34112729c0a747dfbc3f10f81ff276ad.csv";

// ===== CSV 読み込み =====
async function loadWords() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const words = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const [jp, kana, romaji, english] = cols;
    words.push({
      jp,
      kana,
      romaji: [romaji],
      english: english ? [english] : []
    });
  }
  return words;
}

// ===== ローマ字→ひらがな変換テーブル（簡易 A-2） =====
const ROMAJI_TABLE = {
  a:"あ", i:"い", u:"う", e:"え", o:"お",
  ka:"か", ki:"き", ku:"く", ke:"け", ko:"こ",
  ca:"か", cu:"く", co:"こ",
  sa:"さ", si:"し", shi:"し", su:"す", se:"せ", so:"そ", ci:"し",
  ta:"た", ti:"ち", chi:"ち", tu:"つ", tsu:"つ", te:"て", to:"と",
  na:"な", ni:"に", nu:"ぬ", ne:"ね", no:"の",
  ha:"は", hi:"ひ", hu:"ふ", fu:"ふ", he:"へ", ho:"ほ",
  ma:"ま", mi:"み", mu:"む", me:"め", mo:"も",
  ya:"や", yu:"ゆ", yo:"よ",
  ra:"ら", ri:"り", ru:"る", re:"れ", ro:"ろ",
  wa:"わ", wo:"を",
  ga:"が", gi:"ぎ", gu:"ぐ", ge:"げ", go:"ご",
  za:"ざ", zi:"じ", ji:"じ", zu:"ず", ze:"ぜ", zo:"ぞ",
  da:"だ", di:"ぢ", du:"づ", de:"で", do:"ど",
  ba:"ば", bi:"び", bu:"ぶ", be:"べ", bo:"ぼ",
  pa:"ぱ", pi:"ぴ", pu:"ぷ", pe:"ぺ", po:"ぽ",
  kya:"きゃ", kyu:"きゅ", kyo:"きょ",
  sha:"しゃ", shu:"しゅ", sho:"しょ",
  sya:"しゃ", syu:"しゅ", syo:"しょ",
  cha:"ちゃ", chu:"ちゅ", cho:"ちょ",
  tya:"ちゃ", tyu:"ちゅ", tyo:"ちょ",
  nya:"にゃ", nyu:"にゅ", nyo:"にょ",
  hya:"ひゃ", hyu:"ひゅ", hyo:"ひょ",
  mya:"みゃ", myu:"みゅ", myo:"みょ",
  rya:"りゃ", ryu:"りゅ", ryo:"りょ",
  gya:"ぎゃ", gyu:"ぎゅ", gyo:"ぎょ",
  ja:"じゃ", ju:"じゅ", jo:"じょ",
  bya:"びゃ", byu:"びゅ", byo:"びょ",
  pya:"ぴゃ", pyu:"ぴゅ", pyo:"ぴょ",
  xa:"ぁ", xi:"ぃ", xu:"ぅ", xe:"ぇ", xo:"ぉ",
  xya:"ゃ", xyu:"ゅ", xyo:"ょ",
  xtu:"っ", xtsu:"っ", ltsu:"っ",
  n:"ん", nn:"ん", "n'":"ん",
  "-":"ー"
};

function romajiToHiragana(input) {
  let result = "";
  let i = 0;
  const s = input.toLowerCase();

  while (i < s.length) {
    let matched = false;

    if (i + 1 < s.length && s[i] === s[i + 1] && /[bcdfghjklmnpqrstvwxyz]/.test(s[i])) {
      result += "っ";
      i++;
      continue;
    }

    for (let len = 3; len >= 1; len--) {
      const chunk = s.slice(i, i + len);
      if (ROMAJI_TABLE[chunk]) {
        result += ROMAJI_TABLE[chunk];
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += s[i];
      i++;
    }
  }
  return result;
}

// ===== Web Audio API（ヒット／ミス音） =====
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playHitSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playMissSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

// ===== DOM =====
const wordEl = document.getElementById("word");
const readingEl = document.getElementById("reading");
const inputEl = document.getElementById("inputEL");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

// ===== ゲーム状態 =====
let WORDS = [];
let currentWord = null;
let remainingKana = "";
let score = 0;
let timeLeft = 60.0;
let timerId = null;
let isPlaying = false;

// ===== 単語選択 =====
function pickWord() {
  const idx = Math.floor(Math.random() * WORDS.length);
  return WORDS[idx];
}

function setNewWord() {
  currentWord = pickWord();
  remainingKana = currentWord.kana;
  wordEl.textContent = currentWord.jp;
  readingEl.textContent = remainingKana;
  inputEl.value = "";
  inputEl.className = "";
}

// ===== タイマー =====
function updateTimer() {
  timeLeft -= 0.1;
  if (timeLeft < 0) timeLeft = 0;
  timerEl.textContent = `残り時間: ${timeLeft.toFixed(1)} 秒`;
  if (timeLeft <= 0) endGame();
}

// ===== ゲーム開始 =====
function startGame() {
  if (isPlaying || WORDS.length === 0) return;
  isPlaying = true;
  score = 0;
  timeLeft = 60.0;
  scoreEl.textContent = `スコア: ${score}`;
  timerEl.textContent = `残り時間: ${timeLeft.toFixed(1)} 秒`;
  startBtn.style.display = "none";
  retryBtn.style.display = "none";
  inputEl.disabled = false;
  inputEl.focus();
  setNewWord();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(updateTimer, 100);
}

// ===== ゲーム終了 =====
function endGame() {
  isPlaying = false;
  inputEl.disabled = true;
  clearInterval(timerId);
  wordEl.textContent = "終了！";
  readingEl.textContent = "";
  retryBtn.style.display = "inline-block";
}

// ===== 入力処理 =====
function handleInput() {
  if (!isPlaying || !currentWord) return;

  const typed = inputEl.value.toLowerCase();

  // 英語スペル完全一致
  if (currentWord.english && currentWord.english.includes(typed)) {
    score += currentWord.kana.length;
    scoreEl.textContent = `スコア: ${score}`;
    playHitSound();
    setNewWord();
    inputEl.value = "";
    return;
  }

  // ローマ字→ひらがな
  const typedKana = romajiToHiragana(typed);

  if (currentWord.kana.startsWith(typedKana)) {
    inputEl.className = "hit";

    const consumed = typedKana.length;
    remainingKana = currentWord.kana.slice(consumed);
    readingEl.textContent = remainingKana;

    score += consumed;
    scoreEl.textContent = `スコア: ${score}`;

    playHitSound();
    inputEl.value = "";

    if (remainingKana.length === 0) setNewWord();
  } else {
    inputEl.className = "miss";
    playMissSound();
  }
}

// ===== イベント =====
inputEl.addEventListener("input", handleInput);

startBtn.addEventListener("click", () => {
  audioCtx.resume();
  startGame();
});

retryBtn.addEventListener("click", () => {
  audioCtx.resume();
  startGame();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !isPlaying) {
    e.preventDefault();
    audioCtx.resume();
    startGame();
  }
});

// ===== 起動時：CSV 読み込み =====
loadWords().then(data => {
  WORDS = data;
  console.log("WORDS loaded:", WORDS.length);
});
