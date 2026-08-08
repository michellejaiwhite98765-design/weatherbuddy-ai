import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Home from "./pages/Home";
import MapScreen from "./pages/MapScreen";
import Movies from "./pages/Movies";
import Search from "./pages/Search";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import Premium from "./pages/Premium";
import Auth from "./pages/Auth";
import BottomNav from "./components/BottomNav";
import { fetchMe } from "./store/authSlice";
import { getStoredToken } from "./store/api";

const APP_PATHS = ["/", "/movies", "/map", "/search", "/alerts", "/profile", "/premium"];

export default function App() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  // Restore the session on first load if a token is stored.
  useEffect(() => {
    if (getStoredToken()) dispatch(fetchMe());
  }, [dispatch]);

  const isAppPath = APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/map" element={<MapScreen />} />
        <Route path="/search" element={<Search />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/premium" element={<Premium />} />
      </Routes>
      {isAppPath && <BottomNav />}
    </div>
  );
}
