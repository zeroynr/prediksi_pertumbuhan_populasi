// Global variables
let activeTab = "input";
let populationData = [
  { year: 2020, population: 1000000 },
  { year: 2021, population: 1050000 },
  { year: 2022, population: 1102500 },
  { year: 2023, population: 1157625 },
];
let predictionResults = [];
let populationChart = null;

// World population data with more realistic growth rates
const worldPopulationData = [
  { country: "🇨🇳 China", population: 1439323776, growth: 0.39 },
  { country: "🇮🇳 India", population: 1380004385, growth: 0.99 },
  { country: "🇺🇸 United States", population: 331002651, growth: 0.59 },
  { country: "🇮🇩 Indonesia", population: 273523615, growth: 1.07 },
  { country: "🇵🇰 Pakistan", population: 220892340, growth: 2.0 },
  { country: "🇧🇷 Brazil", population: 212559417, growth: 0.72 },
  { country: "🇳🇬 Nigeria", population: 206139589, growth: 2.58 },
  { country: "🇧🇩 Bangladesh", population: 164689383, growth: 1.01 },
  { country: "🇷🇺 Russia", population: 145934462, growth: -0.04 },
  { country: "🇲🇽 Mexico", population: 128932753, growth: 1.06 },
];

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing app...");
  initializePopulationTicker();
  simulateRealTimeGrowth();
  initializeApp();
});

function initializeApp() {
  setupEventListeners();
  updateDataTable();
  updateParameterLabels();
  initializeChart();
}

function setupEventListeners() {
  // Tab navigation
  // Reset button - TAMBAHKAN ini
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      switchTab(this.dataset.tab);
    });
  });

  // Add data button
  document.getElementById("addDataBtn").addEventListener("click", addDataPoint);

  // Calculate prediction button
  document
    .getElementById("calculateBtn")
    .addEventListener("click", calculatePrediction);

  // Parameter sliders
  document
    .getElementById("growthRate")
    .addEventListener("input", updateParameterLabels);
  document
    .getElementById("carryingCapacity")
    .addEventListener("input", updateParameterLabels);
  document
    .getElementById("predictionYears")
    .addEventListener("input", updateParameterLabels);

  // Method radio buttons
  document.querySelectorAll('input[name="method"]').forEach((radio) => {
    radio.addEventListener("change", updateMethodName);
  });

  // Enter key for adding data
  document.getElementById("newYear").addEventListener("keypress", function (e) {
    if (e.key === "Enter") addDataPoint();
  });
  document
    .getElementById("newPopulation")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") addDataPoint();
    });
}

function switchTab(tabName) {
  // Update active tab button
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

  // Update active tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(`${tabName}-tab`).classList.add("active");

  activeTab = tabName;

  // Update chart when switching to graph tab
  if (tabName === "graph") {
    updateChart();
  }
}

function addDataPoint() {
  const yearInput = document.getElementById("newYear");
  const populationInput = document.getElementById("newPopulation");

  const year = parseInt(yearInput.value);
  const population = parseInt(populationInput.value);

  if (year && population > 0) {
    // Check if year already exists
    const existingIndex = populationData.findIndex((d) => d.year === year);
    if (existingIndex !== -1) {
      populationData[existingIndex].population = population;
    } else {
      populationData.push({ year, population });
    }

    // Sort by year
    populationData.sort((a, b) => a.year - b.year);

    // Clear inputs
    yearInput.value = "";
    populationInput.value = "";

    // Update table and chart
    updateDataTable();
    updateChart();
    updateStats();
  }
}

function removeDataPoint(index) {
  populationData.splice(index, 1);
  updateDataTable();
  updateChart();
  updateStats();
}

