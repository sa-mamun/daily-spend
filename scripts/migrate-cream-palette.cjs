// Mechanical UI-only palette migration; data and storage are intentionally untouched.
const fs = require('fs');
const path = require('path');
const replacements = {
  '#4ec3a0':'#dfa43e', '#143e30':'#181713', '#16352c':'#181713', '#123c30':'#181713', '#17362b':'#181713',
  '#166b51':'#78520e', '#1e7456':'#78520e', '#76d8b8':'#edc176', '#87dbb7':'#edc176',
  '#f3f8f6':'#efebe2', '#edf3ef':'#efebe2', '#e9f5ef':'#efebe2', '#111c17':'#1b1b18', '#101d17':'#1b1b18',
  '#1c2924':'#2a2924', '#21352b':'#2a2924', '#18352b':'#2a2924', '#26392e':'#353229',
  '#edf6f1':'#f5f0e6', '#eef7f1':'#f5f0e6', '#effcf6':'#f5f0e6', '#edf0fb':'#f5f0e6',
  '#5b746a':'#706b61', '#5b7266':'#706b61', '#a7bdb3':'#b9b2a4', '#afc7ba':'#b9b2a4',
  '#32443b':'#454035', '#e1ebe6':'#e8e4db', '#465d50':'#454035', '#567560':'#454035',
  '#e1f5ed':'#f7ead0', '#e4f3eb':'#f7ead0', '#243e33':'#48391f', '#304e3d':'#48391f', '#2b4235':'#36332c',
  '#88dcc1':'#f0c578', '#b5ead6':'#e8e4db', '#36775e':'#454035', '#255e49':'#2a2924', '#337d61':'#2a2924',
};
function walk(dir) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir,item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file) && !/(Service|storage|translations|models|mint\.ts|orbitTheme)/.test(file)) {
      const old = fs.readFileSync(file,'utf8');
      const next = old.replace(/#[0-9a-f]{6}\b/gi, color => replacements[color.toLowerCase()] || color);
      if (next !== old) fs.writeFileSync(file,next);
    }
  }
}
walk(path.join(__dirname,'..','src'));
