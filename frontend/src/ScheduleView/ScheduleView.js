import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./SV.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";

// Constants
const WORKING_HOURS_START = "09:00";
const WORKING_HOURS_END = "18:00";
const WORKING_HOURS_END_FRIDAY = "17:00";
const LUNCH_START = "13:00";
const LUNCH_END = "13:48";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Day mapping
const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
const mapDayToNumber = {
    Понедельник: 1,
    Вторник: 2,
    Среда: 3,
    Четверг: 4,
    Пятница: 5,
};

const ScheduleView = () => {
    const { specId } = useParams();
    const navigate = useNavigate();

    // State declarations
    const [specialistName, setSpecialistName] = useState("");
    const [specialist, setSpecialist] = useState(null);
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [rawSchedule, setRawSchedule] = useState([]);
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
    const [draggedClient, setDraggedClient] = useState(null);
    const [loading, setLoading] = useState(true);

    const userRole = localStorage.getItem("role");

    // ============ UTILITY FUNCTIONS ============

    const parseTimeToMinutes = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    };

    const formatMinutesToTime = (minutes) => {
        const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
        const mins = String(minutes % 60).padStart(2, "0");
        return `${hours}:${mins}`;
    };

    const formatTime = (time) => {
        if (!time) return "";
        const parts = time.split(":");
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
    };

    // ============ FREE TIME BLOCKS CALCULATION ============

    const excludeLunch = (blocks) => {
        const lunchStart = parseTimeToMinutes(LUNCH_START);
        const lunchEnd = parseTimeToMinutes(LUNCH_END);
        const adjustedBlocks = [];

        const hasLunchBooking = blocks.some(block => {
            const blockStart = parseTimeToMinutes(block.t_start);
            const blockEnd = parseTimeToMinutes(block.t_end);
            return (blockEnd > lunchStart || blockStart < lunchEnd || (blockStart <= lunchStart && blockEnd >= lunchEnd));
        });

        if (hasLunchBooking) {
            return blocks.filter(block => parseTimeToMinutes(block.t_end) - parseTimeToMinutes(block.t_start) >= 30);
        }

        blocks.forEach(block => {
            const blockStart = parseTimeToMinutes(block.t_start);
            const blockEnd = parseTimeToMinutes(block.t_end);

            if (blockEnd <= lunchStart || blockStart >= lunchEnd) {
                if (blockEnd - blockStart >= 30) {
                    adjustedBlocks.push(block);
                }
            } else {
                if (blockStart < lunchStart && lunchStart - blockStart >= 30) {
                    adjustedBlocks.push({
                        t_start: block.t_start,
                        t_end: formatMinutesToTime(lunchStart)
                    });
                }
                if (blockEnd > lunchEnd && blockEnd - lunchEnd >= 30) {
                    adjustedBlocks.push({
                        t_start: formatMinutesToTime(lunchEnd),
                        t_end: block.t_end
                    });
                }
            }
        });

        return adjustedBlocks;
    };

    const getFreeTimeBlocks = (daySchedule) => {
        if (daySchedule.length === 0) {
            return excludeLunch([{ t_start: WORKING_HOURS_START, t_end: WORKING_HOURS_END }]);
        }

        const freeBlocks = [];
        let lastEndTime = parseTimeToMinutes(WORKING_HOURS_START);
        let currentDay = "";

        daySchedule.forEach((entry) => {
            const entryStartTime = parseTimeToMinutes(entry.start_time);
            const entryEndTime = parseTimeToMinutes(entry.end_time);

            if (entryStartTime - lastEndTime >= 30) {
                freeBlocks.push({
                    t_start: formatMinutesToTime(lastEndTime),
                    t_end: formatMinutesToTime(entryStartTime)
                });
            }
            currentDay = entry.day_of_week;
            lastEndTime = entryEndTime;
        });

        const workingHoursEnd = currentDay === "Пятница"
            ? parseTimeToMinutes(WORKING_HOURS_END_FRIDAY)
            : parseTimeToMinutes(WORKING_HOURS_END);

        if (workingHoursEnd - lastEndTime >= 30) {
            freeBlocks.push({
                t_start: formatMinutesToTime(lastEndTime),
                t_end: formatMinutesToTime(workingHoursEnd)
            });
        }

        return excludeLunch(freeBlocks);
    };

    const mergeAndSortSchedule = (daySchedule, freeTimeBlocks) => {
        const combinedBlocks = [
            ...daySchedule.map((entry) => ({
                ...entry,
                isFree: false,
                t_start: entry.start_time,
                t_end: entry.end_time
            })),
            ...freeTimeBlocks.map((block) => ({
                ...block,
                isFree: true
            }))
        ];

        return combinedBlocks.sort((a, b) => {
            return parseTimeToMinutes(a.t_start) - parseTimeToMinutes(b.t_start);
        });
    };

    // ============ DATA NORMALIZATION ============

    const normalizeSchedule = (rawData) => {
        return rawData.map((item) => {
            let dayOfWeek;

            if (Array.isArray(item.day_of_week)) {
                dayOfWeek = item.day_of_week[0];
            } else if (typeof item.day_of_week === "string") {
                dayOfWeek = item.day_of_week.trim();
            } else {
                console.error("Invalid day format:", item);
                return item;
            }

            const normalizedDay = DAYS.find(key => key === dayOfWeek);

            return {
                ...item,
                id: item.id,
                day_of_week: normalizedDay || dayOfWeek,
                start_time: item.t_start,
                end_time: item.t_end,
                client_id: item.client_id || item.cid,
                spec_id: specId,
                cname: item.cname,
                csurname: item.csurname,
            };
        });
    };

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

        Object.keys(grouped).forEach((day) => {
            grouped[day].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
        });

        return grouped;
    };

    const mergeScheduleEntries = (scheduleData) => {
        const merged = {};

        scheduleData.forEach((entry) => {
            const key = `${entry.day_of_week}-${entry.start_time}-${entry.end_time}`;

            if (!merged[key]) {
                merged[key] = {
                    id: entry.id,
                    day_of_week: entry.day_of_week,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    clients: [],
                };
            }

            merged[key].clients.push({
                id: entry.client_id,
                name: entry.cname,
                surname: entry.csurname,
                scheduleId: entry.id
            });
        });

        return Object.values(merged);
    };

    // ============ DATA FETCHING ============

    const loadAllData = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${API_URL}/timeWeek/specialist/${specId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error("Failed to load schedule");

            const rawData = await response.json();
            const normalizedData = normalizeSchedule(rawData);

            setRawSchedule(normalizedData);
            const mergedData = mergeScheduleEntries(normalizedData);
            setSchedule(mergedData);
            setScheduleByDay(groupScheduleByDay(mergedData));
        } catch (error) {
            console.error("Error loading schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        const fetchSpecialistInfo = async () => {
            try {
                const response = await fetch(`${API_URL}/timeWeek/spec/${specId}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });
                const data = await response.json();
                setSpecialist(data);
                setSpecialistName(`${data.surname} ${data.name}`);
            } catch (error) {
                console.error("Error loading specialist info:", error);
            }
        };

        const fetchClientsList = async () => {
            try {
                const response = await fetch(`${API_URL}/clients`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });
                const data = await response.json();
                setClients(data);
                setFilteredClients(data);
            } catch (error) {
                console.error("Error loading clients:", error);
            }
        };

        if (specId) {
            fetchSpecialistInfo();
            fetchClientsList();
            loadAllData();
        }
    }, [specId]);

    // Filter clients by search query
    useEffect(() => {
        setFilteredClients(
            clients.filter(
                (client) =>
                    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    client.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    client.esrn?.includes(searchQuery)
            )
        );
    }, [searchQuery, clients]);

    // ============ DRAG & DROP HANDLERS ============

    const handleDragStart = (client) => {
        setDraggedClient(client);
    };

    const handleDrop = (day) => {
        if (draggedClient) {
            setCurrentDrop({ day, client: draggedClient });
            setIsModalOpen(true);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // ============ SCHEDULE OPERATIONS ============

    const handleSave = async (startTime, endTime) => {
        if (!currentDrop) return;

        const { day, client } = currentDrop;
        const token = localStorage.getItem("token");

        const newEntry = {
            client_id: client.id,
            spec_id: parseInt(specId, 10),
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

            await loadAllData();
        } catch (error) {
            console.error("Error saving schedule:", error);
            alert("Error saving: " + error.message);
        } finally {
            setIsModalOpen(false);
            setDraggedClient(null);
            setCurrentDrop(null);
        }
    };

    const handleChangeTimeSelected = async (entry, selectedClients, newStartTime, newEndTime, newDay) => {
        const token = localStorage.getItem("token");

        if (selectedClients.length === 0) {
            alert("Please select at least one client to move");
            return;
        }

        const slotEntries = rawSchedule.filter(item =>
            item.day_of_week === entry.day_of_week &&
            item.start_time === entry.start_time &&
            item.end_time === entry.end_time &&
            selectedClients.some(client => client.id === (item.client_id || item.cid))
        );

        if (slotEntries.length === 0) {
            alert("Schedule entries not found");
            return;
        }

        try {
            // Delete selected entries
            for (const slotEntry of slotEntries) {
                const deleteResponse = await fetch(`${API_URL}/timeWeek/dropTime/${slotEntry.id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!deleteResponse.ok) {
                    throw new Error(`Failed to delete entry ${slotEntry.id}`);
                }
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Create new entries
            let successCount = 0;

            for (const slotEntry of slotEntries) {
                const clientId = slotEntry.client_id || slotEntry.cid;

                const newEntry = {
                    client_id: clientId,
                    spec_id: parseInt(specId, 10),
                    day_of_week: newDay,
                    t_start: newStartTime,
                    t_end: newEndTime,
                };

                const createResponse = await fetch(`${API_URL}/timeWeek/schedule`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(newEntry),
                });

                if (!createResponse.ok) {
                    const errorData = await createResponse.json();
                    throw new Error(errorData.message || "Failed to create new entry");
                }

                successCount++;
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            await loadAllData();
            alert(`Successfully moved ${successCount} client(s) to ${newDay} ${newStartTime}-${newEndTime}`);

        } catch (error) {
            console.error("Error moving schedule:", error);
            alert("Error moving schedule: " + error.message);
            await loadAllData();
        }
    };

    // ============ PDF EXPORT ============

    const saveScheduleAsPDF = () => {
        const element = document.getElementById("schedule-containerc");
        if (!element) {
            alert("Error: Schedule container not found");
            return;
        }

        html2canvas(element, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("landscape", "mm", "a4");

            const imgWidth = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const scaleX = pdf.internal.pageSize.getWidth() / imgWidth;
            const scaleY = pdf.internal.pageSize.getHeight() / imgHeight;
            const scale = Math.min(scaleX, scaleY);
            const scaledHeight = imgHeight * scale;

            pdf.addImage(imgData, "PNG", 1, 5, imgWidth, scaledHeight);
            pdf.save(`Schedule_${specialistName}.pdf`);
        }).catch((error) => {
            console.error("PDF generation error:", error);
            alert("Failed to generate PDF");
        });
    };

    // ============ MODAL HANDLERS ============

    const openEditModal = (entry) => {
        setSelectedEntry(entry);
        setIsModalEditOpen(true);
    };

    const closeModal = () => {
        setIsModalEditOpen(false);
        setSelectedEntry(null);
    };

    // ============ EDIT MODAL COMPONENT ============

    const EditModal = ({ entry, onClose }) => {
        const [selectedClient, setSelectedClient] = useState(null);
        const [selectedClientsForMove, setSelectedClientsForMove] = useState([]);
        const [isChangeTimeModalOpen, setIsChangeTimeModalOpen] = useState(false);
        const [newStartTime, setNewStartTime] = useState(entry.start_time);
        const [newEndTime, setNewEndTime] = useState(entry.end_time);
        const [selectedDay, setSelectedDay] = useState(entry.day_of_week);

        const handleDeleteClient = async () => {
            if (!selectedClient) {
                alert("Please select a client to delete");
                return;
            }

            const token = localStorage.getItem("token");
            const slotEntry = rawSchedule.find(item =>
                item.day_of_week === entry.day_of_week &&
                item.start_time === entry.start_time &&
                item.end_time === entry.end_time &&
                (item.client_id === selectedClient.id || item.cid === selectedClient.id)
            );

            if (!slotEntry) {
                alert("Entry not found");
                return;
            }

            try {
                const response = await fetch(`${API_URL}/timeWeek/dropTime/${slotEntry.id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error("Failed to delete client");

                await loadAllData();
                onClose();
                alert("Client deleted successfully");
            } catch (error) {
                console.error("Error deleting client:", error);
                alert("Error deleting client: " + error.message);
            }
        };

        const handleToggleClientSelection = (client) => {
            setSelectedClientsForMove(prev => {
                if (prev.some(c => c.id === client.id)) {
                    return prev.filter(c => c.id !== client.id);
                }
                return [...prev, client];
            });
        };

        const handleSelectAllClients = () => {
            if (selectedClientsForMove.length === entry.clients.length) {
                setSelectedClientsForMove([]);
            } else {
                setSelectedClientsForMove([...entry.clients]);
            }
        };

        const handleConfirmChangeTime = async () => {
            if (!newStartTime || !newEndTime) {
                alert("Please select start and end time");
                return;
            }

            const newStartMinutes = parseTimeToMinutes(newStartTime);
            const newEndMinutes = parseTimeToMinutes(newEndTime);
            const workingHoursStart = parseTimeToMinutes(WORKING_HOURS_START);
            const workingHoursEnd = selectedDay === "Пятница"
                ? parseTimeToMinutes(WORKING_HOURS_END_FRIDAY)
                : parseTimeToMinutes(WORKING_HOURS_END);
            const lunchStart = parseTimeToMinutes(LUNCH_START);
            const lunchEnd = parseTimeToMinutes(LUNCH_END);

            if (newStartMinutes < workingHoursStart) {
                alert(`Start time cannot be earlier than ${WORKING_HOURS_START}`);
                return;
            }

            if (newEndMinutes > workingHoursEnd) {
                alert(`End time cannot be later than ${selectedDay === "Пятница" ? WORKING_HOURS_END_FRIDAY : WORKING_HOURS_END}`);
                return;
            }

            if (newEndMinutes <= newStartMinutes) {
                alert("End time must be after start time");
                return;
            }

            if (newStartMinutes < lunchEnd && newEndMinutes > lunchStart) {
                alert("Selected time overlaps with lunch break (13:00-13:48)");
                return;
            }

            const confirmed = window.confirm(
                `Move selected clients?\n\n` +
                `Current: ${entry.start_time} - ${entry.end_time} (${entry.day_of_week})\n` +
                `New: ${newStartTime} - ${newEndTime} (${selectedDay})\n` +
                `Clients to move: ${selectedClientsForMove.length}\n\n` +
                `Continue?`
            );

            if (!confirmed) return;

            await handleChangeTimeSelected(entry, selectedClientsForMove, newStartTime, newEndTime, selectedDay);
            setIsChangeTimeModalOpen(false);
            onClose();
        };

        return (
            <>
                <div className="modalc">
                    <div className="modal-contentc" style={{ maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
                        <h3>Manage Schedule Entry</h3>

                        <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#e3f2fd", borderRadius: "5px" }}>
                            <h4 style={{ margin: "0 0 5px 0" }}>Current Time Slot:</h4>
                            <p style={{ margin: "0" }}>{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</p>
                            <p style={{ margin: "5px 0 0 0" }}>Day: {entry.day_of_week}</p>
                            <p style={{ margin: "5px 0 0 0" }}>Total clients: {entry.clients.length}</p>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <h4 style={{ margin: 0 }}>Clients in this slot:</h4>
                                <button onClick={handleSelectAllClients} style={{ padding: "5px 10px", fontSize: "12px" }}>
                                    {selectedClientsForMove.length === entry.clients.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>

                            <div style={{ border: "1px solid #ddd", borderRadius: "5px", maxHeight: "200px", overflowY: "auto" }}>
                                {entry.clients.map((client, idx) => (
                                    <label
                                        key={client.id || idx}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "8px",
                                            borderBottom: "1px solid #eee",
                                            cursor: "pointer",
                                            backgroundColor: selectedClientsForMove.some(c => c.id === client.id) ? "#e8f5e9" : "white"
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedClientsForMove.some(c => c.id === client.id)}
                                            onChange={() => handleToggleClientSelection(client)}
                                            style={{ marginRight: "10px" }}
                                        />
                                        <span>{client.surname} {client.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <h4>Delete Client:</h4>
                            <select
                                onChange={(e) => setSelectedClient(JSON.parse(e.target.value))}
                                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                                defaultValue=""
                            >
                                <option value="">Select client to delete</option>
                                {entry.clients.map((client) => (
                                    <option key={client.id} value={JSON.stringify(client)}>
                                        {client.surname} {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actionsc" style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
                            <button onClick={handleDeleteClient} style={{ backgroundColor: "#f44336", color: "white" }}>
                                Delete Selected Client
                            </button>
                            <button onClick={() => setIsChangeTimeModalOpen(true)} style={{ backgroundColor: "#4CAF50", color: "white" }}>
                                Move Selected Clients
                            </button>
                            <button onClick={onClose}>Close</button>
                        </div>
                    </div>
                </div>

                {isChangeTimeModalOpen && (
                    <div className="modalc">
                        <div className="modal-contentc" style={{ maxWidth: "500px" }}>
                            <h3>Move Selected Clients</h3>

                            <div style={{ marginBottom: "15px" }}>
                                <label>Day of Week:</label>
                                <select
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(e.target.value)}
                                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                                >
                                    {DAYS.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: "15px" }}>
                                <label>Start Time:</label>
                                <input
                                    type="time"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                                    step="60"
                                />
                            </div>

                            <div style={{ marginBottom: "15px" }}>
                                <label>End Time:</label>
                                <input
                                    type="time"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                                    step="60"
                                />
                            </div>

                            <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "5px" }}>
                                <p style={{ margin: 0, fontSize: "14px", color: "#856404" }}>
                                    Clients to move: <strong>{selectedClientsForMove.length}</strong>
                                </p>
                            </div>

                            <div className="modal-actionsc" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button onClick={handleConfirmChangeTime} style={{ backgroundColor: "#4CAF50", color: "white" }}>
                                    Confirm Move
                                </button>
                                <button onClick={() => setIsChangeTimeModalOpen(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    // ============ TIME MODAL ============

    const TimeModal = ({ isOpen, onClose, onSave }) => {
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
            <div className="modalc">
                <div className="modal-contentc">
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
                    <div className="modal-actionsc" style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                        <button onClick={handleSave} style={{ backgroundColor: "#4CAF50", color: "white" }}>Save</button>
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
            <div className="header-svc">
                <h2>
                    Specialist: {specialistName || "Loading..."}
                    <br /> Department: {specialist?.department || ""}
                </h2>
                <div className="but-mar">
                    <button onClick={saveScheduleAsPDF}>Save as PDF</button>
                    <button onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>

            <div className="block-schedulec">
                {userRole === "editor" && (
                    <div className="clients-headerc">
                        <h3>Clients List</h3>
                        <div className="clientsc">
                            <input
                                type="text"
                                placeholder="Search client..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="client-listc">
                            {filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    draggable
                                    onDragStart={() => handleDragStart(client)}
                                    className="client-itemc"
                                >
                                    {client.name} {client.surname}
                                </div>
                            ))}
                            {filteredClients.length === 0 && (
                                <div className="no-results">No clients found</div>
                            )}
                        </div>
                    </div>
                )}

                <div className="schedule-containerc" id="schedule-containerc">
                    {DAYS.map((day) => {
                        const daySchedule = scheduleByDay[day];
                        const freeTimeBlocks = getFreeTimeBlocks(daySchedule);
                        const sortedSchedule = mergeAndSortSchedule(daySchedule, freeTimeBlocks);

                        return (
                            <div
                                key={day}
                                className={userRole === "editor" ? "schedule-blockc" : "schedule-blocks-viewerc"}
                                onDrop={() => handleDrop(day)}
                                onDragOver={handleDragOver}
                            >
                                <h4>{day}</h4>
                                {sortedSchedule.map((block, index) => (
                                    block.isFree ? (
                                        <div
                                            key={`free-${index}`}
                                            className="free-time-block"
                                            style={{ backgroundColor: "#d4edda", padding: "8px", margin: "5px 0", borderRadius: "4px" }}
                                        >
                                            Free: {formatTime(block.t_start)} - {formatTime(block.t_end)}
                                        </div>
                                    ) : (
                                        <div
                                            key={block.id || index}
                                            className={userRole === "editor" ? "schedule-itemc" : "schedule-itemc-vw"}
                                        >
                                            <div className="edit-but">
                                                {userRole === "editor" && (
                                                    <button onClick={() => openEditModal(block)}>✎</button>
                                                )}
                                            </div>
                                            <b>Time:</b> {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                            <ul className="clients-list" style={{ margin: "5px 0 0 0", paddingLeft: "20px" }}>
                                                {block.clients?.length > 0 ? (
                                                    block.clients.map((client, idx) => (
                                                        <li key={client.id || idx}>
                                                            {client.surname} {client.name}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li>No clients</li>
                                                )}
                                            </ul>
                                        </div>
                                    )
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalEditOpen && selectedEntry && (
                <EditModal entry={selectedEntry} onClose={closeModal} />
            )}

            <TimeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
};

export default ScheduleView;