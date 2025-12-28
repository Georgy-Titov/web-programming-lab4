const weatherContainer = document.getElementById("weatherContainer");
const cityInput = document.getElementById("cityInput");
const refreshBtn = document.getElementById("refresh");
const errorDiv = document.getElementById("error");
const suggestionsBox = document.getElementById("suggestions");

let cities = [];

window.addEventListener("load", () => {
  const saved = localStorage.getItem("weather_cities");
  if (saved) {
    cities = JSON.parse(saved);
    loadAllWeather();
  } else {
    requestGeo();
  }
});

function requestGeo() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    pos => {
      cities = [{
        name: "Текущее местоположение",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      }];
      localStorage.setItem("weather_cities", JSON.stringify(cities));
      loadAllWeather();
    },
    () => {
      errorDiv.textContent = "Геолокация отклонена. Введите город вручную.";
    }
  );
}

cityInput.addEventListener("input", async () => {
  const q = cityInput.value.trim();
  suggestionsBox.innerHTML = "";
  errorDiv.textContent = "";

  if (!q) {
    suggestionsBox.style.display = "none";
    return;
  }

  const list = await geocodeList(q);

  if (!list || !list.length) {
    suggestionsBox.style.display = "none";
    errorDiv.textContent = "Город не найден";
    return;
  } else {
    errorDiv.textContent = "";
  }

  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = item.name;
    div.onclick = () => {
      addCity(item);
      cityInput.value = "";
      errorDiv.textContent = "";
      suggestionsBox.style.display = "none";
    };
    suggestionsBox.appendChild(div);
  });

  suggestionsBox.style.display = "block";
});

refreshBtn.addEventListener("click", loadAllWeather);

function addCity(cityObj) {
  if (cities.find(c => c.name === cityObj.name)) return;
  cities.push(cityObj);
  localStorage.setItem("weather_cities", JSON.stringify(cities));
  loadAllWeather();
}

async function loadAllWeather() {
  weatherContainer.innerHTML = "";

  for (const city of cities) {
    try {
      const data = await loadWeather(city.lat, city.lon);
      const card = createCard(city, data);
      weatherContainer.appendChild(card);
    } catch {
      const div = document.createElement("div");
      div.className = "weather-card";
      div.textContent = city.name + " — ошибка загрузки";
      weatherContainer.appendChild(div);
    }
  }
}

async function geocodeList(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ru`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.results) return null;

  return json.results.map(r => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude
  }));
}

async function loadWeather(lat, lon) {
  const today = new Date();
  const start = today.toISOString().slice(0,10);
  const endDate = new Date(today); 
  endDate.setDate(endDate.getDate()+2);
  const end = endDate.toISOString().slice(0,10);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,precipitation_sum&timezone=auto` +
    `&start_date=${start}&end_date=${end}`;

  const res = await fetch(url);
  return await res.json();
}

const weatherCodes = {
  0: 'Ясно', 1: 'Преимущественно ясно', 2:'Малооблачно', 3:'Облачно', 45:'Туман',
  48:'Туман с отложениями', 51:'Лёгкая морось', 53:'Умеренная морось', 55:'Плотная морось',
  61:'Лёгкий дождь',63:'Умеренный дождь',65:'Сильный дождь',
  71:'Снег',73:'Снег',75:'Сильный снег',80:'Лёгкий дождь (ливень)',
  81:'Дождь',82:'Интенсивный дождь',95:'Гроза'
};

function createCard(city, data) {
  const d = data.daily;
  const div = document.createElement("div");
  div.className = "weather-card";

  const delBtn = document.createElement("span");
  delBtn.className = "delete-btn";
  delBtn.textContent = "✖";
  delBtn.onclick = () => deleteCity(city.name);
  div.appendChild(delBtn);

  const title = document.createElement("h2");
  title.textContent = city.name;
  div.appendChild(title);

  const forecastWrapper = document.createElement("div");
  forecastWrapper.className = "forecast-wrapper";

  for (let i=0; i<d.time.length; i++) {
    const date = new Date(d.time[i]);
    const dayName = i===0 ? "Сегодня" : date.toLocaleDateString('ru-RU', {weekday:'long'});
    const dayFull = date.toLocaleDateString('ru-RU');

    const desc = weatherCodes[d.weathercode[i]] || '—';
    const dayTemp = Math.round(d.temperature_2m_max[i]);
    const nightTemp = Math.round(d.temperature_2m_min[i]);
    const wind = d.windspeed_10m_max[i] ? d.windspeed_10m_max[i]+" м/с" : '—';
    const rain = d.precipitation_sum[i] ? d.precipitation_sum[i]+" мм" : '—';

    const dayDiv = document.createElement("div");
    dayDiv.className = "day-forecast";

    dayDiv.innerHTML = `
      <div class="day-header">
        <strong>${dayName}</strong>
        <span class="date">${dayFull}</span>
      </div>
      <div class="weather-details">
        <div>🌞 Днем: <span>${dayTemp}°</span></div>
        <div>🌙 Ночью: <span>${nightTemp}°</span></div>
        <div>☁ Погода: <span>${desc}</span></div>
        <div>🌬 Ветер: <span>${wind}</span></div>
        <div>🌧 Осадки: <span>${rain}</span></div>
      </div>
    `;
    forecastWrapper.appendChild(dayDiv);
  }

  div.appendChild(forecastWrapper);
  return div;
}

function deleteCity(name) {
  cities = cities.filter(c => c.name !== name);
  localStorage.setItem("weather_cities", JSON.stringify(cities));
  loadAllWeather();
}

document.addEventListener("click", (e) => {
  const isInput = e.target === cityInput;
  const isSuggestion = e.target.classList.contains("suggestion-item");

  if (!isInput && !isSuggestion) {
    suggestionsBox.style.display = "none";
  }
});

document.addEventListener("click", (e) => {
  if (e.target !== cityInput && e.target !== suggestionsBox && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = "none";
    if (errorDiv.textContent === "Город не найден") {
      cityInput.value = "";
      errorDiv.textContent = "";
    }
  }
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    suggestionsBox.style.display = "none";
    if (errorDiv.textContent === "Город не найден") {
      cityInput.value = "";
      errorDiv.textContent = "";
    }
  }
});
