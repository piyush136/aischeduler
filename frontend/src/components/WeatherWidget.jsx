import { useState } from 'react';
import axios from 'axios';
import {
  Search, CloudRain, Sun, Cloud, CloudSnow, Wind,
  Droplets, Thermometer, CloudLightning, MapPin, ChevronRight
} from 'lucide-react';

const WMO_CODES = {
  0:  { label: 'Clear Sky',        icon: Sun,            color: '#FBBF24' },
  1:  { label: 'Mainly Clear',     icon: Sun,            color: '#FCD34D' },
  2:  { label: 'Partly Cloudy',    icon: Cloud,          color: '#94A3B8' },
  3:  { label: 'Overcast',         icon: Cloud,          color: '#64748B' },
  45: { label: 'Foggy',            icon: Cloud,          color: '#94A3B8' },
  48: { label: 'Foggy',            icon: Cloud,          color: '#94A3B8' },
  51: { label: 'Light Drizzle',    icon: CloudRain,      color: '#60A5FA' },
  53: { label: 'Drizzle',          icon: CloudRain,      color: '#3B82F6' },
  55: { label: 'Heavy Drizzle',    icon: CloudRain,      color: '#2563EB' },
  61: { label: 'Light Rain',       icon: CloudRain,      color: '#60A5FA' },
  63: { label: 'Moderate Rain',    icon: CloudRain,      color: '#3B82F6' },
  65: { label: 'Heavy Rain',       icon: CloudRain,      color: '#1D4ED8' },
  71: { label: 'Light Snow',       icon: CloudSnow,      color: '#BAE6FD' },
  73: { label: 'Moderate Snow',    icon: CloudSnow,      color: '#93C5FD' },
  75: { label: 'Heavy Snow',       icon: CloudSnow,      color: '#7DD3FC' },
  80: { label: 'Rain Showers',     icon: CloudRain,      color: '#3B82F6' },
  81: { label: 'Heavy Showers',    icon: CloudRain,      color: '#2563EB' },
  95: { label: 'Thunderstorm',     icon: CloudLightning, color: '#7C3AED' },
  96: { label: 'Thunderstorm',     icon: CloudLightning, color: '#6D28D9' },
  99: { label: 'Heavy Thunderstorm', icon: CloudLightning, color: '#5B21B6' },
};

const getInfo = (code) => WMO_CODES[code] ?? { label: 'Unknown', icon: Cloud, color: '#94A3B8' };

const fmtHour  = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDay   = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const tom = new Date(); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const gradientFor = (code) => {
  if (code >= 95) return 'from-violet-900 to-slate-900';
  if (code >= 65) return 'from-blue-900 to-slate-900';
  if (code >= 51) return 'from-slate-700 to-slate-900';
  if (code >= 3)  return 'from-slate-600 to-slate-800';
  return 'from-sky-700 to-indigo-900';
};

