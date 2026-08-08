import { Router } from "express";
import Stripe from "stripe";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { getPlan, setPlan } from "../data/db.js";

const router = Router();

// Stripe test mode: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in .env.
// Without keys we fall back to a simulated checkout that still records the
// plan in the database, so the full flow is testable today.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const isPremium = (plan) => plan !== "free";

const PLAN_PRICES = {
  premium: 4.99,
  premium_plus: 9.99,
  family: 14.99,
};

// GET /api/billing/plan — current plan for the logged-in user (or anonymous free).
router.get("/plan", optionalAuth, (req, res) => {
  const plan = getPlan(req.user?.id);
  res.json({ plan, premium: isPremium(plan) });
});

// POST /api/billing/checkout — create a Stripe Checkout session (or dev fallback).
router.post("/checkout", requireAuth, async (req, res) => {
  const planId = req.body?.planId;
  if (!PLAN_PRICES[planId]) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const successUrl = req.body?.successUrl || "http://localhost:5173/premium?status=success";
  const cancelUrl = req.body?.cancelUrl || "http://localhost:5173/premium?status=cancelled";

  // --- Dev fallback: no Stripe keys configured ---------------------------
  if (!stripe) {
    setPlan(req.user.id, planId);
    console.log(`[billing] DEV checkout: user #${req.user.id} -> ${planId}`);
    return res.json({ mode: "dev", plan: planId, message: "Plan activated (dev mode)" });
  }

  // --- Real Stripe Checkout (test mode) ---------------------------------
  try {
    let price = await stripe.prices.list({ limit: 100 });
    price = price.data.find((p) => p.metadata?.planId === planId && p.recurring);
    if (!price) {
      const product = await stripe.products.create({ name: `WeatherBuddy ${planId}` });
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(PLAN_PRICES[planId] * 100),
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { planId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(req.user.id),
      metadata: { userId: String(req.user.id), planId },
    });

    res.json({ mode: "stripe", url: session.url, plan: planId });
  } catch (err) {
    console.error("stripe checkout error:", err.message);
    res.status(502).json({ error: "Could not start checkout." });
  }
});

// POST /api/billing/webhook — Stripe event handler.
router.post("/webhook", async (req, res) => {
  if (!stripe) {
    // No Stripe configured — nothing to verify.
    return res.status(200).json({ received: true });
  }

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (userId && planId) {
      setPlan(Number(userId), planId, {
        stripeCustomerId: session.customer,
        currentPeriodEnd: new Date((session.subscription ? Date.now() / 1000 : 0) * 1000).toISOString(),
      });
      console.log(`[billing] Stripe checkout completed: user #${userId} -> ${planId}`);
    }
  }

  res.json({ received: true });
});

export default router;
