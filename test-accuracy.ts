import { getLatestDraws } from "./src/server/lotteryEngine";
import { generate50DrawsPrediction } from "./src/server/statsAlgorithm";

async function run() {
  const draws = await getLatestDraws();
  
  let correctSize = 0;
  let correctParity = 0;
  let totalValid = 0;

  for (let i = 0; i < 50; i++) {
    const sub = draws.slice(i);
    const pred = generate50DrawsPrediction(sub);
    const actualCodes = sub[0].openCode.split(',').map(Number);
    if (actualCodes.length >= 7 && actualCodes[6] !== 49) {
      const actualBig = actualCodes[6] >= 25 ? '大' : '小';
      const actualOdd = actualCodes[6] % 2 !== 0 ? '单' : '双';
      if (pred.sizePred === actualBig) correctSize++;
      if (pred.parityPred === actualOdd) correctParity++;
      totalValid++;
    }
  }

  console.log(`[Current 50-Draw Backtest]`);
  console.log(`Size Accuracy: ${(correctSize/totalValid*100).toFixed(1)}%`);
  console.log(`Parity Accuracy: ${(correctParity/totalValid*100).toFixed(1)}%`);
}

run();
