let state = "title";
let selectedCourse = null;

// コース選択ボタン
document.querySelectorAll(".course-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedCourse = btn.dataset.course;
    console.log("選択コース:", selectedCourse);

    // ここでCSV読み込み（後で実装）
    // loadCSV(selectedCourse);

    // ゲーム開始
    startGame();
  });
});

// スペースキーで開始（デバッグ用）
document.addEventListener("keydown", e => {
  if (state === "title" && e.code === "Space") {
    selectedCourse = "easy";
    startGame();
  }
});

function startGame() {
  state = "game";
  document.getElementById("title-screen").style.display = "none";
  console.log("ゲーム開始！");
  // ここで本編処理を呼ぶ（後で追加）
}
