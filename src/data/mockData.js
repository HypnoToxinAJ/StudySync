export const initialUserData = {
  name: "Tanvir Ahmed",
  email: "tanvir.student@university.edu.bd",
  username: "tanvir_cuet",
  university: "Chittagong University of Engineering & Technology",
  department: "Computer Science & Engineering",
  semester: "5th Semester",
  studentId: "2004015",
  currency: "BDT", // Default currency BDT (৳)
  themePreference: "dark",
  weeklyClassDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
  academicGoals: "Achieve semester GPA > 3.80, publish undergraduate research paper, maintain 90%+ attendance.",
  onboarded: true,
  isLoggedIn: true,
};

export const initialCourses = [
  {
    id: "course-1",
    courseId: "CSE-311",
    courseTitle: "Database Management Systems",
    credit: 3.0,
    faculty: "Dr. Al-Mamun",
    semester: "5th Semester",
    color: "#4F46E5", // Indigo
    totalClasses: 22,
    attendedClasses: 20,
    missedClasses: 2,
    attendanceGoal: 85,
    assessments: [
      { id: "ast-1", name: "CT 1: ER Diagram & Relational Algebra", type: "CT", totalMarks: 20, expectedMarks: 18, obtainedMarks: 17, date: "2026-06-10", isMissed: false },
      { id: "ast-2", name: "CT 2: SQL Queries & Normalization", type: "CT", totalMarks: 20, expectedMarks: 19, obtainedMarks: 19, date: "2026-07-02", isMissed: false },
      { id: "ast-3", name: "CT 3: Indexing & B-Trees", type: "CT", totalMarks: 20, expectedMarks: 18, obtainedMarks: 0, date: "2026-07-28", isMissed: true },
      { id: "ast-4", name: "Assignment 1: Database Schema Design", type: "assignment", totalMarks: 20, expectedMarks: 20, obtainedMarks: 19.5, date: "2026-07-15", isMissed: false },
    ],
  },
  {
    id: "course-2",
    courseId: "CSE-312",
    courseTitle: "Database Management Systems Lab",
    credit: 1.5,
    faculty: "Inst. Farhana Yashmin",
    semester: "5th Semester",
    color: "#06B6D4", // Cyan
    totalClasses: 10,
    attendedClasses: 10,
    missedClasses: 0,
    attendanceGoal: 90,
    assessments: [
      { id: "ast-5", name: "Lab Test 1: Oracle SQL", type: "CT", totalMarks: 20, expectedMarks: 19, obtainedMarks: 18.5, date: "2026-06-20", isMissed: false },
      { id: "ast-6", name: "Lab Project: Library Portal", type: "assignment", totalMarks: 20, expectedMarks: 20, obtainedMarks: 20, date: "2026-07-22", isMissed: false },
    ],
  },
  {
    id: "course-3",
    courseId: "CSE-313",
    courseTitle: "Computer Networks",
    credit: 3.0,
    faculty: "Prof. Shahadat Hossain",
    semester: "5th Semester",
    color: "#F59E0B", // Amber
    totalClasses: 21,
    attendedClasses: 17,
    missedClasses: 4, // 4 missed classes for 3 credit -> Exceeds allowed 3! Warning!
    attendanceGoal: 85,
    assessments: [
      { id: "ast-7", name: "CT 1: OSI Model & IP Addressing", type: "CT", totalMarks: 20, expectedMarks: 17, obtainedMarks: 16, date: "2026-06-14", isMissed: false },
      { id: "ast-8", name: "CT 2: TCP/UDP & Routing Protocols", type: "CT", totalMarks: 20, expectedMarks: 18, obtainedMarks: 15, date: "2026-07-10", isMissed: false },
      { id: "ast-9", name: "Assignment 1: Packet Tracer Lab", type: "assignment", totalMarks: 20, expectedMarks: 18, obtainedMarks: 18, date: "2026-07-18", isMissed: false },
    ],
  },
  {
    id: "course-4",
    courseId: "CSE-315",
    courseTitle: "Software Engineering & Agile",
    credit: 3.0,
    faculty: "Dr. Sabrina Alam",
    semester: "5th Semester",
    color: "#10B981", // Emerald
    totalClasses: 19,
    attendedClasses: 18,
    missedClasses: 1,
    attendanceGoal: 80,
    assessments: [
      { id: "ast-10", name: "CT 1: Software Lifecycles & Requirements", type: "CT", totalMarks: 20, expectedMarks: 19, obtainedMarks: 18, date: "2026-06-18", isMissed: false },
      { id: "ast-11", name: "CT 2: Design Patterns & UML", type: "CT", totalMarks: 20, expectedMarks: 18, obtainedMarks: 17.5, date: "2026-07-12", isMissed: false },
    ],
  },
  {
    id: "course-5",
    courseId: "MATH-301",
    courseTitle: "Linear Algebra & Complex Variables",
    credit: 3.0,
    faculty: "Prof. Dr. Jalal Uddin",
    semester: "5th Semester",
    color: "#EF4444", // Rose / Red
    totalClasses: 20,
    attendedClasses: 15,
    missedClasses: 5, // 5 missed classes for 3 credit -> AT RISK!
    attendanceGoal: 80,
    assessments: [
      { id: "ast-12", name: "CT 1: Vector Spaces & Eigenvalues", type: "CT", totalMarks: 20, expectedMarks: 16, obtainedMarks: 14, date: "2026-06-25", isMissed: false },
      { id: "ast-13", name: "CT 2: Complex Integration", type: "CT", totalMarks: 20, expectedMarks: 17, obtainedMarks: 13.5, date: "2026-07-14", isMissed: false },
    ],
  },
];

