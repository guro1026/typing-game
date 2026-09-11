// ============================
// Supabase 初期化
// ============================

// ▼ Supabase プロジェクトの URL（あなた専用のエンドポイント）
//   Supabase の「プロジェクト設定 → API」から取得したもの。
//   ここは絶対に変更しない。
const SUPABASE_URL = "https://bznzxcllyocfairwjzzk.supabase.co";

// ▼ Publishable Key（anon key）
//   公開しても問題ないキー（RLS が有効なら安全）。
//   フロントエンドから INSERT / SELECT を行うために使用。
const SUPABASE_KEY = "sb_publishable_vEVMPFsuyISRzeX8helsHA_xO4y1m8e";

// ▼ Supabase クライアント作成
//   - index.html 側で supabase-js（CDN）が読み込まれている前提
//   - window.supabase を上書きしないように、変数名は client にする
//   - createClient() が undefined の場合は「読み込み順」が間違っている
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);



// ============================
// 状態管理（ゲーム全体の進行を管理）
// ============================

// ▼ 現在の画面状態
//   title   : タイトル画面
//   loading : CSV読み込み中
//   playing : ゲーム中
//   end     : 結果画面
let state = "title";

// ▼ 選択されたコース（easy / business / it / mail）
let selectedCourse = null;

// ▼ CSVから読み込んだお題リスト（{jp, romaji} の配列）
let words = [];

// ▼ 現在表示中の日本語（画面上に出ているお題）
let currentJP = "";

// ▼ 現在入力すべきローマ字（残り）
//   例：originalRomaji = "konnichiwa"
//       currentRomaji  = "nniichiwa"（k を入力した後）
let currentRomaji = "";

// ▼ お題の元のローマ字（弱点分析などに使う想定）
//   currentRomaji は減っていくので、元データを保持しておく
let originalRomaji = "";

let score = 0;                // スコア
let combo = 0;                // 現在コンボ数（お題クリア数ベース）
let maxCombo = 0;             // 最大コンボ
let timeLeft = 60;            // 残り時間（秒）
let timerInterval = null;     // タイマーID

// 弱点分析用のカウンタ
let totalTyped = 0;           // 総打鍵数
let missCount = 0;            // ミス総数
let missVowel = 0;            // 母音ミス数
let missConsonant = 0;        // 子音ミス数
let missYouon = 0;            // 拗音系ミス数（ここでは 'y' を含む文字などを簡易的に扱う）

// ============================
// BGM
// ============================
const bgm = new Audio("sounds/bgm.mp3");
bgm.loop = true;
bgm.volume = 0;

// 自動再生ブロック対策：ユーザー操作があるまで待つ
bgm.play().catch(() => {
  const once = () => {
    bgm.play().catch(() => {});
    document.removeEventListener("click", once);
    document.removeEventListener("keydown", once);
  };
  document.addEventListener("click", once);
  document.addEventListener("keydown", once);
});

// 音量スライダー（タイトル画面とゲーム画面で同期）
const volumeSliderTitle = document.getElementById("volume-slider");
const volumeSliderGame = document.getElementById("volume-slider-game");

// 音量を同期させる関数
function syncVolumeSlider(v) {
  bgm.volume = v / 100;
  volumeSliderTitle.value = v;
  volumeSliderGame.value = v;
}

// スライダー操作イベント
volumeSliderTitle.addEventListener("input", () => {
  syncVolumeSlider(volumeSliderTitle.value);
});
volumeSliderGame.addEventListener("input", () => {
  syncVolumeSlider(volumeSliderGame.value);
});

// ============================
// 効果音
// ============================
const seHit = new Audio("sounds/hit.mp3");
seHit.volume = 0.6;

const seBeep = new Audio("sounds/beep.mp3");
seBeep.volume = 0.6;

// ============================
// ESCでタイトルへ戻る
// ============================
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    returnToTitle();
  }
});

// タイトル画面へ戻す処理
function returnToTitle() {
  if (timerInterval) clearInterval(timerInterval);

  state = "title";
  score = 0;
  combo = 0;
  maxCombo = 0;
  timeLeft = 60;

  // BGM音量を0に戻す（タイトルに戻ったら無音スタート）
  syncVolumeSlider(0);

  document.getElementById("game-screen").style.display = "none";
  document.getElementById("title-screen").style.display = "block";

  updateHUD();
}

