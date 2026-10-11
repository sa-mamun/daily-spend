const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const hooks = [], effects = [], runs = [];
let cursor = 0;
class Value {
  constructor(value) { this.value = value; this.stops = 0; }
  setValue(value) { this.value = value; }
  stopAnimation() { this.stops++; }
}
const React = {
  memo: component => component,
  createElement: (type, props, ...children) => ({type, props: {...props, children}}),
  useRef(value) { const i=cursor++; return hooks[i] ||= {current:value}; },
  useState(value) { const i=cursor++; if(!(i in hooks))hooks[i]=value; return [hooks[i], next=>hooks[i]=next]; },
  useEffect(callback, deps) { const i=cursor++; const old=hooks[i]; if(!old || deps.some((v,j)=>v!==old[j])) {hooks[i]=deps;effects.push(callback);} },
};
const Animated = {
  Value, View:'AnimatedView', createAnimatedComponent:()=> 'AnimatedPressable',
  spring(value, options) { return {start(complete){runs.push({value,...options,complete});}}; },
  parallel(animations) { return {start(){animations.forEach(a=>a.start());}}; },
};
const rn = {Animated, View:'View', Pressable:'Pressable', StyleSheet:{create:s=>s},
  Easing:{quad:'quad',cubic:'cubic',inOut:v=>'inOut '+v,out:v=>'out '+v},
  AccessibilityInfo:{isReduceMotionEnabled:()=>Promise.resolve(false),addEventListener:()=>({remove(){}})},
};
const filename=path.resolve(__dirname,'../src/components/BottomNavigation.tsx');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
const moduleMock={exports:{}};
vm.runInNewContext(compiled,{module:moduleMock,exports:moduleMock.exports,require(name){
  if(name==='react')return React;
  if(name==='react-native')return rn;
  if(name==='@expo/vector-icons')return {Ionicons:'Ionicons'};
  if(name==='../i18n/Text')return {Text:'Text'};
  return {orbitTheme:()=>({surface:'surface',soft:'soft',accent:'accent',mint:'#dfa43e',text:'text',muted:'muted'}),ORBIT_CHROME:{navHeight:68,navButtonHeight:52,navPadding:8}};
}});
let added=0;
const props={screen:'dashboard',dark:false,onNavigate:key=>props.screen=key,onAddExpense:()=>added++,addRef:{current:null},expensesRef:{current:null},categoriesRef:{current:null}};
function render(){cursor=0;return moduleMock.exports.BottomNavigation(props);}
function nodes(tree){if(!tree || typeof tree!=='object')return [];return [tree,...tree.props.children.flat(Infinity).flatMap(nodes)];}
for (const dark of [false,true]) {
  props.dark=dark;
  let tree=render();
  const tabs=nodes(tree).filter(n=>n.props.accessibilityRole==='tab');
  assert.equal(tabs.length,4);
  assert.equal(tabs.filter(n=>n.props.accessibilityState.selected).length,1);
  for (const item of tabs) {
    const icon = nodes(item).find(n => n.type === 'Ionicons');
    const label = nodes(item).find(n => n.type === 'Text');
    assert.equal(icon.props.style.textAlign, 'center');
    assert.equal(icon.props.style.width, '100%');
    assert.equal(label.props.style[0].width, '100%');
    assert.equal(label.props.style[0].textAlign, 'center');
    assert.ok(label.props.style[0].lineHeight >= 18, 'Bengali labels need enough vertical space');
  }
  for (const tab of tabs) {
    tab.props.onPress();
    const next=nodes(render()).filter(n=>n.props.accessibilityRole==='tab');
    assert.equal(next.filter(n=>n.props.accessibilityState.selected).length,1);
  }
  const add=nodes(tree).find(n=>n.type==='AnimatedPressable');
  assert.equal(add.props.ref,props.addRef);
  assert.equal(add.props.style[0].width,43);
  assert.equal(add.props.style[0].height,43);
  assert.equal(add.props.style[0].borderRadius,22);
  add.props.onPress(); add.props.onPressIn();add.props.onPressOut();
  assert.ok(runs.every(r=>r.useNativeDriver));
  assert.equal(nodes(tree).filter(n=>n.type==='AnimatedView').length,0,'New navigation must not retain the old sliding selection block');
}
assert.equal(added,2);
props.screen='budget';
assert.equal(nodes(render()).filter(n=>n.props.accessibilityRole==='tab' && n.props.accessibilityState.selected).length,0);
console.log('PASS: four equal navigation tabs, central circular add, immediate navigation, native press feedback, dark/light and tour refs');