export const initialRoutines = [
  {
    id: "rt-1",
    courseId: "CSE-311",
    courseTitle: "Database Management Systems",
    faculty: "Dr. Al-Mamun",
    classType: "lecture",
    dayOfWeek: "Sunday",
    startTime: "08:00",
    endTime: "08:50",
    room: "Room 304",
    building: "Academic Building 2",
    color: "#4F46E5",
    repeatWeekly: true,
  },
  {
    id: "rt-2",
    courseId: "CSE-313",
    courseTitle: "Computer Networks",
    faculty: "Prof. Shahadat Hossain",
    classType: "lecture",
    dayOfWeek: "Sunday",
    startTime: "09:40",
    endTime: "10:30",
    room: "Room 305",
    building: "Academic Building 2",
    color: "#F59E0B",
    repeatWeekly: true,
  },
  {
    id: "rt-3",
    courseId: "CSE-312",
    courseTitle: "Database Systems Lab",
    faculty: "Inst. Farhana Yashmin",
    classType: "lab",
    dayOfWeek: "Monday",
    startTime: "10:30",
    endTime: "13:00",
    room: "Software Lab 1",
    building: "CSE Building",
    color: "#06B6D4",
    repeatWeekly: true,
  },
  {
    id: "rt-4",
    courseId: "CSE-315",
    courseTitle: "Software Engineering & Agile",
    faculty: "Dr. Sabrina Alam",
    classType: "lecture",
    dayOfWeek: "Tuesday",
    startTime: "08:50",
    endTime: "09:40",
    room: "Room 302",
    building: "Academic Building 2",
    color: "#10B981",
    repeatWeekly: true,
  },
  {
    id: "rt-5",
    courseId: "MATH-301",
    courseTitle: "Linear Algebra & Complex Variables",
    faculty: "Prof. Dr. Jalal Uddin",
    classType: "lecture",
    dayOfWeek: "Wednesday",
    startTime: "11:20",
    endTime: "12:10",
    room: "Room 201",
    building: "Basic Science Building",
    color: "#EF4444",
    repeatWeekly: true,
  },
  {
    id: "rt-6",
    courseId: "CSE-311",
    courseTitle: "Database Management Systems",
    faculty: "Dr. Al-Mamun",
    classType: "lecture",
    dayOfWeek: "Thursday",
    startTime: "09:40",
    endTime: "10:30",
    room: "Room 304",
    building: "Academic Building 2",
    color: "#4F46E5",
    repeatWeekly: true,
  },
];

