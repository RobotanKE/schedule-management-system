# 📅 Schedule Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)

A full-stack web application for managing client-specialist schedules with role-based access control, social worker scheduling, and PDF export functionality.

## ✨ Features

### Core Features
- 🔐 **JWT Authentication** - Secure login with role-based access (Editor / Viewer)
- 👥 **Client Management** - Add, edit, delete clients with unique ESRN numbers
- 👨‍⚕️ **Specialist Management** - Manage specialists with custom display order (drag & drop)
- 📅 **Schedule Management** - Drag & drop scheduling for client-specialist pairs
- 🧑‍🤝‍🧑 **Social Worker Schedule** - Dedicated schedule for social workers with time slots
- 📄 **PDF Export** - Export any schedule view as PDF document

### User Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| 👑 `editor` | Full CRUD access | Add, edit, delete clients, specialists, and schedules |
| 👁️ `viewer` | Read-only access | View schedules only, no modifications |

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript runtime |
| Express.js | Web framework |
| PostgreSQL | Relational database |
| JWT + bcrypt | Authentication & password hashing |
| xlsx | Excel file processing |

### Frontend
| Technology | Purpose |
|------------|---------|
| React.js | UI framework |
| React Router DOM | Client-side routing |
| jsPDF + html2canvas | PDF generation |
| Custom CSS | Responsive styling |

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn package manager
