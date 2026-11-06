const fs = require('node:fs');
const path = require('node:path');
const { randomInt } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const webRoot = path.join(__dirname, '..', 'www');
const fontSetsRoot = path.join(webRoot, 'JJ-math-font-sets');
const columns = 22;
const rows = 10;
const tileWidth = 240;
const tileHeight = 300;
const outputHeightInches = 11.5;
const outputWidthInches = (tileWidth * columns / (tileHeight * rows)) * outputHeightInches;
const viewBoxWidth = tileWidth * columns;
const viewBoxHeight = tileHeight * rows;
const svgPath = path.join(webRoot, 'JJ-random-tile-array-22x10.svg');
const pngPath = path.join(webRoot, 'JJ-random-tile-array-22x10.png');

const baseTiles = fs.readdirSync(webRoot)
  .filter((name) => /^JJ-math-tile-.+\.png$/.test(name))
  .map((name) => path.join(webRoot, name));
const fontTiles = fs.readdirSync(fontSetsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((fontDirectory) => fs.readdirSync(path.join(fontSetsRoot, fontDirectory.name))
    .filter((name) => /^JJ-math-tile-.+\.png$/.test(name))
    .map((name) => path.join(fontSetsRoot, fontDirectory.name, name)));
const sources = [...baseTiles, ...fontTiles].sort();

if (sources.length !== 68) {
  throw new Error(`Expected 68 source tiles, found ${sources.length}.`);
}

const images = [];
for (let index = 0; index < columns * rows; index += 1) {
  const source = sources[randomInt(sources.length)];
  const relativeSource = path.relative(path.dirname(svgPath), source).split(path.sep).join('/');
  const x = (index % columns) * tileWidth;
  const y = Math.floor(index / columns) * tileHeight;
  images.push(`<image href="${relativeSource}" x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}"/>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidthInches}in" height="${outputHeightInches}in" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">
  <title>Random 22 by 10 array of math character tiles</title>
  ${images.join('\n  ')}
</svg>
`;

fs.writeFileSync(svgPath, svg);
execFileSync('rsvg-convert', ['--dpi-x', '300', '--dpi-y', '300', '--output', pngPath, svgPath], { stdio: 'inherit' });
console.log(`Created ${columns * rows} tiles from ${sources.length} choices at ${outputWidthInches.toFixed(2)} x ${outputHeightInches} inches.`);