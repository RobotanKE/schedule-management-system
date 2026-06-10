import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./SV.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ScheduleViewSpecialist = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();

    // API base URL - change if needed
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    // State declarations
    const [clientName, setClientName] = useState("");
    const [client, setClient] = useState(null);
    const [specialists, setSpecialists] = useState([]);
    const [filteredSpecialists, setFilteredSpecialists] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isModalEditOpen, setIsModalEditOpen] = useState(false);
    const [scheduleByDay, setScheduleByDay] = useState({
        Понедельник: [],
        Вторник: [],
        Среда: [],
        Четверг: [],
        Пятница: [],
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDrop, setCurrentDrop] = useState(null);
    const [draggedSpecialist, setDraggedSpecialist] = useState(null);
    const [loading, setLoading] = useState(true);
    const userRole = localStorage.getItem("role");

    // Day mapping for normalization
    const mapDayToNumber = {
        Понедельник: 1,
        Вторник: 2,
        Среда: 3,
        Четверг: 4,
        Пятница: 5,
    };

    // Normalize schedule data from API
    const normalizeSchedule = (rawSchedule) => {
        if (!Array.isArray(rawSchedule)) return [];

        return rawSchedule.map((item) => {
            const normalizedDay = Object.keys(mapDayToNumber).find(
                (key) => key === item.day_of_week
            );

            return {
                ...item,
                id: item.id,
                day_of_week: normalizedDay || item.day_of_week,
                start_time: item.t_start,
                end_time: item.t_end,
                specialist_id: item.sid,
                client_id: clientId,
            };
        });
    };

    // Group schedule by day of week
    const groupScheduleByDay = (scheduleData) => {
        const grouped = {
            Понедельник: [],
            Вторник: [],
            Среда: [],
            Четверг: [],
            Пятница: [],
        };

        scheduleData.forEach((entry) => {
            if (entry.day_of_week in grouped) {
                grouped[entry.day_of_week].push(entry);
            }
        });

        // Sort by start time
        Object.keys(grouped).forEach((day) => {
            grouped[day].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
        });

        return grouped;
    };

    // Format birthday from ISO to DD.MM.YYYY
    const formatBirthday = (birthday) => {
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

    // Format time (remove seconds)
    const formatTime = (time) => {
        if (!time) return "";
        const parts = time.split(":");
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
    };

    // Load client data
    const fetchClientData = async (token) => {
        try {
            const response = await fetch(`${API_URL}/timeWeek/client_one/${clientId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            setClientName(`${data.surname} ${data.name}`);
            setClient(data);
        } catch (error) {
            console.error("Error loading client data:", error);
        }
    };

    // Load specialists list
    const fetchSpecialists = async (token) => {
        try {
            const response = await fetch(`${API_URL}/specialists`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            setSpecialists(data);
            setFilteredSpecialists(data);
        } catch (error) {
            console.error("Error loading specialists:", error);
        }
    };

    // Load schedule for this client
    const fetchSchedule = async (token) => {
        try {
            const response = await fetch(`${API_URL}/timeWeek/cl/${clientId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error("Failed to load schedule");

            const rawData = await response.json();
            const normalizedData = normalizeSchedule(rawData);
            setSchedule(normalizedData);
            setScheduleByDay(groupScheduleByDay(normalizedData));
        } catch (error) {
            console.error("Error loading schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial data load
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (clientId && token) {
            fetchClientData(token);
            fetchSpecialists(token);
            fetchSchedule(token);
        }
    }, [clientId]);

    // Filter specialists by search query
    useEffect(() => {
        setFilteredSpecialists(
            specialists.filter(
                (specialist) =>
                    specialist.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    specialist.surname?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [searchQuery, specialists]);

    // Delete schedule entry
    const handleDeleteSchedule = async (id) => {
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${API_URL}/timeWeek/dropTime/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                setSchedule((prevSchedule) => {
                    const updatedSchedule = prevSchedule.filter((entry) => entry.id !== id);
                    setScheduleByDay(groupScheduleByDay(updatedSchedule));
                    return updatedSchedule;
                });
            } else {
                const errorData = await response.json();
                console.error("Error deleting schedule:", errorData.message);
            }
        } catch (error) {
            console.error("Delete request error:", error);
        }
    };

    // Drag & drop handlers
    const handleDragStart = (specialist) => {
        setDraggedSpecialist(specialist);
    };

    const handleDrop = (day) => {
        if (draggedSpecialist) {
            setCurrentDrop({ day, specialist: draggedSpecialist });
            setIsModalOpen(true);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Save new schedule entry
    const handleSave = async (startTime, endTime) => {
        if (!currentDrop) {
            console.error("currentDrop is undefined");
            alert("Error: No specialist selected");
            setIsModalOpen(false);
            return;
        }

        const { day, specialist } = currentDrop;

        if (!specialist) {
            console.error("specialist is undefined in currentDrop", currentDrop);
            alert("Error: Specialist not found");
            setIsModalOpen(false);
            return;
        }

        const token = localStorage.getItem("token");
        const newEntry = {
            client_id: clientId,
            spec_id: specialist.id,
            day_of_week: day,
            t_start: startTime,
            t_end: endTime,
        };

        try {
            const response = await fetch(`${API_URL}/timeWeek/schedule`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newEntry),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save schedule");
            }

            // Refresh schedule after successful save
            await fetchSchedule(token);
        } catch (error) {
            console.error("Error saving schedule:", error);
            alert("Error saving: " + error.message);
        } finally {
            setIsModalOpen(false);
            setDraggedSpecialist(null);
            setCurrentDrop(null);
        }
    };

    // Export schedule as PDF
    const saveScheduleAsPDF = () => {
        const element = document.getElementById("schedule-containers");
        if (!element) {
            alert("Error: Schedule container not found");
            return;
        }

        html2canvas(element, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("landscape", "mm", "a4");

            const imgWidth = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const scale = Math.min(pageWidth / imgWidth, 1);
            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;

            pdf.addImage(imgData, "PNG", 10, 10, scaledWidth, scaledHeight);
            pdf.save(`Schedule_${clientName || "client"}.pdf`);
        }).catch((error) => {
            console.error("PDF generation error:", error);
            alert("Failed to generate PDF");
        });
    };

    // Edit modal handlers
    const openEditModal = (entry) => {
        setSelectedEntry(entry);
        setIsModalEditOpen(true);
    };

    const closeModal = () => {
        setIsModalEditOpen(false);
        setSelectedEntry(null);
    };

    // Edit modal component for deletion
    const EditModal = ({ entry, onClose }) => {
        const [selectedSpecialist, setSelectedSpecialist] = useState(null);

        const handleDelete = async () => {
            if (!selectedSpecialist) {
                alert("Please select a specialist to delete");
                return;
            }

            try {
                const response = await fetch(`${API_URL}/timeWeek/dropTime/${entry.id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error("Failed to delete schedule");

                // Update local state
                const updatedSchedule = schedule.filter((item) => item.id !== entry.id);
                setSchedule(updatedSchedule);
                setScheduleByDay(groupScheduleByDay(updatedSchedule));
                onClose();
            } catch (error) {
                console.error("Error deleting schedule:", error);
                alert("Error deleting schedule");
            }
        };

        return (
            <div className="modalc">
                <div className="modal-contentc">
                    <h3>Delete Schedule Entry</h3>
                    <select onChange={(e) => setSelectedSpecialist(JSON.parse(e.target.value))}>
                        <option value="">Select specialist</option>
                        <option key={entry.id} value={JSON.stringify({ id: entry.id })}>
                            {entry.ssurname} {entry.sname}
                        </option>
                    </select>
                    <br />
                    <button onClick={handleDelete}>Delete</button>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        );
    };

    // Time selection modal
    const Modal = ({ isOpen, onClose, onSave }) => {
        const [startTime, setStartTime] = useState("");
        const [endTime, setEndTime] = useState("");

        if (!isOpen) return null;

        const handleSave = () => {
            if (!startTime || !endTime) {
                alert("Please enter both start and end time");
                return;
            }
            onSave(startTime, endTime);
            setStartTime("");
            setEndTime("");
        };

        return (
            <div className="modals">
                <div className="modal-contents">
                    <h2>Schedule Session</h2>
                    <label>
                        Start Time:
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </label>
                    <label>
                        End Time:
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </label>
                    <div className="modal-actionss">
                        <button onClick={handleSave}>Save</button>
                        <button onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading schedule...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="header-svs">
                <h2>
                    Client: {clientName} {client?.lastname || ""}
                    <br />
                    Date of birth: {formatBirthday(client?.birthday)}
                </h2>
                <div className="but-mar">
                    <button onClick={saveScheduleAsPDF}>Save as PDF</button>
                    <button onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>

            <div className="block-schedules">
                {userRole === "editor" && (
                    <div className="clients-headers">
                        <h3>Specialists List</h3>
                        <div className="clientss">
                            <input
                                type="text"
                                placeholder="Search specialist"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="client-lists">
                            {filteredSpecialists.map((specialist) => (
                                <div
                                    key={specialist.id}
                                    draggable
                                    onDragStart={() => handleDragStart(specialist)}
                                    className="client-items"
                                >
                                    {specialist.name} {specialist.surname}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="schedule-containers" id="schedule-containers">
                    {Object.keys(scheduleByDay).map((day) => (
                        <div
                            key={day}
                            className={userRole === "editor" ? "schedule-blocks" : "schedule-blocks-viewer"}
                            onDrop={() => handleDrop(day)}
                            onDragOver={handleDragOver}
                        >
                            <h4>{day}</h4>
                            {scheduleByDay[day]?.length === 0 ? (
                                <p>No entries</p>
                            ) : (
                                scheduleByDay[day]?.map((entry) => (
                                    <div
                                        key={`${entry.id}-${entry.day_of_week}`}
                                        className={userRole === "editor" ? "schedule-items" : "schedule-items-vw"}
                                    >
                                        <div className="edit-but">
                                            {userRole === "editor" && (
                                                <button onClick={() => openEditModal(entry)}>✕</button>
                                            )}
                                        </div>
                                        <b>Time:</b> {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                                        <br />
                                        <b>Specialist:</b> {entry.sname} {entry.ssurname}
                                    </div>
                                ))
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isModalEditOpen && selectedEntry && (
                <EditModal entry={selectedEntry} onClose={closeModal} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
};

export default ScheduleViewSpecialist;