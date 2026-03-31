/******************************************************
 *  Number Formatting
 ******************************************************/
function formatNumberInput(input) {
    let raw = input.value.replace(/,/g, "");
    if (raw === "" || isNaN(raw)) return;
    input.value = Number(raw).toLocaleString();
}

/******************************************************
 *  Financial Math
 ******************************************************/
function fv(rate, nper, pmt, pv) {
    if (rate === 0) return -pv - pmt * nper;
    const factor = Math.pow(1 + rate, nper);
    return -pv * factor - pmt * (factor - 1) / rate;
}

function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function sampleReturns(stockRate, bondRate, stockVol = 0.15, bondVol = 0.05) {
    return [
        stockRate + stockVol * randn(),
        bondRate + bondVol * randn()
    ];
}

/******************************************************
 *  Multi-Year Compounding WITH Per-Year Timeline
 *  (Nominal only — no inflation here)
 ******************************************************/
function growYearsWithTimeline({
    lumpValue,
    salary,
    investmentPct,
    stockRate,
    bondRate,
    stockWeight,
    bondWeight,
    salaryGrowth = 0.02,
    years = 1,
    randomize = false,
    stockVol = 0.15,
    bondVol = 0.05
}) {
    let currentLump = lumpValue;
    let currentSalary = salary;

    const timeline = []; // per-year nominal balances

    for (let y = 0; y < years; y++) {
        let sr = stockRate;
        let br = bondRate;

        if (randomize) {
            const [rs, rb] = sampleReturns(stockRate, bondRate, stockVol, bondVol);
            sr = rs;
            br = rb;
        }

        const monthlyContribution = (currentSalary / 12) * (investmentPct / 100);

        const stockLump = currentLump * stockWeight;
        const bondLump = currentLump * bondWeight;

        const stockContrib = monthlyContribution * stockWeight;
        const bondContrib = monthlyContribution * bondWeight;

        const stockFuture = fv(sr / 12, 12, -stockContrib, -stockLump);
        const bondFuture = fv(br / 12, 12, -bondContrib, -bondLump);

        currentLump = stockFuture + bondFuture;
        currentSalary *= (1 + salaryGrowth);

        timeline.push(currentLump);
    }

    return {
        futureNominal: currentLump,
        nextSalary: currentSalary,
        timeline
    };
}

/******************************************************
 *  Fund Performance (Simulated)
 ******************************************************/
async function fetchFundData(ticker) {
    const t = ticker.toUpperCase();

    const fundMap = {
        "FXAIX": 0.10, "VFIAX": 0.10, "VOO": 0.10,
        "VTSAX": 0.09, "VTI": 0.09,
        "FXNAX": 0.04, "BND": 0.04, "AGG": 0.04, "VBTLX": 0.04
    };

    let avgAnnual =
        fundMap[t] ??
        (t.includes("BND") || t.includes("AGG") || t.includes("BOND") ? 0.04 : 0.08);

    return {
        ticker: t,
        avgAnnual,
        start: "Simulated",
        end: "Simulated"
    };
}

async function financialPerformance(tickers) {
    const funds = {};

    for (const t of tickers) {
        const info = await fetchFundData(t);
        funds[t] = {
            avg_annual: info.avgAnnual,
            start: info.start,
            end: info.end
        };
    }

    const sortedFunds = Object.entries(funds).sort(
        (a, b) => a[1].avg_annual - b[1].avg_annual
    );

    const conservative = [];
    const moderateAggressive = [];

    for (const [ticker, info] of sortedFunds) {
        if (info.avg_annual < 0.06) conservative.push([ticker, info.avg_annual]);
        else moderateAggressive.push([ticker, info.avg_annual]);
    }

    const avgConservative =
        conservative.length > 0
            ? conservative.reduce((t, [, r]) => t + r, 0) / conservative.length
            : 0;

    const avgModerateAggressive =
        moderateAggressive.length > 0
            ? moderateAggressive.reduce((t, [, r]) => t + r, 0) /
            moderateAggressive.length
            : 0;

    return {
        sortedFunds,
        conservative,
        moderateAggressive,
        avgConservative,
        avgModerateAggressive
    };
}

/******************************************************
 *  Core Simulation
 ******************************************************/
