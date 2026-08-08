import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import App from "./App";
import { store } from "./store/store";
import "./styles/global.css";

const weatherBuddyTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#38BDF8",
    colorInfo: "#38BDF8",
    colorLink: "#38BDF8",
    colorBgBase: "#0F172A",
    colorBgContainer: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    Segmented: {
      itemSelectedBg: "#2563EB",
      trackBg: "rgba(255,255,255,0.06)",
    },
    Input: {
      colorBgContainer: "rgba(255,255,255,0.06)",
      colorBorder: "rgba(255,255,255,0.12)",
    },
    Timeline: {
      tailColor: "rgba(255,255,255,0.12)",
    },
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={weatherBuddyTheme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
