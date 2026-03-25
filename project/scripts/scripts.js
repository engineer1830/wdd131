// ---------- Utility / Finance helpers ----------
function formatNumberInput(input) {
    // Remove commas
    let raw = input.value.replace(/,/g, "");

    if (raw === "" || isNaN(raw)) {
        return;
    }

    input.value = Number(raw).toLocaleString();
}

function fv(rate, nper, pmt, pv) {
    // Equivalent to numpy_financial.fv
    // fv = -pv * (1 + rate)^nper - pmt * [ (1 + rate)^nper - 1 ] / rate
    if (rate === 0) {
        return -pv - pmt * nper;
    }
    const factor = Math.pow(1 + rate, nper);
    return -pv * factor - pmt * (factor - 1) / rate;
}

function sampleReturns(stockRate, bondRate, stockVol = 0.15, bondVol = 0.05) {
    // Simple normal draws
    const stock_r = stockRate + stockVol * randn();
    const bond_r = bondRate + bondVol * randn();
    return [stock_r, bond_r];
}

// Standard normal via Box–Muller
function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function growOneYear({
    lumpValue,
    salary,
    investmentPct,
    stockInterest,
    bondInterest,
    stockWeight,
    bondWeight,
    salaryGrowth = 0.02,
    inflation = 0.0,
    randomize = false,
    stockVol = 0.15,
    bondVol = 0.05
}) {
    if (randomize) {
        const [sr, br] = sampleReturns(stockInterest, bondInterest, stockVol, bondVol);
        stockInterest = sr;
        bondInterest = br;
    }

    const monthlyContribution = (salary / 12.0) * (investmentPct / 100.0);

    const stockLump = lumpValue * stockWeight;
    const bondLump = lumpValue * bondWeight;

    const stockContrib = monthlyContribution * stockWeight;
    const bondContrib = monthlyContribution * bondWeight;

    const stockFuture = fv(stockInterest / 12.0, 12, -stockContrib, -stockLump);
    const bondFuture = fv(bondInterest / 12.0, 12, -bondContrib, -bondLump);

    const futureNominal = stockFuture + bondFuture;
    const futureReal = futureNominal / (1.0 + inflation);

    const nextSalary = salary * (1.0 + salaryGrowth);

    return { futureReal, nextSalary };
}

// ---------- Data / performance ----------

// Placeholder: you can plug in a real API here (Alpha Vantage, FMP, etc.)
async function fetchFundData(ticker) {
    // For now, we simulate an annual return:
    // - "stock-like" tickers: ~8%
    // - "bond-like" tickers: ~3%
    // You can replace this with a real fetch to your chosen API.
    const t = ticker.toUpperCase();
    let avgAnnual;
    if (t.includes("BND") || t.includes("AGG") || t.includes("BOND")) {
        avgAnnual = 0.03;
    } else {
        avgAnnual = 0.08;
    }

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
        if (info.avg_annual < 0.06) {
            conservative.push([ticker, info.avg_annual]);
        } else {
            moderateAggressive.push([ticker, info.avg_annual]);
        }
    }

    const avgConservative =
        conservative.length > 0
            ? conservative.reduce((acc, [, r]) => acc + r, 0) / conservative.length
            : 0.0;

    const avgModerateAggressive =
        moderateAggressive.length > 0
            ? moderateAggressive.reduce((acc, [, r]) => acc + r, 0) /
            moderateAggressive.length
            : 0.0;

    return {
        sortedFunds,
        conservative,
        moderateAggressive,
        avgConservative,
        avgModerateAggressive
    };
}

