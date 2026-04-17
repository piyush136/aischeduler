const axios = require('axios');

/**
 * Weather codes from Open-Meteo:
 * 0: Clear sky
 * 1, 2, 3: Mainly clear, partly cloudy, and overcast
 * 45, 48: Fog and depositing rime fog
 * 51, 53, 55: Drizzle: Light, moderate, and dense intensity
 * 61, 63, 65: Rain: Slight, moderate and heavy intensity
 * 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
 * 80, 81, 82: Rain showers: Slight, moderate, and violent
 * 95, 96, 99: Thunderstorm: Slight, moderate, and heavy
 */
const getWeatherDescription = (code) => {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzling";
  if (code <= 65) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
};

const getWeather = {
  name: "get_weather",
  description: "Get weather forecast for a specific location and time using coordinates.",
  parameters: {
    type: "object",
    properties: {
      lat: { type: "number", description: "Latitude" },
      lng: { type: "number", description: "Longitude" },
      timestamp: { type: "string", description: "ISO 8601 timestamp to check" }
    },
    required: ["lat", "lng", "timestamp"]
  },
  execute: async (args) => {
    try {
      const { lat, lng, timestamp } = args;
      const date = new Date(timestamp);
      
      const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
        params: {
          latitude: lat,
          longitude: lng,
          hourly: 'temperature_2m,precipitation_probability,weathercode',
          timezone: 'auto'
        }
      });

      const hourly = response.data.hourly;
      // Find the closest hour in the forecast
      const targetTimeStr = date.toISOString().slice(0, 13) + ":00"; // Format as YYYY-MM-DDTHH:00
      let index = hourly.time.findIndex(t => t.startsWith(targetTimeStr.slice(0, 16)));
      
      if (index === -1) {
        // Fallback to closest hour if not exact match
        index = 0; 
      }

      const weather = {
        temp: hourly.temperature_2m[index],
        precipProb: hourly.precipitation_probability[index],
        code: hourly.weathercode[index],
        description: getWeatherDescription(hourly.weathercode[index])
      };

      return {
        success: true,
        weather,
        isBadWeather: weather.precipProb > 40 || weather.code >= 51
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = getWeather;