export default function WeatherWidget() {
  const [city,         setCity]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [weather,      setWeather]      = useState(null);
  const [locName,      setLocName]      = useState('');
  const [selectedDay,  setSelectedDay]  = useState(0); // index into daily arrays

  const fetchWeather = async () => {
    if (!city.trim()) return;
    setLoading(true); setError(null); setWeather(null); setSelectedDay(0);

    try {
      const geo = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { format: 'json', q: city, limit: 1 },
        headers: { 'User-Agent': 'AI-Task-Manager/1.0' }
      });

      if (!geo.data?.length) { setError(`City "${city}" not found.`); setLoading(false); return; }

      const lat = parseFloat(geo.data[0].lat);
      const lng = parseFloat(geo.data[0].lon);
      setLocName(geo.data[0].display_name.split(',').slice(0, 2).join(', '));

      const w = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat, longitude: lng,
          hourly:  'temperature_2m,precipitation_probability,weathercode,windspeed_10m,relativehumidity_2m',
          daily:   'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode',
          current_weather: true,
          timezone: 'auto',
          forecast_days: 7
        }
      });

      setWeather({ ...w.data, lat, lng });
    } catch (e) {
      setError('Failed to fetch weather. Check your connection.');
    } finally { setLoading(false); }
  };

  // ── derived data ──────────────────────────────────────────────────────────
  const currentHour = new Date().getHours();

  // All hours for the selected day (0…6)
  const selectedHours = weather
    ? Array.from({ length: 24 }, (_, h) => selectedDay * 24 + h)
    : [];

  const nowCode = weather?.hourly.weathercode[currentHour] ?? 0;
  const nowProb = weather?.hourly.precipitation_probability[currentHour] ?? 0;
  const nowTemp = weather?.hourly.temperature_2m[currentHour];
  const nowWind = weather?.hourly.windspeed_10m[currentHour];
  const nowHum  = weather?.hourly.relativehumidity_2m[currentHour];
  const nowInfo = getInfo(nowCode);

  return (
    <div className="space-y-6">

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-700 text-lg mb-1 flex items-center gap-2">
          <MapPin size={20} className="text-blue-500" />
          7-Day Weather Forecast
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Search any city to see the weekly forecast and decide the best day for outdoor tasks.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text" placeholder="e.g. London, Mumbai, New York…"
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchWeather()}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            onClick={fetchWeather} disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 shadow-md transition-all"
          >
            {loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Loading…</span>
              : 'Get Forecast'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">⚠️ {error}</div>}
      </div>

      {weather && (
        <>
          {/* ── Current conditions hero ─────────────────────────────────────── */}
          <div className={`rounded-2xl bg-gradient-to-br ${gradientFor(nowCode)} p-6 text-white shadow-lg`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-200 text-sm font-medium flex items-center gap-1 mb-1">
                  <MapPin size={14} /> {locName}
                </p>
                <h2 className="text-5xl font-black tracking-tight">{Math.round(nowTemp ?? 0)}°C</h2>
                <p className="text-blue-200 mt-1 font-medium">{nowInfo.label}</p>
              </div>
              <nowInfo.icon size={64} color={nowInfo.color} className="opacity-90 drop-shadow-lg" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { Icon: Droplets,    label: 'Rain Chance', val: `${nowProb}%` },
                { Icon: Wind,        label: 'Wind',        val: `${nowWind} km/h` },
                { Icon: Thermometer, label: 'Humidity',    val: `${nowHum}%` },
              ].map(({ Icon, label, val }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                  <Icon size={18} className="mx-auto mb-1 text-blue-300" />
                  <p className="text-xs text-blue-200">{label}</p>
                  <p className="font-bold text-sm">{val}</p>
                </div>
              ))}
            </div>

            <div className={`mt-4 rounded-xl px-4 py-3 text-sm border ${
              nowProb > 40
                ? 'bg-red-500/20 border-red-400/30'
                : 'bg-green-500/20 border-green-400/30'
            }`}>
              {nowProb > 40
                ? `⛈️ Not ideal right now — ${nowProb}% rain chance. Check another day below.`
                : '✅ Good for outdoor activities right now!'}
            </div>
          </div>

          {/* ── 7-Day daily strip ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-700 mb-4 text-base">7-Day Forecast</h3>
            <div className="grid grid-cols-7 gap-2">
              {weather.daily.time.map((day, i) => {
                const info  = getInfo(weather.daily.weathercode[i]);
                const max   = Math.round(weather.daily.temperature_2m_max[i]);
                const min   = Math.round(weather.daily.temperature_2m_min[i]);
                const prob  = weather.daily.precipitation_probability_max[i];
                const isActive = i === selectedDay;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(i)}
                    className={`flex flex-col items-center p-2 rounded-2xl transition-all text-xs border ${
                      isActive
                        ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white border-transparent shadow-lg scale-105'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-100'
                    }`}
                  >
                    <span className={`font-semibold mb-1 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {fmtDay(day).split(' ')[0]}
                    </span>
                    <info.icon size={22} color={isActive ? '#fff' : info.color} className="my-1" />
                    <span className="font-bold">{max}°</span>
                    <span className={`${isActive ? 'text-blue-200' : 'text-slate-400'}`}>{min}°</span>
                    <div className={`flex items-center gap-0.5 mt-1 ${isActive ? 'text-blue-200' : prob > 40 ? 'text-blue-500 font-semibold' : 'text-slate-400'}`}>
                      <Droplets size={10} />{prob}%
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">Tap a day to see its hourly breakdown ↓</p>
          </div>

          {/* ── Hourly strip for selected day ────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-700 mb-1 text-base">
              Hourly – {fmtDay(weather.daily.time[selectedDay])}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {weather.daily.precipitation_probability_max[selectedDay] > 40
                ? `⚠️ Up to ${weather.daily.precipitation_probability_max[selectedDay]}% rain — consider rescheduling outdoor plans.`
                : '✅ Looks like a good day for outdoor tasks!'}
            </p>
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                {selectedHours.map((idx) => {
                  const t    = weather.hourly.time[idx];
                  const info = getInfo(weather.hourly.weathercode[idx]);
                  const prob = weather.hourly.precipitation_probability[idx];
                  const temp = Math.round(weather.hourly.temperature_2m[idx]);
                  const isNow = selectedDay === 0 && idx === currentHour;
                  return (
                    <div
                      key={t}
                      className={`flex flex-col items-center p-3 rounded-xl min-w-[68px] transition-all ${
                        isNow
                          ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${isNow ? 'text-blue-100' : 'text-slate-500'}`}>
                        {isNow ? 'Now' : fmtHour(t)}
                      </p>
                      <info.icon size={20} color={isNow ? '#fff' : info.color} className="my-1" />
                      <p className="font-bold text-sm">{temp}°</p>
                      <div className={`flex items-center gap-0.5 text-xs mt-1 ${isNow ? 'text-blue-200' : 'text-slate-400'}`}>
                        <Droplets size={10} />{prob}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Powered by Open-Meteo • Free &amp; open-source weather data
            </p>
          </div>
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!weather && !loading && !error && (
        <div className="text-center py-20 text-slate-400">
          <Sun size={60} className="mx-auto mb-4 text-yellow-400 opacity-70" strokeWidth={1.5} />
          <p className="text-slate-500 font-semibold text-lg">Search a city above</p>
          <p className="text-sm mt-1">See the 7-day forecast &amp; hourly breakdown ☀️</p>
        </div>
      )}
    </div>
  );
}
