// =====================================================================
// 📦 STATE MANAGEMENT MODULE
// Owns the dashboard's data schema, defaults, normalization, local
// storage fallback, and Firestore cloud sync (scoped to users/{uid}).
// `data` is exported as a live binding — importers can freely mutate
// its nested properties (data.salla.sales = 5) since that's the same
// pattern the rest of the app already relies on; only a full swap-out
// (import/reset/remote update) goes through setData().
// =====================================================================
import { db, doc, setDoc, onSnapshot, serverTimestamp } from "./firebase.js";

export const STORAGE_KEY = "creatorDashboardData_v2";
export const LEGACY_STORAGE_KEY = "creatorDashboardData_v1";
export const TABS = ['overview', 'revenue', 'fitness', 'projects', 'academic', 'dailyLog'];
export const SPLIT_ORDER = ['Push', 'Pull', 'Legs'];
export const GRADE_POINTS = { 'A+': 5, 'A': 4.75, 'B+': 4.5, 'B': 4, 'C+': 3.5, 'C': 3, 'D+': 2.5, 'D': 2, 'F': 0 };

// KFU CIS (0922) bilingual study plan — grouped by Year → Semester, with prerequisite codes.
export const STUDY_PLAN = [
  { year: 1, semesters: [
    { label: 'Semester 1', courses: [
      { code: '0814132', en: 'Physics', ar: 'فيزياء', credits: 4, pre: [] },
      { code: '0827111', en: 'Calculus', ar: 'التفاضل والتكامل', credits: 3, pre: [] },
      { code: '0921110', en: 'Intro to Computing', ar: 'مقدمة علم الحاسب', credits: 4, pre: [] },
      { code: '1722111', en: 'Academic English', ar: 'اللغة الإنجليزية الأكاديمية', credits: 3, pre: [] },
      { code: '1900101', en: 'Creed and Doctrines', ar: 'العقيدة والمذاهب', credits: 2, pre: [] },
    ]},
    { label: 'Semester 2', courses: [
      { code: '0603103', en: 'Business & Accounting', ar: 'إدارة المحاسبة والأعمال', credits: 3, pre: ['1722111'] },
      { code: '0826152', en: 'Biology', ar: 'علم الأحياء', credits: 3, pre: [] },
      { code: '0827121', en: 'Probability & Statistics', ar: 'الإحتمالات والإحصاء', credits: 3, pre: ['0827111'] },
      { code: '0827122', en: 'Discrete Mathematics', ar: 'الرياضيات المنفصلة', credits: 3, pre: ['0827111'] },
      { code: '0921120', en: 'Fundamentals of Programming', ar: 'مبادئ البرمجة', credits: 4, pre: ['0921110'] },
    ]},
  ]},
  { year: 2, semesters: [
    { label: 'Semester 1', courses: [
      { code: '0921210', en: 'OOP 1', ar: 'البرمجة كائنية التوجه 1', credits: 4, pre: ['0921120'] },
      { code: '0921211', en: 'Data Structure & Algorithms', ar: 'هيكلة البيانات والخوارزميات', credits: 4, pre: ['0921120', '0827122'] },
      { code: '0921212', en: 'Linear Algebra', ar: 'الجبر الخطي', credits: 3, pre: ['0827122'] },
      { code: '0924214', en: 'Fund. of Computer Networks', ar: 'أساسيات شبكات الحاسب', credits: 4, pre: ['0921110'] },
      { code: '1900102', en: 'Islamic Culture', ar: 'الثقافة الإسلامية', credits: 2, pre: [] },
    ]},
    { label: 'Semester 2', courses: [
      { code: '0922221', en: 'Requirements Engineering', ar: 'هندسة متطلبات البرمجيات', credits: 4, pre: ['0921210'] },
      { code: '0922222', en: 'Database Concepts & Design', ar: 'مفاهيم وتصميم قواعد البيانات', credits: 4, pre: ['0921211'] },
      { code: '0923223', en: 'Digital Logic & Design', ar: 'تصميم المنطق الرقمي', credits: 4, pre: ['0814132'] },
      { code: '0922224', en: 'Rapid Application Development', ar: 'التطوير السريع للتطبيقات', credits: 4, pre: ['0921210'] },
      { code: '1900-UE1', en: 'University Elective 1', ar: 'متطلب جامعة اختياري 1', credits: 2, pre: [] },
    ]},
  ]},
  { year: 3, semesters: [
    { label: 'Semester 1', courses: [
      { code: '0922310', en: 'Organization & Management', ar: 'تنظيم الأعمال والإدارة', credits: 3, pre: ['0603103'] },
      { code: '0922311', en: 'System Analysis & Design', ar: 'تحليل وتصميم نظم المعلومات', credits: 4, pre: ['0922221'] },
      { code: '0922312', en: 'Technical Reports', ar: 'كتابة التقارير التقنية', credits: 2, pre: ['1722111'] },
      { code: '0923313', en: 'Computer Org & Architecture', ar: 'معمارية وتنظيم الحاسب', credits: 4, pre: ['0923223'] },
      { code: '0922314', en: 'Web-based Systems', ar: 'النظم المبنية على الويب', credits: 4, pre: ['0922224'] },
    ]},
    { label: 'Semester 2', courses: [
      { code: '0921320', en: 'Computer Security', ar: 'أمن الحاسب', credits: 3, pre: ['0924214'] },
      { code: '0921321', en: 'Operating Systems', ar: 'نظم التشغيل', credits: 4, pre: ['0923313'] },
      { code: '0922322', en: 'Professional Responsibility', ar: 'المسؤولية المهنية', credits: 2, pre: ['0922312', '0826152'] },
      { code: '0922323', en: 'Database Management Systems', ar: 'إدارة وتقييم قواعد البيانات', credits: 4, pre: ['0921212', '0922222'] },
      { code: '0922324', en: 'IT Project Management', ar: 'إدارة مشروع تقنية المعلومات', credits: 3, pre: ['0922311'] },
    ]},
    { label: 'Summer', courses: [
      { code: '0922330', en: 'Practical Co-op Training', ar: 'التدريب التعاوني العملي', credits: 0, pre: [], creditPre: 95, gradable: false },
    ]},
  ]},
  { year: 4, semesters: [
    { label: 'Semester 1', courses: [
      { code: '0922410', en: 'Project Proposal', ar: 'مقترح مشروع', credits: 1, pre: [] },
      { code: '0922411', en: 'Info Security & Assurance', ar: 'أمن وتوكيد المعلومات', credits: 3, pre: ['0827121', '0921320'] },
      { code: '0922412', en: 'Enterprise Systems', ar: 'النظم المؤسسية', credits: 3, pre: ['0922310'] },
      { code: '1900-UE2', en: 'University Elective 2', ar: 'متطلب جامعة اختياري 2', credits: 2, pre: [] },
      { code: '0924-PE1', en: 'Program Elective 1', ar: 'متطلب تخصص اختياري 1', credits: 3, pre: [] },
    ]},
    { label: 'Semester 2', courses: [
      { code: '0922420', en: 'Project Implementation', ar: 'تنفيذ مشروع', credits: 2, pre: ['0922410'] },
      { code: '0922421', en: 'Selected Topics in IS', ar: 'موضوعات مختارة في نظم المعلومات', credits: 3, pre: ['0922410'] },
      { code: '0922422', en: 'Electronic Business', ar: 'الأعمال الإلكترونية', credits: 3, pre: ['0922310'] },
      { code: '0924-PE2', en: 'Program Elective 2', ar: 'متطلب تخصص اختياري 2', credits: 3, pre: [] },
      { code: '0924-PE3', en: 'Program Elective 3', ar: 'متطلب تخصص اختياري 3', credits: 3, pre: [] },
    ]},
  ]},
];

