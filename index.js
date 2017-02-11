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
let lastCount = 0;
update();

function update() {
  let letters = document.getElementById('letters').value;
  let count = letters.length;
  if (count !== lastCount) {
    state = [];
    lastCount = count;
  }
  let filter = document.getElementById('filter').value;

  location.hash = 'L=' + letters + (filter && '&filter=' + filter);

  let table = '<table border="1"><tr title="click a column head to remove that column"><th class="left"></th>' + letters.split('').map((c, i) => `<th data-header-letter-index="${i}" class="letterheader">${c}</th>`).join('') + '</tr>';
  let flips = Array(count).fill(0);
  for (let j = 0, rows = 1 << count; j < rows; j) {

    let header = letters.split('').map((l, i) => `let ${l} = ${flips[i]};\n`).join('') + '!state[j];\n';
    let result;
    try {
      result = !eval(header + filter);
    } catch (e) {
      document.getElementById('filter').classList.add('orange');
    }

    table += `<tr class="t ${result ? 'red' : ''}" data-row-index="${j}" title="click a row to toggle it"><th class="left">${j}</th>`;
    for (let i = 0; i < count; ++i) {
      table += `<td data-letter-index="${i}">${flips[i]}</td>`;
    }
    table += '</tr>';
    ++j;
    flips.forEach((v, i) => flips[i] = (j % (1 << i)) == 0 ? +!v : v);
  }
  TABLE.innerHTML = table;
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
    let tr = e.target.parentNode;
    let n = e.target.getAttribute('data-header-letter-index');

    tr.removeChild(e.target);
    let q = '[data-letter-index="' + n + '"]';
    let all = TABLE.querySelectorAll(q);
    [...all].forEach(node => node.parentNode.removeChild(node));
  }
  return false;
};
function copy() {
  document.getElementById('copies').appendChild(document.createElement('div')).innerHTML = TABLE.innerHTML;
}

function reduce() {
  let hash = {};
  let header;
  let list = [];
  [...TABLE.querySelectorAll('tr')].forEach((tr, j) => {
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