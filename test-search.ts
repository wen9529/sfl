import { getLatestDraws } from "./src/server/lotteryEngine";
import { generate50DrawsPrediction } from "./src/server/statsAlgorithm";

async function run() {
  const draws = await getLatestDraws();
  const sub50 = draws.slice(0, 50);

  // Let's test different naive strategies on Size
  let alwaysBig = 0;
  let alwaysSmall = 0;
  let followLast = 0;
  let reverseLast = 0;
  
  for (let i = 0; i < 50; i++) {
    const sub = draws.slice(i);
    const codes = sub[0].openCode.split(',').map(Number);
    if (codes.length >= 7 && codes[6] !== 49) {
      const sp = codes[6];
      const actualBig = sp >= 25;
      
      if (actualBig) alwaysBig++; else alwaysSmall++;
      
      const lastSp = sub[1]?.openCode.split(',').map(Number)[6];
      if (lastSp && lastSp !== 49) {
        const lastBig = lastSp >= 25;
        if (lastBig === actualBig) followLast++;
        if (lastBig !== actualBig) reverseLast++;
      }
    }
  }

  console.log(`Always Big: ${alwaysBig}`);
  console.log(`Always Small: ${alwaysSmall}`);
  console.log(`Follow Last: ${followLast}`);
  console.log(`Reverse Last: ${reverseLast}`);
}

run();
import { getLatestDraws } from "./src/server/lotteryEngine";

async function runParity() {
  const draws = await getLatestDraws();
  
  let alwaysOdd = 0;
  let alwaysEven = 0;
  let followLast = 0;
  let reverseLast = 0;
  
  for (let i = 0; i < 50; i++) {
    const sub = draws.slice(i);
    const codes = sub[0].openCode.split(',').map(Number);
    if (codes.length >= 7 && codes[6] !== 49) {
      const sp = codes[6];
      const actualOdd = sp % 2 !== 0;
      
      if (actualOdd) alwaysOdd++; else alwaysEven++;
      
      const lastSp = sub[1]?.openCode.split(',').map(Number)[6];
      if (lastSp && lastSp !== 49) {
        const lastOdd = lastSp % 2 !== 0;
        if (lastOdd === actualOdd) followLast++;
        if (lastOdd !== actualOdd) reverseLast++;
      }
    }
  }

  console.log(`Always Odd: ${alwaysOdd}`);
  console.log(`Always Even: ${alwaysEven}`);
  console.log(`Follow Last Odd: ${followLast}`);
  console.log(`Reverse Last Odd: ${reverseLast}`);
}

runParity();
