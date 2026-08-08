// Central mock data store. In a real product this would come from a
// weather provider (OpenWeather / Tomorrow.io / NOAA) + an AI summarizer.

export const CURRENT = {
  city: "Nagercoil",
  country: "India",
  temp: 29,
  feelsLike: 32,
  condition: "clouds", // sunny | rain | clouds | snow | night
  humidity: 78,
  windSpeed: 14,
  visibility: 8,
  uvIndex: 6,
  aqi: 62,
};

export const HOURLY = [
  { time: "Now", temp: 29, condition: "clouds", rain: 10 },
  { time: "1PM", temp: 30, condition: "sunny", rain: 5 },
  { time: "2PM", temp: 31, condition: "sunny", rain: 5 },
  { time: "3PM", temp: 30, condition: "clouds", rain: 15 },
  { time: "4PM", temp: 29, condition: "clouds", rain: 30 },
  { time: "5PM", temp: 28, condition: "rain", rain: 55 },
  { time: "6PM", temp: 27, condition: "rain", rain: 70 },
  { time: "7PM", temp: 26, condition: "rain", rain: 60 },
  { time: "8PM", temp: 25, condition: "night", rain: 20 },
  { time: "9PM", temp: 24, condition: "night", rain: 10 },
];

export const DAILY = [
  { day: "Today", high: 31, low: 24, rain: 40, condition: "rain" },
  { day: "Tue", high: 32, low: 25, rain: 10, condition: "sunny" },
  { day: "Wed", high: 33, low: 25, rain: 5, condition: "sunny" },
  { day: "Thu", high: 30, low: 24, rain: 60, condition: "rain" },
  { day: "Fri", high: 29, low: 23, rain: 70, condition: "rain" },
  { day: "Sat", high: 31, low: 24, rain: 20, condition: "clouds" },
  { day: "Sun", high: 32, low: 25, rain: 15, condition: "sunny" },
];

export const AI_SUMMARY = {
  headline: "Perfect weather for outdoor activities today.",
  detail: "Rain may begin after 6 PM, so wrap up anything outside before dusk.",
  bestTime: "7:00 PM",
  bestTimeLabel: "Best time to exercise",
};

export const INSIGHTS = [
  { key: "gym", label: "Gym Score", icon: "dumbbell", score: 92, color: "#38BDF8", desc: "Perfect day for heavy lifting." },
  { key: "walking", label: "Walking Score", icon: "footprints", score: 85, color: "#7C3AED", desc: "Great conditions for a long walk." },
  { key: "cycling", label: "Cycling Score", icon: "bike", score: 74, color: "#2563EB", desc: "Light wind, good visibility." },
  { key: "laundry", label: "Laundry Score", icon: "shirt", score: 45, color: "#F59E0B", desc: "Rain later — dry indoors today." },
  { key: "beach", label: "Beach Score", icon: "umbrella", score: 60, color: "#06B6D4", desc: "Decent, but UV is high." },
  { key: "travel", label: "Travel Score", icon: "plane", score: 88, color: "#22C55E", desc: "Smooth roads, minor delays possible." },
  { key: "fishing", label: "Fishing Score", icon: "fish", score: 70, color: "#0EA5E9", desc: "Overcast skies favor a good catch." },
  { key: "driving", label: "Driving Score", icon: "car", score: 80, color: "#A855F7", desc: "Clear roads until evening rain." },
];

export const RAIN_ALERT = {
  active: true,
  etaMinutes: 80,
  message: "Carry an umbrella — rain is on its way.",
};

export const AIR_QUALITY = {
  aqi: 62,
  level: "Moderate",
  advice: "Sensitive groups should limit prolonged outdoor exertion.",
  pollen: "Medium",
  uv: 6,
};

export const SUN = {
  sunrise: "06:12 AM",
  sunset: "06:34 PM",
  goldenHour: "05:48 PM – 06:34 PM",
  blueHour: "06:34 PM – 06:58 PM",
  moonPhase: "Waxing Gibbous",
  moonIllumination: 78,
};

export const FAVORITES = [
  { id: 1, city: "Nagercoil", country: "India", temp: 29, condition: "clouds" },
  { id: 2, city: "Chennai", country: "India", temp: 33, condition: "sunny" },
  { id: 3, city: "Mumbai", country: "India", temp: 30, condition: "rain" },
  { id: 4, city: "Tokyo", country: "Japan", temp: 24, condition: "clouds" },
  { id: 5, city: "London", country: "UK", temp: 17, condition: "rain" },
];

export const TRENDING_CITIES = ["Chennai", "Mumbai", "Dubai", "Singapore", "New York", "Tokyo"];

export const NOTIFICATIONS = [
  { id: 1, type: "rain", title: "Rain Alert", message: "Rain expected in 1h 20m near Nagercoil.", time: "2 min ago" },
  { id: 2, type: "heat", title: "Heat Advisory", message: "Temperatures may reach 33°C this afternoon.", time: "1 hr ago" },
  { id: 3, type: "storm", title: "Storm Watch", message: "A storm system is forming over the Bay of Bengal.", time: "5 hr ago" },
  { id: 4, type: "cyclone", title: "Cyclone Tracker", message: "No active cyclones near your region.", time: "Yesterday" },
  { id: 5, type: "news", title: "Weather News", message: "Monsoon expected to intensify next week.", time: "Yesterday" },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "The essentials, always on the house.",
    features: ["3 saved cities", "Hourly & 7-day forecast", "Basic alerts", "Ads supported"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 4.99,
    tagline: "For people who plan their day around the sky.",
    features: ["Unlimited cities", "AI weather summary", "Live radar", "Rain & storm alerts", "No ads"],
    highlight: true,
  },
  {
    id: "premium_plus",
    name: "Premium Plus",
    price: 9.99,
    tagline: "Deeper insight, sharper alerts.",
    features: ["Everything in Premium", "Lightning alerts", "Weather history & timeline", "AI recommendations", "Home & lock screen widgets"],
  },
  {
    id: "family",
    name: "Family",
    price: 14.99,
    tagline: "Share the forecast with up to 6 people.",
    features: ["Everything in Premium Plus", "6 family members", "Shared favorite cities", "Priority support"],
  },
];
