import { getLatestDraws } from "./src/server/lotteryEngine";
import { generate50DrawsPrediction } from "./src/server/statsAlgorithm";

async function run() {
  const draws = await getLatestDraws();
  
  for (let i = 0; i < 10; i++) {
    const subDraws = draws.slice(i);
    const pred = generate50DrawsPrediction(subDraws);
    console.log(`--- Draw ${i} (target=${pred.targetIssue}) ---`);
    console.log(`Pred: Size=${pred.sizePred}, Parity=${pred.parityPred}, Color=${pred.colorPred}`);
    console.log(`Rationale:\n${pred.rationale}\n`);
  }
}

run();
