import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Soc.css";

/**
 * Social Order Component
 * Displays days of the week for social workers schedule
 * Each day links to the detailed schedule view with pre-calculated date
 */
const SocialOrder = () => {
    const navigate = useNavigate();

    // Week days configuration
    const daysOfWeek = [
        { id: "monday", name: "Monday" },
        { id: "tuesday", name: "Tuesday" },
        { id: "wednesday", name: "Wednesday" },
        { id: "thursday", name: "Thursday" },
        { id: "friday", name: "Friday" }
    ];

    /**
     * Get the current date for the selected day of week
     * @param {string} dayId - Day identifier (monday, tuesday, etc.)
     * @returns {string} Formatted date in DD.MM.YYYY
     */
    const getDateForDay = (dayId) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const dayMap = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5
        };

        const targetDay = dayMap[dayId];
        const diff = targetDay - currentDay;

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);

        // Format as DD.MM.YYYY
        const day = String(targetDate.getDate()).padStart(2, '0');
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const year = targetDate.getFullYear();

        return `${day}.${month}.${year}`;
    };

    return (
        <div className="home-container">
            <h1 className="home-title">Social Workers Schedule</h1>
            <div className="home-links">
                {daysOfWeek.map(day => (
                    <Link
                        key={day.id}
                        to={`/social/day/${day.id}?date=${getDateForDay(day.id)}`}
                        className="home-link"
                    >
                        {day.name} ({getDateForDay(day.id)})
                    </Link>
                ))}
                <button className="exit-link" onClick={() => navigate(-1)}>Back</button>
            </div>
        </div>
    );
};

export default SocialOrder;