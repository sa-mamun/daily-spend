const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
let focused = false;
const react = { useState: () => [focused, value => { focused = value; }],
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const result = { exports: {} };
const file = fs.readFileSync('src/features/expenses/CenteredAmountInput.tsx','utf8');
vm.runInNewContext(ts.transpileModule(file,{ compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText,
  { module: result, exports: result.exports, require(name) {
    if(name === 'react') return react;
    if(name === 'react-native') return { TextInput: 'Input', View: 'View', StyleSheet: { create: s => s } };
    return { Text: 'Text' };
  } });
const render = props => result.exports.CenteredAmountInput(props);
for(const color of ['#706b61','#b9b2a4']) {
  focused = false;
  const props = { value: '', placeholder: '0', placeholderTextColor: color };
  let tree = render(props);
  let input = tree.props.children[0];
  assert.equal(input.props.textAlign,'center');
  assert.equal(input.props.placeholder,'');
  assert.ok(tree.props.children[1]);
  input.props.onFocus({});
  assert.equal(render(props).props.children[1],false);
  assert.equal(render({...props,value:'125.50'}).props.children[0].props.value,'125.50');
  input.props.onBlur({});
  assert.ok(render(props).props.children[1]);
  assert.equal(render({...props,value:'125'}).props.children[1],false);
}
console.log('PASS: centered blank input, placeholder hidden on focus, amount preserved, blur hint, both theme colors');
