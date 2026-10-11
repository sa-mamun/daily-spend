const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function render({ dark = false, reduced = false, active = true } = {}) {
  const effects = [], events = [], timings = [], calls = [];
  let stateIndex = 0;
  const value = { setValue: n => calls.push(['reset', n]), interpolate: spec => spec, stopAnimation: () => calls.push(['stopValue']) };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useContext: () => dark, useRef: () => ({ current: value }),
    useState: () => [stateIndex++ === 0 ? reduced : active, () => {}],
    useEffect: effect => effects.push(effect),
  };
  const animated = { View: 'Animated.View', Value: class {},
    timing: (v, options) => { timings.push(options); return options; }, sequence: items => items,
    loop: () => ({ start: () => calls.push(['start']), stop: () => calls.push(['stopLoop']) }),
  };
  const listen = (event, handler) => { events.push(event); return { remove: () => calls.push(['remove', event]) }; };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('src/features/reports/ReportSummaryArtwork.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: name => {
    if (name === 'react') return react;
    if (name === 'react-native') return { Animated: animated, View: 'View', StyleSheet: { absoluteFill: {} }, Easing: { sin: 'sin', inOut: x => x },
      AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(reduced), addEventListener: listen },
      AppState: { currentState: active ? 'active' : 'background', addEventListener: listen } };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' };
    if (name.endsWith('/constants')) return { ThemeContext: {} };
    if (name.endsWith('/mint')) return { mintTheme: d => ({ soft: d ? '#48391f' : '#f7ead0', surface: d ? '#2a2924' : '#fff', accentText: d ? '#edc176' : '#78520e' }) };
    throw new Error(name);
  }});
  const tree = module.exports.ReportSummaryArtwork();
  const cleanups = effects.map(effect => effect());
  return { tree, timings, calls, events, cleanup: () => cleanups.forEach(fn => fn?.()) };
}
for (const dark of [false, true]) {
  const r = render({ dark });
  assert.equal(r.tree.props.pointerEvents, 'none');
  assert.equal(r.tree.props.importantForAccessibility, 'no-hide-descendants');
  assert.equal(r.tree.props.children[0].props.children[0].props.fill, dark ? '#48391f' : '#f7ead0');
  assert.equal(r.timings.length, 2);
  assert.ok(r.timings.every(t => t.useNativeDriver && t.isInteraction === false && t.duration === 2400));
  assert.ok(r.calls.some(c => c[0] === 'start'));
  assert.equal(r.tree.props.children[1].props.style[1].transform[0].translateY.outputRange[1], -4);
  r.cleanup();
  assert.ok(r.calls.some(c => c[0] === 'stopLoop'));
  assert.ok(r.calls.some(c => c[0] === 'stopValue'));
  assert.equal(r.calls.filter(c => c[0] === 'remove').length, 2);
}
for (const config of [{ reduced: true }, { active: false }]) {
  const r = render(config);
  assert.equal(r.timings.length, 0);
  assert.ok(!r.calls.some(c => c[0] === 'start'));
  r.cleanup();
}
console.log('PASS: floating receipt/pulse, light/dark surfaces, native non-blocking animation, background/reduced-motion pause and cleanup');
