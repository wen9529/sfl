import * as fs from 'fs';
const code = fs.readFileSync('stats_algorithm.php', 'utf8');
const lines = code.split('\n');

// Unmatched brace at line 389
// Check if line 389 is just `}`
console.log("Line 389 is: " + lines[388]);
if (lines[388].trim() === '}') {
    lines.splice(388, 1);
    fs.writeFileSync('stats_algorithm.php', lines.join('\n'));
    console.log("Removed extra closing brace at line 389.");
}
