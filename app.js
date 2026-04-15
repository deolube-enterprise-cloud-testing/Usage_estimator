/**
 * Electricity Usage Estimator – Application Logic
 *
 * Features:
 *  - Add / remove appliances with name, power (kW), hours/day, and on/off status
 *  - User-supplied kWh price and billing-month length
 *  - Per-appliance and totals calculation:
 *      monthly kWh  = kW × hours_per_day × days_in_month
 *      monthly cost = monthly_kWh × price_per_kWh
 *  - Visual breakdown bars comparing each appliance's share of the total
 *  - "Savings" column: cost of appliances currently marked Off (what you'd pay if switched On)
 */

"use strict";

/* ─────────────────────────────────────────────
   State
   ───────────────────────────────────────────── */
const state = {
  appliances: [],   // { id, name, kw, hoursPerDay, status }
  nextId: 1,
};

/* ─────────────────────────────────────────────
   DOM References
   ───────────────────────────────────────────── */
const kwPriceInput   = document.getElementById("kw-price");
const daysInput      = document.getElementById("days-in-month");
const nameInput      = document.getElementById("appliance-name");
const kwInput        = document.getElementById("appliance-kw");
const hoursInput     = document.getElementById("hours-per-day");
const addBtn         = document.getElementById("add-btn");
const addError       = document.getElementById("add-error");
const emptyState     = document.getElementById("empty-state");
const tableWrapper   = document.getElementById("appliance-table-wrapper");
const tbody          = document.getElementById("appliance-tbody");
const noResults      = document.getElementById("no-results");
const resultsContent = document.getElementById("results-content");

// Summary elements
const totalKwhEl   = document.getElementById("total-kwh");
const totalCostEl  = document.getElementById("total-cost");
const savingsEl    = document.getElementById("savings-kwh");
const rateApplied  = document.getElementById("rate-applied");
const breakdownEl  = document.getElementById("breakdown-bars");

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Return the currently selected On/Off radio value.
 */
function getSelectedStatus() {
  const radios = document.querySelectorAll('input[name="appliance-status"]');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return "on";
}

/**
 * Format a number as a dollar amount with two decimal places.
 * @param {number} n
 * @returns {string}
 */
function formatCurrency(n) {
  return "$" + n.toFixed(2);
}

/**
 * Format a number as a kWh value with two decimal places.
 * @param {number} n
 * @returns {string}
 */
function formatKwh(n) {
  return n.toFixed(2) + " kWh";
}

/**
 * Calculate the monthly kWh for one appliance entry.
 * @param {number} kw
 * @param {number} hoursPerDay
 * @param {number} days
 * @returns {number}
 */
function calcMonthlyKwh(kw, hoursPerDay, days) {
  return kw * hoursPerDay * days;
}

/* ─────────────────────────────────────────────
   Add Appliance
   ───────────────────────────────────────────── */
addBtn.addEventListener("click", addAppliance);

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAppliance();
});
kwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAppliance();
});
hoursInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAppliance();
});

function showError(msg) {
  addError.textContent = msg;
  addError.classList.remove("hidden");
}

function clearError() {
  addError.textContent = "";
  addError.classList.add("hidden");
}

function addAppliance() {
  clearError();

  const name      = nameInput.value.trim();
  const kw        = parseFloat(kwInput.value);
  const hours     = parseFloat(hoursInput.value);
  const status    = getSelectedStatus();

  // Validation
  if (!name) {
    showError("Please enter an appliance name.");
    nameInput.focus();
    return;
  }
  if (isNaN(kw) || kw <= 0) {
    showError("Please enter a valid power rating in kW (must be greater than 0).");
    kwInput.focus();
    return;
  }
  if (isNaN(hours) || hours < 0 || hours > 24) {
    showError("Please enter hours used per day between 0 and 24.");
    hoursInput.focus();
    return;
  }

  state.appliances.push({
    id:          state.nextId++,
    name,
    kw,
    hoursPerDay: hours,
    status,
  });

  // Reset inputs
  nameInput.value  = "";
  kwInput.value    = "";
  hoursInput.value = "24";
  // Reset radio to "on"
  document.querySelector('input[name="appliance-status"][value="on"]').checked = true;
  nameInput.focus();

  render();
}

/* ─────────────────────────────────────────────
   Remove Appliance
   ───────────────────────────────────────────── */
function removeAppliance(id) {
  state.appliances = state.appliances.filter((a) => a.id !== id);
  render();
}

/* ─────────────────────────────────────────────
   Toggle Appliance Status (inline table)
   ───────────────────────────────────────────── */
function toggleStatus(id) {
  const appliance = state.appliances.find((a) => a.id === id);
  if (appliance) {
    appliance.status = appliance.status === "on" ? "off" : "on";
    render();
  }
}

/* ─────────────────────────────────────────────
   Render
   ───────────────────────────────────────────── */

// Re-render whenever rate or days inputs change
kwPriceInput.addEventListener("input", render);
daysInput.addEventListener("input", render);

function render() {
  renderTable();
  renderResults();
}

