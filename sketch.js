// p5.js 響應式選擇題測驗
// 題庫來源：Google 試算表
// 每次開始遊戲會從題庫隨機抽出最多 5 題
// 主題：網頁與 p5.js 基礎

// =====================================================
// Google 試算表 CSV 網址
// =====================================================

// 這是使用者提供的 Google 試算表 CSV 網址
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/" +
  "2PACX-1vRJEK8Gtz4mEOer3T0a0K_3BpuMiYfCa8W-Mh2NHLDbiLZ61mx9_xogJMM8wXQnVA_sqk0l2xiUPTO-/" +
  "pub?gid=693367694&single=true&output=csv";

// =====================================================
// 字型設定
// =====================================================

// 一般文字使用 Noto Sans TC
const sansFont = "Noto Sans TC";

// 題目使用 Noto Serif TC
const serifFont = "Noto Serif TC";

// =====================================================
// 全域變數
// =====================================================

// Google 試算表資料
let questionTable;

// 完整題庫
let allQuestions = [];

// 本次測驗抽出的題目
let quizQuestions = [];

// 選項按鈕的位置資料
let optionButtons = [];

// 下一題按鈕的位置資料
let nextButton;

// 再玩一次按鈕的位置資料
let restartButton;

// 目前題目編號
let currentQuestion = 0;

// 使用者分數
let score = 0;

// 是否已經回答目前題目
let answered = false;

// 使用者選擇的選項
let selectedOption = -1;

// Google Fonts 是否載入完成
let fontsReady = false;

// 題庫是否已載入完成
let dataReady = false;

// 題庫是否載入失敗
let dataError = false;

// 錯誤訊息
let errorMessage = "";

// 版面資料
let layout = {
  margin: 20,
  contentWidth: 300,
  titleSize: 24,
  questionSize: 20,
  optionSize: 17,
  buttonHeight: 48,
  buttonGap: 14
};

// =====================================================
// 載入 Google 試算表
// =====================================================

// preload() 會在 setup() 前執行
function preload() {
  // 加上時間戳，避免讀取瀏覽器快取中的舊資料
  let url = SHEET_CSV_URL + "&t=" + Date.now();

  // 使用 p5.js 的 loadTable() 讀取 CSV
  questionTable = loadTable(
    url,
    "csv",
    "header",

    // CSV 載入成功
    function () {
      console.log("Google 試算表題庫載入成功");
    },

    // CSV 載入失敗
    function () {
      dataError = true;
      errorMessage =
        "題庫載入失敗，請確認 Google 試算表已發佈為 CSV。";
    }
  );
}

// =====================================================
// p5.js 基本函式
// =====================================================

function setup() {
  // 建立符合瀏覽器視窗大小的畫布
  createCanvas(windowWidth, windowHeight);

  // Google Fonts 尚未載入時，先使用系統字型
  textFont("sans-serif");

  // 如果題庫載入失敗，就直接顯示錯誤
  if (dataError) {
    calculateLayout();
    return;
  }

  // 將 CSV 內容轉成題目陣列
  if (questionTable) {
    loadQuestionsFromTable();
  }

  // 如果題庫有成功載入，就開始遊戲
  if (!dataError && allQuestions.length > 0) {
    startNewGame();
    dataReady = true;
  } else if (!dataError) {
    dataError = true;
    errorMessage =
      "找不到有效題目，請檢查 Google 試算表內容。";
  }

  // 計算版面位置
  calculateLayout();

  // 等待 Google Fonts 載入完成
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      fontsReady = true;
      redraw();
    });
  }
}

function draw() {
  background(245);

  // 如果資料載入失敗，顯示錯誤
  if (dataError) {
    drawErrorMessage();
    return;
  }

  // 如果資料尚未準備完成，顯示載入中
  if (!dataReady || quizQuestions.length === 0) {
    drawLoadingMessage();
    return;
  }

  // 顯示題目或結果
  if (currentQuestion < quizQuestions.length) {
    drawQuestion();
  } else {
    drawResult();
  }
}

// 視窗大小改變或手機轉向時執行
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateLayout();
}

// =====================================================
// 題庫處理
// =====================================================

// 將 Google 試算表資料轉成 JavaScript 題目物件
function loadQuestionsFromTable() {
  allQuestions = [];

  // 試算表第一列必須使用以下欄位名稱
  let requiredColumns = [
    "question",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "answer"
  ];

  // 檢查欄位是否完整
  for (let column of requiredColumns) {
    if (!questionTable.columns.includes(column)) {
      dataError = true;
      errorMessage = "試算表缺少欄位：" + column;
      return;
    }
  }

  // 逐列讀取題目
  for (let row of questionTable.getRows()) {
    let questionText = row.get("question").trim();

    let optionA = row.get("optionA").trim();
    let optionB = row.get("optionB").trim();
    let optionC = row.get("optionC").trim();
    let optionD = row.get("optionD").trim();

    let answerIndex = int(row.get("answer"));

    // 跳過不完整的資料列
    if (
      questionText === "" ||
      optionA === "" ||
      optionB === "" ||
      optionC === "" ||
      optionD === ""
    ) {
      continue;
    }

    // 正確答案只能是 0、1、2、3
    if (answerIndex < 0 || answerIndex > 3) {
      continue;
    }

    // 加入完整題庫
    allQuestions.push({
      question: questionText,
      options: [
        optionA,
        optionB,
        optionC,
        optionD
      ],
      answer: answerIndex
    });
  }

  // 如果沒有有效題目，顯示錯誤
  if (allQuestions.length === 0) {
    dataError = true;
    errorMessage =
      "題庫中沒有有效題目，請檢查試算表內容。";
  }
}