export const initialAssessments = [
  {
    id: "ev-1",
    courseId: "CSE-311",
    title: "Class Test 4: B-Trees & Transaction Management",
    type: "CT",
    date: "2026-07-28",
    startTime: "10:00",
    endTime: "10:45",
    syllabus: "Chapter 14 & 15: Indexing structures, B+ Trees, ACID properties & Concurrency Control",
    marks: 20,
    room: "Room 304",
    priority: "high",
    reminderTime: "24h",
    notes: "Revise serializability algorithms and locking protocols.",
    attachments: [
      { id: "att-1", name: "B-Trees-Slide-Lecture14.pdf", size: "2.4 MB", type: "application/pdf" },
      { id: "att-2", name: "Transaction-Concurrency.docx", size: "1.1 MB", type: "application/docx" }
    ],
    links: [
      { id: "lnk-1", label: "GeeksforGeeks B+ Tree Tutorial", url: "https://www.geeksforgeeks.org/b-tree-set-1-insert/" },
      { id: "lnk-2", label: "Database System Concepts Book Code", url: "https://db-book.com/" }
    ]
  },
  {
    id: "ev-2",
    courseId: "CSE-313",
    title: "Assignment 2: Socket Programming in Python",
    type: "assignment",
    date: "2026-07-30",
    startTime: "23:59",
    endTime: "23:59",
    syllabus: "Implement Multi-threaded TCP Chat Server & Client with GUI",
    marks: 20,
    submissionMethod: "GitHub Repository URL & Google Classroom",
    priority: "high",
    reminderTime: "12h",
    notes: "Ensure multi-client handling using Python asyncio or threading.",
    attachments: [
      { id: "att-3", name: "Socket_Assignment_Spec.pdf", size: "850 KB", type: "application/pdf" }
    ],
    links: [
      { id: "lnk-3", label: "Python Socket Docs", url: "https://docs.python.org/3/library/socket.html" }
    ]
  },
  {
    id: "ev-3",
    courseId: "MATH-301",
    title: "Class Test 3: Complex Residues & Contour Integration",
    type: "CT",
    date: "2026-08-04",
    startTime: "11:20",
    endTime: "12:00",
    syllabus: "Laurent Series, Cauchy's Residue Theorem, Real Integration using Contour Method",
    marks: 20,
    room: "Room 201",
    priority: "medium",
    reminderTime: "24h",
    notes: "Practice exercises 18.2 to 18.5 from Kreyszig.",
    attachments: [],
    links: []
  },
  {
    id: "ev-4",
    courseId: "CSE-315",
    title: "Semester Mid-Term Examination",
    type: "examination",
    date: "2026-08-12",
    startTime: "10:00",
    endTime: "12:00",
    syllabus: "Entire syllabus from Modules 1 to 4",
    marks: 50,
    room: "Auditorium Hall A",
    priority: "high",
    reminderTime: "48h",
    notes: "Carry admit card and university ID card.",
    attachments: [],
    links: []
  }
];

