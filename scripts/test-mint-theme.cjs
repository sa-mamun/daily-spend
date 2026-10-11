const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, "..", relative);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports: module.exports, module,
    require: name => name === "react-native" ? { StyleSheet: { create: value => value, absoluteFill: {} } }
      : name === "react" ? { createContext: value => ({ value }) }
      : load(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), name + ".ts"))),
  }, { filename });
  return module.exports;
}
function luminance(hex) {
  const channels = hex.replace("#", "").match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const mint = load("src/theme/mint.ts");
const constants = load("src/theme/constants.ts");
const { styles, darkStyles } = load("src/theme/styles.ts");
assert.equal(mint.MINT, "#dfa43e");
assert.equal(constants.CARD_RADIUS.borderRadius, 13);
assert.equal(styles.cardTitle.fontSize, 15);
assert.equal(styles.appName.fontSize, 19);
assert.equal(styles.chartEmpty.height, "auto");
assert.equal(styles.chartEmpty.overflow, undefined);
assert.equal(styles.fab.width, 38);
assert.equal(styles.fab.height, 38);
assert.equal(styles.fab.borderRadius, 11);
assert.equal(styles.fab.backgroundColor, mint.MINT);
assert.equal(darkStyles.fab.backgroundColor, mint.MINT);
assert.equal(darkStyles.confirmModal.backgroundColor, "#24283a");
assert.equal(darkStyles.modal.backgroundColor, mint.MINT_MODAL_SURFACE);
assert.equal(darkStyles.primary.backgroundColor, mint.mintTheme(true).primary);
assert.equal(darkStyles.primaryText.color, mint.mintTheme(true).primaryText);
assert.equal(styles.card.borderWidth, 0, "Cream cards must not retain the old outer table border");
assert.equal(darkStyles.reportCategoryRowActive.backgroundColor, mint.mintTheme(true).soft);
assert.equal(styles.drawerItemText.color, mint.mintTheme(false).text);
assert.ok(contrast(mint.MINT_INK, mint.MINT) >= 4.5, "Mint buttons need dark readable labels");
for (const dark of [false, true]) {
  const palette = mint.mintTheme(dark);
  for (const background of [palette.surface, palette.background, palette.chrome]) {
    assert.ok(contrast(palette.text, background) >= 4.5, "Primary text contrast");
    assert.ok(contrast(palette.muted, background) >= 4.5, "Secondary text contrast");
    assert.ok(contrast(palette.accentText, background) >= 4.5, "Accent text contrast");
  }
  const hero = dark ? mint.MINT_HERO_DARK : mint.MINT_HERO_LIGHT;
  for (const background of hero) assert.ok(contrast(palette.heroText, background) >= 4.5, "Hero text contrast");
}
console.log("PASS: mint palette contrast, typography, geometry, empty-state sizing and delete-modal surface");
