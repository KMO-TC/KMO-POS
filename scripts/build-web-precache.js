const fs = require('fs');
const path = require('path');

const outputDirectory = path.resolve('dist');

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(filePath) : [filePath];
  });
}

if (!fs.existsSync(path.join(outputDirectory, 'index.html'))) {
  throw new Error('Web export is missing. Run the Expo web export before creating its offline manifest.');
}

const files = collectFiles(outputDirectory)
  .filter((filePath) => !['_headers', '_redirects', 'offline-assets.json'].includes(path.basename(filePath)))
  .map((filePath) => `./${path.relative(outputDirectory, filePath).split(path.sep).join('/')}`);

fs.writeFileSync(
  path.join(outputDirectory, 'offline-assets.json'),
  JSON.stringify(Array.from(new Set(['./', ...files])))
);