export const initialSemesters = [
  {
    id: "sem-1",
    name: "1st Year 1st Semester",
    completed: true,
    courses: [
      { id: "c-101", courseId: "CSE-101", title: "Structured Programming Language", credit: 3.0, grade: "A+", gradePoint: 4.00 },
      { id: "c-102", courseId: "CSE-102", title: "Structured Programming Lab", credit: 1.5, grade: "A+", gradePoint: 4.00 },
      { id: "c-103", courseId: "MATH-101", title: "Differential & Integral Calculus", credit: 3.0, grade: "A", gradePoint: 3.75 },
      { id: "c-104", courseId: "PHY-101", title: "Physics I: Mechanics & Waves", credit: 3.0, grade: "A-", gradePoint: 3.50 },
      { id: "c-105", courseId: "HUM-101", title: "English & Communication Skills", credit: 2.0, grade: "A+", gradePoint: 4.00 }
    ]
  },
  {
    id: "sem-2",
    name: "1st Year 2nd Semester",
    completed: true,
    courses: [
      { id: "c-201", courseId: "CSE-103", title: "Object Oriented Programming (C++)", credit: 3.0, grade: "A+", gradePoint: 4.00 },
      { id: "c-202", courseId: "CSE-104", title: "OOP Lab", credit: 1.5, grade: "A+", gradePoint: 4.00 },
      { id: "c-203", courseId: "MATH-103", title: "Differential Equations & Matrix", credit: 3.0, grade: "A", gradePoint: 3.75 },
      { id: "c-204", courseId: "EEE-101", title: "Basic Electrical Engineering", credit: 3.0, grade: "B+", gradePoint: 3.25 },
      { id: "c-205", courseId: "CHEM-101", title: "Chemistry", credit: 3.0, grade: "A", gradePoint: 3.75 }
    ]
  },
  {
    id: "sem-3",
    name: "2nd Year 1st Semester",
    completed: true,
    courses: [
      { id: "c-301", courseId: "CSE-201", title: "Data Structures & Algorithms", credit: 3.0, grade: "A+", gradePoint: 4.00 },
      { id: "c-302", courseId: "CSE-202", title: "Data Structures Lab", credit: 1.5, grade: "A+", gradePoint: 4.00 },
      { id: "c-303", courseId: "CSE-203", title: "Digital Logic Design", credit: 3.0, grade: "A", gradePoint: 3.75 },
      { id: "c-304", courseId: "MATH-201", title: "Discrete Mathematics", credit: 3.0, grade: "A", gradePoint: 3.75 },
      { id: "c-305", courseId: "EEE-201", title: "Electronic Circuits & Devices", credit: 3.0, grade: "B", gradePoint: 3.00 }
    ]
  },
  {
    id: "sem-4",
    name: "2nd Year 2nd Semester",
    completed: true,
    courses: [
      { id: "c-401", courseId: "CSE-205", title: "Algorithms & Complexity", credit: 3.0, grade: "A+", gradePoint: 4.00 },
      { id: "c-402", courseId: "CSE-206", title: "Algorithms Lab", credit: 1.5, grade: "A+", gradePoint: 4.00 },
      { id: "c-403", courseId: "CSE-207", title: "Computer Architecture", credit: 3.0, grade: "A-", gradePoint: 3.50 },
      { id: "c-404", courseId: "CSE-209", title: "Theory of Computation", credit: 3.0, grade: "A", gradePoint: 3.75 },
      { id: "c-405", courseId: "MATH-203", title: "Probability & Statistics", credit: 3.0, grade: "A", gradePoint: 3.75 }
    ]
  }
];

