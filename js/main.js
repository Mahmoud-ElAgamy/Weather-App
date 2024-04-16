// Imports
import CurrentLocation from "./CurrentLocation.js";
const currLocation = new CurrentLocation();

const weatherApiKey = "4d8fb5b93d4af21d66a2948710284366";

// DOM Elements
const weatherForm = document.getElementById("search-bar__form");
const weatherInput = document.getElementById("search-bar__txt");
const geoBtn = document.getElementById("get-location");
const homeBtn = document.getElementById("home-weather");
const saveBtn = document.getElementById("save-location");
const unitBtn = document.getElementById("unit");
const refreshBtn = document.getElementById("refresh");

const initApp = () => {
  weatherForm.addEventListener("submit", submitNewLocation);

  // Add Listeners
  geoBtn.addEventListener("click", getGeoWeather);
  homeBtn.addEventListener("click", loadWeather);
  saveBtn.addEventListener("click", saveLocation);
  unitBtn.addEventListener("click", toggleUnit);
  refreshBtn.addEventListener("click", refreshWeather);
  setPlaceholderTxt();
  loadWeather();
};

const submitNewLocation = async (e) => {
  e.preventDefault();
  const regex = /\s{2,}/gi;
  const formattedValue = weatherInput.value.replace(regex, " ").trim();
  const searchIcon = document.querySelector(".fa-magnifying-glass");
  addSpinner(searchIcon);
  const coordsData = await getCoordsFromApi(
    formattedValue,
    currLocation.getUnit()
  );
  if (coordsData) {
    if (coordsData.cod === 200) {
      const myCoords = {
        lat: coordsData.coord.lat,
        lon: coordsData.coord.lon,
        name: coordsData.sys.country
          ? `${coordsData.name}, ${coordsData.sys.country}`
          : coordsData.name,
      };
      setLocation(currLocation, myCoords);
      updateAndDisplayData(currLocation);
    } else {
      displayApiError(coordsData);
    }
  } else {
    displayError("Connection Error", "Connection Error");
  }
  weatherForm.reset();
  weatherInput.focus();
};

function getGeoWeather(e) {
  const mapIcon = document.querySelector(".fa-map-marker-alt");
  addSpinner(mapIcon);
  navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
}

const addSpinner = (ele) => {
  animateBtn(ele);
  setTimeout(animateBtn, 500, ele);
};

const animateBtn = (ele) => {
  ele.classList.toggle("d-none");
  ele.nextElementSibling.classList.toggle("d-none");
};

const geoSuccess = (position) => {
  const myCoords = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    name: `Lat: ${position.coords.latitude} Lon: ${position.coords.longitude}`,
  };
  setLocation(currLocation, myCoords);
  updateAndDisplayData(currLocation);
};

const setLocation = (location, coords) => {
  const { name, lat, lon, unit } = coords;
  location.setName(name);
  location.setLat(lat);
  location.setLon(lon);
  if (unit) location.setUnit(unit);
};

const loadWeather = (e) => {
  const savedLocation = getHomeLocation();
  if (!savedLocation && !e) return getGeoWeather();
  if (!savedLocation && e.type === "click") {
    displayError("No Home Location Saved.", "Please save your location first.");
  } else if (savedLocation && !e) {
    displayHomeLocationWeather(savedLocation);
  } else {
    const homeIcon = document.querySelector(".fa-home");
    addSpinner(homeIcon);
    displayHomeLocationWeather(savedLocation);
  }
};

const saveLocation = () => {
  if (currLocation.getLat() && currLocation.getLon()) {
    const saveIcon = document.querySelector(".fa-save");
    addSpinner(saveIcon);
    const location = {
      lat: currLocation.getLat(),
      lon: currLocation.getLon(),
      name: currLocation.getName(),
      unit: currLocation.getUnit(),
    };
    localStorage.setItem("defaultWeatherLocation", JSON.stringify(location));
    updateScreenReaderConfirmation(
      `Saved ${currLocation.getName()} as home location`
    );
  }
};

const toggleUnit = () => {
  const unitIcon = document.querySelector(".fa-chart-bar");
  addSpinner(unitIcon);
  currLocation.toggleUnit();
  updateAndDisplayData(currLocation);
};

const refreshWeather = () => {
  const refreshIcon = document.querySelector(".fa-sync-alt");
  addSpinner(refreshIcon);
  updateAndDisplayData(currLocation);
};

const setPlaceholderTxt = () => {
  if (innerWidth > 400)
    weatherInput.placeholder = "City, State, Country, or ZIP Code";
};

const displayHomeLocationWeather = (home) => {
  if (typeof home === "string") {
    const locationJson = JSON.parse(home);
    const myCoords = {
      lat: locationJson.lat,
      lon: locationJson.lon,
      name: locationJson.name,
      unit: locationJson.unit,
    };
    setLocation(currLocation, myCoords);
    updateAndDisplayData(currLocation);
  }
};

const getHomeLocation = () => {
  return localStorage.getItem("defaultWeatherLocation");
};

