if (location.hash) {
  if (location.hash.slice(0, 3) === '#L=') {
    let end = location.hash.indexOf('&');
    document.getElementById('filter').value = (location.hash.slice(end, end + 8) === '&filter=') ? location.hash.slice(end + 8) : '';
    if (end < 0) end = location.hash.length;
    document.getElementById('letters').value = location.hash.slice(3, end);
  }
}

let TABLE = document.getElementById('table');
let state = [];
let orders = {};
let lastCount = 0;
update();

function update() {
  let letters = document.getElementById('letters').value;
  let count = letters.length;
  if (count !== lastCount) {
    state = [];
    lastCount = count;
  }
  let filter1 = document.getElementById('filter').value;
  let filter2 = document.getElementById('filter2').value;

  location.hash = 'L=' + letters + (filter1 && '&filter=' + filter1);

  if (document.getElementById('cand').checked) {
    // replace commas such that `x,y` becomes `(x)&&(y)`
    filter1 = filter1 ? filter1.split(/,/g).map(s => '('+s+')').join('&&') : 'true';
    filter2 = filter2 && filter2.split(/,/g).map(s => '('+s+')').join('&&');
  }

  let table1 = `
  <table id="t1" border="1" data-letters="${letters} data-len="${letters.length}>
    <tr title="click a column head to remove that column">
      <th class="left sort"">sort</th>
      ${letters.split('').map((c, i) => `<th data-header-letter-index="${i}" class="letterheader">${c}</th>`).join('')}
    </tr>
  `;
  let table2 = table1.replace('t1','t2'); // they have the same header, regardless

  let flips = Array(count).fill(0);
  for (let j = 0, rows = 1 << count; j < rows; j) {
    let header = letters.split('').map((l, i) => `let ${l} = ${flips[i]};\n`).join('') + '!state[j];\n';
    let result;

    if (filter1) {
      try {
        result = !eval(header + filter1);
      } catch (e) {
        console.log('filter1 failed', e);
        console.log('filter:', [header + filter1]);
        document.getElementById('filter').classList.add('orange');
      }

      table1 += `<tr class="t ${result ? 'red' : ''}" data-row-index="${j}" title="click a row to toggle it"><th class="left">${j}</th>`;
      for (let i = 0; i < count; ++i) {
        table1 += `<td data-letter-index="${i}">${flips[i]}</td>`;
      }
      table1 += '</tr>';
    }
    if (filter2) {
      try {
        result = !eval(header + filter2);
      } catch (e) {
        console.log('filter2 failed', e);
        console.log('filter2:', [header + filter2], [filter2]);
        document.getElementById('filter2').classList.add('orange');
      }

      table2 += `<tr class="t ${result ? 'red' : ''}" data-row-index="${j}" title="click a row to toggle it"><th class="left">${j}</th>`;
      for (let i = 0; i < count; ++i) {
        table2 += `<td data-letter-index="${i}">${flips[i]}</td>`;
      }
      table2 += '</tr>';
    }
    ++j;
    flips.forEach((v, i) => flips[i] = (j % (1 << i)) == 0 ? +!v : v);
  }
  TABLE.innerHTML = table1 + (filter2?table2:'');
}

function toggleRed() {
  let old = document.getElementById('redtoggle');
  if (old) {
    old.parentElement.removeChild(old);
  } else {
    let css = document.createElement('style');
    css.innerText = 'tr.red { display: none; }';
    css.id = 'redtoggle';
    document.head.appendChild(css);
  }
}

TABLE.onclick = function (e) {
  if (e.target.nodeName === 'TD') {
    let tr = e.target.parentNode;
    tr.classList.toggle('red');
    let n = tr.getAttribute('data-header-letter-index');
    state[n] = tr.classList.contains('red');
  } else if (e.target.nodeName === 'TH' && e.target.className === 'letterheader') {
    removeLetter(e.target.parentNode.parentNode, e.target.getAttribute('data-header-letter-index'));
  } else if (e.target.classList.contains('sort')) {
    sortOnly(e.target.parentNode.parentNode, 1);
  }
  return false;
};