// ============================
// 名前入力（自由入力版）
// ============================
// ルール：空でなければOK（フルネーム強制はやめる）
document.getElementById("name-submit").addEventListener("click", validateName);

function validateName() {
  const input = document.getElementById("name-input");
  const error = document.getElementById("name-error");
  const name = input.value.trim();

  // 空文字だけ禁止。それ以外は自由（漢字・ひらがな・カタカナ・英字・記号などOK）
  if (name === "") {
    error.textContent = "※ 名前を入力してください";
    input.classList.add("error");
    seBeep.currentTime = 0;
    seBeep.play();
    return;
  }

  // エラー解除
  input.classList.remove("error");
  error.textContent = "";

  // 名前を保存（結果画面・Supabase用）
  localStorage.setItem("playerName", name);

  // 名前入力エリアを隠してコース選択ボタンを表示
  document.getElementById("name-area").style.display = "none";
  document.getElementById("course-buttons").style.display = "block";
}

// ============================
// コース選択
// ============================
document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedCourse = btn.dataset.course;
    startGame();
  });
});

// ============================
// ゲーム開始
// ============================
function startGame() {
  state = "loading";

  // 画面切り替え：タイトル → ゲーム
  document.getElementById("title-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  
  
// ============================
// ★ 名前から性別を判定してキャラ・背景・気弾を切り替える
// ============================
const playerName = localStorage.getItem("playerName") || "";
const character = document.getElementById("character");
const kiBall = document.getElementById("ki-ball");
const bgLayer = document.getElementById("bg-layer");

fetch("employee_list.csv")
  .then(res => res.text())
  .then(text => {
    const lines = text.trim().split("\n").slice(1);
    let gender = "male";

    for (const line of lines) {
      const [name, g] = line.split(",").map(s => s.trim());
      if (name === playerName) {
        gender = g;
        break;
      }
    }

    // ★★★ ここに移動する（fetch の中）
    localStorage.setItem("gender", gender);

    // ★ キャラ画像
    if (gender === "female") {
      character.src = "images/character/women/kiball_woman.png";
      document.body.classList.add("pink-theme");
    } else {
      character.src = "images/character/men/kiball_man.png";
      document.body.classList.remove("pink-theme");
    }

    // ★ 背景
    if (gender === "female") {
      bgLayer.style.backgroundImage = 'url("images/bg/game_bg_woman.png")';
    } else {
      bgLayer.style.backgroundImage = 'url("images/bg/game_bg_man.png")';
    }

    // ★ 気弾
    if (gender === "female") {
      kiBall.style.backgroundImage = 'url("images/kiball/pink.png")';
    } else {
      kiBall.style.backgroundImage = 'url("images/kiball/blue.png")';
    }
  });



  // 各種ステータス初期化
  score = 0;
  combo = 0;
  maxCombo = 0;
  timeLeft = 60;

  totalTyped = 0;
  missCount = 0;
  missVowel = 0;
  missConsonant = 0;
  missYouon = 0;

  updateHUD();

  // 気弾初期化（色は常に青、サイズだけ変化させる）
  kiPower = 0;
  const ball = document.getElementById("ki-ball");
  ball.classList.remove("white", "gold", "pulse");
  ball.classList.add("blue");
  ball.style.transform = "translate(-50%, -50%) scale(0.02)";

  // タイマー開始 & CSV読み込み
  startTimer();
  loadCSV(selectedCourse);
}

// ============================
// タイマー
// ============================
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

// ============================
// HUD更新
// ============================
function updateHUD() {
  document.getElementById("hud-score").textContent = score;
  document.getElementById("hud-combo").textContent = combo;
  document.getElementById("hud-time").textContent = timeLeft;
}

// ============================
// 表示更新（お題の日本語＆ローマ字）
// ============================
function updateDisplay() {
  document.getElementById("word-jp").textContent = currentJP;
  document.getElementById("word-romaji").textContent = currentRomaji;
}

// ============================
// CSV読み込み
// ============================
// words_◯◯.csv を読み込み、2行目以降をお題として使う
function loadCSV(course) {
  fetch(`words_${course}.csv`)
    .then(res => res.text())
    .then(text => {
      const lines = text.trim().split("\n");
      words = lines.slice(1).map(line => line.trim()); // 1行目はヘッダー想定
      nextWord();
    });
}

// ============================
// 次の単語へ
// ============================
function nextWord() {
  if (timeLeft <= 0) return; // 時間切れなら何もしない

  // ランダムに1行選ぶ
  const line = words[Math.floor(Math.random() * words.length)].trim();
  const cols = line.split(",").map(c => c.trim());

  currentJP = cols[0] || "";
  currentRomaji = cols[2] || "";   // CSVは3列想定：日本語,かな,ローマ字
  originalRomaji = currentRomaji;  // 元のローマ字を保持（必要なら分析用に使える）

  updateDisplay();
  state = "playing";
}
// ============================
// キー入力処理（スコア・コンボ・覚醒倍率・弱点分析）
// ============================
document.addEventListener("keydown", e => {
  if (state !== "playing") return;
  if (timeLeft <= 0) return;

  const key = e.key.toLowerCase();
  const target = currentRomaji[0]?.toLowerCase();

  // 総打鍵数カウント（弱点分析用）
  totalTyped++;

  // キーボード光演出
  highlightKey(e.key);

  if (!target) return;

  // ============================
  // 正解入力
  // ============================
  if (key === target) {
    seHit.currentTime = 0;
    seHit.play();

    // 次の文字へ
    currentRomaji = currentRomaji.slice(1);
    updateDisplay();

    // ----------------------------
    // ★ 通常コンボ倍率
    // ----------------------------
    let add = 1;
    if (combo >= 5) add = 5;
    else if (combo >= 3) add = 3;

    // ----------------------------
    // ★ 覚醒倍率（10 / 15 / 20 コンボ達成の瞬間だけ）
    // ----------------------------
    const willClear = currentRomaji.length === 0; // この文字でお題クリア？
    const nextCombo = combo + 1;

    if (willClear) {
      if (nextCombo === 10) add *= 10;
      if (nextCombo === 15) add *= 15;
      if (nextCombo === 20) add *= 20;
    }

    // スコア加算
    score += add;
    updateHUD();

    // 覚醒時の気弾光演出
 //  if (willClear && (nextCombo === 10 || nextCombo === 15 || nextCombo === 20)) {
 //     const ball = document.getElementById("ki-ball");
 //     ball.classList.add("pulse");
 //     setTimeout(() => ball.classList.remove("pulse"), 300);
 //   }

    // ============================
    // お題クリア
    // ============================
    if (currentRomaji.length === 0) {
      combo++;
      if (combo > maxCombo) maxCombo = combo;

      // 気弾成長（色は固定でサイズだけ変化）
      growKi();

      updateHUD();
      setTimeout(nextWord, 200);
    }

  } else {
    // ============================
    // ミス入力
    // ============================
    seBeep.currentTime = 0;
    seBeep.play();

    missCount++;

    // ミス分類（弱点分析用）
    if ("aiueo".includes(target)) {
      missVowel++;
    } else if (target === "y") {
      missYouon++;
    } else {
      missConsonant++;
    }

    // コンボリセット
    combo = 0;
    updateHUD();
  }
});

// ============================
// キーボード光演出
// ============================
function highlightKey(key) {
  const upper = key.toUpperCase();
  const keyEl = [...document.querySelectorAll(".key")]
    .find(k => k.textContent.toUpperCase() === upper);

  if (!keyEl) return;

  keyEl.classList.add("active");
  setTimeout(() => keyEl.classList.remove("active"), 150);
}

// ============================
// 気弾（色は固定で青、サイズだけ変化）
// ============================
let kiPower = 0;

function updateKiBall() {
  const ball = document.getElementById("ki-ball");
  const scale = 0.1 + (kiPower / 100) * 0.5;
  ball.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// お題クリア時に少し成長
function growKi() {

  // ★ 1回目のコンボだけ 1cm 成長（scale +0.03 相当）
  if (combo === 1) {
    kiPower += 6;   // 6 → scale 約 +0.03（約1cm）
  } else {
    kiPower += 0.5; // それ以降は従来通り
  }

  if (kiPower > 100) kiPower = 100;
  updateKiBall();
}


// ============================
// ビーム演出（ゲーム終了時）
// ============================
function fireBeam() {
  const beam = document.getElementById("beam");
  beam.classList.add("beam-fire");
  setTimeout(() => {
    beam.classList.remove("beam-fire");
  }, 500);
}
// ============================
// 敵撃破ロジック（スコア帯で決定）
// ============================
function getDefeatedEnemy(score) {
  if (score <= 10000) return "サイバイマン";
  if (score <= 20000) return "ラディッツ";
  if (score <= 30000) return "ナッパ";
  if (score <= 40000) return "ベジータ（初期）";
  if (score <= 50000) return "フリーザ（第1形態）";
  if (score <= 60000) return "フリーザ（最終形態）";
  if (score <= 70000) return "セル（完全体）";
  if (score <= 80000) return "魔人ブウ（善）";
  if (score <= 90000) return "魔人ブウ（純粋）";
  if (score <= 100000) return "ビルス";
  return "破壊神クラス撃破";
}

// ============================
// 弱点分析ロジック
// ============================
function getWeaknessComment(accuracy, v, c, y) {
  if (accuracy >= 95) {
    return "お前…強くなったな。もう上級者の領域だぞ。";
  }

  const maxMiss = Math.max(v, c, y);

  if (maxMiss === 0) {
    return "まだまだ伸びしろだらけだな…修行を続けろ！";
  }

  if (maxMiss === y) {
    return "拗音がまだ甘えな…“kyo”や“sha”を鍛えりゃもっと強くなれるぞ！";
  }
  if (maxMiss === v) {
    return "基本の母音でつまずいてるぞ…落ち着いて指を動かせ！";
  }
  return "子音の切り替えが遅いな…もっとリズムを意識しろ！";
}

// ============================
// Supabase 保存
// ============================
async function saveScoreToSupabase(data) {
  try {
    const { error } = await client.from("score_logs").insert(data);
    if (error) console.error("Supabase 保存エラー:", error);
  } catch (e) {
    console.error("Supabase 通信エラー:", e);
  }
}

// ============================
// ゲーム終了処理（完全版）
// ============================
function endGame() {
  state = "end";

  // 気弾最大化
  kiPower = 100;
  updateKiBall();

  // 画面フラッシュ
  document.body.classList.add("flash");
  setTimeout(() => document.body.classList.remove("flash"), 300);

  // ビーム発射
  fireBeam();

  // ============================
  // スコア集計
  // ============================
  const accuracy = totalTyped > 0 ? Math.floor(((totalTyped - missCount) / totalTyped) * 100) : 0;
  const defeatedEnemy = getDefeatedEnemy(score);
  const weaknessComment = getWeaknessComment(accuracy, missVowel, missConsonant, missYouon);

  const playerName = localStorage.getItem("playerName") || "名無し";

  // ============================
  // localStorage 保存（結果画面用）
  // ============================
  localStorage.setItem("score", score);
  localStorage.setItem("maxCombo", maxCombo);
  localStorage.setItem("accuracy", accuracy);
  localStorage.setItem("totalTyped", totalTyped);
  localStorage.setItem("missCount", missCount);
  localStorage.setItem("defeatedEnemy", defeatedEnemy);
  localStorage.setItem("weaknessComment", weaknessComment);

  // ============================
  // Supabase 保存（全員）
  // ============================
  saveScoreToSupabase({
    name: playerName,
    score: score,
    max_combo: maxCombo,
    accuracy: accuracy,
    total_typed: totalTyped,
    miss_count: missCount,
    defeated_enemy: defeatedEnemy,
    created_at: new Date().toISOString()
  });

  // ============================
  // 結果画面へ遷移
  // ============================
  setTimeout(() => {
    location.href = "results.html";
  }, 800);
}
