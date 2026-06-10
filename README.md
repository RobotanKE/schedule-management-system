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

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/RobotanKE/schedule-management-system.git
cd schedule-management-system
2. Backend Setup
bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# Then run database initialization
npm run db:init
3. Frontend Setup
bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the application
npm start
4. Database Setup
sql
-- Create database
CREATE DATABASE schedule_db;

-- Run migrations (automatic on server start with DB_MODE=reset)
🔧 Configuration
Backend .env
env
# ========== DATABASE CONFIGURATION ==========
PGUSER=postgres
PGHOST=localhost
PGDATABASE=schedule_db
PGPASSWORD=your_password_here
PGPORT=5432

# ========== JWT AUTHENTICATION ==========
JWT_SECRET=your_super_secret_key_min_32_characters

# ========== SERVER CONFIGURATION ==========
PORT=3000
NODE_ENV=development

# ========== DATABASE MODE ==========
# Options: normal | reset
DB_MODE=normal

# ========== EXCEL IMPORT (OPTIONAL) ==========
EXCEL_DATA_PATH=./data/clients.xlsx
Frontend .env
env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_TITLE=Schedule Management System
📡 API Endpoints
🔐 Authentication
Method	Endpoint	Description
POST	/register	Create new user
POST	/login	Authenticate and get JWT token
👥 Clients
Method	Endpoint	Description
GET	/clients	Get all clients
POST	/clients	Create client (editor only)
PUT	/clients/:id	Update client (editor only)
DELETE	/clients/:id	Delete client (editor only)
👨‍⚕️ Specialists
Method	Endpoint	Description
GET	/specialists	Get all specialists
POST	/specialists	Create specialist (editor only)
PUT	/specialists/:id	Update specialist (editor only)
DELETE	/specialists/:id	Delete specialist (editor only)
📅 Schedule
Method	Endpoint	Description
GET	/timeWeek/specialist/:specId	Get schedule by specialist
GET	/timeWeek/client/:clientId	Get schedule by client
POST	/timeWeek/schedule	Add schedule entry (editor only)
DELETE	/timeWeek/dropTime/:id	Delete schedule entry (editor only)
🧑‍🤝‍🧑 Social Schedule
Method	Endpoint	Description
GET	/timeWeek/social-schedule/:dayId	Get social schedule
POST	/timeWeek/social-schedule	Add social schedule entry
PUT	/social-scheduler/:id	Update social task
DELETE	/timeWeek/social-schedule/:id	Delete social entry
🎯 Usage Guide
First Time Setup
Register a user via /register endpoint (or insert directly into database)

bash
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"editor"}'
Login with your credentials

bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
Default role is viewer — set role to editor in database for full access

Creating a Schedule
Navigate to Specialist or Client schedule view

Drag a client/specialist from the sidebar

Drop on desired day column

Select time slot

Schedule entry is created ✓

Social Worker Schedule
Navigate to Social Workers section

Add time slots using the + button

Click on any time slot to add/edit task description

Export schedule as PDF 📄

📁 Project Structure
text
schedule-management-system/
├── backend/
│   ├── routes/
│   │   ├── db.js              # Database connection & migrations
│   │   ├── users.js           # Authentication & roles
│   │   ├── index.js           # Home route
│   │   └── functionOfDataBase.js # Main API logic
│   ├── app.js                 # Express app configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScheduleView.js
│   │   │   ├── ScheduleViewSpecialist.js
│   │   │   ├── SocialDay.js
│   │   │   ├── AddEditDeleteEntity.js
│   │   │   └── ...
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── package.json
├── .env.example
├── .gitignore
└── README.md
🐛 Troubleshooting
Database Connection Error
bash
# Check PostgreSQL is running
sudo systemctl status postgresql   # Linux
brew services list                  # macOS

# Verify credentials in .env file
# Try resetting database
DB_MODE=reset npm start
JWT Errors
bash
# Ensure JWT_SECRET is set in .env
# Token expires after 1 hour - login again
Port Already in Use
bash
# Change PORT in .env or kill process
lsof -i :3000
kill -9 <PID>
Frontend Can't Connect to Backend
bash
# Check backend is running
curl http://localhost:5000/clients

# Verify REACT_APP_API_URL in frontend .env
# Restart frontend after changing .env
🚀 Running in Production
Backend (with PM2)
bash
npm install -g pm2
pm2 start app.js --name schedule-backend
pm2 save
pm2 startup
Frontend (build for production)
bash
npm run build
# Serve the build folder with nginx or serve
npx serve -s build -l 3000
📄 License
MIT License — feel free to use, modify, and distribute.

text
MIT License

Copyright (c) 2026 RobotanKE

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
👨‍💻 Author
RobotanKE

GitHub: @RobotanKE

Project Link: https://github.com/RobotanKE/schedule-management-system

⭐ Show Your Support
If you found this project helpful, please give it a ⭐ on GitHub!
