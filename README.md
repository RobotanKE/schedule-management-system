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

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/RobotanKE/schedule-management-system.git
cd schedule-management-system
```
### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run db:init
```
### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
npm start
```
### 4. Database Setup
```sql
CREATE DATABASE schedule_db;
```
Note: Migrations run automatically on server start when DB_MODE=reset


### 🔧 Configuration

Backend .env
```env
# ========== DATABASE CONFIGURATION ==========
PGUSER=postgres
PGHOST=localhost
PGDATABASE=schedule_db
PGPASSWORD=your_password_here
PGPORT=5432

# ========== JWT AUTHENTICATION ==========
JWT_SECRET=your_super_secret_key_min_32_characters

# ========== SERVER CONFIGURATION ==========
PORT=5000
NODE_ENV=development

# ========== DATABASE MODE ==========
# Options: normal | reset
DB_MODE=normal

# ========== EXCEL IMPORT (OPTIONAL) ==========
EXCEL_DATA_PATH=./data/clients.xlsx
```

### Frontend .env
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_TITLE=Schedule Management System
```

### 📡 API Endpoints

#### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Create new user |
| `POST` | `/login` | Authenticate and get JWT token |

#### 👥 Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/clients` | Get all clients |
| `POST` | `/clients` | Create client (editor only) |
| `PUT` | `/clients/:id` | Update client (editor only) |
| `DELETE` | `/clients/:id` | Delete client (editor only) |

#### 👨‍⚕️ Specialists

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/specialists` | Get all specialists |
| `POST` | `/specialists` | Create specialist (editor only) |
| `PUT` | `/specialists/:id` | Update specialist (editor only) |
| `DELETE` | `/specialists/:id` | Delete specialist (editor only) |

#### 📅 Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/timeWeek/specialist/:specId` | Get schedule by specialist |
| `GET` | `/timeWeek/client/:clientId` | Get schedule by client |
| `POST` | `/timeWeek/schedule` | Add schedule entry (editor only) |
| `DELETE` | `/timeWeek/dropTime/:id` | Delete schedule entry (editor only) |

#### 🧑‍🤝‍🧑 Social Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/timeWeek/social-schedule/:dayId` | Get social schedule |
| `POST` | `/timeWeek/social-schedule` | Add social schedule entry |
| `PUT` | `/social-scheduler/:id` | Update social task |
| `DELETE` | `/timeWeek/social-schedule/:id` | Delete social entry |


### 🎯 Usage Guide


#### First Time Setup

##### 1. **Register a user** (via `/register` endpoint or direct database insert)

```bash
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"editor"}'
```

##### 2. Login with your credentials

```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
Note: Default role is viewer. Set role to editor in the database for full access.
```

##### Creating a Schedule
1️⃣ Navigate to Specialist or Client schedule view
2️⃣ Drag a client/specialist from the sidebar
3️⃣ Drop on desired day column
4️⃣ Select a time slot

✅ Schedule entry is created!

##### Social Worker Schedule
1️⃣ Navigate to Social Workers section
2️⃣ Add time slots using the + button
3️⃣ Click on any time slot to add/edit a task description
4️⃣ Export schedule as PDF 📄



### 🐛 Troubleshooting

#### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql   # Linux
brew services list                  # macOS

# Verify credentials in .env file

# Try resetting database
DB_MODE=reset npm start
```

### 📄 License
MIT License — feel free to use, modify, and distribute.

### 👨‍💻 Author
Kirill Guskov (@RobotanKE)

GitHub: @RobotanKE

Project Link: https://github.com/RobotanKE/schedule-management-system

### ⭐ Show Your Support
If you found this project helpful, please give it a ⭐ on GitHub!

## Built with ❤️ using React, Express, and PostgreSQL
