const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const outputRoot = path.join(__dirname, '..', 'www', 'JJ-math-font-sets');
const fonts = [
  { name: 'Optima', slug: 'optima' },
  { name: 'Rockwell', slug: 'rockwell' },
  { name: 'Palatino', slug: 'palatino' },
];
const characters = [
  { name: '0', glyph: '0' },
  { name: '1', glyph: '1' },
  { name: '2', glyph: '2' },
  { name: '3', glyph: '3' },
  { name: '4', glyph: '4' },
  { name: '5', glyph: '5' },
  { name: '6', glyph: '6' },
  { name: '7', glyph: '7' },
  { name: '8', glyph: '8' },
  { name: '9', glyph: '9' },
  { name: 'plus', glyph: '+' },
  { name: 'minus', glyph: String.fromCodePoint(0x2212) },
  { name: 'divide', glyph: String.fromCodePoint(0x00f7) },
  { name: 'times', glyph: String.fromCodePoint(0x00d7) },
  { name: 'ampersand', glyph: '&' },
  { name: 'left-paren', glyph: '(' },
  { name: 'right-paren', glyph: ')' },
];
const palette = ['#d04432', '#ef762b', '#e7b333', '#2d7d98', '#f4e7c4', '#bd352e', '#4e9ca3'];

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function number(random, low, high) {
  return low + random() * (high - low);
}

function choose(random, values) {
  return values[Math.floor(random() * values.length)];
}

function shuffled(random, values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16));
  return channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114;
}

function organicBlob(random, fill) {
  const radiusX = number(random, 55, 145);
  const radiusY = number(random, 35, 108);
  const centerX = number(random, -25, 265);
  const centerY = number(random, -25, 325);
  const rotation = number(random, -180, 180);
  const pathData = [
    `M ${-radiusX} 0`,
    `C ${-radiusX * 0.98} ${-radiusY * 0.78} ${-radiusX * 0.38} ${-radiusY * 1.18} 0 ${-radiusY}`,
    `C ${radiusX * 0.7} ${-radiusY * 1.08} ${radiusX * 1.14} ${-radiusY * 0.44} ${radiusX} 0`,
    `C ${radiusX * 1.05} ${radiusY * 0.7} ${radiusX * 0.44} ${radiusY * 1.16} 0 ${radiusY}`,
    `C ${-radiusX * 0.64} ${radiusY * 1.1} ${-radiusX * 1.13} ${radiusY * 0.48} ${-radiusX} 0 Z`,
  ].join(' ');
  return `<path d="${pathData}" transform="translate(${centerX} ${centerY}) rotate(${rotation})" fill="${fill}"/>`;
}

