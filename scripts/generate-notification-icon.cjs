const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const size = 96;
const sourcePath = path.join(__dirname, "..", "assets", "android-icon-foreground-padded.png");
const source = PNG.sync.read(fs.readFileSync(sourcePath));

let left = source.width;
let top = source.height;
let right = 0;
let bottom = 0;
for (let y = 0; y < source.height; y++) {
  for (let x = 0; x < source.width; x++) {
    if (source.data[(y * source.width + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + 1);
    bottom = Math.max(bottom, y + 1);
  }
}

const logoWidth = right - left;
const logoHeight = bottom - top;
const scale = Math.min((size * 0.82) / logoWidth, (size * 0.84) / logoHeight);
const drawnWidth = logoWidth * scale;
const drawnHeight = logoHeight * scale;
const offsetX = (size - drawnWidth) / 2;
const offsetY = (size - drawnHeight) / 2;
const output = new PNG({ width: size, height: size, colorType: 6 });

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const sourceX = left + (x + 0.5 - offsetX) / scale - 0.5;
    const sourceY = top + (y + 0.5 - offsetY) / scale - 0.5;
    const inside = sourceX >= left && sourceX < right && sourceY >= top && sourceY < bottom;
    let alpha = 0;
    if (inside) {
      const x0 = Math.floor(sourceX);
      const y0 = Math.floor(sourceY);
      const x1 = Math.min(right - 1, x0 + 1);
      const y1 = Math.min(bottom - 1, y0 + 1);
      const fx = sourceX - x0;
      const fy = sourceY - y0;
      const a00 = source.data[(y0 * source.width + x0) * 4 + 3];
      const a10 = source.data[(y0 * source.width + x1) * 4 + 3];
      const a01 = source.data[(y1 * source.width + x0) * 4 + 3];
      const a11 = source.data[(y1 * source.width + x1) * 4 + 3];
      alpha = (a00 * (1 - fx) + a10 * fx) * (1 - fy) + (a01 * (1 - fx) + a11 * fx) * fy;
    }
    const index = (y * size + x) * 4;
    output.data[index] = 255;
    output.data[index + 1] = 255;
    output.data[index + 2] = 255;
    output.data[index + 3] = Math.round(alpha);
  }
}

const target = path.join(__dirname, "..", "assets", "notification-icon.png");
fs.writeFileSync(target, PNG.sync.write(output));
console.log(`Wrote ${target} from ${sourcePath}`);
