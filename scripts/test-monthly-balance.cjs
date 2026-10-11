const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let dark = false, language = 'en';
const react = {
  createContext: value => ({ value }),
  useContext: context => typeof context.value === 'boolean' ? dark : { language },
  useEffect: () => {}, useRef: value => ({ current: value }), useState: value => [value, () => {}], useMemo: fn => fn(),
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  Fragment: 'Fragment',
};
const native = {
  View: 'View', Image: 'Image', ScrollView: 'ScrollView', Pressable: 'Pressable', Platform: { OS: 'android' },
  StyleSheet: { create: value => value, absoluteFill: {}, flatten: value => value },
  AccessibilityInfo: {}, AppState: { currentState: 'active' }, Animated: { View: 'Animated.View', Text: 'Animated.Text',
    createAnimatedComponent: type => type,
    Value: class { interpolate(value) { return value.outputRange.at(-1); } } },
};
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const requireLocal = name => {
    if (name === 'react') return react;
    if (name === 'react-native') return native;
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === 'expo-font') return { isLoaded: () => false };
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle' };
    if (!name.startsWith('.')) throw new Error('Unexpected runtime import ' + name);
    const target = path.resolve(path.dirname(filename), name);
    if (name.endsWith('.png')) { assert.ok(fs.existsSync(target)); return target; }
    return load(['.ts', '.tsx'].map(ext => target + ext).find(fs.existsSync));
  };
  vm.runInNewContext(source, { exports: module.exports, module, require: requireLocal, Date, console }, { filename });
  return module.exports;
}
const base = path.resolve(__dirname, '..');
const model = load(path.join(base, 'src/features/dashboard/monthlyBalance.ts'));
assert.equal(model.monthlyBalance(null), null);
assert.equal(model.monthlyBalance({ budgetAmount: 0, spentAmount: 100 }), null);
for (const [spent, remaining, progress, exceeded] of [[0, 30000, 0, false], [18475, 11525, 61.583333333333336, false], [30000, 0, 100, false], [45000, 15000, 100, true]]) {
  const value = model.monthlyBalance({ budgetAmount: 30000, spentAmount: spent });
  assert.equal(value.remaining, remaining); assert.equal(value.progress, progress); assert.equal(value.exceeded, exceeded);
}
function luminance(hex) { const rgb = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; }
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((a,b) => b-a); return (values[0]+.05)/(values[1]+.05); }
for (const mode of [false, true]) {
  const palette = model.splitBalancePalette(mode);
  for (const ink of [palette.text, palette.muted, palette.warning, palette.danger]) {
    for (const background of palette.gradient) assert.ok(contrast(ink, background) >= 4.5, `Contrast ${ink} on ${background}`);
  }
}
const { MonthlyBalanceCard } = load(path.join(base, 'src/features/dashboard/MonthlyBalanceCard.tsx'));
const { orbitTheme, ORBIT_CARD_RADIUS, ORBIT_CHROME } = load(path.join(base, 'src/features/dashboard/orbitTheme.ts'));
assert.equal(ORBIT_CARD_RADIUS, 13);
assert.equal(ORBIT_CHROME.headerHeight, 60);
assert.equal(ORBIT_CHROME.contentGap, 10);
assert.equal(ORBIT_CHROME.navHeight, 68);
assert.ok(ORBIT_CHROME.navButtonHeight >= 44);
assert.equal(ORBIT_CHROME.navButtonHeight + 2 * ORBIT_CHROME.navPadding, ORBIT_CHROME.navHeight,
  'Navigation must have equal top/bottom space without clipping its buttons');