const getCoordsFromApi = async (entryTxt, units) => {
  const regex = /^\d+$/g;
  const flag = regex.test(entryTxt) ? "zip" : "q";
  const url = `https://api.openweathermap.org/data/2.5/weather?${flag}=${encodeURIComponent(
    entryTxt
  )}&units=${units}&appid=${weatherApiKey}`;
  const encodedUrl = encodeURI(url);
  try {
    const dataStream = await fetch(encodedUrl);
    const jsonData = await dataStream.json();
    return jsonData;
  } catch (e) {
    return e;
  }
};

const getWeatherFromCoords = async (location) => {
  const lat = location.getLat();
  const lon = location.getLon();
  const units = location.getUnit();
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=${units}&appid=${weatherApiKey}`;
  try {
    const weatherStream = await fetch(url);
    const weatherJson = await weatherStream.json();
    return weatherJson;
  } catch (e) {
    console.error(e);
  }
};

const updateAndDisplayData = async (location) => {
  const weatherJson = await getWeatherFromCoords(location);
  if (weatherJson) updateDisplay(weatherJson, location);
};

const updateDisplay = (weatherJson, location) => {
  fadeDisplay();
  clearDisplay();
  const weatherClass = getWeatherClass(weatherJson.current.weather[0].icon);
  setBGImage(weatherClass);
  const screenReaderWeather = buildScreenReaderWeather(weatherJson, location);
  updateScreenReaderConfirmation(screenReaderWeather);
  updateWeatherLocationHeader(location.getName());
  const ccArray = createCurrentConditionsDivs(weatherJson, location.getUnit());
  displayCurrentConditions(ccArray);
  displaySixDayForecast(weatherJson);
  fadeDisplay();
};

const fadeDisplay = () => {
  const currForecast = document.getElementById("current-forecast");
  currForecast.classList.toggle("zero-vis");
  currForecast.classList.toggle("fadein");
  const sixDay = document.getElementById("daily-forecast");
  sixDay.classList.toggle("zero-vis");
  sixDay.classList.toggle("fadein");
};

const createCurrentConditionsDivs = (weatherJson, unit) => {
  const tempUnit = unit === "imperial" ? "F" : "C";
  const windUnit = unit === "imperial" ? "mhp" : "m/s";
  const icon = createMainImgDiv(
    weatherJson.current.weather[0].icon,
    weatherJson.current.weather[0].description
  );
  const temp = createElement(
    "div",
    "temp flex-center",
    `${Math.round(Number(weatherJson.current.temp))}°`,
    tempUnit
  );
  const unitMeasure = createElement("span", "unit", tempUnit);
  unitMeasure.title = tempUnit === "F" ? "Fahrenheit" : "Celsius";
  temp.appendChild(unitMeasure);
  const properDesc = toProperCase(weatherJson.current.weather[0].description);
  const desc = createElement("div", "descp flex-center", properDesc);
  const feels = createElement(
    "div",
    "feels flex-center",
    `Feels Like ${Math.round(Number(weatherJson.current.feels_like))}°`
  );
  const maxTemp = createElement(
    "div",
    "maxtemp flex-center",
    `High ${Math.round(Number(weatherJson.daily[0].temp.max))}°`
  );
  const minTemp = createElement(
    "div",
    "mintemp flex-center",
    `Low ${Math.round(Number(weatherJson.daily[0].temp.min))}°`
  );
  const humidity = createElement(
    "div",
    "humidity",
    `Humidity ${weatherJson.current.humidity}%`
  );

  const wind = createElement(
    "div",
    "wind",
    `Wind ${Math.round(Number(weatherJson.current.wind_speed))} ${windUnit}`
  );

  return [icon, temp, desc, feels, maxTemp, minTemp, humidity, wind];
};

const createMainImgDiv = (icon, altTxt) => {
  const iconDiv = createElement("div", "icon flex-center");
  iconDiv.id = "icon";
  const faIcon = translateIconToFontAwesome(icon);
  faIcon.ariaHidden = true;
  faIcon.title = altTxt;
  iconDiv.appendChild(faIcon);
  return iconDiv;
};

const createElement = (eleType, eleClassName, eleTxt, unit) => {
  const createdEle = document.createElement(eleType);
  createdEle.className = eleClassName;
  if (eleTxt) createdEle.textContent = eleTxt;
  if (eleClassName === "temp") {
    const unitDiv = document.createElement("div");
    unitDiv.classList.add("unit");
    unitDiv.textContent = unit;
    createdEle.appendChild(unitDiv);
  }
  return createdEle;
};

const translateIconToFontAwesome = (icon) => {
  const i = document.createElement("i");
  const firstTwoChars = icon.slice(0, 2);
  const lastChar = icon.slice(2);
  switch (firstTwoChars) {
    case "01":
      if (lastChar === "d") i.classList.add("fa-solid", "fa-sun");
      else {
        i.classList.add("far", "fa-moon");
      }
      break;

    case "02":
      if (lastChar === "d") i.classList.add("fas", "fa-cloud-sun");
      else {
        i.classList.add("fas", "fa-cloud-moon");
      }
      break;

    case "03":
      i.classList.add("fas", "fa-cloud");
      break;

    case "04":
      i.classList.add("fas", "fa-cloud-meatball");
      break;

    case "09":
      i.classList.add("fas", "fa-cloud-rain");
      break;

    case "10":
      if (lastChar === "d") i.classList.add("fas", "fa-cloud-sun-rain");
      else {
        i.classList.add("fas", "fa-cloud-moon-rain");
      }
      break;

    case "11":
      i.classList.add("fas", "fa-poo-storm");
      break;

    case "13":
      i.classList.add("far", "fa-snowflake");
      break;

    case "50":
      i.classList.add("fas", "fa-smog");
      break;

    default:
      i.classList.add("far", "fa-question-circle");
  }
  return i;
};

const displayCurrentConditions = (currentConditionsArray) => {
  const ccContainer = document.getElementById("current-forecast__conditions");
  currentConditionsArray.forEach((cc) => {
    ccContainer.appendChild(cc);
  });
};

const displaySixDayForecast = (weatherJson) => {
  for (let i = 1; i <= 6; i++) {
    const dfArray = createDailyForecastDivs(weatherJson.daily[i]);
    displayDailyForecast(dfArray);
  }
};

const createDailyForecastDivs = (dayWeather) => {
  const dayAbbTxt = getDayAbb(dayWeather.dt);
  const dayAbb = createElement("p", "day-abb", dayAbbTxt);
  const dayIcon = createDailyForecastIcon(
    dayWeather.weather[0].icon,
    dayWeather.weather[0].description
  );
  const dayHigh = createElement(
    "p",
    "day-high",
    `${Math.round(dayWeather.temp.max)}°`
  );
  const dayLow = createElement(
    "p",
    "day-low",
    `${Math.round(dayWeather.temp.min)}°`
  );
  return [dayAbb, dayIcon, dayHigh, dayLow];
};

const getDayAbb = (data) => {
  const dateObj = new Date(data * 1000);
  const utcString = dateObj.toUTCString();
  return utcString.slice(0, 3).toUpperCase();
};

const createDailyForecastIcon = (icon, altTxt) => {
  const img = document.createElement("img");
  img.src = `https://openweathermap.org/img/wn/${icon}.png`;
  img.alt = altTxt;
  img.title = altTxt;
  return img;
};