export const initialTuitionStudents = [
  {
    id: "tu-1",
    studentName: "Aaraf Rahman",
    subject: "Physics & Mathematics",
    classGrade: "Class 10 (SSC Candidate)",
    guardianContact: "+880 1711-987654 (Mr. Rahman)",
    monthlyClasses: 12,
    completedClasses: 9,
    monthlySalary: 8000, // 8,000 BDT
    currency: "BDT",
    startDate: "2026-01-01",
    expectedPaymentDate: "2026-08-05",
    paymentStatus: "pending", // paid, pending, overdue
    cardColor: "#4F46E5",
    description: "Teaches 3 days a week (Sun, Tue, Thu) 5:00 PM - 6:30 PM. Focus on Board Exam question solving.",
    logs: [
      { id: "tl-1", date: "2026-07-02", duration: "1.5 hrs", topic: "Kinematics & Newton's Laws", status: "completed", notes: "Solved 15 creative questions." },
      { id: "tl-2", date: "2026-07-05", duration: "1.5 hrs", topic: "Work, Power & Energy", status: "completed", notes: "Formula drill completed." },
      { id: "tl-3", date: "2026-07-07", duration: "1.5 hrs", topic: "Gravitation & Vector Calculus", status: "completed", notes: "Good progress." },
      { id: "tl-4", date: "2026-07-09", duration: "1.5 hrs", topic: "General Math: Quadratic Equations", status: "completed", notes: "Homework given." },
      { id: "tl-5", date: "2026-07-12", duration: "1.5 hrs", topic: "Higher Math: Coordinate Geometry", status: "completed", notes: "Class test taken (scored 18/20)." },
      { id: "tl-6", date: "2026-07-14", duration: "1.5 hrs", topic: "Light Reflection & Lenses", status: "completed", notes: "Ray diagrams drawn." },
      { id: "tl-7", date: "2026-07-16", duration: "1.5 hrs", topic: "Current Electricity & Circuit Problems", status: "completed", notes: "Equivalent resistance practice." },
      { id: "tl-8", date: "2026-07-19", duration: "1.5 hrs", topic: "Higher Math: Trigonometric Ratios", status: "completed", notes: "Covered 7.1 to 7.3." },
      { id: "tl-9", date: "2026-07-21", duration: "1.5 hrs", topic: "SSC Model Test Paper 1 Review", status: "completed", notes: "Clarified doubts." }
    ]
  },
  {
    id: "tu-2",
    studentName: "Nusrat Jahan",
    subject: "ICT & Chemistry",
    classGrade: "HSC 1st Year",
    guardianContact: "+880 1819-123456 (Mrs. Jahan)",
    monthlyClasses: 10,
    completedClasses: 10,
    monthlySalary: 7500, // 7,500 BDT
    currency: "BDT",
    startDate: "2026-02-15",
    expectedPaymentDate: "2026-07-25",
    paymentStatus: "paid",
    cardColor: "#10B981",
    description: "Teaches 2 days a week (Mon, Wed) 6:45 PM - 8:15 PM.",
    logs: [
      { id: "tl-10", date: "2026-07-01", duration: "1.5 hrs", topic: "HTML & Web Design Basics", status: "completed", notes: "Practiced forms and tables." },
      { id: "tl-11", date: "2026-07-06", duration: "1.5 hrs", topic: "C Programming Control Structures", status: "completed", notes: "Looping concepts." },
      { id: "tl-12", date: "2026-07-08", duration: "1.5 hrs", topic: "Organic Chemistry: Hydrocarbons", status: "completed", notes: "Alkanes & Alkenes." },
      { id: "tl-13", date: "2026-07-13", duration: "1.5 hrs", topic: "C Programming Arrays & Strings", status: "completed", notes: "Code exercises." },
      { id: "tl-14", date: "2026-07-15", duration: "1.5 hrs", topic: "Chemical Bonding & Hybridization", status: "completed", notes: "sp2 sp3 orbital concepts." },
      { id: "tl-15", date: "2026-07-20", duration: "1.5 hrs", topic: "ICT Chapter 4 Full Exam", status: "completed", notes: "Scored 45/50!" },
      { id: "tl-16", date: "2026-07-22", duration: "1.5 hrs", topic: "Electrochemistry & Nernst Equation", status: "completed", notes: "Nernst equation numericals." }
    ]
  }
];

