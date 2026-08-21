import * as fs from 'fs';

const path = './stats_algorithm.php';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /(\$colorConf = \$prediction\['colorConfidence'\] \?\? \$prediction\['confidence'\] \?\? 90;)/g,
  `$1\n        $reasoning = $prediction['reasoning'] ?? '';`
);

code = code.replace(
  /"🎨 <b>波色预测<\/b>: <b>【 \{\$prediction\['colorPred'\]\} 】<\/b> \(赔率 \{\$prediction\['colorOdds'\]\} \| 置信度 <code>\{\$colorConf\}%<\/code>\)\\n"/g,
  `"🎨 <b>波色预测</b>: <b>【 {$prediction['colorPred']} 】</b> (赔率 {$prediction['colorOdds']} | 置信度 <code>{$colorConf}%</code>)\\n"
             . "--------------------------------------\\n"
             . "<b>🤖 AI 运算逻辑剖析</b>:\\n"
             . "<i>{$reasoning}</i>\\n"`
);

fs.writeFileSync(path, code);
console.log("Push report updated.");