export function allPlanCourses(){
  const out = [];
  STUDY_PLAN.forEach(y => y.semesters.forEach(s => s.courses.forEach(c => {
    c.year = y.year;
    c.semLabel = s.label;
    out.push(c);
  })));
  return out;
}

/** Graduation Project (0922410/0922420) eligibility gate per the CIS 0922 study plan. */
export const GRADUATION_REQUIREMENTS = {
  minCredits: 95,
  required: ['0922314', '0922311'],
  requiredAnyOf: ['0922222', '0922323']
};

export const defaultData = {
  activeTab: 'overview',
  expenses: 0,
  expensesLog: [],
  salla: { sales: 0, fees: 0, orders: 0, aov: 0, refunds: 0, usernamesStock: 0 },
  donutSmp: { revenue: 0, spawners: 0, shulkers: 0 },
  water: { ml: 0, goal: 3500, lastDate: "" },
  steps: { count: 0, goal: 10000, lastDate: "" },
  supplements: {
    list: ["Vitamin D3", "Zinc", "Magnesium", "Omega-3"],
    checked: {},
    lastDate: ""
  },
  workout: {
    activeSplit: "Push",
    status: {
      Push: { completed: false, completedAt: null },
      Pull: { completed: false, completedAt: null },
      Legs: { completed: false, completedAt: null }
    },
    exercises: { Push: [], Pull: [], Legs: [] },
    cycles: []
  },
  cardio: { sessions: [] },
  projects: {
    academic: [],
    srsUml: [],
    python: []
  },
  academicModule: {
    kanban: { pending: [], inProgress: [], completed: [] },
    completedCourses: {}, // { courseCode: true } — completed study-plan courses (public, no grades)
    grades: {},      // { courseKey: 'A' } — PIN protected
    pinHash: null     // simple obfuscated PIN (not cryptographically secure)
  },
  // Visual habit tracker (Daily Log): { 'YYYY-MM-DD': { supplements: {Zinc:bool,...}, training: {Push:bool,...} } }
  habitLog: {}
};