// 開始新的測驗
function startNewGame() {
  // 複製並隨機打亂完整題庫
  let shuffledQuestions = shuffle(
    allQuestions,
    true
  );

  // 最多抽出 5 題
  // 如果題庫少於 5 題，就抽出全部題目
  quizQuestions = shuffledQuestions.slice(
    0,
    min(5, shuffledQuestions.length)
  );

  // 重設遊戲狀態
  currentQuestion = 0;
  score = 0;
  answered = false;
  selectedOption = -1;
}

// =====================================================
// 字型設定
// =====================================================

// 使用 Noto Sans TC
function useSansFont() {
  if (fontsReady) {
    textFont(sansFont);
  } else {
    textFont("sans-serif");
  }

  textStyle(NORMAL);
}

// 使用 Noto Serif TC 粗體
function useSerifBoldFont() {
  if (fontsReady) {
    textFont(serifFont);
  } else {
    textFont("serif");
  }

  textStyle(BOLD);
}

// =====================================================
// 載入與錯誤畫面
// =====================================================

// 顯示載入中的文字
function drawLoadingMessage() {
  fill(40);
  noStroke();
  textAlign(CENTER, CENTER);

  useSansFont();

  textSize(constrain(width * 0.05, 18, 28));

  text(
    "正在載入 Google 試算表題庫...",
    width / 2,
    height / 2
  );

  textAlign(LEFT, TOP);
}

// 顯示錯誤訊息
function drawErrorMessage() {
  background(250, 240, 240);

  fill(180, 40, 40);
  noStroke();
  textAlign(CENTER, CENTER);

  useSansFont();

  textSize(constrain(width * 0.05, 18, 28));

  text(
    "題庫載入錯誤",
    width / 2,
    height * 0.35
  );

  textSize(constrain(width * 0.035, 15, 20));

  text(
    errorMessage,
    width / 2,
    height * 0.5,
    width * 0.8,
    height * 0.2
  );

  textAlign(LEFT, TOP);
}

// =====================================================
// 版面計算
// =====================================================

// 根據畫布大小計算版面
function calculateLayout() {
  // 設定左右邊界
  layout.margin = constrain(width * 0.08, 16, 60);

  // 計算內容寬度
  layout.contentWidth = width - layout.margin * 2;

  // 根據畫面寬度調整文字大小
  layout.titleSize = constrain(width * 0.055, 20, 30);
  layout.questionSize = constrain(width * 0.045, 17, 24);
  layout.optionSize = constrain(width * 0.038, 15, 20);

  // 根據畫面高度調整按鈕大小
  layout.buttonHeight = constrain(height * 0.075, 42, 58);
  layout.buttonGap = constrain(height * 0.025, 10, 18);

  // 清空選項按鈕陣列
  // 避免視窗縮放時重複增加按鈕
  optionButtons = [];

  // 計算四個選項按鈕的位置
  let questionStartY = height * 0.30;

  for (let i = 0; i < 4; i++) {
    optionButtons[i] = {
      x: layout.margin,
      y: questionStartY + i * (
        layout.buttonHeight + layout.buttonGap
      ),
      w: layout.contentWidth,
      h: layout.buttonHeight
    };
  }

  // 計算下一題按鈕
  let nextWidth = constrain(width * 0.28, 140, 190);

  nextButton = {
    x: width / 2 - nextWidth / 2,
    y: height - layout.margin - 55,
    w: nextWidth,
    h: 48
  };

  // 計算再玩一次按鈕
  let restartWidth = constrain(width * 0.32, 160, 220);

  restartButton = {
    x: width / 2 - restartWidth / 2,
    y: height * 0.65,
    w: restartWidth,
    h: 52
  };
}

// =====================================================
// 題目畫面
// =====================================================

