import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Input, Tag, message } from "antd";
import { SearchOutlined, EnvironmentOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { searchCities, fetchFavorites, selectCity, addFavorite, removeFavorite } from "../store/weatherSlice";

const RECENTS = ["Chennai", "Kanyakumari", "Trivandrum"];

export default function SearchScreen() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { search, favorites } = useSelector((s) => s.weather);
  const { status } = useSelector((s) => s.auth);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(searchCities(""));
    dispatch(fetchFavorites());
  }, [dispatch]);

  const loadCity = (loc) => {
    dispatch(selectCity({ city: loc.name || loc.city, lat: loc.lat, lon: loc.lon }));
    navigate("/");
  };

  const toggleFavorite = async (loc, e) => {
    e?.stopPropagation();
    if (status !== "authenticated") {
      message.info("Sign in to save favorite cities.");
      navigate("/login");
      return;
    }
    const name = loc.name || loc.city;
    const isFav = favorites.some((f) => f.city === name);
    if (isFav) {
      await dispatch(removeFavorite(name));
    } else {
      await dispatch(addFavorite({ city: name, country: loc.country, lat: loc.lat, lon: loc.lon }));
    }
  };

  const handleSearch = (value) => {
    setQuery(value);
    dispatch(searchCities(value));
  };

  return (
    <div className="screen">
      <div style={{ paddingTop: 22 }}>
        <h2 style={{ fontSize: 22 }}>Search</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
          Find a city to check its forecast
        </p>
      </div>

      <Input
        size="large"
        placeholder="Search for a city..."
        prefix={<SearchOutlined style={{ color: "var(--text-tertiary)" }} />}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        allowClear
        style={{
          marginTop: 18,
          borderRadius: 16,
          background: "var(--surface-glass)",
          border: "1px solid var(--border-glass)",
        }}
      />

      {query && (
        <div style={{ marginTop: 20 }}>
          <h3 className="section-title">Results</h3>
          {search.status === "loading" && query ? (
            <div className="skeleton" style={{ height: 70, marginTop: 10 }} />
          ) : search.results.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: 13 }}>
              No cities found for "{query}"
            </p>
          ) : (
            search.results.map((loc) => (
              <ResultRow
                key={loc.id}
                loc={loc}
                onClick={() => loadCity(loc)}
                onToggle={(e) => toggleFavorite(loc, e)}
                isFav={favorites.some((f) => f.city === loc.name)}
              />
            ))
          )}
        </div>
      )}

      {!query && (
        <>
          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">Recent Searches</h3>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {RECENTS.map((c) => (
                <Tag
                  key={c}
                  onClick={() => loadCity({ name: c })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: "var(--surface-glass)",
                    border: "1px solid var(--border-glass)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </Tag>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">Favorite Cities</h3>
            {favorites.length === 0 ? (
              <p className="text-tertiary" style={{ fontSize: 13 }}>
                {status === "authenticated"
                  ? "No favorites yet — star a city to save it."
                  : "Sign in to save favorite cities."}
              </p>
            ) : (
              favorites.map((f) => (
                <ResultRow
                  key={f.id}
                  loc={{ name: f.city, country: f.country, lat: f.lat, lon: f.lon }}
                  temp={f.temp}
                  condition={f.condition}
                  onClick={() => loadCity({ name: f.city, lat: f.lat, lon: f.lon })}
                  onToggle={(e) => toggleFavorite({ name: f.city }, e)}
                  isFav
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ResultRow({ loc, temp, condition, onClick, onToggle, isFav }) {
  const sub = [loc.country, loc.admin1].filter(Boolean).join(", ");
  return (
    <div
      className="glass-card glass-card--tight row-between"
      style={{ padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}
      onClick={onClick}
    >
      <div className="row" style={{ gap: 10 }}>
        <EnvironmentOutlined style={{ color: "var(--sky-blue)" }} />
        <div className="col">
          <span style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</span>
          {sub && (
            <span className="text-tertiary" style={{ fontSize: 11 }}>
              {sub}
            </span>
          )}
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        {temp !== undefined && (
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {temp}°{" "}
            <span className="text-tertiary" style={{ fontSize: 11, textTransform: "capitalize" }}>
              {condition}
            </span>
          </span>
        )}
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: isFav ? "#F59E0B" : "var(--text-tertiary)",
            fontSize: 16,
            padding: 4,
          }}
        >
          {isFav ? <StarFilled /> : <StarOutlined />}
        </button>
      </div>
    </div>
  );
}