const displayDailyForecast = (dfArray) => {
  const dfContainer = document.getElementById("daily-forecast__content");
  const dfDiv = createElement("div", "forecast-day");
  dfArray.forEach((el) => {
    dfDiv.appendChild(el);
  });
  dfContainer.appendChild(dfDiv);
};

const clearDisplay = () => {
  const currentConditions = document.getElementById(
    "current-forecast__conditions"
  );
  deleteContent(currentConditions);
  const sixDayForecast = document.getElementById("daily-forecast__content");
  deleteContent(sixDayForecast);
};

const deleteContent = (parentELement) => {
  let child = parentELement.lastElementChild;
  while (child) {
    parentELement.removeChild(child);
    child = parentELement.lastElementChild;
  }
};

const getWeatherClass = (icon) => {
  const firstTwoChars = icon.slice(0, 2);
  const lastChar = icon.charAt(2);
  const weatherLookup = {
    "09": "snow",
    10: "rain",
    11: "rain",
    13: "snow",
    50: "fog",
  };
  let weatherClass;
  if (weatherLookup[firstTwoChars]) weatherClass = weatherLookup[firstTwoChars];
  else if (lastChar === "d") weatherClass = "clouds";
  else {
    weatherClass = "night";
  }
  return weatherClass;
};

const setBGImage = (weatherClass) => {
  document.body.classList.add(weatherClass);
  document.body.classList.forEach((img) => {
    if (img !== weatherClass) document.body.classList.remove(img);
  });
};

const geoError = (errObj) => {
  const errMsg = errObj ? errObj.message : "Geolocation Not Supported";
  displayError(errMsg, errMsg);
};

const displayError = (headerMsg, srMsg) => {
  updateWeatherLocationHeader(headerMsg);
  updateScreenReaderConfirmation(srMsg);
};

const displayApiError = (stateCode) => {
  const properMsg = toProperCase(stateCode.message);
  updateWeatherLocationHeader(properMsg);
  updateScreenReaderConfirmation(`${properMsg}. Please try again`);
};

const toProperCase = (txt) => {
  const words = txt.split(" ");
  const properWords = words
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
  return properWords;
};

const updateWeatherLocationHeader = (msg) => {
  const headerMsgEle = document.getElementById("current-forecast__location");
  headerMsgEle.textContent = msg;
};

const updateScreenReaderConfirmation = (msg) => {
  const screenReaderEle = document.getElementById("confirmation");
  screenReaderEle.textContent = msg;
};

const buildScreenReaderWeather = (weatherJson, location) => {
  const loc = location.getName();
  const unit = location.getUnit();
  const tempUnit = unit === "imperial" ? "Fahrenheit" : "Celsius";
  return `${weatherJson.current.weather[0].description} and ${Math.round(
    Number(weatherJson.current.temp)
  )}°${tempUnit} in ${loc}`;
};

initApp();
