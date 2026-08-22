const fs = require('fs');
const code = fs.readFileSync('stats_algorithm.php', 'utf8');
try {
  // We can't parse PHP with JS easily, let's just dump the suspicious areas.
} catch(e) {}