export function todayStr(){
  return new Date().toISOString().slice(0, 10);
}

// Normalizes an arbitrary parsed object (from localStorage OR Firestore) into the current schema.
export function normalizeData(parsed){
  try {
    if(!parsed) return structuredClone(defaultData);
    const merged = structuredClone(defaultData);

    merged.activeTab = TABS.includes(parsed.activeTab) ? parsed.activeTab : 'overview';
    merged.expenses = Number(parsed.expenses) || 0;
    merged.expensesLog = Array.isArray(parsed.expensesLog) ? parsed.expensesLog : [];
    merged.salla = Object.assign({}, merged.salla, parsed.salla);
    merged.donutSmp = Object.assign({}, merged.donutSmp, parsed.donutSmp);

    merged.water.ml = Number(parsed.water && parsed.water.ml) || 0;
    merged.water.lastDate = (parsed.water && parsed.water.lastDate) || "";

    merged.steps.count = Number(parsed.steps && parsed.steps.count) || 0;
    merged.steps.lastDate = (parsed.steps && parsed.steps.lastDate) || "";

    merged.cardio = { sessions: (parsed.cardio && Array.isArray(parsed.cardio.sessions)) ? parsed.cardio.sessions : [] };

    merged.supplements = Object.assign({}, merged.supplements, parsed.supplements);
    if(!Array.isArray(merged.supplements.list) || !merged.supplements.list.length) merged.supplements.list = defaultData.supplements.list.slice();
    if(!merged.supplements.checked || typeof merged.supplements.checked !== 'object') merged.supplements.checked = {};

    if(parsed.workout){
      if(parsed.workout.status){
        SPLIT_ORDER.forEach(s => {
          if(parsed.workout.status[s]) merged.workout.status[s] = Object.assign({}, merged.workout.status[s], parsed.workout.status[s]);
        });
        if(parsed.workout.exercises){
          SPLIT_ORDER.forEach(s => {
            if(Array.isArray(parsed.workout.exercises[s])) merged.workout.exercises[s] = parsed.workout.exercises[s];
          });
        }
        if(Array.isArray(parsed.workout.cycles)) merged.workout.cycles = parsed.workout.cycles;
        if(SPLIT_ORDER.includes(parsed.workout.activeSplit)) merged.workout.activeSplit = parsed.workout.activeSplit;
      } else if(parsed.workout.logs){
        SPLIT_ORDER.forEach(s => {
          if(Array.isArray(parsed.workout.logs[s])) merged.workout.exercises[s] = parsed.workout.logs[s];
        });
      }
    }

    if(parsed.projects){
      merged.projects.academic = Array.isArray(parsed.projects.academic) ? parsed.projects.academic : [];
      merged.projects.srsUml = Array.isArray(parsed.projects.srsUml) ? parsed.projects.srsUml : [];
      merged.projects.python = Array.isArray(parsed.projects.python) ? parsed.projects.python : [];
    } else {
      const legacy = [];
      if(Array.isArray(parsed.todos)) legacy.push(...parsed.todos);
      if(Array.isArray(parsed.academicTasks)) legacy.push(...parsed.academicTasks);
      merged.projects.academic = legacy;
    }

    if(parsed.academicModule){
      const am = parsed.academicModule;
      if(am.kanban){
        ['pending','inProgress','completed'].forEach(k => {
          if(Array.isArray(am.kanban[k])) merged.academicModule.kanban[k] = am.kanban[k];
        });
      }
      const completedSrc = am.completedCourses || am.coreCourses; // migrate legacy field name
      if(completedSrc && typeof completedSrc === 'object') merged.academicModule.completedCourses = completedSrc;
      if(am.grades && typeof am.grades === 'object') merged.academicModule.grades = am.grades;
      if(am.pinHash) merged.academicModule.pinHash = am.pinHash;
    }

    if(parsed.habitLog && typeof parsed.habitLog === 'object') merged.habitLog = parsed.habitLog;

    return merged;
  } catch(e){
    console.warn("Failed to normalize data, using defaults", e);
    return structuredClone(defaultData);
  }
}

