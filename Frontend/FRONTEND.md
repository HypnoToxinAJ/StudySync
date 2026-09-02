# 📚 StudySync — Complete Frontend Architecture & Specification

StudySync is a modern, all-in-one student productivity and academic management dashboard built with **React 18**, **Vite 6**, and **Tailwind CSS 3**. It is engineered specifically for university and college students (with tailored automation for CUET — Chittagong University of Engineering and Technology) to consolidate routines, attendance, assessments, CGPA calculations, private tuition management, daily expenses, focus sessions, math tools, and an integrated dictionary into a single high-performance web application.

---

## 📑 Table of Contents
1. [Project Overview & What You Are Building](#-project-overview--what-you-are-building)
2. [Complete File & Directory Structure](#-complete-file--directory-structure)
3. [Feature & Module Breakdown](#-feature--module-breakdown)
4. [API Endpoints & Integration Architecture](#-api-endpoints--integration-architecture)
5. [State Management, Storage & Data Persistence](#-state-management-storage--data-persistence)
6. [Design System, Theming & Styling](#-design-system-theming--styling)
7. [Getting Started, Commands & Deployment](#-getting-started-commands--deployment)

---

## 🎯 Project Overview & What You Are Building

StudySync replaces disconnected spreadsheets, notebook apps, and manual calculation tools with a unified, offline-first dashboard.

### Core Capabilities:
- 📅 **Dynamic Routine & Timetable Planner**: Daily/weekly schedules, room allocations, instructor tracking, OCR routine parser, and calendar export.
- 📊 **Smart Attendance Tracker**: Percentage analytics, minimum threshold alerts (e.g. 75%), "Bunk vs. Attend" predictive calculators, and leave logging.
- 📝 **Assessment & Deadline Hub**: CTs, quizzes, midterms, lab reports, assignments, countdowns, and related study links (Drive, Notion, Docs).
- 🎓 **CGPA Calculator & CUET Result Automation**: Semester-wise GPA/CGPA computation, credit weighting, goal simulators, and automated headless scraping of official CUET portal results with CAPTCHA solving.
- 💼 **Private Tuition & Student Manager**: Track tutoring students, scheduled classes, class-by-class logs, billing status (Paid/Due), and start-of-month rollover.
- 💰 **Expense & Debt Management**: Multi-account balances (Cash, bKash, Nagad, Bank), expense category visualizer (Recharts), monthly budgets, and Due/Borrow debt tracking with settlements.
- ⏱️ **Focus Mode (Pomodoro + Ambient + YouTube)**: Distraction-free study timer, interval configurations, background ambient sounds, and YouTube Lofi player.
- 📐 **Math Tools & PDF Workspace**: Advanced calculation tools paired with an in-app WebAssembly-powered PDF viewer and workspace (`@embedpdf/react-pdf-viewer` + `pdfium`).
- 📖 **In-App Dictionary & Phonetics**: Instant word lookups via the Free Dictionary API, with audio pronunciations, definitions, synonyms, and search history.
- ⚙️ **User Customization & Offline-First Backup**: Local storage sync, data migrations, customizable SVG avatars, theme toggles, JSON import/export, and selective resets.

---

## 📂 Complete File & Directory Structure

```text
StudySync/
├── package.json                         # Root npm configuration & scripts
├── package-lock.json                    # Lockfile for dependencies
├── README.md                            # High-level project introduction
├── FRONTEND.md                          # Comprehensive frontend documentation
└── Frontend/                            # Frontend Application Root
    ├── index.html                       # HTML5 entry point with Google Fonts
    ├── vite.config.js                   # Vite bundler config + CUET Dev Proxy Middleware
    ├── tailwind.config.js               # Tailwind CSS theme, colors, fonts, glow effects
    ├── postcss.config.js                # PostCSS plugins (Tailwind, Autoprefixer)
    ├── .env.example                     # Environment variables template
    │
    ├── api/                             # Serverless / Backend Proxy Functions
    │   └── cuet-results/
    │       └── fetch-results.js         # Vercel Serverless Function: Headless Playwright CUET scraper
    │
    ├── docs/                            # Internal Technical Documentation
    │   └── routine-ocr-service.md       # Architecture spec for Routine OCR microservice
    │
    ├── public/                          # Static public assets (icons, sounds, manifest)
    │
    └── src/                             # Application Source Code
        ├── main.jsx                     # React DOM root render
        ├── App.jsx                      # Router definitions, Auth guards, Context Providers
        │
        ├── components/                  # Reusable UI Components
        │   ├── assessments/
        │   │   └── RelatedLinksManager.jsx     # External study resources & links manager
        │   ├── auth/
        │   │   └── OnboardingModal.jsx         # New user onboarding & profile setup
        │   ├── common/                         # Shared UI primitives
        │   │   ├── Badge.jsx                   # Status and category badges
        │   │   ├── CircularProgress.jsx        # SVG circular progress meter
        │   │   ├── ConfirmDialog.jsx           # Modal confirmation dialogs
        │   │   ├── EmptyState.jsx              # Fallback illustrations for empty data
        │   │   ├── HiddenSectionBanner.jsx     # Banner for toggled hidden sections
        │   │   ├── Modal.jsx                   # Base animated modal dialog
        │   │   ├── ProgressBar.jsx             # Linear progress indicators
        │   │   ├── StatCard.jsx                # Key metric summary card
        │   │   ├── Tabs.jsx                    # Reusable tab switcher
        │   │   ├── UserAvatar.jsx              # User avatar renderer (SVG/presets)
        │   │   └── shortcutIconResolver.jsx    # Icon resolver for quick links
        │   ├── dictionary/                     # Floating dictionary widget
        │   │   ├── DictionaryAudioButton.jsx   # Audio pronunciation playback
        │   │   ├── DictionaryErrorState.jsx    # Error handling UI for word lookups
        │   │   ├── DictionaryLoadingState.jsx  # Skeleton loading UI
        │   │   ├── DictionaryMeaning.jsx       # Definitions, parts of speech, examples
        │   │   ├── DictionaryPopover.jsx       # Popover container for navbar dictionary
        │   │   ├── DictionaryRecentSearches.jsx# History of recently searched words
        │   │   ├── DictionaryResult.jsx        # Formatted lexical result view
        │   │   └── DictionarySearch.jsx        # Search input with debounce
        │   ├── expenses/                       # Financial management components
        │   │   ├── CompactAccountCards.jsx     # Account balances (Cash, bKash, etc.)
        │   │   ├── DueBorrowCard.jsx           # Summary card for money lent/borrowed
        │   │   ├── DueBorrowDrawer.jsx         # Slide-over drawer for debt records
        │   │   ├── DueBorrowEditorModal.jsx    # Modal for creating/editing loans
        │   │   ├── ExpenseCategoryPieChart.jsx # Recharts pie breakdown of spending
        │   │   ├── MonthlyBudgetCard.jsx       # Budget tracker & overspend progress
        │   │   ├── SettlementDialog.jsx        # Debt settlement and partial pay modal
        │   │   └── TransactionEditorModal.jsx  # Expense/Income transaction editor
        │   ├── focus/                          # Study mode components
        │   │   └── YouTubeFocusCard.jsx        # Embed player for ambient/lo-fi streams
        │   ├── layout/                         # Core structural layout
        │   │   ├── AppShell.jsx                # Sidebar, Navbar, and content container
        │   │   ├── Breadcrumbs.jsx             # Hierarchical navigation breadcrumbs
        │   │   ├── MobileNav.jsx               # Bottom navigation bar for mobile
        │   │   ├── QuickAddModal.jsx           # Global "+" quick-action creation modal
        │   │   ├── Sidebar.jsx                 # Desktop collapsible sidebar navigation
        │   │   └── TopNavbar.jsx               # Header with search, dictionary, theme, profile
        │   ├── profile/
        │   │   └── AvatarPicker.jsx            # Interactive avatar selection grid
        │   └── tuition/                        # Private tutoring components
        │       ├── CompactTuitionStudentCard.jsx # Student card with status & quick actions
        │       ├── DeleteTuitionStudentDialog.jsx# Safe student deletion confirmation
        │       ├── OrderedClassList.jsx        # Sequential list of completed classes
        │       ├── OrderedClassRow.jsx         # Class log row with edit/delete
        │       ├── StartNewMonthDialog.jsx     # Month rollover & invoice generator
        │       ├── TuitionMonthHistory.jsx     # Historical tuition payment logs
        │       ├── TuitionStudentDetailsDrawer.jsx # Comprehensive student details drawer
        │       ├── TuitionStudentEditorModal.jsx # Student creation/editing modal
        │       └── TuitionStudentNotes.jsx     # Student notes & progress logs
        │
        ├── constants/
        │   └── dictionaryConstants.js          # Default search terms & dictionary config
        │
        ├── context/                             # React Context API State Providers
        │   ├── AuthContext.jsx                 # User authentication & session state
        │   ├── DataContext.jsx                 # Centralized state for routines, expenses, etc.
        │   ├── ThemeContext.jsx                # Light / Dark theme management
        │   └── ToastContext.jsx                # Global notification toast system
        │
        ├── data/
        │   ├── avatars.js                      # Avatar manifest & labels
        │   ├── avatars.jsx                     # Vector SVG avatar definitions
        │   └── mockData.js                     # Default initial state and seed data
        │
        ├── features/                            # Modular Feature Slices
        │   ├── calendar/
        │   │   └── utils/
        │   │       └── archiveRoutineEvents.js # Routine-to-calendar event mapper
        │   ├── cgpa/                           # Academic Performance & CUET Integration
        │   │   ├── LICENSE_ATTRIBUTION.md      # Attribution for grading algorithms
        │   │   ├── components/                 # CGPA tables, charts, simulator modals
        │   │   ├── hooks/                      # Custom hooks for grading calculations
        │   │   ├── parsers/                    # HTML parser for CUET published results
        │   │   ├── services/                   # Result fetching & PDF export services
        │   │   └── utils/                      # Grading scales, point conversions
        │   ├── focus/                          # Focus & Pomodoro tools
        │   │   ├── FocusModePage.jsx           # Distraction-free full view
        │   │   ├── components/                 # Timers, sound pickers, session stats
        │   │   ├── hooks/                      # Pomodoro interval & audio hooks
        │   │   ├── services/                   # Ambient sound & audio synthesis
        │   │   └── utils/                      # Time formatting and productivity formulas
        │   ├── math-tools/                     # Advanced Math & PDF Workspace
        │   │   ├── components/                 # Math calculators, matrix solvers, graphers
        │   │   ├── hooks/                      # Math evaluation hooks
        │   │   ├── pages/                      # Math tools sub-views
        │   │   ├── services/                   # Calculation engines & WebAssembly bridges
        │   │   └── utils/                      # Formula parsers & matrix operations
        │   ├── routine/                        # Routine & Schedule management
        │   │   ├── components/                 # Routine grid, slot editors, PDF upload
        │   │   ├── hooks/                      # Active class detectors, daily filters
        │   │   ├── services/                   # Routine parsing & OCR bridge
        │   │   └── utils/                      # Timetable conflict detectors & formatters
        │   └── settings/                       # User Preferences & Data Backup
        │       ├── components/                 # Backup/Restore UI, danger zone, theme options
        │       ├── services/                   # JSON import/export, data sanitization
        │       └── utils/                      # Schema validators and reset utilities
        │
        ├── hooks/
        │   └── useDictionary.js                # Custom hook for Free Dictionary API lookups
        │
        ├── pages/                              # Top-Level Page Views
        │   ├── AssessmentsPage.jsx             # Quizzes, assignments, exams tracker
        │   ├── AttendancePage.jsx              # Attendance logs & bunk calculators
        │   ├── AuthPage.jsx                    # Login / Signup / Guest access
        │   ├── CGPAPage.jsx                    # CGPA calculator & CUET portal portal integration
        │   ├── DashboardPage.jsx               # Central overview dashboard
        │   ├── ExpensesPage.jsx                # Expense, income, budget, and debt manager
        │   ├── FocusPage.jsx                   # Focus hub view
        │   ├── MathToolsPage.jsx               # Lazy-loaded Math Tools & PDF Workspace
        │   ├── RoutinePage.jsx                 # Interactive class schedule & timetable
        │   ├── SettingsPage.jsx                # Application settings & data backup
        │   └── TuitionPage.jsx                 # Private tutoring client management
        │
        ├── services/                           # Business Logic & External Services
        │   ├── alertService.js                 # Push/browser notification service
        │   ├── attendanceService.js            # Attendance percentage & status formulas
        │   ├── authService.js                  # Local/guest authentication adapter
        │   ├── cgpaService.js                  # CGPA calculations & transcript generators
        │   ├── dictionaryService.js            # Lexical search API client
        │   ├── driveServicePlaceholder.js      # Google Drive integration interface
        │   ├── expenseService.js               # Transaction computations & category aggregation
        │   ├── focusService.js                 # Focus session persistence
        │   ├── marksService.js                 # Marks tracking & grading conversions
        │   ├── routineService.js               # Routine filtering & active period helpers
        │   ├── shortcutService.js              # Quick access link manager
        │   ├── storageService.js               # LocalStorage read/write with error recovery
        │   ├── tuitionService.js               # Tutoring class rates, billing, and logs
        │   └── youtubeService.js               # YouTube video ID extractor & embed builder
        │
        ├── store/
        │   └── selectors/
        │       └── navigationSelectors.js      # Badges & active counts for sidebar/tabs
        │
        ├── styles/
        │   └── globals.css                     # Custom animations, scrollbars, fonts
        │
        └── utils/                              # General Utility Functions
            ├── assessmentSchemas.js            # Zod validation schemas for assessments
            ├── assessmentUtils.js              # Filter, sort, and date math for deadlines
            ├── currency.js                     # BDT (৳) / USD / EUR currency formatters
            ├── dictionaryUtils.js              # Word phonetic and definition parsers
            ├── expenseUtils.js                 # Financial calculations and summaries
            ├── ordinalUtils.js                 # 1st, 2nd, 3rd ordinal formatting
            ├── storageMigrations.js            # Multi-version LocalStorage migration engine
            └── tuitionUtils.js                 # Student fee and class status helpers
```

---

## 🚀 Feature & Module Breakdown

### 1. Central Dashboard (`DashboardPage.jsx`)
- **Daily Glance**: Displays the ongoing and next upcoming class based on real-time clock.
- **Attendance Alerts**: Highlights courses falling below the safe threshold (e.g. < 75%).
- **Pending Assessments**: Countdown chips for assignments and quizzes due within 48 hours.
- **Financial Status**: Quick summary of total monthly expense vs budget, and pending tuition dues.
- **Quick Actions Modal (`QuickAddModal.jsx`)**: Instant creation of tasks, expenses, class logs, or notes from anywhere in the app.

### 2. Routine & Schedule Manager (`RoutinePage.jsx`)
- **Visual Timetable Grid**: Organized by days of the week (Sunday – Thursday/Saturday) and time slots.
- **Class Metadata**: Course Code, Course Title, Room/Lab Number, Instructor Name/Initials, and Class Type (Theory/Sessional).
- **Active Class Highlighting**: Automatically detects and marks currently running and upcoming sessions.
- **OCR Import Integration**: Upload image/PDF routines and convert them into interactive schedules.
- **iCal / Google Calendar Export**: Export timetable to `.ics` for native mobile/desktop calendar sync.

### 3. Attendance Intelligence (`AttendancePage.jsx`)
- **Dual Calculations**: Tracks Total Classes Held vs Attended.
- **"Bunk Calculator" (Safe Skips)**: Calculates exactly how many classes you can skip while remaining above your target percentage.
- **"Recovery Calculator" (Must Attend)**: Calculates consecutive classes needed to recover from a low percentage.
- **Leave & Cancellation Logs**: Differentiates between student absence and university holidays/teacher cancellations.

### 4. Assessments & Deadlines (`AssessmentsPage.jsx`)
- **Multi-Category Tracking**: Class Tests (CTs), Midterms, Final Exams, Lab Reports, Projects, and Presentations.
- **Related Links Manager (`RelatedLinksManager.jsx`)**: Attach external cloud links (Google Drive, Dropbox, GitHub repositories, Notion workspaces) directly to each assessment card.
- **Status Pipeline**: Upcoming ➔ In Progress ➔ Submitted ➔ Graded.

### 5. CGPA Hub & CUET Automation (`CGPAPage.jsx`)
- **Semester Transcript Builder**: Record credit hours and achieved grade points per subject.
- **Goal Simulator**: Calculate required GPA in upcoming semesters to achieve target cumulative CGPA.
- **Automated CUET Scraper (`/api/cuet-results/fetch-results`)**:
  - Direct integration with CUET's result server (`https://course.cuet.ac.bd/result_published.php`).
  - Automated session initialization, dynamic CAPTCHA challenge delivery, and Playwright headless login.
  - Automatic parsing of published HTML tables into structured semester grades.

### 6. Private Tuition Manager (`TuitionPage.jsx`)
- **Student Profile Management**: Subject, class level, monthly fee, target classes per month, and contact information.
- **Ordered Class Logging (`OrderedClassRow.jsx`)**: Log individual classes with timestamps, topic covered, and duration.
- **Billing & Rollover (`StartNewMonthDialog.jsx`)**: Track paid, pending, and overdue fees; roll over balances at month start.
- **Student Notes (`TuitionStudentNotes.jsx`)**: Keep private notes on student progress, syllabus, and parent remarks.

### 7. Expense & Budget Hub (`ExpensesPage.jsx`)
- **Multi-Account Tracking**: Segregate balances across Physical Cash, Mobile Banking (bKash, Nagad, Rocket), and Bank Accounts.
- **Spending Analytics (`ExpenseCategoryPieChart.jsx`)**: Interactive Recharts pie visualization of monthly expenses.
- **Debt & Loan Manager (`DueBorrowDrawer.jsx`)**: Log money you lent to friends ("I will get") vs borrowed ("I owe"), with partial/full settlement workflows.

### 8. Focus Hub & Study Room (`FocusPage.jsx`)
- **Pomodoro Engine**: Customizable study, short break, and long break intervals with audio notifications.
- **Ambient Soundscapes**: Synthesized audio for White Noise, Rain, Cafe, and Forest.
- **YouTube Lofi Player (`YouTubeFocusCard.jsx`)**: Embedded music player supporting curated streams and custom video links.

### 9. Math Tools & PDF Workspace (`MathToolsPage.jsx`)
- **Lazy-Loaded PDF Workspace**: Embedded document viewer and markup engine powered by `@embedpdf/react-pdf-viewer` and WebAssembly `pdfium`.
- **Engineering Utilities**: Matrix arithmetic, calculus helpers, unit converters, and scientific calculation tools.

### 10. Global In-App Dictionary (`DictionaryPopover.jsx`)
- Accessible globally from the top navigation bar.
- Fetches definitions, phonetics, parts of speech, synonyms, antonyms, and audio pronunciation without disrupting current tasks.

---

## 🌐 API Endpoints & Integration Architecture

### 1. Internal Serverless API (CUET Portal Automation)

StudySync includes a specialized proxy and automation endpoint implemented as both a **Vite Dev Server Middleware** (in `vite.config.js`) and a **Vercel Serverless Function** (in `api/cuet-results/fetch-results.js`).

#### Flow Diagram:
```
[Frontend Client] 
      │
      ├── 1. POST /api/cuet-results/fetch-results?stage=start (studentId, password)
      │      ▼
      │   [Serverless Proxy] ── Fetch CSRF & CAPTCHA ──► [CUET Portal Server]
      │      ◄── Returns encrypted challengeId & base64 CAPTCHA ──
      │
      ├── 2. User enters CAPTCHA code
      │
      └── 3. POST /api/cuet-results/fetch-results?stage=complete (challengeId, captcha)
             ▼
          [Serverless Proxy / Headless Playwright Browser]
             ├── Injects cookies & credentials
             ├── Submits form & solves CAPTCHA
             └── Scrapes result table HTML
             ▼
          [Frontend Client] ◄── Parses HTML into Course Grades & CGPA
```

#### Endpoints:

| Endpoint | Method | Stage Param | Request Body | Response Payload | Description |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `/api/cuet-results/fetch-results` | `POST` | `?stage=start` | `{ "studentId": "...", "password": "..." }` | `{ "challengeRequired": true, "challengeId": "...", "captchaImage": "data:image/png;base64,..." }` | Initializes CUET session, extracts CSRF token and CAPTCHA image, returns encrypted challenge token (AES-256-GCM). |
| `/api/cuet-results/fetch-results` | `POST` | `?stage=complete` | `{ "challengeId": "...", "captcha": "..." }` | `{ "success": true, "html": "<table>...", "studentId": "...", "fetchedAt": "..." }` | Spawns headless browser, completes authentication, and returns published result HTML. |

---

### 2. External Third-Party APIs

| Service | Endpoint / URL | Purpose | Integration File |
| :--- | :--- | :--- | :--- |
| **Free Dictionary API** | `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` | Real-time word definitions, audio pronunciation, phonetics, and synonyms. | [`services/dictionaryService.js`](file:///d:/StudySync/Frontend/src/services/dictionaryService.js) |
| **YouTube IFrame API** | `https://www.youtube-nocookie.com/embed/{videoId}` | Background study music and lo-fi playlist stream embedding. | [`components/focus/YouTubeFocusCard.jsx`](file:///d:/StudySync/Frontend/src/components/focus/YouTubeFocusCard.jsx) |
| **Routine OCR Service** | `POST /api/routine/ocr` *(Spec)* | Cloud OCR parser for extracting structured timetable JSON from uploaded routine photos. | [`docs/routine-ocr-service.md`](file:///d:/StudySync/Frontend/docs/routine-ocr-service.md) |

---

## 💾 State Management, Storage & Data Persistence

StudySync uses an **offline-first local persistence model** backed by React Context and a versioned `LocalStorage` migration engine.

### State Contexts:
1. [`AuthContext.jsx`](file:///d:/StudySync/Frontend/src/context/AuthContext.jsx): Handles user profile, guest mode vs logged-in user, and avatar selection.
2. [`DataContext.jsx`](file:///d:/StudySync/Frontend/src/context/DataContext.jsx): Primary state store containing:
   - `routines`: Weekly course slots, rooms, and instructor records.
   - `attendance`: Course-wise logs, total classes, and absent dates.
   - `assessments`: Tasks, due dates, scores, categories, and related URLs.
   - `cgpaData`: Semesters, courses, credit hours, and grade records.
   - `tuitionStudents`: Tutoring students, fee schedules, and completed class logs.
   - `expenses` & `accounts`: Transactions, account balances, and budgets.
   - `dueBorrowRecords`: Debt and loan items with settlement histories.
   - `focusSessions`: Study duration statistics and streak counts.
3. [`ThemeContext.jsx`](file:///d:/StudySync/Frontend/src/context/ThemeContext.jsx): Manages Light/Dark mode state and persists user preference.
4. [`ToastContext.jsx`](file:///d:/StudySync/Frontend/src/context/ToastContext.jsx): Global feedback notifications (Success, Error, Info, Warning).

### Migration & Backup Engine (`storageMigrations.js` & `storageService.js`):
- All data is safely serialized to LocalStorage under namespaced keys (`studysync_*`).
- Schema versions are tracked; if a newer app version introduces new properties, migrations run sequentially without data loss.
- Full database export (`.json`) and one-click restore are available in Settings.

---

## 🎨 Design System, Theming & Styling

### Technology:
- **Tailwind CSS 3** with custom theme extensions.
- **Framer Motion** for modal transitions, page slides, drawer reveals, and micro-interactions.
- **Lucide React & FontAwesome** for iconography.

### Color Palette Tokens:
- **Brand Primary (Indigo)**: `#6366F1` (`brand-500`), `#4F46E5` (`brand-600`), `#4338CA` (`brand-700`)
- **Brand Accent (Cyan)**: `#06B6D4` (`cyanBrand-500`), `#0891B2` (`cyanBrand-600`)
- **Dark Mode Surfaces**:
  - Background: `#0F172A` (`darkBg`)
  - Cards / Panels: `#1E293B` (`darkCard`)
  - Hover / Borders: `#334155` (`darkBorder`, `darkCardHover`)
- **Typography**: Google Fonts — `'Plus Jakarta Sans'`, `'Inter'`, `sans-serif`
- **Glow Effects**: Custom box shadows (`glow-indigo`, `glow-cyan`, `glow-emerald`)

---

## 🛠️ Getting Started, Commands & Deployment

### Prerequisites:
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later

### Available Scripts (Run from workspace root):

```bash
# 1. Install all dependencies
npm install

# 2. Start Vite development server (at http://localhost:3000)
npm run dev

# 3. Compile production bundle
npm run build

# 4. Preview the production build locally
npm run preview
```

> **Note for Windows PowerShell Users**: If script execution is restricted, invoke commands using `npm.cmd run dev` or run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

---

*Documentation maintained for StudySync Frontend Architecture.*