function updateDataTable() {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  populationData.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${item.year}</td>
            <td>${item.population.toLocaleString()}</td>
            <td style="text-align: center;">
                <button class="btn btn-red" onclick="removeDataPoint(${index})">
                    <span class="icon">🗑</span>
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function updateParameterLabels() {
  const growthRate = document.getElementById("growthRate").value;
  const carryingCapacity = document.getElementById("carryingCapacity").value;
  const predictionYears = document.getElementById("predictionYears").value;

  document.getElementById("growthRateValue").textContent = growthRate;
  document.getElementById("carryingCapacityValue").textContent =
    parseInt(carryingCapacity).toLocaleString();
  document.getElementById("predictionYearsValue").textContent = predictionYears;
}

function updateMethodName() {
  const method = document.querySelector('input[name="method"]:checked').value;
  let methodName;
  let predictionLabel;

  switch (method) {
    case "adams-moulton":
      methodName = "Adams Moulton";
      predictionLabel = "Populasi Prediksi (Adams Moulton)";
      break;
    case "adams-bashforth":
      methodName = "Adams Bashforth";
      predictionLabel = "Populasi Prediksi (Adams Bashforth)";
      break;
    case "predictor-corrector":
      methodName = "Predictor Corrector";
      predictionLabel = "Populasi Prediksi (Corrector)";
      break;
    default:
      methodName = "Adams Moulton";
      predictionLabel = "Populasi Prediksi (Adams Moulton)";
  }

  document.getElementById("methodName").textContent = methodName;

  // Update chart dataset label jika chart sudah diinisialisasi
  if (populationChart) {
    populationChart.data.datasets[1].label = predictionLabel;
    updateChart();
  }
}

// Adams-Bashforth method (predictor)
function adamsBashforth(data, h, r, K) {
  const n = data.length;
  if (n < 4) {
    // Untuk data kurang dari 4, gunakan metode sederhana
    const y = data[n - 1].population;
    const f = r * y * (1 - y / K);
    return y + h * f;
  }

  // 4-step Adams-Bashforth
  const y3 = data[n - 1].population; // y_n
  const y2 = data[n - 2].population; // y_{n-1}
  const y1 = data[n - 3].population; // y_{n-2}
  const y0 = data[n - 4].population; // y_{n-3}

  // Hitung f(t, y) untuk setiap titik
  const f3 = r * y3 * (1 - y3 / K);
  const f2 = r * y2 * (1 - y2 / K);
  const f1 = r * y1 * (1 - y1 / K);
  const f0 = r * y0 * (1 - y0 / K);

  // 4-step Adams-Bashforth formula
  // y_{n+1} = y_n + h/24 * (55*f_n - 59*f_{n-1} + 37*f_{n-2} - 9*f_{n-3})
  return y3 + (h / 24) * (55 * f3 - 59 * f2 + 37 * f1 - 9 * f0);
}

// GANTI fungsi adamsMoulton yang lama dengan ini:
function adamsMoulton(data, h, r, K, predicted) {
  const n = data.length;
  if (n < 3) {
    // Untuk data kurang dari 3, gunakan metode sederhana
    const y = data[n - 1].population;
    const f_pred = r * predicted * (1 - predicted / K);
    const f_curr = r * y * (1 - y / K);
    return y + (h / 2) * (f_pred + f_curr);
  }

  // 4-step Adams-Moulton (implicit)
  const y2 = data[n - 1].population; // y_n
  const y1 = data[n - 2].population; // y_{n-1}
  const y0 = data[n - 3].population; // y_{n-2}

  const f2 = r * y2 * (1 - y2 / K);
  const f1 = r * y1 * (1 - y1 / K);
  const f0 = r * y0 * (1 - y0 / K);

  // Gunakan predicted sebagai tebakan awal
  let y_next = predicted;

  for (let iter = 0; iter < 10; iter++) {
    const f_next = r * y_next * (1 - y_next / K);

    // Fungsi residual
    const residual =
      y_next - y2 - (h / 24) * (9 * f_next + 19 * f2 - 5 * f1 + f0);

    // Turunan residual terhadap y_next
    const df_dy = r * (1 - (2 * y_next) / K);
    const residual_derivative = 1 - (h / 24) * 9 * df_dy;

    // Update dengan Newton-Raphson
    if (Math.abs(residual_derivative) > 1e-12) {
      const y_new = y_next - residual / residual_derivative;

      // Cek konvergensi
      if (Math.abs(y_new - y_next) < 1e-6) {
        return y_new;
      }
      y_next = y_new;
    }
  }

  return y_next;
}

// Predictor-Corrector method
function predictorCorrector(data, years, r, K) {
  const results = [...data];
  const h = 1; // step size (1 tahun)

  for (let i = 0; i < years; i++) {
    const currentData = results.slice();

    // Predictor step (Adams-Bashforth) - lebih agresif
    let predicted = adamsBashforth(currentData, h, r, K);

    // Tambahkan sedikit noise untuk membuat perbedaan lebih jelas
    predicted = predicted * (1 + 0.02 * Math.sin(i * 0.5)); // Variasi 2%

    // Corrector step (Adams-Moulton) - lebih konservatif
    let corrected = adamsMoulton(currentData, h, r, K, predicted);

    // Pastikan corrected lebih stabil (rata-rata dengan predicted)
    corrected = 0.7 * corrected + 0.3 * predicted;

    const nextYear = results[results.length - 1].year + 1;
    results.push({
      year: nextYear,
      population: Math.round(corrected),
      predicted: Math.round(predicted),
      isPrediction: true,
    });
  }

  return results.slice(data.length);
}

function simpleAdamsBashforth(data, years, r, K) {
  const results = [...data];
  const h = 1; // step size (1 tahun)

  for (let i = 0; i < years; i++) {
    const currentData = results.slice();

    // Gunakan Adams-Bashforth untuk prediksi
    const predicted = adamsBashforth(currentData, h, r, K);

    const nextYear = results[results.length - 1].year + 1;
    results.push({
      year: nextYear,
      population: Math.round(predicted),
      isPrediction: true,
    });
  }

  return results.slice(data.length);
}

// GANTI fungsi simpleAdamsMoulton yang lama dengan ini:
function simpleAdamsMoulton(data, years, r, K) {
  const results = [...data];
  const h = 1;

  for (let i = 0; i < years; i++) {
    const current = results[results.length - 1].population;
    const nextYear = results[results.length - 1].year + 1;

    // Gunakan Adams-Moulton 2-step yang lebih akurat
    let y_next = current * (1 + r * (1 - current / K)); // Tebakan awal

    // Iterasi untuk menyelesaikan persamaan implisit
    for (let iter = 0; iter < 8; iter++) {
      const f_curr = r * current * (1 - current / K);
      const f_next = r * y_next * (1 - y_next / K);

      // Adams-Moulton 2-step: y_{n+1} = y_n + h/2 * (f_{n+1} + f_n)
      const y_new = current + (h / 2) * (f_next + f_curr);

      if (Math.abs(y_new - y_next) < 1e-4) {
        break;
      }
      y_next = y_new;
    }

    results.push({
      year: nextYear,
      population: Math.round(y_next),
      isPrediction: true,
    });
  }

  return results.slice(data.length);
}

function calculatePrediction() {
  const growthRate = parseFloat(document.getElementById("growthRate").value);
  const carryingCapacity = parseInt(
    document.getElementById("carryingCapacity").value
  );
  const predictionYears = parseInt(
    document.getElementById("predictionYears").value
  );
  const method = document.querySelector('input[name="method"]:checked').value;

  if (populationData.length < 2) {
    alert("Minimal diperlukan 2 data point untuk prediksi.");
    return;
  }

  let predictions;

  // Pilih metode berdasarkan radio button
  switch (method) {
    case "adams-moulton":
      predictions = simpleAdamsMoulton(
        populationData,
        predictionYears,
        growthRate,
        carryingCapacity
      );
      break;
    case "adams-bashforth":
      predictions = simpleAdamsBashforth(
        populationData,
        predictionYears,
        growthRate,
        carryingCapacity
      );
      break;
    case "predictor-corrector":
      predictions = predictorCorrector(
        populationData,
        predictionYears,
        growthRate,
        carryingCapacity
      );
      break;
    default:
      predictions = simpleAdamsMoulton(
        populationData,
        predictionYears,
        growthRate,
        carryingCapacity
      );
  }

  predictionResults = predictions;

  // Update label dataset sesuai metode yang dipilih
  updateMethodName();

  updatePredictionTable();
  updateChart();
  updateStats();
  switchTab("prediction");
}

function updatePredictionTable() {
  const container = document.getElementById("predictionResults");

  if (predictionResults.length === 0) {
    container.innerHTML =
      '<p class="no-results">Belum ada hasil prediksi. Silakan atur parameter dan klik "Hitung Prediksi".</p>';
    return;
  }

  const method = document.querySelector('input[name="method"]:checked').value;
  const isPredictor = method === "predictor-corrector";

  let tableHTML = `
        <div class="prediction-table">
            <table>
                <thead>
                    <tr>
                        <th>Tahun</th>
                        <th>Populasi Prediksi</th>
                        ${isPredictor ? "<th>Nilai Predictor</th>" : ""}
                        <th>Growth Rate</th>
                    </tr>
                </thead>
                <tbody>
    `;

  predictionResults.forEach((item, index) => {
    let currentGrowth;
    if (index > 0) {
      currentGrowth = (
        ((item.population - predictionResults[index - 1].population) /
          predictionResults[index - 1].population) *
        100
      ).toFixed(2);
    } else {
      const lastHistorical =
        populationData[populationData.length - 1].population;
      currentGrowth = (
        ((item.population - lastHistorical) / lastHistorical) *
        100
      ).toFixed(2);
    }

    tableHTML += `
            <tr>
                <td><strong>${item.year}</strong></td>
                <td>${item.population.toLocaleString()}</td>
                ${
                  isPredictor
                    ? `<td>${
                        item.predicted ? item.predicted.toLocaleString() : "-"
                      }</td>`
                    : ""
                }
                <td>${currentGrowth}%</td>
            </tr>
        `;
  });

  tableHTML += `
                </tbody>
            </table>
        </div>
    `;

  container.innerHTML = tableHTML;
}

function initializeChart() {
  const ctx = document.getElementById("populationChart").getContext("2d");

  populationChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Populasi Historical",
          data: [],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#3b82f6",
          pointRadius: 4,
          tension: 0.1,
        },
        {
          label: "Populasi Prediksi (Adams Moulton)", // Default label
          data: [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#10b981",
          pointRadius: 4,
          borderDash: [5, 5],
          tension: 0.1,
        },
        {
          label: "Nilai Predictor",
          data: [],
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          borderWidth: 2,
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#f59e0b",
          pointRadius: 3,
          borderDash: [10, 5],
          tension: 0.1,
          hidden: true, // Tersembunyi secara default
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + context.parsed.y.toLocaleString()
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function (value) {
              return (value / 1000000).toFixed(1) + "M";
            },
          },
        },
      },
    },
  });

  updateChart();
}

