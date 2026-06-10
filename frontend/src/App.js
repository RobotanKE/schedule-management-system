import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./loginJS/Login";
import Schedule from "./ChooseMonitor/Schedule";
import ScheduleView from "./ScheduleView/ScheduleView";
import AddEntity from "./AddHuman/AddEditDeleteEntity";
import HomePage from "./HomePage";
import ScheduleViewClient from "./ScheduleViewClient/ScheduleViewClient";
import SocialOrder from "./SocialOrder/SocialOrder";
import SocialDay from "./SocialDay/SocialDay";

/**
 * Main application component
 * Handles routing between all pages of the schedule management system
 */
const App = () => {
    return (
        <Router>
            <Routes>
                {/* Authentication */}
                <Route path="/" element={<Login />} />

                {/* Main navigation */}
                <Route path="/home" element={<HomePage />} />

                {/* Schedule management */}
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/timeWeek/specialist/:specId" element={<ScheduleView />} />
                <Route path="/timeWeek/client/:clientId" element={<ScheduleViewClient />} />

                {/* CRUD operations */}
                <Route path="/add" element={<AddEntity />} />

                {/* Social schedule */}
                <Route path="/social" element={<SocialOrder />} />
                <Route path="/social/day/:dayId" element={<SocialDay />} />
            </Routes>
        </Router>
    );
};

export default App;