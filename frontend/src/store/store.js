import { configureStore } from "@reduxjs/toolkit";
import weatherReducer from "./weatherSlice";
import uiReducer from "./uiSlice";
import authReducer from "./authSlice";

export const store = configureStore({
  reducer: {
    weather: weatherReducer,
    ui: uiReducer,
    auth: authReducer,
  },
});
