// Example component demonstrating Firebase Auth usage.
// Copy/adapt this into your actual login page.

import { useState, useEffect } from "react";
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  onAuthChange,
} from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AuthExample() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onAuthChange((u) => setUser(u));
  }, []);

  async function handleEmailLogin() {
    setLoading(true);
    setError("");
    try {
      const { idToken } = await loginWithEmail(email, password);
      // Send token to backend for verification
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Backend login failed");
      const data = await res.json();
      console.log("Logged in:", data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRegister() {
    setLoading(true);
    setError("");
    try {
      const { idToken } = await registerWithEmail(email, password);
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Backend registration failed");
      const data = await res.json();
      console.log("Registered:", data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    try {
      const { idToken } = await loginWithGoogle();
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Backend login failed");
      const data = await res.json();
      console.log("Logged in with Google:", data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    }
  }

  // User is logged in — show profile
  if (user) {
    return (
      <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Welcome!</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>UID:</strong> {user.uid}</p>
        {user.photoURL && <img src={user.photoURL} alt="avatar" style={{ borderRadius: "50%", width: 48 }} />}
        <br /><br />
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  // Not logged in — show login form
  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Login / Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
      />

      <button onClick={handleEmailLogin} disabled={loading} style={{ marginRight: "0.5rem" }}>
        Login
      </button>
      <button onClick={handleEmailRegister} disabled={loading}>
        Register
      </button>

      <hr style={{ margin: "1rem 0" }} />

      <button onClick={handleGoogleLogin} disabled={loading}>
        Sign in with Google
      </button>
    </div>
  );
}
