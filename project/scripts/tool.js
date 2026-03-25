// ---------- Math Helpers ----------
function randn(mean, std) {
    let u = 1 - Math.random();
    let v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function fv(rate, n, pmt, pv) {
    if (rate === 0) return -(pv + pmt * n);
    return -(pv * Math.pow(1 + rate, n) +
        pmt * (Math.pow(1 + rate, n) - 1) / rate);
}

// ---------- Growth ----------
function grow(lump, salary, invest, sRate, bRate, sw, bw, growth, infl, rand = false) {
    if (rand) {
        sRate = randn(sRate, 0.15);
        bRate = randn(bRate, 0.05);
    }

    let contrib = (salary / 12) * (invest / 100);

    let sFuture = fv(sRate / 12, 12, -contrib * sw, -lump * sw);
    let bFuture = fv(bRate / 12, 12, -contrib * bw, -lump * bw);

    let total = (sFuture + bFuture) / (1 + infl);
    let nextSalary = salary * (1 + growth);

    return [total, nextSalary];
}

// ---------- Simulation ----------
function simulate(params, monte = false) {
    let { age, gender, retireAge, lump, salary, invest, sRate, bRate, growth, infl, withdraw } = params;

    let currentAge = age;

    function phase(end, sw, bw) {
        while (currentAge < end) {
            [lump, salary] = grow(lump, salary, invest, sRate, bRate, sw, bw, growth, infl, monte);
            currentAge++;
        }
    }

    phase(Math.min(50, retireAge), 1, 0);
    phase(Math.min(60, retireAge), 0.65, 0.35);
    phase(retireAge, 0.5, 0.5);

    let atRetire = lump;

    while (currentAge < 70) {
        [lump] = grow(lump, 0, 0, sRate, bRate, 0.5, 0.5, 0, infl, monte);
        lump -= lump * withdraw;
        currentAge++;
    }

    let life = gender === "m" ? 84 : 86;

    while (currentAge < life) {
        [lump] = grow(lump, 0, 0, sRate, bRate, 0.35, 0.65, 0, infl, monte);
        lump -= lump * withdraw;
        currentAge++;
    }

    return { atRetire, final: lump };
}

// ---------- Monte Carlo ----------
function monteCarlo(runs, params) {
    let results = [];
    for (let i = 0; i < runs; i++) {
        results.push(simulate(params, true).final);
    }
    return results;
}

// ---------- Chart ----------
let chart;

function drawChart(data) {
    let ctx = document.getElementById("chart");

    let bins = 30;
    let min = Math.min(...data);
    let max = Math.max(...data);
    let step = (max - min) / bins;

    let counts = Array(bins).fill(0);

    data.forEach(v => {
        let i = Math.min(Math.floor((v - min) / step), bins - 1);
        counts[i]++;
    });

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: counts.map((_, i) => Math.round(min + i * step)),
            datasets: [{
                label: "Monte Carlo Distribution",
                data: counts
            }]
        }
    });
}

// ---------- Main ----------
document.getElementById("runBtn").addEventListener("click", () => {

    let params = {
        age: +age.value,
        gender: gender.value,
        retireAge: +retireAge.value,
        lump: +lump.value,
        salary: +salary.value,
        invest: +invest.value,
        sRate: stockRate.value / 100,
        bRate: bondRate.value / 100,
        growth: growth.value / 100,
        infl: inflation.value / 100,
        withdraw: withdraw.value / 100
    };

    let sim = simulate(params);
    let mc = monteCarlo(+runs.value, params);

    let avg = mc.reduce((a, b) => a + b, 0) / mc.length;

    document.getElementById("output").textContent =
        `Balance at Retirement: $${sim.atRetire.toFixed(0)}
Final Legacy: $${sim.final.toFixed(0)}
Monte Carlo Average: $${avg.toFixed(0)}`;

    drawChart(mc);
});
