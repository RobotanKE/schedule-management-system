import React, { useState, useEffect } from "react";
import "./AddEditDeleteEntity.css";
import { useNavigate } from "react-router-dom";

// API base URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const AddEditDeleteEntity = () => {
    const [type, setType] = useState("specialist"); // 'specialist' or 'client'
    const [formData, setFormData] = useState({
        name: "",
        surname: "",
        lastname: "",
        post: "",
        department: "",
        birthday: "",
        esrn: "",
    });
    const [allEntities, setAllEntities] = useState([]);
    const [entities, setEntities] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    // ============ UTILITY FUNCTIONS ============

    /**
     * Debounce function to limit API calls
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     */
    function debounce(func, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
    }

    // Clear form data
    const clearForm = () => {
        setFormData({
            name: "",
            surname: "",
            lastname: "",
            post: "",
            department: "",
            birthday: "",
            esrn: "",
        });
        setSelectedId(null);
    };

    // Format birthday from DD.MM.YYYY to YYYY-MM-DD
    const formatBirthdayForAPI = (birthday) => {
        if (!birthday) return null;
        const [day, month, year] = birthday.split(".");
        if (day && month && year) {
            return `${year}-${month}-${day}`;
        }
        return birthday;
    };

    // Format birthday from API (YYYY-MM-DD) to DD.MM.YYYY for display
    const formatBirthdayForDisplay = (birthday) => {
        if (!birthday) return "";
        const parts = birthday.split("T");
        if (parts.length === 2) {
            const [year, month, day] = parts[0].split("-");
            if (day && month && year) {
                return `${day}.${month}.${year}`;
            }
        }
        return birthday;
    };

    // ============ DATA FETCHING ============

    const fetchEntities = async () => {
        const url = type === "specialist" ? "/specialists" : "/clients";

        try {
            const response = await fetch(`${API_URL}${url}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (Array.isArray(data)) {
                setAllEntities(data);
                if (searchTerm) {
                    const filtered = data.filter(
                        (entity) =>
                            (entity.name?.toLowerCase().includes(searchTerm)) ||
                            (entity.surname?.toLowerCase().includes(searchTerm))
                    );
                    setEntities(filtered);
                } else {
                    setEntities(data);
                }
            } else {
                setAllEntities([]);
                setEntities([]);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    const fetchByEsrn = async (esrn) => {
        try {
            const response = await fetch(`${API_URL}/timeWeek/search?esrn=${esrn}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setEntities(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("ESRN search error:", error);
        }
    };

    // Load entities when type or search term changes
    useEffect(() => {
        fetchEntities();
    }, [type, searchTerm]);

    // ============ CRUD HANDLERS ============

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSearchChange = (e) => {
        const value = e.target.value.trim().toLowerCase();
        setSearchTerm(value);

        if (type === "client" && /^\d+$/.test(value)) {
            fetchByEsrn(value);
        } else {
            const filtered = allEntities.filter(
                (entity) =>
                    (entity.name?.toLowerCase().includes(value)) ||
                    (entity.surname?.toLowerCase().includes(value))
            );
            setEntities(filtered);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();

        const updatedFormData = { ...formData };
        if (updatedFormData.birthday) {
            updatedFormData.birthday = formatBirthdayForAPI(updatedFormData.birthday);
        }

        const url = type === "specialist" ? "/specialists" : "/clients";

        const response = await fetch(`${API_URL}${url}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedFormData),
        });

        if (response.ok) {
            alert("Record added successfully");
            fetchEntities();
            clearForm();
        } else {
            alert("Error adding record");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();

        const updatedFormData = { ...formData };
        if (updatedFormData.birthday) {
            updatedFormData.birthday = formatBirthdayForAPI(updatedFormData.birthday);
        }

        const url = `/${type}s/${selectedId}`;

        const response = await fetch(`${API_URL}${url}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedFormData),
        });

        if (response.ok) {
            alert("Record updated successfully");
            fetchEntities();
            closeModal();
        } else {
            alert("Error updating record");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;

        const url = `/${type}s/${id}`;
        const response = await fetch(`${API_URL}${url}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
            alert("Record deleted successfully");
            fetchEntities();
        } else {
            alert("Error deleting record");
        }
    };

    // ============ MODAL HANDLERS ============

    const openModal = async (entity) => {
        try {
            const endpoint = type === "specialist" ? "timeWeek/spec" : "timeWeek/client_one";
            const response = await fetch(`${API_URL}/${endpoint}/${entity.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (data.birthday) {
                data.birthday = formatBirthdayForDisplay(data.birthday);
            }

            setFormData(data);
            setSelectedId(entity.id);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Error loading data for editing:", error);
            alert("Failed to load record details");
        }
    };

    const closeModal = () => {
        clearForm();
        setIsModalOpen(false);
    };

    // ============ RENDER ============

    return (
        <div className="entity-container">
            {/* Toggle and navigation buttons */}
            <div className="entity-toggle">
                <button
                    className={type === "specialist" ? "active" : ""}
                    onClick={() => setType("specialist")}
                >
                    Specialists
                </button>
                <button
                    className={type === "client" ? "active" : ""}
                    onClick={() => setType("client")}
                >
                    Clients
                </button>
                <button onClick={() => navigate(-1)}>Back</button>
            </div>

            {/* Add record form */}
            <div className="add-record-container">
                <h2>Add {type === "specialist" ? "Specialist" : "Client"}</h2>
                <form onSubmit={handleAdd}>
                    <input
                        type="text"
                        name="name"
                        placeholder="First Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                    />
                    <input
                        type="text"
                        name="surname"
                        placeholder="Last Name"
                        value={formData.surname}
                        onChange={handleInputChange}
                        required
                    />
                    <input
                        type="text"
                        name="lastname"
                        placeholder="Patronymic"
                        value={formData.lastname}
                        onChange={handleInputChange}
                    />
                    {type === "specialist" && (
                        <>
                            <input
                                type="text"
                                name="post"
                                placeholder="Specialization"
                                value={formData.post}
                                onChange={handleInputChange}
                            />
                            <input
                                type="text"
                                name="department"
                                placeholder="Department"
                                value={formData.department}
                                onChange={handleInputChange}
                            />
                        </>
                    )}
                    {type === "client" && (
                        <>
                            <input
                                type="text"
                                name="birthday"
                                placeholder="Date of Birth (DD.MM.YYYY)"
                                value={formData.birthday}
                                onChange={handleInputChange}
                            />
                            <input
                                type="text"
                                name="esrn"
                                placeholder="Individual Number (ESRN)"
                                value={formData.esrn}
                                onChange={handleInputChange}
                            />
                        </>
                    )}
                    <button type="submit">Add</button>
                </form>
            </div>

            {/* Records list with search */}
            <div className="record-list-container">
                <h2>List of {type === "specialist" ? "Specialists" : "Clients"}</h2>

                <input
                    type="text"
                    placeholder="Search by name, surname or ESRN..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                />

                <div className="entity-list">
                    {entities.map((entity) => (
                        <div key={entity.id} className="entity-item">
                            <span>
                                {entity.name} {entity.surname}
                                {entity.post && ` (${entity.post})`}
                                {entity.esrn && ` - ${entity.esrn}`}
                            </span>
                            <div className="entity-actions">
                                <button onClick={() => openModal(entity)}>✏️ Edit</button>
                                <button onClick={() => handleDelete(entity.id)}>🗑️ Delete</button>
                            </div>
                        </div>
                    ))}
                    {entities.length === 0 && (
                        <div className="no-results">No records found</div>
                    )}
                </div>
            </div>

            {/* Edit modal */}
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Edit Record</h3>
                        <form onSubmit={handleUpdate}>
                            <input
                                type="text"
                                name="name"
                                placeholder="First Name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                            <input
                                type="text"
                                name="surname"
                                placeholder="Last Name"
                                value={formData.surname}
                                onChange={handleInputChange}
                                required
                            />
                            <input
                                type="text"
                                name="lastname"
                                placeholder="Patronymic"
                                value={formData.lastname}
                                onChange={handleInputChange}
                            />
                            {type === "specialist" && (
                                <>
                                    <input
                                        type="text"
                                        name="post"
                                        placeholder="Specialization"
                                        value={formData.post}
                                        onChange={handleInputChange}
                                    />
                                    <input
                                        type="text"
                                        name="department"
                                        placeholder="Department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                    />
                                </>
                            )}
                            {type === "client" && (
                                <>
                                    <input
                                        type="text"
                                        name="birthday"
                                        placeholder="Date of Birth (DD.MM.YYYY)"
                                        value={formData.birthday}
                                        onChange={handleInputChange}
                                    />
                                    <input
                                        type="text"
                                        name="esrn"
                                        placeholder="Individual Number (ESRN)"
                                        value={formData.esrn}
                                        onChange={handleInputChange}
                                    />
                                </>
                            )}
                            <div className="modal-buttons">
                                <button type="submit">Save Changes</button>
                                <button type="button" onClick={closeModal} className="cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddEditDeleteEntity;