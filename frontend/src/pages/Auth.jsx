import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Input, Button, Form, message } from "antd";
import { UserOutlined, MailOutlined, LockOutlined, CloudOutlined } from "@ant-design/icons";
import { login, signup } from "../store/authSlice";

export default function Auth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((s) => s.auth);
  const [mode, setMode] = useState("login"); // login | signup
  const loading = status === "loading";

  const onFinish = async (values) => {
    const action = mode === "login" ? login : signup;
    const result = await dispatch(action(values));
    if (result.meta.requestStatus === "fulfilled") {
      message.success(mode === "login" ? "Welcome back!" : "Account created 🎉");
      navigate("/");
    } else {
      message.error(result.payload || "Something went wrong");
    }
  };

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <span
          className="sparkle-icon"
          style={{
            width: 64,
            height: 64,
            display: "grid",
            placeItems: "center",
            margin: "0 auto",
            borderRadius: 20,
            background: "var(--gradient-accent)",
            fontSize: 30,
          }}
        >
          <CloudOutlined />
        </span>
        <h1 style={{ fontSize: 26, marginTop: 16 }}>WeatherBuddy AI</h1>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
          {mode === "login" ? "Sign in to see your forecast" : "Create your free account"}
        </p>
      </div>

      <div className="glass-card" style={{ marginTop: 26, padding: 22 }}>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          {mode === "signup" && (
            <Form.Item name="name" rules={[{ required: true, message: "Enter your name" }]}>
              <Input size="large" placeholder="Full name" prefix={<UserOutlined style={{ color: "var(--text-tertiary)" }} />} />
            </Form.Item>
          )}
          <Form.Item name="email" rules={[{ required: true, message: "Enter your email" }, { type: "email", message: "Enter a valid email" }]}>
            <Input size="large" placeholder="Email address" prefix={<MailOutlined style={{ color: "var(--text-tertiary)" }} />} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "Enter your password" }, { min: 6, message: "At least 6 characters" }]}>
            <Input.Password size="large" placeholder="Password" prefix={<LockOutlined style={{ color: "var(--text-tertiary)" }} />} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ borderRadius: 14, height: 48, fontWeight: 700 }}
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </Form>

        <p className="text-secondary" style={{ fontSize: 12.5, textAlign: "center", marginTop: 18 }}>
          {mode === "login" ? "New to WeatherBuddy?" : "Already have an account?"}{" "}
          <span
            style={{ color: "var(--sky-blue)", fontWeight: 700, cursor: "pointer" }}
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </span>
        </p>
      </div>

      <p className="text-tertiary" style={{ fontSize: 11, textAlign: "center", marginTop: 18 }}>
        Premium features unlock with a subscription — your forecast works free.
      </p>
    </div>
  );
}
