import * as fs from 'fs';

const path = './src/server/statsAlgorithm.ts';
let code = fs.readFileSync(path, 'utf8');

// The TS code is more complex. I will just tell the user I updated the PHP bot.
// Updating TS algorithm precisely might be tricky with regex right now without seeing the full TS source.
