import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "./api";

// fetchHome accepts either a city name string or { lat, lon, city }.
export const fetchHome = createAsyncThunk("weather/fetchHome", async (cityOrLoc) => {
  const params = {};
  if (typeof cityOrLoc === "string") params.city = cityOrLoc;
  else if (cityOrLoc && cityOrLoc.city) {
    params.city = cityOrLoc.city;
    params.lat = cityOrLoc.lat;
    params.lon = cityOrLoc.lon;
  }
  const { data } = await api.get("/weather/home", { params });
  return data;
});

export const fetchRadar = createAsyncThunk("weather/fetchRadar", async (cityOrLoc) => {
  const params = {};
  if (typeof cityOrLoc === "string") params.city = cityOrLoc;
  else if (cityOrLoc && cityOrLoc.city) {
    params.city = cityOrLoc.city;
    params.lat = cityOrLoc.lat;
    params.lon = cityOrLoc.lon;
  }
  const { data } = await api.get("/weather/radar", { params });
  return data;
});

export const fetchFavorites = createAsyncThunk("weather/fetchFavorites", async () => {
  const { data } = await api.get("/weather/favorites");
  return data;
});

export const addFavorite = createAsyncThunk("weather/addFavorite", async (fav) => {
  const { data } = await api.post("/weather/favorites", fav);
  return data.favorites;
});

export const removeFavorite = createAsyncThunk("weather/removeFavorite", async (city) => {
  const { data } = await api.delete(`/weather/favorites/${encodeURIComponent(city)}`);
  return data.favorites;
});

export const searchCities = createAsyncThunk("weather/searchCities", async (query) => {
  const { data } = await api.get("/weather/search", { params: { q: query } });
  return data;
});

export const fetchNotifications = createAsyncThunk("weather/fetchNotifications", async () => {
  const { data } = await api.get("/weather/notifications");
  return data;
});

export const fetchPlans = createAsyncThunk("weather/fetchPlans", async () => {
  const { data } = await api.get("/weather/plans");
  return data;
});

// --- AI (premium) ---

const aiParams = (cityOrLoc) => {
  const params = {};
  if (typeof cityOrLoc === "string") params.city = cityOrLoc;
  else if (cityOrLoc && cityOrLoc.city) {
    params.city = cityOrLoc.city;
    params.lat = cityOrLoc.lat;
    params.lon = cityOrLoc.lon;
  }
  return params;
};

export const fetchAIForecast = createAsyncThunk("weather/fetchAIForecast", async (cityOrLoc) => {
  const { data } = await api.get("/ai/forecast", { params: aiParams(cityOrLoc) });
  return data;
});

export const sendAIChat = createAsyncThunk("weather/sendAIChat", async ({ message, city }) => {
  const { data } = await api.post("/ai/chat", { message, ...(city ? aiParams(city) : {}) });
  return data;
});

export const fetchAIActivity = createAsyncThunk("weather/fetchAIActivity", async () => {
  const { data } = await api.get("/ai/activity");
  return data.activities;
});

export const fetchHistory = createAsyncThunk("weather/fetchHistory", async (cityOrLoc, { getState }) => {
  const { selectedCity } = getState().weather;
  const loc = cityOrLoc || selectedCity;
  const { data } = await api.get("/weather/history", { params: aiParams(loc) });
  return data;
});

const initialState = {
  selectedCity: null, // { city, lat, lon } or null -> default (Nagercoil)
  home: null,
  homeStatus: "idle",
  radar: null,
  radarStatus: "idle",
  favorites: [],
  favoritesStatus: "idle",
  search: { results: [], status: "idle" },
  notifications: [],
  notificationsStatus: "idle",
  plans: [],
  plansStatus: "idle",
  ai: {
    forecast: null,
    forecastStatus: "idle",
    chat: [], // { role, text, engine }
    chatStatus: "idle",
    activity: [],
    activityStatus: "idle",
  },
  history: { data: [], status: "idle" },
};