// 繪製目前題目
function drawQuestion() {
  let questionData = quizQuestions[currentQuestion];

  fill(40);
  noStroke();
  textAlign(LEFT, TOP);

  // 標題與題號使用 Noto Sans TC
  useSansFont();

  // 顯示標題
  textSize(layout.titleSize);

  text(
    "p5.js 基礎測驗",
    layout.margin,
    layout.margin
  );

  // 顯示題號
  textSize(layout.optionSize);

  text(
    "第 " +
    (currentQuestion + 1) +
    " 題 / " +
    quizQuestions.length,
    layout.margin,
    layout.margin + layout.titleSize + 8
  );

  // 題目使用 Noto Serif TC 粗體
  useSerifBoldFont();
  textSize(layout.questionSize);

  let questionY = height * 0.18;

  text(
    questionData.question,
    layout.margin,
    questionY,
    layout.contentWidth,
    height * 0.12
  );

  // 繪製四個選項
  for (let i = 0; i < optionButtons.length; i++) {
    let button = optionButtons[i];

    // 尚未作答時顯示灰色
    if (!answered) {
      fill(220);
    } else {
      // 正確答案顯示綠色
      if (i === questionData.answer) {
        fill(120, 210, 130);
      }
      // 使用者選錯的答案顯示紅色
      else if (i === selectedOption) {
        fill(240, 120, 120);
      } else {
        fill(220);
      }
    }

    stroke(100);
    strokeWeight(1);

    rect(
      button.x,
      button.y,
      button.w,
      button.h,
      8
    );

    // 選項文字使用 Noto Sans TC
    fill(30);
    noStroke();

    useSansFont();

    textAlign(LEFT, CENTER);
    textSize(layout.optionSize);

    let optionLabel =
      String.fromCharCode(65 + i) + ". ";

    let optionText =
      optionLabel + questionData.options[i];

    // 文字依照按鈕寬度自動換行
    text(
      optionText,
      button.x + 14,
      button.y + 5,
      button.w - 28,
      button.h - 10
    );
  }

  // 作答後顯示下一題按鈕
  if (answered) {
    drawNextButton();
  }

  textAlign(LEFT, TOP);
}

// =====================================================
// 按鈕與結果畫面
// =====================================================

// 繪製下一題按鈕
function drawNextButton() {
  drawButton(
    nextButton,
    "下一題",
    color(70, 130, 220),
    color(255)
  );
}

// 繪製結果畫面
function drawResult() {
  background(245);

  fill(40);
  noStroke();
  textAlign(CENTER, CENTER);

  useSansFont();

  textSize(constrain(width * 0.07, 26, 38));

  text(
    "測驗完成！",
    width / 2,
    height * 0.22
  );

  textSize(constrain(width * 0.055, 20, 30));

  text(
    "你的總分：" +
    score +
    " / " +
    quizQuestions.length,
    width / 2,
    height * 0.35
  );

  textSize(constrain(width * 0.04, 16, 22));

  text(
    "答對率：" +
    nf(
      score / quizQuestions.length * 100,
      1,
      0
    ) +
    "%",
    width / 2,
    height * 0.45
  );

  // 顯示再玩一次按鈕
  drawRestartButton();

  textAlign(LEFT, TOP);
}

// 繪製再玩一次按鈕
function drawRestartButton() {
  drawButton(
    restartButton,
    "再玩一次",
    color(70, 180, 110),
    color(255)
  );
}

// 共用的按鈕繪製函式
function drawButton(
  button,
  label,
  backgroundColor,
  textColor
) {
  fill(backgroundColor);
  stroke(50);
  strokeWeight(1);

  rect(
    button.x,
    button.y,
    button.w,
    button.h,
    8
  );

  // 按鈕文字使用 Noto Sans TC
  fill(textColor);
  noStroke();

  useSansFont();

  textAlign(CENTER, CENTER);
  textSize(constrain(width * 0.04, 17, 22));

  text(
    label,
    button.x + button.w / 2,
    button.y + button.h / 2
  );
}

// =====================================================
// 滑鼠點擊與遊戲控制
// =====================================================

// 判斷滑鼠或觸控位置是否在按鈕內
// 畫按鈕與判斷點擊共用同一份 x、y、w、h 資料
function isMouseInside(button) {
  return (
    mouseX >= button.x &&
    mouseX <= button.x + button.w &&
    mouseY >= button.y &&
    mouseY <= button.y + button.h
  );
}

// 重新開始遊戲
// 會重新從 Google 試算表題庫抽出最多 5 題
function restartGame() {
  startNewGame();
  calculateLayout();
}

// 判斷滑鼠點擊
function mousePressed() {
  // 如果目前還在答題
  if (currentQuestion < quizQuestions.length) {
    let questionData =
      quizQuestions[currentQuestion];

    // 尚未作答時，檢查是否點擊選項
    if (!answered) {
      for (let i = 0; i < optionButtons.length; i++) {
        if (isMouseInside(optionButtons[i])) {
          selectedOption = i;
          answered = true;

          // 點選正確答案，分數加一
          if (
            selectedOption === questionData.answer
          ) {
            score++;
          }

          break;
        }
      }
    }

    // 已經作答時，檢查下一題按鈕
    else if (isMouseInside(nextButton)) {
      currentQuestion++;
      answered = false;
      selectedOption = -1;

      calculateLayout();
    }
  }

  // 題目全部完成後，檢查再玩一次按鈕
  else {
    if (isMouseInside(restartButton)) {
      restartGame();
    }
  }
}