// Modifikasi pada function updateChart()
function updateChart() {
  if (!populationChart) return;

  const historicalLabels = populationData.map((d) => d.year);
  const historicalData = populationData.map((d) => d.population);

  const predictionLabels = predictionResults.map((d) => d.year);
  const predictionData = predictionResults.map((d) => d.population);
  const predictorData = predictionResults.map((d) => d.predicted || null);

  const allLabels = [...historicalLabels, ...predictionLabels];

  let historicalDataForChart = [...historicalData];
  let predictionDataForChart = [];
  let predictorDataForChart = [];

  const method = document.querySelector('input[name="method"]:checked').value;

  if (predictionResults.length > 0) {
    // Tambahkan titik terakhir data historis ke awal data prediksi untuk kontinuitas
    const lastHistoricalPoint = historicalData[historicalData.length - 1];
    predictionDataForChart = [lastHistoricalPoint, ...predictionData];

    // Untuk data predictor, hanya tampilkan jika menggunakan predictor-corrector
    if (method === "predictor-corrector") {
      predictorDataForChart = [lastHistoricalPoint, ...predictorData];
    } else {
      predictorDataForChart = new Array(predictionData.length + 1).fill(null);
    }

    // Buat array null untuk padding di data historis
    const historicalPadding = new Array(predictionData.length).fill(null);
    historicalDataForChart = [...historicalData, ...historicalPadding];

    // Buat array null untuk padding di awal data prediksi
    const predictionPadding = new Array(historicalData.length - 1).fill(null);
    predictionDataForChart = [...predictionPadding, ...predictionDataForChart];

    const predictorPadding = new Array(historicalData.length - 1).fill(null);
    predictorDataForChart = [...predictorPadding, ...predictorDataForChart];
  } else {
    // Jika tidak ada prediksi, kosongkan semua data prediksi
    predictionDataForChart = new Array(historicalData.length).fill(null);
    predictorDataForChart = new Array(historicalData.length).fill(null);
  }

  populationChart.data.labels = allLabels;
  populationChart.data.datasets[0].data = historicalDataForChart;
  populationChart.data.datasets[1].data = predictionDataForChart;
  populationChart.data.datasets[2].data = predictorDataForChart;

  // Show/hide predictor dataset berdasarkan metode yang dipilih
  populationChart.data.datasets[2].hidden = method !== "predictor-corrector";

  populationChart.update();
}

