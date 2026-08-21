import { getLatestDraws } from "./src/server/lotteryEngine";
import { generate50DrawsPrediction } from "./src/server/statsAlgorithm";

async function run() {
  const draws = await getLatestDraws();
  const pred = generate50DrawsPrediction(draws);
  console.log("TS Confidence:", pred.confidence);
  console.log("TS Reasoning:", pred.reasoning);
}
run();
