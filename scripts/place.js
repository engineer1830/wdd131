const year = new Date().getFullYear();
document.getElementById("currentyear").textContent = year;

document.getElementById("lastModified").innerHTML = document.lastModified;

const temperature = 105
const windSpeed = 4

function calculateWindChill(temp, speed) {
    return 35.74 + (0.6215 * temp) - (35.75 * Math.pow(speed, 0.16)) + (0.4275 * temp * Math.pow(speed, 0.16));
}

let windChillValue;

if (temperature <= 50 && windSpeed > 3) {
    windChillValue = Math.round(calculateWindChill(temperature, windSpeed));
}
else {
    windChillValue = "N/A"
}

document.getElementById("windchill").textContent = windChillValue;