// ---------- Simulation ----------

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
    let legacyData = [];
    let currentAge = age;
    let currentLump = lumpValue;
    let currentSalary = salary;

    let afterAggressive = currentLump;
    let afterModerate = currentLump;
    let lumpAtRetire = currentLump;

    const balanceTimeline = [];
    const withdrawTimeline = [];

    // Aggressive phase: 20–49, 100% stocks
    if (retireAge > 20 && currentAge < 50) {
        const startAge = Math.max(currentAge, 20);
        const endAge = Math.min(retireAge, 50);
        const years = Math.max(0, endAge - startAge);
        for (let i = 0; i < years; i++) {
            const { futureReal, nextSalary } = growOneYear({
                lumpValue: currentLump,
                salary: currentSalary,
                investmentPct,
                stockInterest: stockRate,
                bondInterest: bondRate,
                stockWeight: 1.0,
                bondWeight: 0.0,
                salaryGrowth,
                inflation,
                randomize: monteCarlo,
                stockVol,
                bondVol
            });
            currentLump = futureReal;
            currentSalary = nextSalary;
            currentAge += 1;
            balanceTimeline.push({ age: currentAge, balance: currentLump });
        }
        afterAggressive = currentLump;
    }

    // Moderate phase: 50–59, 65/35
    if (retireAge > 50 && currentAge < 60) {
        const startAge = Math.max(currentAge, 50);
        const endAge = Math.min(retireAge, 60);
        const years = Math.max(0, endAge - startAge);
        for (let i = 0; i < years; i++) {
            const { futureReal, nextSalary } = growOneYear({
                lumpValue: currentLump,
                salary: currentSalary,
                investmentPct,
                stockInterest: stockRate,
                bondInterest: bondRate,
                stockWeight: 0.65,
                bondWeight: 0.35,
                salaryGrowth,
                inflation,
                randomize: monteCarlo,
                stockVol,
                bondVol
            });
            currentLump = futureReal;
            currentSalary = nextSalary;
            currentAge += 1;
            balanceTimeline.push({ age: currentAge, balance: currentLump });
        }
        afterModerate = currentLump;
    }

    // Preserving pre-retirement: 60–retire, 50/50
    if (retireAge > currentAge) {
        const startAge = Math.max(currentAge, 60);
        const endAge = retireAge;
        const years = Math.max(0, endAge - startAge);
        for (let i = 0; i < years; i++) {
            const { futureReal, nextSalary } = growOneYear({
                lumpValue: currentLump,
                salary: currentSalary,
                investmentPct,
                stockInterest: stockRate,
                bondInterest: bondRate,
                stockWeight: 0.5,
                bondWeight: 0.5,
                salaryGrowth,
                inflation,
                randomize: monteCarlo,
                stockVol,
                bondVol
            });
            currentLump = futureReal;
            currentSalary = nextSalary;
            currentAge += 1;
            balanceTimeline.push({ age: currentAge, balance: currentLump });
        }
    }

    lumpAtRetire = currentLump;

    // Withdrawals from retireAge to 70, 50/50
    if (currentAge < 70) {
        while (currentAge < 70) {
            const { futureReal } = growOneYear({
                lumpValue: currentLump,
                salary: 0.0,
                investmentPct: 0.0,
                stockInterest: stockRate,
                bondInterest: bondRate,
                stockWeight: 0.5,
                bondWeight: 0.5,
                salaryGrowth: 0.0,
                inflation,
                randomize: monteCarlo,
                stockVol,
                bondVol
            });
            currentLump = futureReal;
            const withdrawAmount = currentLump * withdrawRate;
            currentLump -= withdrawAmount;
            currentAge += 1;
            legacyData.push([currentAge, withdrawAmount, currentLump]);
            balanceTimeline.push({ age: currentAge, balance: currentLump });
            withdrawTimeline.push({ age: currentAge, withdrawn: withdrawAmount });
        }
    }

    // Legacy phase: 70–life expectancy, 35/65
    const lifeExpectancy = gender === "m" ? 84 : 86;
    if (currentAge < lifeExpectancy) {
        while (currentAge < lifeExpectancy) {
            const { futureReal } = growOneYear({
                lumpValue: currentLump,
                salary: 0.0,
                investmentPct: 0.0,
                stockInterest: stockRate,
                bondInterest: bondRate,
                stockWeight: 0.35,
                bondWeight: 0.65,
                salaryGrowth: 0.0,
                inflation,
                randomize: monteCarlo,
                stockVol,
                bondVol
            });
            currentLump = futureReal;
            const withdrawAmount = currentLump * withdrawRate;
            currentLump -= withdrawAmount;
            currentAge += 1;
            legacyData.push([currentAge, withdrawAmount, currentLump]);
            balanceTimeline.push({ age: currentAge, balance: currentLump });
            withdrawTimeline.push({ age: currentAge, withdrawn: withdrawAmount });
        }
    }

    const finalLegacy = currentLump;

    return {
        afterAggressive,
        afterModerate,
        lumpAtRetire,
        finalLegacy,
        legacyData,
        balanceTimeline,
        withdrawTimeline
    };
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
        results.push(sim.finalLegacy);
    }

    results.sort((a, b) => a - b);

    const median = percentile(results, 50);
    const p10 = percentile(results, 10);
    const p90 = percentile(results, 90);
    const probRuin =
        results.length > 0
            ? results.filter((x) => x <= 0).length / results.length
            : 0;

    return {
        median,
        p10,
        p90,
        probRuin,
        allResults: results
    };
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const idx = (p / 100) * (arr.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return arr[lower];
    const weight = idx - lower;
    return arr[lower] * (1 - weight) + arr[upper] * weight;
}

