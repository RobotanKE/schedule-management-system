import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Schedule.css";

/**
 * Schedule selection component
 * Allows user to search for specialists or clients and navigate to their schedule
 */
const Schedule = () => {
    const [specialists, setSpecialists] = useState([]);
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredEntities, setFilteredEntities] = useState([]);
    const [entityType, setEntityType] = useState("specialist");
    const [isClicked, setIsClicked] = useState(false);
    const navigate = useNavigate();

    // API base URL
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    // Load specialists and clients on mount
    useEffect(() => {
        const fetchSpecialists = async () => {
            try {
                const response = await fetch(`${API_URL}/specialists`);
                const data = await response.json();
                setSpecialists(data);
            } catch (error) {
                console.error("Error loading specialists:", error);
            }
        };

        const fetchClients = async () => {
            try {
                const response = await fetch(`${API_URL}/clients`);
                const data = await response.json();
                setClients(data);
            } catch (error) {
                console.error("Error loading clients:", error);
            }
        };

        fetchSpecialists();
        fetchClients();
    }, [API_URL]);

    /**
     * Search client by ESRN number
     * @param {string} esrn - ESRN number to search
     */
    const fetchByEsrn = async (esrn) => {
        try {
            const response = await fetch(`${API_URL}/timeWeek/search?esrn=${esrn}`);
            const data = await response.json();
            setFilteredEntities(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("ESRN search error:", error);
        }
    };

    // Filter entities based on search term and entity type
    useEffect(() => {
        if (entityType === "client" && /^\d+$/.test(searchTerm)) {
            // If searching client by numeric ESRN
            fetchByEsrn(searchTerm);
        } else {
            // Local search by name and surname
            const entities = entityType === "specialist" ? specialists : clients;
            const filtered = entities.filter((entity) => {
                const fullName = `${entity.name} ${entity.surname}`.toLowerCase();
                return fullName.includes(searchTerm.toLowerCase());
            });
            setFilteredEntities(filtered);
        }
    }, [searchTerm, entityType, specialists, clients]);

    // Handle entity type toggle (specialist / client)
    const handleEntityTypeChange = (e) => {
        setEntityType(e.target.value);
        setSearchTerm(""); // Reset search when switching
    };

    // Toggle click state for visual effect
    const handleClick = () => {
        setIsClicked(!isClicked);
    };

    // Navigate to schedule view on double click
    const handleEntityDoubleClick = (entityId) => {
        const route = entityType === "specialist"
            ? `/timeWeek/specialist/${entityId}`
            : `/timeWeek/client/${entityId}`;
        navigate(route);
    };

    // Format display name: "Surname N. N."
    const formatDisplayName = (entity) => {
        const nameInitial = entity.name ? entity.name[0] : "";
        const lastnameInitial = entity.lastname ? entity.lastname[0] : "";
        return `${entity.surname} ${nameInitial}. ${lastnameInitial}.`;
    };

    return (
        <div className="schedule-container">
            <header className="schedule-header">
                <h1>Schedule Search</h1>
            </header>

            <div className="schedule-filters">
                <div className="filter-group">
                    <label>
                        <input
                            type="radio"
                            value="specialist"
                            checked={entityType === "specialist"}
                            onChange={handleEntityTypeChange}
                        />
                        Specialist Schedule
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="client"
                            checked={entityType === "client"}
                            onChange={handleEntityTypeChange}
                        />
                        Client Schedule
                    </label>
                </div>

                <input
                    className="filter-input"
                    type="text"
                    placeholder="Enter name, surname or ESRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="entity-lists">
                    {filteredEntities.map((entity) => (
                        <div
                            key={entity.id}
                            className={`entity-item ${isClicked ? "clicked" : ""}`}
                            onDoubleClick={() => handleEntityDoubleClick(entity.id)}
                        >
                            {formatDisplayName(entity)}
                        </div>
                    ))}
                    {filteredEntities.length === 0 && searchTerm && (
                        <div className="no-results">No results found</div>
                    )}
                </div>
            </div>
            <button onClick={() => navigate(-1)} className="back-button">
                Back
            </button>
        </div>
    );
};

export default Schedule;