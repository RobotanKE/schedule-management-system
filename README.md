\# 📅 Schedule Management System



A full-stack web application for managing client-specialist schedules with role-based access control, social worker scheduling, and PDF export functionality.



\## ✨ Features



\### Core Features

\- \*\*JWT Authentication\*\* - Secure login with role-based access (Editor / Viewer)

\- \*\*Client Management\*\* - Add, edit, delete clients with unique ESRN numbers

\- \*\*Specialist Management\*\* - Manage specialists with custom display order (drag \& drop)

\- \*\*Schedule Management\*\* - Drag \& drop scheduling for client-specialist pairs

\- \*\*Social Worker Schedule\*\* - Dedicated schedule for social workers with time slots

\- \*\*PDF Export\*\* - Export any schedule view as PDF document



\### User Roles

| Role | Permissions |

|------|-------------|

| `editor` | Full CRUD access (add/edit/delete clients, specialists, schedules) |

| `viewer` | Read-only access (view schedules only) |



\## 🛠️ Tech Stack



\### Backend

\- \*\*Runtime\*\*: Node.js

\- \*\*Framework\*\*: Express.js

\- \*\*Database\*\*: PostgreSQL

\- \*\*Authentication\*\*: JWT + bcrypt

\- \*\*File Processing\*\*: xlsx (Excel import)



\### Frontend

\- \*\*Framework\*\*: React.js

\- \*\*Routing\*\*: React Router DOM v6

\- \*\*PDF Generation\*\*: jsPDF + html2canvas

\- \*\*Styling\*\*: Custom CSS with responsive design



\## 📋 Prerequisites



\- Node.js (v16 or higher)

\- PostgreSQL (v13 or higher)

\- npm or yarn



\## 🚀 Installation



\### 1. Clone the repository

```bash

git clone https://github.com/yourusername/schedule-management-system.git

cd schedule-management-system

