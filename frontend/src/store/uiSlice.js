import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  units: "metric", // metric | imperial
  activeTab: "home",
  selectedPlan: "premium",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleUnits(state) {
      state.units = state.units === "metric" ? "imperial" : "metric";
    },
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    setSelectedPlan(state, action) {
      state.selectedPlan = action.payload;
    },
  },
});

export const { toggleUnits, setActiveTab, setSelectedPlan } = uiSlice.actions;
export default uiSlice.reducer;