export const initialExpenses = {
  budgetLimit: 12000, // Monthly budget limit in BDT
  accounts: [
    { id: "acc-1", name: "bKash Mobile Banking", type: "mobile_banking", balance: 4250, accountNo: "017***9876", color: "#EC4899" },
    { id: "acc-2", name: "Dutch-Bangla Bank (DBBL)", type: "bank", balance: 14800, accountNo: "210.***.432", color: "#3B82F6" },
    { id: "acc-3", name: "Physical Wallet Cash", type: "cash", balance: 2150, accountNo: "Cash in Hand", color: "#10B981" },
    { id: "acc-4", name: "Student Visa Card", type: "card", balance: 3500, accountNo: "**** 8892", color: "#8B5CF6" }
  ],
  transactions: [
    { id: "tx-1", type: "income", title: "Tuition Fee Received - Nusrat", amount: 7500, category: "Tuition Income", accountId: "acc-1", date: "2026-07-25", notes: "Paid via bKash." },
    { id: "tx-2", type: "expense", title: "Semester Mess Dining Bill", amount: 3200, category: "Food & Mess", accountId: "acc-3", date: "2026-07-20", notes: "July Mess bill" },
    { id: "tx-3", type: "expense", title: "Database Systems Textbook Photocopy", amount: 450, category: "Academic Books", accountId: "acc-3", date: "2026-07-18", notes: "Campus library print" },
    { id: "tx-4", type: "expense", title: "Mobile Data Pack 30GB", amount: 399, category: "Internet & Bills", accountId: "acc-1", date: "2026-07-15", notes: "Robi Student Pack" },
    { id: "tx-5", type: "expense", title: "Train Ticket Home (Chittagong-Dhaka)", amount: 550, category: "Travel & Bus", accountId: "acc-2", date: "2026-07-10", notes: "Shohoz online ticket" },
    { id: "tx-6", type: "expense", title: "Cafeteria Snacks & Coffee", amount: 180, category: "Food & Mess", accountId: "acc-3", date: "2026-07-23", notes: "Evening study session" },
  ]
};

export const initialShortcuts = [
  { id: "sc-1", name: "ChatGPT 4o", url: "https://chatgpt.com", icon: "brain", color: "#10B981", category: "AI Tools", pinned: true },
  { id: "sc-2", name: "Claude AI", url: "https://claude.ai", icon: "sparkles", color: "#D97706", category: "AI Tools", pinned: true },
  { id: "sc-3", name: "Google Drive", url: "https://drive.google.com", icon: "hard-drive", color: "#3B82F6", category: "Academic Cloud", pinned: true },
  { id: "sc-4", name: "CUET University Portal", url: "https://cuet.ac.bd", icon: "graduation-cap", color: "#4F46E5", category: "University Portal", pinned: true },
  { id: "sc-5", name: "GitHub", url: "https://github.com", icon: "code", color: "#64748B", category: "Coding", pinned: false },
  { id: "sc-6", name: "Google Classroom / LMS", url: "https://classroom.google.com", icon: "book-open", color: "#059669", category: "Academic Cloud", pinned: false },
  { id: "sc-7", name: "Student Gmail", url: "https://mail.google.com", icon: "mail", color: "#EF4444", category: "Email", pinned: false },
  { id: "sc-8", name: "Overleaf LaTeX Editor", url: "https://www.overleaf.com", icon: "file-text", color: "#06B6D4", category: "Academic Cloud", pinned: false },
];

export const initialNotes = [
  {
    id: "note-1",
    title: "Database CT syllabus",
    content: "Chapter 14, 15, and 16. Revise B-trees, transaction management, and practice previous CT questions.",
    color: "amber",
    labels: ["academic", "ct"],
    pinned: true,
    archived: false,
    checklistMode: false,
    checklistItems: [],
    createdAt: "2026-07-23T10:00:00.000Z",
    updatedAt: "2026-07-25T18:15:00.000Z",
  },
  {
    id: "note-2",
    title: "Questions to ask faculty",
    content: "Clarify lab submission deadlines, attendance policy, and what to expect in the next assignment brief.",
    color: "sky",
    labels: ["faculty", "important"],
    pinned: false,
    archived: false,
    checklistMode: false,
    checklistItems: [],
    createdAt: "2026-07-24T09:20:00.000Z",
    updatedAt: "2026-07-24T16:40:00.000Z",
  },
  {
    id: "note-3",
    title: "Project feature ideas",
    content: "Dashboard widgets, quick note capture, weekly focus streaks, and a cleaner shortcut launcher with live previews.",
    color: "violet",
    labels: ["project", "ui"],
    pinned: false,
    archived: false,
    checklistMode: true,
    checklistItems: [
      { id: "n3-c1", text: "Hero summary cards", completed: true },
      { id: "n3-c2", text: "Shortcut preview", completed: true },
      { id: "n3-c3", text: "Medication tracker", completed: false },
    ],
    createdAt: "2026-07-22T11:45:00.000Z",
    updatedAt: "2026-07-26T08:10:00.000Z",
  },
  {
    id: "note-4",
    title: "Books to collect from library",
    content: "Database System Concepts, Computer Networks notes, and the software engineering reference book.",
    color: "emerald",
    labels: ["library", "reading"],
    pinned: false,
    archived: false,
    checklistMode: true,
    checklistItems: [
      { id: "n4-c1", text: "DBMS reference", completed: true },
      { id: "n4-c2", text: "Networks guide", completed: false },
      { id: "n4-c3", text: "SE workbook", completed: false },
    ],
    createdAt: "2026-07-21T15:10:00.000Z",
    updatedAt: "2026-07-25T07:30:00.000Z",
  },
];

