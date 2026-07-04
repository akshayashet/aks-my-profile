export default async function decorate(block) {
  const anchor = block.querySelector('a[href]');

  if (!anchor) {
    block.textContent = 'No JSON URL found in this block.';
    return;
  }

  const url = anchor.href;
  block.textContent = 'Loading data...';

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      block.textContent = `Failed to load JSON data: ${response.status} ${response.statusText}`;
      return;
    }

    const json = await response.json();
    const data = extractTableData(json);
    const table = buildTable(data);
    block.innerHTML = '';
    block.appendChild(table);
  } catch (error) {
    block.textContent = `Error loading JSON: ${error.message}`;
  }
}

function extractTableData(json) {
  if (json && typeof json === 'object') {
    if (json.data !== undefined && json.data !== null) {
      return json.data;
    }
    if (Array.isArray(json.items) && json.items.length > 0) {
      return json.items;
    }
  }
  return json;
}

function buildTable(data) {
  const table = document.createElement('table');
  table.className = 'json-table';

  if (Array.isArray(data)) {
    const columns = getColumnKeys(data);
    const head = table.createTHead();
    const headRow = head.insertRow();
    columns.forEach((col) => {
      const cell = document.createElement('th');
      cell.textContent = col;
      headRow.appendChild(cell);
    });

    const body = table.createTBody();
    data.forEach((item) => {
      const row = body.insertRow();
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        columns.forEach((col) => {
          row.insertCell().textContent = stringifyValue(item[col]);
        });
      } else {
        row.insertCell().textContent = stringifyValue(item);
      }
    });
    return table;
  }

  if (data && typeof data === 'object') {
    const head = table.createTHead();
    const headRow = head.insertRow();
    ['Key', 'Value'].forEach((label) => {
      const cell = document.createElement('th');
      cell.textContent = label;
      headRow.appendChild(cell);
    });

    const body = table.createTBody();
    Object.keys(data).forEach((key) => {
      const row = body.insertRow();
      row.insertCell().textContent = key;
      row.insertCell().textContent = stringifyValue(data[key]);
    });
    return table;
  }

  const body = table.createTBody();
  const row = body.insertRow();
  row.insertCell().textContent = stringifyValue(data);
  return table;
}

function getColumnKeys(items) {
  const keys = new Set();
  items.forEach((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      Object.keys(item).forEach((key) => keys.add(key));
    }
  });
  return keys.size > 0 ? [...keys] : ['Value'];
}

function stringifyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
