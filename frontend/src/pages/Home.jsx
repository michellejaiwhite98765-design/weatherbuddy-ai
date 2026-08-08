import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchHome, fetchAIForecast, fetchAIActivity, fetchHistory, realtimeUpdate } from "../store/weatherSlice";
import { connectRealtime, subscribeCity } from "../store/socket";
import WeatherBackground from "../components/WeatherBackground";
import GreetingHeader from "../components/GreetingHeader";
import AISummaryCard from "../components/AISummaryCard";
import AICompanion from "../components/AICompanion";
import HourlyForecast from "../components/HourlyForecast";
import WeeklyForecast from "../components/WeeklyForecast";
import SmartInsights from "../components/SmartInsights";
import RainAlertCard from "../components/RainAlertCard";
import AirQualityCard from "../components/AirQualityCard";
import SunCard from "../components/SunCard";
import HistorySparkline from "../components/HistorySparkline";
import PremiumLock from "../components/PremiumLock";

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { home, homeStatus, selectedCity, ai, history } = useSelector((s) => s.weather);
  const { user } = useSelector((s) => s.auth);
  const { units } = useSelector((s) => s.ui);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => dispatch(fetchHome(selectedCity)), [dispatch, selectedCity]);

  // Initial fetch + refetch when city / plan changes.
  useEffect(() => {
    dispatch(fetchHome(selectedCity));
  }, [dispatch, selectedCity, user?.plan]);

  // Auto-refresh every 60s so the data stays live.
  useEffect(() => {
    const t = setInterval(() => {
      setRefreshTick((n) => n + 1);
      dispatch(fetchHome(selectedCity));
    }, 60_000);
    return () => clearInterval(t);
  }, [dispatch, selectedCity]);

  // Refresh when the tab regains focus (fresh data on returning to the app).
  useEffect(() => {
    const onFocus = () => dispatch(fetchHome(selectedCity));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dispatch, selectedCity]);

  // WebSocket live updates — merge pushes into the dashboard, resubscribe on city change.
  useEffect(() => {
    connectRealtime({ onUpdate: (update) => dispatch(realtimeUpdate(update)) });
  }, [dispatch]);

  useEffect(() => {
    subscribeCity(selectedCity);
  }, [selectedCity]);

  // Premium-only: pull the enriched AI forecast + chat history for the selected city.
  useEffect(() => {
    if (home?.premium) {
      dispatch(fetchAIForecast(selectedCity));
      dispatch(fetchAIActivity());
      dispatch(fetchHistory(selectedCity));
    }
  }, [dispatch, home?.premium, selectedCity]);

  // Make the whole UI weather-reactive via a body data-attribute.
  useEffect(() => {
    if (home) {
      document.body.dataset.weather = home.current.condition;
      document.body.dataset.weatherIsDay = String(!!home.current.isDay);
    }
    return () => {
      delete document.body.dataset.weather;
      delete document.body.dataset.weatherIsDay;
    };
  }, [home]);

  if (homeStatus === "failed") {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", minHeight: "70vh", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 24px" }}>
        <h2 style={{ fontSize: 20 }}>Couldn't load the weather</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 8 }}>
          We had trouble reaching the forecast service. Check your connection and try again.
        </p>
        <button onClick={() => dispatch(fetchHome(selectedCity))} className="gradient-btn" style={{ marginTop: 20, padding: "13px 30px", borderRadius: 14, fontWeight: 700, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  if (homeStatus === "loading" || !home) {
    return (
      <div className="screen">
        <div className="skeleton" style={{ height: 220, marginTop: 24 }} />
        <div className="skeleton" style={{ height: 140, marginTop: 20 }} />
        <div className="skeleton" style={{ height: 110, marginTop: 20 }} />
      </div>
    );
  }

  const isPremium = !!home.premium;

  return (
    <div className="screen">
      <WeatherBackground condition={home.current.condition} temp={home.current.temp} isDay={home.current.isDay} />
      <GreetingHeader
        current={home.current}
        userName={user?.name || "there"}
        units={units}
        refreshing={homeStatus === "loading"}
        onRefresh={refresh}
        fetchedAt={home.current.fetchedAt}
      />
      <HourlyForecast hourly={home.hourly} />
      <RainAlertCard alert={home.rainAlert} />
      <WeeklyForecast daily={home.daily} />
      {isPremium ? (
        <>
          <AISummaryCard summary={home.aiSummary} rich={ai.forecast} />
          <AICompanion city={selectedCity} />
        </>
      ) : (
        <PremiumLock onUpgrade={() => navigate("/premium")} />
      )}
      {isPremium ? <SmartInsights insights={home.insights || []} /> : null}
      <AirQualityCard air={home.airQuality} />
      <SunCard sun={home.sun} />
      {isPremium ? (
        <HistorySparkline history={history.data} city={home.location?.name} units={units} />
      ) : null}
    </div>
  );
}
