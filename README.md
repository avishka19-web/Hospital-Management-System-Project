# Meridian General Hospital – Hospital Management System

A full-stack hospital management web app: public hospital website plus separate **Admin**, **Doctor** and **Patient** dashboards.

> **Demonstration project.** It uses synthetic data and is *not* a certified or production-ready medical records system.

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript, Chart.js, Font Awesome (no React/Angular/Vue) |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT, bcryptjs, role-based access control |
| Uploads | Multer (doctor photos, department images) |

The Express server also serves the `frontend/` folder, so the whole app runs from **one URL: http://localhost:5000**.

## Run it on Windows with VS Code

1. **Install** [Node.js LTS](https://nodejs.org) and either [MongoDB Community Server](https://www.mongodb.com/try/download/community) (install as a Windows service) or create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
2. Open the `hospital-management-system` folder in VS Code (**File → Open Folder**).
3. Open a terminal (**Terminal → New Terminal**) and install dependencies:
   ```powershell
   cd backend
   npm install
   ```
4. The project already contains a working `.env` for local MongoDB. If it is missing, copy `.env.example` to `.env`. For Atlas, replace `MONGODB_URI` with your connection string. **Change `JWT_SECRET` before deploying anywhere.**
5. Load demo data (**this wipes the database it points to**):
   ```powershell
   npm run seed
   ```
6. Start the server:
   ```powershell
   npm start        # or: npm run dev  (auto-restart on changes)
   ```
7. Open **http://localhost:5000**.

If you prefer VS Code *Live Server* for the frontend (port 5500), the frontend automatically calls the API on `http://localhost:5000` (CORS is pre-configured for 5500).

## Demo accounts (created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@meridian.test` | `Admin@123` |
| Doctor (Cardiology) | `doctor@meridian.test` | `Doctor@123` |
| Patient | `patient@meridian.test` | `Patient@123` |

Every seeded doctor uses `Doctor@123` (e.g. `priya.nair@meridian.test`), every seeded patient `Patient@123`. Passwords are stored only as bcrypt hashes. New patients can self-register; doctors are created by an admin.

## Features
**Public site** – Home, About, Doctors (search/filter/sort + profile modal), Departments (details modal + services), Contact (stored for admin), Login, Register, forgot-password dialog.

**Admin** – live statistics, 4 charts, doctor CRUD with photo upload, patient directory and profiles, appointment approve / reject / reschedule / complete / cancel / delete, department and service CRUD, reports (12-month charts, doctor performance, CSV export, print), contact-message inbox.

**Doctor** – today's and upcoming appointments, approve/reject, consultation notes + prescriptions, patient history, availability editor.

**Patient** – book by department → doctor → date → live slot → reason, appointment history with cancel (≥2 hours before), medical records, prescriptions, profile + password change.

### Appointment booking rules (enforced on the server)
* Only the doctor's working days / hours / slot length can be booked, not in the past, up to 90 days ahead.
* A slot is unique per doctor while an appointment is *pending* or *approved* – guaranteed by a unique sparse database index, so two simultaneous requests cannot double-book.
* A patient cannot hold two active appointments at the same time, or two with the same doctor on one day.
* Status flow: `pending → approved | rejected | cancelled`, `approved → completed | cancelled`. Completion is allowed only on/after the appointment date. Only admins reschedule.

## API overview
Base URL `/api`. Responses are `{ success, data, message, pagination? }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/me/password` |
| Doctors | `GET /doctors` (`search, department, day, sort, page, limit`), `GET /doctors/:id`, `POST /doctors` *(admin)*, `PUT /doctors/:id` *(admin; doctor for own availability)*, `DELETE /doctors/:id` *(admin)* |
| Patients | `GET /patients` *(admin, doctor)*, `GET /patients/:id`, `PUT /patients/:id` *(admin, self)* |
| Appointments | `GET /appointments/slots?doctor&date`, `POST /appointments` *(patient)*, `GET /appointments`, `GET /appointments/:id`, `PUT /appointments/:id`, `DELETE /appointments/:id` *(admin)* |
| Departments | `GET /departments`, `POST/PUT/DELETE` *(admin)* |
| Services | `GET /services`, `GET /services/all`, `POST/PUT/DELETE` *(admin)* |
| Clinical | `POST /prescriptions` *(doctor; saves diagnosis/notes + prescription)*, `GET /prescriptions`, `GET /prescriptions/:id`, `GET /records` |
| Contact | `POST /contact` *(public)*, `GET/PUT/DELETE` *(admin)* |
| Stats | `GET /stats/public`, `/stats/admin`, `/stats/reports`, `/stats/doctor`, `/stats/patient` |

## Security notes
Passwords hashed with bcrypt; JWT sent as a Bearer token (kept in `sessionStorage`, or `localStorage` if "Remember me" is ticked); every protected route verifies the token *and* the role on the server, and records are scoped to their owner (a patient can only read their own appointments, a doctor only their own patients). Input validated and typed on the server, NoSQL-injection-safe query parsing, upload type/size limits, rate limiting on login/register/contact, restricted CORS, safe error messages. Before any real deployment you would additionally need HTTPS, httpOnly-cookie sessions or token rotation, audit logging, backups and a proper privacy/compliance review.

## Images
Photographs are loaded from Unsplash via URLs listed in **`frontend/js/images.js`** (public pages) and **`backend/utils/seed.js`** (doctors/departments). Every `<img>` has a built-in fallback, so a dead link shows a clean placeholder instead of a broken icon. To use local copies, download the pictures into `frontend/assets/images/`, point `images.js` to e.g. `assets/images/hero.jpg`, and re-seed with local paths – or upload your own through **Admin → Doctors / Departments**.

## Project structure
```
hospital-management-system/
├── .env  .env.example  .gitignore  README.md
├── backend/
│   ├── server.js  package.json
│   ├── config/db.js
│   ├── models/        User, Doctor, Patient, Department, Service, Appointment, Prescription, MedicalRecord, ContactMessage
│   ├── controllers/   auth, doctor, patient, appointment, clinical, department, service, contact, stats
│   ├── routes/  middleware/ (auth, error, upload, rateLimit)  utils/ (seed, dates, helpers, shapes, validators)
│   └── uploads/       user-uploaded images
└── frontend/
    ├── index / about / doctors / departments / contact / login / register .html
    ├── admin/ doctor/ patient/   dashboards
    ├── css/ (style, site, dashboard)   js/ (core + pages/)   assets/
```

## Troubleshooting
* **"Could not connect to MongoDB"** – start the MongoDB service (`services.msc` → *MongoDB Server*) or fix `MONGODB_URI`.
* **Demo login fails** – run `npm run seed` in `backend`.
* **Port in use** – change `PORT` in `.env`.
* **Seeded "today" list is empty** – the seed books relative to today and skips each doctor's days off; re-run the seed on a working day, or book new appointments.
