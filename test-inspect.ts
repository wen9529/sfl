import { getLatestDraws } from "./src/server/lotteryEngine";
import { generate50DrawsPrediction } from "./src/server/statsAlgorithm";

async function run() {
  const draws = await getLatestDraws();
  
  // Print breakdown for draw 0
  const subDraws = draws.slice(0);
  const pred = generate50DrawsPrediction(subDraws);
  console.log("Rationale for Draw 0:");
  console.log(pred.rationale);
}

run();