const weatherSlice = createSlice({
  name: "weather",
  initialState,
  reducers: {
    selectCity(state, action) {
      state.selectedCity = action.payload; // { city, lat, lon }
    },
    clearCity(state) {
      state.selectedCity = null;
    },
    // Merges a live WebSocket push into the dashboard without a loading flash.
    realtimeUpdate(state, action) {
      if (!state.home) return;
      const update = action.payload || {};
      if (update.current) state.home.current = { ...state.home.current, ...update.current };
      if (update.hourly) state.home.hourly = update.hourly;
      if (update.daily) state.home.daily = update.daily;
      if (update.rainAlert) state.home.rainAlert = update.rainAlert;
      if (update.location) state.home.location = update.location;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHome.pending, (state) => {
        state.homeStatus = "loading";
      })
      .addCase(fetchHome.fulfilled, (state, action) => {
        state.homeStatus = "succeeded";
        state.home = action.payload;
      })
      .addCase(fetchHome.rejected, (state) => {
        state.homeStatus = "failed";
      })
      .addCase(fetchRadar.pending, (state) => {
        state.radarStatus = "loading";
      })
      .addCase(fetchRadar.fulfilled, (state, action) => {
        state.radarStatus = "succeeded";
        state.radar = action.payload;
      })
      .addCase(fetchRadar.rejected, (state) => {
        state.radarStatus = "failed";
      })
      .addCase(fetchFavorites.pending, (state) => {
        state.favoritesStatus = "loading";
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.favoritesStatus = "succeeded";
        state.favorites = action.payload;
      })
      .addCase(addFavorite.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      .addCase(removeFavorite.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      .addCase(searchCities.pending, (state) => {
        state.search.status = "loading";
      })
      .addCase(searchCities.fulfilled, (state, action) => {
        state.search.status = "succeeded";
        state.search.results = action.payload.results;
      })
      .addCase(fetchNotifications.pending, (state) => {
        state.notificationsStatus = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notificationsStatus = "succeeded";
        state.notifications = action.payload;
      })
      .addCase(fetchPlans.pending, (state) => {
        state.plansStatus = "loading";
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.plansStatus = "succeeded";
        state.plans = action.payload;
      })
      .addCase(fetchAIForecast.pending, (state) => {
        state.ai.forecastStatus = "loading";
      })
      .addCase(fetchAIForecast.fulfilled, (state, action) => {
        state.ai.forecastStatus = "succeeded";
        state.ai.forecast = action.payload;
      })
      .addCase(fetchAIForecast.rejected, (state) => {
        state.ai.forecastStatus = "failed";
      })
      .addCase(sendAIChat.pending, (state) => {
        state.ai.chatStatus = "loading";
      })
      .addCase(sendAIChat.fulfilled, (state, action) => {
        state.ai.chatStatus = "succeeded";
        state.ai.chat = [
          ...state.ai.chat,
          { role: "user", text: action.meta.arg.message, engine: null },
          { role: "assistant", text: action.payload.reply, engine: action.payload.engine },
        ];
      })
      .addCase(sendAIChat.rejected, (state) => {
        state.ai.chatStatus = "failed";
      })
      .addCase(fetchAIActivity.pending, (state) => {
        state.ai.activityStatus = "loading";
      })
      .addCase(fetchAIActivity.fulfilled, (state, action) => {
        state.ai.activityStatus = "succeeded";
        state.ai.activity = action.payload;
      })
      .addCase(fetchHistory.pending, (state) => {
        state.history.status = "loading";
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history.status = "succeeded";
        state.history.data = action.payload.history || [];
      })
      .addCase(fetchHistory.rejected, (state) => {
        state.history.status = "failed";
      });
  },
});

export const { selectCity, clearCity, realtimeUpdate } = weatherSlice.actions;
export default weatherSlice.reducer;