for (const mode of [false, true]) {
  const p = orbitTheme(mode);
  for (const background of [p.surface, p.background]) {
    for (const ink of [p.text, p.muted, p.accent]) assert.ok(contrast(ink, background) >= 4.5, `Orbit contrast ${ink} on ${background}`);
  }
  for (const ink of [p.accent, p.text, p.muted]) assert.ok(contrast(ink, p.soft) >= 4.5, `Orbit soft-surface contrast ${ink}`);
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; return [tree, ...tree.props.children.flat(Infinity).flatMap(nodes)]; }
function text(tree) { if (typeof tree === 'string') return tree; if (!tree || typeof tree !== 'object') return ''; return tree.props.children.flat(Infinity).map(text).join(' ').replace(/\s+/g, ' '); }
for (dark of [false, true]) for (language of ['en', 'bn']) for (const spent of [null, 18475, 30000, 45000]) {
  let opened = '';
  const tree = MonthlyBalanceCard({ total: spent || 0, previousTotal: 1000, trend: 'Test trend',
    summary: spent === null ? null : { budgetAmount: 30000, spentAmount: spent },
    onViewBudget: () => opened = 'view', onSetBudget: () => opened = 'set' });
  const all = nodes(tree);
  const monthYear = new Date().toLocaleDateString(language === 'en' ? 'en-GB' : 'bn-BD', { month: 'long', year: 'numeric' });
  assert.ok(text(tree).includes(monthYear), 'Month/year must be inside the balance card');
  const header = tree.props.children[0];
  const [heading, periodLabel] = header.props.children;
  assert.equal(header.props.style.flexDirection, 'row');
  assert.ok(text(heading).includes(language === 'en' ? 'Monthly balance' : 'মাসের হিসাব'));
  assert.ok(text(periodLabel).includes(monthYear), 'Period must sit at the right of the card header');
  const action = all.find(n => n.type === 'Pressable'); action.props.onPress();
  assert.equal(opened, spent === null ? 'set' : 'view');
  assert.equal(all.filter(n => n.props.accessibilityRole === 'progressbar').length, spent === null ? 0 : 1);
  const amounts = all.filter(n => n.type?.name === 'AnimatedTotal');
  assert.equal(amounts.length, 1);
  if (spent === 45000) assert.ok(text(tree).includes(language === 'en' ? 'Over' : 'বেশি'));
  assert.equal(tree.props.style[0].borderRadius, 13);
  assert.equal(tree.props.style[1].backgroundColor, orbitTheme(dark).surface);
  assert.equal(all.filter(n => n.type === 'Svg').length, 1);
  const illustration = all.find(n => n.type === 'Image');
  assert.ok(illustration.props.source.endsWith('monthly-wallet-coins.png'));
  assert.equal(illustration.props.accessible, false);
  const artworkContainer = tree.props.children[3];
  assert.equal(artworkContainer.props.pointerEvents, 'none');
  assert.equal(artworkContainer.props.style.position, 'absolute');
  assert.ok(tree.props.children[2].props.style.paddingRight >= artworkContainer.props.style.width);
  assert.equal(artworkContainer.props.children[0].type, 'Animated.View');
  assert.equal(artworkContainer.props.children[0].props.style[0].width, '100%');
  assert.equal(artworkContainer.props.children[0].props.style[0].height, '100%');
}
const dashboardArtworkSource = fs.readFileSync(path.join(base, 'src/features/dashboard/MonthlyBalanceCard.tsx'), 'utf8');
assert.ok(dashboardArtworkSource.includes('if (reduceMotion || !appActive) return;'));
assert.ok(dashboardArtworkSource.includes('duration: 2800'));
assert.ok(dashboardArtworkSource.includes('useNativeDriver: true, isInteraction: false'));
assert.ok(dashboardArtworkSource.includes('animation.stop(); artworkMotion.stopAnimation();'));
assert.ok(dashboardArtworkSource.includes('outputRange: [0, -4]'));
assert.ok(dashboardArtworkSource.includes('AppState.addEventListener("change"'));
const dashboard = fs.readFileSync(path.join(base, 'src/features/dashboard/Dashboard.tsx'), 'utf8');
const expenseApp = fs.readFileSync(path.join(base, 'src/application/ExpenseApp.tsx'), 'utf8');
assert.ok(!expenseApp.includes('dashboardActionHeight'), 'FAB must not create a full-width masking strip');
assert.ok(expenseApp.includes('onAddExpense={openExpense} addRef={addTourRef}'), 'Central navigation add must use the existing expense flow and tour target');
assert.ok(!expenseApp.includes('screen === "dashboard" && { position: "absolute"'),
  'All floating expense buttons must use the same navigation-relative position');
