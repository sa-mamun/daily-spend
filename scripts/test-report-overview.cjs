const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let dark = false, language = 'en';
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  Fragment: 'Fragment', useContext: context => context === 'theme' ? dark : { language },
};
const palette = requirePalette();
function requirePalette() {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/theme/mint.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports });
  return module.exports.mintTheme;
}
const moduleResult = { exports: {} };
const filename = path.resolve('src/features/reports/ReportOverview.tsx');
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, { module: moduleResult, exports: moduleResult.exports, require: name => {
  if (name === 'react') return react;
  if (name === 'react-native') return { Animated: { View: 'Animated.View' }, View: 'View', Pressable: 'Pressable', StyleSheet: { create: s => s, hairlineWidth: 1 } };
  if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
  if (name.endsWith('/Text')) return { Text: 'Text' };
  if (name.endsWith('/LanguageContext')) return { LanguageContext: 'language' };
  if (name.endsWith('/constants')) return { ThemeContext: 'theme' };
  if (name.endsWith('/mint')) return { mintTheme: palette };
  if (name.endsWith('/AnimatedTotal')) return { AnimatedTotal: 'AnimatedTotal' };
  if (name.endsWith('/ReportSummaryArtwork')) return { ReportSummaryArtwork: 'ReportSummaryArtwork' };
  if (name.endsWith('/dates')) return { taka: (value, lang) => (lang === 'en' ? 'Tk ' : '৳') + value };
  throw new Error('Unexpected dependency ' + name);
}});
const { ReportOverview } = moduleResult.exports;
function nodes(node) { return !node || typeof node !== 'object' ? [] : [node, ...node.props.children.flat(Infinity).flatMap(nodes)]; }
function text(node) { return typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : node.props.children.flat(Infinity).map(text).join(' '); }
for (dark of [false, true]) for (language of ['en', 'bn']) for (const period of ['month', 'year']) for (const previousTotal of [0, 21000]) {
  let selected, shifted;
  const tree = ReportOverview({ period, periodLabel: 'October 2026', total: 18475, previousTotal, change: 12,
    average: 1679.55, count: 9, onPeriodChange: p => selected = p, onShift: d => shifted = d, animatedStyle: {} });
  const all = nodes(tree);
  const summary = all.find(n => n.type === 'Animated.View');
  assert.ok(summary);
  assert.equal(all.filter(n => n.type === 'AnimatedTotal').length, 1);
  assert.equal(all.filter(n => n.type === 'ReportSummaryArtwork').length, 1);
  assert.equal(summary.props.style[0].borderRadius, 13);
  assert.equal(summary.props.style[1].backgroundColor, palette(dark).surface);
  assert.ok(text(summary).includes(language === 'en' ? 'Total spent' : 'মোট খরচ'));
  assert.ok(text(summary).includes('October 2026'));
  assert.ok(text(summary).includes(language === 'bn' ? '৯' : '9'));
  assert.ok(text(summary).includes(previousTotal ? language === 'bn' ? '১২%' : '12%' : '—'));
  const toggles = all.filter(n => n.type === 'Pressable' && n.props.accessibilityState);
  assert.equal(toggles.length, 2);
  assert.equal(toggles[0].props.style({ pressed: false })[0].height, 28);
  assert.equal(toggles[0].props.hitSlop.top, 7);
  assert.equal(toggles.filter(n => n.props.accessibilityState.selected).length, 1);
  toggles[1].props.onPress(); assert.equal(selected, 'year');
  const arrows = all.filter(n => n.type === 'Pressable' && n.props.accessibilityLabel);
  arrows[0].props.onPress(); assert.equal(shifted, -1);
  arrows[1].props.onPress(); assert.equal(shifted, 1);
  assert.ok(arrows[0].props.style({ pressed: true })[1].opacity < 1);
}
const screen = fs.readFileSync('src/features/reports/ReportsScreen.tsx', 'utf8');
assert.ok(screen.indexOf('<ReportOverview') < screen.indexOf('খরচের প্রবণতা'));
assert.ok(!screen.includes('styles.reportMetrics'));
assert.ok(!screen.includes('styles.reportPeriod'));
assert.ok(screen.includes('onPeriodChange={setPeriod}'));
assert.ok(screen.includes('onShift={shiftPeriod}'));
console.log('PASS: compact report summary, both themes/languages/periods, no previous data, navigation, selected state and press feedback');
