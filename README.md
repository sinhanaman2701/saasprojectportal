# Kolte Patil Project Portal — Local Development Setup

A unified real estate project management system with an **Admin CMS** (Next.js) and a **Node.js backend API** consumed by the Legacy Mobile App.

---

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+ running locally
- npm v9+

---

## Project Structure

```
projectportal/
├── backend/          # Node.js + Express + Prisma API
└── admin-portal/     # Next.js Admin Dashboard
```

---

## 1. Backend Setup

### Step 1 — Install dependencies
```bash
cd backend
npm install
```

### Step 2 — Configure environment variables
Create a `.env` file inside `/backend`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kolte_patil_portal"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

### Step 3 — Set up the database
Make sure PostgreSQL is running, then push the Prisma schema:
```bash
npx prisma db push
```

### Step 4 — Start the backend server
```bash
npx ts-node src/index.ts
```

The backend will be running at: **http://localhost:3001**

> 📁 Uploaded files (images, PDFs) are saved locally to `backend/uploads/` and served at `http://localhost:3001/uploads/`

---

## 2. Admin Portal Setup

### Step 1 — Install dependencies
```bash
cd admin-portal
npm install
```

### Step 2 — Start the dev server
```bash
npm run dev
```

The Admin Portal will be running at: **http://localhost:3000**

---

## 3. Verify Everything Works

| Check | URL |
| :--- | :--- |
| Admin Dashboard | http://localhost:3000/dashboard |
| Create New Listing | http://localhost:3000/projects/new |
| Backend Health | http://localhost:3001 |
| Project List API | `POST http://localhost:3001/projects/list` |

---

## 4. Test the API (Postman or curl)

Import `Kolte_Patil_API.postman_collection.json` from the project root into Postman.

Or test with curl:

```bash
curl -X POST http://localhost:3001/projects/list \
  -H "Content-Type: application/json" \
  -H "access-token: YOUR_TOKEN_HERE" \
  -d '{"page": "1", "limit": "10"}'
```

---

## 5. Admin Login

Use the JWT-protected admin routes. Generate a token using the `JWT_SECRET` you defined in `.env` and pass it as:
```
Authorization: Bearer <your-jwt-token>
```

---

## Notes

- This is a **prototype** — files are stored locally in `/uploads`, not in AWS S3
- To switch to production S3, replace `multer.diskStorage` with `multer-s3` in `backend/src/routes/admin_projects.ts`
- See `finaKolte_Patil_PRD.md` for full developer handoff instructions
