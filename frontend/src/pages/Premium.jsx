import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckOutlined, CrownFilled, LoadingOutlined } from "@ant-design/icons";
import { fetchPlans } from "../store/weatherSlice";
import { setSelectedPlan } from "../store/uiSlice";
import { fetchMe } from "../store/authSlice";
import { api } from "../store/api";

export default function Premium() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plans, plansStatus } = useSelector((s) => s.weather);
  const { selectedPlan } = useSelector((s) => s.ui);
  const { user, status } = useSelector((s) => s.auth);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    dispatch(fetchPlans());
  }, [dispatch]);

  // Handle returning from a Stripe checkout redirect.
  useEffect(() => {
    const s = searchParams.get("status");
    if (s === "success") {
      dispatch(fetchMe());
    }
  }, [searchParams, dispatch]);

  const isCurrentPlan = user?.plan === selectedPlan && user?.plan !== "free";

  const checkout = async () => {
    if (status !== "authenticated") {
      navigate("/login");
      return;
    }
    setCheckingOut(true);
    try {
      const { data } = await api.post("/billing/checkout", {
        planId: selectedPlan,
        successUrl: `${window.location.origin}/premium?status=success`,
        cancelUrl: `${window.location.origin}/premium?status=cancelled`,
      });
      if (data.mode === "stripe" && data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        // Dev fallback: plan recorded in DB.
        await dispatch(fetchMe());
        navigate("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="screen">
      <div style={{ paddingTop: 22, textAlign: "center" }}>
        <span
          className="sparkle-icon"
          style={{ width: 52, height: 52, display: "grid", placeItems: "center", margin: "0 auto", borderRadius: 16, background: "var(--gradient-premium)" }}
        >
          <CrownFilled style={{ fontSize: 22 }} />
        </span>
        <h2 style={{ fontSize: 22, marginTop: 14 }}>Unlock WeatherBuddy Premium</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 6, padding: "0 12px" }}>
          AI insights, live radar and zero ads — pick the plan that fits you.
        </p>
        {user?.plan && user.plan !== "free" && (
          <span className="text-secondary" style={{ fontSize: 12, display: "block", marginTop: 8, color: "var(--sky-blue)" }}>
            You're currently on {user.plan.replace("_", " ")}.
          </span>
        )}
      </div>

      {plansStatus === "loading" ? (
        <div className="col" style={{ gap: 14, marginTop: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 140 }} />
          ))}
        </div>
      ) : (
        <div className="col" style={{ gap: 14, marginTop: 24 }}>
          {plans.map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => dispatch(setSelectedPlan(plan.id))}
                className="glass-card"
                style={{
                  padding: 20,
                  cursor: "pointer",
                  border: active
                    ? "1.5px solid var(--sky-blue)"
                    : plan.highlight
                    ? "1px solid rgba(124,58,237,0.4)"
                    : "1px solid var(--border-glass)",
                  background: active
                    ? "linear-gradient(135deg, rgba(56,189,248,0.14), rgba(124,58,237,0.14))"
                    : "var(--surface-glass)",
                }}
              >
                <div className="row-between">
                  <div className="row" style={{ gap: 8 }}>
                    <h3 style={{ fontSize: 17 }}>{plan.name}</h3>
                    {plan.highlight && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "var(--gradient-premium)" }}>
                        POPULAR
                      </span>
                    )}
                  </div>
                  <div className="col" style={{ alignItems: "flex-end" }}>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{plan.price === 0 ? "Free" : `$${plan.price}`}</span>
                    {plan.price > 0 && <span className="text-tertiary" style={{ fontSize: 10.5 }}>/ month</span>}
                  </div>
                </div>
                <p className="text-secondary" style={{ fontSize: 12.5, marginTop: 6 }}>{plan.tagline}</p>
                <div className="col" style={{ gap: 8, marginTop: 14 }}>
                  {plan.features.map((f) => (
                    <div key={f} className="row" style={{ gap: 8 }}>
                      <CheckOutlined style={{ fontSize: 11, color: "var(--sky-blue)" }} />
                      <span style={{ fontSize: 12.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="gradient-btn" onClick={checkout} style={{ width: "100%", padding: "16px 0", marginTop: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {checkingOut ? (
          <>
            <LoadingOutlined /> Processing…
          </>
        ) : isCurrentPlan ? (
          "Current Plan"
        ) : status !== "authenticated" ? (
          `Sign in to continue with ${plans.find((p) => p.id === selectedPlan)?.name || "Premium"}`
        ) : (
          `Continue with ${plans.find((p) => p.id === selectedPlan)?.name || "Premium"}`
        )}
      </button>
      <p className="text-tertiary" style={{ fontSize: 11, textAlign: "center", marginTop: 10 }}>
        Cancel anytime. Renews automatically. Test card 4242 4242 4242 4242 in Stripe test mode.
      </p>
    </div>
  );
}