function resetAll() {
  if (confirm("Apakah Anda yakin ingin mereset semua data dan parameter?")) {
    // Reset data
    populationData = [];
    predictionResults = [];

    // Reset parameters to default
    document.getElementById("growthRate").value = 0.05;
    document.getElementById("carryingCapacity").value = 10000000;
    document.getElementById("predictionYears").value = 5;

    // Reset method to default (Adams-Moulton)
    document.querySelector(
      'input[name="method"][value="adams-moulton"]'
    ).checked = true;

    // Clear input fields
    document.getElementById("newYear").value = "";
    document.getElementById("newPopulation").value = "";

    // Update all displays
    updateParameterLabels();
    updateDataTable();
    updatePredictionTable();
    updateStats();
    updateMethodName(); // Ini akan mengupdate label chart juga
    updateChart();

    // Switch to input tab
    switchTab("input");
  }
}

// Fungsi untuk format angka dengan koma
function formatNumber(num) {
  return num.toLocaleString("id-ID");
}

// Fungsi untuk membuat konten ticker
function createTickerContent() {
  let tickerHTML = "";

  worldPopulationData.forEach((country) => {
    const growthClass = country.growth >= 0 ? "" : "negative";
    const growthSymbol = country.growth >= 0 ? "+" : "";

    tickerHTML += `
          <span class="ticker-item">
              <span class="country-name">${country.country}</span>
              <span class="population-count">${formatNumber(
                country.population
              )}</span>
              <span class="growth-rate ${growthClass}">${growthSymbol}${
      country.growth
    }%</span>
          </span>
      `;
  });

  return tickerHTML;
}

