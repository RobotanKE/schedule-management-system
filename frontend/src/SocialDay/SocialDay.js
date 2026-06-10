import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import "./socday.css";

// API base URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Day name mapping
const dayNames = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday"
};

const SocialDay = () => {
    const { dayId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const userRole = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    // State declarations
    const [socialWorkers, setSocialWorkers] = useState([]);
    const [filteredWorkers, setFilteredWorkers] = useState([]);
    const [draggedWorker, setDraggedWorker] = useState(null);
    const [workerSchedules, setWorkerSchedules] = useState({});
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [workersPerPage, setWorkersPerPage] = useState(5);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [currentWorker, setCurrentWorker] = useState(null);
    const [currentTimeSlot, setCurrentTimeSlot] = useState(null);

    // Refs
    const pdfContainerRef = useRef();
    const pdfRef = useRef();

    // Current day and date
    const currentDayName = dayNames[dayId] || "Day";
    const currentDate = searchParams.get('date') || new Date().toLocaleDateString('ru-RU');

    // ============ UTILITY FUNCTIONS ============

    const getWorkerTimeSlots = (workerId) => {
        return workerSchedules[workerId] || [];
    };

    const getMaxTimeSlotsCount = () => {
        let maxSlots = 0;
        Object.values(workerSchedules).forEach(workerSlots => {
            if (workerSlots.length > maxSlots) {
                maxSlots = workerSlots.length;
            }
        });
        return maxSlots > 0 ? maxSlots : 1;
    };

    // ============ DRAG & DROP FOR WORKER ORDER ============

    const handleDragStart = (e, worker) => {
        setDraggedWorker(worker);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e, targetWorker) => {
        e.preventDefault();
        if (!draggedWorker || draggedWorker.id === targetWorker.id) return;

        // Reorder workers locally
        const workersCopy = [...socialWorkers];
        const draggedIndex = workersCopy.findIndex(w => w.id === draggedWorker.id);
        const targetIndex = workersCopy.findIndex(w => w.id === targetWorker.id);

        const [movedWorker] = workersCopy.splice(draggedIndex, 1);
        workersCopy.splice(targetIndex, 0, movedWorker);

        const updatedWorkers = workersCopy.map((worker, index) => ({
            ...worker,
            display_order: index + 1
        }));

        setSocialWorkers(updatedWorkers);
        setDraggedWorker(null);
        await saveWorkersOrder(updatedWorkers);
    };

    const saveWorkersOrder = async (workers) => {
        try {
            const updatePromises = workers.map((worker, index) =>
                fetch(`${API_URL}/${worker.id}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ display_order: index + 1 })
                })
            );
            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Error saving workers order:", error);
            alert("Error saving workers order");
        }
    };

    // ============ DATA FETCHING ============

    const fetchSocialWorkers = async () => {
        try {
            const response = await fetch(`${API_URL}/specialists`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            const socialWorkersData = data
                .filter(specialist => specialist.post === "Социальный работник")
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

            setSocialWorkers(socialWorkersData);
            setFilteredWorkers(socialWorkersData);
        } catch (error) {
            console.error("Error loading social workers:", error);
        }
    };

    const fetchSocialSchedule = async () => {
        try {
            const response = await fetch(`${API_URL}/timeWeek/social-schedule/${dayId}?date=${currentDate}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error("Failed to load schedule");

            const data = await response.json();
            setSchedule(data);

            const formattedSchedules = {};
            data.forEach(entry => {
                if (!formattedSchedules[entry.specialist_id]) {
                    formattedSchedules[entry.specialist_id] = [];
                }
                formattedSchedules[entry.specialist_id].push({
                    id: entry.id,
                    startTime: entry.time_slot.split(' - ')[0],
                    endTime: entry.time_slot.split(' - ')[1],
                    timeSlot: entry.time_slot,
                    task: entry.task
                });
            });
            setWorkerSchedules(formattedSchedules);
        } catch (error) {
            console.error("Error loading social schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSocialWorkers();
        fetchSocialSchedule();
    }, [dayId, currentDate]);

    // Filter workers by search query
    useEffect(() => {
        setFilteredWorkers(
            socialWorkers.filter(
                (worker) =>
                    worker.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    worker.surname?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [searchQuery, socialWorkers]);

    // ============ PAGINATION ============

    const calculateWorkersPerPage = () => {
        const tableContainer = document.getElementById('social-schedule-container');
        if (!tableContainer) return 5;
        const containerWidth = tableContainer.offsetWidth - 150;
        const columnWidth = 200;
        const visibleColumns = Math.floor(containerWidth / columnWidth);
        return Math.max(1, visibleColumns - 1);
    };

    useEffect(() => {
        const handleResize = () => {
            setWorkersPerPage(calculateWorkersPerPage());
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getCurrentPageWorkers = () => {
        const startIndex = currentPage * workersPerPage;
        return filteredWorkers.slice(startIndex, startIndex + workersPerPage);
    };

    const totalPages = Math.ceil(filteredWorkers.length / workersPerPage);

    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToPage = (page) => {
        setCurrentPage(page);
    };

    // ============ TIME SLOT MANAGEMENT ============

    const addTimeToWorker = (workerId) => {
        if (userRole !== "editor") return;
        setCurrentWorker(socialWorkers.find(w => w.id === workerId));
        setIsTimeModalOpen(true);
    };

    const handleSaveTimeSlot = async (startTime, endTime) => {
        if (!currentWorker || !startTime || !endTime) return;

        const timeSlot = `${startTime} - ${endTime}`;

        try {
            const newEntry = {
                specialist_id: currentWorker.id,
                day_of_week: dayId,
                date: currentDate,
                time_slot: timeSlot,
                task: ""
            };

            const response = await fetch(`${API_URL}/timeWeek/social-schedule`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newEntry),
            });

            if (!response.ok) {
                throw new Error("Failed to create time slot");
            }

            const result = await response.json();

            setSchedule(prev => [...prev, result.schedule]);
            setWorkerSchedules(prev => ({
                ...prev,
                [currentWorker.id]: [
                    ...(prev[currentWorker.id] || []),
                    {
                        id: result.schedule.id,
                        startTime,
                        endTime,
                        timeSlot,
                        task: ""
                    }
                ]
            }));
        } catch (error) {
            console.error("Error saving time slot:", error);
            alert("Error creating time slot: " + error.message);
        } finally {
            setIsTimeModalOpen(false);
            setCurrentWorker(null);
        }
    };

    const removeTimeSlot = async (workerId, slotId) => {
        if (userRole !== "editor") return;

        const slotToRemove = workerSchedules[workerId]?.find(slot => slot.id === slotId);
        if (!slotToRemove) return;

        try {
            const response = await fetch(
                `${API_URL}/timeWeek/social-schedule/${workerId}/${dayId}/${slotToRemove.timeSlot}?date=${currentDate}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                setWorkerSchedules(prev => ({
                    ...prev,
                    [workerId]: prev[workerId].filter(slot => slot.id !== slotId)
                }));
            }
        } catch (error) {
            console.error("Error removing time slot:", error);
        }
    };

    // ============ TASK MANAGEMENT ============

    const getTaskForWorkerAndTime = (workerId, timeSlot) => {
        const workerSlots = workerSchedules[workerId] || [];
        const slot = workerSlots.find(slot => slot.timeSlot === timeSlot);
        return slot ? slot.task : "";
    };

    const handleEditTask = (worker, timeSlot) => {
        if (userRole !== "editor") return;
        setCurrentWorker(worker);
        setCurrentTimeSlot(timeSlot);
        setIsModalOpen(true);
    };

    const handleSaveTask = async (task) => {
        if (!currentWorker || !currentTimeSlot) return;

        const workerSlots = workerSchedules[currentWorker.id] || [];
        const existingSlot = workerSlots.find(slot => slot.timeSlot === currentTimeSlot);

        if (!existingSlot) {
            console.error("Time slot not found");
            alert("Error: Time slot not found");
            return;
        }

        try {
            // Update locally first
            setWorkerSchedules(prev => ({
                ...prev,
                [currentWorker.id]: prev[currentWorker.id].map(slot =>
                    slot.timeSlot === currentTimeSlot
                        ? { ...slot, task: task }
                        : slot
                )
            }));

            // Then update via API
            if (existingSlot.id) {
                const response = await fetch(`${API_URL}/social-scheduler/${existingSlot.id}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ task: task }),
                });

                if (!response.ok) {
                    throw new Error("Failed to update task");
                }
            }
        } catch (error) {
            console.error("Error saving task:", error);
            alert("Error: " + error.message);
        } finally {
            setIsModalOpen(false);
            setCurrentWorker(null);
            setCurrentTimeSlot(null);
        }
    };

    const handleDeleteTask = async (workerId, timeSlot) => {
        try {
            const response = await fetch(
                `${API_URL}/timeWeek/social-schedule/${workerId}/${dayId}/${timeSlot}?date=${currentDate}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                setWorkerSchedules(prev => ({
                    ...prev,
                    [workerId]: prev[workerId].filter(slot => slot.timeSlot !== timeSlot)
                }));
            }
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    // ============ PDF EXPORT ============

    const saveScheduleAsPDF = async () => {
        if (!pdfContainerRef.current) {
            alert("Error: Element not found!");
            return;
        }

        try {
            const canvas = await html2canvas(pdfContainerRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                onclone: (clonedDoc, element) => {
                    element.style.fontFamily = "'Times New Roman', 'DejaVu Serif', serif";
                    element.style.color = "#000000";
                    element.style.backgroundColor = "#ffffff";

                    const allElements = element.getElementsByTagName('*');
                    for (let el of allElements) {
                        el.style.fontFamily = "'Times New Roman', 'DejaVu Serif', serif";
                        el.style.color = "#000000";
                        if (el.style.backgroundColor === 'rgba(0, 0, 0, 0)') {
                            el.style.backgroundColor = "#ffffff";
                        }
                    }
                }
            });

            const imgData = canvas.toDataURL("image/png", 1.0);
            const pdf = new jsPDF("landscape", "mm", "a4");

            const pageWidth = pdf.internal.pageSize.getWidth();
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const x = (pageWidth - imgWidth) / 2;

            pdf.addImage(imgData, "PNG", x, 10, imgWidth, imgHeight);
            pdf.save(`Schedule_${currentDayName}_${currentDate}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error saving PDF");
        }
    };

    // ============ MODAL COMPONENTS ============

    const TaskModal = ({ isOpen, onClose, onSave, onDelete, worker, timeSlot }) => {
        const [task, setTask] = useState("");

        useEffect(() => {
            if (worker && timeSlot) {
                const currentTask = getTaskForWorkerAndTime(worker.id, timeSlot);
                setTask(currentTask);
            }
        }, [worker, timeSlot]);

        if (!isOpen) return null;

        return (
            <div className="modal">
                <div className="modal-content">
                    <h2>Task for {worker?.surname} {worker?.name}</h2>
                    <p>Time: {timeSlot}</p>
                    <p>Day: {currentDayName}, {currentDate}</p>
                    <label>
                        Task:
                        <textarea
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            placeholder="Enter task description..."
                            rows="4"
                            style={{ width: "100%", marginTop: "10px" }}
                        />
                    </label>
                    <div className="modal-actions">
                        <button onClick={() => onSave(task)}>Save</button>
                        <button onClick={() => onDelete(worker.id, timeSlot)}>Delete</button>
                        <button onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    const TimeModal = ({ isOpen, onClose, onSave, worker }) => {
        const [startTime, setStartTime] = useState("");
        const [endTime, setEndTime] = useState("");

        if (!isOpen) return null;

        return (
            <div className="modal">
                <div className="modal-content">
                    <h2>Add Time Slot for {worker?.surname} {worker?.name}</h2>
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
                    <div className="modal-actions">
                        <button onClick={() => onSave(startTime, endTime)}>Add</button>
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
                <h2>{currentDayName} ({currentDate})</h2>
                <div className="but-mar">
                    <button onClick={saveScheduleAsPDF}>Save as PDF</button>
                    <button onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>

            <div
                ref={pdfRef}
                className="schedule-container-soc"
                id="social-schedule-container"
            >
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <>
                        {/* Pagination controls */}
                        <div className="pagination-controls">
                            <button onClick={prevPage} disabled={currentPage === 0} className="pagination-btn">
                                ← Previous
                            </button>
                            <span className="page-info">
                                Page {currentPage + 1} of {totalPages}
                            </span>
                            <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className="pagination-btn">
                                Next →
                            </button>
                        </div>

                        {/* Quick page navigation */}
                        {totalPages > 1 && (
                            <div className="page-navigation">
                                {Array.from({ length: totalPages }, (_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToPage(index)}
                                        className={`page-btn ${currentPage === index ? 'active' : ''}`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Main table */}
                        <table className="social-schedule-table">
                            <thead>
                            <tr>
                                <th className="worker-header" style={{ width: '150px' }}>
                                    Social Workers
                                </th>
                                {getCurrentPageWorkers().map(worker => (
                                    <th
                                        key={worker.id}
                                        className="worker-column"
                                        draggable={userRole === 'editor'}
                                        onDragStart={(e) => handleDragStart(e, worker)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, worker)}
                                        style={{
                                            width: '200px',
                                            cursor: userRole === 'editor' ? 'grab' : 'default'
                                        }}
                                    >
                                        <div className="worker-header-content">
                                            <span>{worker.surname} {worker.name}</span>
                                            {userRole === 'editor' && (
                                                <button
                                                    onClick={() => addTimeToWorker(worker.id)}
                                                    className="add-time-btn"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {Array.from({ length: getMaxTimeSlotsCount() }).map((_, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="time-label" style={{ width: '150px' }}>
                                        {rowIndex === 0 ? "Time / Task" : ""}
                                    </td>
                                    {getCurrentPageWorkers().map(worker => {
                                        const workerSlots = getWorkerTimeSlots(worker.id);
                                        const timeSlot = workerSlots[rowIndex];

                                        return (
                                            <td
                                                key={`${worker.id}-${rowIndex}`}
                                                className="time-task-cell"
                                                style={{ width: '200px', minHeight: '80px' }}
                                            >
                                                {timeSlot ? (
                                                    <div className="time-slot-container">
                                                        <div className="time-display">
                                                            {timeSlot.timeSlot}
                                                            {userRole === 'editor' && (
                                                                <button
                                                                    onClick={() => removeTimeSlot(worker.id, timeSlot.id)}
                                                                    className="remove-time-btn"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div
                                                            className={`task-display ${timeSlot.task ? 'has-task' : ''}`}
                                                            onClick={() => userRole === 'editor' && handleEditTask(worker, timeSlot.timeSlot)}
                                                        >
                                                            {timeSlot.task || (userRole === 'editor' ? '✎ Add task' : '')}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    userRole === 'editor' && rowIndex === 0 && (
                                                        <div className="no-time-message">
                                                            Click + to add time
                                                        </div>
                                                    )
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {/* Bottom pagination */}
                        {totalPages > 1 && (
                            <div className="pagination-controls bottom-pagination">
                                <button onClick={prevPage} disabled={currentPage === 0} className="pagination-btn">
                                    ← Previous
                                </button>
                                <span className="page-info">
                                    Showing workers {currentPage * workersPerPage + 1}-
                                    {Math.min((currentPage + 1) * workersPerPage, filteredWorkers.length)} of {filteredWorkers.length}
                                </span>
                                <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className="pagination-btn">
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Hidden PDF export container */}
            <div
                ref={pdfContainerRef}
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                    width: '1200px',
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    fontFamily: "'Times New Roman', 'DejaVu Serif', serif",
                    color: '#000000'
                }}
            >
                <h2 style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    fontSize: '24px',
                    fontFamily: "'Times New Roman', 'DejaVu Serif', serif",
                    color: '#000000'
                }}>
                    Social Workers Schedule - {currentDayName} ({currentDate})
                </h2>

                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '2px solid #000000',
                    fontSize: '14px',
                    fontFamily: "'Times New Roman', 'DejaVu Serif', serif",
                    tableLayout: 'fixed'
                }}>
                    <colgroup>
                        {filteredWorkers.map((worker) => (
                            <col key={worker.id} style={{ width: '150px' }} />
                        ))}
                    </colgroup>
                    <thead>
                    <tr>
                        {filteredWorkers.map(worker => (
                            <th key={worker.id} style={{
                                border: '1px solid #000000',
                                padding: '12px',
                                background: '#f0f0f0',
                                fontWeight: 'bold',
                                textAlign: 'center'
                            }}>
                                {worker.surname} {worker.name}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {Array.from({ length: getMaxTimeSlotsCount() }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {filteredWorkers.map(worker => {
                                const workerSlots = getWorkerTimeSlots(worker.id);
                                const timeSlot = workerSlots[rowIndex];

                                return (
                                    <td key={worker.id} style={{
                                        border: '1px solid #000000',
                                        padding: '10px',
                                        background: timeSlot?.task ? '#e8f5e8' : '#ffffff',
                                        minHeight: '60px',
                                        verticalAlign: 'top'
                                    }}>
                                        {timeSlot ? (
                                            <div>
                                                <div style={{
                                                    fontWeight: 'bold',
                                                    marginBottom: '5px',
                                                    fontSize: '16px'
                                                }}>
                                                    {timeSlot.timeSlot}
                                                </div>
                                                <div style={{
                                                    fontSize: '18px',
                                                    minHeight: '40px'
                                                }}>
                                                    {timeSlot.task || ''}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#999', fontStyle: 'italic' }} />
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                worker={currentWorker}
                timeSlot={currentTimeSlot}
            />

            <TimeModal
                isOpen={isTimeModalOpen}
                onClose={() => setIsTimeModalOpen(false)}
                onSave={handleSaveTimeSlot}
                worker={currentWorker}
            />
        </div>
    );
};

export default SocialDay;