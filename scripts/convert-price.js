// scripts/convert-price.js
// Vercel 빌드 시 자동 실행: price.xlsx → price-data.json 변환
// 인터님은 price.xlsx만 교체하면 됩니다!

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'data', 'price.xlsx');
const outputPath = path.join(__dirname, '..', 'data', 'price-data.json');

console.log('[변환 시작] price.xlsx → price-data.json');

const workbook = XLSX.readFile(inputPath);
const allData = [];
const seen = new Set();

const sheets = ['전자랜드-업데이트', '홈플러스-업데이트', '이마트-업데이트'];

for (const sheetName of sheets) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) continue;

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // 데이터는 5행(인덱스4)부터 시작
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[4]) continue;

    const modelFull = String(row[4] || '').trim();
    if (!modelFull) continue;

    const careCombined = String(row[9] || '').trim();  // J열: 구분자
    const key = `${modelFull}|${careCombined}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const safeNum = (val) => {
      if (val === null || val === undefined || val === '' || val === 0) return null;
      const n = Number(val);
      return isNaN(n) ? null : Math.round(n);
    };

    allData.push({
      modelFull,
      product: String(row[3] || '').trim(),       // D열: 제품
      careType: String(row[6] || '').trim(),       // G열: 케어십형태
      careDetail: String(row[7] || '').trim(),     // H열: 케어십구분
      visitCycle: String(row[8] || '').trim(),     // I열: 방문주기
      careCombined,                                // J열: 구분자
      activation: safeNum(row[10]),                // K열: 활성화 금액
      price3y: safeNum(row[11]),                   // L열: 3년 기본요금
      price4y: safeNum(row[12]),                   // M열: 4년 기본요금
      price5y: safeNum(row[15]),                   // P열: 5년 기본요금
      price6y: safeNum(row[18]),                   // S열: 6년 기본요금
      prepay30_lump: safeNum(row[21]),             // V열: 30% 선납금
      prepay30_monthly: safeNum(row[22]),           // W열: 30% 월구독
      prepay50_lump: safeNum(row[25]),             // Z열: 50% 선납금
      prepay50_monthly: safeNum(row[26]),           // AA열: 50% 월구독
    });
  }
}

fs.writeFileSync(outputPath, JSON.stringify(allData, null, 0), 'utf-8');
console.log(`[변환 완료] ${allData.length}개 항목 저장됨`);