// ---------- Formatting helpers ----------

function formatCurrency(x) {
    return `$${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatLegacyTable(legacyData) {
    const headers = ["Age", "Withdrawn", "Balance"];
    const lines = [];
    lines.push(`| ${headers[0]} | ${headers[1]} | ${headers[2]} |`);
    lines.push(`| --- | --- | --- |`);
    for (const [age, withdrawn, balance] of legacyData) {
        lines.push(
            `| ${age} | ${formatCurrency(withdrawn)} | ${formatCurrency(balance)} |`
        );
    }
    return lines.join("\n");
}

// ---------- Charts ----------

let balanceChart = null;
let withdrawChart = null;
let mcChart = null;

function renderBalanceChart(ctx, timeline) {
    const labels = timeline.map((d) => d.age);
    const data = timeline.map((d) => d.balance);

    if (balanceChart) balanceChart.destroy();

    balanceChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Balance",
                    data,
                    borderColor: "rgba(74, 108, 247, 1)",
                    backgroundColor: "rgba(74, 108, 247, 0.15)",
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function renderWithdrawChart(ctx, timeline) {
    const labels = timeline.map((d) => d.age);
    const data = timeline.map((d) => d.withdrawn);

    if (withdrawChart) withdrawChart.destroy();

    withdrawChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Withdrawn",
                    data,
                    backgroundColor: "rgba(255, 159, 64, 0.7)"
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function renderMcChart(ctx, results) {
    if (mcChart) mcChart.destroy();

    // Build a simple histogram
    if (results.length === 0) {
        mcChart = new Chart(ctx, {
            type: "bar",
            data: { labels: [], datasets: [] },
            options: {}
        });
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
        if (idx < 0) idx = 0;
        counts[idx] += 1;
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
            datasets: [
                {
                    label: "Frequency",
                    data: counts,
                    backgroundColor: "rgba(54, 162, 235, 0.7)"
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 90,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// ---------- UI wiring ----------

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("retirement-form");
    const resultsText = document.getElementById("resultsText");

    const balanceCtx = document.getElementById("balanceChart").getContext("2d");
    const withdrawCtx = document.getElementById("withdrawChart").getContext("2d");
    const mcCtx = document.getElementById("mcChart").getContext("2d");

    const commaFields = ["currentLump", "currentSalary"];

    commaFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Format while typing
        el.addEventListener("input", () => formatNumberInput(el));

        // Format initial value on page load
        if (el.value) {
            formatNumberInput(el);
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("SUBMIT FIRED");
        resultsText.value = "";

        // Read inputs
        const currentAge = parseInt(
            document.getElementById("currentAge").value.trim(),
            10
        );
        const gender = document
            .getElementById("gender")
            .value.trim()
            .toLowerCase();
        const retireAge = parseInt(
            document.getElementById("retireAge").value.trim(),
            10
        );
        const currentLump = parseFloat(
            document.getElementById("currentLump").value.replace(/,/g, "")
        );
        const currentSalary = parseFloat(
            document.getElementById("currentSalary").value.replace(/,/g, "")
        );
        const investmentPct = parseFloat(
            document.getElementById("investmentPct").value.trim()
        );
        const rawTickers = document.getElementById("tickers").value.trim();
        const salaryGrowth =
            parseFloat(document.getElementById("salaryGrowth").value.trim()) / 100.0;
        const withdrawRate =
            parseFloat(document.getElementById("withdrawRate").value.trim()) / 100.0;
        const inflation =
            parseFloat(document.getElementById("inflation").value.trim()) / 100.0;
        const mcRuns = parseInt(
            document.getElementById("mcRuns").value.trim(),
            10
        );
        const stockVol =
            parseFloat(document.getElementById("stockVol").value.trim()) / 100.0;
        const bondVol =
            parseFloat(document.getElementById("bondVol").value.trim()) / 100.0;

        // Basic validation
        if (!Number.isInteger(currentAge)) {
            resultsText.value += "Please enter a valid integer for current age.\n";
            return;
        }
        if (!["m", "f"].includes(gender)) {
            resultsText.value += "Please enter 'm' or 'f' for gender.\n";
            return;
        }
        if (!Number.isInteger(retireAge)) {
            resultsText.value += "Please enter a valid integer for retirement age.\n";
            return;
        }
        if (isNaN(currentLump)) {
            resultsText.value +=
                "Please enter a valid number for current retirement savings.\n";
            return;
        }
        if (isNaN(currentSalary)) {
            resultsText.value +=
                "Please enter a valid number for current salary.\n";
            return;
        }
        if (isNaN(investmentPct)) {
            resultsText.value +=
                "Please enter a valid percentage for investment.\n";
            return;
        }

        const tickers = rawTickers
            ? rawTickers
                .split(",")
                .map((t) => t.trim().toUpperCase())
                .filter((t) => t.length > 0)
            : [];

        if (tickers.length === 0) {
            resultsText.value +=
                "No tickers entered. Using simulated stock/bond returns.\n";
        }

        // Historical / fund performance (simulated or API-backed)
        const {
            sortedFunds,
            conservative,
            moderateAggressive,
            avgConservative,
            avgModerateAggressive
        } = await financialPerformance(tickers.length ? tickers : ["STOCK", "BOND"]);

        resultsText.value += "\n***** Historical Performance Summary *****\n";
        for (const [ticker, info] of sortedFunds) {
            resultsText.value += `\n${ticker}:\n  Data covers: ${info.start} to ${info.end}\n  Annualized average return: ${(info.avg_annual * 100).toFixed(2)}%\n`;
        }

        resultsText.value += "\n***** Conservative Funds (< 6%) *****\n";
        for (const [ticker, r] of conservative) {
            resultsText.value += `  ${ticker}: ${(r * 100).toFixed(2)}%\n`;
        }

        resultsText.value +=
            "\n***** Moderate to Aggressive Funds (>= 6%) *****\n";
        for (const [ticker, r] of moderateAggressive) {
            resultsText.value += `  ${ticker}: ${(r * 100).toFixed(2)}%\n`;
        }

        const stockRate = avgModerateAggressive || 0.08;
        const bondRate = avgConservative || 0.03;

        // Deterministic simulation
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

        resultsText.value += `Balance after aggressive phase: ${formatCurrency(
            sim.afterAggressive
        )}\n`;
        resultsText.value += `Balance after moderate phase:  ${formatCurrency(
            sim.afterModerate
        )}\n`;
        resultsText.value += `Balance at retirement (age ${retireAge}): ${formatCurrency(
            sim.lumpAtRetire
        )}\n`;
        resultsText.value += `Estimated remaining amount for heirs at life expectancy: ${formatCurrency(
            sim.finalLegacy
        )}\n\n`;

        resultsText.value +=
            "***** Withdrawal & Legacy Table (Deterministic) *****\n\n";
        resultsText.value += formatLegacyTable(sim.legacyData);
        resultsText.value += "\n";

        // Monte Carlo
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

        resultsText.value += "\n\n***** Monte Carlo Summary *****\n\n";
        resultsText.value += `Runs: ${mcRuns}\n`;
        resultsText.value += `Median final legacy: ${formatCurrency(
            mc.median
        )}\n`;
        resultsText.value += `10th percentile: ${formatCurrency(mc.p10)}\n`;
        resultsText.value += `90th percentile: ${formatCurrency(mc.p90)}\n`;
        resultsText.value += `Probability of ruin (<= 0): ${(mc.probRuin * 100).toFixed(
            2
        )}%\n`;

        // Charts
        renderBalanceChart(balanceCtx, sim.balanceTimeline);
        renderWithdrawChart(withdrawCtx, sim.withdrawTimeline);
        renderMcChart(mcCtx, mc.allResults);
    });
});
