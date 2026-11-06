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
const svgPath = path.join(webRoot, 'JJ-irregular-tile-array-22x10.svg');
const pngPath = path.join(webRoot, 'JJ-irregular-tile-array-22x10.png');

const baseTiles = fs.readdirSync(webRoot)
  .filter((name) => /^JJ-math-tile-.+\.png$/.test(name))
  .map((name) => path.join(webRoot, name));
const fontTiles = fs.readdirSync(fontSetsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((fontDirectory) => fs.readdirSync(path.join(fontSetsRoot, fontDirectory.name))
    .filter((name) => /^JJ-math-tile-.+\.png$/.test(name))
    .map((name) => path.join(fontSetsRoot, fontDirectory.name, name)));
const sources = [...baseTiles, ...fontTiles].sort();
const slotCount = columns * rows;

if (sources.length !== 68) {
  throw new Error(`Expected 68 source tiles, found ${sources.length}.`);
}

const foregroundTiles = [...sources, ...sources];
while (foregroundTiles.length < slotCount) {
  foregroundTiles.push(sources[randomInt(sources.length)]);
}
for (let index = foregroundTiles.length - 1; index > 0; index -= 1) {
  const swapIndex = randomInt(index + 1);
  [foregroundTiles[index], foregroundTiles[swapIndex]] = [foregroundTiles[swapIndex], foregroundTiles[index]];
}

const imageReference = (source, x, y, width, height) => {
  const relativeSource = path.relative(path.dirname(svgPath), source).split(path.sep).join('/');
  return `<image href="${relativeSource}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none"/>`;
};

const backingImages = [];
const foregroundImages = [];
for (let index = 0; index < slotCount; index += 1) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const cellX = column * tileWidth;
  const cellY = row * tileHeight;
  const backingTile = sources[randomInt(sources.length)];
  backingImages.push(imageReference(backingTile, cellX, cellY, tileWidth, tileHeight));

  const scale = randomInt(9700, 10301) / 10000;
  const width = tileWidth * scale;
  const height = tileHeight * scale;
  const offsetX = randomInt(2401) / 100 - 12;
  const offsetY = randomInt(3001) / 100 - 15;
  const x = cellX + (tileWidth - width) / 2 + offsetX;
  const y = cellY + (tileHeight - height) / 2 + offsetY;
  foregroundImages.push(imageReference(foregroundTiles[index], x, y, width, height));
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidthInches}in" height="${outputHeightInches}in" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">
  <title>Irregular random 22 by 10 array of math character tiles</title>
  <g id="gap-fill">${backingImages.join('\n    ')}</g>
  <g id="jittered-tiles">${foregroundImages.join('\n    ')}</g>
</svg>
`;

fs.writeFileSync(svgPath, svg);
execFileSync('rsvg-convert', ['--dpi-x', '300', '--dpi-y', '300', '--output', pngPath, svgPath], { stdio: 'inherit' });
console.log(`Created ${slotCount} foreground tiles from 68 sources, each used at least twice, with backing tiles filling gaps.`);
console.log(`Tile offsets: up to +/-5%; tile scale: +/-3%; output: ${outputWidthInches.toFixed(2)} x ${outputHeightInches} inches.`);