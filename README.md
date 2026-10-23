# 1Click — Smart Printing & Document Management System

> **Tagline:** Done in 1Click  
> **Status:** Phase 1 (Auth), Phase 2 (Customer & Tasks), Phase 3 (Documents & Scans), Phase 4 (Print Layouts & Studios), and Phase 5 (Applications Management) Complete

---

## 🚀 Quick Start Guide

### 1. Ensure MongoDB is Running
MongoDB 8.3 is installed on your system at:
`C:\Program Files\MongoDB\Server\8.3\bin\`

Start MongoDB via Windows Services (`Services -> MongoDB Server -> Start`) or run:
```powershell
& "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "C:\data\db"
```

### 2. Seed Initial Admin Account
Once MongoDB is running, run (first time only):
```bash
npm run seed
```
- **Email:** `admin@1click.com`
- **Password:** `admin123456`
- **Role:** `super_admin`

### 3. Start Backend Server
```bash
npm run server
```
Server runs on: [http://localhost:5000](http://localhost:5000)

### 4. Start Frontend Client
In a new terminal:
```bash
npm run client
```
Client runs on: [http://localhost:5173](http://localhost:5173)

---

## 📦 What Was Built

### Phase 1: Authentication & Staff Management
- JWT Authentication, Bearer token verification, role-based protection (`super_admin`, `admin`, `staff`).
- Staff management module with interactive user creation, role assignment, and soft-deactivation.

### Phase 2: Customer & Task Management System
- Clean formatted sequential IDs (`C-1001` for Customers, `T-1001` for Tasks).
- Customer profiles with phone duplicate detection and full task histories.
- Task tracking with 8 status workflows, priorities, checklists, work notes, and history audit trails.
- Real-time MongoDB analytics dashboard with overdue alerts and quick actions.

### Phase 3: Document Management & Scan-to-PDF Studio
- Secure file storage outside web root (`server/uploads/`) with token authentication.
- Attach files to tasks with functional roles (`input`, `output`, `receipt`, `supporting_doc`).
- Scan & Document Studio (`/scan`): Rotate, reorder, and export print-ready PDFs.

### Phase 4: Universal Image Editor & Print Layout Engine
- Universal image editor with lossless rotation, flipping, brightness, and contrast.
- CNIC Printing Studio (`/cnic`): 100% scale (85.6 × 54 mm) vertical & side-by-side photocopying layout.
- Passport Photo Studio (`/passport`): 35×45mm, 2×2 inch, and custom grids on A4 or 4×6 photo paper with cut marks.
- Custom Size Engine (`/custom-print` & `/photos`): Millimeters, centimeters, or inches with multi-page calculation.

### Phase 5: Job, University & College Applications
- Specialized workflow modules for non-printing customer requests:
  - **Job Applications (`/job-applications`)**: Employer, post applied, tracking/roll number, and customized CV/degrees checklist.
  - **University Admissions (`/university`)**: University name, degree/program, admission challan tracking, academic certificates checklist.
  - **College Admissions (`/college`)**: Matric results, character certificate, intermediate disciplines tracking.
  - **Other Services (`/other-services`)**: General document attestation, token services, and passport form fillings.
- Automatic missing-document warnings and submission status indicators.