function simulateRetirement({
    age,
    gender,
    retireAge,
    lumpValue,
    salary,
    investmentPct,
    stockRate,
    bondRate,
    salaryGrowth,
    inflation,
    withdrawRate,
    monteCarlo = false,
    stockVol = 0.15,
    bondVol = 0.05
}) {
    let currentAge = age;
    let currentLump = lumpValue;
    let currentSalary = salary;

    const balanceTimeline = [];
    const withdrawTimeline = [];
    const legacyData = [];

    // Start curve at user's age with starting lump
    balanceTimeline.push({ age: currentAge, balance: currentLump });

    function runPhase(startAge, endAge, stockWeight, bondWeight) {
        const years = Math.max(0, endAge - startAge);
        if (years <= 0) return;

        const { futureNominal, nextSalary, timeline } = growYearsWithTimeline({
            lumpValue: currentLump,
            salary: currentSalary,
            investmentPct,
            stockRate,
            bondRate,
            stockWeight,
            bondWeight,
            salaryGrowth,
            years,
            randomize: monteCarlo,
            stockVol,
            bondVol
        });

        for (let i = 0; i < timeline.length; i++) {
            balanceTimeline.push({
                age: startAge + (i + 1),
                balance: timeline[i]
            });
        }

        currentAge = startAge + years;
        currentLump = futureNominal;
        currentSalary = nextSalary;
    }

    // Accumulation phases
    runPhase(Math.max(currentAge, 20), Math.min(retireAge, 50), 1.0, 0.0);   // Aggressive
    runPhase(Math.max(currentAge, 50), Math.min(retireAge, 60), 0.65, 0.35); // Moderate
    runPhase(Math.max(currentAge, 60), retireAge, 0.5, 0.5);                 // Pre-retirement

    const lumpAtRetire = currentLump;

    // Withdrawal phase: retireAge–70, 50/50, inflation matters here
    while (currentAge < 70) {
        const { futureNominal } = growYearsWithTimeline({
            lumpValue: currentLump,
            salary: 0,
            investmentPct: 0,
            stockRate,
            bondRate,
            stockWeight: 0.5,
            bondWeight: 0.5,
            salaryGrowth: 0,
            years: 1,
            randomize: monteCarlo,
            stockVol,
            bondVol
        });

        currentLump = futureNominal;
        const withdrawNominal = currentLump * withdrawRate;
        currentLump -= withdrawNominal;
        currentAge++;

        const discount = Math.pow(1 + inflation, currentAge - retireAge);
        legacyData.push([
            currentAge,
            withdrawNominal / discount,
            currentLump / discount
        ]);

        balanceTimeline.push({ age: currentAge, balance: currentLump });
        withdrawTimeline.push({ age: currentAge, withdrawn: withdrawNominal });
    }

    // Legacy phase: 70–life expectancy, 35/65
    const lifeExpectancy = gender === "m" ? 84 : 86;

    while (currentAge < lifeExpectancy) {
        const { futureNominal } = growYearsWithTimeline({
            lumpValue: currentLump,
            salary: 0,
            investmentPct: 0,
            stockRate,
            bondRate,
            stockWeight: 0.35,
            bondWeight: 0.65,
            salaryGrowth: 0,
            years: 1,
            randomize: monteCarlo,
            stockVol,
            bondVol
        });

        currentLump = futureNominal;
        const withdrawNominal = currentLump * withdrawRate;
        currentLump -= withdrawNominal;
        currentAge++;

        const discount = Math.pow(1 + inflation, currentAge - retireAge);
        legacyData.push([
            currentAge,
            withdrawNominal / discount,
            currentLump / discount
        ]);

        balanceTimeline.push({ age: currentAge, balance: currentLump });
        withdrawTimeline.push({ age: currentAge, withdrawn: withdrawNominal });
    }

    const finalLegacyReal =
        currentLump / Math.pow(1 + inflation, currentAge - retireAge);

    return {
        lumpAtRetire,
        finalLegacyReal,
        balanceTimeline,
        withdrawTimeline,
        legacyData
    };
}

/******************************************************
 *  Monte Carlo Simulation
 ******************************************************/
function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const idx = (p / 100) * (arr.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return arr[lower];
    return arr[lower] * (1 - (idx - lower)) + arr[upper] * (idx - lower);
}