function renderTable() {
  const hasAppliances = state.appliances.length > 0;

  emptyState.classList.toggle("hidden", hasAppliances);
  tableWrapper.classList.toggle("hidden", !hasAppliances);

  if (!hasAppliances) return;

  const days  = parseFloat(daysInput.value) || 30;
  const price = parseFloat(kwPriceInput.value) || 0;

  tbody.innerHTML = "";

  state.appliances.forEach((appliance) => {
    const monthlyKwh  = calcMonthlyKwh(appliance.kw, appliance.hoursPerDay, days);
    const monthlyCost = monthlyKwh * price;
    const isOn        = appliance.status === "on";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(appliance.name)}</td>
      <td>${appliance.kw.toFixed(3)}</td>
      <td>${appliance.hoursPerDay}</td>
      <td>
        <button
          class="status-badge ${isOn ? "status-on" : "status-off"}"
          title="Click to toggle On/Off"
          onclick="toggleStatus(${appliance.id})"
          style="cursor:pointer;border:none;"
        >${isOn ? "On" : "Off"}</button>
      </td>
      <td>${formatKwh(monthlyKwh)}</td>
      <td class="cost-cell ${isOn ? "" : "inactive"}">${formatCurrency(monthlyCost)}</td>
      <td>
        <button class="btn btn-danger" onclick="removeAppliance(${appliance.id})">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderResults() {
  const hasAppliances = state.appliances.length > 0;

  noResults.classList.toggle("hidden", hasAppliances);
  resultsContent.classList.toggle("hidden", !hasAppliances);

  if (!hasAppliances) return;

  const days  = parseFloat(daysInput.value) || 30;
  const price = parseFloat(kwPriceInput.value) || 0;

  let totalActiveKwh  = 0;
  let totalActiveCost = 0;
  let totalOffKwh     = 0;
  let totalOffCost    = 0;

  const items = state.appliances.map((appliance) => {
    const monthlyKwh  = calcMonthlyKwh(appliance.kw, appliance.hoursPerDay, days);
    const monthlyCost = monthlyKwh * price;
    const isOn        = appliance.status === "on";

    if (isOn) {
      totalActiveKwh  += monthlyKwh;
      totalActiveCost += monthlyCost;
    } else {
      totalOffKwh  += monthlyKwh;
      totalOffCost += monthlyCost;
    }

    return { appliance, monthlyKwh, monthlyCost, isOn };
  });

  // Update summary cards
  totalKwhEl.textContent  = formatKwh(totalActiveKwh);
  totalCostEl.textContent = formatCurrency(totalActiveCost);
  savingsEl.textContent   = `${formatKwh(totalOffKwh)} / ${formatCurrency(totalOffCost)}`;
  rateApplied.textContent = `${formatCurrency(price)} / kWh`;

  // Breakdown bars — use total of ALL appliances for percentage width
  const grandTotal = totalActiveKwh + totalOffKwh;

  breakdownEl.innerHTML = "";

  items.forEach(({ appliance, monthlyKwh, monthlyCost, isOn }) => {
    const pct = grandTotal > 0 ? (monthlyKwh / grandTotal) * 100 : 0;

    const row = document.createElement("div");
    row.className = "breakdown-bar-row";
    row.innerHTML = `
      <span class="breakdown-name" title="${escapeHtml(appliance.name)}">${escapeHtml(appliance.name)}</span>
      <div class="breakdown-track">
        <div
          class="breakdown-fill ${isOn ? "fill-on" : "fill-off"}"
          style="width:${pct.toFixed(1)}%"
        ></div>
      </div>
      <span class="breakdown-amount ${isOn ? "" : "off"}">${formatCurrency(monthlyCost)}</span>
    `;
    breakdownEl.appendChild(row);
  });
}

/* ─────────────────────────────────────────────
   Export
   ───────────────────────────────────────────── */

/**
 * Export the current appliance list and summary as a CSV file.
 */
function exportCSV() {
  const days  = parseFloat(daysInput.value) || 30;
  const price = parseFloat(kwPriceInput.value) || 0;

  const rows = [];

  // Report header
  rows.push(["Electricity Usage Estimator – Monthly Report"]);
  rows.push(["Rate ($/kWh)", price.toFixed(3)]);
  rows.push(["Billing Days", days]);
  rows.push(["Generated", new Date().toLocaleString()]);
  rows.push([]);

  // Table header
  rows.push(["Appliance", "Power (kW)", "Hours/Day", "Status", "Monthly kWh", "Monthly Cost ($)"]);

  let totalActiveKwh  = 0;
  let totalActiveCost = 0;
  let totalOffKwh     = 0;
  let totalOffCost    = 0;

  state.appliances.forEach((appliance) => {
    const monthlyKwh  = calcMonthlyKwh(appliance.kw, appliance.hoursPerDay, days);
    const monthlyCost = monthlyKwh * price;
    const isOn        = appliance.status === "on";

    if (isOn) {
      totalActiveKwh  += monthlyKwh;
      totalActiveCost += monthlyCost;
    } else {
      totalOffKwh  += monthlyKwh;
      totalOffCost += monthlyCost;
    }

    rows.push([
      appliance.name,
      appliance.kw.toFixed(3),
      appliance.hoursPerDay,
      isOn ? "On" : "Off",
      monthlyKwh.toFixed(2),
      monthlyCost.toFixed(2),
    ]);
  });

  // Summary
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Total Usage – Active Appliances (kWh)", totalActiveKwh.toFixed(2)]);
  rows.push(["Total Monthly Cost – Active ($)",       totalActiveCost.toFixed(2)]);
  rows.push(["Potential Savings – Off Appliances (kWh)", totalOffKwh.toFixed(2)]);
  rows.push(["Potential Savings – Off Appliances ($)",   totalOffCost.toFixed(2)]);

  // Encode to CSV
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "electricity_usage_estimate.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("export-csv-btn").addEventListener("click", exportCSV);
document.getElementById("print-btn").addEventListener("click", () => window.print());


function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ─────────────────────────────────────────────
   Initial render
   ───────────────────────────────────────────── */
render();