export const initialMedications = [
  {
    id: "med-1",
    name: "Morning tablet",
    dosageText: "1 tablet after breakfast",
    form: "Tablet",
    instructions: "Take after breakfast with water.",
    description: "Daily morning reminder.",
    startDate: "2026-07-20",
    endDate: "2026-08-20",
    scheduleTimes: ["08:00"],
    selectedDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    status: "Active",
    color: "blue",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-25T08:30:00.000Z",
  },
  {
    id: "med-2",
    name: "Evening capsule",
    dosageText: "1 capsule after dinner",
    form: "Capsule",
    instructions: "Take after dinner.",
    description: "Evening reminder.",
    startDate: "2026-07-20",
    endDate: "2026-08-20",
    scheduleTimes: ["20:30"],
    selectedDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    status: "Active",
    color: "emerald",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-25T08:30:00.000Z",
  },
  {
    id: "med-3",
    name: "Eye drops",
    dosageText: "2 drops each eye",
    form: "Drops",
    instructions: "Use after long study sessions.",
    description: "Only when needed.",
    startDate: "2026-07-20",
    endDate: "2026-08-20",
    scheduleTimes: ["13:00"],
    selectedDays: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    status: "Active",
    color: "amber",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-25T08:30:00.000Z",
  },
];

export const initialTasks = [
  { id: "tk-1", title: "Submit Database ER Diagram Assignment", dueDate: "2026-07-25", priority: "high", category: "academic", completed: false, courseId: "CSE-311" },
  { id: "tk-2", title: "Prepare slides for Physics tuition topic: Lenses", dueDate: "2026-07-26", priority: "medium", category: "tuition", completed: false },
  { id: "tk-3", title: "Pay July Mess Bill to Hall Accountant", dueDate: "2026-07-27", priority: "medium", category: "finance", completed: true },
  { id: "tk-4", title: "Review Computer Networks Subnetting problems", dueDate: "2026-07-28", priority: "high", category: "academic", completed: false, courseId: "CSE-313" },
  { id: "tk-5", title: "Renew University Library Cards", dueDate: "2026-07-29", priority: "low", category: "personal", completed: false },
];

export const initialFocusData = {
  totalMinutesThisWeek: 420, // 7 hours
  sessionsCompletedThisWeek: 16,
  currentStreakDays: 5,
  dailyGoalMinutes: 90,
  history: [
    { date: "2026-07-20", minutes: 90, task: "Database Indexing Study" },
    { date: "2026-07-21", minutes: 75, task: "Computer Networks Packet Tracer" },
    { date: "2026-07-22", minutes: 120, task: "Software Engineering Agile Specs" },
    { date: "2026-07-23", minutes: 60, task: "Complex Integration Practice" },
    { date: "2026-07-24", minutes: 75, task: "SQL Lab Queries practice" },
  ]
};

export const mockQuotes = [
  { id: "q-1", quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { id: "q-2", quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { id: "q-3", quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { id: "q-4", quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { id: "q-5", quote: "Consistency is what transforms average into excellence.", author: "Anonymous" },
  { id: "q-6", quote: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
];
