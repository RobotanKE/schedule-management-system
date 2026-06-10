import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./loginCSS.css";

/**
 * Login component
 * Handles user authentication and stores JWT token
 */
const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    // API base URL - configurable via environment variable
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    /**
     * Decode JWT token payload
     * @param {string} token - JWT token
     * @returns {object|null} Decoded payload or null on error
     */
    const decodeToken = (token) => {
        try {
            const payload = token.split(".")[1];
            return JSON.parse(atob(payload));
        } catch (error) {
            console.error("Token decoding error:", error);
            return null;
        }
    };

    /**
     * Handle login form submission
     * Sends credentials to backend and stores token on success
     */
    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            alert("Please enter both username and password");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                const decodedToken = decodeToken(data.token);

                if (decodedToken) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("role", decodedToken.role);
                    navigate("/home");
                } else {
                    alert("Error processing authentication token");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.message || "Invalid username or password");
            }
        } catch (error) {
            console.error("Login request error:", error);
            alert("Network error. Please check if server is running.");
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <div className="login-container">
            <h2>Login to System</h2>

            <div className="input-container">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                />
            </div>

            <div className="input-container">
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
            </div>

            <button className="button-lg" onClick={handleLogin}>
                Sign In
            </button>
        </div>
    );
};

export default Login;