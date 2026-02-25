const fs = require('fs');
const { SourceMapConsumer } = require('source-map');
const map = JSON.parse(fs.readFileSync('debug.bundle.map', 'utf8'));
(async () => {
  const consumer = await new SourceMapConsumer(map);
  const pos = consumer.originalPositionFor({ line: 338736, column: 23 });
  console.log(pos);
  if (consumer.destroy) consumer.destroy();
})();
