function pushLine(line, escape) {
  const parts = line.split(/\{\{(.*?)\}\}/);
  const codes = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      const text = parts[i];
      if (text) {
        codes.push(`__r.push('${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`);
      }
    } else {
      const expr = parts[i].trim();
      let valCode;

      if (expr === 'this') {
        valCode = '__arr[__i]';
      } else if (expr === '@index') {
        valCode = '__i';
      } else if (expr.startsWith('@')) {
        codes.push("__r.push('')");
        continue;
      } else {
        valCode = `(typeof ${expr}!=='undefined'?${expr}:'')`;
      }

      if (escape) {
        codes.push(`__r.push(__esc(${valCode}))`);
      } else {
        codes.push(`__r.push(${valCode})`);
      }
    }
  }

  return codes.join(';');
}

function render(template, data, options = {}) {
  const shouldEscape = options.escape !== false;

  const fnBody = [];
  fnBody.push('var __r=[];');

  if (shouldEscape) {
    fnBody.push(
      "function __esc(s){" +
        "var s=String(s)," +
        "m={'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#x27;'};" +
        "return s.replace(/[&<>\"']/g,function(c){return m[c]})" +
      "}"
    );
  }

  const lines = template.split('\n');

  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];

    while (line.length > 0) {
      const eachOpen = line.match(/\{\{#each\s+(\w+)\}\}/);
      const ifOpen = line.match(/\{\{#if\s+(\w+)\}\}/);
      const eachClose = line.indexOf('{{/each}}');
      const ifClose = line.indexOf('{{/if}}');

      const candidates = [];

      if (eachOpen) candidates.push({ type: 'each-open', idx: eachOpen.index, len: eachOpen[0].length, name: eachOpen[1] });
      if (ifOpen) candidates.push({ type: 'if-open', idx: ifOpen.index, len: ifOpen[0].length, name: ifOpen[1] });
      if (eachClose !== -1) candidates.push({ type: 'each-close', idx: eachClose, len: 9 });
      if (ifClose !== -1) candidates.push({ type: 'if-close', idx: ifClose, len: 7 });

      if (candidates.length === 0) {
        fnBody.push(pushLine(line, shouldEscape));
        line = '';
        break;
      }

      candidates.sort((a, b) => a.idx - b.idx);
      const first = candidates[0];

      const before = line.substring(0, first.idx);
      if (before) {
        fnBody.push(pushLine(before, shouldEscape));
      }

      switch (first.type) {
        case 'each-open':
          fnBody.push(`var __arr=${first.name};for(var __i=0;__i<__arr.length;__i++){`);
          break;
        case 'if-open':
          fnBody.push(`if(${first.name}){`);
          break;
        case 'each-close':
        case 'if-close':
          fnBody.push('}');
          break;
      }

      line = line.substring(first.idx + first.len);
    }

    if (li < lines.length - 1) {
      fnBody.push("__r.push('\\n');");
    }
  }

  const code = `with(__data){${fnBody.join(';\n')};return __r.join('');}`;
  const fn = new Function('__data', code);
  return fn(data);
}

module.exports = { render };