function filterChange(input) {
  input.classList.remove('orange');
  if (document.getElementById('automatch').checked) {
    matchWithout();
  }
}

function removeLetter(table, letterIndex) {
  let q = `[data-letter-index="${letterIndex}"], [data-header-letter-index="${letterIndex}"]`;
  let all = table.querySelectorAll(q);
  [...all].forEach(node => node.parentNode.removeChild(node));
}

function copy() {
  document.getElementById('copies').appendChild(document.createElement('div')).innerHTML = TABLE.innerHTML.replace(/id="/g, 'data-id="');
}

function reduce(table) {
  if (!table) return;
  let hash = {};
  let header;
  let list = [];
  [...table.querySelectorAll('tr')].forEach((tr, j) => {
    if (!j) {
      header = tr;
    } else {
      if (!tr.classList.contains('red')) {
        let code = tr.innerText.replace(/\s*\d+\s*/, '').replace(/\s*/g, '');
        if (hash[code] !== undefined) {
          tr.parentNode.removeChild(tr);
        } else {
          hash[code] = tr;
          list.push(code);
          tr.parentNode.removeChild(tr);
        }
      } else {
        tr.parentNode.removeChild(tr);
      }
    }
  });
  list.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  list.forEach(code => header.parentNode.appendChild(hash[code]));
}

function sortOnly(table) {
  if (!table) return;
  let trs = [...table.querySelectorAll('tr')];
  let header = trs.shift(); // drop the header TR
  let cols = header.children.length - 1; // ignore left column
  let letterIndex = (orders[table.id] = -~orders[table.id]) % cols;
  trs.sort((a, b) => {
    // yes, super inefficient. also not going to affect _that_ many elements so let's go for brevity over perf :)
    a = a.innerText.replace(/\s*\d+\s*/, '').replace(/\s*/g, '');
    b = b.innerText.replace(/\s*\d+\s*/, '').replace(/\s*/g, '');
    if (a[letterIndex] < b[letterIndex]) return -1;
    if (a[letterIndex] > b[letterIndex]) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  trs.forEach(tr => table.appendChild(tr));
  for (let i= 0; i<cols; ++i) {
    if (i===letterIndex) {
      header.children[i+1].classList.add('ordered');
    } else {
      header.children[i+1].classList.remove('ordered');
    }
  }
}

function compare() {
  let trs1 = [...document.querySelectorAll('#t1 tr')];
  let trs2 = [...document.querySelectorAll('#t2 tr')];
  if (!trs2.length) return;
  let hash1 = {};
  let hash2 = {};
  trs1.forEach((tr,i) => {
    if (!i) return;
    let code = tr.innerText.replace(/\s*\d+\s*/, '').replace(/\s*/g, '');
    hash1[code] = true;
  });
  trs2.forEach((tr,i) => {
    if (!i) return;
    let code = tr.innerText.replace(/\s*\d+\s*/, '').replace(/\s*/g, '');
    hash2[code] = true;
    if (hash1[code]) tr.classList.remove('orange');
    else tr.classList.add('orange');
  });
  trs1.forEach((tr,i) => {
    if (!i) return;
    let code = tr.innerText.replace(/\s*\d+\s*/, '').replace(/\s*/g, '');
    if (hash2[code]) tr.classList.remove('orange');
    else tr.classList.add('orange');
  });
}

function matchWithout() {
  update();
  _matchWithout(document.getElementById('t1'));
  _matchWithout(document.getElementById('t2'));
  compare();
}
function _matchWithout(table) {
  if (!table) return;
  let letters = table.getAttribute('data-letters');
  // get the letters to remove and map them to their index of the letters on the table. remove missing letters (like spaces)
  let toRemove = document.getElementById('mwo').value.split('').map(l => letters.indexOf(l)).filter(i => i >= 0);
  toRemove.forEach(i => removeLetter(table, i));
  reduce(table);
}