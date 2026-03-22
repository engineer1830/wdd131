const hamButton = document.querySelector("#menu");
const navigation = document.querySelector(".navigation");

hamButton.addEventListener("click", () => {
    navigation.classList.toggle("open");
    hamButton.classList.toggle("open");
});

const year = new Date().getFullYear();
document.getElementById("currentyear").textContent = year;

document.getElementById("lastModified").innerHTML = document.lastModified;

const temples = [
    {
        templeName: "Aba Nigeria",
        location: "Aba, Nigeria",
        dedicated: "2005, August, 7",
        area: 11500,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/aba-nigeria/400x250/aba-nigeria-temple-lds-273999-wallpaper.jpg"
    },
    {
        templeName: "Manti Utah",
        location: "Manti, Utah, United States",
        dedicated: "1888, May, 21",
        area: 74792,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/manti-utah/400x250/manti-temple-768192-wallpaper.jpg"
    },
    {
        templeName: "Payson Utah",
        location: "Payson, Utah, United States",
        dedicated: "2015, June, 7",
        area: 96630,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/payson-utah/400x225/payson-utah-temple-exterior-1416671-wallpaper.jpg"
    },
    {
        templeName: "Yigo Guam",
        location: "Yigo, Guam",
        dedicated: "2020, May, 2",
        area: 6861,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/yigo-guam/400x250/yigo_guam_temple_2.jpg"
    },
    {
        templeName: "Washington D.C.",
        location: "Kensington, Maryland, United States",
        dedicated: "1974, November, 19",
        area: 156558,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/washington-dc/400x250/washington_dc_temple-exterior-2.jpeg"
    },
    {
        templeName: "Lima Perú",
        location: "Lima, Perú",
        dedicated: "1986, January, 10",
        area: 9600,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/lima-peru/400x250/lima-peru-temple-evening-1075606-wallpaper.jpg"
    },
    {
        templeName: "Mexico City Mexico",
        location: "Mexico City, Mexico",
        dedicated: "1983, December, 2",
        area: 116642,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/mexico-city-mexico/400x250/mexico-city-temple-exterior-1518361-wallpaper.jpg"
    },
    {
        templeName: "Gilbert Arizona",
        location: "Gilbert, Arizona",
        dedicated: "2014, March, 2",
        area: 85326,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/gilbert-arizona/400x250/gilbert-arizona-temple-exterior-1207309-wallpaper.jpg"
    },
    {
        templeName: "Portland Oregon",
        location: "Lake Oswego, Oregon",
        dedicated: "1989, August, 19-21",
        area: 80500,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/portland-oregon/400x250/portland-temple-lds-1079112-wallpaper.jpg"
    },
    {
        templeName: "Salt Lake Temple",
        location: "Salt Lake City, Utah",
        dedicated: "1893, April, 6-24",
        area: 382207,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/salt-lake-city-utah/2018/400x250/slctemple7.jpg"
    },
    {
        templeName: "Boston Massachusetts Temple",
        location: "Belmont, Massachusetts",
        dedicated: "2000, October, 1",
        area: 69600,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/boston-massachusetts/400x250/boston-temple-lds-945541-wallpaper.jpg"
    },
    {
        templeName: "Nauvoo Illinois",
        location: "Nauvoo, Illinois",
        dedicated: "1846, May, 1-3",
        area: 50000,
        imageUrl:
            "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/nauvoo-illinois/400x250/nauvoo-temple-756496-wallpaper.jpg"
    },
];

function getDedicatedYear(temple) {
    const parts = temple.dedicated.split(",");
    const year = parseInt(parts[0].trim());
    return year;
}

const currentYear = new Date().getFullYear();
const oldCutoff = currentYear - 100;
const newCutoff = currentYear - 20;

function filterOldTemples() {
    const oldList = temples.filter(temple => getDedicatedYear(temple) <= oldCutoff);
    createTempleCard(oldList);
}

function filterNewTemples() {
    const newList = temples.filter(temple => getDedicatedYear(temple) >= newCutoff);
    createTempleCard(newList);
}

function filterLargeTemples() {
    const largeList = temples.filter(temple => temple.area > 60000);
    createTempleCard(largeList);
}

function filterSmallTemples() {
    const smallList = temples.filter(temple => temple.area < 15000);
    createTempleCard(smallList);
}

document.querySelector("#home").addEventListener("click", e => {
    e.preventDefault();
    createTempleCard(temples);
});

document.querySelector("#old").addEventListener("click", e => {
    e.preventDefault();
    filterOldTemples();
});

document.querySelector("#new").addEventListener("click", e => {
    e.preventDefault();
    filterNewTemples();
});

document.querySelector("#large").addEventListener("click", e => {
    e.preventDefault();
    filterLargeTemples();
});

document.querySelector("#small").addEventListener("click", e => {
    e.preventDefault();
    filterSmallTemples();
});

function createTempleCard(list) {
    const grid = document.querySelector(".gallery-grid");
    grid.innerHTML = "";
    
    list.forEach((temple, index) => {
        let card = document.createElement("section");
        let tname = document.createElement("h3");
        let location = document.createElement("p");
        let dedication = document.createElement("p");
        let area = document.createElement("p");
        let img = document.createElement("img");

        tname.textContent = temple.templeName;
        location.innerHTML = `<span class="label">Location:</span> ${temple.location}`;
        dedication.innerHTML = `<span class="label">Dedicated:</span> ${temple.dedicated}`;
        area.innerHTML = `<span class="label">Size:</span> ${temple.area} sq ft`;

        img.setAttribute("src", temple.imageUrl);
        img.setAttribute("alt", temple.templeName);
        
        if (index === 0) {
            img.fetchPriority = "high";
        } else {
            img.loading = "lazy";
        } 

        img.setAttribute("loading", "lazy");

        card.appendChild(tname);
        card.appendChild(location);
        card.appendChild(dedication);
        card.appendChild(area);
        card.appendChild(img);

        grid.appendChild(card);
    });
}

createTempleCard(temples);