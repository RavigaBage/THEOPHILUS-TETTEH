# 🇬🇭 🇰🇷 Ghana-Korea IAC - Information Access Center

> **Operations & Management Platform for Ghana-Korea IAC - Information Access Center | Internet Lounge Management, Mobile Member Access Passes, QR Attendance Tracking, and Device Monitoring.**

---

## 📋 Table of Contents
1. [Project Overview & Scope](#-project-overview--scope)
2. [Key Features](#-key-features)
3. [System Architecture & Tech Stack](#-system-architecture--tech-stack)
4. [The Development Journey](#-the-development-journey)
5. [System Requirements](#-system-requirements)
6. [Installation & Setup Guide](#-installation--setup-guide)
   - [1. Root & Monorepo Setup](#1-root--monorepo-setup)
   - [2. Backend Service Setup](#2-backend-service-setup)
   - [3. Admin Dashboard Frontend Setup](#3-admin-dashboard-frontend-setup)
   - [4. Mobile Web Application Setup](#4-mobile-web-application-setup)
   - [5. Attendance QR Form Setup](#5-attendance-qr-form-setup)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [API Endpoints Reference](#-api-endpoints-reference)
9. [Agents & Device Status Integration](#-agents--device-status-integration)
10. [Production Deployment & Best Practices](#-production-deployment--best-practices)

---

## 🌐 Project Overview & Scope

The **Ghana-Korea IAC (Information Access Center) Management System** 🇬🇭 🇰🇷 is an end-to-end operational software suite designed for modern Internet Business Centers, Academic Tech Lounges, and Hub Workspaces.

It unifies **mobile member identity**, **frictionless check-ins via digital day passes or QR scanning**, **staff lounge management**, **network internet token generation**, and **real-time hardware device monitoring** into a single cohesive platform.

### Core Objectives:
* **Frictionless Member Onboarding & Check-in**: Mobile users sign up with their name, phone number, and ID card to generate verified digital access passes.
* **Instant Lounge Logging**: Passes or direct QR scans immediately record visitor entry into the central Internet Lounge Database.
* **Staff Admin Control**: Staff members confirm pending mobile tickets, log walk-ins, track session durations, enforce timeouts, and view capacity metrics.
* **Resilient Infrastructure**: Runs seamlessly with MongoDB or zero-config In-Memory Mongo for instant deployment.

---

## ✨ Key Features

### 📱 1. IAC Mobile App (Member Access Pass)
* **User Authentication**: Secure JWT-based registration and login collecting full name, email, phone number, and ID/Student ID.
* **Digital Access Pass Generator**: Generates dynamic day passes with QR codes, timestamp verification, and single-click check-in requests.
* **User Data Auto-Fill**: Automatically fills user personal credentials when requesting lounge check-ins or scanning QR attendance forms.
* **Gamified Loyalty System**: Tracks member check-in streaks, total visit counts, and displays a community leaderboard.
* **Mobile Responsiveness**: Designed with responsive dark-mode styling, fixed bottom navigation bar, and smooth touch-optimized transitions.

### 💻 2. Staff Admin Dashboard
* **Real-Time Capacity Tracker**: Live counter displaying active visitors, total daily check-ins, and peak hours.
* **Pending Ticket Confirmations**: Instant notifications for mobile pass requests allowing staff to confirm check-ins with 1-click.
* **Walk-In & Manual Entry**: Dedicated form for manual visitor logging (Name, Identifier, Contact, Gender, Signature).
* **Automated Time-out & Session Management**: Tracks visitor elapsed time, highlights expired sessions, and allows batch or individual time-outs.
* **Search & Export**: Multi-filter search (by name, ID, or time) and export capabilities for reporting.

### 📱 3. Attendance QR Code Form
* **Contactless Sign-in**: Standalone lightweight web application accessible via scanned QR codes displayed at the lounge front desk.
* **Auto-Prefill Integration**: Detects logged-in mobile user credentials from local storage and pre-fills name, phone number, and ID.
* **Direct Database Integration**: Automatically creates an entry in the Internet Lounge database and credits user streak points upon submission.

### 📊 4. Network, Reports & Device Status Agents
* **Internet Vouchers / Tokens**: Generate and print time-limited bandwidth tokens for visitors.
* **Device Status Agent**: Real-time status monitoring for network hardware, PCs, and access points.
* **Analytics & Reports**: Historical occupancy logs, peak-hour breakdown, and CSV/PDF export capabilities.

---

## 🏗️ System Architecture & Tech Stack

```
                                  +-----------------------+
                                  |   Mobile Member App   |
                                  | (PWA / HTML5 / JS)   |
                                  +-----------+-----------+
                                              |
                                              v
+-----------------------+         +-----------+-----------+         +-----------------------+
|  Attendance QR Form   | ------> |   Node.js / Express   | <------ |    Admin Dashboard    |
| (Stand-alone Web App) |         |     Backend API       |         |   (React + Vite + TS) |
+-----------------------+         +-----------+-----------+         +-----------------------+
                                              |
                                              v
                                  +-----------+-----------+
                                  |    MongoDB / Mongoose |
                                  | (In-Memory / Atlas)   |
                                  +-----------------------+
```

### Stack Breakdown:
* **Frontend Admin Dashboard**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
* **Mobile App & Public Forms**: Native HTML5, CSS3 (Custom Variables & Flexbox/Grid), ES6+ JavaScript, Web Storage API.
* **Backend API Server**: Node.js, Express.js, Mongoose ORM, jsonwebtoken (JWT), bcryptjs, cors, dotenv.
* **Database Layer**: MongoDB / Mongoose with `mongodb-memory-server` fallback for zero-dependency local/preview execution.

---

## 📖 The Development Journey

1. **Phase 1: Core Lounge System**:
   * Designed the backend model for visitor check-ins (`InternetLounge`) with time-in, time-out, signature, contact number, and identification fields.
   * Built the React administrative dashboard to replace pen-and-paper visitor logs.

2. **Phase 2: Mobile App & Digital Passes**:
   * Developed the mobile access pass (`/IACMOBILE APP/`) allowing members to request digital check-in passes.
   * Implemented JWT authentication and user profile models (`MobileUserProfile`).

3. **Phase 3: QR Code Attendance Integration**:
   * Created dynamic QR token generation for front-desk displays.
   * Built the standalone `/attendanceForm/` that submits scanned attendance directly to the backend database.

4. **Phase 4: User Personal Data & Seamless Auto-Fill**:
   * Expanded member profiles to collect phone numbers and ID numbers upon registration.
   * Linked mobile member profiles with the ticket submission and attendance form to eliminate redundant data entry for users.

5. **Phase 5: Resilient Production Setup & Mobile Responsiveness**:
   * Fixed mobile viewport height bugs, bottom navigation overlaps, and QR attendance backend routing.
   * Configured fallback memory DB support and full environment variable handling.

---

## ⚙️ System Requirements

* **Operating System**: Linux, macOS, or Windows
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **MongoDB** *(Optional)*: Community Edition v6.0+ or MongoDB Atlas connection string (In-Memory database runs automatically if no URL is provided).

---

## 📦 Installation & Setup Guide

### 1. Root & Monorepo Setup

Clone the repository and install top-level dependencies:

```bash
git clone https://github.com/RavigaBage/THEOPHILUS-TETTEH.git
cd THEOPHILUS-TETTEH
npm install
```

---

### 2. Backend Service Setup

Navigate to the `backend` directory, set up environment variables, and start the server:

```bash
cd backend
npm install

# Copy example environment variables
cp ../.env.example .env
```

Edit `.env` as needed:
```env
PORT=3000
NODE_ENV=production
MONGO_URL=mongodb://localhost:27017/iac_lounge_db
USE_MEMORY_DB=true
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
```

Run the backend server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

---

### 3. Admin Dashboard Frontend Setup

Navigate to the `frontend` directory and start the Vite dev server or build for production:

```bash
cd frontend
npm install

# Start Vite Development Server
npm run dev

# Build for Production
npm run build
```

---

### 4. Mobile Web Application Setup

The IAC Mobile App is located in `/IACMOBILE APP/` and served statically by the Express backend or Vite server:

* **Entry Point**: `http://localhost:3000/IACMOBILE APP/index.html`
* **Sign In / Registration**: `http://localhost:3000/IACMOBILE APP/login.html`

No build step is required for the mobile app — simply open it in any modern mobile browser or save it to your home screen as a Web App.

---

### 5. Attendance QR Form Setup

The attendance form is located in `/attendanceForm/`:

* **Entry Point**: `http://localhost:3000/attendanceForm/index.html`

Visitors can scan the QR code generated in the Admin Dashboard under **"Attendance QR"** to launch this form directly.

---

## 🔑 Environment Variables Reference

| Variable Name | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Express Server HTTP Port | `3000` |
| `NODE_ENV` | Application Environment Mode | `production` |
| `MONGO_URL` | MongoDB Connection URI | `mongodb://localhost:27017/iac_lounge_db` |
| `USE_MEMORY_DB` | Fallback to Mongo Memory Server | `true` |
| `JWT_SECRET` | Secret key for access tokens | `your_jwt_secret` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your_jwt_refresh_secret` |
| `JWT_EXPIRES_IN` | Access token lifespan | `1d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |

---

## 📡 API Endpoints Reference

### 🔐 Mobile Auth Endpoints (`/api/iac-mobile/auth`)
* `POST /register`: Registers a new mobile member (`name`, `email`, `password`, `phoneNumber`, `studentId`).
* `POST /login`: Authenticates mobile member and returns JWT tokens + user profile.
* `GET /verify`: Validates JWT token and returns current user details.

### 🎫 Checkin Tickets Endpoints (`/api/iac-mobile/checkin-tickets`)
* `POST /`: Creates a pending checkin ticket pass. Auto-fills user phone and ID number.
* `GET /`: Lists checkin tickets for admin dashboard.
* `POST /:id/confirm`: Confirms a pending ticket, logs visitor into `InternetLounge`, and increments streak.

### 🛋️ Internet Lounge Operations (`/api/lounge`)
* `GET /`: Returns active visitors and daily summary.
* `POST /`: Creates walk-in visitor entry.
* `PUT /time-out/:id`: Sets time-out timestamp for an active visitor.

### 📱 Attendance QR Endpoints (`/api/public/qrcodes`)
* `POST /active/submit`: Directly submits attendance entry to Lounge DB from scanned QR form.

---

## 📡 Agents & Device Status Integration

* **Internet Voucher Generator**: Integrates with local router/captive portal endpoints to generate time-limited WiFi access tokens.
* **Status Agent**: Periodically checks connected hardware units (PCs, routers, printers) and updates the Devices page in the Admin panel.

---

## 🛡️ Production Deployment & Best Practices

1. **Process Management**: Use `pm2` or Docker to manage Node.js process lifecycle in production.
   ```bash
   pm2 start backend/server.js --name "iac-backend"
   ```
2. **Reverse Proxy (Nginx)**: Proxy requests on port 80/443 to the Node app on port 3000.
3. **Database Security**: When moving to production, set `USE_MEMORY_DB=false` and provide a secured `MONGO_URL` with TLS enabled.
4. **Environment Secrets**: Never commit actual JWT keys or passwords to source control. Use `.env` files or platform secret managers (e.g. Cloud Run, AWS Secrets Manager).

---

<div align="center">
  <b>Ghana-Korea IAC - Information Access Center 🇬🇭 🇰🇷</b> • Powered by Modern Web & Mobile Technologies
</div>
