import * as fs from 'fs';
const code = fs.readFileSync('stats_algorithm.php', 'utf8');

let depth = 0;
let lastDepth = 0;
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') depth++;
        if (line[j] === '}') depth--;
    }
    if (depth < 0) {
        console.log(`Unmatched closing brace at line ${i+1}`);
        depth = 0;
    }
}
console.log(`Final depth: ${depth}`);