export function loadLocalData(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if(!raw) return structuredClone(defaultData);
    return normalizeData(JSON.parse(raw));
  } catch(e){
    console.warn("Failed to load local data, using defaults", e);
    return structuredClone(defaultData);
  }
}

export let data = structuredClone(defaultData);

/** Swap out the entire data object (import / reset / remote overwrite from outside this module). */
export function setData(newData){
  data = newData;
}

export function applyDailyResets(){
  const today = todayStr();
  let changed = false;
  if(data.water.lastDate !== today){ data.water.ml = 0; data.water.lastDate = today; changed = true; }
  if(data.steps.lastDate !== today){ data.steps.count = 0; data.steps.lastDate = today; changed = true; }
  if(data.supplements.lastDate !== today){ data.supplements.checked = {}; data.supplements.lastDate = today; changed = true; }
  if(changed) save();
}

// ---------- CLOUD SYNC (Firestore, scoped to users/{uid}) ----------
let currentUser = null;
let unsubscribeSnapshot = null;
let lastPushedJson = null;
let cloudSaveTimer = null;
let onRemoteUpdateCb = null;

function setSyncStatus(state){
  const icon = document.getElementById('syncIcon');
  const label = document.getElementById('syncLabel');
  if(!icon || !label) return;
  if(state === 'syncing'){
    icon.className = "fa-solid fa-arrows-rotate fa-spin text-accent2";
    label.textContent = "Syncing…";
  } else if(state === 'offline'){
    icon.className = "fa-solid fa-cloud-slash text-amber-400";
    label.textContent = "Offline (local only)";
  } else {
    icon.className = "fa-solid fa-cloud-arrow-up text-accent2";
    label.textContent = "Synced";
  }
}

/** Register a callback fired whenever a remote Firestore snapshot updates `data` in place. */
export function onRemoteUpdate(cb){
  onRemoteUpdateCb = cb;
}

export function setCurrentUser(uid){
  currentUser = uid;
}

export function clearCurrentUser(){
  currentUser = null;
  if(unsubscribeSnapshot){ unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  lastPushedJson = null;
}

export function attachCloudSync(uid){
  if(unsubscribeSnapshot) unsubscribeSnapshot();
  const ref = doc(db, 'users', uid);
  unsubscribeSnapshot = onSnapshot(ref, (snap) => {
    if(!snap.exists()){
      lastPushedJson = JSON.stringify(data);
      setDoc(ref, { state: data, updatedAt: serverTimestamp() }).catch(err => {
        console.warn("Initial cloud push failed (working offline):", err);
        setSyncStatus('offline');
      });
      setSyncStatus('synced');
      return;
    }
    const remoteState = snap.data().state;
    if(!remoteState) return;
    const remoteJson = JSON.stringify(remoteState);
    if(remoteJson === lastPushedJson) { setSyncStatus('synced'); return; }
    // Real-time update from another tab/device — merge and re-render instantly.
    data = normalizeData(remoteState);
    lastPushedJson = remoteJson;
    applyDailyResets();
    if(onRemoteUpdateCb) onRemoteUpdateCb();
    setSyncStatus('synced');
  }, (err) => {
    console.warn("Realtime sync error — continuing with local/offline data:", err);
    setSyncStatus('offline');
  });
}

function pushToCloud(){
  if(!currentUser) return;
  setSyncStatus('syncing');
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    lastPushedJson = JSON.stringify(data);
    setDoc(doc(db, 'users', currentUser.uid), { state: data, updatedAt: serverTimestamp() })
      .then(() => setSyncStatus('synced'))
      .catch(err => {
        console.warn("Cloud sync failed — data safely stored locally:", err);
        setSyncStatus('offline');
      });
  }, 350);
}

export function save(){
  // Always persist locally first (offline fallback), then push to the cloud when signed in.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  pushToCloud();
}