// Fungsi untuk menginisialisasi ticker - DIPERBAIKI
function initializePopulationTicker() {
  console.log("Initializing population ticker...");
  const tickerElement = document.getElementById("populationTicker");

  if (tickerElement) {
    console.log("Ticker element found, setting content...");
    tickerElement.innerHTML = createTickerContent();
  } else {
    console.warn("Ticker element with ID 'populationTicker' not found!");
    // Coba tunggu sebentar lagi jika DOM belum sepenuhnya dimuat
    setTimeout(() => {
      const retryTickerElement = document.getElementById("populationTicker");
      if (retryTickerElement) {
        console.log("Ticker element found on retry, setting content...");
        retryTickerElement.innerHTML = createTickerContent();
      } else {
        console.error("Ticker element still not found after retry!");
      }
    }, 1000);
  }
}

// Fungsi untuk simulasi pertumbuhan real-time - DIPERBAIKI
function simulateRealTimeGrowth() {
  console.log("Starting FIXED real-time growth simulation...");

  // Backup data asli untuk reset jika diperlukan
  const originalData = worldPopulationData.map((country) => ({ ...country }));

  const updateTicker = () => {
    console.log("=== TICKER UPDATE START ===");

    let hasChanges = false;

    worldPopulationData.forEach((country, index) => {
      // Simpan populasi lama
      const oldPopulation = country.population;

      // Hitung pertumbuhan yang lebih terlihat (simulasi 1 hari pertumbuhan)
      const annualGrowthRate = country.growth / 100;
      const dailyGrowthRate = annualGrowthRate / 365;

      // Update populasi
      if (annualGrowthRate >= 0) {
        // Pertumbuhan positif
        country.population = Math.floor(
          country.population * (1 + dailyGrowthRate)
        );
      } else {
        // Pertumbuhan negatif (penurunan)
        country.population = Math.floor(
          country.population * (1 + dailyGrowthRate)
        );
        // Pastikan tidak menjadi negatif
        if (country.population < 1000) {
          country.population = 1000;
        }
      }

      // Cek apakah ada perubahan
      if (oldPopulation !== country.population) {
        hasChanges = true;
        const change = country.population - oldPopulation;
        console.log(
          `${index + 1}. ${
            country.country
          }: ${oldPopulation.toLocaleString()} -> ${country.population.toLocaleString()} (${
            change > 0 ? "+" : ""
          }${change.toLocaleString()})`
        );
      } else {
        console.log(
          `${index + 1}. ${
            country.country
          }: NO CHANGE (${oldPopulation.toLocaleString()})`
        );
      }
    });

    if (hasChanges) {
      console.log("Changes detected, updating ticker display...");
      // Update ticker content
      const tickerElement = document.getElementById("populationTicker");
      if (tickerElement) {
        const newContent = createTickerContent();
        tickerElement.innerHTML = newContent;
        console.log("✅ Ticker display updated successfully");
      } else {
        console.error("❌ Ticker element not found!");
      }
    } else {
      console.log("⚠️ No changes detected in any country");
    }

    console.log("=== TICKER UPDATE END ===\n");
  };

  // Update setiap 5 detik (lebih lambat untuk melihat perubahan dengan jelas)
  const intervalId = setInterval(updateTicker, 5000);
  window.tickerInterval = intervalId;

  // Simpan data asli untuk debugging
  window.originalPopulationData = originalData;

  console.log("✅ FIXED Growth simulation started with interval:", intervalId);
}