function brushStroke(random, color, widthLow, widthHigh, mode = 'free') {
  const startX = number(random, -45, 285);
  const startY = number(random, -45, 345);
  const angle = mode === 'diagonal'
    ? choose(random, [-1, 1]) * number(random, 0.48, 1.05)
    : mode === 'horizontal'
      ? number(random, -0.18, 0.18)
      : mode === 'vertical'
        ? Math.PI / 2 + number(random, -0.22, 0.22)
        : number(random, 0, Math.PI * 2);
  const length = number(random, 65, 245);
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;
  const bend = number(random, -58, 58);
  const normalX = -Math.sin(angle) * bend;
  const normalY = Math.cos(angle) * bend;
  const control1X = startX + Math.cos(angle) * length * 0.32 + normalX;
  const control1Y = startY + Math.sin(angle) * length * 0.32 + normalY;
  const control2X = startX + Math.cos(angle) * length * 0.68 - normalX;
  const control2Y = startY + Math.sin(angle) * length * 0.68 - normalY;
  const width = number(random, widthLow, widthHigh);
  const opacity = number(random, 0.78, 0.98).toFixed(2);
  return `<path d="M ${startX} ${startY} C ${control1X} ${control1Y} ${control2X} ${control2Y} ${endX} ${endY}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
}

function makeTile(font, character) {
  const random = seededRandom(hash(`${font.slug}:${character.name}`));
  const colors = shuffled(random, palette);
  const background = colors[0];
  const characterColor = colors
    .slice(1)
    .sort((left, right) => Math.abs(luminance(right) - luminance(background)) - Math.abs(luminance(left) - luminance(background)))[0];
  const backgroundColors = shuffled(random, colors.filter((color) => color !== background));
  const characterColors = shuffled(random, colors.filter((color) => color !== characterColor));
  const id = `glyph-${character.name.replace(/[^a-z0-9]/gi, '-')}`;
  const glyph = escapeXml(character.glyph);
  const centered = ['plus', 'minus', 'divide', 'times'].includes(character.name);
  const compact = character.name === 'ampersand' || character.name === 'times';
  const fontSize = character.name === 'plus' ? 320 : compact ? 285 : 340;
  const y = centered ? 150 : character.name === 'ampersand' ? 250 : 267;
  const transform = centered
    ? ''
    : compact
      ? ''
      : ' transform="translate(120 150) scale(1.22 1.15) translate(-120 -150)"';
  const baseline = centered ? ' dominant-baseline="central"' : '';
  const glyphText = `<text x="120" y="${y}"${baseline} text-anchor="middle" font-family="${font.name}, serif" font-size="${fontSize}"${transform}>${glyph}</text>`;

  const backgroundPaint = [];
  const blobCount = 2 + Math.floor(random() * 3);
  for (let index = 0; index < blobCount; index += 1) {
    backgroundPaint.push(organicBlob(random, backgroundColors[index % backgroundColors.length]));
  }
  const backgroundStrokeCount = 5 + Math.floor(random() * 4);
  for (let index = 0; index < backgroundStrokeCount; index += 1) {
    const mode = choose(random, ['free', 'free', 'diagonal', 'horizontal', 'vertical']);
    backgroundPaint.push(brushStroke(random, backgroundColors[index % backgroundColors.length], 8, 34, mode));
  }
  for (let index = 0; index < 8; index += 1) {
    backgroundPaint.push(brushStroke(random, backgroundColors[index % backgroundColors.length], 2, 7, 'free'));
  }

  const characterPaint = [];
  const pattern = Math.floor(random() * 5);
  const patternModes = [
    ['horizontal', 'free', 'horizontal', 'free'],
    ['diagonal', 'diagonal', 'free', 'diagonal'],
    ['vertical', 'free', 'vertical', 'free'],
    ['diagonal', 'horizontal', 'diagonal', 'vertical'],
    ['free', 'free', 'free', 'free'],
  ][pattern];
  for (let index = 0; index < 6; index += 1) {
    characterPaint.push(brushStroke(random, characterColors[index % characterColors.length], 9, 40, patternModes[index % patternModes.length]));
  }
  for (let index = 0; index < 4; index += 1) {
    characterPaint.push(brushStroke(random, characterColors[(index + 2) % characterColors.length], 2, 8, patternModes[(index + 1) % patternModes.length]));
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <defs><clipPath id="${id}">${glyphText}</clipPath></defs>
  <rect width="240" height="300" fill="${background}"/>
  <g>${backgroundPaint.join('\n    ')}</g>
  ${glyphText.replace('>', ` fill="${characterColor}">`)}
  <g clip-path="url(#${id})">${characterPaint.join('\n    ')}</g>
  ${glyphText.replace('>', ' fill="none" stroke="#000000" stroke-width="1.375" stroke-linejoin="round">')}
</svg>
`;

  const directory = path.join(outputRoot, font.slug);
  fs.mkdirSync(directory, { recursive: true });
  const svgPath = path.join(directory, `JJ-math-tile-${character.name}.svg`);
  const pngPath = path.join(directory, `JJ-math-tile-${character.name}.png`);
  fs.writeFileSync(svgPath, svg);
  execFileSync('rsvg-convert', ['--output', pngPath, svgPath]);
}

for (const font of fonts) {
  for (const character of characters) {
    makeTile(font, character);
  }
}

console.log(`Generated ${fonts.length * characters.length} SVG/PNG pairs in ${outputRoot}`);