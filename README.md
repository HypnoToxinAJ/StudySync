# StudySync 📚✨

StudySync is a full-stack student productivity platform. The React/Vite client is backed by a production-oriented Django REST API with real authentication and per-user cloud persistence.

## 🌟 What this project does

StudySync brings together several everyday student needs:

- 📅 Daily routines and study planning
- ✅ Attendance tracking
- 📝 Assessments and deadlines
- 📊 CGPA monitoring
- 💰 Tuition and expense management
- 🎯 Focus and productivity tools
- ⚙️ Personal settings and customization

## 🛠️ Tech stack

- React
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Recharts
- Django and Django REST Framework
- Supabase PostgreSQL
- Supabase Auth with Google OAuth and verified JWT access tokens

## ▶️ Getting started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up and start the API:
   ```powershell
   cd Backend
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver 8000
   ```

3. Start the frontend from the workspace root:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

The root `.env` must contain `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`DATABASE_URL`, `SECRET_KEY`, `VITE_API_BASE_URL`, `GEMINI_API_KEY`, and the
allowed CORS hosts. Routine image import uses `gemini-2.5-flash` by default;
override it with `GEMINI_ROUTINE_MODEL` when needed.
For legacy HS256 projects, `SUPABASE_JWT_SECRET` enables local verification;
without it, the API verifies access tokens through Supabase Auth. Add the local
and production application URLs to Supabase Auth's Redirect URLs list.

## 🧪 Available scripts

- `npm run dev` — start the development server
- `npm run build` — build the project for production
- `npm run preview` — preview the production build

## 📌 Notes

This project is designed as a student-focused dashboard to make academic life more organized, efficient, and visually appealing. 
