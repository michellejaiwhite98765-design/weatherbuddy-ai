// Premium AI chat companion. Lets the user ask questions ("what to wear?",
// "is it raining?", "good time for a walk?") and gets a live, data-aware reply.
import { useState } from "react";
import { useDispatch } from "react-redux";
import { RobotOutlined, SendOutlined, LoadingOutlined } from "@ant-design/icons";
import { sendAIChat } from "../store/weatherSlice";

export default function AICompanion({ city }) {
  const dispatch = useDispatch();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");

  const send = async () => {
    const text = input.trim();
    if (!text || status === "loading") return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text, engine: null }]);
    setStatus("loading");
    try {
      const { reply, engine } = await dispatch(sendAIChat({ message: text, city })).unwrap();
      setMessages((m) => [...m, { role: "assistant", text: reply, engine }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: e?.response?.data?.error || "Sorry — I couldn't reach the AI right now.", engine: null },
      ]);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: 20, padding: 20 }}>
      <div className="row" style={{ gap: 8 }}>
        <span
          style={{
            width: 30,
            height: 30,
            display: "grid",
            placeItems: "center",
            borderRadius: 10,
            background: "var(--gradient-accent)",
          }}
        >
          <RobotOutlined style={{ fontSize: 14 }} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>AI COMPANION</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>Ask about the weather, plans or what to wear</div>
        </div>
      </div>

      <div style={{ marginTop: 14, maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 ? (
          <div
            style={{
              fontSize: 12.5,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              padding: "18px 10px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            Try “Should I carry an umbrella today?” or “What should I wear?”
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className="row"
              style={{
                gap: 8,
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
              }}
            >
              {m.role === "assistant" ? (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "rgba(124,58,237,0.3)",
                  }}
                >
                  🤖
                </span>
              ) : null}
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 14,
                  fontSize: 12.8,
                  lineHeight: 1.45,
                  background: m.role === "user" ? "var(--gradient-accent)" : "rgba(255,255,255,0.08)",
                  borderTopRightRadius: m.role === "user" ? 4 : 14,
                  borderTopLeftRadius: m.role === "assistant" ? 4 : 14,
                }}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything…"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "11px 14px",
            color: "inherit",
            fontSize: 13.5,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={status === "loading"}
          className="gradient-btn"
          style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer", color: "white", border: "none", fontSize: 15 }}
          aria-label="Send"
        >
          {status === "loading" ? <LoadingOutlined /> : <SendOutlined />}
        </button>
      </div>
    </div>
  );
}