assert.ok(!expenseApp.includes('marginBottom: screen === "dashboard" ? ORBIT_CHROME.navHeight : 0'),
  'Dashboard must scroll behind the transparent navigation cradle like every other page');
assert.ok(!expenseApp.includes('screen === "dashboard" && { paddingBottom: 58 }'),
  'Dashboard must retain shared bottom content padding so the last expense clears navigation');
assert.ok(dashboard.includes('<MonthlyBalanceCard'));
assert.ok(!dashboard.includes('<DashboardBudgetCard'));
assert.ok(dashboard.includes('<OrbitSummaryCards'));
assert.ok(!dashboard.includes('"Overview"') && !dashboard.includes('"সারসংক্ষেপ"'), 'Dashboard must not have a separate overview heading');
const { OrbitSummaryCards } = load(path.join(base, 'src/features/dashboard/OrbitSummaryCards.tsx'));
for (dark of [false, true]) for (language of ['en', 'bn']) {
  const tree = OrbitSummaryCards({ todayTotal: 775, budgetAmount: 30000, onBudget: () => {} });
  assert.equal(nodes(tree).filter(n => n.type === 'View' && n.props.style?.[0]?.borderRadius === 13).length, 1);
  const budgetCard = nodes(tree).find(n => n.type === 'Pressable');
  assert.equal(budgetCard.props.style({ pressed: false })[0].borderRadius, 13);
  assert.ok(nodes(tree).some(n => n.props.numberOfLines === 1 && n.props.adjustsFontSizeToFit));
}
console.log('PASS: Orbit radius, balances, zero/over budget, contrast, EN/BN light/dark render, add/view actions, circular progress and two summary cards');
const { MonthlyBudgetCard } = load(path.join(base, 'src/features/budget/MonthlyBudgetCard.tsx'));
const { BudgetActionButton } = load(path.join(base, 'src/features/budget/BudgetActionButton.tsx'));
for (dark of [false, true]) for (language of ['en', 'bn']) for (const amount of [null, 30000]) {
  for (const spent of [0, 18475, 45000]) {
    let opened = false;
    const tree = MonthlyBudgetCard({ amount, spent, warning: spent >= 24000, onEdit: () => opened = true });
    const action = nodes(tree).find(n => n.type?.name === 'CompactActionButton');
    action.props.onPress(); assert.equal(opened, true);
    assert.equal(action.props.kind, amount === null ? 'add' : 'edit');
    assert.equal(nodes(tree).filter(n => n.props.accessibilityRole === 'progressbar').length, amount === null ? 0 : 1);
    assert.equal(tree.props.style[0].padding, 15);
    assert.equal(tree.props.style[0].paddingTop, 8);
    assert.equal(tree.props.style[0].borderRadius, 13);
  }
  const button = BudgetActionButton({kind: 'edit', accessibilityLabel: 'Edit budget', onPress: () => {}});
  assert.equal(button.props.style({pressed: false})[0].alignItems, 'flex-end');
  assert.equal(button.props.style({pressed: false})[0].minHeight, 44);
  assert.equal(button.props.children[0].props.style[0].height, 30);
  assert.equal(button.props.children[0].props.style[2].backgroundColor, 'transparent');
  const addButton = BudgetActionButton({kind: 'add', label: 'Add', accessibilityLabel: 'Add budget', onPress: () => {}});
  assert.notEqual(addButton.props.children[0].props.style[2].backgroundColor, 'transparent');
  const solidAdd = BudgetActionButton({kind: 'add', tone: 'solid', label: 'Add', accessibilityLabel: 'Add', onPress: () => {}});
  assert.equal(solidAdd.props.children[0].props.style[2].backgroundColor, '#dfa43e');
  assert.equal(solidAdd.props.children[0].props.style[3].height, 32);
  assert.equal(solidAdd.props.children[0].props.style[3].elevation, undefined);
  assert.equal(solidAdd.props.children[0].props.style[3].shadowOpacity, undefined);
  assert.equal(solidAdd.props.style({pressed: true})[2].opacity, 1);
  assert.equal(solidAdd.props.style({pressed: true})[2].transform[0].scale, .93);
  for (const kind of ['edit', 'delete']) {
    const compact = BudgetActionButton({kind, compact: true, accessibilityLabel: kind, onPress: () => {}});
    assert.equal(compact.props.style({pressed: false})[1].width, 28);
    assert.equal(compact.props.children[0].props.style[2].backgroundColor, 'transparent');
  }
}
console.log('PASS: Quiet budget card/add/edit actions, compact right alignment, no/over budget, EN/BN and both themes');
const { WeeklyExpenseChart, weeklyExpensePoints, monthlyExpensePoints } = load(path.join(base, 'src/features/dashboard/WeeklyExpenseChart.tsx'));
const february = monthlyExpensePoints([{expenseDate:'2024-02-29',amount:25},{expenseDate:'2024-02-29',amount:75},{expenseDate:'2024-03-01',amount:999}], new Date(2024,1,15));
assert.equal(february.length,29);
assert.equal(february[28].value,100);
assert.equal(monthlyExpensePoints([],new Date(2025,1,15)).length,28);
const crossing = weeklyExpensePoints([{expenseDate:'2025-12-28',amount:50},{expenseDate:'2026-01-01',amount:25},{expenseDate:'2026-01-01',amount:75},{expenseDate:'2026-01-08',amount:999}], new Date(2026,0,1));
assert.equal(crossing[0].key,'2025-12-28');
assert.equal(crossing[6].key,'2026-01-03');
assert.equal(crossing[0].value,50);
assert.equal(crossing[4].value,100);
const current = new Date();
const key = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
for (dark of [false,true]) for (language of ['en','bn']) {
  const empty = WeeklyExpenseChart({expenses:[]});
  assert.equal(nodes(empty).filter(n=>n.type?.name==='EmptyState').length,1);
  const tree = WeeklyExpenseChart({expenses:[{expenseDate:key,amount:1250.5}]});
  const gradients = nodes(tree).filter(n=>n.type==='LinearGradient');
  const dayButtons = nodes(tree).filter(n=>n.props.accessibilityRole==='button');
  assert.equal(nodes(tree).filter(n=>n.props.accessibilityRole==='tab').length,2);
  assert.equal(gradients.length,7);
  assert.equal(dayButtons.length,7);
  assert.equal(dayButtons.filter(n=>n.props.accessibilityState.selected).length,1);
  assert.equal(dayButtons[current.getDay()].props.accessibilityState.selected,true);
  assert.equal(gradients[current.getDay()].props.style[1].height,90);
  assert.ok(gradients.every(n=>n.props.style[1].height>=0 && n.props.style[1].height<=90));
  assert.equal(gradients[0].props.style[0].borderTopLeftRadius,6);
  dayButtons[0].props.onPress();
  const originalState = react.useState;
  react.useState = value => [value === 'weekly' ? 'monthly' : value, () => {}];
  const monthlyTree = WeeklyExpenseChart({expenses:[{expenseDate:key,amount:1250.5}]});
  react.useState = originalState;
  assert.equal(nodes(monthlyTree).filter(n=>n.type==='LinearGradient').length,new Date(current.getFullYear(),current.getMonth()+1,0).getDate());
  assert.equal(nodes(monthlyTree).find(n=>n.type==='ScrollView').props.scrollEnabled,true);
}
console.log('PASS: Mint Gradient weekly chart, Sunday-first, year/month boundary, totals, empty/zero days, exact-height bars, EN/BN and both themes');
