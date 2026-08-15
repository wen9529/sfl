import { getLatestDraws, getWaveColor } from "./src/server/lotteryEngine";

async function run() {
  const draws = await getLatestDraws();
  
  for (let d = 0; d < 10; d++) {
    const subDraws = draws.slice(d);
    const lastSpecial = subDraws[0].openCode.split(',').map(Number)[6];
    const lastWave = getWaveColor(lastSpecial);

    let rToR = 0, rToB = 0, rToG = 0;
    let bToR = 0, bToB = 0, bToG = 0;
    let gToR = 0, gToB = 0, gToG = 0;

    const totalDrawsLimit = Math.min(subDraws.length, 100);
    for (let i = totalDrawsLimit - 2; i >= 0; i--) {
      const pCodes = subDraws[i + 1].openCode.split(',').map(Number);
      const cCodes = subDraws[i].openCode.split(',').map(Number);
      if (pCodes.length < 7 || cCodes.length < 7) continue;

      const prevWave = getWaveColor(pCodes[6]);
      const currWave = getWaveColor(cCodes[6]);

      if (prevWave === 'red') {
        if (currWave === 'red') rToR++; else if (currWave === 'blue') rToB++; else rToG++;
      } else if (prevWave === 'blue') {
        if (currWave === 'red') bToR++; else if (currWave === 'blue') bToB++; else bToG++;
      } else {
        if (currWave === 'red') gToR++; else if (currWave === 'blue') gToB++; else gToG++;
      }
    }

    let pR = 0.33, pB = 0.33, pG = 0.33;
    if (lastWave === 'red') {
      const tot = rToR + rToB + rToG;
      if (tot > 0) { pR = rToR / tot; pB = rToB / tot; pG = rToG / tot; }
    } else if (lastWave === 'blue') {
      const tot = bToR + bToB + bToG;
      if (tot > 0) { pR = bToR / tot; pB = bToB / tot; pG = bToG / tot; }
    } else {
      const tot = gToR + gToB + gToG;
      if (tot > 0) { pR = gToR / tot; pB = gToB / tot; pG = gToG / tot; }
    }

    console.log(`Draw ${d}: lastWave=${lastWave}`);
    console.log(`  Transitions from ${lastWave}: Red=${pR.toFixed(3)}, Blue=${pB.toFixed(3)}, Green=${pG.toFixed(3)}`);
  }
}

run();
