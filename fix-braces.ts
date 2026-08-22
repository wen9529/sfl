import * as fs from 'fs';

const path = './stats_algorithm.php';
let lines = fs.readFileSync(path, 'utf8').split('\n');

let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function calculateProfitAndLossPHP')) {
        targetIdx = i;
        break;
    }
}

if (targetIdx !== -1) {
    // Check if the previous line is `    }`. If so, insert `}` after it.
    lines.splice(targetIdx, 0, '}');
    fs.writeFileSync(path, lines.join('\n'));
    console.log("Fixed missing closing brace.");
}