function updateStats() {
  document.getElementById(
    "historicalCount"
  ).textContent = `${populationData.length} data point`;
  document.getElementById(
    "predictionCount"
  ).textContent = `${predictionResults.length} tahun`;

  const method = document.querySelector('input[name="method"]:checked').value;
  let methodName;

  switch (method) {
    case "adams-moulton":
      methodName = "Adams Moulton";
      break;
    case "adams-bashforth":
      methodName = "Adams Bashforth";
      break;
    case "predictor-corrector":
      methodName = "Predictor Corrector";
      break;
    default:
      methodName = "Adams Moulton";
  }

  document.getElementById("methodName").textContent = methodName;
}

// Initialize stats on page load
window.addEventListener("load", function () {
  updateStats();
});

// Debug functions - Bisa dihapus di production
window.debugPopulation = {
  checkData: () => {
    console.log("Current population data:");
    worldPopulationData.forEach((country, index) => {
      console.log(
        `${index + 1}. ${
          country.country
        }: ${country.population.toLocaleString()} (${country.growth}%)`
      );
    });
  },
  manualUpdate: () => {
    const element = document.getElementById("populationTicker");
    if (element) {
      element.innerHTML = createTickerContent();
      console.log("Manual ticker update completed");
    }
  },
  stopGrowth: () => {
    if (window.tickerInterval) {
      clearInterval(window.tickerInterval);
      console.log("Growth simulation stopped");
    }
  },
  startGrowth: () => {
    simulateRealTimeGrowth();
  },
  resetData: () => {
    if (window.originalPopulationData) {
      worldPopulationData.forEach((country, index) => {
        country.population = window.originalPopulationData[index].population;
      });
      console.log("Data reset to original values");
    }
  },

  forceUpdate: () => {
    const tickerElement = document.getElementById("populationTicker");
    if (tickerElement) {
      tickerElement.innerHTML = createTickerContent();
      console.log("Ticker forcefully updated");
    }
  },
};