function monteCarloSimulation({
    nRuns,
    age,
    gender,
    retireAge,
    lumpValue,
    salary,
    investmentPct,
    stockRate,
    bondRate,
    salaryGrowth,
    inflation,
    withdrawRate,
    stockVol,
    bondVol
}) {
    const results = [];

    for (let i = 0; i < nRuns; i++) {
        const sim = simulateRetirement({
            age,
            gender,
            retireAge,
            lumpValue,
            salary,
            investmentPct,
            stockRate,
            bondRate,
            salaryGrowth,
            inflation,
            withdrawRate,
            monteCarlo: true,
            stockVol,
            bondVol
        });
        results.push(sim.finalLegacyReal);
    }

    results.sort((a, b) => a - b);

    return {
        median: percentile(results, 50),
        p10: percentile(results, 10),
        p90: percentile(results, 90),
        probRuin: results.filter(x => x <= 0).length / results.length,
        allResults: results
    };
}

/******************************************************
 *  Formatting Helpers
 ******************************************************/
function formatCurrency(x) {
    return `$${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatLegacyTable(legacyData) {
    let out = "| Age | Withdrawn (Real) | Balance (Real) |\n";
    out += "| --- | --- | --- |\n";
    for (const [age, w, b] of legacyData) {
        out += `| ${age} | ${formatCurrency(w)} | ${formatCurrency(b)} |\n`;
    }
    return out;
}

/******************************************************
 *  Charts
 ******************************************************/
let balanceChart = null;
let withdrawChart = null;
let mcChart = null;

function renderBalanceChart(ctx, timeline) {
    const labels = timeline.map(d => d.age);
    const data = timeline.map(d => d.balance);

    if (balanceChart) balanceChart.destroy();

    balanceChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Balance (Nominal)",
                data,
                borderColor: "rgba(74,108,247,1)",
                backgroundColor: "rgba(74,108,247,0.15)",
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { ticks: { callback: v => formatCurrency(v) } }
            }
        }
    });
}

function renderWithdrawChart(ctx, timeline) {
    const labels = timeline.map(d => d.age);
    const data = timeline.map(d => d.withdrawn);

    if (withdrawChart) withdrawChart.destroy();

    withdrawChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Withdrawn (Nominal)",
                data,
                backgroundColor: "rgba(255,159,64,0.7)"
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { ticks: { callback: v => formatCurrency(v) } }
            }
        }
    });
}

function renderMcChart(ctx, results) {
    if (mcChart) mcChart.destroy();

    if (results.length === 0) {
        mcChart = new Chart(ctx, { type: "bar", data: {}, options: {} });
        return;
    }

    const bins = 30;
    const min = results[0];
    const max = results[results.length - 1];
    const width = (max - min) / bins;
    const counts = new Array(bins).fill(0);

    for (const r of results) {
        let idx = Math.floor((r - min) / width);
        if (idx >= bins) idx = bins - 1;
        counts[idx]++;
    }

    const labels = [];
    for (let i = 0; i < bins; i++) {
        const start = min + i * width;
        const end = start + width;
        labels.push(`${formatCurrency(start)}–${formatCurrency(end)}`);
    }

    mcChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Frequency",
                data: counts,
                backgroundColor: "rgba(54,162,235,0.7)"
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { maxRotation: 90, minRotation: 45 } }
            }
        }
    });
}

/******************************************************
 *  UI Setup
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("retirement-form");
    const resultsText = document.getElementById("resultsText");

    const balanceCtx = document.getElementById("balanceChart").getContext("2d");
    const withdrawCtx = document.getElementById("withdrawChart").getContext("2d");
    const mcCtx = document.getElementById("mcChart").getContext("2d");

    ["currentLump", "currentSalary"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("input", () => formatNumberInput(el));
        if (el.value) formatNumberInput(el);
    });

    form.addEventListener("submit", async e => {
        e.preventDefault();
        resultsText.value = "";

        const currentAge = parseInt(document.getElementById("currentAge").value, 10);
        const gender = document.getElementById("gender").value.trim().toLowerCase();
        const retireAge = parseInt(document.getElementById("retireAge").value, 10);
        const currentLump = parseFloat(
            document.getElementById("currentLump").value.replace(/,/g, "")
        );
        const currentSalary = parseFloat(
            document.getElementById("currentSalary").value.replace(/,/g, "")
        );
        const investmentPct = parseFloat(
            document.getElementById("investmentPct").value
        );
        const rawTickers = document.getElementById("tickers").value.trim();
        const salaryGrowth =
            parseFloat(document.getElementById("salaryGrowth").value) / 100;
        const withdrawRate =
            parseFloat(document.getElementById("withdrawRate").value) / 100;
        const inflation =
            parseFloat(document.getElementById("inflation").value) / 100;
        const mcRuns = parseInt(
            document.getElementById("mcRuns").value,
            10
        );
        const stockVol =
            parseFloat(document.getElementById("stockVol").value) / 100;
        const bondVol =
            parseFloat(document.getElementById("bondVol").value) / 100;

        const tickers = rawTickers
            ? rawTickers
                .split(",")
                .map(t => t.trim().toUpperCase())
                .filter(t => t.length > 0)
            : [];

        const {
            sortedFunds,
            conservative,
            moderateAggressive,
            avgConservative,
            avgModerateAggressive
        } = await financialPerformance(tickers.length ? tickers : ["STOCK", "BOND"]);

        resultsText.value += "***** Historical Performance Summary *****\n";
        for (const [ticker, info] of sortedFunds) {
            resultsText.value += `\n${ticker}:\n  Data covers: ${info.start} to ${info.end}\n  Annualized average return: ${(info.avg_annual * 100).toFixed(2)}%\n`;
        }

        resultsText.value += "\n***** Conservative Funds (< 6%) *****\n";
        for (const [ticker, r] of conservative) {
            resultsText.value += `  ${ticker}: ${(r * 100).toFixed(2)}%\n`;
        }

        resultsText.value += "\n***** Moderate to Aggressive Funds (>= 6%) *****\n";
        for (const [ticker, r] of moderateAggressive) {
            resultsText.value += `  ${ticker}: ${(r * 100).toFixed(2)}%\n`;
        }

        const stockRate = avgModerateAggressive || 0.08;
        const bondRate = avgConservative || 0.03;

        const sim = simulateRetirement({
            age: currentAge,
            gender,
            retireAge,
            lumpValue: currentLump,
            salary: currentSalary,
            investmentPct,
            stockRate,
            bondRate,
            salaryGrowth,
            inflation,
            withdrawRate,
            monteCarlo: false,
            stockVol,
            bondVol
        });

        resultsText.value +=
            "\n\n***** Deterministic Retirement Projection *****\n\n";
        resultsText.value += `Starting savings: ${formatCurrency(
            currentLump
        )}\n`;
        resultsText.value += `Starting salary: ${formatCurrency(
            currentSalary
        )}\n`;
        resultsText.value += `Salary invested: ${investmentPct.toFixed(
            1
        )}%\n`;
        resultsText.value += `Salary growth: ${(salaryGrowth * 100).toFixed(
            1
        )}% per year\n`;
        resultsText.value += `Withdrawal rate: ${(withdrawRate * 100).toFixed(
            1
        )}% per year\n`;
        resultsText.value += `Inflation: ${(inflation * 100).toFixed(
            1
        )}% per year\n\n`;

        resultsText.value += `Balance at retirement (age ${retireAge}, nominal): ${formatCurrency(
            sim.lumpAtRetire
        )}\n`;
        resultsText.value += `Estimated remaining amount for heirs at life expectancy (real): ${formatCurrency(
            sim.finalLegacyReal
        )}\n\n`;

        resultsText.value +=
            "***** Withdrawal & Legacy Table (Real Dollars) *****\n\n";
        resultsText.value += formatLegacyTable(sim.legacyData);
        resultsText.value += "\n";

        const mc = monteCarloSimulation({
            nRuns: mcRuns,
            age: currentAge,
            gender,
            retireAge,
            lumpValue: currentLump,
            salary: currentSalary,
            investmentPct,
            stockRate,
            bondRate,
            salaryGrowth,
            inflation,
            withdrawRate,
            stockVol,
            bondVol
        });

        resultsText.value += "\n\n***** Monte Carlo Summary (Real Legacy) *****\n\n";
        resultsText.value += `Runs: ${mcRuns}\n`;
        resultsText.value += `Median final legacy (real): ${formatCurrency(
            mc.median
        )}\n`;
        resultsText.value += `10th percentile (real): ${formatCurrency(
            mc.p10
        )}\n`;
        resultsText.value += `90th percentile (real): ${formatCurrency(
            mc.p90
        )}\n`;
        resultsText.value += `Probability of ruin (<= 0 real): ${(mc.probRuin * 100).toFixed(
            2
        )}%\n`;

        renderBalanceChart(balanceCtx, sim.balanceTimeline);
        renderWithdrawChart(withdrawCtx, sim.withdrawTimeline);
        renderMcChart(mcCtx, mc.allResults);
    });
});
