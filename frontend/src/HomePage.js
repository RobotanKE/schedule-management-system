import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

/**
 * Home page component
 * Serves as the main dashboard after login
 * Shows different options based on user role
 */
const HomePage = () => {
    const userRole = localStorage.getItem("role");

    return (
        <div className="home-container">
            <h1 className="home-title">Welcome to Schedule Management System</h1>
            <p className="home-subtitle">
                Select an action to get started:
            </p>
            <div className="home-links">
                <Link to="/schedule" className="home-link">
                    Go to Schedule
                </Link>
                <Link to="/social" className="home-link">
                    Go to Social Workers Schedule
                </Link>
                {userRole === "editor" && (
                    <Link to="/add" className="home-link">
                        Edit Data
                    </Link>
                )}
            </div>
        </div>
    );
};

export default HomePage;