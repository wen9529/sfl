import { getLatestDraws } from "./src/server/lotteryEngine";
import { generate50DrawsPrediction } from "./src/server/statsAlgorithm";

async function run() {
  const draws = await getLatestDraws();
  const subDraws = draws.slice(2); // Draw 2
  
  // Let's print internal values for draw 2
  const pred = generate50DrawsPrediction(subDraws);
}

run();
