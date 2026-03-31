function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    const app = document.getElementById('app');
    if (app) app.classList.remove('wide');
}


const memoryStore = new Map();
function memoryGetItem(key) {
    if (!memoryStore.has(key)) return null;
    return memoryStore.get(key);
}
function memorySetItem(key, value) {
    memoryStore.set(String(key), String(value));
}
function memoryRemoveItem(key) {
    memoryStore.delete(String(key));
}
function memoryClear() {
    memoryStore.clear();
}

const ADMIN_STUDENT_CODE = '12345';
const ADMIN_STUDENT_NAME = 'Nicolas';
const SELF_TRAINING_STUDENT_CODE = '77777';
const SELF_TRAINING_STUDENT_NAME = 'Diego';
const SELF_TRAINING_STUDENT_CODES = [SELF_TRAINING_STUDENT_CODE];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_AUTH_TOKEN_KEY = 'student_access_token_v1';
const TRAINER_SETTINGS_KEY = 'trainer_settings_v1';
let activeDashboardFilter = 'all';
let lastMainTrainerView = 'dashboard';
let trainerDrawerOpen = false;
let trainerRouteLock = false;

const DEMO_WORKOUT_BLOCKS = [
    {
        title: 'Treino A - Peito e Triceps',
        exercises: [
            { nome: 'Supino Reto Barra', series: '4', reps: '8', carga: '40', descanso: '60s', observacao: 'Controle a descida em 2 segundos.', substitutes: ['Supino Halter', 'Supino Maquina'], supersetWithNext: false },
            { nome: 'Crucifixo Inclinado', series: '3', reps: '12', carga: '14', descanso: '45s', observacao: 'Amplitude completa sem perder controle.', substitutes: ['Peck Deck'], supersetWithNext: false },
            { nome: 'Triceps Corda', series: '3', reps: '12', carga: '20', descanso: '45s', observacao: 'Cotovelos fixos ao lado do corpo.', substitutes: ['Triceps Barra V'], supersetWithNext: false }
        ]
    },
    {
        title: 'Treino B - Costas e Biceps',
        exercises: [
            { nome: 'Puxada Alta Frente', series: '4', reps: '10', carga: '45', descanso: '60s', observacao: 'Puxe para o peitoral mantendo tronco estavel.', substitutes: ['Puxada Neutra'], supersetWithNext: false },
            { nome: 'Remada Curvada', series: '3', reps: '10', carga: '35', descanso: '60s', observacao: 'Mantenha lombar neutra.', substitutes: ['Remada Serrote'], supersetWithNext: false },
            { nome: 'Rosca Direta', series: '3', reps: '12', carga: '20', descanso: '45s', observacao: 'Evite balancar o corpo.', substitutes: ['Rosca Alternada'], supersetWithNext: false }
        ]
    }
];

const DEMO_MEAL_BLOCKS = [
    {
        name: 'Cafe da Manha',
        items: [
            { nome: 'Ovos mexidos', qtd: '3 un', kcal: 240, prot: 18, carb: 2, gord: 16 },
            { nome: 'Aveia', qtd: '40 g', kcal: 154, prot: 5, carb: 26, gord: 3 }
        ]
    },
    {
        name: 'Almoco',
        items: [
            { nome: 'Frango grelhado', qtd: '180 g', kcal: 297, prot: 55, carb: 0, gord: 6 },
            { nome: 'Arroz', qtd: '140 g', kcal: 182, prot: 4, carb: 39, gord: 0 }
        ]
    }
];

function readStorageJSON(key, fallback = []) {
    try {
        const raw = memoryGetItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
        if (
            fallback &&
            typeof fallback === 'object' &&
            !Array.isArray(fallback) &&
            (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        ) {
            return fallback;
        }
        return parsed ? fallback;
    } catch (err) {
        console.warn(`Falha ao ler storage["${key}"]`, err);
        return fallback;
    }
}

function readStudentAuthToken() {
    return readStorageJSON(STUDENT_AUTH_TOKEN_KEY, null);
}

function saveStudentAuthToken(student) {
    if (!student || !student.id) return;
    const payload = {
        studentId: String(student.id),
        trainerCode: String(student.trainerCode || memoryGetItem('connectedTrainerCode') || ''),
        name: String(student.name || memoryGetItem('studentName') || 'Aluno'),
        issuedAt: new Date().toISOString()
    };
    memorySetItem(STUDENT_AUTH_TOKEN_KEY, JSON.stringify(payload));
}

function clearStudentAuthToken() {
    memoryRemoveItem(STUDENT_AUTH_TOKEN_KEY);
}

function openStudentDashboardSession(student, opts = {}) {
    if (!student || !student.id) return false;
    const studentDashboardScreen = document.getElementById('student-dashboard-screen');
    if (!studentDashboardScreen) return false;

    memorySetItem('currentStudentId', String(student.id));
    memorySetItem('studentName', String(student.name || 'Aluno'));
    memorySetItem('connectedTrainerCode', String(student.trainerCode || '00001'));

    if (opts.persistToken !== false) {
        saveStudentAuthToken(student);
    }

    hideAllScreens();
    const app = document.getElementById('app');
    if (app) app.classList.add('wide');
    studentDashboardScreen.classList.add('active');
    initStudentDashboard();
    switchStudentView('home');
    return true;
}

function tryAutoStudentLogin() {
    const token = readStudentAuthToken();
    if (!token || !token.studentId) return false;

    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => String(s.id) === String(token.studentId));
    if (!student) {
        clearStudentAuthToken();
        return false;
    }

    return openStudentDashboardSession(student, { persistToken: true });
}

function sanitizeUserInput(value, options = {}) {
    const allowNewlines = !!options.allowNewlines;
    const maxLen = Number.isFinite(options.maxLen) ? Number(options.maxLen) : 300;
    if (value === null || value === undefined) return '';

    let clean = String(value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/[<>`]/g, '');

    if (allowNewlines) {
        clean = clean.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
    } else {
        clean = clean.replace(/\s+/g, ' ');
    }

    clean = clean.trim();
    if (maxLen > 0) clean = clean.slice(0, maxLen);
    return clean;
}

function sanitizeEmailInput(value) {
    return sanitizeUserInput(value, { maxLen: 254 }).toLowerCase();
}

function sanitizeCodeInput(value, length = 5) {
    return String(value || '').replace(/\D/g, '').slice(0, length);
}

function sanitizeFormFields(form) {
    if (!(form instanceof HTMLFormElement)) return;

    const fields = form.querySelectorAll('input, textarea');
    fields.forEach((field) => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
        if (field.disabled || field.readOnly) return;
        if (field instanceof HTMLInputElement && (field.type === 'password' || field.type === 'file')) return;

        if (field instanceof HTMLInputElement && field.type === 'email') {
            field.value = sanitizeEmailInput(field.value);
            return;
        }

        if (field instanceof HTMLInputElement && field.type === 'tel') {
            const maxLength = field.maxLength > 0 ? field.maxLength : 20;
            field.value = String(field.value || '').replace(/\D/g, '').slice(0, maxLength);
            return;
        }

        if (field instanceof HTMLInputElement && field.type === 'number') {
            field.value = String(field.value || '').replace(/[^\d.,-]/g, '').trim();
            return;
        }

        if (field instanceof HTMLTextAreaElement) {
            field.value = sanitizeUserInput(field.value, { allowNewlines: true, maxLen: 2000 });
            return;
        }

        field.value = sanitizeUserInput(field.value, { maxLen: 180 });
    });
}

function optimizeMediaElements(root = document) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll('img').forEach((img) => {
        if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
        if (!img.getAttribute('width')) img.setAttribute('width', '320');
        if (!img.getAttribute('height')) img.setAttribute('height', '180');

        const srcAttr = String(img.getAttribute('src') || '').trim();
        if (srcAttr && !srcAttr.startsWith('data:') && /\.(png|jpe?g)(\?|$)/i.test(srcAttr)) {
            const webpSrc = toWebpCandidate(srcAttr);
            if (webpSrc && webpSrc !== srcAttr) {
                img.dataset.fallbackSrc = srcAttr;
                if (!img.dataset.webpUpgradeApplied) {
                    img.dataset.webpUpgradeApplied = '1';
                    img.addEventListener('error', () => {
                        const fallback = img.dataset.fallbackSrc;
                        if (!fallback || img.dataset.webpFallbackUsed === '1') return;
                        img.dataset.webpFallbackUsed = '1';
                        img.src = fallback;
                    });
                }
                img.setAttribute('src', webpSrc);
            }
        }
    });

    root.querySelectorAll('video').forEach((video) => {
        if (!video.getAttribute('preload')) video.setAttribute('preload', 'metadata');
        if (!video.getAttribute('playsinline')) video.setAttribute('playsinline', '');
    });
}

function getStartOfDay(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(fromDate, toDate) {
    const a = getStartOfDay(fromDate);
    const b = getStartOfDay(toDate);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function formatRelativeDays(days) {
    if (days === 0) return 'hoje';
    if (days === 1) return 'ha 1 dia';
    return `ha ${days} dias`;
}

function getLastWorkoutDateForStudent(student) {
    if (!student || !student.id) return null;
    const studentId = String(student.id);
    const history = readStorageJSON('workoutHistory', []);
    let last = null;
    history.forEach((entry) => {
        if (String(entry.ID_Usuario) !== studentId) return;
        const d = new Date(entry.Data_Treino || entry.date || entry.data);
        if (Number.isNaN(d.getTime())) return;
        if (!last || d > last) last = d;
    });
    if (student.lastWorkoutAt) {
        const fallback = new Date(student.lastWorkoutAt);
        if (!Number.isNaN(fallback.getTime())) {
            if (!last || fallback > last) last = fallback;
        }
    }
    return last;
}

function getStudentActivityMeta(student) {
    const last = getLastWorkoutDateForStudent(student);
    if (!last) {
        return {
            badgeClass: 'warning',
            statusText: 'Sem treino',
            lastWorkoutText: 'Ultimo treino: sem registros',
            days: null
        };
    }
    const days = Math.max(0, diffDays(last, new Date()));
    const alert = days > 5;
    return {
        badgeClass: alert ? 'alert' : 'active',
        statusText: alert ? 'Inativo/Alerta' : 'Ativo',
        lastWorkoutText: `Ultimo treino: ${formatRelativeDays(days)}`,
        days
    };
}

function studentHasWorkoutPlan(student) {
    if (!student || !Array.isArray(student.workoutBlocks)) return false;
    return student.workoutBlocks.some((block) => Array.isArray(block.exercises) && block.exercises.length > 0);
}

function getPendingDuvidaStudentIds(notifications) {
    const pendingSet = new Set();
    (notifications || []).forEach((n) => {
        if (n.type !== 'duvida') return;
        const isPending = n.unread || !n.reply;
        const sid = n.studentId || n.studentID || n.student || '';
        if (isPending && sid) pendingSet.add(String(sid));
    });
    return pendingSet;
}

function applyDashboardFilterList(students, filterKey, pendingDuvidaSet) {
    if (filterKey === 'sem-treino') {
        return students.filter((s) => !studentHasWorkoutPlan(s));
    }
    if (filterKey === 'avaliacoes') {
        return students.filter((s) => s.assessmentPending || s.pendingEvaluation);
    }
    if (filterKey === 'duvidas') {
        return students.filter((s) => pendingDuvidaSet.has(String(s.id)));
    }
    return students;
}

function updateDashboardFilterUI(counts) {
    const setCount = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    setCount('filter-count-all', counts.all);
    setCount('filter-count-sem-treino', counts.semTreino);
    setCount('filter-count-avaliacoes', counts.avaliacoes);
    setCount('filter-count-duvidas', counts.duvidas);

    document.querySelectorAll('.filter-chip').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.filter === activeDashboardFilter);
    });
}

function buildEngagementSeries() {
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        days.push({ key, label, date: d, count: 0 });
    }
    const history = readStorageJSON('workoutHistory', []);
    history.forEach((entry) => {
        const d = new Date(entry.Data_Treino || entry.date || entry.data);
        if (Number.isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        const match = days.find((x) => x.key === key);
        if (match) match.count += 1;
    });
    return days;
}

function renderEngagementChart() {
    const svg = document.getElementById('engagement-chart');
    const labels = document.getElementById('engagement-labels');
    const totalEl = document.getElementById('engagement-total');
    if (!svg || !labels || !totalEl) return;

    const series = buildEngagementSeries();
    const counts = series.map((d) => d.count);
    const total = counts.reduce((sum, val) => sum + val, 0);
    totalEl.textContent = total;

    const width = 300;
    const height = 120;
    const padding = 18;
    const maxVal = Math.max(...counts, 1);
    const xStep = (width - padding * 2) / (series.length - 1);
    const yScale = (height - padding * 2) / maxVal;

    const points = series.map((d, i) => {
        const x = padding + i * xStep;
        const y = height - padding - d.count * yScale;
        return { x, y, value: d.count };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = `
        <path class="engagement-area" d="${areaPath}"></path>
        <path class="engagement-line" d="${linePath}"></path>
        ${points.map(p => `<circle class="engagement-dot" cx="${p.x}" cy="${p.y}" r="3"></circle>`).join('')}
    `;

    labels.innerHTML = series.map((d) => `
        <div class="engagement-label">
            <span>${d.label}</span>
            <strong>${d.count}</strong>
        </div>
    `).join('');
}

function uiSvgIcon(name, className = '') {
    const icons = {
        'check-circle': '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M8 12.5l2.4 2.4L16 9.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
        'chart-line-up': '<path d="M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M6 14l3.3-3.3L12 13l6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
        'lightning': '<path d="M13 2L5 13h5l-1 9 8-11h-5l1-9z" fill="currentColor"></path>',
        'arrows-clockwise': '<path d="M20 8a8 8 0 0 0-13.7-4.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M7 3H4v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 16a8 8 0 0 0 13.7 4.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M17 21h3v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
        'trash': '<path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
        'check': '<path d="M6.8 12.5l3.1 3.1L17.4 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>',
        'circle': '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"></circle>',
        'plus': '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>',
        'trophy': '<path d="M8 4h8v2a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4z" fill="none" stroke="currentColor" stroke-width="2"></path><path d="M8 6H5a2 2 0 0 0 2 3M16 6h3a2 2 0 0 1-2 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M12 10v4M9 18h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
        'timer': '<circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M12 13V9m0 4 2.6 1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 3h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
        'x': '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>',
        'star': '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" fill="currentColor"></path>',
        'arrow-up-right': '<path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>',
        'protein': '<path d="M8 9.5c0-2.2 1.8-4 4-4h1.5c1.4 0 2.5 1.1 2.5 2.5V11c0 4.4-3.6 8-8 8-1.4 0-2.5-1.1-2.5-2.5V15c0-3 2.5-5.5 5.5-5.5h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
        'carb': '<path d="M5 14c0-3.3 2.7-6 6-6s6 2.7 6 6v1.5A3.5 3.5 0 0 1 13.5 19h-3A5.5 5.5 0 0 1 5 13.5V14z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path><path d="M8 10.5h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
        'fat': '<path d="M12 4c2.2 3 4.8 5.5 4.8 8.5A4.8 4.8 0 0 1 12 17.3a4.8 4.8 0 0 1-4.8-4.8C7.2 9.5 9.8 7 12 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>',
        // bottom nav / sidebar icons
        'nav-dashboard': '<rect x="4" y="4" width="7" height="7" rx="1.8"></rect><rect x="13" y="4" width="7" height="7" rx="1.8"></rect><rect x="4" y="13" width="7" height="7" rx="1.8"></rect><rect x="13" y="13" width="7" height="7" rx="1.8"></rect>',
        'nav-alunos': '<circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="9" r="3"></circle><path d="M4 19a4.5 4.5 0 0 1 9 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M13 18.5A4.5 4.5 0 0 1 20 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
        'nav-duvidas': '<path d="M5 5h14a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-4.5L10 21v-5.5H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path><circle cx="10" cy="10" r="1"></circle><circle cx="14" cy="10" r="1"></circle>',
        'nav-exercicios': '<path d="M4 10h3l2-3h6l2 3h3v4h-3l-2 3H9l-2-3H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path><path d="M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
        'nav-avaliacoes': '<rect x="5" y="4" width="14" height="16" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"></rect><path d="M9 4v3m6-3v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M8 11h8m-8 4h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
        'nav-config': '<circle cx="12" cy="12" r="3.2"></circle><path d="M4.5 12.8l1.1 1.9-1 1.8 2 2 1.8-1 1.9 1.1h2.4l1.9-1.1 1.8 1 2-2-1-1.8 1.1-1.9v-2.4l-1.1-1.9 1-1.8-2-2-1.8 1-1.9-1.1h-2.4L8.4 4l-1.8-1-2 2 1 1.8-1.1 1.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>',
        'nav-logout': '<path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M15 16l4-4-4-4m4 4H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>'
    };
    const inner = icons[name];
    if (!inner) return '';
    return `<svg class="ui-svg-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
}

function triggerHaptic(durationMs = 20) {
    try {
        if (window.navigator && typeof window.navigator.vibrate === 'function') {
            window.navigator.vibrate(durationMs);
        }
    } catch {
        // ignora erros de vibração
    }
}

async function scheduleCompletedWorkoutSync() {
    try {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-completed-workouts');
    } catch {
        // falha silenciosa; o app continua funcionando offline-first
    }
}

function upgradeSidebarNavIcons() {
    try {
        const trainerSidebar = document.querySelector('#trainer-dashboard-screen .sidebar');
        if (!trainerSidebar) return;

        const mapping = {
            'nav-dashboard': 'nav-dashboard',
            'nav-alunos': 'nav-alunos',
            'nav-duvidas': 'nav-duvidas',
            'nav-exercicios': 'nav-exercicios'
        };

        Object.entries(mapping).forEach(([id, iconName]) => {
            const item = document.getElementById(id);
            if (!item) return;
            const iEl = item.querySelector('i');
            if (!iEl) return;
            const wrapper = document.createElement('span');
            wrapper.innerHTML = uiSvgIcon(iconName);
            const svg = wrapper.firstElementChild;
            if (svg) iEl.replaceWith(svg);
        });

        const extraMap = [
            { selector: '.sidebar-nav .nav-item:nth-of-type(5) i', icon: 'nav-avaliacoes' },
            { selector: '.sidebar-nav .nav-item:nth-of-type(6) i', icon: 'nav-config' },
            { selector: '.sidebar-footer .btn-logout i', icon: 'nav-logout' }
        ];

        extraMap.forEach(({ selector, icon }) => {
            const iEl = trainerSidebar.querySelector(selector);
            if (!iEl) return;
            const wrapper = document.createElement('span');
            wrapper.innerHTML = uiSvgIcon(icon);
            const svg = wrapper.firstElementChild;
            if (svg) iEl.replaceWith(svg);
        });
    } catch {
        // fail silently to avoid breaking app
    }
}

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const btn = document.getElementById('install-app-btn');
    if (btn) {
        btn.style.display = 'inline-flex';
    }
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('install-app-btn');
    if (btn) {
        btn.style.display = 'none';
    }
});

function setupInstallButton() {
    const btn = document.getElementById('install-app-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            btn.style.display = 'none';
            return;
        }
        try {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
                btn.style.display = 'none';
            }
        } catch {
            // ignore
        } finally {
            deferredInstallPrompt = null;
        }
    });
}

function validateFormFields(form) {
    if (!(form instanceof HTMLFormElement)) return true;

    const emailFields = form.querySelectorAll('input[type="email"]');
    for (const emailField of emailFields) {
        if (!(emailField instanceof HTMLInputElement)) continue;
        const value = sanitizeEmailInput(emailField.value);
        emailField.value = value;
        if (value && !EMAIL_REGEX.test(value)) {
            emailField.setCustomValidity('Informe um e-mail válido.');
            emailField.reportValidity();
            return false;
        }
        emailField.setCustomValidity('');
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    return true;
}

function setupClientSideFormProtection() {
    if (document.documentElement.dataset.formsGuardInit === '1') return;
    document.documentElement.dataset.formsGuardInit = '1';

    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;

        sanitizeFormFields(form);
        const isValid = validateFormFields(form);
        if (!isValid) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}

function studentCanEditWorkout(student) {
    const id = String(student?.id || '');
    return SELF_TRAINING_STUDENT_CODES.includes(id);
}

function ensureSelfTrainingStudent() {
    const students = readStorageJSON('trainerStudents', []);
    const nowIso = new Date().toISOString();
    const selfLastWorkout = new Date();
    selfLastWorkout.setDate(selfLastWorkout.getDate() - 6);
    const baselineMetric = {
        date: nowIso,
        weight: 82,
        bodyFat: 18,
        height: 178
    };
    const defaultWorkoutBlocks = JSON.parse(JSON.stringify(DEMO_WORKOUT_BLOCKS));

    const selfStudent = {
        id: SELF_TRAINING_STUDENT_CODE,
        name: SELF_TRAINING_STUDENT_NAME,
        age: '29',
        gender: 'M',
        goal: 'Auto Treino',
        weight: '82',
        height: '178',
        bodyFat: '18',
        status: 'Ativo',
        active: true,
        pending: false,
        dailyKcal: 2600,
        trainerCode: '00001',
        workoutBlocks: defaultWorkoutBlocks,
        mealBlocks: JSON.parse(JSON.stringify(DEMO_MEAL_BLOCKS)),
        lastWorkoutAt: selfLastWorkout.toISOString(),
        assessmentPending: false,
        metricHistory: [baselineMetric],
        progressLogs: [{ date: new Date().toISOString().slice(0, 10), weight: 82, notes: 'Perfil Diego auto-treino.' }],
        personalRecords: {}
    };
    selfStudent.tmbBase = Math.round(calcTMBMifflin(selfStudent.weight, selfStudent.height, selfStudent.age, selfStudent.gender));

    const idx = students.findIndex(s => s.id === SELF_TRAINING_STUDENT_CODE);
    if (idx === -1) {
        students.push(selfStudent);
    } else {
        const current = students[idx] || {};
        students[idx] = {
            ...selfStudent,
            ...current,
            id: SELF_TRAINING_STUDENT_CODE,
            name: SELF_TRAINING_STUDENT_NAME,
            active: true,
            pending: false,
            trainerCode: current.trainerCode || '00001',
            lastWorkoutAt: current.lastWorkoutAt || selfLastWorkout.toISOString(),
            assessmentPending: current.assessmentPending ? false,
            workoutBlocks: Array.isArray(current.workoutBlocks) && current.workoutBlocks.length > 0
                ? current.workoutBlocks
                : defaultWorkoutBlocks,
            mealBlocks: Array.isArray(current.mealBlocks) && current.mealBlocks.length > 0
                ? current.mealBlocks
                : JSON.parse(JSON.stringify(DEMO_MEAL_BLOCKS))
        };
    }

    memorySetItem('trainerStudents', JSON.stringify(students));
}

function ensureAdminStudent() {
    const students = readStorageJSON('trainerStudents', []);
    const nowIso = new Date().toISOString();
    const adminLastWorkout = new Date();
    adminLastWorkout.setDate(adminLastWorkout.getDate() - 3);
    const baselineMetric = {
        date: nowIso,
        weight: 78,
        bodyFat: 17,
        height: 178
    };

    const demoStudent = {
        id: ADMIN_STUDENT_CODE,
        name: ADMIN_STUDENT_NAME,
        age: '28',
        gender: 'M',
        goal: 'Hipertrofia',
        weight: '78',
        height: '178',
        bodyFat: '17',
        status: 'Ativo',
        active: true,
        pending: false,
        dailyKcal: 2500,
        trainerCode: '00001',
        workoutBlocks: DEMO_WORKOUT_BLOCKS,
        mealBlocks: DEMO_MEAL_BLOCKS,
        lastWorkoutAt: adminLastWorkout.toISOString(),
        assessmentPending: true,
        metricHistory: [baselineMetric],
        progressLogs: [{ date: new Date().toISOString().slice(0, 10), weight: 78, notes: 'Perfil demo Beta inicial.' }],
        personalRecords: {}
    };
    demoStudent.tmbBase = Math.round(calcTMBMifflin(demoStudent.weight, demoStudent.height, demoStudent.age, demoStudent.gender));

    const idx = students.findIndex(s => s.id === ADMIN_STUDENT_CODE);
    if (idx === -1) {
        students.push(demoStudent);
    } else {
        const current = students[idx] || {};
        students[idx] = {
            ...demoStudent,
            ...current,
            id: ADMIN_STUDENT_CODE,
            name: ADMIN_STUDENT_NAME,
            active: true,
            pending: false,
            trainerCode: current.trainerCode || '00001',
            lastWorkoutAt: current.lastWorkoutAt || adminLastWorkout.toISOString(),
            assessmentPending: current.assessmentPending ? true,
            workoutBlocks: Array.isArray(current.workoutBlocks) && current.workoutBlocks.length > 0 ? current.workoutBlocks : DEMO_WORKOUT_BLOCKS,
            mealBlocks: Array.isArray(current.mealBlocks) && current.mealBlocks.length > 0 ? current.mealBlocks : DEMO_MEAL_BLOCKS,
            metricHistory: Array.isArray(current.metricHistory) && current.metricHistory.length > 0 ? current.metricHistory : [baselineMetric]
        };
    }

    memorySetItem('trainerStudents', JSON.stringify(students));
}

function goToHome() {
    // Keep remember-me token, clear only active session data.
    memoryRemoveItem('currentStudentId');
    memoryRemoveItem('connectedTrainerCode');
    memoryRemoveItem('studentName');
    hideAllScreens();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('active');
}

function logout() {
    if (workoutState && !confirmExitActiveWorkout()) return;
    if (confirm('Deseja realmente sair?')) {
        memoryClear();
        location.reload(); // Hard refresh to clear state
    }
}

// -------------------------------
// Supabase Sync (multi-device)
// -------------------------------
const SYNC_KEYS = [
    'trainerStudents',
    'workoutHistory',
    'trainerNotifications',
    'allTrainers',
    'registeredUsers',
    'customExercises',
    'trainer_settings_v1'
];
const APP_STATE_SYNC_ENABLED = false;

let syncPushTimer = null;
let syncPullTimer = null;
let syncPullInFlight = false;
let isApplyingRemoteState = false;
let supabaseStudentsPollTimer = null;

function isSupabaseReady() {
    return typeof window.supabase?.from === 'function';
}


const SUPABASE_TABLES = {
    trainers: 'trainers',
    students: 'students'
};

let supabaseStudentsSyncTimer = null;

function normalizeStudentRow(row) {
    if (!row) return null;
    const student = row.data && typeof row.data === 'object' ? row.data : {};
    student.id = student.id || row.id || '';
    student.trainerCode = student.trainerCode || row.trainer_code || '';
    return student;
}

async function getTrainerByCodeRemote(code) {
    if (!isSupabaseReady() || !code) return null;
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.trainers)
        .select('*')
        .eq('code', String(code))
        .maybeSingle();
    if (error) {
        console.warn('Supabase trainer fetch failed', error.message);
        return null;
    }
    return data || null;
}

async function ensureTrainerExistsRemote(code, fallbackName = 'Treinador', fallbackConsultoria = '') {
    if (!isSupabaseReady() || !code) return null;
    const existing = await getTrainerByCodeRemote(code);
    if (existing) return existing;
    const row = {
        code: String(code),
        name: fallbackName,
        consultoria_name: fallbackConsultoria,
        services: 'treino',
        updated_at: new Date().toISOString()
    };
    const { error } = await window.supabase
        .from(SUPABASE_TABLES.trainers)
        .upsert(row, { onConflict: 'code' });
    if (error) {
        console.warn('Supabase trainer upsert failed', error.message);
        return null;
    }
    return row;
}

async function syncStudentsFromSupabase(trainerCode) {
    if (!isSupabaseReady() || !trainerCode) return;
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.students)
        .select('*')
        .eq('trainer_code', String(trainerCode));
    if (error) {
        console.warn('Supabase students sync failed', error.message);
        return;
    }
    if (!data) return;
    const students = data.map(normalizeStudentRow).filter(Boolean);
    
    if (isSupabaseReady()) {
        const fallbackName = pendingTrainerCode === '00001' ? 'Administrador Teste' : 'Treinador';
        const fallbackConsultoria = fallbackName ? `Consultoria de ${fallbackName.split(' ')[0]} ` : '';
        await ensureTrainerExistsRemote(pendingTrainerCode, fallbackName, fallbackConsultoria);
    }

saveStudentData(students);
    renderStudents();
    renderPendingRequests();
    updateTrainerStats();
}

function queueSupabaseStudentsSync(students) {
    if (!isSupabaseReady()) return;
    if (supabaseStudentsSyncTimer) clearTimeout(supabaseStudentsSyncTimer);
    const payload = JSON.parse(JSON.stringify(students || []));
    supabaseStudentsSyncTimer = setTimeout(async () => {
        const rows = payload.map((student) => ({
            id: String(student.id || ''),
            trainer_code: String(student.trainerCode || student.trainer_code || ''),
            data: student,
            updated_at: new Date().toISOString()
        })).filter((row) => row.id);
        if (rows.length === 0) return;
        const { error } = await window.supabase
            .from(SUPABASE_TABLES.students)
            .upsert(rows, { onConflict: 'id' });
        if (error) console.warn('Supabase students upsert failed', error.message);
    }, 400);
}

function getActiveSyncTrainerCode() {
    return (
        memoryGetItem('currentTrainerCode') ||
        memoryGetItem('connectedTrainerCode') ||
        memoryGetItem('trainerCodeDefault') ||
        ''
    );
}

function getLocalStateUpdatedAt() {
    return memoryGetItem('app_state_updated_at') || '';
}

function setLocalStateUpdatedAt(ts) {
    if (ts) memorySetItem('app_state_updated_at', ts);
}

function getLocalSyncPayload() {
    const payload = {};
    SYNC_KEYS.forEach((key) => {
        const raw = memoryGetItem(key);
        if (raw === null || raw === undefined) return;
        try {
            payload[key] = JSON.parse(raw);
        } catch {
            payload[key] = raw;
        }
    });
    return payload;
}

function setStorageValue(key, value) {
    if (value === undefined) return;
    if (typeof value === 'string') {
        memorySetItem(key, value);
    } else {
        memorySetItem(key, JSON.stringify(value));
    }
}

function applyRemotePayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    isApplyingRemoteState = true;
    SYNC_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            setStorageValue(key, payload[key]);
        }
    });
    isApplyingRemoteState = false;
    handleRemoteStateApplied();
}

async function pushAppState(reason = '') {
    if (!APP_STATE_SYNC_ENABLED) return;
    if (!isSupabaseReady()) return;
    const trainerCode = getActiveSyncTrainerCode();
    if (!trainerCode) return;

    const payload = getLocalSyncPayload();
    const now = new Date().toISOString();
    setLocalStateUpdatedAt(now);

    try {
        const { error } = await window.supabase
            .from('app_state')
            .upsert({
                trainer_code: trainerCode,
                payload,
                updated_at: now
            }, { onConflict: 'trainer_code' });

        if (error) {
            console.warn('Falha ao sincronizar com Supabase', reason, error);
        }
    } catch (e) {
        console.warn('Falha ao sincronizar com Supabase', reason, e);
    }
}

async function pullAppStateIfNewer() {
    if (!APP_STATE_SYNC_ENABLED) return;
    if (!isSupabaseReady()) return;
    if (syncPullInFlight) return;
    const trainerCode = getActiveSyncTrainerCode();
    if (!trainerCode) return;
    syncPullInFlight = true;

    try {
        const { data, error } = await window.supabase
            .from('app_state')
            .select('payload, updated_at')
            .eq('trainer_code', trainerCode)
            .maybeSingle();

        if (error) {
            console.warn('Falha ao puxar estado remoto', error);
            syncPullInFlight = false;
            return;
        }

        if (!data) {
            await pushAppState('seed');
            syncPullInFlight = false;
            return;
        }

        const remoteUpdated = data.updated_at || '';
        const localUpdated = getLocalStateUpdatedAt();
        if (!localUpdated || (remoteUpdated && new Date(remoteUpdated) > new Date(localUpdated))) {
            applyRemotePayload(data.payload || {});
            setLocalStateUpdatedAt(remoteUpdated);
        }
    } catch (e) {
        console.warn('Falha ao puxar estado remoto', e);
    } finally {
        syncPullInFlight = false;
    }
}

function scheduleRemoteSync(reason = '') {
    if (!APP_STATE_SYNC_ENABLED) return;
    if (!isSupabaseReady()) return;
    if (syncPushTimer) clearTimeout(syncPushTimer);
    syncPushTimer = setTimeout(() => pushAppState(reason), 800);
}

function startSyncPolling() {
    if (!APP_STATE_SYNC_ENABLED) return;
    if (!isSupabaseReady()) return;
    if (syncPullTimer) return;
    syncPullTimer = setInterval(() => {
        pullAppStateIfNewer();
    }, 20000);
}

function handleRemoteStateApplied() {
    // Trainer dashboard refresh
    if (document.getElementById('dash-stats-grid')) {
        updateTrainerStats();
        renderStudents();
        renderPendingRequests();
    }

    // Trainer profile refresh
    const profileScreen = document.getElementById('trainer-student-profile-screen');
    if (profileScreen && profileScreen.classList.contains('active') && currentStudentIdx !== null) {
        const students = readStorageJSON('trainerStudents', []);
        if (students[currentStudentIdx]) {
            workoutBlocks = students[currentStudentIdx].workoutBlocks || [];
            mealBlocks = students[currentStudentIdx].mealBlocks || [];
            renderWorkouts();
            renderMeals();
            if (currentTrainerStudentId) {
                renderTrainerWorkoutHistory(currentTrainerStudentId);
            }
        }
    }

    // Student dashboard refresh
    const studentDash = document.getElementById('student-dashboard-screen');
    if (studentDash && studentDash.classList.contains('active')) {
        initStudentDashboard();
        const workoutScreen = document.getElementById('student-workout-screen');
        const dietScreen = document.getElementById('student-diet-screen');
        if (workoutScreen && workoutScreen.classList.contains('active')) openStudentWorkout();
        if (dietScreen && dietScreen.classList.contains('active')) openStudentDiet();
    }
}

if (!window.__syncPatched) {
    const originalSetItem = memorySetItem;
    const originalRemoveItem = memoryRemoveItem;

    memorySetItem = (key, value) => {
        originalSetItem(key, value);
        if (SYNC_KEYS.includes(key) && !isApplyingRemoteState) scheduleRemoteSync(`set:${key}`);
    };

    memoryRemoveItem = (key) => {
        originalRemoveItem(key);
        if (SYNC_KEYS.includes(key) && !isApplyingRemoteState) scheduleRemoteSync(`remove:${key}`);
    };

    window.__syncPatched = true;
}

// â”€â”€â”€ Real-Time Sync (Cross-Tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const syncChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('consultoria_sync')
    : { postMessage: () => { }, onmessage: null };

syncChannel.onmessage = (event) => {
    const { type, payload } = event.data;

    // Refresh UI based on message type
    if (type === 'NEW_DOUBT') {
        if (typeof updateTrainerStats === 'function') updateTrainerStats();
        if (typeof renderDuvidas === 'function') renderDuvidas();
    }
    if (type === 'DOUBT_RESOLVED') {
        if (typeof updateTrainerStats === 'function') updateTrainerStats();
        if (typeof renderDuvidas === 'function') renderDuvidas();
    }
    if (type === 'DOUBT_REPLY') {
        if (typeof updateTrainerStats === 'function') updateTrainerStats();
        if (typeof renderDuvidas === 'function') renderDuvidas();

        // If student matches, refresh their view
        const currentStudentId = memoryGetItem('currentStudentId');
        if (currentStudentId) {
            // Re-render workout landing to show replies
            if (typeof renderStudentWorkoutMain === 'function') {
                renderStudentWorkoutMain();
                // If on landing, refresh it
                const landing = document.getElementById('treino-landing');
                if (landing && landing.style.display !== 'none') {
                    switchTreinoSubview('landing');
                }
            }
        }
    }
    if (type === 'STUDENT_ACCEPTED' || type === 'STUDENT_REJECTED') {
        if (typeof updateTrainerStats === 'function') updateTrainerStats();
        // If student is logged in, they might need to see the "Ready" status
        const studentId = memoryGetItem('currentStudentId');
        if (studentId) {
            initStudentDashboard();
        }
    }
};

async function loadSPAComponents() {
    const containers = document.querySelectorAll('[data-page]');
    const promises = Array.from(containers).map(async (container) => {
        const url = container.getAttribute('data-page');
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const html = await res.text();
            container.outerHTML = html;
        } catch (e) {
            console.error('Error loading component:', url, e);
        }
    });
    await Promise.all(promises);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSPAComponents();
    setupClientSideFormProtection();
    ensureAdminStudent();
    ensureSelfTrainingStudent();
    applyTrainerBranding();
    upgradeSidebarNavIcons();
    setupInstallButton();
    setupWorkoutExitGuard();

    // Haptic para ações de salvar plano, quando existirem
    document.addEventListener('click', (event) => {
        const saveBtn = event.target.closest('.btn-save-plan');
        if (saveBtn) {
            triggerHaptic(25);
        }
    });

    // Prevent # anchors from jumping the page in app navigation
    document.querySelectorAll('.sidebar-nav .nav-item[href="#"]').forEach((link) => {
        if (link.dataset.preventInit === '1') return;
        link.addEventListener('click', (evt) => evt.preventDefault());
        link.dataset.preventInit = '1';
    });

    optimizeMediaElements(document);

    // Fast path: remember-me token (auto-login instantâneo)
    if (tryAutoStudentLogin()) return;

    // Legacy fallback for sessions without token
    const studentId = memoryGetItem('currentStudentId');
    if (studentId) {
        const students = readStorageJSON('trainerStudents', []);
        const legacyStudent = students.find(s => String(s.id) === String(studentId));
        if (legacyStudent) {
            if (openStudentDashboardSession(legacyStudent, { persistToken: true })) {
                return;
            }
        }
        memoryRemoveItem('currentStudentId');
        memoryRemoveItem('connectedTrainerCode');
        memoryRemoveItem('studentName');
    }

    const home = document.getElementById('home-screen');
    if (home) {
        hideAllScreens();
        home.classList.add('active');
    }
});

// â”€â”€â”€ Real-Time Sync (Cross-Tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.addEventListener('storage', (e) => {
    // Sync Trainer Dashboard
    if (e.key === 'trainerStudents' || e.key === 'trainerNotifications') {
        // If we are on trainer dashboard (identified by presence of specific elements)
        if (document.getElementById('dash-stats-grid')) {
            updateTrainerStats();
            renderStudents();
            renderPendingRequests();

            // If a profile is open, refresh its data too
            if (currentStudentIdx !== null) {
                const students = readStorageJSON('trainerStudents', []);
                if (students[currentStudentIdx]) {
                    // Update global cached blocks before re-rendering
                    workoutBlocks = students[currentStudentIdx].workoutBlocks || [];
                    mealBlocks = students[currentStudentIdx].mealBlocks || [];
                    renderWorkouts();
                    renderMeals();
                }
            }
        }
    }

    if (e.key === 'workoutHistory') {
        const profileScreen = document.getElementById('trainer-student-profile-screen');
        if (profileScreen && profileScreen.classList.contains('active') && currentTrainerStudentId) {
            renderTrainerWorkoutHistory(currentTrainerStudentId);
        }
    }

    // Sync Student Dashboard
    if (e.key === 'trainerStudents') {
        const studentId = memoryGetItem('currentStudentId');
        const studentDash = document.getElementById('student-dashboard-screen');
        if (studentId && studentDash && studentDash.classList.contains('active')) {
            initStudentDashboard();

            // If detail views are open, they will be refreshed next time they open, 
            // but we can also trigger a refresh if they are currently visible
            const workoutScreen = document.getElementById('student-workout-screen');
            const dietScreen = document.getElementById('student-diet-screen');
            if (workoutScreen && workoutScreen.classList.contains('active')) openStudentWorkout();
            if (dietScreen && dietScreen.classList.contains('active')) openStudentDiet();
        }
    }
});

function copyAccessCode(elementId, btnId) {
    const code = document.getElementById(elementId)?.innerText;
    if (!code) return;

    const applyCopiedFeedback = () => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-check" style="color:#22c55e"></i>';
            setTimeout(() => {
                btn.innerHTML = originalIcon;
            }, 2000);
        }
    };

    const fallbackCopy = () => {
        const temp = document.createElement('textarea');
        temp.value = code;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        applyCopiedFeedback();
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(applyCopiedFeedback).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
}

// Alias for trainer dashboard
function copyTrainerCode(event) {
    if (event) event.stopPropagation();
    copyAccessCode('dash-trainer-code', 'btn-copy-code-menu');
}

function toggleTrainerProfileMenu(event) {
    if (event) event.stopPropagation();
    const overlay = document.getElementById('trainer-profile-sheet-overlay');
    const menu = document.getElementById('trainer-profile-menu');
    if (!overlay || !menu) return;

    const isOpen = menu.classList.contains('active');
    if (isOpen) {
        closeTrainerProfileMenu();
        return;
    }

    overlay.style.display = 'block';
    menu.style.display = 'block';
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        menu.classList.add('active');
    });
}

function closeTrainerProfileMenu() {
    const overlay = document.getElementById('trainer-profile-sheet-overlay');
    const menu = document.getElementById('trainer-profile-menu');
    if (!overlay || !menu) return;

    overlay.classList.remove('active');
    menu.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
        menu.style.display = 'none';
    }, 220);
}

function logoutTrainerFromMenu() {
    memoryRemoveItem('trainerSessionCode');
    memoryRemoveItem('trainerName');
    memoryRemoveItem('currentTrainerCode');
    window.location.href = 'index.html';
}

function editTrainerProfile() {
    const trainerName = memoryGetItem('trainerName') || 'Treinador';
    const trainerCode = memoryGetItem('currentTrainerCode') || '00001';

    alert(`✏️ Editar Perfil\n\nNome: ${trainerName}\nCódigo: ${trainerCode}\n\nEsta funcionalidade será implementada em breve.`);
    closeTrainerProfileMenu();
}

function viewTrainerStats() {
    const students = readStorageJSON('trainerStudents', []);
    const trainerCode = memoryGetItem('currentTrainerCode') || '00001';
    const myStudents = students.filter(s => s.trainerCode === trainerCode);

    const total = myStudents.length;
    const active = myStudents.filter(s => s.active).length;
    const pending = myStudents.filter(s => s.pending).length;

    alert(`📊 Estatísticas\n\nTotal de Alunos: ${total}\nAtivos: ${active}\nPendentes: ${pending}\n\nVisita a aba "Alunos" para gerenciar.`);
    closeTrainerProfileMenu();
    switchDashView('alunos');
}

function shareTrainerCode() {
    const trainerCode = memoryGetItem('currentTrainerCode') || '00001';
    const message = `Meu código de consultoria: ${trainerCode}\n\nJunte-se ao meu programa de treino e nutrição!`;

    if (navigator.share) {
        navigator.share({
            title: 'Código de Consultoria',
            text: message
        });
    } else {
        alert(`📤 Código para compartilhar:\n\n${trainerCode}\n\nCopie este código e compartilhe com seus alunos.`);
    }
    closeTrainerProfileMenu();
}

function goToStudentArea() {
    hideAllScreens();
    const studentScreen = document.getElementById('student-screen');
    if (studentScreen) studentScreen.classList.add('active');
}

function goToGlobalLogin() {
    goToStudentArea();
}

function goToProfileCreate() {
    hideAllScreens();
    const profileCreateScreen = document.getElementById('profile-create-screen');
    if (profileCreateScreen) profileCreateScreen.classList.add('active');
}

function openTrainerArea() {
    window.location.href = 'trainer.html';
}

function toggleElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// â”€â”€â”€ Authentication Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function handleEmailLogin() {
    const email = sanitizeEmailInput(document.getElementById('login-email')?.value);
    const pass = document.getElementById('login-pass').value;

    if (!EMAIL_REGEX.test(email)) {
        alert('Informe um e-mail válido.');
        return;
    }

    const users = readStorageJSON('registeredUsers', []);
    const user = users.find(u => String(u.email || '').trim().toLowerCase() === email && u.password === pass);

    if (user) {
        processLogin(user);
    } else {
        alert('E-mail ou senha incorretos.');
    }
}

function handleProfileCreation() {
    const name = sanitizeUserInput(document.getElementById('reg-name')?.value, { maxLen: 90 });
    const email = sanitizeEmailInput(document.getElementById('reg-email')?.value);
    const pass = document.getElementById('reg-pass').value;
    const passConfirm = document.getElementById('reg-pass-confirm')?.value || '';
    const acceptedTerms = !!document.getElementById('reg-terms')?.checked;
    const role = document.querySelector('input[name="reg-role"]:checked')?.value || 'student';

    if (!name || !email || !pass || !passConfirm) {
        alert('Preencha todos os campos para criar sua conta.');
        return;
    }

    if (name.length < 3) {
        alert('Informe seu nome completo (minimo 3 caracteres).');
        return;
    }

    if (!EMAIL_REGEX.test(email)) {
        alert('Informe um e-mail valido.');
        return;
    }

    const hasLetter = /[A-Za-z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    if (pass.length < 8 || !hasLetter || !hasNumber) {
        alert('A senha deve ter ao menos 8 caracteres, com letras e numeros.');
        return;
    }

    if (pass !== passConfirm) {
        alert('A confirmacao de senha nao confere.');
        return;
    }

    if (!acceptedTerms) {
        alert('Voce precisa aceitar os Termos de Uso para continuar.');
        return;
    }

    let users = readStorageJSON('registeredUsers', []);
    if (users.some(u => String(u.email || '').trim().toLowerCase() === email)) {
        alert('Este e-mail já está cadastrado.');
        return;
    }

    const newUser = { name, email, password: pass, role, joinedAt: new Date().toISOString() };
    users.push(newUser);
    memorySetItem('registeredUsers', JSON.stringify(users));

    alert('Conta criada com sucesso! Voce ja esta logado.');
    processLogin(newUser);
}

function handleGoogleLogin() {
    // Simulated Google Login
    const w = 500, h = 600;
    const left = (screen.width / 2) - (w / 2);
    const top = (screen.height / 2) - (h / 2);

    // We can't actually open Google Auth without a client ID, so we simulate the UI
    const mockWin = window.open('about:blank', 'GoogleAuth', `width=${w},height=${h},top=${top},left=${left}`);
    mockWin.document.write(`
        <body style="background:#f8f9fa; font-family: sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
            <div style="background:#fff; padding:2rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); text-align:center;">
                <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" style="margin-bottom:1rem;">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.8 0 9-4.7 9-7.1 0-.5 0-.8-.1-1.2H12z"/>
                </svg>
                <h2 style="margin:0 0 0.5rem 0;">Fazer login com Google</h2>
                <p style="color:#5f6368; margin-bottom:2rem;">Use sua Conta do Google para continuar</p>
                <button onclick="window.opener.postMessage('google_success', '*'); window.close();" style="background:#1a73e8; color:white; border:none; padding:10px 24px; border-radius:4px; font-weight:500; cursor:pointer;">Continuar como Usuário</button>
            </div>
        </body>
    `);

    // Listen for the mock success message
    window.addEventListener('message', (event) => {
        if (event.data === 'google_success') {
            const mockGoogleUser = { name: 'Google User', email: 'google@test.com', role: 'student' };
            processLogin(mockGoogleUser);
        }
    }, { once: true });
}

function processLogin(user) {
    const safeUserName = sanitizeUserInput(user?.name || 'Aluno', { maxLen: 90 }) || 'Aluno';

    if (user.role === 'trainer') {
        // Find or create a trainer code for this user
        let trainerCode = memoryGetItem('currentTrainerCode') || '00001';
        memorySetItem('trainerName', safeUserName.split(' ')[0]);
        memorySetItem('currentTrainerCode', trainerCode);
        window.location.href = 'trainer.html';
    } else {
        memorySetItem('studentName', safeUserName);
        // Find if this user already has an ID, or generate one
        let studentId = memoryGetItem('currentStudentId') || Math.floor(10000 + Math.random() * 90000).toString();
        if (studentId === ADMIN_STUDENT_CODE || studentId === SELF_TRAINING_STUDENT_CODE) {
            studentId = Math.floor(10000 + Math.random() * 90000).toString();
        }
        memorySetItem('currentStudentId', studentId);

        hideAllScreens();
        document.getElementById('app').classList.add('wide');
        document.getElementById('student-dashboard-screen').classList.add('active');
        initStudentDashboard();
        switchStudentView('home'); // Land on Menu/Dashboard
    }
}

let currentWorkoutTab = 0;
let studentWorkoutEditMode = false;
let activeChatStudentId = null; // Track WhatsApp-style active chat
let trainerPendingAttachment = null;
let trainerAudioRecorder = null;
let trainerAudioChunks = [];
let trainerRecordingActive = false;

window.addEventListener('blur', () => {
    if (trainerRecordingActive) stopTrainerHoldRecord();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && trainerRecordingActive) stopTrainerHoldRecord();
    if (!document.hidden && restEndAt) updateRestTimerUI();
});

function switchStudentView(view) {
    if (workoutState && view !== 'log-workout' && view !== 'workout-summary') {
        if (!confirmExitActiveWorkout()) return;
    }
    const views = ['home', 'treino', 'dieta', 'perfil', 'log-workout', 'workout-summary'];
    views.forEach(v => {
        const el = document.getElementById(`view-student-${v}`);
        const nav = document.getElementById(`snav-${v}`);
        if (el) el.style.display = v === view ? 'block' : 'none';
        if (nav) nav.classList.toggle('active', v === view);
    });

    // Specific logic for each view
    if (view === 'treino') {
        currentWorkoutTab = 0;
        const studentId = memoryGetItem('currentStudentId');
        const students = readStorageJSON('trainerStudents', []);
        const student = students.find(s => s.id === studentId);
        if (studentCanEditWorkout(student)) {
            switchTreinoSubview('analise');
        } else {
            switchTreinoSubview('landing');
        }
    }
    if (view === 'dieta') renderStudentDietMain();
    if (view === 'perfil') renderStudentPerfil();
}

let workoutAnalysisRenderNonce = 0;

function renderWorkoutAnalysisSkeleton() {
    const tabsNav = document.getElementById('workout-tabs-nav');
    const mainContent = document.getElementById('student-workout-content-main');
    if (!tabsNav || !mainContent) return;

    tabsNav.innerHTML = `
        <div class="tab-btn skeleton-box" style="width:88px;height:36px;"></div>
        <div class="tab-btn skeleton-box" style="width:88px;height:36px;"></div>
    `;

    mainContent.innerHTML = `
        <div class="routine-card">
            <div class="analysis-overview-grid">
                <div class="analysis-stat-card skeleton-box" style="height:72px;"></div>
                <div class="analysis-stat-card skeleton-box" style="height:72px;"></div>
                <div class="analysis-stat-card skeleton-box" style="height:72px;"></div>
                <div class="analysis-stat-card skeleton-box" style="height:72px;"></div>
            </div>
            <div class="routine-exercise-list">
                <div class="routine-ex-item skeleton-box" style="height:84px;"></div>
                <div class="routine-ex-item skeleton-box" style="height:84px;"></div>
                <div class="routine-ex-item skeleton-box" style="height:84px;"></div>
            </div>
        </div>
    `;
}

function getWorkoutBlockTitle(block, idx) {
    const raw = String(block?.title || block?.name || '').trim();
    if (raw) return raw;
    if (Number.isFinite(idx)) {
        return `Treino ${String.fromCharCode(65 + idx)}`;
    }
    return 'Treino';
}

function toggleStudentWorkoutEditMode(force) {
    const wasEditing = studentWorkoutEditMode;
    if (typeof force === 'boolean') {
        studentWorkoutEditMode = force;
    } else {
        studentWorkoutEditMode = !studentWorkoutEditMode;
    }
    if (wasEditing && !studentWorkoutEditMode) {
        const studentId = memoryGetItem('currentStudentId');
        const students = readStorageJSON('trainerStudents', []);
        const student = students.find(s => String(s.id) === String(studentId));
        if (student && studentCanEditWorkout(student)) {
            notifyTrainerWorkoutUpdate(student, { force: true });
        }
    }
    renderStudentWorkoutMain({ withSkeleton: false });
}

function openStudentWorkoutEditor() {
    switchStudentView('treino');
    switchTreinoSubview('analise');
    toggleStudentWorkoutEditMode(true);
}

function updateStudentWorkoutBlocks(studentId, mutator) {
    if (!studentId) return null;
    const students = readStorageJSON('trainerStudents', []);
    const idx = students.findIndex(s => String(s.id) === String(studentId));
    if (idx < 0) return null;
    const student = students[idx];
    const blocks = Array.isArray(student.workoutBlocks) ? student.workoutBlocks : [];
    mutator(blocks, student);
    student.workoutBlocks = blocks;
    if (studentCanEditWorkout(student)) {
        student.active = true;
        student.pending = false;
    }
    students[idx] = student;
    saveStudentData(students);
    return student;
}

function notifyTrainerWorkoutUpdate(student, options = {}) {
    const studentId = String(student?.id || '');
    if (!studentId) return;
    const blocks = Array.isArray(student?.workoutBlocks) ? student.workoutBlocks : [];
    const totalExercises = blocks.reduce((acc, block) => acc + (Array.isArray(block.exercises) ? block.exercises.length : 0), 0);
    const lastKey = `workout_update_last_${studentId}`;
    const now = Date.now();
    const lastSent = parseInt(memoryGetItem(lastKey) || '0', 10);
    const minIntervalMs = 30_000;
    if (!options.force && now - lastSent < minIntervalMs) return;

    const studentName = sanitizeUserInput(student?.name || memoryGetItem('studentName') || 'Aluno', { maxLen: 90 }) || 'Aluno';
    const notifs = readStorageJSON('trainerNotifications', []);
    notifs.unshift({
        type: 'duvida',
        kind: 'workout_update',
        studentId,
        studentName,
        title: `📌 Treino atualizado - ${studentName}`,
        desc: `[Plano de treino atualizado] ${blocks.length} treino(s), ${totalExercises} exercícios.`,
        time: new Date().toISOString(),
        unread: true
    });
    memorySetItem('trainerNotifications', JSON.stringify(notifs));
    memorySetItem(lastKey, String(now));
    syncChannel.postMessage({ type: 'NEW_DOUBT', payload: { studentId } });
}

function promptStudentField(label, defaultValue = '', options = {}) {
    const raw = prompt(label, defaultValue ? '');
    if (raw === null) return null;
    return sanitizeUserInput(raw, {
        maxLen: Number.isFinite(options.maxLen) ? options.maxLen : 90,
        allowNewlines: !!options.allowNewlines
    });
}

function addStudentWorkoutBlock() {
    const studentId = memoryGetItem('currentStudentId');
    let didAdd = false;
    const student = updateStudentWorkoutBlocks(studentId, (blocks) => {
        const defaultTitle = `Treino ${String.fromCharCode(65 + blocks.length)}`;
        const titleInput = promptStudentField('Nome do treino:', defaultTitle, { maxLen: 80 });
        if (titleInput === null) return;
        const title = titleInput || defaultTitle;
        blocks.push({ title, name: title, exercises: [] });
        currentWorkoutTab = blocks.length - 1;
        didAdd = true;
    });

    if (!student || !didAdd) return;
    studentWorkoutEditMode = true;
    renderStudentWorkoutMain({ withSkeleton: false });
    renderWorkoutStartOptions(student);
    setProtocolStatus(true);
    if (studentCanEditWorkout(student)) {
        notifyTrainerWorkoutUpdate(student);
    }
}

function renameStudentWorkoutBlock(blockIdx) {
    const studentId = memoryGetItem('currentStudentId');
    let didRename = false;
    const student = updateStudentWorkoutBlocks(studentId, (blocks) => {
        if (!blocks[blockIdx]) return;
        const currentTitle = getWorkoutBlockTitle(blocks[blockIdx], blockIdx);
        const nextTitle = promptStudentField('Novo nome do treino:', currentTitle, { maxLen: 80 });
        if (nextTitle === null) return;
        const title = nextTitle || currentTitle;
        blocks[blockIdx].title = title;
        blocks[blockIdx].name = title;
        didRename = true;
    });

    if (!student || !didRename) return;
    renderStudentWorkoutMain({ withSkeleton: false });
    renderWorkoutStartOptions(student);
    if (studentCanEditWorkout(student)) {
        notifyTrainerWorkoutUpdate(student);
    }
}

function removeStudentWorkoutBlock(blockIdx) {
    if (!confirm('Remover este treino?')) return;
    const studentId = memoryGetItem('currentStudentId');
    const student = updateStudentWorkoutBlocks(studentId, (blocks) => {
        if (!blocks[blockIdx]) return;
        blocks.splice(blockIdx, 1);
        if (currentWorkoutTab >= blocks.length) {
            currentWorkoutTab = Math.max(0, blocks.length - 1);
        }
    });

    if (!student) return;
    renderStudentWorkoutMain({ withSkeleton: false });
    renderWorkoutStartOptions(student);
    if (studentCanEditWorkout(student)) {
        notifyTrainerWorkoutUpdate(student);
    }
}

function addStudentExerciseToCurrentBlock() {
    addStudentExerciseToBlock(currentWorkoutTab);
}

function addStudentExerciseToBlock(blockIdx) {
    const studentId = memoryGetItem('currentStudentId');
    let didAdd = false;
    const student = updateStudentWorkoutBlocks(studentId, (blocks) => {
        const block = blocks[blockIdx];
        if (!block) return;
        const nome = promptStudentField('Nome do exercício:', '', { maxLen: 80 });
        if (nome === null) return;
        if (!nome) {
            alert('Informe o nome do exercício.');
            return;
        }
        const series = promptStudentField('Séries (ex: 4):', '4', { maxLen: 6 });
        if (series === null) return;
        const reps = promptStudentField('Reps (ex: 8-12):', '10-12', { maxLen: 12 });
        if (reps === null) return;
        const carga = promptStudentField('Carga (opcional):', '', { maxLen: 12 });
        if (carga === null) return;
        const descanso = promptStudentField('Descanso (opcional):', '60s', { maxLen: 12 });
        if (descanso === null) return;
        const observacao = promptStudentField('Observação (opcional):', '', { maxLen: 160 });
        if (observacao === null) return;

        const note = observacao || '';
        block.exercises = Array.isArray(block.exercises) ? block.exercises : [];
        block.exercises.push({
            nome,
            series: series || '3',
            reps: reps || '',
            carga: carga || '',
            descanso: descanso || '',
            observacao: note,
            obs: note,
            substitutes: [],
            supersetWithNext: false
        });
        didAdd = true;
    });

    if (!student || !didAdd) return;
    renderStudentWorkoutMain({ withSkeleton: false });
    renderWorkoutStartOptions(student);
    if (studentCanEditWorkout(student)) {
        notifyTrainerWorkoutUpdate(student);
    }
}

function editStudentExerciseInBlock(blockIdx, exIdx) {
    const studentId = memoryGetItem('currentStudentId');
    let didEdit = false;
    const student = updateStudentWorkoutBlocks(studentId, (blocks) => {
        const block = blocks[blockIdx];
        const ex = block?.exercises?.[exIdx];
        if (!ex) return;
        const nome = promptStudentField('Nome do exercício:', ex.nome || '', { maxLen: 80 });
        if (nome === null) return;
        const series = promptStudentField('Séries (ex: 4):', ex.series || '', { maxLen: 6 });
        if (series === null) return;
        const reps = promptStudentField('Reps (ex: 8-12):', ex.reps || '', { maxLen: 12 });
        if (reps === null) return;
        const carga = promptStudentField('Carga (opcional):', ex.carga || '', { maxLen: 12 });
        if (carga === null) return;
        const descanso = promptStudentField('Descanso (opcional):', ex.descanso || '', { maxLen: 12 });
        if (descanso === null) return;
        const observacao = promptStudentField('Observação (opcional):', ex.observacao || ex.obs || '', { maxLen: 160 });
        if (observacao === null) return;

        const note = observacao || '';
        ex.nome = nome || ex.nome;
        ex.series = series || ex.series;
        ex.reps = reps || ex.reps;
        ex.carga = carga || ex.carga;
        ex.descanso = descanso || ex.descanso;
        ex.observacao = note;
        ex.obs = note;
        didEdit = true;
    });

    if (!student || !didEdit) return;
    renderStudentWorkoutMain({ withSkeleton: false });
    renderWorkoutStartOptions(student);
    if (studentCanEditWorkout(student)) {
        notifyTrainerWorkoutUpdate(student);
    }
}

function removeStudentExerciseFromBlock(blockIdx, exIdx) {
    if (!confirm('Remover este exercício?')) return;
    const studentId = memoryGetItem('currentStudentId');
    const student = updateStudentWorkoutBlocks(studentId, (blocks) => {
        const block = blocks[blockIdx];
        if (!block || !Array.isArray(block.exercises)) return;
        block.exercises.splice(exIdx, 1);
    });

    if (!student) return;
    renderStudentWorkoutMain({ withSkeleton: false });
    renderWorkoutStartOptions(student);
    if (studentCanEditWorkout(student)) {
        notifyTrainerWorkoutUpdate(student);
    }
}

function renderStudentWorkoutMain(options = {}) {
    const withSkeleton = !!options.withSkeleton;
    const delayMs = Number.isFinite(options.delayMs) ? options.delayMs : 240;

    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);
    const canEditWorkout = studentCanEditWorkout(student);
    const blocks = Array.isArray(student?.workoutBlocks) ? student.workoutBlocks : [];

    const tabsNav = document.getElementById('workout-tabs-nav');
    const mainContent = document.getElementById('student-workout-content-main');
    if (!tabsNav || !mainContent) return;

    if (withSkeleton) {
        const renderNonce = ++workoutAnalysisRenderNonce;
        renderWorkoutAnalysisSkeleton();
        setTimeout(() => {
            if (renderNonce !== workoutAnalysisRenderNonce) return;
            renderStudentWorkoutMain({ withSkeleton: false });
        }, Math.max(120, delayMs));
        return;
    }

    workoutAnalysisRenderNonce += 1;

    if (!student || (!student.active && !canEditWorkout) || blocks.length === 0) {
        tabsNav.innerHTML = '';
        if (student && canEditWorkout) {
            mainContent.innerHTML = `<div class="empty-state-card" style="margin-top:2rem;">
                <i class="ph-fill ph-pencil-simple"></i>
                <div class="empty-info">
                    <h3>Monte seu treino</h3>
                    <p>Crie o primeiro bloco e adicione exercícios para treinar amanhã.</p>
                </div>
                <div style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-top:1rem;">
                    <button class="btn-primary" onclick="addStudentWorkoutBlock()"><i class="ph-bold ph-plus"></i> Criar Treino</button>
                    <button class="btn-secondary" onclick="openStudentWorkoutEditor()">Modo Edição</button>
                </div>
            </div>`;
        } else {
            mainContent.innerHTML = `<div class="empty-state-card" style="margin-top:2rem;">
                <i class="ph-fill ph-hourglass-high"></i>
                <div class="empty-info">
                    <h3>Treino em analise</h3>
                    <p>Seu treinador ainda nao liberou sua ficha de treinos.</p>
                </div>
            </div>`;
        }
        return;
    }

    if (currentWorkoutTab >= blocks.length) {
        currentWorkoutTab = 0;
    }

    tabsNav.innerHTML = blocks.map((block, idx) => {
        const blockTitle = getWorkoutBlockTitle(block, idx);
        const tabLabel = blockTitle.split(' ').slice(0, 2).join(' ');
        return `
        <button class="tab-btn ${idx === currentWorkoutTab ? 'active' : ''}" onclick="switchWorkoutTab(${idx})">
            ${escHtml(tabLabel)}
        </button>
    `;
    }).join('');

    const block = blocks[currentWorkoutTab];
    const exercises = Array.isArray(block.exercises) ? block.exercises : [];
    const muscleGroups = getMuscleGroups(exercises);
    const totalSets = exercises.reduce((acc, ex) => acc + Number(ex.series || 0), 0);
    const estDuration = Math.max(25, Math.round(totalSets * 2.2));
    const blockTitle = getWorkoutBlockTitle(block, currentWorkoutTab);
    const lastPerformed = getLatestPerformanceDate(student.id, blockTitle);
    const exercisesWithObs = exercises.filter(ex => (ex.observacao || ex.obs) && String(ex.observacao || ex.obs).trim().length > 0).length;
    const totalSupersets = exercises.filter(ex => ex.supersetWithNext).length;
    const totalWithSubs = exercises.filter(ex => Array.isArray(ex.substitutes) && ex.substitutes.filter(Boolean).length > 0).length;
    const editMode = canEditWorkout && studentWorkoutEditMode;
    const exerciseListHtml = exercises.length
        ? exercises.map((ex, idx) => {
            const substitutes = Array.isArray(ex.substitutes) ? ex.substitutes.filter(Boolean) : [];
            const note = ex.observacao || ex.obs || '';
            return `
                            <div class="routine-ex-item exercise-clarity-card ${ex.supersetWithNext ? 'has-superset' : ''}">
                                <div class="exercise-order-badge">${idx + 1}</div>
                                <div class="ex-name-box">
                                    <span>${escHtml(ex.nome)}</span>
                                    <div class="ex-sets-mini">${ex.series} series • ${ex.reps} reps ${ex.descanso ? `• ${escHtml(ex.descanso)} descanso` : ''}</div>
                                    ${note ? `<p class="exercise-note"><i class="ph-bold ph-info"></i> ${escHtml(note)}</p>` : ''}
                                    ${substitutes.length ? `<div class="analysis-substitute-chips">${substitutes.map(s => `<span>${escHtml(s)}</span>`).join('')}</div>` : ''}
                                    ${ex.supersetWithNext ? `<p class="exercise-note"><i class="ph-bold ph-lightning"></i> Super serie com o proximo exercicio</p>` : ''}
                                    ${editMode ? `
                                    <div class="exercise-edit-row">
                                        <button class="btn-icon-tiny action-edit" onclick="editStudentExerciseInBlock(${currentWorkoutTab}, ${idx})" title="Editar exercício">
                                            <i class="ph-bold ph-pencil-simple"></i>
                                        </button>
                                        <button class="btn-icon-tiny action-trash" onclick="removeStudentExerciseFromBlock(${currentWorkoutTab}, ${idx})" title="Remover exercício">
                                            <i class="ph-bold ph-trash"></i>
                                        </button>
                                    </div>` : ''}
                                </div>
                                <button class="btn-icon-tiny analysis-chart-btn" onclick="openExerciseProgressModalEncoded('${encodeURIComponent(ex.nome)}')" title="Ver historico de carga">
                                    <i class="ph-bold ph-chart-line-up"></i>
                                </button>
                            </div>`;
        }).join('')
        : `<div class="student-ex-empty">${editMode ? 'Nenhum exercício ainda. Use "Adicionar exercício" para começar.' : 'Nenhum exercício cadastrado neste treino.'}</div>`;

    mainContent.innerHTML = `
        <div class="routine-card workout-analysis-layout clean-analysis">
            <div class="analysis-overview-grid">
                <div class="analysis-stat-card">
                    <span class="analysis-stat-label"><i class="ph-bold ph-list-numbers"></i> Exercicios</span>
                    <strong>${exercises.length}</strong>
                </div>
                <div class="analysis-stat-card">
                    <span class="analysis-stat-label"><i class="ph-bold ph-stack"></i> Series</span>
                    <strong>${totalSets}</strong>
                </div>
                <div class="analysis-stat-card">
                    <span class="analysis-stat-label"><i class="ph-bold ph-clock"></i> Tempo</span>
                    <strong>~${estDuration} min</strong>
                </div>
                <div class="analysis-stat-card">
                    <span class="analysis-stat-label"><i class="ph-bold ph-lightning"></i> Bi-sets</span>
                    <strong>${totalSupersets}</strong>
                </div>
            </div>

            <div class="analysis-shell">
                <div class="analysis-main">
                    <div class="routine-header">
                        <div class="routine-title-box">
                            <h2>${escHtml(blockTitle)}</h2>
                            <div class="routine-meta">
                                <span><i class="ph-bold ph-barbell"></i> ${exercises.length} exercicios</span>
                                <span><i class="ph-bold ph-arrows-clockwise"></i> ${totalWithSubs} com substituicao</span>
                                ${lastPerformed ? `<span><i class="ph-bold ph-calendar-check"></i> Ultimo: ${escHtml(lastPerformed)}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="muscle-tags">
                        ${muscleGroups.map(m => `<span class="tag-muscle">${m}</span>`).join('')}
                    </div>

                    <div class="analysis-legend">
                        <span><i class="ph-bold ph-chart-line-up"></i> Clique no icone para ver grafico de carga</span>
                        <span><i class="ph-bold ph-arrows-clockwise"></i> Troca aprovada pelo coach</span>
                        <span><i class="ph-bold ph-lightning"></i> Fazer em super serie</span>
                    </div>

                    <div class="routine-exercise-list">
                        ${exerciseListHtml}
                    </div>
                </div>

                <aside class="analysis-side">
                    ${canEditWorkout ? `
                    <div class="student-edit-card ${editMode ? 'active' : ''}">
                        <div class="student-edit-head">
                            <strong>Seu Treino</strong>
                            <button class="btn-secondary-outline" onclick="toggleStudentWorkoutEditMode()">
                                ${editMode ? 'Concluir edição' : 'Editar treino'}
                            </button>
                        </div>
                        <p class="student-edit-hint">${editMode ? 'Use os botões abaixo para montar o treino.' : 'Ative o modo edição para criar e ajustar seu treino.'}</p>
                        ${editMode ? `
                        <div class="student-edit-actions">
                            <button class="btn-secondary" onclick="addStudentWorkoutBlock()"><i class="ph-bold ph-plus"></i> Adicionar treino</button>
                            <button class="btn-secondary" onclick="renameStudentWorkoutBlock(${currentWorkoutTab})"><i class="ph-bold ph-pencil-simple"></i> Renomear treino</button>
                            <button class="btn-secondary" onclick="addStudentExerciseToCurrentBlock()"><i class="ph-bold ph-plus-circle"></i> Adicionar exercício</button>
                            <button class="btn-secondary-outline btn-danger-outline" onclick="removeStudentWorkoutBlock(${currentWorkoutTab})"><i class="ph-bold ph-trash"></i> Remover treino</button>
                        </div>` : ''}
                    </div>` : ''}
                    <div class="coach-help-card">
                        <div class="coach-help-text">
                            <strong>Dicas para executar melhor</strong>
                            <p>Use a coluna de historico de carga para manter progressao. Se precisar, use os substitutos aprovados.</p>
                        </div>
                        <button class="btn-duvida-secondary" onclick="openDuvidaModal()">
                            <i class="ph-bold ph-question"></i> Enviar duvida
                        </button>
                    </div>

                    <button class="btn-primary" onclick="startWorkoutSession(${currentWorkoutTab})"
                        style="width:100%; padding:1rem; font-size:1rem; font-weight:800;">
                        <i class="ph-fill ph-play"></i> Iniciar este treino
                    </button>
                </aside>
            </div>
        </div>`;
}

function switchWorkoutTab(idx) {
    currentWorkoutTab = idx;
    renderStudentWorkoutMain({ withSkeleton: true, delayMs: 160 });
}

// â”€â”€â”€ Treino Subview System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function switchTreinoSubview(view) {
    const landing = document.getElementById('treino-landing');
    const analise = document.getElementById('treino-analise');
    const historico = document.getElementById('treino-historico');

    if (landing) landing.style.display = view === 'landing' ? 'block' : 'none';
    if (analise) analise.style.display = view === 'analise' ? 'block' : 'none';
    if (historico) historico.style.display = view === 'historico' ? 'block' : 'none';

    if (view === 'landing') {
        renderStudentDuvidas();
    }
    if (view === 'analise') {
        currentWorkoutTab = 0;
        renderStudentWorkoutMain({ withSkeleton: true, delayMs: 240 });
    }
    if (view === 'historico') {
        renderWorkoutHistory();
    }
}

let studentChatUploadTimer = null;
let studentAudioRecorder = null;
let studentAudioChunks = [];
let studentAudioStream = null;
let studentAudioRecording = false;
let studentAudioContext = null;
let studentAudioAnalyser = null;
let studentAudioWaveData = null;
let studentAudioWaveFrame = 0;
let studentAudioAutoStopTimer = null;

function getStudentChatStorageKey(studentId) {
    return `student_chat_beta_${studentId || 'anon'}`;
}

function formatSecondsMMSS(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds || 0));
    const mins = Math.floor(safe / 60).toString().padStart(2, '0');
    const secs = (safe % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function scrollStudentChatToBottom() {
    const thread = document.getElementById('student-chat-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
}

function pushStudentMessageToTrainer(studentId, studentName, payload = {}) {
    if (!studentId) return;

    const safeName = sanitizeUserInput(studentName || 'Aluno', { maxLen: 90 }) || 'Aluno';
    let safeText = sanitizeUserInput(payload.text || '', { allowNewlines: true, maxLen: 1200 });
    const rawDataUrl = String(payload?.media?.dataUrl || '');
    const boundedDataUrl = rawDataUrl.length > 1_100_000 ? '' : rawDataUrl;
    const media = payload.media && boundedDataUrl ? {
        type: payload.media.type || 'audio',
        name: sanitizeUserInput(payload.media.name || 'arquivo', { maxLen: 120 }) || 'arquivo',
        dataUrl: boundedDataUrl
    } : null;

    if (!media && rawDataUrl.length > 1_100_000 && !safeText) {
        safeText = '[Mídia enviada: prévia indisponível no modo beta]';
    }

    if (!safeText && !media) return;

    const nowIso = payload.time || new Date().toISOString();
    const notifications = readStorageJSON('trainerNotifications', []);
    notifications.unshift({
        type: 'duvida',
        studentId,
        studentName: safeName,
        title: `💬 Dúvida de ${safeName}`,
        desc: safeText || '[Mídia enviada]',
        media,
        time: nowIso,
        unread: true
    });

    memorySetItem('trainerNotifications', JSON.stringify(notifications));
    syncChannel.postMessage({ type: 'NEW_DOUBT', payload: { studentId } });
}

function buildStudentChatFromNotifications(studentId, studentName) {
    const notifications = readStorageJSON('trainerNotifications', []);
    const related = notifications
        .filter(n => n.type === 'duvida' && ((studentId && n.studentId === studentId) || String(n.title || '').includes(studentName)))
        .sort((a, b) => getNotificationActivityDate(a) - getNotificationActivityDate(b));

    const mapped = [];
    related.forEach((item, idx) => {
        const baseId = `${item.studentId || studentId || 'unknown'}-${item.time || idx}`;
        if (!item.fromTrainerOnly && item.desc) {
            const mediaType = item.media?.type;
            mapped.push({
                id: `n-${baseId}-q`,
                sender: 'student',
                type: mediaType === 'video' ? 'video' : mediaType === 'audio' ? 'audio' : 'text',
                text: item.desc,
                mediaDataUrl: item.media?.dataUrl || '',
                time: item.time || new Date().toISOString()
            });
        }
        if (item.reply) {
            mapped.push({
                id: `n-${baseId}-r`,
                sender: 'trainer',
                type: item.replyMedia?.type === 'video' ? 'video' : item.replyMedia?.type === 'audio' ? 'audio' : 'text',
                text: item.reply,
                mediaDataUrl: item.replyMedia?.dataUrl || '',
                time: item.repliedAt || item.time || new Date().toISOString()
            });
        } else if (item.fromTrainerOnly && item.desc) {
            mapped.push({
                id: `n-${baseId}-t`,
                sender: 'trainer',
                type: 'text',
                text: item.desc,
                time: item.time || new Date().toISOString()
            });
        }
    });
    return mapped;
}

function loadStudentChatMessages(studentId, studentName) {
    const storageKey = getStudentChatStorageKey(studentId);
    const localMsgs = readStorageJSON(storageKey, []);
    const notifMsgs = buildStudentChatFromNotifications(studentId, studentName);
    const map = new Map();

    [...localMsgs, ...notifMsgs].forEach((msg) => {
        if (!msg || !msg.id) return;
        map.set(msg.id, msg);
    });

    const merged = Array.from(map.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    memorySetItem(storageKey, JSON.stringify(merged));
    return merged;
}

function saveStudentChatMessages(studentId, messages) {
    memorySetItem(getStudentChatStorageKey(studentId), JSON.stringify(messages || []));
}

function renderStudentChatBubble(msg) {
    const senderClass = msg.sender === 'trainer' ? 'from-trainer' : 'from-student';
    let contentHtml = '';

    if (msg.type === 'audio' && msg.mediaDataUrl) {
        contentHtml = `
            <div class="sc-media-real">
                <audio controls src="${msg.mediaDataUrl}"></audio>
            </div>
            ${msg.text ? `<p>${formatChatMessageText(msg.text)}</p>` : ''}
        `;
    } else if (msg.type === 'video' && msg.mediaDataUrl) {
        contentHtml = `
            <div class="sc-media-real">
                <video controls src="${msg.mediaDataUrl}" class="sc-video-real"></video>
            </div>
            ${msg.text ? `<p>${formatChatMessageText(msg.text)}</p>` : ''}
        `;
    } else if (msg.type === 'audio') {
        contentHtml = `
            <div class="sc-media-fake audio">
                <i class="ph-fill ph-waveform"></i>
                <div class="sc-media-track"><span style="width: 68%"></span></div>
                <small>00:12</small>
            </div>
            ${msg.text ? `<p>${formatChatMessageText(msg.text)}</p>` : ''}
        `;
    } else if (msg.type === 'video') {
        contentHtml = `
            <div class="sc-media-fake video">
                <div class="sc-video-thumb">
                    <i class="ph-fill ph-play-circle"></i>
                </div>
                <div class="sc-media-track"><span style="width: 54%"></span></div>
            </div>
            ${msg.text ? `<p>${formatChatMessageText(msg.text)}</p>` : ''}
        `;
    } else {
        contentHtml = `<p>${formatChatMessageText(msg.text || '')}</p>`;
    }

    return `
        <div class="student-chat-msg ${senderClass}">
            <div class="sc-bubble">
                ${contentHtml}
                <div class="sc-meta">
                    <span class="sc-time">${formatChatTime(msg.time)}</span>
                    ${msg.sender === 'student' ? '<span class="sc-delivered"><i class="ph-bold ph-checks"></i></span>' : ''}
                </div>
            </div>
        </div>
    `;
}

function sendStudentQuickMessage() {
    const studentId = memoryGetItem('currentStudentId');
    const studentName = memoryGetItem('studentName') || 'Aluno';
    const input = document.getElementById('student-chat-input');
    if (!studentId || !input) return;

    const text = sanitizeUserInput(input.value, { allowNewlines: true, maxLen: 900 });
    if (!text) return;

    const messages = loadStudentChatMessages(studentId, studentName);
    const nowIso = new Date().toISOString();
    const localId = `n-${studentId}-${nowIso}-q`;
    messages.push({
        id: localId,
        sender: 'student',
        type: 'text',
        text,
        time: nowIso,
        delivered: true
    });
    saveStudentChatMessages(studentId, messages);
    pushStudentMessageToTrainer(studentId, studentName, { text, time: nowIso });
    input.value = '';
    renderStudentDuvidas();
}

function startStudentWaveform(stream) {
    stopStudentWaveform();
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        studentAudioContext = new AudioCtx();
        const source = studentAudioContext.createMediaStreamSource(stream);
        studentAudioAnalyser = studentAudioContext.createAnalyser();
        studentAudioAnalyser.fftSize = 64;
        studentAudioWaveData = new Uint8Array(studentAudioAnalyser.frequencyBinCount);
        source.connect(studentAudioAnalyser);

        const tick = () => {
            if (!studentAudioAnalyser || !studentAudioWaveData) return;
            studentAudioAnalyser.getByteFrequencyData(studentAudioWaveData);
            const bars = document.querySelectorAll('#student-chat-recording-wave span');
            if (bars.length > 0) {
                const chunk = Math.max(1, Math.floor(studentAudioWaveData.length / bars.length));
                bars.forEach((bar, idx) => {
                    let sum = 0;
                    const start = idx * chunk;
                    const end = Math.min(studentAudioWaveData.length, start + chunk);
                    for (let i = start; i < end; i++) sum += studentAudioWaveData[i];
                    const avg = sum / Math.max(1, end - start);
                    const scale = 0.35 + (avg / 255) * 1.15;
                    bar.style.transform = `scaleY(${Math.min(1.7, scale).toFixed(3)})`;
                });
            }
            studentAudioWaveFrame = requestAnimationFrame(tick);
        };

        studentAudioWaveFrame = requestAnimationFrame(tick);
    } catch (_) {
        // fallback: CSS animation only
    }
}

function stopStudentWaveform() {
    if (studentAudioWaveFrame) {
        cancelAnimationFrame(studentAudioWaveFrame);
        studentAudioWaveFrame = 0;
    }
    if (studentAudioContext) {
        studentAudioContext.close().catch(() => { });
        studentAudioContext = null;
    }
    studentAudioAnalyser = null;
    studentAudioWaveData = null;

    const bars = document.querySelectorAll('#student-chat-recording-wave span');
    bars.forEach((bar) => {
        bar.style.transform = '';
    });
}

function releaseStudentAudioStream() {
    if (studentAudioStream) {
        studentAudioStream.getTracks().forEach((track) => track.stop());
        studentAudioStream = null;
    }
    stopStudentWaveform();
    if (studentAudioAutoStopTimer) {
        clearTimeout(studentAudioAutoStopTimer);
        studentAudioAutoStopTimer = null;
    }
}

function updateStudentRecordingUI() {
    const btn = document.getElementById('btn-student-record-audio');
    const wave = document.getElementById('student-chat-recording-wave');
    if (btn) {
        btn.classList.toggle('recording', studentAudioRecording);
        btn.innerHTML = studentAudioRecording
            ? '<i class="ph-bold ph-stop-circle"></i> Parar gravação'
            : '<i class="ph-bold ph-microphone"></i> Gravar áudio real';
    }
    if (wave) wave.style.display = studentAudioRecording ? 'flex' : 'none';
}

async function startStudentAudioRecording() {
    if (studentAudioRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Gravação de áudio não suportada neste dispositivo.');
        return;
    }
    if (typeof MediaRecorder === 'undefined') {
        alert('Seu navegador não suporta gravação de áudio nesta versão.');
        return;
    }

    try {
        studentAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        studentAudioChunks = [];

        let recorderOptions = undefined;
        const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        for (const type of preferredTypes) {
            if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
                recorderOptions = { mimeType: type };
                break;
            }
        }

        studentAudioRecorder = recorderOptions
            ? new MediaRecorder(studentAudioStream, recorderOptions)
            : new MediaRecorder(studentAudioStream);

        const recordingStart = Date.now();
        startStudentWaveform(studentAudioStream);

        studentAudioRecorder.ondataavailable = (evt) => {
            if (evt.data && evt.data.size > 0) studentAudioChunks.push(evt.data);
        };

        studentAudioRecorder.onstop = async () => {
            try {
                const blobType = studentAudioRecorder?.mimeType || 'audio/webm';
                const blob = new Blob(studentAudioChunks, { type: blobType });
                const durationSec = Math.max(1, Math.round((Date.now() - recordingStart) / 1000));
                const dataUrl = await fileToDataUrl(blob);
                const safeDataUrl = dataUrl.length > 1_100_000 ? '' : dataUrl;
                simulateStudentMediaUpload('audio', {
                    text: safeDataUrl ? '[Áudio gravado no app]' : '[Áudio enviado: prévia indisponível]',
                    mediaDataUrl: safeDataUrl,
                    mediaDuration: formatSecondsMMSS(durationSec)
                });
            } catch (err) {
                console.error('Falha ao processar áudio gravado', err);
                alert('Não foi possível processar o áudio.');
            } finally {
                releaseStudentAudioStream();
                studentAudioRecorder = null;
                studentAudioChunks = [];
            }
        };

        studentAudioRecorder.start();
        studentAudioRecording = true;
        updateStudentRecordingUI();

        // Auto stop to avoid oversized payload in localStorage demo.
        studentAudioAutoStopTimer = setTimeout(() => {
            if (studentAudioRecording) stopStudentAudioRecording();
        }, 20 * 1000);
    } catch (err) {
        console.error('Falha ao iniciar gravacao do aluno', err);
        alert('Não foi possível acessar o microfone.');
        releaseStudentAudioStream();
    }
}

function stopStudentAudioRecording() {
    if (!studentAudioRecording) return;
    studentAudioRecording = false;
    updateStudentRecordingUI();
    if (studentAudioAutoStopTimer) {
        clearTimeout(studentAudioAutoStopTimer);
        studentAudioAutoStopTimer = null;
    }

    if (studentAudioRecorder && studentAudioRecorder.state !== 'inactive') {
        studentAudioRecorder.stop();
    } else {
        releaseStudentAudioStream();
    }
}

function toggleStudentAudioRecording() {
    if (studentAudioRecording) {
        stopStudentAudioRecording();
    } else {
        startStudentAudioRecording();
    }
}

window.addEventListener('blur', () => {
    if (studentAudioRecording) stopStudentAudioRecording();
});

function simulateStudentMediaUpload(kind = 'audio', options = {}) {
    const studentId = memoryGetItem('currentStudentId');
    const studentName = memoryGetItem('studentName') || 'Aluno';
    if (!studentId) return;

    const uploadBox = document.getElementById('student-chat-upload');
    const bar = document.getElementById('student-chat-upload-bar');
    const label = document.getElementById('student-chat-upload-label');
    if (!uploadBox || !bar || !label) return;

    const mediaLabel = kind === 'video' ? 'video' : 'audio';
    let progress = 0;
    uploadBox.style.display = 'flex';
    bar.style.width = '0%';
    label.textContent = `Enviando ${mediaLabel}... 0%`;

    if (studentChatUploadTimer) clearInterval(studentChatUploadTimer);
    studentChatUploadTimer = setInterval(() => {
        progress = Math.min(100, progress + (6 + Math.random() * 18));
        bar.style.width = `${progress}%`;
        label.textContent = `Enviando ${mediaLabel}... ${Math.round(progress)}%`;

        if (progress >= 100) {
            clearInterval(studentChatUploadTimer);
            studentChatUploadTimer = null;

            const messages = loadStudentChatMessages(studentId, studentName);
            const messageType = kind === 'video' ? 'video' : 'audio';
            const messageText = options.text || (kind === 'video' ? '[Vídeo simulado enviado]' : '[Áudio simulado enviado]');
            const nowIso = new Date().toISOString();
            const localId = `n-${studentId}-${nowIso}-q`;
            messages.push({
                id: localId,
                sender: 'student',
                type: messageType,
                text: messageText,
                mediaDataUrl: options.mediaDataUrl || '',
                mediaDuration: options.mediaDuration || '',
                time: nowIso,
                delivered: true
            });
            saveStudentChatMessages(studentId, messages);
            pushStudentMessageToTrainer(studentId, studentName, {
                text: messageText,
                time: nowIso,
                media: {
                    type: messageType,
                    name: messageType === 'video' ? 'video-enviado.mp4' : 'audio-enviado.webm',
                    dataUrl: options.mediaDataUrl || ''
                }
            });

            setTimeout(() => {
                uploadBox.style.display = 'none';
                bar.style.width = '0%';
                renderStudentDuvidas();
            }, 220);
        }
    }, 220);
}

function renderStudentDuvidas() {
    const listEl = document.getElementById('student-duvidas-list');
    if (!listEl) return;

    const studentId = memoryGetItem('currentStudentId');
    const studentName = memoryGetItem('studentName') || 'Aluno';
    const messages = loadStudentChatMessages(studentId, studentName);

    listEl.innerHTML = `
        <div class="student-chat-demo-wrap">
            <div id="student-chat-thread" class="student-chat-thread">
                ${messages.length === 0
            ? `<div class="empty-state-card" style="margin-top:0;border-color:rgba(255,255,255,0.03);">
                            <i class="ph-bold ph-chat-circle-dots" style="font-size:1.5rem;opacity:0.5;"></i>
                            <p style="font-size:0.8rem;color:var(--text-muted);">Envie uma mensagem para iniciar o chat de dúvidas.</p>
                        </div>`
            : messages.map(renderStudentChatBubble).join('')
        }
            </div>

            <div id="student-chat-upload" class="student-chat-upload" style="display:none;">
                <span id="student-chat-upload-label">Enviando...</span>
                <div class="student-chat-upload-track">
                    <div id="student-chat-upload-bar" class="student-chat-upload-bar"></div>
                </div>
            </div>

            <div class="student-chat-compose">
                <textarea id="student-chat-input" class="q-input" rows="2" maxlength="900"
                    placeholder="Digite sua dúvida aqui..."
                    onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendStudentQuickMessage();}"></textarea>
                <div id="student-chat-recording-wave" class="student-chat-recording-wave" style="display:none;">
                    <span></span><span></span><span></span><span></span><span></span>
                    <small>Gravando áudio...</small>
                </div>
                <div class="student-chat-actions">
                    <button type="button" class="btn-secondary-outline" id="btn-student-record-audio" onclick="toggleStudentAudioRecording()">
                        <i class="ph-bold ph-microphone"></i> Gravar áudio real
                    </button>
                    <button type="button" class="btn-secondary-outline" onclick="simulateStudentMediaUpload('audio')">
                        <i class="ph-bold ph-waveform"></i> Simular Áudio
                    </button>
                    <button type="button" class="btn-secondary-outline" onclick="simulateStudentMediaUpload('video')">
                        <i class="ph-bold ph-video-camera"></i> Simular Vídeo
                    </button>
                    <button type="button" class="btn-primary" onclick="sendStudentQuickMessage()">
                        <i class="ph-fill ph-paper-plane-right"></i> Enviar
                    </button>
                </div>
            </div>
        </div>
    `;

    scrollStudentChatToBottom();
    optimizeMediaElements(listEl);
    updateStudentRecordingUI();
}

function renderWorkoutHistory() {
    const studentId = memoryGetItem('currentStudentId');
    const history = readStorageJSON('workoutHistory', [])
        .filter(w => w.ID_Usuario === studentId)
        .reverse();

    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);
    const prs = student?.personalRecords || {};
    const totalPRs = Object.values(prs).reduce((sum, pr) => {
        return sum + (pr.maxWeight > 0 ? 1 : 0);
    }, 0);

    // Evolution cards
    const evoGrid = document.getElementById('history-evolution-cards');
    if (evoGrid) {
        const totalSessions = history.length;
        const totalVolume = history.reduce((sum, w) => sum + (w.Volume_Total || 0), 0);
        const totalDuration = history.reduce((sum, w) => sum + (w.Duracao || 0), 0);

        evoGrid.innerHTML = `
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-calendar-check"></i></div>
                <div class="evo-value">${totalSessions}</div>
                <div class="evo-label">Treinos</div>
            </div>
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-barbell"></i></div>
                <div class="evo-value">${totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + 'k' : totalVolume}</div>
                <div class="evo-label">Volume Total (kg)</div>
            </div>
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-timer"></i></div>
                <div class="evo-value">${Math.round(totalDuration / 60)}</div>
                <div class="evo-label">Minutos</div>
            </div>
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-trophy"></i></div>
                <div class="evo-value">${totalPRs}</div>
                <div class="evo-label">Recordes</div>
            </div>
        `;
    }

    // Workout list
    const listEl = document.getElementById('history-workout-list');
    if (!listEl) return;

    if (history.length === 0) {
        listEl.innerHTML = `
            <div class="perfil-history-empty">
                <i class="ph-bold ph-barbell"></i>
                <p>Você ainda não completou nenhum treino. Inicie um treino pelo Dashboard para começar a acompanhar sua evolução!</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = history.map((w, idx) => {
        const date = formatDate(w.Data_Treino);
        const durationMin = Math.floor((w.Duracao || 0) / 60);
        const exerciseCount = (w.Exercicios || []).length;
        const totalSets = (w.Exercicios || []).reduce((s, ex) => s + ex.sets.length, 0);
        const hasPRs = (w.Exercicios || []).some(ex => ex.sets.some(s => getSetPRTypes(s).length > 0));
        const originalIdx = history.length - 1 - idx;

        return `
            <div class="history-workout-card" onclick="openHistoryDetail(${originalIdx})">
                <div class="history-workout-left">
                    <div class="history-workout-date">${date}</div>
                    <div class="history-workout-meta">
                        <span><i class="ph-bold ph-barbell"></i> ${exerciseCount} exercícios</span>
                        <span><i class="ph-bold ph-stack"></i> ${totalSets} séries</span>
                        <span><i class="ph-bold ph-timer"></i> ${durationMin} min</span>
                    </div>
                    <div class="history-workout-exercises">
                        ${(w.Exercicios || []).slice(0, 3).map(ex => `<span class="tag-muscle">${escHtml(ex.nome)}</span>`).join('')}
                        ${exerciseCount > 3 ? `<span class="tag-muscle muted">+${exerciseCount - 3}</span>` : ''}
                    </div>
                </div>
                <div class="history-workout-right">
                    <button class="btn-delete-history" onclick="event.stopPropagation(); confirmDeleteWorkout(${originalIdx})">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                    ${hasPRs ? '<span class="history-pr-badge"><i class="ph-fill ph-trophy"></i> PR</span>' : ''}
                    <span class="history-volume">${w.Volume_Total >= 1000 ? (w.Volume_Total / 1000).toFixed(1) + 'k' : w.Volume_Total} kg</span>
                </div>
            </div>
        `;
    }).join('');
}

function getWorkoutRpeStats(workout) {
    const values = [];
    (workout?.Exercicios || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
            const v = Number(s.rpe);
            if (Number.isFinite(v)) values.push(v);
        });
    });
    if (values.length === 0) return { avg: null, max: null, count: 0 };
    const sum = values.reduce((acc, v) => acc + v, 0);
    return { avg: sum / values.length, max: Math.max(...values), count: values.length };
}

function formatIntensityLabel(value) {
    if (!value) return '--';
    return String(value)
        .split('-')
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : '')
        .join(' ');
}

function truncateText(value, maxLen = 140) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trim() + '...';
}

function renderTrainerWorkoutHistory(studentId) {
    const listEl = document.getElementById('trainer-history-workout-list');
    const evoGrid = document.getElementById('trainer-history-evolution-cards');
    if (!listEl) return;

    if (!studentId) {
        listEl.innerHTML = `
            <div class="perfil-history-empty">
                <i class="ph-bold ph-barbell"></i>
                <p>Nenhum aluno selecionado.</p>
            </div>
        `;
        if (evoGrid) evoGrid.innerHTML = '';
        return;
    }

    const history = readStorageJSON('workoutHistory', [])
        .filter(w => String(w.ID_Usuario) === String(studentId))
        .reverse();

    if (evoGrid) {
        const totalSessions = history.length;
        const totalVolume = history.reduce((sum, w) => sum + (w.Volume_Total || 0), 0);
        const totalDuration = history.reduce((sum, w) => sum + (w.Duracao || 0), 0);
        let rpeSum = 0;
        let rpeCount = 0;
        history.forEach(w => {
            const stats = getWorkoutRpeStats(w);
            if (stats.count > 0 && stats.avg) {
                rpeSum += stats.avg;
                rpeCount += 1;
            }
        });
        const avgRpeAll = rpeCount > 0 ? (rpeSum / rpeCount) : 0;

        evoGrid.innerHTML = `
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-calendar-check"></i></div>
                <div class="evo-value">${totalSessions}</div>
                <div class="evo-label">Treinos</div>
            </div>
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-barbell"></i></div>
                <div class="evo-value">${totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + 'k' : totalVolume}</div>
                <div class="evo-label">Volume Total (kg)</div>
            </div>
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-timer"></i></div>
                <div class="evo-value">${Math.round(totalDuration / 60)}</div>
                <div class="evo-label">Minutos</div>
            </div>
            <div class="evo-card">
                <div class="evo-icon"><i class="ph-bold ph-gauge"></i></div>
                <div class="evo-value">${avgRpeAll ? avgRpeAll.toFixed(1) : '--'}</div>
                <div class="evo-label">RPE Médio</div>
            </div>
        `;
    }

    if (history.length === 0) {
        listEl.innerHTML = `
            <div class="perfil-history-empty">
                <i class="ph-bold ph-barbell"></i>
                <p>Este aluno ainda não completou nenhum treino.</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = history.map((w, idx) => {
        const date = formatDate(w.Data_Treino);
        const durationMin = Math.floor((w.Duracao || 0) / 60);
        const exerciseCount = (w.Exercicios || []).length;
        const totalSets = (w.Exercicios || []).reduce((s, ex) => s + (ex.sets || []).length, 0);
        const hasPRs = (w.Exercicios || []).some(ex => (ex.sets || []).some(s => getSetPRTypes(s).length > 0));
        const originalIdx = history.length - 1 - idx;

        const feedback = w.Avaliacao_Geral || {};
        const note = (feedback.comentario || '').trim();
        const notePreview = note ? truncateText(note, 140) : '';
        const intensityLabel = feedback.intensidade ? formatIntensityLabel(feedback.intensidade) : '--';
        const qualityLabel = feedback.qualidade ? `${feedback.qualidade}/5` : '--';
        const rpeStats = getWorkoutRpeStats(w);
        const rpeLabel = rpeStats.avg ? rpeStats.avg.toFixed(1) : '--';

        return `
            <div class="history-workout-card" onclick="openTrainerHistoryDetail(${JSON.stringify(String(studentId))}, ${originalIdx})">
                <div class="history-workout-left">
                    <div class="history-workout-date">${date}</div>
                    <div class="history-workout-meta">
                        <span><i class="ph-bold ph-barbell"></i> ${exerciseCount} exercícios</span>
                        <span><i class="ph-bold ph-stack"></i> ${totalSets} séries</span>
                        <span><i class="ph-bold ph-timer"></i> ${durationMin} min</span>
                    </div>
                    <div class="history-feedback">
                        <div class="history-feedback-badges">
                            <span class="history-feedback-chip"><i class="ph-bold ph-smiley"></i> Qualidade: ${qualityLabel}</span>
                            <span class="history-feedback-chip"><i class="ph-bold ph-lightning"></i> Intensidade: ${intensityLabel}</span>
                            <span class="history-feedback-chip"><i class="ph-bold ph-gauge"></i> PSE médio: ${rpeLabel}</span>
                        </div>
                        ${notePreview ? `<div class="history-feedback-note">${escHtml(notePreview)}</div>` : ''}
                    </div>
                </div>
                <div class="history-workout-right">
                    ${hasPRs ? '<span class="history-pr-badge"><i class="ph-fill ph-trophy"></i> PR</span>' : ''}
                    <span class="history-volume">${w.Volume_Total >= 1000 ? (w.Volume_Total / 1000).toFixed(1) + 'k' : w.Volume_Total} kg</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderHistoryExerciseDetail(ex) {
    const exNote = (ex.nota || ex.notes || '').trim();
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    const exVolume = sets.reduce((sum, s) => sum + getSetVolumeValue(s), 0);
    const bestSet = sets.reduce((best, s) => {
        const bestVol = best ? getSetVolumeValue(best) : -1;
        const currVol = getSetVolumeValue(s);
        return currVol > bestVol ? s : best;
    }, null);
    const bestLabel = bestSet
        ? `${formatMetricNumber(getSetWeightValue(bestSet))}kg x ${getSetRepsValue(bestSet)}`
        : '--';
    const bestOneRM = sets.reduce((max, s) => Math.max(max, getSetOneRMValue(s)), 0);
    const bestOneRMLabel = bestOneRM ? `${formatMetricNumber(bestOneRM)}kg` : '--';
    const prCount = sets.reduce((sum, s) => sum + getSetPRTypes(s).length, 0);

    return `
        <div class="hd-exercise">
            <h4>${escHtml(ex.nome)}</h4>
            <div class="hd-ex-meta">
                <span class="hd-ex-chip"><i class="ph-bold ph-stack"></i> Volume ${formatMetricNumber(exVolume)}kg</span>
                <span class="hd-ex-chip"><i class="ph-bold ph-crown"></i> Melhor set ${bestLabel}</span>
                <span class="hd-ex-chip"><i class="ph-bold ph-chart-line-up"></i> Melhor 1RM ${bestOneRMLabel}</span>
                ${prCount ? `<span class="hd-ex-chip pr"><i class="ph-fill ph-trophy"></i> ${prCount} PRs</span>` : ''}
                <span class="hd-ex-note">${exNote ? escHtml(exNote) : 'Sem notas do exercício.'}</span>
            </div>
            <div class="hd-sets">
                ${sets.map((s, si) => {
                    const weightVal = getSetWeightValue(s);
                    const repsVal = getSetRepsValue(s);
                    const volumeVal = getSetVolumeValue(s);
                    const oneRMVal = getSetOneRMValue(s);
                    const rpeVal = Number(s.rpe);
                    const rpeText = Number.isFinite(rpeVal) ? `PSE ${rpeVal.toFixed(1)}` : 'PSE --';
                    const execVal = Number(s.execucao);
                    const execText = Number.isFinite(execVal) && execVal > 0 ? `Exec ${execVal}` : 'Exec --';
                    const prTypes = getSetPRTypes(s);
                    const prTags = prTypes.map(type => `<span class="hd-pr-chip">${type}</span>`).join('');
                    return `
                    <div class="hd-set-row ${prTypes.length ? 'has-pr' : ''}">
                        <span class="hd-set-num">${si + 1}</span>
                        <span>${formatMetricNumber(weightVal)} kg</span>
                        <span>×</span>
                        <span>${repsVal} reps</span>
                        <span class="hd-set-vol">Vol ${formatMetricNumber(volumeVal)} kg</span>
                        <span class="hd-set-onerm">1RM ${formatMetricNumber(oneRMVal)} kg</span>
                        ${prTags}
                        <span class="hd-set-rpe">${rpeText}</span>
                        <span class="hd-set-exec">${execText}</span>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
    `;
}

function openTrainerHistoryDetail(studentId, originalIdx) {
    const resolvedId = studentId || currentTrainerStudentId;
    if (!resolvedId && resolvedId !== 0) return;

    const history = readStorageJSON('workoutHistory', [])
        .filter(w => String(w.ID_Usuario) === String(resolvedId));

    const workout = history[originalIdx];
    if (!workout) return;

    const modal = document.getElementById('trainer-history-detail-modal');
    const title = document.getElementById('trainer-history-detail-title');
    const body = document.getElementById('trainer-history-detail-body');
    if (!modal || !body) return;

    const durationMin = Math.floor((workout.Duracao || 0) / 60);
    const durationSec = (workout.Duracao || 0) % 60;
    const feedback = workout.Avaliacao_Geral || {};
    const note = (feedback.comentario || '').trim();
    const intensityLabel = feedback.intensidade ? formatIntensityLabel(feedback.intensidade) : '--';
    const qualityLabel = feedback.qualidade ? `${feedback.qualidade}/5` : '--';
    const rpeStats = getWorkoutRpeStats(workout);
    const rpeLabel = rpeStats.avg ? rpeStats.avg.toFixed(1) : '--';
    const prTotal = (workout.Exercicios || []).reduce((sum, ex) => {
        return sum + (ex.sets || []).reduce((inner, s) => inner + getSetPRTypes(s).length, 0);
    }, 0);

    title.textContent = `Treino — ${formatDate(workout.Data_Treino)}`;

    body.innerHTML = `
        <div class="history-detail-stats">
            <div class="hd-stat">
                <i class="ph-bold ph-timer"></i>
                <span>${durationMin}:${durationSec.toString().padStart(2, '0')}</span>
                <small>Duração</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-barbell"></i>
                <span>${workout.Volume_Total} kg</span>
                <small>Volume</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-stack"></i>
                <span>${(workout.Exercicios || []).reduce((s, ex) => s + (ex.sets || []).length, 0)}</span>
                <small>Séries</small>
            </div>
            <div class="hd-stat">
                <i class="ph-fill ph-trophy"></i>
                <span>${prTotal}</span>
                <small>PRs</small>
            </div>
        </div>

        <div class="history-feedback">
            <div class="history-feedback-badges">
                <span class="history-feedback-chip"><i class="ph-bold ph-smiley"></i> Qualidade: ${qualityLabel}</span>
                <span class="history-feedback-chip"><i class="ph-bold ph-lightning"></i> Intensidade: ${intensityLabel}</span>
                <span class="history-feedback-chip"><i class="ph-bold ph-gauge"></i> PSE médio: ${rpeLabel}</span>
            </div>
            ${note ? `<div class="history-feedback-note">${escHtml(note)}</div>` : `<div class="history-feedback-note">Sem notas registradas.</div>`}
        </div>

        <div class="history-detail-exercises">
            ${(workout.Exercicios || []).map(ex => renderHistoryExerciseDetail(ex)).join('')}
        </div>
    `;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeTrainerHistoryDetailModal() {
    const modal = document.getElementById('trainer-history-detail-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 180);
}

function openHistoryDetail(originalIdx) {
    const studentId = memoryGetItem('currentStudentId');
    const history = readStorageJSON('workoutHistory', [])
        .filter(w => w.ID_Usuario === studentId);

    const workout = history[originalIdx];
    if (!workout) return;

    const modal = document.getElementById('history-detail-modal');
    const title = document.getElementById('history-detail-title');
    const body = document.getElementById('history-detail-body');
    if (!modal || !body) return;

    const durationMin = Math.floor((workout.Duracao || 0) / 60);
    const durationSec = (workout.Duracao || 0) % 60;
    const feedback = workout.Avaliacao_Geral || {};
    const note = (feedback.comentario || '').trim();
    const intensityLabel = feedback.intensidade ? formatIntensityLabel(feedback.intensidade) : '--';
    const qualityLabel = feedback.qualidade ? `${feedback.qualidade}/5` : '--';
    const rpeStats = getWorkoutRpeStats(workout);
    const rpeLabel = rpeStats.avg ? rpeStats.avg.toFixed(1) : '--';
    const prTotal = (workout.Exercicios || []).reduce((sum, ex) => {
        return sum + (ex.sets || []).reduce((inner, s) => inner + getSetPRTypes(s).length, 0);
    }, 0);

    title.textContent = `Treino — ${formatDate(workout.Data_Treino)}`;

    body.innerHTML = `
        <div class="history-detail-stats">
            <div class="hd-stat">
                <i class="ph-bold ph-timer"></i>
                <span>${durationMin}:${durationSec.toString().padStart(2, '0')}</span>
                <small>Duração</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-barbell"></i>
                <span>${workout.Volume_Total} kg</span>
                <small>Volume</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-stack"></i>
                <span>${(workout.Exercicios || []).reduce((s, ex) => s + ex.sets.length, 0)}</span>
                <small>Séries</small>
            </div>
            <div class="hd-stat">
                <i class="ph-fill ph-trophy"></i>
                <span>${prTotal}</span>
                <small>PRs</small>
            </div>
        </div>

        <div class="history-feedback">
            <div class="history-feedback-badges">
                <span class="history-feedback-chip"><i class="ph-bold ph-smiley"></i> Qualidade: ${qualityLabel}</span>
                <span class="history-feedback-chip"><i class="ph-bold ph-lightning"></i> Intensidade: ${intensityLabel}</span>
                <span class="history-feedback-chip"><i class="ph-bold ph-gauge"></i> PSE médio: ${rpeLabel}</span>
            </div>
            ${note ? `<div class="history-feedback-note">${escHtml(note)}</div>` : `<div class="history-feedback-note">Sem notas registradas.</div>`}
        </div>

        <div class="history-detail-exercises">
            ${(workout.Exercicios || []).map(ex => renderHistoryExerciseDetail(ex)).join('')}
        </div>
    `;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeHistoryDetailModal() {
    document.getElementById('history-detail-modal').style.display = 'none';
}

function openExerciseProgressModal(exerciseName) {
    const overlay = document.getElementById('exercise-progress-modal-overlay');
    const title = document.getElementById('exercise-progress-title');
    const body = document.getElementById('exercise-progress-body');
    if (!overlay || !title || !body) return;

    const studentId = memoryGetItem('currentStudentId');
    const points = getExerciseProgressSeries(studentId, exerciseName);

    title.textContent = `Historico de Carga - ${exerciseName}`;
    if (points.length === 0) {
        body.innerHTML = `
            <div class="empty-state-card" style="margin-top:0;">
                <i class="ph-bold ph-chart-line-up"></i>
                <p>Nenhum registro de carga para este exercicio ainda.</p>
            </div>
        `;
    } else {
        const maxY = Math.max(...points.map(p => p.kg), 1);
        const minY = Math.min(...points.map(p => p.kg), 0);
        const pad = (maxY - minY) * 0.1 || 2;
        const yMax = maxY + pad;
        const yMin = Math.max(0, minY - pad);
        const width = 560;
        const height = 220;
        const step = points.length > 1 ? (width - 40) / (points.length - 1) : 0;
        const yScale = (v) => 20 + (height - 40) * (1 - ((v - yMin) / (yMax - yMin || 1)));
        const plot = points.map((p, i) => `${20 + i * step},${yScale(p.kg)}`).join(' ');
        const areaPlot = `${plot} ${20 + (points.length - 1) * step},${height - 20} 20,${height - 20}`;
        const latest = points[points.length - 1];
        const best = points.reduce((acc, p) => p.kg > acc.kg ? p : acc, points[0]);
        const avg = Math.round(points.reduce((sum, p) => sum + p.kg, 0) / points.length);
        const prev = points.length > 1 ? points[points.length - 2] : null;
        const diff = prev ? (latest.kg - prev.kg) : 0;
        const diffLabel = prev ? `${diff >= 0 ? '+' : ''}${diff} kg` : '--';
        const diffClass = prev ? (diff >= 0 ? 'up' : 'down') : '';
        const recentRows = points.slice(-5).reverse().map(p => `
            <div class="ep-row">
                <span>${p.date}</span>
                <strong>${p.kg} kg</strong>
            </div>
        `).join('');

        body.innerHTML = `
            <div class="exercise-progress-head refined">
                <div class="eph-card">
                    <span>Ultima carga</span>
                    <strong>${latest.kg} kg</strong>
                </div>
                <div class="eph-card">
                    <span>PR</span>
                    <strong>${best.kg} kg</strong>
                </div>
                <div class="eph-card">
                    <span>Registros</span>
                    <strong>${points.length}</strong>
                </div>
                <div class="eph-card">
                    <span>Media</span>
                    <strong>${avg} kg</strong>
                </div>
                <div class="eph-card ${diffClass}">
                    <span>Tendencia</span>
                    <strong>${diffLabel}</strong>
                </div>
            </div>
            <div class="exercise-progress-chart">
                <svg viewBox="0 0 ${width} ${height}" class="exercise-progress-svg" aria-label="grafico de carga">
                    <polygon class="ep-area" points="${areaPlot}" />
                    <polyline class="ep-line" points="${plot}" />
                    ${points.map((p, i) => {
                        const isLatest = i === points.length - 1;
                        const isBest = p.kg === best.kg && p.date === best.date;
                        const dotClass = `ep-dot${isLatest ? ' latest' : ''}${isBest ? ' best' : ''}`;
                        return `<circle class="${dotClass}" cx="${20 + i * step}" cy="${yScale(p.kg)}" r="${isLatest ? 5 : 3.5}"><title>${p.date}: ${p.kg} kg</title></circle>`;
                    }).join('')}
                </svg>
            </div>
            <div class="exercise-progress-xlabels">
                ${points.map(p => `<span>${p.shortDate}</span>`).join('')}
            </div>
            <div class="exercise-progress-list">
                <div class="ep-list-title">Historico recente</div>
                ${recentRows}
            </div>
        `;
    }

    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeExerciseProgressModal() {
    const overlay = document.getElementById('exercise-progress-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 180);
}

function openExerciseProgressModalEncoded(encodedName) {
    openExerciseProgressModal(decodeURIComponent(encodedName || ''));
}

function getExerciseProgressSeries(studentId, exerciseName) {
    const history = readStorageJSON('workoutHistory', [])
        .filter(h => h.ID_Usuario === studentId)
        .sort((a, b) => new Date(a.Data_Treino) - new Date(b.Data_Treino));

    const series = [];
    history.forEach(w => {
        const ex = (w.Exercicios || []).find(e => e.nome === exerciseName);
        if (!ex || !Array.isArray(ex.sets) || ex.sets.length === 0) return;
        const maxKg = ex.sets.reduce((m, s) => Math.max(m, Number(s.peso || s.weight || 0)), 0);
        if (maxKg <= 0) return;
        const d = new Date(w.Data_Treino);
        series.push({
            kg: maxKg,
            date: d.toLocaleDateString('pt-BR'),
            shortDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        });
    });

    return series;
}

// â”€â”€â”€ Confirmation Modal Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let confirmationCallback = null;

function openConfirmationModal(title, message, callback) {
    const modal = document.getElementById('confirmation-modal-overlay');
    if (!modal) return;

    document.getElementById('confirmation-modal-title').innerText = title;
    document.getElementById('confirmation-modal-message').innerText = message;
    document.getElementById('confirmation-input').value = '';

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    confirmationCallback = callback;

    const confirmBtn = document.getElementById('confirmation-modal-confirm-btn');
    confirmBtn.onclick = () => {
        const inputField = document.getElementById('confirmation-input');
        const input = inputField.value.trim().toLowerCase();
        if (input === 'remover') {
            if (confirmationCallback) confirmationCallback();
            closeConfirmationModal();
        } else {
            inputField.classList.remove('shake-error');
            void inputField.offsetWidth; // Trigger reflow
            inputField.classList.add('shake-error');
            setTimeout(() => inputField.classList.remove('shake-error'), 500);
        }
    };
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal-overlay');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    confirmationCallback = null;
}

function confirmDeleteWorkout(idx) {
    openConfirmationModal(
        'Excluir Treino',
        'Tem certeza que deseja excluir este registro de treino? Esta ação não pode ser desfeita.',
        () => deleteWorkoutEntry(idx)
    );
}

function deleteWorkoutEntry(idx) {
    const history = readStorageJSON('workoutHistory', []);
    history.splice(idx, 1);
    memorySetItem('workoutHistory', JSON.stringify(history));
    renderWorkoutHistory();
    syncChannel.postMessage({ type: 'workout_history_updated' });
}

function confirmDeleteMetric(idxInHistory) {
    openConfirmationModal(
        'Excluir Medição',
        'Tem certeza que deseja excluir este registro de medidas? Isso afetará os gráficos e médias globais.',
        () => deleteMetricEntry(idxInHistory)
    );
}

function deleteMetricEntry(idx) {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const sIdx = students.findIndex(s => s.id === studentId);

    if (sIdx !== -1) {
        students[sIdx].metricHistory.splice(idx, 1);

        // Update current values from lateast if needed
        const history = students[sIdx].metricHistory;
        if (history.length > 0) {
            const latest = history[history.length - 1];
            students[sIdx].currentWeight = latest.weight || students[sIdx].currentWeight;
            students[sIdx].currentBF = latest.bodyFat || students[sIdx].currentBF;
        }

        memorySetItem('trainerStudents', JSON.stringify(students));
        renderStudentPerfil();
        syncChannel.postMessage({ type: 'student_data_updated' });
    }
}

// ─── Q&A / Dúvidas ──────────────────────────────────────────────────────────

function openDuvidaModal() {
    const modal = document.getElementById('duvida-modal-overlay');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeDuvidaModal() {
    const modal = document.getElementById('duvida-modal-overlay');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function enviarDuvida() {
    const assunto = document.getElementById('duvida-assunto')?.value || 'outro';
    const texto = sanitizeUserInput(document.getElementById('duvida-texto')?.value, { allowNewlines: true, maxLen: 1200 });

    if (!texto) {
        alert('Por favor, descreva sua dúvida.');
        return;
    }

    const studentName = memoryGetItem('studentName') || 'Aluno';
    const assuntoLabels = {
        'exercicio': 'Dúvida sobre exercício',
        'execucao': 'Dúvida sobre execução',
        'substituicao': 'Substituição de exercício',
        'carga': 'Dúvida sobre carga',
        'outro': 'Outro'
    };

    const studentId = memoryGetItem('currentStudentId');

    // Send as notification to trainer
    let notifs = readStorageJSON('trainerNotifications', []);
    notifs.unshift({
        type: 'duvida',
        studentId: studentId,
        studentName: studentName,
        title: `💬 Dúvida de ${studentName}`,
        desc: `[${assuntoLabels[assunto]}] ${texto}`,
        time: new Date().toISOString(),
        unread: true
    });
    memorySetItem('trainerNotifications', JSON.stringify(notifs));

    // Broadcast change
    syncChannel.postMessage({ type: 'NEW_DOUBT' });

    // Clear and close
    document.getElementById('duvida-texto').value = '';
    closeDuvidaModal();

    // Feedback
    alert('✅ Dúvida enviada com sucesso! Seu treinador receberá a mensagem.');
}

function getMuscleGroups(exercises) {
    const muscles = new Set();
    const map = {
        'peito': 'Peito', 'supino': 'Peito', 'crucifixo': 'Peito', 'voador': 'Peito', 'chest': 'Peito',
        'costas': 'Costas', 'puxada': 'Costas', 'remada': 'Costas', 'back': 'Costas', 'pulldown': 'Costas',
        'ombro': 'Ombros', 'desenvolvimento': 'Ombros', 'lateral': 'Ombros', 'shoulder': 'Ombros',
        'triceps': 'Tríceps', 'tríceps': 'Tríceps', 'extension': 'Tríceps',
        'biceps': 'Bíceps', 'bíceps': 'Bíceps', 'rosca': 'Bíceps', 'curl': 'Bíceps',
        'perna': 'Pernas', 'agachamento': 'Pernas', 'leg': 'Pernas', 'extensora': 'Pernas', 'flexora': 'Pernas', 'panturrilha': 'Pernas',
        'abdomen': 'Abdominais', 'abdominal': 'Abdominais', 'crunch': 'Abdominais', 'prancha': 'Abdominais'
    };

    exercises.forEach(ex => {
        const name = ex.nome.toLowerCase();
        for (const [key, val] of Object.entries(map)) {
            if (name.includes(key)) muscles.add(val);
        }
    });

    return muscles.size > 0 ? Array.from(muscles) : ['Geral'];
}

function computeDietMacroData(student) {
    const blocks = Array.isArray(student?.mealBlocks) ? student.mealBlocks : [];
    let totalProtein = 0;
    let totalCarb = 0;
    let totalFat = 0;

    blocks.forEach((meal) => {
        (meal.items || []).forEach((item) => {
            totalProtein += parseDecimalSafe(item.prot);
            totalCarb += parseDecimalSafe(item.carb);
            totalFat += parseDecimalSafe(item.gord);
        });
    });

    const targetProtein = Math.max(1, parseDecimalSafe(student?.dietMeta?.protein) || 150);
    const targetCarb = Math.max(1, parseDecimalSafe(student?.dietMeta?.carb) || 220);
    const targetFat = Math.max(1, parseDecimalSafe(student?.dietMeta?.fat) || 70);

    return {
        totals: {
            protein: Math.round(totalProtein),
            carb: Math.round(totalCarb),
            fat: Math.round(totalFat)
        },
        targets: {
            protein: Math.round(targetProtein),
            carb: Math.round(targetCarb),
            fat: Math.round(targetFat)
        },
        progress: {
            protein: Math.min(100, Math.max(8, Math.round((totalProtein / targetProtein) * 100))),
            carb: Math.min(100, Math.max(8, Math.round((totalCarb / targetCarb) * 100))),
            fat: Math.min(100, Math.max(8, Math.round((totalFat / targetFat) * 100)))
        }
    };
}

window.updateWater = function (delta) {
    let count = parseInt(memoryGetItem('water_cups') || '0', 10);
    count = Math.max(0, count + delta);
    memorySetItem('water_cups', count);
    const el = document.getElementById('water-counter-display');
    if (el) el.innerText = count;
};

function renderStudentDietContent(student) {
    const macro = computeDietMacroData(student);
    const meals = Array.isArray(student?.mealBlocks) ? student.mealBlocks : [];
    const savedWater = memoryGetItem('water_cups') || '0';

    const summaryCard = `
        <div class="diet-macro-summary-card">
            <div class="diet-macro-summary-title">Macros Diários</div>
            <div class="diet-progress-row">
                <div class="diet-progress-label protein">${uiSvgIcon('protein')} Proteína</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill protein" style="width:${macro.progress.protein}%"></span></div>
                <div class="diet-progress-value">${macro.totals.protein}/${macro.targets.protein}g</div>
            </div>
            <div class="diet-progress-row">
                <div class="diet-progress-label carb">${uiSvgIcon('carb')} Carboidrato</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill carb" style="width:${macro.progress.carb}%"></span></div>
                <div class="diet-progress-value">${macro.totals.carb}/${macro.targets.carb}g</div>
            </div>
            <div class="diet-progress-row">
                <div class="diet-progress-label fat">${uiSvgIcon('fat')} Gordura</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill fat" style="width:${macro.progress.fat}%"></span></div>
                <div class="diet-progress-value">${macro.totals.fat}/${macro.targets.fat}g</div>
            </div>
        </div>
    `;

    const mealCards = meals.map((meal, idx) => `
        <div class="meal-block meal-glass-card">
            <div class="block-header meal-header-glass tone-${idx % 3}" style="display: flex; justify-content: space-between; align-items: center;">
                <h3>${escHtml(meal.name)}</h3>
                <button class="btn-icon-tiny meal-check-btn" onclick="handleMealCheckClick(this)" title="Marcar como consumida" style="color: rgba(255,255,255,0.4); border: 2px solid currentColor; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;">
                    ${uiSvgIcon('check')}
                </button>
            </div>
            <div class="meal-items-list">
                ${(meal.items || []).map(item => `
                    <div class="meal-item-row">
                        <div style="flex:1;">
                            <strong>${escHtml(item.nome)}</strong>
                            <span class="text-sub">${escHtml(item.qtd)}</span>
                        </div>
                        <div class="meal-macros-mini">
                            <span class="macro-badge kcal">${item.kcal} kcal</span>
                            <span class="macro-badge protein">${uiSvgIcon('protein')} ${item.prot}g P</span>
                            <span class="macro-badge carb">${uiSvgIcon('carb')} ${item.carb}g C</span>
                            <span class="macro-badge fat">${uiSvgIcon('fat')} ${item.gord}g G</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    const waterCard = `
        <div class="meal-block meal-glass-card" style="text-align: center; padding: 1.5rem; margin-top: 1rem;">
            <h3 style="margin-bottom: 1rem; color: #60a5fa; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="ph-fill ph-drop" style="font-size: 1.5rem;"></i> Consumo de Água
            </h3>
            <div style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; font-size: 2rem;">
                <button class="btn-icon" onclick="updateWater(-1)" style="color: #f87171; background: rgba(248,113,113,0.1); border-radius: 50%; width: 48px; height: 48px;">
                    <i class="ph-bold ph-minus"></i>
                </button>
                <div style="display: flex; align-items: baseline; gap: 4px;">
                    <span id="water-counter-display" style="font-weight: 800; font-size: 2.5rem;">${savedWater}</span>
                    <span style="font-size: 1rem; color: rgba(255,255,255,0.6); font-weight: 600;">copos</span>
                </div>
                <button class="btn-icon" onclick="updateWater(1)" style="color: #60a5fa; background: rgba(96,165,250,0.1); border-radius: 50%; width: 48px; height: 48px;">
                    <i class="ph-bold ph-plus"></i>
                </button>
            </div>
            <p style="margin-top: 1rem; font-size: 0.85rem; color: rgba(255,255,255,0.5);">A meta recomendada é de ~8 a 10 copos por dia (2L+)</p>
        </div>
    `;

    return `${summaryCard}${mealCards}${waterCard}`;
}

function handleMealCheckClick(buttonEl) {
    if (!buttonEl) return;
    const isActive = buttonEl.classList.toggle('consumed');
    if (isActive) {
        buttonEl.style.color = '#4ade80';
        buttonEl.style.borderColor = '#4ade80';
        buttonEl.innerHTML = uiSvgIcon('check-circle');
    } else {
        buttonEl.style.color = 'rgba(255,255,255,0.4)';
        buttonEl.style.borderColor = 'currentColor';
        buttonEl.innerHTML = uiSvgIcon('check');
    }
    triggerHaptic(20);
}

function renderStudentDietMain() {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    const container = document.getElementById('student-diet-content-main');
    if (!container) return;

    if (!student || !student.active || !student.mealBlocks) {
        container.innerHTML = `<div class="empty-state-card" style="margin-top:2rem;">
            <i class="ph-fill ph-hourglass-high"></i>
            <div class="empty-info">
                <h3>Dieta em análise</h3>
                <p>Seu plano alimentar ainda não foi liberado pelo treinador.</p>
            </div>
        </div>`;
        return;
    }

    container.innerHTML = renderStudentDietContent(student);
    optimizeMediaElements(container);
}

function handleUnifiedLogin() {
    const code = sanitizeCodeInput(document.getElementById('global-code')?.value, 5);
    const codeInput = document.getElementById('global-code');
    if (codeInput) codeInput.value = code;
    if (code.length !== 5) {
        alert('Digite o código de 5 dígitos.');
        return;
    }

    // 1. Aluno admin fixo
    if (code === ADMIN_STUDENT_CODE) {
        ensureAdminStudent();
        const students = readStorageJSON('trainerStudents', []);
        const adminStudent = students.find(s => s.id === ADMIN_STUDENT_CODE);
        openStudentDashboardSession(adminStudent || {
            id: ADMIN_STUDENT_CODE,
            name: ADMIN_STUDENT_NAME,
            trainerCode: '00001'
        });
        return;
    }

    // 1.1 Aluno auto treino (Diego)
    if (code === SELF_TRAINING_STUDENT_CODE) {
        ensureSelfTrainingStudent();
        const students = readStorageJSON('trainerStudents', []);
        const selfStudent = students.find(s => s.id === SELF_TRAINING_STUDENT_CODE);
        openStudentDashboardSession(selfStudent || {
            id: SELF_TRAINING_STUDENT_CODE,
            name: SELF_TRAINING_STUDENT_NAME,
            trainerCode: '00001'
        });
        return;
    }

    // 2. Check Trainer (Admin or allTrainers)
    const trainers = readStorageJSON('allTrainers', []);
    const isTrainer = trainers.some(t => t.code === code) || code === '00001';

    if (isTrainer) {
        // Redirect to trainer dashboard
        // Note: For simplicity, we could store 'trainerSessionCode' to auto-login in trainer.html
        memorySetItem('trainerSessionCode', code);
        window.location.href = 'trainer.html';
        return;
    }

    // 3. Check Student
    const allStudents = readStorageJSON('trainerStudents', []);
    const student = allStudents.find(s => s.id === code);

    if (student) {
        openStudentDashboardSession(student);
        return;
    }

    alert('Código não encontrado. Se você é novo, use as opções da tela inicial.');
}

let pendingTrainerCode = '';

function connectStudent() {
    const code = sanitizeCodeInput(document.getElementById('trainer-code')?.value, 5);
    const codeInput = document.getElementById('trainer-code');
    if (codeInput) codeInput.value = code;
    if (code.length !== 5) {
        alert('O código deve ter exatamente 5 dígitos.');
        return;
    }

    // Demo Beta login direto do aluno pelo botao "Conectar"
    if (code === ADMIN_STUDENT_CODE) {
        ensureAdminStudent();
        const students = readStorageJSON('trainerStudents', []);
        const adminStudent = students.find(s => s.id === ADMIN_STUDENT_CODE);
        openStudentDashboardSession(adminStudent || {
            id: ADMIN_STUDENT_CODE,
            name: ADMIN_STUDENT_NAME,
            trainerCode: '00001'
        });
        return;
    }

    if (code === SELF_TRAINING_STUDENT_CODE) {
        ensureSelfTrainingStudent();
        const students = readStorageJSON('trainerStudents', []);
        const selfStudent = students.find(s => s.id === SELF_TRAINING_STUDENT_CODE);
        openStudentDashboardSession(selfStudent || {
            id: SELF_TRAINING_STUDENT_CODE,
            name: SELF_TRAINING_STUDENT_NAME,
            trainerCode: '00001'
        });
        return;
    }

    // Admin code fallback
    let coachName = '';
    let consultoriaName = '';

    if (code === '00001') {
        coachName = 'Administrador Teste';
        consultoriaName = 'Admin Consultoria';
    } else {
        // Search in trainer data
        const trainers = readStorageJSON('allTrainers', []);
        const t = trainers.find(x => x.code === code);
        if (t) {
            coachName = t.name;
            consultoriaName = t.consultoriaName || `Consultoria de ${t.name.split(' ')[0]} `;
        } else {
            alert('Código de treinador não encontrado.');
            return;
        }
    }

    // If this device already has a remembered student for this trainer, login instantly.
    const remembered = readStudentAuthToken();
    if (remembered && remembered.studentId) {
        const students = readStorageJSON('trainerStudents', []);
        const rememberedStudent = students.find(s =>
            String(s.id) === String(remembered.studentId) &&
            String(s.trainerCode || '') === String(code)
        );
        if (rememberedStudent) {
            openStudentDashboardSession(rememberedStudent);
            return;
        }
    }

    pendingTrainerCode = code;
    document.getElementById('confirm-trainer-name').innerText = coachName;
    document.getElementById('confirm-consultoria-name').innerText = consultoriaName;

    hideAllScreens();
    document.getElementById('student-confirm-screen').classList.add('active');
}

function confirmConnection() {
    hideAllScreens();
    document.getElementById('app').classList.add('wide');
    document.getElementById('student-questionnaire-screen').classList.add('active');
    switchQTab('saude');
}

function switchQTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.q-tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Deactivate all buttons
    const btns = document.querySelectorAll('.q-tab');
    btns.forEach(btn => btn.classList.remove('active'));

    // Show selected
    const tabEl = document.getElementById(`q-tab-${tabName}`);
    const btnEl = document.getElementById(`btn-tab-${tabName}`);
    if (tabEl) tabEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');

    // Note: renderQuestions() was removed to preserve the full HTML questionnaire layout
}

async function submitQuestionnaire() {
    // Collect specific student data
    const nome = sanitizeUserInput(document.getElementById('q_nome')?.value, { maxLen: 90 }) || 'Aluno';
    const ageRaw = parseInt(document.getElementById('q_idade')?.value, 10);
    const age = String(Number.isFinite(ageRaw) ? Math.min(100, Math.max(10, ageRaw)) : 25);
    const gender = document.getElementById('q_genero')?.value || 'M';
    const weightRaw = parseFloat(String(document.getElementById('q_peso')?.value || '').replace(',', '.'));
    const heightRaw = parseFloat(String(document.getElementById('q_altura')?.value || '').replace(',', '.'));
    const weight = String(Number.isFinite(weightRaw) ? Math.min(350, Math.max(20, weightRaw)) : 70);
    const height = String(Number.isFinite(heightRaw) ? Math.min(250, Math.max(100, heightRaw)) : 175);
    const goal = sanitizeUserInput(document.getElementById('q_objetivo')?.value, { maxLen: 120 }) || 'Hipertrofia';

    if (nome.length < 2) {
        alert('Informe seu nome para continuar.');
        return;
    }

    if (!pendingTrainerCode || pendingTrainerCode.length !== 5) {
        alert('Conex?o com treinador inv?lida. Refa?a o processo de conex?o.');
        return;
    }

    const getCheckedValues = (selector) => Array.from(document.querySelectorAll(selector)).map(el => el.value);
    const getRadioValue = (name, fallback = '') => document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
    const getInputValue = (id, maxLen = 200) => sanitizeUserInput(document.getElementById(id)?.value, { maxLen });

    const questionnaire = {
        saude: {
            dor: getRadioValue('q_dor', 'nao'),
            dor_desc: getInputValue('q_dor_desc', 200),
            condicoes: getCheckedValues('input[name="q_cond"]:checked'),
            med: getRadioValue('q_med', 'nao'),
            med_desc: getInputValue('q_med_desc', 200),
            cirurgia: getRadioValue('q_cirurgia', 'nao'),
            cirurgia_desc: getInputValue('q_cirurgia_desc', 200)
        },
        nutricao: {
            restricoes: getCheckedValues('input[name="q_restr"]:checked'),
            nao_come: getInputValue('q_nao_come', 200),
            intestino: getRadioValue('q_intestino', 'sim'),
            refeicoes: getRadioValue('q_refeicoes', '4')
        },
        rotina: {
            sono: getInputValue('q_sono', 10),
            descansado: getRadioValue('q_descansado', 'sim'),
            estresse: getInputValue('q_estresse', 10),
            fumo: getRadioValue('q_fumo', 'nao'),
            alcool: getRadioValue('q_alcool', 'nao'),
            trabalho: getRadioValue('q_trab', 'sentado')
        },
        treino: {
            tempo_pratica: getInputValue('q_tempo_pratica', 120),
            exercicios_ama: getInputValue('q_exercicios_ama', 200),
            exercicios_detesta: getInputValue('q_exercicios_detesta', 200),
            dias: getCheckedValues('input[name="q_dias"]:checked'),
            duracao: getRadioValue('q_duracao', '60')
        },
        metas: {
            incomoda: sanitizeUserInput(document.getElementById('q_incomoda')?.value, { maxLen: 300, allowNewlines: true }),
            objetivo_3_meses: sanitizeUserInput(document.getElementById('q_objetivo')?.value, { maxLen: 300, allowNewlines: true }),
            consultoria_antes: sanitizeUserInput(document.getElementById('q_consultoria_antes')?.value, { maxLen: 300, allowNewlines: true })
        }
    };

    let id = Math.floor(10000 + Math.random() * 90000).toString();
    const usedIds = new Set((readStorageJSON('trainerStudents', [])).map(s => String(s.id)));
    while (id === ADMIN_STUDENT_CODE || id === SELF_TRAINING_STUDENT_CODE || usedIds.has(id)) {
        id = Math.floor(10000 + Math.random() * 90000).toString();
    }
    const newStudent = {
        id: id,
        name: nome,
        age: age,
        gender: gender,
        weight: weight,
        height: height,
        goal: goal,
        active: false,
        pending: true,
        trainerCode: pendingTrainerCode,
        joinedAt: new Date().toISOString(),
        metricHistory: [{
            date: new Date().toISOString(),
            weight: parseFloat(weight),
            height: parseFloat(height),
            bodyFat: null
        }],
        personalRecords: {},
        questionnaire: questionnaire
    };
    newStudent.tmbBase = Math.round(calcTMBMifflin(newStudent.weight, newStudent.height, newStudent.age, newStudent.gender));

    if (isSupabaseReady()) {
        const fallbackName = pendingTrainerCode === '00001' ? 'Administrador Teste' : 'Treinador';
        const fallbackConsultoria = fallbackName ? `Consultoria de ${fallbackName.split(' ')[0]} ` : '';
        await ensureTrainerExistsRemote(pendingTrainerCode, fallbackName, fallbackConsultoria);
    }

    let students = readStorageJSON('trainerStudents', []);
    students.push(newStudent);
    saveStudentData(students);

    let notifs = readStorageJSON('trainerNotifications', []);
    notifs.unshift({
        type: 'questionnaire',
        title: 'Question?rio Respondido!',
        desc: `Um novo aluno acabou de enviar o question?rio inicial.`,
        time: 'Agora mesmo',
        unread: true
    });
    memorySetItem('trainerNotifications', JSON.stringify(notifs));

    // Save current session info + remember-me token
    openStudentDashboardSession(newStudent);
}

// ?? Student Dashboard (Real Data) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function initStudentDashboard() {
    pullAppStateIfNewer();
    startSyncPolling();
    if (trainerCode && trainerCode !== '00000') {
        syncStudentsFromSupabase(trainerCode);
        if (!supabaseStudentsPollTimer) {
            supabaseStudentsPollTimer = setInterval(() => {
                syncStudentsFromSupabase(trainerCode);
            }, 20000);
        }
    }
    const studentId = memoryGetItem('currentStudentId');
    const trainerCode = memoryGetItem('connectedTrainerCode');
    const studentName = memoryGetItem('studentName') || 'Aluno';

    document.getElementById('dash-student-name').innerText = `Olá, ${studentName.split(' ')[0]} `;
    document.getElementById('dash-student-trainer').innerText = trainerCode || 'Consultoria';

    // Sync sidebar name
    const sideName = document.getElementById('side-student-name');
    if (sideName) sideName.innerText = studentName.split(' ')[0];

    // Show student's own access code
    const scRef = document.getElementById('student-code-ref');
    if (scRef) scRef.innerText = studentId;

    if (!studentId) {
        renderStudentBaseCalories(null);
        setProtocolStatus(false);
        return;
    }

    const students = readStorageJSON('trainerStudents', []);
    const studentIdx = students.findIndex(s => s.id === studentId);
    const student = studentIdx >= 0 ? students[studentIdx] : null;

    if (student) {
        const prevTmb = parseIntegerSafe(student.tmbBase);
        const nextTmb = syncStudentTmbData(student);
        if (nextTmb !== prevTmb) {
            students[studentIdx] = student;
            saveStudentData(students);
        }
    }

    renderStudentBaseCalories(student || null);

    if (student && student.active) {
        setProtocolStatus(true);
        renderWorkoutStartOptions(student);
    } else {
        setProtocolStatus(false);
    }

    // Check if there is a workout in progress (show "Continuar treino")
    refreshWorkoutBackupIndicator();
}

function renderWorkoutStartOptions(student) {
    const container = document.getElementById('student-workout-start-options');
    if (!container) return;
    const canEditWorkout = studentCanEditWorkout(student);
    const blocks = Array.isArray(student?.workoutBlocks) ? student.workoutBlocks : [];
    const backup = getWorkoutBackup();
    if (blocks.length === 0) {
        const continueCard = backup ? `
            <button class="action-card highlight" onclick="resumeWorkoutBackup()"
                style="background: rgba(250, 204, 21, 0.12); border-color: rgba(250, 204, 21, 0.35); padding: 1rem;">
                <i class="ph-fill ph-play-circle" style="color: #facc15; font-size: 1.5rem;"></i>
                <div style="flex:1; text-align: left;">
                    <span style="display: block; font-weight: 700; color: var(--text-main); font-size: 1rem;">Continuar treino</span>
                    <span style="font-size: 0.75rem; color: #facc15; font-weight: 500;">${escHtml(backup.title || 'Treino em andamento')}</span>
                </div>
                <i class="ph-bold ph-caret-right" style="color: #facc15; font-size: 1rem;"></i>
            </button>` : '';
        if (canEditWorkout) {
            container.innerHTML = `${continueCard}
            <button class="action-card highlight" onclick="openStudentWorkoutEditor()"
                style="background: rgba(163, 230, 53, 0.1); border-color: rgba(163, 230, 53, 0.3); padding: 1rem;">
                <i class="ph-fill ph-plus-circle" style="color: var(--primary-color); font-size: 1.5rem;"></i>
                <div style="flex:1; text-align: left;">
                    <span style="display: block; font-weight: 700; color: var(--text-main); font-size: 1rem;">Montar meu treino</span>
                    <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: 500;">Crie o primeiro bloco agora</span>
                </div>
                <i class="ph-bold ph-caret-right" style="color: var(--primary-color); font-size: 1rem;"></i>
            </button>`;
        } else {
            container.innerHTML = continueCard;
        }
        return;
    }

    const continueCard = backup ? `
        <button class="action-card highlight" onclick="resumeWorkoutBackup()"
            style="background: rgba(250, 204, 21, 0.12); border-color: rgba(250, 204, 21, 0.35); padding: 1rem;">
            <i class="ph-fill ph-play-circle" style="color: #facc15; font-size: 1.5rem;"></i>
            <div style="flex:1; text-align: left;">
                <span style="display: block; font-weight: 700; color: var(--text-main); font-size: 1rem;">Continuar treino</span>
                <span style="font-size: 0.75rem; color: #facc15; font-weight: 500;">${escHtml(backup.title || 'Treino em andamento')}</span>
            </div>
            <i class="ph-bold ph-caret-right" style="color: #facc15; font-size: 1rem;"></i>
        </button>` : '';

    const startCards = blocks.map((block, idx) => {
        const exercises = Array.isArray(block.exercises) ? block.exercises : [];
        const muscles = getMuscleGroups(exercises);
        const title = getWorkoutBlockTitle(block, idx);
        const exCount = exercises.length;
        return `
        <button class="action-card highlight" onclick="startWorkoutSession(${idx})"
            style="background: rgba(163, 230, 53, 0.1); border-color: rgba(163, 230, 53, 0.3); padding: 1rem;">
            <i class="ph-fill ph-play-circle" style="color: var(--primary-color); font-size: 1.5rem;"></i>
            <div style="flex:1; text-align: left;">
                <span style="display: block; font-weight: 700; color: var(--text-main); font-size: 1rem;">${escHtml(title)}</span>
                <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: 500;">${muscles.join(' • ')}</span>
                <span style="display:block; font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">${exCount} exercícios</span>
            </div>
            <i class="ph-bold ph-caret-right" style="color: var(--primary-color); font-size: 1rem;"></i>
        </button> `;
    }).join('');

    const editCard = canEditWorkout ? `
        <button class="action-card" onclick="openStudentWorkoutEditor()"
            style="background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.25); padding: 1rem;">
            <i class="ph-bold ph-pencil-simple" style="color: #60a5fa; font-size: 1.4rem;"></i>
            <div style="flex:1; text-align: left;">
                <span style="display: block; font-weight: 700; color: var(--text-main); font-size: 0.95rem;">Editar meu treino</span>
                <span style="font-size: 0.72rem; color: rgba(96,165,250,0.9); font-weight: 500;">Adicionar ou remover exercícios</span>
            </div>
            <i class="ph-bold ph-caret-right" style="color: rgba(96,165,250,0.9); font-size: 1rem;"></i>
        </button>` : '';

    container.innerHTML = `${continueCard}${startCards}${editCard}`;
}

function setProtocolStatus(isReady) {
    const elWaiting = document.getElementById('student-actions-waiting');
    const elReady = document.getElementById('student-actions-ready');
    const statusTreino = document.getElementById('status-treino');
    const statusDieta = document.getElementById('status-dieta');

    if (isReady) {
        if (elWaiting) elWaiting.style.display = 'none';
        if (elReady) elReady.style.display = 'block';

        if (statusTreino) {
            statusTreino.innerHTML = 'Ativo';
            statusTreino.className = 'text-success';
        }

        if (statusDieta) {
            statusDieta.innerHTML = 'Ativo';
            statusDieta.className = 'text-success';
        }
    } else {
        if (elReady) elReady.style.display = 'none';
        if (elWaiting) elWaiting.style.display = 'flex';

        if (statusTreino) {
            statusTreino.innerHTML = 'Pendente';
            statusTreino.className = 'text-warning';
        }

        if (statusDieta) {
            statusDieta.innerHTML = 'Pendente';
            statusDieta.className = 'text-warning';
        }
    }
}

// Detail Views for Students
function openStudentWorkout() {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (!student || !student.workoutBlocks) return;

    const container = document.getElementById('student-workout-content');
    if (!container) return;

    container.innerHTML = student.workoutBlocks.map((block, idx) => `
        <div class="workout-day-block">
            <div class="block-header">
                <h3>${escHtml(getWorkoutBlockTitle(block, idx))}</h3>
            </div>
            <div class="ex-list">
                ${(block.exercises || []).map(ex => {
        const note = ex.observacao || ex.obs;
        return `
                    <div class="ex-row">
                        <div class="ex-main-info">
                            <span class="ex-name">${escHtml(ex.nome)}</span>
                            ${note ? `<span class="ex-obs">${escHtml(note)}</span>` : ''}
                        </div>
                        <div class="ex-stats">
                            <div class="st-item"><span>Séries</span><strong>${ex.series}</strong></div>
                            <div class="st-item"><span>Reps</span><strong>${ex.reps}</strong></div>
                            <div class="st-item"><span>Carga</span><strong>${ex.carga}</strong></div>
                            <div class="st-item"><span>Desc.</span><strong>${ex.descanso}</strong></div>
                        </div>
                    </div>
                `;
    }).join('')}
            </div>
        </div>
        `).join('');

    document.getElementById('student-workout-screen').classList.add('active');
}

function closeStudentWorkout() {
    document.getElementById('student-workout-screen').classList.remove('active');
}

function openStudentDiet() {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (!student || !student.mealBlocks) return;

    const container = document.getElementById('student-diet-content');
    if (!container) return;

    container.innerHTML = renderStudentDietContent(student);
    optimizeMediaElements(container);

    document.getElementById('student-diet-screen').classList.add('active');
}

function closeStudentDiet() {
    document.getElementById('student-diet-screen').classList.remove('active');
}

// â”€â”€â”€ Meu Perfil (Student Profile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _perfilModalField = '';

function getStudentData() {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    return { studentId, students, student: students.find(s => s.id === studentId) };
}

function saveStudentData(students) {
    memorySetItem('trainerStudents', JSON.stringify(students));
    queueSupabaseStudentsSync(students);
}

function calcIMC(weight, height) {
    if (!weight || !height) return 0;
    const h = parseFloat(height) / 100;
    return (parseFloat(weight) / (h * h)).toFixed(1);
}

function parseDecimalSafe(value) {
    const parsed = parseFloat(String(value ? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseIntegerSafe(value) {
    const parsed = parseInt(String(value ? ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function calcTMBMifflin(weightKg, heightCm, ageYears, gender) {
    const peso = parseDecimalSafe(weightKg);
    const altura = parseDecimalSafe(heightCm);
    const idade = parseIntegerSafe(ageYears);
    if (peso <= 0 || altura <= 0 || idade <= 0) return 0;

    const genero = normalizeText(gender);
    const ajusteGenero = (genero === 'f' || genero.startsWith('fem')) ? -161 : 5;
    return (10 * peso) + (6.25 * altura) - (5 * idade) + ajusteGenero;
}

function syncStudentTmbData(student) {
    if (!student || typeof student !== 'object') return 0;
    const tmb = Math.round(calcTMBMifflin(student.weight, student.height, student.age, student.gender));
    if (!Number.isFinite(tmb) || tmb <= 0) {
        student.tmbBase = null;
        return 0;
    }
    student.tmbBase = tmb;
    return tmb;
}

function renderStudentBaseCalories(student) {
    const valueEl = document.getElementById('status-gasto-base');
    const hintEl = document.getElementById('status-gasto-base-hint');
    if (!valueEl) return;

    if (!student) {
        valueEl.innerText = '--';
        if (hintEl) hintEl.innerText = 'Meta Calórica Diária';
        return;
    }

    const tmb = syncStudentTmbData(student);
    if (!tmb) {
        valueEl.innerText = '--';
        if (hintEl) hintEl.innerText = 'Meta Calórica Diária';
        return;
    }

    valueEl.innerText = `${tmb} kcal`;
    if (hintEl) hintEl.innerText = 'Meta Calórica Diária';
}

function getIMCLabel(imc) {
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25) return 'Peso saudável';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidade';
}

function getPercentDelta(current, previous) {
    if (!previous || previous == 0) return null;
    return (((current - previous) / previous) * 100).toFixed(1);
}

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} `;
}

function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getDate()} ${months[d.getMonth()]} `;
}

function renderStudentPerfil() {
    const { student } = getStudentData();
    if (!student) return;

    const history = student.metricHistory || [];
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;
    const prevEntry = history.length > 1 ? history[history.length - 2] : null;

    const weight = parseFloat(student.weight) || 0;
    const height = parseFloat(student.height) || 0;
    const imc = calcIMC(weight, height);
    const bodyFat = parseFloat(student.bodyFat) || 0;

    const prevWeight = prevEntry ? parseFloat(prevEntry.weight) : null;
    const prevBodyFat = prevEntry ? parseFloat(prevEntry.bodyFat || 0) : null;

    // Profile header
    const nameEl = document.getElementById('perfil-nome');
    if (nameEl) nameEl.innerHTML = student.name || 'Aluno';

    const avatarEl = document.getElementById('perfil-avatar');
    if (avatarEl) {
        const initials = (student.name || 'A').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.innerHTML = `<span>${initials}</span>`;
    }

    const membroEl = document.getElementById('perfil-membro-desde');
    if (membroEl) membroEl.innerHTML = `Membro desde ${formatDate(student.joinedAt)} `;

    // Metrics grid
    const metricsGrid = document.getElementById('perfil-metrics-grid');
    if (metricsGrid) {
        const weightDelta = getPercentDelta(weight, prevWeight);
        const imcVal = parseFloat(imc);
        const bfDelta = getPercentDelta(bodyFat, prevBodyFat);

        metricsGrid.innerHTML = `
        <div class="perfil-metric-card" onclick="openPerfilUpdateModal('peso')">
                <div class="metric-card-top">
                    <span class="metric-label">Peso</span>
                    <button class="metric-edit-btn"><i class="ph-bold ph-pencil-simple"></i></button>
                </div>
                <div class="metric-value">${weight}<span class="metric-unit">kg</span></div>
                ${weightDelta !== null ? `
                    <div class="metric-delta ${parseFloat(weightDelta) > 0 ? 'up' : parseFloat(weightDelta) < 0 ? 'down' : ''}">
                        <i class="ph-bold ${parseFloat(weightDelta) > 0 ? 'ph-trend-up' : parseFloat(weightDelta) < 0 ? 'ph-trend-down' : 'ph-minus'}"></i>
                        ${Math.abs(weightDelta)}% desde última atualização
                    </div>
                ` : '<div class="metric-delta neutral">Primeiro registro</div>'
            }
            </div>

            <div class="perfil-metric-card">
                <div class="metric-card-top">
                    <span class="metric-label">IMC</span>
                </div>
                <div class="metric-value">${imc}<span class="metric-unit">kg/m²</span></div>
                <div class="metric-delta ${imcVal < 25 && imcVal >= 18.5 ? 'healthy' : 'warn'}">
                    <i class="ph-bold ${imcVal < 25 && imcVal >= 18.5 ? 'ph-check-circle' : 'ph-warning'}"></i>
                    ${getIMCLabel(imcVal)}
                </div>
            </div>

            <div class="perfil-metric-card" onclick="openPerfilUpdateModal('gordura')">
                <div class="metric-card-top">
                    <span class="metric-label">% Gordura</span>
                    <button class="metric-edit-btn"><i class="ph-bold ph-pencil-simple"></i></button>
                </div>
                <div class="metric-value">${bodyFat || '—'}<span class="metric-unit">%</span></div>
                ${bodyFat > 0 && bfDelta !== null ? `
                    <div class="metric-delta ${parseFloat(bfDelta) < 0 ? 'down' : parseFloat(bfDelta) > 0 ? 'up' : ''}">
                        <i class="ph-bold ${parseFloat(bfDelta) < 0 ? 'ph-trend-down' : parseFloat(bfDelta) > 0 ? 'ph-trend-up' : 'ph-minus'}"></i>
                        ${Math.abs(bfDelta)}% desde última atualização
                    </div>
                ` : '<div class="metric-delta neutral">Sem dados anteriores</div>'}
            </div>

            <div class="perfil-metric-card" onclick="openPerfilUpdateModal('altura')">
                <div class="metric-card-top">
                    <span class="metric-label">Altura</span>
                    <button class="metric-edit-btn"><i class="ph-bold ph-pencil-simple"></i></button>
                </div>
                <div class="metric-value">${height}<span class="metric-unit">cm</span></div>
                <div class="metric-delta neutral">
                    <i class="ph-bold ph-ruler"></i>
                    ${(height / 100).toFixed(2)}m
                </div>
            </div>
    `;
    }

    // Personal Info grid
    const infoGrid = document.getElementById('perfil-info-grid');
    if (infoGrid) {
        infoGrid.innerHTML = `
        <div class="perfil-info-item">
                <i class="ph-bold ph-user"></i>
                <div>
                    <span class="info-label">Nome</span>
                    <span class="info-value">${student.name || '—'}</span>
                </div>
            </div>
            <div class="perfil-info-item">
                <i class="ph-bold ph-calendar-blank"></i>
                <div>
                    <span class="info-label">Idade</span>
                    <span class="info-value">${student.age || '—'} anos</span>
                </div>
            </div>
            <div class="perfil-info-item">
                <i class="ph-bold ph-gender-intersex"></i>
                <div>
                    <span class="info-label">Gênero</span>
                    <span class="info-value">${student.gender === 'M' ? 'Masculino' : student.gender === 'F' ? 'Feminino' : '—'}</span>
                </div>
            </div>
            <div class="perfil-info-item">
                <i class="ph-bold ph-target"></i>
                <div>
                    <span class="info-label">Objetivo</span>
                    <span class="info-value">${student.goal || '—'}</span>
                </div>
            </div>
    `;
    }

    // History list
    renderPerfilHistory(student);

    // Chart
    renderPerfilChart();
}

function renderPerfilHistory(student) {
    const list = document.getElementById('perfil-history-list');
    if (!list) return;

    const history = student.metricHistory || [];

    if (history.length === 0) {
        list.innerHTML = `
        <div class="perfil-history-empty">
                <i class="ph-bold ph-note-blank"></i>
                <p>Nenhuma alteração registrada ainda. Atualize suas métricas para começar a acompanhar sua evolução.</p>
            </div>
        `;
        return;
    }

    const items = history.slice().reverse().slice(0, 10);
    list.innerHTML = items.map((entry, idx) => {
        const changes = [];
        const prevIdx = history.length - 1 - idx - 1;
        const prev = prevIdx >= 0 ? history[prevIdx] : null;

        if (entry.weight) {
            const delta = prev && prev.weight ? getPercentDelta(entry.weight, prev.weight) : null;
            changes.push({
                label: 'Peso',
                value: `${entry.weight} kg`,
                delta: delta,
                icon: 'ph-barbell'
            });
        }
        if (entry.bodyFat) {
            const delta = prev && prev.bodyFat ? getPercentDelta(entry.bodyFat, prev.bodyFat) : null;
            changes.push({
                label: 'Gordura',
                value: `${entry.bodyFat}% `,
                delta: delta,
                icon: 'ph-fire'
            });
        }
        if (entry.height) {
            changes.push({
                label: 'Altura',
                value: `${entry.height} cm`,
                delta: null,
                icon: 'ph-ruler'
            });
        }

        return `
        <div class="perfil-history-item" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                <div style="flex: 1;">
                    <div class="history-date">
                        <i class="ph-bold ph-calendar-check"></i>
                        ${formatDate(entry.date)}
                    </div>
                    <div class="history-changes" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                        ${changes.map(c => `
                            <div class="history-change-chip" style="background: rgba(255,255,255,0.05); padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; border: 1px solid rgba(255,255,255,0.08);">
                                <i class="ph-bold ${c.icon}" style="color: var(--primary-color);"></i>
                                <span>${c.label}: <strong style="color: var(--text-main);">${c.value}</strong></span>
                                ${c.delta !== null ? `
                                    <span class="history-delta ${parseFloat(c.delta) > 0 ? 'up' : parseFloat(c.delta) < 0 ? 'down' : ''}" style="font-size: 0.75rem; font-weight: 600;">
                                        (${parseFloat(c.delta) > 0 ? '+' : ''}${c.delta}%)
                                    </span>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <button class="btn-delete-history" onclick="confirmDeleteMetric(${history.length - 1 - idx})">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

function renderPerfilChart() {
    const { student } = getStudentData();
    if (!student) return;

    const history = student.metricHistory || [];
    const canvas = document.getElementById('perfil-weight-chart');
    const emptyEl = document.getElementById('perfil-chart-empty');
    if (!canvas) return;

    const weightData = history.filter(h => h.weight).map(h => ({
        date: formatDateShort(h.date),
        value: parseFloat(h.weight)
    }));

    // Add initial weight if no history
    if (weightData.length === 0 && student.weight) {
        weightData.push({ date: formatDateShort(student.joinedAt), value: parseFloat(student.weight) });
    }

    if (weightData.length < 2) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }

    canvas.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    const rangeVal = document.getElementById('perfil-chart-range')?.value || '6';
    const data = rangeVal === 'all' ? weightData : weightData.slice(-parseInt(rangeVal));

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);
    const W = canvas.offsetWidth;
    const H = 220;

    ctx.clearRect(0, 0, W, H);

    const values = data.map(d => d.value);
    const minV = Math.min(...values) - 2;
    const maxV = Math.max(...values) + 2;
    const rangeV = maxV - minV || 1;

    const padL = 50, padR = 20, padT = 20, padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const points = data.map((d, i) => ({
        x: padL + (i / (data.length - 1)) * chartW,
        y: padT + chartH - ((d.value - minV) / rangeV) * chartH
    }));

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padT + (i / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();

        const val = (maxV - (i / 4) * rangeV).toFixed(1);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, padL - 8, y + 4);
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, H);
    grad.addColorStop(0, 'rgba(163, 230, 53, 0.25)');
    grad.addColorStop(1, 'rgba(163, 230, 53, 0.01)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, H - padB);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, H - padB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#A3E635';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots and labels
    points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#A3E635';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#121214';
        ctx.fill();

        // Date labels
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data[i].date, p.x, H - padB + 16);
    });
}

function openPerfilUpdateModal(field) {
    _perfilModalField = field;
    const modal = document.getElementById('perfil-update-modal');
    const title = document.getElementById('perfil-modal-title');
    const body = document.getElementById('perfil-modal-body');
    if (!modal || !body) return;

    const { student } = getStudentData();
    if (!student) return;

    let html = '';

    if (field === 'peso') {
        title.textContent = 'Atualizar Peso';
        html = `
        <div class="perfil-modal-field">
                <label>PESO ATUAL (KG)</label>
                <input type="number" step="0.1" id="modal-peso" class="q-input" value="${student.weight || ''}" placeholder="Ex: 78.5">
            </div>
            <div class="perfil-modal-current">
                <span>Valor anterior:</span>
                <strong>${student.weight || '—'} kg</strong>
            </div>
    `;
    } else if (field === 'altura') {
        title.textContent = 'Atualizar Altura';
        html = `
        <div class="perfil-modal-field">
                <label>ALTURA (CM)</label>
                <input type="number" id="modal-altura" class="q-input" value="${student.height || ''}" placeholder="Ex: 175">
            </div>
    `;
    } else if (field === 'gordura') {
        title.textContent = 'Atualizar % Gordura Corporal';
        html = `
        <div class="perfil-modal-field">
                <label>PERCENTUAL DE GORDURA (%)</label>
                <input type="number" step="0.1" id="modal-gordura" class="q-input" value="${student.bodyFat || ''}" placeholder="Ex: 14.2">
            </div>
            <div class="perfil-modal-current">
                <span>Valor anterior:</span>
                <strong>${student.bodyFat || '—'}%</strong>
            </div>
    `;
    } else if (field === 'geral') {
        title.textContent = 'Editar Perfil';
        html = `
        <div class="perfil-modal-field">
                <label>NOME</label>
                <input type="text" id="modal-nome" class="q-input" value="${student.name || ''}" placeholder="Seu nome">
            </div>
            <div class="perfil-modal-field">
                <label>IDADE</label>
                <input type="number" id="modal-idade" class="q-input" value="${student.age || ''}" placeholder="25">
            </div>
            <div class="perfil-modal-field">
                <label>OBJETIVO</label>
                <input type="text" id="modal-objetivo" class="q-input" value="${student.goal || ''}" placeholder="Ex: Hipertrofia">
            </div>
    `;
    }

    body.innerHTML = html;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closePerfilUpdateModal() {
    const modal = document.getElementById('perfil-update-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function savePerfilUpdate() {
    const { studentId, students, student } = getStudentData();
    if (!student) return;

    if (!student.metricHistory) student.metricHistory = [];

    const now = new Date().toISOString();
    let changed = false;

    if (_perfilModalField === 'peso') {
        const val = parseFloat(document.getElementById('modal-peso')?.value);
        if (!isNaN(val) && val > 0) {
            student.weight = val.toString();
            student.metricHistory.push({
                date: now,
                weight: val,
                bodyFat: parseFloat(student.bodyFat) || null,
                height: parseFloat(student.height) || null
            });
            changed = true;
        }
    } else if (_perfilModalField === 'altura') {
        const val = parseFloat(document.getElementById('modal-altura')?.value);
        if (!isNaN(val) && val > 0) {
            student.height = val.toString();
            student.metricHistory.push({
                date: now,
                weight: parseFloat(student.weight) || null,
                bodyFat: parseFloat(student.bodyFat) || null,
                height: val
            });
            changed = true;
        }
    } else if (_perfilModalField === 'gordura') {
        const val = parseFloat(document.getElementById('modal-gordura')?.value);
        if (!isNaN(val) && val >= 0) {
            student.bodyFat = val.toString();
            student.metricHistory.push({
                date: now,
                weight: parseFloat(student.weight) || null,
                bodyFat: val,
                height: parseFloat(student.height) || null
            });
            changed = true;
        }
    } else if (_perfilModalField === 'geral') {
        const nome = sanitizeUserInput(document.getElementById('modal-nome')?.value, { maxLen: 90 });
        const idadeRaw = parseInt(document.getElementById('modal-idade')?.value, 10);
        const idade = Number.isFinite(idadeRaw) ? String(Math.min(100, Math.max(10, idadeRaw))) : '';
        const objetivo = sanitizeUserInput(document.getElementById('modal-objetivo')?.value, { maxLen: 120 });
        if (nome) student.name = nome;
        if (idade) student.age = idade;
        if (objetivo) student.goal = objetivo;
        if (nome) memorySetItem('studentName', nome);
        changed = true;
    }

    if (changed) {
        syncStudentTmbData(student);

        // Update the students array
        const idx = students.findIndex(s => s.id === studentId);
        if (idx !== -1) students[idx] = student;
        saveStudentData(students);

        closePerfilUpdateModal();
        renderStudentPerfil();

        // Also update dashboard name if changed
        const nameEl = document.getElementById('dash-student-name');
        if (nameEl) nameEl.innerText = `Olá, ${(student.name || 'Aluno').split(' ')[0]} `;
        const sideEl = document.getElementById('side-student-name');
        if (sideEl) sideEl.innerText = (student.name || 'Aluno').split(' ')[0];
        renderStudentBaseCalories(student);
    }
}

function toggleConditional(id, show) {
    const el = document.getElementById(id);
    if (!el) return;

    if (show) {
        el.classList.add('active');
    } else {
        el.classList.remove('active');
        const input = el.querySelector('input');
        if (input) input.value = ''; // clear when hidden
    }
}

function goToTrainerArea() {
    hideAllScreens();
    document.getElementById('trainer-login-screen').classList.add('active');
}

function goToTrainerCreate() {
    hideAllScreens();
    document.getElementById('trainer-create-screen').classList.add('active');
}

function connectTrainer() {
    const code = sanitizeCodeInput(document.getElementById('trainer-login-code')?.value, 5);
    const codeInput = document.getElementById('trainer-login-code');
    if (codeInput) codeInput.value = code;
    if (code.length !== 5) {
        alert('O código deve ter exatamente 5 dígitos.');
        return;
    }

    if (code === '00001') {
        memorySetItem('trainerName', 'Admin');
        memorySetItem('currentTrainerCode', '00001');
    } else {
        const trainers = readStorageJSON('allTrainers', []);
        const t = trainers.find(x => x.code === code);
        if (t) {
            memorySetItem('trainerName', t.name.split(' ')[0]);
            memorySetItem('currentTrainerCode', t.code);
        } else {
            alert('Código não cadastrado.');
            return;
        }
    }

    // Go to dashboard
    hideAllScreens();
    document.getElementById('app').classList.add('wide');
    document.getElementById('trainer-dashboard-screen').classList.add('active');
    initTrainerDashboard();
}

function createConsultoria() {
    const name = sanitizeUserInput(document.getElementById('trainer-name')?.value, { maxLen: 90 });
    const nameInput = document.getElementById('trainer-name');
    if (nameInput) nameInput.value = name;
    const services = document.querySelector('input[name="services"]:checked');

    if (!name.trim() || !services) {
        alert('Preencha todos os dados corretamente.');
        return;
    }

    const firstName = sanitizeUserInput(name.split(' ')[0], { maxLen: 30 }) || 'Coach';
    const newCode = Math.floor(10000 + Math.random() * 89999).toString();

    // Save trainer to "global" list
    const trainers = readStorageJSON('allTrainers', []);
    trainers.push({
        name: name,
        code: newCode,
        consultoriaName: `Consultoria de ${firstName} `,
        services: services.value
    });
    memorySetItem('allTrainers', JSON.stringify(trainers));

    memorySetItem('trainerName', firstName);
    memorySetItem('currentTrainerCode', newCode);

    document.getElementById('dash-trainer-name').innerText = firstName;
    document.getElementById('dash-trainer-code').innerText = newCode;

    // Go to dashboard
    hideAllScreens();
    document.getElementById('trainer-dashboard-screen').classList.add('active');
    initTrainerDashboard();
}

// TRAINER DASHBOARD LOGIC (Runs on trainer.html)
function initTrainerDashboard() {
    // If we have a trainerSessionCode from index.html unified login
    const sessionCode = memoryGetItem('trainerSessionCode');
    if (sessionCode) {
        if (sessionCode === '00001') {
            memorySetItem('trainerName', 'Admin');
            memorySetItem('currentTrainerCode', '00001');
        } else {
            const trainers = readStorageJSON('allTrainers', []);
            const t = trainers.find(x => x.code === sessionCode);
            if (t) {
                memorySetItem('trainerName', t.name.split(' ')[0]);
                memorySetItem('currentTrainerCode', t.code);
            }
        }
        memoryRemoveItem('trainerSessionCode'); // Consume it
    }

    const trainerName = memoryGetItem('trainerName') || 'Treinador';
    const trainerCode = memoryGetItem('currentTrainerCode') || '00000';
    const canAutoEnterDashboard = !!sessionCode || (!!trainerCode && trainerCode !== '00000');
    if (!memoryGetItem('trainerCodeDefault') && trainerCode && trainerCode !== '00000') {
        memorySetItem('trainerCodeDefault', trainerCode);
    }

    pullAppStateIfNewer();
    startSyncPolling();

    if (canAutoEnterDashboard) {
        const dashboardScreen = document.getElementById('trainer-dashboard-screen');
        if (dashboardScreen) {
            hideAllScreens();
            const app = document.getElementById('app');
            if (app) app.classList.add('wide');
            dashboardScreen.classList.add('active');
        }
    }

    const elDashName = document.getElementById('dash-trainer-name');
    if (elDashName) elDashName.innerText = trainerName;

    const elDashCode = document.getElementById('dash-trainer-code');
    if (elDashCode) elDashCode.innerText = trainerCode;

    // Update trainer services in menu
    const trainers = readStorageJSON('allTrainers', []);
    const currentTrainer = trainers.find(t => t.code === trainerCode) || (trainerCode === '00001' ? { services: 'ambos' } : null);
    const servicesLabel = document.getElementById('trainer-services-label');
    if (servicesLabel && currentTrainer) {
        const serviceMap = { 'treino': 'Treino', 'dieta': 'Nutrição', 'ambos': 'Treino + Dieta' };
        servicesLabel.textContent = serviceMap[currentTrainer.services] || 'Serviços Gerais';
    }

    loadTrainerSettingsToUI();

    const root = document.getElementById('trainer-dashboard-screen');
    if (root && !root.dataset.menuInit) {
        root.addEventListener('click', (evt) => {
            const menu = document.getElementById('trainer-profile-menu');
            const trigger = document.querySelector('.profile-menu-trigger');
            if (!menu || !trigger) return;
            const clickedInsideMenu = menu.contains(evt.target);
            const clickedTrigger = trigger.contains(evt.target);
            if (!clickedInsideMenu && !clickedTrigger) closeTrainerProfileMenu();
        });
        document.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape') closeTrainerProfileMenu();
        });
        root.dataset.menuInit = '1';
    }

    // Add swipe gestures for mobile navigation
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !mainContent.dataset.swipeInit) {
        let startX = 0;
        let startY = 0;
        let isSwiping = false;
        let pullStartY = 0;
        let isPulling = false;
        let pullIndicator = null;

        // Create pull-to-refresh indicator
        const createPullIndicator = () => {
            if (pullIndicator) return;
            pullIndicator = document.createElement('div');
            pullIndicator.style.cssText = `
                position: absolute;
                top: -60px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(163, 230, 53, 0.9);
                color: #000;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 1000;
                pointer-events: none;
                backdrop-filter: blur(10px);
            `;
            pullIndicator.textContent = '↻ Atualizar';
            mainContent.style.position = 'relative';
            mainContent.appendChild(pullIndicator);
        };

        mainContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = true;

            // Check if at top of scroll for pull-to-refresh
            if (mainContent.scrollTop === 0) {
                pullStartY = startY;
                isPulling = true;
                createPullIndicator();
            }
        }, { passive: true });

        mainContent.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;

            // Handle pull-to-refresh
            if (isPulling && deltaY > 0 && mainContent.scrollTop === 0) {
                const pullDistance = Math.min(deltaY * 0.5, 80);
                if (pullIndicator) {
                    pullIndicator.style.transform = `translateX(-50%) translateY(${pullDistance}px)`;
                    pullIndicator.style.opacity = Math.min(pullDistance / 40, 1);
                }
                e.preventDefault();
                return;
            }

            // Only consider horizontal swipes
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                e.preventDefault(); // Prevent scrolling
            }
        }, { passive: false });

        mainContent.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;

            // Handle pull-to-refresh release
            if (isPulling && deltaY > 60) {
                // Trigger refresh
                updateTrainerStats();
                if (navigator.vibrate) navigator.vibrate(50);

                // Animate indicator
                if (pullIndicator) {
                    pullIndicator.textContent = '✓ Atualizado';
                    pullIndicator.style.background = 'rgba(34, 197, 94, 0.9)';
                    setTimeout(() => {
                        if (pullIndicator) {
                            pullIndicator.style.opacity = '0';
                            setTimeout(() => pullIndicator?.remove(), 300);
                        }
                    }, 1000);
                }
            } else if (pullIndicator) {
                // Reset indicator
                pullIndicator.style.transform = 'translateX(-50%) translateY(0)';
                pullIndicator.style.opacity = '0';
                setTimeout(() => pullIndicator?.remove(), 300);
            }

            // Minimum swipe distance and angle
            const minSwipeDistance = 100;
            const maxVerticalMovement = 50;

            if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < maxVerticalMovement && !isPulling) {
                const views = ['dashboard', 'alunos', 'duvidas', 'config'];
                const currentView = views.find(v => document.getElementById(`view-${v}`)?.style.display !== 'none') || 'dashboard';
                const currentIndex = views.indexOf(currentView);

                if (deltaX > 0) {
                    // Swipe right - previous view
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : views.length - 1;
                    switchDashView(views[prevIndex]);
                } else {
                    // Swipe left - next view
                    const nextIndex = currentIndex < views.length - 1 ? currentIndex + 1 : 0;
                    switchDashView(views[nextIndex]);
                }

                // Trigger haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(25);
                }
            }

            isSwiping = false;
            isPulling = false;
        });

        mainContent.dataset.swipeInit = '1';
    }

    // Add swipe hint for mobile users
    const showSwipeHint = () => {
        if (memoryGetItem('swipeHintShown')) return;

        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 0.85rem;
            font-weight: 500;
            z-index: 2000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideUpFade 0.5s ease, fadeOut 0.5s ease 3s forwards;
            pointer-events: none;
        `;
        hint.innerHTML = '👆 Deslize para navegar entre as telas';
        document.body.appendChild(hint);

        setTimeout(() => hint.remove(), 4000);
        memorySetItem('swipeHintShown', 'true');
    };

    // Show hint after a short delay
    setTimeout(showSwipeHint, 2000);

    updateTrainerStats();
    initTrainerRoutes();
}

function loadTrainerSettings() {
    const defaults = {
        bio: '',
        specialties: [],
        unitSystem: 'metric',
        macroFormula: 'mifflin',
        notifyEmail: true,
        notifyPush: true,
        studentLimit: '',
        profilePhoto: '',
        brandLogo: ''
    };
    const stored = readStorageJSON(TRAINER_SETTINGS_KEY, {});
    const specialties = Array.isArray(stored.specialties) ? stored.specialties : [];
    return { ...defaults, ...stored, specialties };
}

function updateTrainerSettings(partial) {
    const current = loadTrainerSettings();
    const next = { ...current, ...partial };
    memorySetItem(TRAINER_SETTINGS_KEY, JSON.stringify(next));
    return next;
}

function renderTrainerSpecialties(tags) {
    const container = document.getElementById('trainer-specialty-tags');
    if (!container) return;
    if (!tags || tags.length === 0) {
        container.innerHTML = '<span class="settings-empty">Nenhuma especialidade adicionada.</span>';
        return;
    }
    container.innerHTML = tags.map((tag) => `
        <span class="settings-tag">
            ${escapeHTML(tag)}
            <button type="button" onclick="removeTrainerSpecialty('${tag.replace(/'/g, "\\'")}')">
                <i class="ph-bold ph-x"></i>
            </button>
        </span>
    `).join('');
}

function addTrainerSpecialty() {
    const input = document.getElementById('trainer-specialty-input');
    if (!input) return;
    const value = sanitizeUserInput(input.value, { maxLen: 40 });
    if (!value) return;
    const settings = loadTrainerSettings();
    if (settings.specialties.includes(value)) {
        input.value = '';
        return;
    }
    const next = updateTrainerSettings({ specialties: [...settings.specialties, value] });
    renderTrainerSpecialties(next.specialties);
    input.value = '';
}

function removeTrainerSpecialty(tag) {
    const settings = loadTrainerSettings();
    const nextTags = settings.specialties.filter((t) => t !== tag);
    const next = updateTrainerSettings({ specialties: nextTags });
    renderTrainerSpecialties(next.specialties);
}

function handleTrainerPhotoUpload(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const next = updateTrainerSettings({ profilePhoto: reader.result });
        applyTrainerBranding(next);
        loadTrainerSettingsToUI();
    };
    reader.readAsDataURL(file);
}

function handleTrainerLogoUpload(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const next = updateTrainerSettings({ brandLogo: reader.result });
        applyTrainerBranding(next);
        loadTrainerSettingsToUI();
    };
    reader.readAsDataURL(file);
}

function applyTrainerBranding(settings) {
    const data = settings || loadTrainerSettings();
    const photo = data.profilePhoto;
    const logo = data.brandLogo;

    const profileBtn = document.querySelector('.profile-avatar');
    if (profileBtn) {
        if (photo) {
            profileBtn.style.backgroundImage = `url('${photo}')`;
            profileBtn.classList.add('has-photo');
        } else {
            profileBtn.style.backgroundImage = '';
            profileBtn.classList.remove('has-photo');
        }
    }

    const photoPreview = document.getElementById('trainer-photo-preview');
    if (photoPreview) {
        if (photo) {
            photoPreview.style.backgroundImage = `url('${photo}')`;
            photoPreview.classList.add('has-image');
        } else {
            photoPreview.style.backgroundImage = '';
            photoPreview.classList.remove('has-image');
        }
    }

    const logoPreview = document.getElementById('trainer-logo-preview');
    if (logoPreview) {
        if (logo) {
            logoPreview.style.backgroundImage = `url('${logo}')`;
            logoPreview.classList.add('has-image');
        } else {
            logoPreview.style.backgroundImage = '';
            logoPreview.classList.remove('has-image');
        }
    }

    const studentLogo = document.getElementById('student-brand-logo');
    if (studentLogo) {
        if (logo) {
            studentLogo.src = logo;
            studentLogo.style.display = 'block';
        } else {
            studentLogo.removeAttribute('src');
            studentLogo.style.display = 'none';
        }
    }
    const studentLogoWrap = studentLogo?.closest('.logo-icon');
    if (studentLogoWrap) {
        studentLogoWrap.classList.toggle('has-brand-logo', !!logo);
    }
}

function syncTrainerInviteCodeUI(code) {
    const value = sanitizeCodeInput(code, 5);
    const input = document.getElementById('trainer-invite-code');
    if (input) input.value = value;
    const dashCode = document.getElementById('dash-trainer-code');
    if (dashCode) dashCode.innerText = value || '00000';
}

function setTrainerInviteCode(code) {
    const sanitized = sanitizeCodeInput(code, 5);
    if (!sanitized) return;
    memorySetItem('currentTrainerCode', sanitized);
    syncTrainerInviteCodeUI(sanitized);
}

function generateTrainerInviteCode() {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    setTrainerInviteCode(code);
}

function resetTrainerInviteCode() {
    const fallback = memoryGetItem('trainerCodeDefault') || '00001';
    setTrainerInviteCode(fallback);
}

function loadTrainerSettingsToUI() {
    const settings = loadTrainerSettings();
    const bio = document.getElementById('trainer-bio');
    if (bio) bio.value = settings.bio || '';
    const limit = document.getElementById('trainer-student-limit');
    if (limit) limit.value = settings.studentLimit || '';
    const unitInput = document.querySelector(`input[name="unit-system"][value="${settings.unitSystem}"]`);
    if (unitInput) unitInput.checked = true;
    const macro = document.getElementById('trainer-macro-formula');
    if (macro) macro.value = settings.macroFormula || 'mifflin';
    const emailToggle = document.getElementById('notif-email');
    if (emailToggle) emailToggle.checked = !!settings.notifyEmail;
    const pushToggle = document.getElementById('notif-push');
    if (pushToggle) pushToggle.checked = !!settings.notifyPush;
    renderTrainerSpecialties(settings.specialties);
    syncTrainerInviteCodeUI(memoryGetItem('currentTrainerCode') || '00000');
    applyTrainerBranding(settings);
}

function saveTrainerSettings() {
    const bio = document.getElementById('trainer-bio');
    const limit = document.getElementById('trainer-student-limit');
    const unit = document.querySelector('input[name="unit-system"]:checked');
    const macro = document.getElementById('trainer-macro-formula');
    const emailToggle = document.getElementById('notif-email');
    const pushToggle = document.getElementById('notif-push');

    const next = updateTrainerSettings({
        bio: sanitizeUserInput(bio?.value || '', { allowNewlines: true, maxLen: 400 }),
        studentLimit: sanitizeUserInput(limit?.value || '', { maxLen: 6 }),
        unitSystem: unit?.value || 'metric',
        macroFormula: macro?.value || 'mifflin',
        notifyEmail: !!emailToggle?.checked,
        notifyPush: !!pushToggle?.checked
    });
    applyTrainerBranding(next);
}

function resetTrainerSettings() {
    memoryRemoveItem(TRAINER_SETTINGS_KEY);
    loadTrainerSettingsToUI();
}

// â”€â”€ View switching + routes (Dashboard / Alunos / Duvidas / Exercicios) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getTrainerViewFromHash() {
    const hash = (location.hash || '').replace('#', '').replace(/^\/+/, '');
    if (!hash) return null;
    if (hash.startsWith('alunos')) return 'alunos';
    if (hash.startsWith('duvidas')) return 'duvidas';
    if (hash.startsWith('exercicios')) return 'exercicios';
    if (hash.startsWith('config')) return 'config';
    if (hash.startsWith('dashboard')) return 'dashboard';
    return 'dashboard';
}

function setTrainerRoute(view) {
    if (!document.getElementById('trainer-dashboard-screen')) return;
    const map = {
        dashboard: '#/dashboard',
        alunos: '#/alunos',
        duvidas: '#/duvidas',
        exercicios: '#/exercicios',
        config: '#/configuracoes'
    };
    const target = map[view] || '#/dashboard';
    if (location.hash === target) return;
    trainerRouteLock = true;
    location.hash = target;
    setTimeout(() => { trainerRouteLock = false; }, 0);
}

function handleTrainerHashChange() {
    if (trainerRouteLock) return;
    if (!document.getElementById('trainer-dashboard-screen')) return;
    const view = getTrainerViewFromHash();
    if (!view) return;
    switchDashView(view, { fromHash: true });
}

function initTrainerRoutes() {
    if (document.documentElement.dataset.trainerRoutesInit === '1') return;
    if (!document.getElementById('trainer-dashboard-screen')) return;
    document.documentElement.dataset.trainerRoutesInit = '1';
    window.addEventListener('hashchange', handleTrainerHashChange);
    const view = getTrainerViewFromHash();
    if (view) {
        switchDashView(view, { fromHash: true });
    } else {
        setTrainerRoute(lastMainTrainerView || 'dashboard');
    }
}

function openExerciseDrawer() {
    const overlay = document.getElementById('exercise-drawer-overlay');
    const drawer = document.getElementById('exercise-drawer');
    if (!overlay || !drawer) {
        setTimeout(() => openExerciseDrawer(), 200);
        return;
    }
    trainerDrawerOpen = true;
    overlay.style.display = 'block';
    drawer.style.display = 'block';
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        drawer.classList.add('active');
    });
    document.body.classList.add('drawer-open');
    const navEx = document.getElementById('nav-exercicios');
    if (navEx) navEx.classList.add('active');
    const navDash = document.getElementById('nav-dashboard');
    const navAlunos = document.getElementById('nav-alunos');
    const navDuvidas = document.getElementById('nav-duvidas');
    const navConfig = document.getElementById('nav-config');
    if (navDash) navDash.classList.remove('active');
    if (navAlunos) navAlunos.classList.remove('active');
    if (navDuvidas) navDuvidas.classList.remove('active');
    if (navConfig) navConfig.classList.remove('active');
    renderExerciseCatalog();
}

function closeExerciseDrawer(options = {}) {
    const overlay = document.getElementById('exercise-drawer-overlay');
    const drawer = document.getElementById('exercise-drawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
        drawer.style.display = 'none';
    }, 220);
    document.body.classList.remove('drawer-open');
    trainerDrawerOpen = false;
    const navEx = document.getElementById('nav-exercicios');
    if (navEx) navEx.classList.remove('active');
    const navRestore = document.getElementById(`nav-${lastMainTrainerView}`);
    if (navRestore) navRestore.classList.add('active');
    if (!options.skipRoute && lastMainTrainerView) setTrainerRoute(lastMainTrainerView);
}

function switchDashView(view, options = {}) {
    const fromHash = options.fromHash;
    const viewDash = document.getElementById('view-dashboard');
    const viewAlunos = document.getElementById('view-alunos');
    const viewDuvidas = document.getElementById('view-duvidas');
    const viewConfig = document.getElementById('view-config');
    const navDash = document.getElementById('nav-dashboard');
    const navAlunos = document.getElementById('nav-alunos');
    const navDuvidas = document.getElementById('nav-duvidas');
    const navConfig = document.getElementById('nav-config');
    const pageTitle = document.getElementById('main-page-title');

    if (view === 'exercicios') {
        openExerciseDrawer();
        if (!fromHash) setTrainerRoute('exercicios');
        return;
    }

    if (trainerDrawerOpen) closeExerciseDrawer({ skipRoute: true });

    // Reset visibility
    if (viewDash) viewDash.style.display = 'none';
    if (viewAlunos) viewAlunos.style.display = 'none';
    if (viewDuvidas) viewDuvidas.style.display = 'none';
    if (viewConfig) viewConfig.style.display = 'none';

    // Reset active states
    if (navDash) navDash.classList.remove('active');
    if (navAlunos) navAlunos.classList.remove('active');
    if (navDuvidas) navDuvidas.classList.remove('active');
    if (navConfig) navConfig.classList.remove('active');

    if (view === 'alunos') {
        lastMainTrainerView = 'alunos';
        if (viewAlunos) viewAlunos.style.display = '';
        if (navAlunos) navAlunos.classList.add('active');
        if (pageTitle) {
            pageTitle.innerHTML = `
                <button class="btn-icon-minimal" onclick="switchDashView('dashboard')" style="margin-right: 0.5rem; vertical-align: middle;">
                    <i class="ph-bold ph-arrow-left"></i>
                </button>
                Gerenciar Alunos`;
        }
    } else if (view === 'duvidas') {
        lastMainTrainerView = 'duvidas';
        if (viewDuvidas) viewDuvidas.style.display = '';
        if (navDuvidas) navDuvidas.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Duvidas dos Alunos';

        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => filterChats(e.target.value);
            globalSearch.placeholder = "Buscar conversas...";
            globalSearch.value = "";
        }
        renderDuvidas();
    } else if (view === 'config') {
        lastMainTrainerView = 'config';
        if (viewConfig) viewConfig.style.display = '';
        if (navConfig) navConfig.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Configuracoes';
        loadTrainerSettingsToUI();
    } else {
        lastMainTrainerView = 'dashboard';
        if (viewDash) viewDash.style.display = '';
        if (navDash) navDash.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Painel de Controle';

        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => filterStudents(e.target.value);
            globalSearch.placeholder = "Buscar aluno ou treino...";
            globalSearch.value = "";
        }
    }

    if (!fromHash) setTrainerRoute(lastMainTrainerView);
}


// â”€â”€ Helper: build a student row HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildStudentRow(s, idx, options = {}) {
    const recentCompact = !!options.recentCompact;
    const safeName = escHtml(s?.name || ('Aluno ' + (s?.id || '')));
    const safeGoalText = escHtml(s?.goal || 'Sem objetivo definido');
    const safeWeight = escHtml(s?.weight || '--');
    const activity = getStudentActivityMeta(s);
    const statusClass = activity.badgeClass;
    const statusText = activity.statusText;
    const lastWorkoutText = activity.lastWorkoutText;
    const w = parseFloat(s?.weight) || 70;
    const h = parseFloat(s?.height) || 175;
    const a = parseInt(s?.age) || 25;
    let tmb = 10 * w + 6.25 * h - 5 * a + ((s.gender === 'M') ? 5 : -161);
    const kcal = Math.round(tmb * 1.55);

    const joinedAt = new Date(s?.joinedAt || new Date());
    const diffDays = Math.floor((new Date() - joinedAt) / (1000 * 60 * 60 * 24));
    let timeDesc = 'Entrou recentemente';
    if (diffDays > 30) timeDesc = `Entrou há ${Math.floor(diffDays / 30)} meses`;
    else if (diffDays > 0) timeDesc = `Entrou há ${diffDays} dias`;

    if (recentCompact) {
        return `
        <div class="student-list-item recent-student-card" 
             style="padding: 1.25rem; transition: background 0.2s ease;"
             onmouseover="this.style.background='rgba(255,255,255,0.05)'"
             onmouseout="this.style.background='transparent'"
             onclick="openStudentProfile(${idx})">
            <div class="recent-student-top">
                <h4>${safeName}</h4>
                <span class="recent-status ${statusClass}">${statusText}</span>
            </div>
            <div class="recent-meta-lines">
                <div class="recent-meta-row">
                    <p><strong>Objetivo:</strong> ${safeGoalText}</p>
                    <p><strong>Peso:</strong> ${safeWeight} kg</p>
                </div>
                <p><strong>Consumo:</strong> ${kcal} kcal/dia</p>
                <p class="recent-last-workout">${lastWorkoutText}</p>
            </div>
            <div class="student-quick-actions compact">
                <button class="quick-action-btn" title="Enviar mensagem" onclick="openWhatsAppForStudent(${idx}, event)">
                    <i class="ph-fill ph-chat-circle-dots"></i>
                </button>
                <button class="quick-action-btn" title="Editar treino" onclick="openStudentProfileTab(${idx}, 'treino', event)">
                    <i class="ph-bold ph-barbell"></i>
                </button>
                <button class="quick-action-btn" title="Ver dieta" onclick="openStudentProfileTab(${idx}, 'nutricao', event)">
                    <i class="ph-bold ph-fork-knife"></i>
                </button>
            </div>
        </div> `;
    }

    return `
        <div class="student-list-item grid-layout" 
             style="padding: 1.25rem; transition: background 0.2s ease;"
             onmouseover="this.style.background='rgba(255,255,255,0.05)'"
             onmouseout="this.style.background='transparent'"
             onclick="openStudentProfile(${idx})">
        <div class="sli-col" data-label="Status">
            <span class="badge ${statusClass}"><div class="dot"></div> ${statusText}</span>
        </div>
        <div class="sli-col ident" data-label="Aluno">
            <div class="sli-avatar"><i class="ph-fill ph-user"></i></div>
            <div class="sli-info">
                <h4>${safeName}</h4>
                <span class="sli-sub">${timeDesc}</span>
                <span class="sli-sub sli-last-workout">${lastWorkoutText}</span>
            </div>
        </div>
        <div class="sli-col font-bold" data-label="Objetivo">${safeGoalText}</div>
        <div class="sli-col font-medium" data-label="Peso">${safeWeight} kg</div>
        <div class="sli-col text-primary" data-label="Consumo">${kcal} kcal/dia</div>
        <div class="sli-col actions" data-label="Acoes">
            <div class="student-quick-actions">
                <button class="quick-action-btn" title="Enviar mensagem" onclick="openWhatsAppForStudent(${idx}, event)">
                    <i class="ph-fill ph-chat-circle-dots"></i>
                </button>
                <button class="quick-action-btn" title="Editar treino" onclick="openStudentProfileTab(${idx}, 'treino', event)">
                    <i class="ph-bold ph-barbell"></i>
                </button>
                <button class="quick-action-btn" title="Ver dieta" onclick="openStudentProfileTab(${idx}, 'nutricao', event)">
                    <i class="ph-bold ph-fork-knife"></i>
                </button>
            </div>
        </div>
    </div > `;
}

function openWhatsAppForStudent(studentIdx, event) {
    if (event) event.stopPropagation();
    const students = readStorageJSON('trainerStudents', []);
    const s = students[studentIdx];
    if (!s) return;

    let phoneRaw = String(s.whatsapp || s.phone || s.telefone || '').trim();
    if (!phoneRaw) {
        phoneRaw = prompt(`Informe o WhatsApp de ${s.name || 'Aluno'} com DDI(ex: 5511999998888): `) || '';
        phoneRaw = sanitizeUserInput(phoneRaw, { maxLen: 20 });
        if (!phoneRaw) return;
        students[studentIdx].whatsapp = phoneRaw;
        memorySetItem('trainerStudents', JSON.stringify(students));
    }

    const phone = phoneRaw.replace(/\D/g, '');
    if (phone.length < 10) {
        alert('Número de WhatsApp inválido. Informe com DDD e, de preferência, com DDI.');
        return;
    }

    const coachName = memoryGetItem('trainerName') || 'Treinador';
    const studentName = s.name || 'aluno';
    const msg = encodeURIComponent(`Olá ${studentName}, aqui é ${coachName}.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

function backToStudentHomeView() {
    switchStudentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// â”€â”€ Helper: build a pending card HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildPendingCard(s, idx) {
    const reqDate = new Date(s.joinedAt || new Date()).toLocaleDateString('pt-BR');
    return `
    <div class="pending-card" id="pending-card-${idx}">
        <div class="pending-card-avatar"><i class="ph-fill ph-user"></i></div>
        <div class="pending-card-info">
            <h4>${s.name || 'Aluno ' + s.id}</h4>
            <p class="sli-sub"><i class="ph-fill ph-target" style="color:var(--primary-color)"></i> ${s.goal}</p>
            <p class="sli-sub">${s.weight} kg · ${s.height} cm · ${s.age} anos</p>
            <span class="pending-date"><i class="ph-bold ph-calendar-blank"></i> Solicitado em ${reqDate}</span>
        </div>
        <div class="pending-card-actions">
            <button class="btn-accept" onclick="acceptStudent(${idx})">
                <i class="ph-bold ph-check"></i> Aceitar
            </button>
            <button class="btn-reject" onclick="rejectStudent(${idx})">
                <i class="ph-bold ph-x"></i> Recusar
            </button>
        </div>
    </div>`;
}

// â”€â”€ Main stats + list renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateTrainerStats(filterText) {
    let students = readStorageJSON('trainerStudents', []);
    const activeStudents = students.filter(s => s.active && !s.pending);
    const pendingStudents = students.filter(s => s.pending);
    const pendingCount = pendingStudents.length;
    const engagedCount = activeStudents.filter((s) => getStudentActivityMeta(s).badgeClass !== 'alert').length;
    const notifications = readStorageJSON('trainerNotifications', []);
    const pendingDuvidasSet = getPendingDuvidaStudentIds(notifications);

    const filterCounts = {
        all: activeStudents.length,
        semTreino: activeStudents.filter((s) => !studentHasWorkoutPlan(s)).length,
        avaliacoes: activeStudents.filter((s) => s.assessmentPending || s.pendingEvaluation).length,
        duvidas: activeStudents.filter((s) => pendingDuvidasSet.has(String(s.id))).length
    };
    updateDashboardFilterUI(filterCounts);

    const filteredActive = applyDashboardFilterList(activeStudents, activeDashboardFilter, pendingDuvidasSet);
    const listBase = activeDashboardFilter === 'all' ? activeStudents : filteredActive;

    // â”€â”€ Stats cards â”€â”€
    const elTotal = document.getElementById('stat-total');
    if (elTotal) elTotal.innerText = activeStudents.length;
    const elAtivos = document.getElementById('stat-ativos');
    if (elAtivos) elAtivos.innerText = engagedCount;
    const elPendentes = document.getElementById('stat-pendentes');
    if (elPendentes) elPendentes.innerText = pendingCount;

    // â”€â”€ Pending nav badge â”€â”€
    const navBadge = document.getElementById('pending-nav-badge');
    if (navBadge) {
        navBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
        navBadge.textContent = pendingCount;
    }

    // â”€â”€ Pending banner (dashboard view) â”€â”€
    const banner = document.getElementById('pending-banner');
    if (banner) {
        banner.style.display = pendingCount > 0 ? 'flex' : 'none';
        const bannerTitle = document.getElementById('pending-banner-title');
        if (bannerTitle) bannerTitle.textContent = `${pendingCount} nova${pendingCount > 1 ? 's' : ''} solicitaç${pendingCount > 1 ? 'ões' : 'ão'}`;
    }

    // â”€â”€ Dashboard recent list (view-dashboard) â”€â”€
    const recentList = document.getElementById('trainer-student-list');
    if (recentList) {
        const query = (filterText || '').toLowerCase();
        const matchesStudent = (s) => {
            const sid = String(s?.id || '').toLowerCase();
            const sname = String(s?.name || '').toLowerCase();
            const sgoal = String(s?.goal || '').toLowerCase();
            return !query || sid.includes(query) || sname.includes(query) || sgoal.includes(query);
        };
        const getStudentIndex = (student) => {
            const byId = students.findIndex(x => String(x?.id || '') === String(student?.id || ''));
            if (byId >= 0) return byId;
            return students.indexOf(student);
        };
        const toShow = listBase
            .filter(matchesStudent)
            .slice(0, 5);
        recentList.innerHTML = toShow.length === 0
            ? `<p style="text-align:center;color:var(--text-muted);padding:3rem 0;">Nenhum aluno ativo ainda.</p>`
            : toShow.map((s) => buildStudentRow(s, getStudentIndex(s), { recentCompact: true })).join('');
        const paginInfo = document.getElementById('pagination-info');
        if (paginInfo) paginInfo.textContent = `Exibindo ${toShow.length} de ${listBase.length} alunos`;
    }

    // â”€â”€ Pending requests list (view-alunos) â”€â”€
    const pendingList = document.getElementById('pending-student-list');
    if (pendingList) {
        const badge = document.getElementById('pending-count-badge');
        if (badge) badge.textContent = pendingCount;
        pendingList.innerHTML = pendingCount === 0
            ? `<p class="empty-pending-msg"><i class="ph-fill ph-check-circle" style="color:var(--text-success,#22c55e)"></i> Nenhuma solicitação pendente.</p>`
            : pendingStudents.map((s) => buildPendingCard(s, students.indexOf(s))).join('');
    }

    // â”€â”€ Active list (view-alunos) â”€â”€
    const activeList = document.getElementById('alunos-active-list');
    if (activeList) {
        const query = (filterText || '').toLowerCase();
        const toShow = listBase.filter((s) => {
            const sid = String(s?.id || '').toLowerCase();
            const sname = String(s?.name || '').toLowerCase();
            const sgoal = String(s?.goal || '').toLowerCase();
            return !query || sid.includes(query) || sname.includes(query) || sgoal.includes(query);
        });
        activeList.innerHTML = toShow.length === 0
            ? `<p style="text-align:center;color:var(--text-muted);padding:3rem 0;">Nenhum aluno ativo ainda.</p>`
            : toShow.map((s) => {
                const idx = students.findIndex(x => String(x?.id || '') === String(s?.id || ''));
                return buildStudentRow(s, idx >= 0 ? idx : students.indexOf(s));
            }).join('');
        const paginInfo = document.getElementById('alunos-pagination-info');
        if (paginInfo) paginInfo.textContent = `Exibindo ${toShow.length} de ${listBase.length} alunos`;
    }

    // â”€â”€ Duvidas nav badge â”€â”€
    const unreadDuvidas = notifications.filter(n => n.type === 'duvida' && n.unread).length;
    const duvidasBadge = document.getElementById('duvidas-nav-badge');
    if (duvidasBadge) {
        duvidasBadge.style.display = unreadDuvidas > 0 ? 'inline-flex' : 'none';
        duvidasBadge.textContent = unreadDuvidas;
    }

    // â”€â”€ Chat sidebar total unread â”€â”€
    const chatTotalBadge = document.getElementById('chat-total-unread');
    if (chatTotalBadge) {
        chatTotalBadge.style.display = unreadDuvidas > 0 ? 'flex' : 'none';
        chatTotalBadge.textContent = unreadDuvidas;
    }

    renderEngagementChart();
}

function backToChatList() {
    const container = document.querySelector('.chat-container');
    if (container) container.classList.remove('active-chat');
    activeChatStudentId = null;
    renderDuvidas();
}

function renderDuvidas(filterText) {
    const notifications = readStorageJSON('trainerNotifications', []);
    const students = readStorageJSON('trainerStudents', []);
    const duvidas = notifications.filter(n => n.type === 'duvida');

    // â”€â”€ 1. Group by Student â”€â”€
    const chatsMap = {};
    duvidas.forEach(d => {
        const sId = d.studentId || 'unknown';
        if (!chatsMap[sId]) {
            // Find student name from students list or title
            let sName = 'Aluno Desconhecido';
            if (sId !== 'unknown') {
                const s = students.find(x => x.id === sId);
                if (s) sName = s.name;
            } else {
                sName = d.title.replace('💬 Dúvida de ', '');
            }

            chatsMap[sId] = {
                id: sId,
                name: sName,
                messages: [],
                lastTime: d.time,
                unreadCount: 0
            };
        }
        chatsMap[sId].messages.push(d);
        if (d.unread) chatsMap[sId].unreadCount++;
        // Keep the latest time
        const activityIso = getNotificationActivityDate(d).toISOString();
        if (new Date(activityIso) > new Date(chatsMap[sId].lastTime)) {
            chatsMap[sId].lastTime = activityIso;
        }
    });

    // Convert to array and sort by last message time
    const chatList = Object.values(chatsMap).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

    // â”€â”€ 2. Render Sidebar â”€â”€
    const listContainer = document.getElementById('chat-list');
    if (listContainer) {
        const query = (filterText || '').toLowerCase();
        const filtered = chatList.filter(c => c.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            listContainer.innerHTML = `<p class="empty-chat-msg">Nenhuma conversa encontrada</p>`;
        } else {
            listContainer.innerHTML = filtered.map(c => {
                const activeClass = activeChatStudentId === c.id ? 'active' : '';
                const timeStr = formatChatTime(c.lastTime);
                const lastMsg = getChatPreviewMessage(c.messages);
                const pendingCount = c.messages.filter(m => !m.fromTrainerOnly && !m.reply).length;
                const encodedId = encodeURIComponent(c.id);
                const statusHtml = pendingCount > 0
                    ? `<button class="chat-status-pill pending" onclick="openChatResponder('${encodedId}', event)">Responder (${pendingCount})</button>`
                    : `<span class="chat-status-pill resolved">Respondida</span>`;

                return `
                    <div class="chat-item ${activeClass}" onclick="selectChat(decodeURIComponent('${encodedId}'))">
                        <div class="chat-avatar"><i class="ph-fill ph-user"></i></div>
                        <div class="chat-item-info">
                            <div class="chat-item-top">
                                <strong>${escHtml(c.name)}</strong>
                                <span class="chat-time">${timeStr}</span>
                            </div>
                            <div class="chat-item-bottom">
                                <p>${escHtml(lastMsg)}</p>${statusHtml}
                                ${c.unreadCount > 0 ? `<span class="chat-unread-badge">${c.unreadCount}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // â”€â”€ 3. Render Active Window â”€â”€
    const welcomeView = document.getElementById('chat-welcome');
    const activeView = document.getElementById('chat-active-view');

    if (!activeChatStudentId) {
        if (welcomeView) welcomeView.style.display = 'flex';
        if (activeView) activeView.style.display = 'none';
        return;
    }

    if (welcomeView) welcomeView.style.display = 'none';
    if (activeView) activeView.style.display = 'flex';

    const activeChat = chatsMap[activeChatStudentId];
    if (!activeChat) {
        activeChatStudentId = null;
        renderDuvidas();
        return;
    }

    // Header info
    const elName = document.getElementById('chat-active-name');
    if (elName) elName.textContent = activeChat.name;
    const elStatus = document.getElementById('chat-active-status');
    if (elStatus) {
        const pendingCount = activeChat.messages.filter(m => !m.fromTrainerOnly && !m.reply).length;
        elStatus.textContent = pendingCount > 0 ? `${pendingCount} duvida(s) pendente(s)` : 'Conversa respondida';
    }

    // Messages (Bubbles)
    const msgContainer = document.getElementById('chat-messages');
    if (msgContainer) {
        // Sort chronologically for bubbles
        const sortedMsgs = [...activeChat.messages].sort((a, b) => getNotificationActivityDate(a) - getNotificationActivityDate(b));

        msgContainer.innerHTML = sortedMsgs.map(m => {
            const studentTimeStr = formatChatTime(m.time);
            const trainerTimeStr = formatChatTime(m.repliedAt || m.time);
            let html = '';
            if (!m.fromTrainerOnly && m.desc) {
                html += `
                    <div class="msg-bubble student">
                        <div class="msg-content">
                            ${formatChatMessageText(m.desc)}
                            ${renderChatMedia(m.media, 'student')}
                            <span class="msg-time">${studentTimeStr}</span>
                        </div>
                    </div>
                `;
            }
            if (m.reply) {
                html += `
                    <div class="msg-bubble trainer">
                        <div class="msg-content">
                            ${formatChatMessageText(m.reply)}
                            ${renderChatMedia(m.replyMedia, 'trainer')}
                            <span class="msg-time">${trainerTimeStr} <i class="ph-bold ph-checks" style="color:#34b7f1"></i></span>
                        </div>
                    </div>
                `;
            }
            return html;
        }).join('');

        // Scroll to bottom
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    optimizeMediaElements(activeView || document);
}

function selectChat(studentId) {
    activeChatStudentId = studentId;

    // Mark as read when opening
    let notifs = readStorageJSON('trainerNotifications', []);
    let changed = false;
    notifs.forEach(n => {
        if (n.type === 'duvida' && (n.studentId === studentId || (!n.studentId && studentId === 'unknown')) && n.unread) {
            n.unread = false;
            changed = true;
        }
    });

    if (changed) {
        memorySetItem('trainerNotifications', JSON.stringify(notifs));
        updateTrainerStats();
        syncChannel.postMessage({ type: 'DOUBT_RESOLVED' });
    }

    // Mobile responsiveness: Show chat window on select
    const container = document.querySelector('.chat-container');
    if (container) container.classList.add('active-chat');

    renderDuvidas();
}

function markActiveChatAsRead() {
    if (!activeChatStudentId) return;
    let notifs = readStorageJSON('trainerNotifications', []);
    let changed = false;
    notifs.forEach(n => {
        if (n.type === 'duvida' && (n.studentId === activeChatStudentId || (!n.studentId && activeChatStudentId === 'unknown')) && n.unread) {
            n.unread = false;
            changed = true;
        }
    });
    if (!changed) return;
    memorySetItem('trainerNotifications', JSON.stringify(notifs));
    updateTrainerStats();
    renderDuvidas();
    syncChannel.postMessage({ type: 'DOUBT_RESOLVED' });
}

function filterChats(query) {
    renderDuvidas(query);
}

function renderChatMedia(media, sender) {
    if (!media || !media.type || !media.dataUrl) return '';
    if (media.type === 'image') {
        return `<div class="chat-media-wrap ${sender}"><img src="${media.dataUrl}" alt="${escHtml(media.name || 'imagem')}" class="chat-media-image" loading="lazy" decoding="async" width="320" height="220"></div>`;
    }
    if (media.type === 'video') {
        return `<div class="chat-media-wrap ${sender}">
            <video controls class="chat-media-video" src="${media.dataUrl}"></video>
            <button class="btn-pip-video" onclick="openVideoPiPFromButton(this)">PiP</button>
        </div>`;
    }
    if (media.type === 'audio') {
        return `<div class="chat-media-wrap ${sender}">
            <audio controls class="chat-media-audio" src="${media.dataUrl}"></audio>
        </div>`;
    }
    return '';
}

function openChatResponder(encodedStudentId, event) {
    if (event) event.stopPropagation();
    const studentId = decodeURIComponent(encodedStudentId || '');
    if (!studentId) return;
    selectChat(studentId);
    setTimeout(() => {
        const input = document.getElementById('chat-reply-input');
        if (input) input.focus();
    }, 50);
}

function openTrainerAttachmentPicker(source = 'gallery') {
    const idMap = {
        camera: 'chat-camera-input',
        gallery: 'chat-attach-input',
        video: 'chat-video-input',
        audio: 'chat-audio-file-input'
    };
    const input = document.getElementById(idMap[source] || idMap.gallery);
    if (input) input.click();
}

async function handleTrainerAttachment(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    if (!isImage && !isVideo && !isAudio) {
        alert('Formato não suportado. Use imagem, vídeo ou áudio.');
        return;
    }

    try {
        let dataUrl;
        if (isImage) {
            dataUrl = await compressImageToDataUrl(file, 1280, 0.82);
        } else if (isVideo) {
            // Keep video size controlled due to localStorage limits
            if (file.size > 8 * 1024 * 1024) {
                alert('Vídeo muito grande. Use até 8MB para envio no chat.');
                return;
            }
            dataUrl = await fileToDataUrl(file);
        } else {
            if (file.size > 5 * 1024 * 1024) {
                alert('Áudio muito grande. Use até 5MB para envio no chat.');
                return;
            }
            dataUrl = await fileToDataUrl(file);
        }

        trainerPendingAttachment = {
            type: isImage ? 'image' : (isVideo ? 'video' : 'audio'),
            name: sanitizeUserInput(file.name, { maxLen: 120 }) || 'arquivo',
            dataUrl
        };

        renderTrainerAttachmentPreview();
    } catch (e) {
        console.error('Falha ao processar anexo', e);
        alert('Não foi possível processar o arquivo.');
    } finally {
        const input = event?.target;
        if (input && typeof input.value === 'string') input.value = '';
    }
}

function clearTrainerAttachment() {
    trainerPendingAttachment = null;
    const box = document.getElementById('chat-attach-preview');
    const content = document.getElementById('chat-attach-preview-content');
    if (box) box.style.display = 'none';
    if (content) content.innerHTML = '';
}

function renderTrainerAttachmentPreview() {
    const box = document.getElementById('chat-attach-preview');
    const content = document.getElementById('chat-attach-preview-content');
    if (!box || !content) return;

    if (!trainerPendingAttachment) {
        box.style.display = 'none';
        content.innerHTML = '';
        return;
    }

    if (trainerPendingAttachment.type === 'image') {
        content.innerHTML = `
            <img src="${trainerPendingAttachment.dataUrl}" class="chat-preview-image" alt="${escHtml(trainerPendingAttachment.name)}" loading="lazy" decoding="async" width="280" height="180">
            <div class="chat-preview-meta"><i class="ph-bold ph-image"></i> ${escHtml(trainerPendingAttachment.name)}</div>
        `;
    } else if (trainerPendingAttachment.type === 'video') {
        content.innerHTML = `
            <video src="${trainerPendingAttachment.dataUrl}" class="chat-preview-video" controls></video>
            <div class="chat-preview-meta"><i class="ph-bold ph-video-camera"></i> ${escHtml(trainerPendingAttachment.name)}</div>
        `;
    } else {
        content.innerHTML = `
            <audio src="${trainerPendingAttachment.dataUrl}" class="chat-preview-audio" controls></audio>
            <div class="chat-preview-meta"><i class="ph-bold ph-waveform"></i> ${escHtml(trainerPendingAttachment.name || 'audio')}</div>
        `;
    }

    box.style.display = 'flex';
    optimizeMediaElements(box);
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImageToDataUrl(file, maxSize = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
                const w = Math.round(img.width * ratio);
                const h = Math.round(img.height * ratio);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                // Prefer WebP thumbnails for smaller payload in chat previews.
                let encoded = '';
                try {
                    encoded = canvas.toDataURL('image/webp', quality);
                } catch (_) {
                    encoded = '';
                }
                if (!encoded || !encoded.startsWith('data:image/webp')) {
                    encoded = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(encoded);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function sendTrainerChat() {
    const input = document.getElementById('chat-reply-input');
    const reply = sanitizeUserInput(input?.value, { allowNewlines: true, maxLen: 1200 });
    const media = trainerPendingAttachment ? { ...trainerPendingAttachment } : null;
    if ((!reply && !media) || !activeChatStudentId) return;

    let notifs = readStorageJSON('trainerNotifications', []);
    const nowIso = new Date().toISOString();
    const hasMediaOnly = !reply && !!media;
    const finalReplyText = reply || (hasMediaOnly ? '[arquivo enviado]' : '');
    const isFromActiveStudent = (n) => (
        n.type === 'duvida' &&
        (n.studentId === activeChatStudentId || (!n.studentId && activeChatStudentId === 'unknown'))
    );

    // Reply to the oldest pending doubt first
    const pendingIndex = notifs.findIndex(n => isFromActiveStudent(n) && !n.fromTrainerOnly && !n.reply);
    const doubt = pendingIndex >= 0 ? notifs[pendingIndex] : null;

    if (doubt) {
        doubt.reply = finalReplyText;
        if (media) doubt.replyMedia = media;
        doubt.repliedAt = nowIso;
        doubt.unread = false; // Just in case
    } else {
        // If there is no pending doubt, store as a new trainer-only chat message
        const students = readStorageJSON('trainerStudents', []);
        const matchedStudent = students.find(s => s.id === activeChatStudentId);
        const fallbackNotif = notifs.find(n => isFromActiveStudent(n));
        const fallbackName = fallbackNotif?.studentName || (fallbackNotif?.title ? String(fallbackNotif.title).replace('💬 Dúvida de ', '') : 'Aluno');

        notifs.unshift({
            type: 'duvida',
            studentId: activeChatStudentId === 'unknown' ? null : activeChatStudentId,
            studentName: matchedStudent?.name || fallbackName,
            title: `💬 Dúvida de ${matchedStudent?.name || fallbackName}`,
            desc: '',
            fromTrainerOnly: true,
            reply: finalReplyText,
            replyMedia: media || null,
            time: nowIso,
            repliedAt: nowIso,
            unread: false
        });
    }

    // Mark all unread messages from this student as read after sending
    notifs.forEach(n => {
        if (isFromActiveStudent(n)) {
            n.unread = false;
        }
    });

    memorySetItem('trainerNotifications', JSON.stringify(notifs));
    input.value = '';
    clearTrainerAttachment();
    renderDuvidas();
    updateTrainerStats();

    // Broadcats reply
    syncChannel.postMessage({ type: 'DOUBT_REPLY', payload: { studentId: activeChatStudentId } });
}

function responderChat() {
    sendTrainerChat();
}

function openVideoPiPFromButton(buttonEl) {
    const wrap = buttonEl?.closest('.chat-media-wrap');
    const video = wrap?.querySelector('video');
    if (!video) return;
    if (!document.pictureInPictureEnabled) {
        alert('Picture-in-Picture não disponível neste navegador.');
        return;
    }
    video.requestPictureInPicture().catch(() => { });
}

async function startTrainerHoldRecord(event) {
    event?.preventDefault?.();
    const micBtn = event?.currentTarget || event?.target?.closest?.('.btn-mic-chat') || document.querySelector('.btn-mic-chat');
    if (trainerRecordingActive) return;
    if (micBtn && Number.isInteger(event?.pointerId) && micBtn.setPointerCapture) {
        try { micBtn.setPointerCapture(event.pointerId); } catch (_) { }
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Gravação de áudio não suportada neste dispositivo.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        trainerAudioChunks = [];
        trainerAudioRecorder = new MediaRecorder(stream);
        trainerAudioRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) trainerAudioChunks.push(e.data);
        };
        trainerAudioRecorder.onstop = async () => {
            try {
                const blob = new Blob(trainerAudioChunks, { type: 'audio/webm' });
                const dataUrl = await fileToDataUrl(blob);
                trainerPendingAttachment = {
                    type: 'audio',
                    name: `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
                    dataUrl
                };
                renderTrainerAttachmentPreview();
            } catch (err) {
                console.error('Falha ao finalizar audio', err);
            } finally {
                stream.getTracks().forEach(t => t.stop());
            }
        };

        trainerAudioRecorder.start();
        trainerRecordingActive = true;
        const wave = document.getElementById('chat-recording-wave');
        if (wave) wave.style.display = 'flex';
        if (micBtn) micBtn.classList.add('recording');
    } catch (e) {
        console.error('Falha ao iniciar gravação', e);
        trainerRecordingActive = false;
        const wave = document.getElementById('chat-recording-wave');
        if (wave) wave.style.display = 'none';
        if (micBtn) micBtn.classList.remove('recording');
        alert('Não foi possível acessar o microfone.');
    }
}

function stopTrainerHoldRecord(event) {
    event?.preventDefault?.();
    const micBtn = event?.currentTarget || event?.target?.closest?.('.btn-mic-chat') || document.querySelector('.btn-mic-chat');
    if (micBtn && Number.isInteger(event?.pointerId) && micBtn.releasePointerCapture && micBtn.hasPointerCapture?.(event.pointerId)) {
        try { micBtn.releasePointerCapture(event.pointerId); } catch (_) { }
    }
    if (!trainerRecordingActive) return;
    trainerRecordingActive = false;
    const wave = document.getElementById('chat-recording-wave');
    if (wave) wave.style.display = 'none';
    if (micBtn) micBtn.classList.remove('recording');
    const recorder = trainerAudioRecorder;
    trainerAudioRecorder = null;
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
    }
}

function getLatestPerformanceDate(studentId, routineTitle) {
    const history = readStorageJSON('workoutHistory', []);
    const lastSession = [...history].reverse().find(h =>
        h.ID_Usuario === studentId && (h.Nome_Treino === routineTitle || h.title === routineTitle)
    );

    if (lastSession) {
        const d = new Date(lastSession.Data || lastSession.date);
        return d.toLocaleDateString('pt-BR');
    }
    return null;
}

function formatChatTime(dateIso) {
    try {
        const d = new Date(dateIso);
        const now = new Date();
        const diff = now - d;
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff < oneDay && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 2 * oneDay) {
            return 'Ontem';
        } else {
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
    } catch (e) {
        return dateIso;
    }
}

function markDuvidaAsRead(idx) {
    let notifs = readStorageJSON('trainerNotifications', []);
    if (notifs[idx]) {
        notifs[idx].unread = false;
        memorySetItem('trainerNotifications', JSON.stringify(notifs));

        // Broadcast change
        syncChannel.postMessage({ type: 'DOUBT_RESOLVED' });
        updateTrainerStats();
        renderDuvidas();
    }
}

function responderDuvida(idx) {
    const replyText = document.getElementById(`reply-text-${idx}`)?.value.trim();
    if (!replyText) {
        alert('Por favor, escreva uma resposta.');
        return;
    }

    let notifs = readStorageJSON('trainerNotifications', []);
    if (notifs[idx]) {
        notifs[idx].unread = false;
        notifs[idx].reply = replyText;
        notifs[idx].repliedAt = new Date().toISOString();
        memorySetItem('trainerNotifications', JSON.stringify(notifs));

        // Broadcast change
        syncChannel.postMessage({ type: 'DOUBT_REPLY', payload: { studentId: notifs[idx].studentId } });

        updateTrainerStats();
        renderDuvidas();
        alert('✅ Resposta enviada ao aluno!');
    }
}

// â”€â”€ Accept a pending student â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function acceptStudent(idx) {
    let students = readStorageJSON('trainerStudents', []);
    if (!students[idx]) return;
    students[idx].pending = false;
    students[idx].active = true;
    students[idx].acceptedAt = new Date().toISOString();
    memorySetItem('trainerStudents', JSON.stringify(students));

    // Broadcast change
    syncChannel.postMessage({ type: 'STUDENT_ACCEPTED', payload: { studentId: students[idx].id } });

    // Animate out
    const card = document.getElementById(`pending-card-${idx}`);
    if (card) {
        card.classList.add('card-exit');
        setTimeout(() => updateTrainerStats(), 350);
    } else {
        updateTrainerStats();
    }
}

// â”€â”€ Reject / remove a pending student â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function rejectStudent(idx) {
    if (!confirm('Tem certeza que deseja recusar esta solicitação?')) return;
    let students = readStorageJSON('trainerStudents', []);
    students.splice(idx, 1);
    memorySetItem('trainerStudents', JSON.stringify(students));

    // Broadcast change
    syncChannel.postMessage({ type: 'STUDENT_REJECTED' });
    updateTrainerStats();
}

// â”€â”€ Filter helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function filterStudents(query) {
    updateTrainerStats(query);
}

function applyDashboardFilter(filterKey) {
    if (activeDashboardFilter === filterKey) {
        activeDashboardFilter = 'all';
    } else {
        activeDashboardFilter = filterKey || 'all';
    }
    updateTrainerStats();
}

function markNotifRead(index, btnElement) {
    let notifs = readStorageJSON('trainerNotifications', []);
    if (notifs[index]) {
        notifs[index].unread = false;
        memorySetItem('trainerNotifications', JSON.stringify(notifs));
    }
    // Update UI instantly without full reload
    const item = btnElement.closest('.notification-item');
    if (item) {
        item.classList.remove('unread');
        btnElement.parentElement.remove(); // remove action button

        // Update badge
        const badge = document.getElementById('notif-badge-count');
        if (badge) {
            const unreadCount = notifs.filter(n => n.unread).length;
            badge.innerText = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
    }
}

// â”€â”€â”€ Profile open / close / tab switch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentStudentIdx = null; // tracks which student is being edited
let currentTrainerStudentId = null; // tracks current student id for trainer history
let workoutBlocks = [];        // local state for workout blocks
let mealBlocks = [];           // local state for meal blocks
let pendingBlockIdx = null;    // which block an exercise is being added to
let pendingMealIdx = null;    // which meal an item is being added to
let workoutPlanAutosaveTimer = null;

let activeExerciseFilter = 'todos';
let activeEquipmentFilter = 'todos';
let selectedExerciseCatalogItem = null;
let activeFilterPicker = null;

function normalizeText(value) {
    return (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function openStudentProfile(studentIndex) {
    let students = readStorageJSON('trainerStudents', []);
    const s = students[studentIndex];
    if (!s) return;

    currentStudentIdx = studentIndex;
    currentTrainerStudentId = s.id || null;

    // Load existing plan data
    workoutBlocks = s.workoutBlocks ? JSON.parse(JSON.stringify(s.workoutBlocks)) : [];
    mealBlocks = s.mealBlocks ? JSON.parse(JSON.stringify(s.mealBlocks)) : [];

    // Calculate TMB (Mifflin-St Jeor)
    const tmbCalc = calcTMBMifflin(s.weight, s.height, s.age, s.gender);
    const kcalCalc = tmbCalc > 0 ? Math.round(tmbCalc * 1.55) : 0;

    // Header
    document.getElementById('prof-id-name').innerHTML =
        `${s.name || s.id} <span class="badge ${s.active ? '' : 'inactive'}">${s.active ? 'Ativo' : 'Inativo'}</span>`;
    let gIcon = 'ph-barbell', gColor = 'var(--primary-color)';
    const safeGoal = String(s.goal || 'Sem objetivo definido');
    if (safeGoal.toLowerCase().includes('perder') || safeGoal.toLowerCase().includes('emagrec')) { gIcon = 'ph-fire'; gColor = '#ef4444'; }
    document.getElementById('prof-goal').innerHTML = `<i class="ph-fill ${gIcon}" style="color:${gColor}"></i> ${safeGoal}`;

    // Perfil tab stats
    document.getElementById('prof-idade').innerText = `${s.age} anos`;
    document.getElementById('prof-peso').innerText = `${s.weight} kg`;
    document.getElementById('prof-altura').innerText = `${s.height} cm`;
    document.getElementById('prof-genero').innerText = s.gender === 'M' ? 'Masculino' : (s.gender === 'F' ? 'Feminino' : 'N/A');
    document.getElementById('prof-tmb').innerText = tmbCalc > 0 ? `${Math.round(tmbCalc)} kcal` : '--';
    document.getElementById('prof-gasto').innerText = kcalCalc > 0 ? `${kcalCalc} kcal` : '--';
    document.getElementById('prof-atividade').innerText = 'Moderatamente Ativo';

    // Diet meta
    const diet = s.dietMeta || {};
    const dm = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    dm('diet-kcal-meta', diet.kcal);
    dm('diet-protein-meta', diet.protein);
    dm('diet-carb-meta', diet.carb);
    dm('diet-fat-meta', diet.fat);
    const tmbEl = document.getElementById('diet-tmb-value');
    if (tmbEl) tmbEl.textContent = tmbCalc > 0 ? `${Math.round(tmbCalc)} kcal` : '--';
    const gastoEl = document.getElementById('diet-gasto-value');
    if (gastoEl) gastoEl.textContent = kcalCalc > 0 ? `${kcalCalc} kcal` : '--';

    // Switch screens
    document.getElementById('trainer-dashboard-screen').classList.remove('active');
    document.getElementById('trainer-student-profile-screen').classList.add('active');

    // Render workout and open Treino tab
    renderWorkoutBlocks();
    renderMeals();
    switchProfileTab('treino');
    renderTrainerWorkoutHistory(currentTrainerStudentId);
}

function openStudentProfileTab(studentIndex, tabName, event) {
    if (event) event.stopPropagation();
    openStudentProfile(studentIndex);
    setTimeout(() => {
        if (tabName) switchProfileTab(tabName);
    }, 0);
}

function closeStudentProfile() {
    document.getElementById('trainer-student-profile-screen').classList.remove('active');
    document.getElementById('trainer-dashboard-screen').classList.add('active');
    currentStudentIdx = null;
    currentTrainerStudentId = null;
}

function switchProfileTab(tabName) {
    document.querySelectorAll('.p-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.prof-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`p-tab-${tabName}`).classList.add('active');
    document.getElementById(`p-nav-${tabName}`).classList.add('active');
}

// â”€â”€â”€ Workout Blocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderWorkoutBlocks() {
    const container = document.getElementById('workout-blocks-container');
    if (!container) return;
    if (!container.dataset.autosaveBound) {
        const autoSaveHandler = () => queueWorkoutPlanAutosave();
        container.addEventListener('input', autoSaveHandler);
        container.addEventListener('change', autoSaveHandler);
        container.dataset.autosaveBound = '1';
    }

    workoutBlocks.forEach(block => {
        block.exercises.forEach(ex => {
            if (!Array.isArray(ex.substitutes)) ex.substitutes = ['', ''];
            if (typeof ex.supersetWithNext !== 'boolean') ex.supersetWithNext = false;
        });
    });

    if (workoutBlocks.length === 0) {
        container.innerHTML = `
        <div class="workout-empty">
            <i class="ph-bold ph-barbell" style="font-size:2.5rem;color:var(--text-muted)"></i>
            <p>Nenhum bloco de treino criado.</p>
            <button class="btn-add-block" onclick="addWorkoutBlock()"><i class="ph-bold ph-plus"></i> Criar Primeiro Bloco</button>
        </div>`;
        updateSummaryBar();
        return;
    }

    container.innerHTML = workoutBlocks.map((block, bIdx) => `
    <div class="workout-block" id="wb-${bIdx}">
        <div class="wb-header">
            <div class="wb-header-left">
                <i class="ph-fill ph-calendar-blank" style="color:var(--primary-color)"></i>
                <input class="wb-name-input" value="${escHtml(block.name)}" placeholder="Ex: Treino A: Peito e Tríceps"
                    oninput="workoutBlocks[${bIdx}].name = this.value">
            </div>
            <div class="wb-header-right">
                <button class="btn-add-ex" onclick="openExModal(${bIdx})">
                    <i class="ph-bold ph-plus"></i> Adicionar Exercício
                </button>
                <button class="btn-icon-minimal" onclick="deleteWorkoutBlock(${bIdx})" title="Remover bloco">
                    <i class="ph-bold ph-trash" style="color:#ef4444"></i>
                </button>
            </div>
        </div>

        ${block.exercises.length === 0
            ? `<div class="ex-empty-block">Nenhum exercício ainda. Clique em "Adicionar Exercício".</div>`
            : block.exercises.map((ex, eIdx) => `
        <div class="ex-row" id="ex-${bIdx}-${eIdx}">
            <div class="ex-info">
                <strong>${escHtml(ex.nome)}</strong>
                ${ex.obs ? `<span class="ex-obs">${escHtml(ex.obs)}</span>` : ''}
                <div class="ex-advanced-row">
                    <input type="text" class="ex-sub-input" value="${escHtml(ex.substitutes?.[0] || '')}"
                        oninput="updateExerciseSubstitute(${bIdx}, ${eIdx}, 0, this.value)" placeholder="Substituto 1 (opcional)">
                    <input type="text" class="ex-sub-input" value="${escHtml(ex.substitutes?.[1] || '')}"
                        oninput="updateExerciseSubstitute(${bIdx}, ${eIdx}, 1, this.value)" placeholder="Substituto 2 (opcional)">
                    <label class="ex-superset-toggle ${eIdx === block.exercises.length - 1 ? 'disabled' : ''}">
                        <input type="checkbox" ${ex.supersetWithNext ? 'checked' : ''} ${eIdx === block.exercises.length - 1 ? 'disabled' : ''}
                            onchange="toggleSupersetWithNext(${bIdx}, ${eIdx}, this.checked)">
                        Super série com próximo
                    </label>
                </div>
            </div>
            <div class="ex-stats">
                <div class="ex-stat">
                    <span class="ex-stat-label">SÉRIES</span>
                    <input type="number" class="ex-stat-input" value="${ex.series || ''}"
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].series=this.value;updateSummaryBar()" placeholder="4">
                </div>
                <div class="ex-stat">
                    <span class="ex-stat-label">REPS</span>
                    <input type="text" class="ex-stat-input" value="${escHtml(ex.reps || '')}"
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].reps=this.value" placeholder="10-12">
                </div>
                <div class="ex-stat">
                    <span class="ex-stat-label">CARGA</span>
                    <input type="text" class="ex-stat-input" value="${escHtml(ex.carga || '')}"
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].carga=this.value" placeholder="30kg">
                </div>
                <div class="ex-stat">
                    <span class="ex-stat-label">DESCANSO</span>
                    <input type="text" class="ex-stat-input" value="${escHtml(ex.descanso || '')}"
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].descanso=this.value" placeholder="60s">
                </div>
            </div>
            <div class="ex-actions">
                <button class="btn-icon-minimal" onclick="deleteExercise(${bIdx},${eIdx})" title="Remover">
                    <i class="ph-bold ph-trash" style="color:#ef4444;font-size:1rem;"></i>
                </button>
            </div>
        </div>`).join('')
        }
    </div>`).join('');

    updateSummaryBar();
}

function queueWorkoutPlanAutosave() {
    if (currentStudentIdx === null) return;
    if (workoutPlanAutosaveTimer) clearTimeout(workoutPlanAutosaveTimer);
    workoutPlanAutosaveTimer = setTimeout(() => {
        const students = readStorageJSON('trainerStudents', []);
        const student = students[currentStudentIdx];
        if (!student) return;
        student.workoutBlocks = workoutBlocks;
        students[currentStudentIdx] = student;
        memorySetItem('trainerStudents', JSON.stringify(students));
    }, 350);
}

function addWorkoutBlock() {
    const letter = String.fromCharCode(65 + workoutBlocks.length); // A, B, C ...
    workoutBlocks.push({ name: `Treino ${letter}`, exercises: [] });
    renderWorkoutBlocks();
    queueWorkoutPlanAutosave();
}

function deleteWorkoutBlock(bIdx) {
    if (!confirm('Remover este bloco de treino?')) return;
    workoutBlocks.splice(bIdx, 1);
    renderWorkoutBlocks();
    queueWorkoutPlanAutosave();
}

function deleteExercise(bIdx, eIdx) {
    workoutBlocks[bIdx].exercises.splice(eIdx, 1);
    renderWorkoutBlocks();
    queueWorkoutPlanAutosave();
}

function updateExerciseSubstitute(bIdx, eIdx, subIdx, value) {
    const ex = workoutBlocks?.[bIdx]?.exercises?.[eIdx];
    if (!ex) return;
    if (!Array.isArray(ex.substitutes)) ex.substitutes = ['', ''];
    ex.substitutes[subIdx] = value;
    queueWorkoutPlanAutosave();
}

function toggleSupersetWithNext(bIdx, eIdx, checked) {
    const ex = workoutBlocks?.[bIdx]?.exercises?.[eIdx];
    if (!ex) return;
    ex.supersetWithNext = !!checked;
    renderWorkoutBlocks();
    queueWorkoutPlanAutosave();
}

function updateSummaryBar() {
    let totalSeries = 0;
    workoutBlocks.forEach(b => b.exercises.forEach(e => { totalSeries += parseInt(e.series) || 0; }));
    const minutes = Math.round(totalSeries * 2.5); // ~2.5 min per series
    const kcalBurned = Math.round(totalSeries * 8);
    let intensity = '--';
    if (totalSeries > 0) {
        if (totalSeries <= 10) intensity = 'Leve';
        else if (totalSeries <= 20) intensity = 'Moderado';
        else if (totalSeries <= 30) intensity = 'Moderado-Alto';
        else intensity = 'Alto';
    }
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('summary-tempo', `${minutes} min`);
    el('summary-kcal', `~${kcalBurned} kcal`);
    el('summary-intensidade', intensity);
    queueWorkoutPlanAutosave();
}

// â”€â”€â”€ Exercise Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function openExModal(blockIdx) {
    pendingBlockIdx = blockIdx;
    ['ex-nome', 'ex-obs', 'ex-series', 'ex-reps', 'ex-carga', 'ex-descanso'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });

    selectedExerciseCatalogItem = null;
    activeExerciseFilter = 'todos';
    activeEquipmentFilter = 'todos';
    closeFilterPicker();
    updateExerciseFilterButtons();

    document.getElementById('ex-modal-overlay').classList.add('active');
    document.getElementById('ex-modal').classList.add('active');
    searchExerciseLibrary('');
    document.getElementById('ex-nome').focus();
}

function searchExerciseLibrary(query) {
    const searchInput = document.getElementById('ex-nome');
    const results = document.getElementById('ex-library-results');
    if (!searchInput || !results) return;

    const q = normalizeText(query);
    const filtered = getExerciseCatalogData().filter(ex => {
        const passMuscle = activeExerciseFilter === 'todos' || ex.group === activeExerciseFilter;
        const passEquipment = activeEquipmentFilter === 'todos' || ex.equipment === activeEquipmentFilter;
        const passSearch = !q || normalizeText(ex.name).includes(q) || normalizeText(GROUP_DISPLAY[ex.group] || ex.group).includes(q);
        return passMuscle && passEquipment && passSearch;
    });

    if (filtered.length === 0) {
        results.innerHTML = `
            <div class="ex-library-empty">
                <i class="ph-bold ph-magnifying-glass"></i>
                <p>Nenhum exercício encontrado.</p>
            </div>`;
        return;
    }

    results.innerHTML = filtered.map(ex => {
        const active = selectedExerciseCatalogItem === ex.name ? 'active' : '';
        return `
        <button type="button" class="ex-hevy-item ${active}" onclick="selectExerciseFromLibrary('${ex.name.replace(/'/g, "\'")}')">
            <div class="ex-hevy-thumb"><i class="ph-bold ${ex.icon || 'ph-barbell'}"></i></div>
            <div class="ex-hevy-info">
                <strong>${escapeHTML(ex.name)}</strong>
                <span>${escapeHTML(GROUP_DISPLAY[ex.group] || ex.group)} · ${escapeHTML(EQUIPMENT_DISPLAY[ex.equipment] || ex.equipment)}</span>
            </div>
            <i class="ph-bold ${active ? 'ph-check-circle' : 'ph-trend-up'}"></i>
        </button>`;
    }).join('');
}

function selectExerciseFromLibrary(name) {
    selectedExerciseCatalogItem = name;
    const nameInput = document.getElementById('ex-nome');
    if (nameInput) nameInput.value = name;
    searchExerciseLibrary(name);
}

function updateExerciseFilterButtons() {
    const muscleBtn = document.getElementById('ex-muscle-filter-btn');
    const equipBtn = document.getElementById('ex-equipment-filter-btn');
    if (muscleBtn) muscleBtn.textContent = MUSCLE_FILTER_OPTIONS.find(o => o.value === activeExerciseFilter)?.label || 'Todos os Músculos';
    if (equipBtn) equipBtn.textContent = EQUIPMENT_FILTER_OPTIONS.find(o => o.value === activeEquipmentFilter)?.label || 'Todo o Equipamento';
}

function openFilterPicker(type) {
    activeFilterPicker = type;
    const picker = document.getElementById('ex-filter-picker');
    const title = document.getElementById('ex-filter-picker-title');
    const list = document.getElementById('ex-filter-picker-list');
    if (!picker || !title || !list) return;

    const options = type === 'muscle' ? MUSCLE_FILTER_OPTIONS : EQUIPMENT_FILTER_OPTIONS;
    const activeVal = type === 'muscle' ? activeExerciseFilter : activeEquipmentFilter;
    title.textContent = type === 'muscle' ? 'Grupo Muscular' : 'Tipo de Categoria';

    list.innerHTML = options.map(opt => `
        <button type="button" class="ex-filter-option" onclick="selectFilterOption('${type}','${opt.value}')">
            <div class="ex-filter-icon"><i class="ph-bold ${opt.icon}"></i></div>
            <span>${opt.label}</span>
            ${activeVal === opt.value ? '<i class="ph-bold ph-check"></i>' : ''}
        </button>`).join('');

    picker.style.display = 'block';
}

function selectFilterOption(type, value) {
    if (type === 'muscle') activeExerciseFilter = value;
    if (type === 'equipment') activeEquipmentFilter = value;
    updateExerciseFilterButtons();
    closeFilterPicker();
    const search = document.getElementById('ex-nome');
    searchExerciseLibrary(search ? search.value : '');
}

function closeFilterPicker() {
    const picker = document.getElementById('ex-filter-picker');
    if (picker) picker.style.display = 'none';
    activeFilterPicker = null;
}

function closeExModal() {

    document.getElementById('ex-modal-overlay').classList.remove('active');
    document.getElementById('ex-modal').classList.remove('active');
    pendingBlockIdx = null;
    closeFilterPicker();
}

function confirmAddExercise() {
    const nome = (selectedExerciseCatalogItem || document.getElementById('ex-nome').value || '').trim();
    if (!nome) { document.getElementById('ex-nome').focus(); return; }
    const ex = {
        nome,
        obs: document.getElementById('ex-obs').value.trim(),
        series: document.getElementById('ex-series').value || '4',
        reps: document.getElementById('ex-reps').value || '10-12',
        carga: document.getElementById('ex-carga').value || '--',
        descanso: document.getElementById('ex-descanso').value || '60s',
        substitutes: ['', ''],
        supersetWithNext: false
    };
    if (pendingBlockIdx !== null) {
        workoutBlocks[pendingBlockIdx].exercises.push(ex);
    }
    closeExModal();
    renderWorkoutBlocks();
}

// â”€â”€â”€ Diet / Meals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderMeals() {
    const container = document.getElementById('meal-blocks-container');
    if (!container) return;

    if (mealBlocks.length === 0) {
        container.innerHTML = `<div class="workout-empty"><p>Nenhuma refeição configurada.</p><button class="btn-add-block" onclick="addMeal()"><i class="ph-bold ph-plus"></i> Criar Primeira Refeição</button></div>`;
        return;
    }

    container.innerHTML = mealBlocks.map((meal, mIdx) => `
    <div class="workout-block" id="mb-${mIdx}">
        <div class="wb-header">
            <div class="wb-header-left">
                <i class="ph-fill ph-fork-knife" style="color:var(--primary-color)"></i>
                <input class="wb-name-input" value="${escHtml(meal.name)}" placeholder="Ex: Café da manhã"
                    oninput="mealBlocks[${mIdx}].name = this.value">
            </div>
            <div class="wb-header-right">
                <button class="btn-add-ex" onclick="openFoodModal(${mIdx})">
                    <i class="ph-bold ph-plus"></i> Add Alimento
                </button>
                <button class="btn-icon-minimal" onclick="deleteMeal(${mIdx})" title="Remover">
                    <i class="ph-bold ph-trash" style="color:#ef4444"></i>
                </button>
            </div>
        </div>

        ${meal.items.length === 0
            ? `<div class="ex-empty-block">Nenhum alimento adicionado.</div>`
            : `<div class="food-table">
                <div class="food-table-head"><span>Alimento</span><span>Qtd</span><span>Kcal</span><span>Prot</span><span>Carbo</span><span>Gord</span><span></span></div>
                ${meal.items.map((item, iIdx) => `
                <div class="food-row">
                    <span class="font-medium">${escHtml(item.nome)}</span>
                    <input type="text" class="food-input food-qty-input" value="${escHtml(item.qtd || '')}" placeholder="150g"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'qtd', this.value)">
                    <input type="number" class="food-input" value="${item.kcal ? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'kcal', this.value)">
                    <input type="number" class="food-input" value="${item.prot ? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'prot', this.value)">
                    <input type="number" class="food-input" value="${item.carb ? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'carb', this.value)">
                    <input type="number" class="food-input" value="${item.gord ? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'gord', this.value)">
                    <button class="btn-icon-minimal" onclick="deleteFoodItem(${mIdx},${iIdx})">
                        <i class="ph-bold ph-trash" style="color:#ef4444;font-size:0.85rem;"></i>
                    </button>
                </div>`).join('')}
            </div>`
        }
    </div>`).join('');
}

function addMeal() {
    const names = ['Café da manhã', 'Lanche 1', 'Almoço', 'Lanche 2', 'Jantar', 'Ceia'];
    mealBlocks.push({ name: names[mealBlocks.length] || `Refeição ${mealBlocks.length + 1}`, items: [] });
    renderMeals();
    switchProfileTab('nutricao');
}

function deleteMeal(mIdx) {
    if (!confirm('Remover esta refeição?')) return;
    mealBlocks.splice(mIdx, 1);
    renderMeals();
}

function deleteFoodItem(mIdx, iIdx) {
    mealBlocks[mIdx].items.splice(iIdx, 1);
    renderMeals();
}

function updateMealItemField(mIdx, iIdx, field, value) {
    const meal = mealBlocks?.[mIdx];
    const item = meal?.items?.[iIdx];
    if (!item) return;

    let normalized = value;
    if (['kcal', 'prot', 'carb', 'gord'].includes(field)) {
        normalized = String(value ? '').replace(',', '.').replace(/[^\d.]/g, '');
        const num = parseFloat(normalized);
        normalized = Number.isFinite(num) ? num : '';
    } else if (field === 'qtd') {
        normalized = String(value ? '');
    }

    item[field] = normalized;
}

function openFoodModal(mealIdx) {
    pendingMealIdx = mealIdx;
    ['food-nome', 'food-qtd', 'food-kcal', 'food-prot', 'food-carb', 'food-gord'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });

    // Clear search results
    const results = document.getElementById('food-library-results');
    if (results) {
        results.innerHTML = '';
        results.classList.remove('active');
    }

    document.getElementById('food-modal-overlay').classList.add('active');
    document.getElementById('food-modal').classList.add('active');
    document.getElementById('food-nome').focus();
}

let foodSearchTimeout = null;

function searchFoodAPI(query) {
    const results = document.getElementById('food-library-results');
    if (!results) return;

    if (!query || query.length < 3) {
        results.innerHTML = '';
        results.classList.remove('active');
        return;
    }

    clearTimeout(foodSearchTimeout);
    foodSearchTimeout = setTimeout(async () => {
        results.innerHTML = '<div class="lib-item"><i class="ph-bold ph-spinner-gap"></i> Buscando...</div>';
        results.classList.add('active');

        try {
            // Open Food Facts API (optimized for Brazil)
            const url = `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
            const resp = await fetch(url, { headers: { 'User-Agent': 'AplicativoConsultoria - Browser - v1.0' } });
            const data = await resp.json();

            let html = '';
            if (data.products && data.products.length > 0) {
                html += `<div class="lib-category">Resultados (Open Food Facts)</div>`;
                data.products.forEach(p => {
                    const name = p.product_name || 'Desconhecido';
                    const brand = p.brands ? ` - ${p.brands}` : '';
                    const display = `${name}${brand}`;

                    // Essential macro data
                    const pData = {
                        nome: display,
                        kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
                        prot: p.nutriments?.proteins_100g || 0,
                        carb: p.nutriments?.carbohydrates_100g || 0,
                        fat: p.nutriments?.fat_100g || 0
                    };

                    html += `<div class="lib-item" onclick='selectFoodFromAPI(${JSON.stringify(pData).replace(/'/g, "&apos;")})'>
                        <div style="display:flex; flex-direction:column;">
                            <span>${display}</span>
                            <small style="font-size:0.7rem; opacity:0.6;">${pData.kcal}kcal | P:${pData.prot}g C:${pData.carb}g (por 100g)</small>
                        </div>
                    </div>`;
                });
            } else {
                html = '<div class="ex-empty-block" style="padding:1rem;">Nenhum alimento encontrado.</div>';
            }

            results.innerHTML = html;
        } catch (err) {
            console.error(err);
            results.innerHTML = '<div class="ex-empty-block" style="padding:1rem; color:#ef4444;">Erro na busca.</div>';
        }
    }, 500);
}

function selectFoodFromAPI(data) {
    document.getElementById('food-nome').value = data.nome;
    document.getElementById('food-kcal').value = data.kcal;
    document.getElementById('food-prot').value = data.prot;
    document.getElementById('food-carb').value = data.carb;
    document.getElementById('food-gord').value = data.fat;
    document.getElementById('food-qtd').value = '100g';

    const results = document.getElementById('food-library-results');
    if (results) {
        results.innerHTML = '';
        results.classList.remove('active');
    }
}

function closeFoodModal() {
    document.getElementById('food-modal-overlay').classList.remove('active');
    document.getElementById('food-modal').classList.remove('active');
    pendingMealIdx = null;
}

function confirmAddFood() {
    const nome = document.getElementById('food-nome').value;
    const qtd = document.getElementById('food-qtd').value;
    const kcal = parseInt(document.getElementById('food-kcal').value) || 0;
    const prot = parseFloat(document.getElementById('food-prot').value) || 0;
    const carb = parseFloat(document.getElementById('food-carb').value) || 0;
    const gord = parseFloat(document.getElementById('food-gord').value) || 0;

    if (!nome.trim()) return;

    mealBlocks[pendingMealIdx].items.push({ nome, qtd, kcal, prot, carb, gord });
    renderMeals();
    closeFoodModal();
}

// â”€â”€â”€ Save plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function saveStudentPlan() {
    if (currentStudentIdx === null) return;
    let students = readStorageJSON('trainerStudents', []);
    const diet = students[currentStudentIdx].dietMeta || {};
    diet.kcal = document.getElementById('diet-kcal-meta')?.value || '';
    diet.protein = document.getElementById('diet-protein-meta')?.value || '';
    diet.carb = document.getElementById('diet-carb-meta')?.value || '';
    diet.fat = document.getElementById('diet-fat-meta')?.value || '';

    students[currentStudentIdx].workoutBlocks = workoutBlocks;
    students[currentStudentIdx].mealBlocks = mealBlocks;
    students[currentStudentIdx].dietMeta = diet;
    students[currentStudentIdx].active = true; // Mark protocol as active when saved
    memorySetItem('trainerStudents', JSON.stringify(students));

    // Visual feedback
    const btn = document.querySelector('.btn-save-plan');
    if (btn) {
        btn.innerHTML = '<i class="ph-bold ph-check"></i> Salvo!';
        btn.style.background = '#22c55e';
        setTimeout(() => {
            btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar Alterações';
            btn.style.background = '';
        }, 2000);
    }
}

function removeStudent() {
    if (currentStudentIdx === null) return;
    openRemoveModal();
}

function openRemoveModal() {
    document.getElementById('remove-confirm-input').value = '';
    document.getElementById('btn-confirm-remove').disabled = true;
    document.getElementById('remove-modal-overlay').classList.add('active');
    document.getElementById('remove-modal').classList.add('active');
    setTimeout(() => document.getElementById('remove-confirm-input').focus(), 100);
}

function closeRemoveModal() {
    document.getElementById('remove-modal-overlay').classList.remove('active');
    document.getElementById('remove-modal').classList.remove('active');
}

function checkRemoveInput() {
    const val = document.getElementById('remove-confirm-input').value;
    document.getElementById('btn-confirm-remove').disabled = (val !== 'Remover');
}

function confirmRemoveStudent() {
    if (currentStudentIdx === null) return;
    let students = readStorageJSON('trainerStudents', []);
    students.splice(currentStudentIdx, 1);
    memorySetItem('trainerStudents', JSON.stringify(students));

    closeRemoveModal();
    closeStudentProfile();
    updateTrainerStats();
}

// â”€â”€â”€ UTILITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// â”€â”€â”€ HEVY STYLE WORKOUT LOG LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let workoutState = null;
let workoutTimerInterval = null;
let restTimerInterval = null;
let restTimeLeft = 0;
let totalRestTime = 0;
let restStartedAt = 0;
let restEndAt = 0;
let workoutFeedbackRating = 0;
let workoutFeedbackIntensity = 'moderado';
let lastWorkoutArchive = null;
let pendingSetCompletion = null;
let pendingExecCompletion = null;
let activeSetTypePopover = null;

const SET_TYPE_OPTIONS = [
    { value: 'normal', label: 'Normal', short: '' },
    { value: 'warmup', label: 'Aquecimento', short: 'A' },
    { value: 'drop', label: 'Drop-set', short: 'D' },
    { value: 'failure', label: 'Falha', short: 'F' },
    { value: 'restpause', label: 'Rest-pause', short: 'R' },
    { value: 'tempo', label: 'Preparatoria', short: 'P' },
    { value: 'cluster', label: 'Cluster', short: 'C' }
];

function saveWorkoutBackup() {
    if (workoutState) {
        memorySetItem('active_workout_backup', JSON.stringify(workoutState));
    }
}

function clearWorkoutBackup() {
    memoryRemoveItem('active_workout_backup');
}

function getWorkoutBackup() {
    const backup = memoryGetItem('active_workout_backup');
    if (!backup) return null;
    try {
        return JSON.parse(backup);
    } catch (e) {
        console.error('Falha ao ler backup de treino', e);
        clearWorkoutBackup();
        return null;
    }
}

function resumeWorkoutBackup() {
    const backup = getWorkoutBackup();
    if (!backup) return false;
    workoutState = backup;
    // Resume view
    switchStudentView('log-workout');
    // Resume Timer
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);
    renderWorkoutLog();
    return true;
}

function refreshWorkoutBackupIndicator() {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);
    if (student) renderWorkoutStartOptions(student);
}

function confirmExitActiveWorkout() {
    return confirm('Você tem um treino em andamento. Deseja sair mesmo assim? O progresso ficará salvo para continuar depois.');
}

function setupWorkoutExitGuard() {
    window.addEventListener('beforeunload', (event) => {
        if (!workoutState) return;
        event.preventDefault();
        event.returnValue = '';
    });
}

function getPreviousSessionData(studentId, exerciseName) {
    const history = readStorageJSON('workoutHistory', []);
    // Filter history for THIS student and find the latest session containing THIS exercise
    const lastSession = [...history].reverse().find(h =>
        h.ID_Usuario === studentId && (h.Exercicios || h.exercises).some(ex => ex.nome === exerciseName)
    );

    if (lastSession) {
        const exs = lastSession.Exercicios || lastSession.exercises;
        const ex = exs.find(e => e.nome === exerciseName);
        if (ex && ex.sets && ex.sets.length > 0) {
            // Pick the best set from that session for display
            const bestSet = ex.sets.reduce((prev, curr) => {
                const prevVol = (parseFloat(prev.peso || prev.weight) || 0) * (parseInt(prev.reps) || 0);
                const currVol = (parseFloat(curr.peso || curr.weight) || 0) * (parseInt(curr.reps) || 0);
                return currVol > prevVol ? curr : prev;
            });
            return `${bestSet.peso || bestSet.weight}kg x ${bestSet.reps}`;
        }
    }
    return '-';
}

function getPreviousExerciseMeta(studentId, exerciseName) {
    const history = readStorageJSON('workoutHistory', []);
    const lastSession = [...history].reverse().find(h =>
        h.ID_Usuario === studentId && (h.Exercicios || h.exercises).some(ex => ex.nome === exerciseName)
    );

    if (!lastSession) return { notes: '' };
    const exs = lastSession.Exercicios || lastSession.exercises;
    const ex = exs.find(e => e.nome === exerciseName);
    if (!ex) return { notes: '' };
    return {
        notes: sanitizeUserInput(ex.nota || ex.notes || ex.observacao || ex.obs || '', { allowNewlines: false, maxLen: 300 })
    };
}

function getExecutionLabel(score) {
    const map = {
        1: 'Ruim',
        2: 'Ok',
        3: 'Boa',
        4: 'Ótima',
        5: 'Perfeita'
    };
    return map[score] || '--';
}


function parsePreviousSetMetrics(prevText) {
    const raw = String(prevText || '').trim().toLowerCase();
    if (!raw || raw === '-' || raw === '--') {
        return { weight: null, reps: null };
    }

    const match = raw.match(/([\d.,]+)\s*kg\s*x\s*(\d+)/i);
    if (!match) return { weight: null, reps: null };

    const weight = parseFloat(String(match[1] || '').replace(',', '.'));
    const reps = parseInt(match[2], 10);

    return {
        weight: Number.isFinite(weight) ? weight : null,
        reps: Number.isFinite(reps) ? reps : null
    };
}

function formatMetricNumber(value) {
    if (!Number.isFinite(value)) return '--';
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toWebpCandidate(src) {
    const raw = String(src || '').trim();
    if (!raw || raw.startsWith('data:')) return raw;
    if (/\.webp(\?|$)/i.test(raw)) return raw;
    return raw.replace(/\.(png|jpe?g)(\?|$)/i, '.webp$2');
}

function renderExerciseThumb(exercise) {
    const originalSrc = String(exercise?.image || exercise?.thumb || '').trim();
    if (!originalSrc) return '';
    const webpSrc = toWebpCandidate(originalSrc);
    return `
        <div class="log-ex-thumb">
            <img
                src="${escHtml(webpSrc)}"
                data-fallback-src="${escHtml(originalSrc)}"
                alt="Miniatura do exercício ${escHtml(exercise?.nome || '')}"
                loading="lazy"
                decoding="async"
                width="88"
                height="58"
                onerror="if(this.dataset.fallbackSrc){const fb=this.dataset.fallbackSrc;this.dataset.fallbackSrc='';this.src=fb;}"
            >
        </div>
    `;
}

function appendCompletedSetLog(entry) {
    if (!entry || !entry.id) return;
    const logs = readStorageJSON('completed_sets_log', []);
    if (logs.some(item => item.id === entry.id)) return;
    logs.push(entry);
    memorySetItem('completed_sets_log', JSON.stringify(logs));
}

function startWorkoutSession(blockIdx = 0) {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (!student || !student.workoutBlocks || !student.workoutBlocks[blockIdx]) {
        alert('Plano de treino não encontrado.');
        return;
    }

    const block = student.workoutBlocks[blockIdx];
    const personalRecords = student.personalRecords || {};
    const supersetGroups = computeSupersetGroups(block.exercises || []);
    const blockTitle = getWorkoutBlockTitle(block, blockIdx);

    workoutState = {
        sessionId: `${studentId}-${Date.now()}`,
        startTime: Date.now(),
        title: blockTitle || 'Meu Treino',
        exercises: block.exercises.map((ex, idx) => {
            const templateSets = Array.isArray(ex.setTemplates) && ex.setTemplates.length
                ? ex.setTemplates
                : null;
            const sets = templateSets
                ? templateSets.map((tpl, sIdx) => ({
                    id: `set-${idx}-${sIdx}`,
                    weight: tpl.weight ? ex.carga || '',
                    reps: tpl.reps ? ex.reps || '',
                    type: tpl.type || 'normal',
                    intensityLevel: 0,
                    rpe: '',
                    rir: '',
                    execucao: 0,
                    logged: false,
                    completed: false,
                    brokenPRs: { weight: false, volume: false, oneRM: false },
                    prev: getPreviousSessionData(studentId, ex.nome)
                }))
                : Array.from({ length: parseInt(ex.series) || 3 }, (_, sIdx) => ({
                    id: `set-${idx}-${sIdx}`,
                    weight: ex.carga || '',
                    reps: ex.reps || '',
                    type: 'normal',
                    intensityLevel: 0,
                    rpe: '',
                    rir: '',
                    execucao: 0,
                    logged: false,
                    completed: false,
                    brokenPRs: { weight: false, volume: false, oneRM: false },
                    prev: getPreviousSessionData(studentId, ex.nome)
                }));

            return {
                id: `ex-${idx}`,
                nome: ex.nome,
                baseNome: ex.nome,
                substitutes: Array.isArray(ex.substitutes) ? ex.substitutes.filter(Boolean) : [],
                showSubstitutes: false,
                supersetGroup: supersetGroups[idx] || 0,
                notes: '',
                prevMeta: getPreviousExerciseMeta(studentId, ex.nome),
                best: personalRecords[ex.nome] || { maxWeight: 0, maxVolume: 0, maxOneRM: 0 },
                sets
            };
        })
    };

    saveWorkoutBackup();
    switchStudentView('log-workout');

    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);

    renderWorkoutLog();
}

function updateWorkoutTimer() {
    if (!workoutState) return;
    const elapsed = Math.floor((Date.now() - workoutState.startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('log-workout-timer');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;
}

function renderWorkoutLog() {
    const container = document.getElementById('log-workout-content');
    if (!container || !workoutState) return;

    const titleEl = document.getElementById('log-workout-title');
    if (titleEl) titleEl.innerHTML = workoutState.title;

    container.innerHTML = workoutState.exercises.map((ex, exIdx) => {
        const completed = ex.sets.filter(s => s.completed).length;
        const total = ex.sets.length;
        const nextEx = workoutState.exercises[exIdx + 1];
        const linkedToNext = ex.supersetGroup > 0 && nextEx && nextEx.supersetGroup === ex.supersetGroup;

        return `
        <div class="log-exercise-card ${ex.supersetGroup ? 'superset-card' : ''} ${linkedToNext ? 'superset-linked' : ''}">
            <div class="log-ex-header">
                <div class="log-ex-head-main">
                    <div class="log-ex-title-row">
                        <h3 class="clickable-ex-title" onclick="openExerciseProgressModalEncoded('${encodeURIComponent(ex.nome)}')">${escHtml(ex.nome)}</h3>
                        <div class="log-ex-top-actions">
                            <button class="btn-icon-tiny action-swap" onclick="toggleLogSubstitutes(${exIdx})" title="Trocar exercício" style="color: #a3e635; filter: drop-shadow(0 0 4px rgba(163,230,53,0.4));">
                                ${uiSvgIcon('arrows-clockwise')}
                            </button>
                            <button class="btn-icon-tiny action-trash" onclick="removeExerciseFromLog(${exIdx})" title="Excluir exercício" style="color: #f87171;">
                                ${uiSvgIcon('trash')}
                            </button>
                        </div>
                    </div>
                    <div class="log-ex-meta">
                        <span class="meta-pill">${uiSvgIcon('check-circle')} ${completed}/${total} séries</span>
                        <span class="meta-pill muted">${uiSvgIcon('chart-line-up')} registrar carga</span>
                        ${ex.supersetGroup ? `<span class="meta-pill">${uiSvgIcon('lightning')} bi-set ${ex.supersetGroup}</span>` : ''}
                    </div>
                </div>
            </div>

            ${renderExerciseThumb(ex)}

            ${ex.showSubstitutes ? `
                <div class="log-substitute-box">
                    <strong>Substitutos aprovados pelo coach:</strong>
                    <div class="log-substitute-list">
                        ${ex.substitutes.map(sub => `<button class="btn-substitute-ex" onclick="applyExerciseSubstituteEncoded(${exIdx}, '${encodeURIComponent(sub)}')">${escHtml(sub)}</button>`).join('')}
                        <button class="btn-substitute-ex muted" onclick="applyExerciseSubstituteEncoded(${exIdx}, '${encodeURIComponent(ex.baseNome)}')">Voltar original</button>
                    </div>
                </div>
            ` : ''}

            ${(() => {
                const prevNoteRaw = (ex.prevMeta?.notes || '').trim();
                const prevNote = prevNoteRaw ? `Ultima nota: ${prevNoteRaw}` : '';
                return `
                <input type="text" class="exercise-notes-input"
                    placeholder="Notas do exercicio..."
                    value="${escHtml(ex.notes || '')}"
                    oninput="updateExerciseNotes(${exIdx}, this.value)">
                ${prevNote ? `<div class="exercise-prev-note">${escHtml(prevNote)}</div>` : ''}`;
            })()}

            <div class="log-set-table">
                <div class="log-set-header">
                    <span>Série</span>
                    <span>Kg</span>
                    <span>Reps</span>
                    <span>PSE</span>
                    <span>Exec</span>
                    <span>Ações</span>
                </div>
                ${ex.sets.map((set, setIdx) => {
            const prevMetrics = parsePreviousSetMetrics(set.prev);
            const currentWeight = parseFloat(String(set.weight || '').replace(',', '.'));
            const currentReps = parseInt(set.reps, 10);
            const weightUp = Number.isFinite(currentWeight) && prevMetrics.weight !== null && currentWeight > prevMetrics.weight;
            const repsUp = Number.isFinite(currentReps) && prevMetrics.reps !== null && currentReps > prevMetrics.reps;
            const lastWeightLabel = prevMetrics.weight === null ? '--' : `${formatMetricNumber(prevMetrics.weight)}kg`;
            const lastRepsLabel = prevMetrics.reps === null ? '--' : `${prevMetrics.reps} reps`;
            const hasPR = set.completed && set.brokenPRs && (set.brokenPRs.weight || set.brokenPRs.volume || set.brokenPRs.oneRM);
            const prTooltip = hasPR ? getSetPRTooltip(set) : '';
            const setType = set.type || 'normal';
            const typeOption = SET_TYPE_OPTIONS.find(t => t.value === setType) || SET_TYPE_OPTIONS[0];
            const typeShort = typeOption.short || '';
            const setTitle = hasPR ? prTooltip : `Série ${setIdx + 1} · ${typeOption.label}`;
            const setNumberHtml = hasPR
                ? `<span class="set-pr-icon" title="${prTooltip}">${uiSvgIcon('trophy')}</span>`
                : `${typeShort || (setIdx + 1)}`;
            const canRemoveSet = ex.sets.length > 1;

            return `
                    <div class="log-set-row ${set.completed ? 'completed' : ''}" id="row-${exIdx}-${setIdx}">
                        <div class="set-number ${hasPR ? 'has-pr' : ''} type-${setType}" title="${setTitle}" role="button" onclick="openSetTypePopover(event, ${exIdx}, ${setIdx})">${setNumberHtml}</div>

                        <div class="set-value-stack">
                            <div class="set-input-row">
                                <input type="number" inputmode="decimal" pattern="[0-9]*" min="0" step="0.5" class="set-input log-input-tactile compact-value" value="${set.weight}" 
                                    placeholder="KG" oninput="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)"
                                    ${set.completed ? 'disabled' : ''}>
                                <span class="set-progress-flag ${weightUp ? 'up' : ''}" aria-hidden="true">
                                    ${weightUp ? uiSvgIcon('lightning') : ''}
                                </span>
                            </div>
                            <div class="set-prev-line" style="text-align: center;">Ant: ${lastWeightLabel}</div>
                        </div>

                        <div class="set-value-stack">
                            <div class="set-input-row">
                                <input type="number" inputmode="decimal" pattern="[0-9]*" min="0" step="1" class="set-input log-input-tactile compact-value" value="${set.reps}" 
                                    placeholder="REPS" oninput="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)"
                                    ${set.completed ? 'disabled' : ''}>
                                <span class="set-progress-flag ${repsUp ? 'up' : ''}" aria-hidden="true">
                                    ${repsUp ? uiSvgIcon('arrow-up-right') : ''}
                                </span>
                            </div>
                            <div class="set-prev-line" style="text-align: center;">Ant: ${lastRepsLabel}</div>
                        </div>

                        <div class="set-pse-visual" title="${getPseLabel(set.rpe)}">
                            ${renderPseSelector(exIdx, setIdx, set.rpe)}
                        </div>

                        <div class="set-exec-visual" title="${getExecutionLabel(set.execucao)}">
                            ${renderExecSelector(exIdx, setIdx, set.execucao)}
                        </div>

                        <div class="set-check-wrap">
                            <button class="btn-check-set ${set.completed ? 'active' : ''}" 
                                onclick="toggleSetCompletion(${exIdx}, ${setIdx})">
                                ${set.completed ? uiSvgIcon('check') : uiSvgIcon('circle')}
                            </button>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>

            ${renderExercisePRSummary(ex)}
            
            <div class="log-ex-footer">
                <button class="btn-add-set" onclick="addSetToExercise(${exIdx})">
                    ${uiSvgIcon('plus')} Adicionar Série
                </button>
            </div>
        </div>
    `;
    }).join('');

    optimizeMediaElements(container);
}

function updateExerciseNotes(exIdx, notes) {
    if (!workoutState || !workoutState.exercises[exIdx]) return;
    workoutState.exercises[exIdx].notes = notes;
    saveWorkoutBackup();
}


function getSetPRTypes(set) {
    if (!set || !set.brokenPRs) return [];
    if (Array.isArray(set.brokenPRs)) return set.brokenPRs;
    const types = [];
    if (set.brokenPRs.weight) types.push('Peso');
    if (set.brokenPRs.volume) types.push('Volume');
    if (set.brokenPRs.oneRM) types.push('1RM');
    if (set.brokenPRs.reps) types.push('Reps');
    return types;
}

function getSetPRTooltip(set) {
    const types = getSetPRTypes(set);
    if (types.length === 0) return '';
    return `Recorde Batido: ${types.join(', ')}!`;
}

function getSetWeightValue(set) {
    const raw = set?.peso ? set?.weight ? 0;
    const parsed = parseFloat(String(raw).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function getSetRepsValue(set) {
    const reps = parseInt(set?.reps, 10);
    return Number.isFinite(reps) ? reps : 0;
}

function getSetVolumeValue(set) {
    return getSetWeightValue(set) * getSetRepsValue(set);
}

function getSetOneRMValue(set) {
    const weight = getSetWeightValue(set);
    const reps = getSetRepsValue(set);
    if (!weight || !reps) return 0;
    return weight * (1 + reps / 30);
}

function renderExercisePRSummary(ex) {
    if (!ex || !Array.isArray(ex.sets)) return '';
    const items = [];
    ex.sets.forEach((s, idx) => {
        if (!s?.completed) return;
        if (s?.brokenPRs?.weight) {
            items.push({
                icon: 'ph-bold ph-barbell',
                label: 'Peso recorde',
                value: `${formatMetricNumber(getSetWeightValue(s))}kg`,
                setIdx: idx + 1
            });
        }
        if (s?.brokenPRs?.volume) {
            items.push({
                icon: 'ph-bold ph-stack',
                label: 'Volume recorde',
                value: `${formatMetricNumber(getSetVolumeValue(s))}kg`,
                setIdx: idx + 1
            });
        }
        if (s?.brokenPRs?.oneRM) {
            items.push({
                icon: 'ph-bold ph-chart-line-up',
                label: '1RM recorde',
                value: `${formatMetricNumber(getSetOneRMValue(s))}kg`,
                setIdx: idx + 1
            });
        }
    });

    if (items.length === 0) return '';

    const countLabel = items.length === 1 ? '1 PR' : `${items.length} PRs`;
    return `
        <div class="pr-summary-card">
            <div class="pr-summary-head">
                <i class="ph-fill ph-trophy"></i>
                <strong>Recordes desta sessão</strong>
                <span class="pr-summary-count">${countLabel}</span>
            </div>
            <div class="pr-summary-list">
                ${items.map(item => `
                    <div class="pr-summary-item">
                        <i class="${item.icon}"></i>
                        <div>
                            <span class="pr-summary-label">${item.label}</span>
                            <span class="pr-summary-value">${item.value}</span>
                        </div>
                        <span class="pr-summary-set">Série ${item.setIdx}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function playAchievementSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        osc.onended = () => ctx.close();
    } catch {
        // ignore audio failures
    }
}

function showAchievementToast(title, subtitle) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="achievement-icon">${uiSvgIcon('trophy')}</div>
        <div>
            <strong>${escHtml(title)}</strong>
            ${subtitle ? `<span>${escHtml(subtitle)}</span>` : ''}
        </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 2200);
}

function maybeNotifySetPR(exIdx, setIdx) {
    const set = workoutState?.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set || !set.completed) return;
    const types = getSetPRTypes(set);
    if (types.length === 0) return;
    if (set.prNotified) return;
    set.prNotified = true;
    playAchievementSound();
    showAchievementToast('Recorde batido!', types.join(', '));
}

function updateSetData(exIdx, setIdx, field, value) {
    if (workoutState && workoutState.exercises[exIdx] && workoutState.exercises[exIdx].sets[setIdx]) {
        let normalized = value;
        if (field === 'weight') {
            normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
            const parts = normalized.split('.');
            normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized;
        }
        if (field === 'reps') {
            normalized = String(value || '').replace(/\D/g, '');
        }
        workoutState.exercises[exIdx].sets[setIdx][field] = normalized;
        updateExercisePRs(exIdx);
        saveWorkoutBackup();
    }
}

function updateExercisePRs(exIdx) {
    const ex = workoutState.exercises[exIdx];
    const best = ex.best || { maxWeight: 0, maxVolume: 0, maxOneRM: 0 };
    ex.best = best;

    // Reset all brokenPRs in this exercise
    ex.sets.forEach(set => {
        set.brokenPRs = { weight: false, volume: false, oneRM: false };
    });

    // We only care about COMPLETED sets for the trophy (as per previous requirement)
    // but the user wants to see it based on the values. 
    // Actually, "renderPRTrophy" already checks for !set.completed.
    // So we calculate PR status for all sets, and the UI handles the visibility.

    let maxWeightIdx = -1;
    let maxVolumeIdx = -1;
    let maxOneRMIdx = -1;

    let sessionMaxWeight = best.maxWeight;
    let sessionMaxVolume = best.maxVolume;
    let sessionMaxOneRM = best.maxOneRM || 0;

    ex.sets.forEach((set, idx) => {
        const w = getSetWeightValue(set);
        const r = getSetRepsValue(set);
        const v = w * r;
        const oneRM = getSetOneRMValue(set);

        if (w > sessionMaxWeight) {
            sessionMaxWeight = w;
            maxWeightIdx = idx;
        }
        if (v > sessionMaxVolume) {
            sessionMaxVolume = v;
            maxVolumeIdx = idx;
        }
        if (oneRM > sessionMaxOneRM) {
            sessionMaxOneRM = oneRM;
            maxOneRMIdx = idx;
        }
    });

    // Assign trophies only to the session champions
    if (maxWeightIdx !== -1) ex.sets[maxWeightIdx].brokenPRs.weight = true;
    if (maxVolumeIdx !== -1) ex.sets[maxVolumeIdx].brokenPRs.volume = true;
    if (maxOneRMIdx !== -1) ex.sets[maxOneRMIdx].brokenPRs.oneRM = true;
}

function checkPRs(exIdx, setIdx) {
    // Deprecated for updateExercisePRs
    updateExercisePRs(exIdx);
}

function toggleSetCompletion(exIdx, setIdx) {
    if (!workoutState) return;
    const exercise = workoutState.exercises[exIdx];
    const set = exercise.sets[setIdx];

    if (!set.completed && !set.rpe) {
        pendingSetCompletion = { exIdx, setIdx, completeAfter: true };
        openSetEffortQuickModal();
        return;
    }
    if (!set.completed && !set.execucao) {
        pendingExecCompletion = { exIdx, setIdx, completeAfter: true };
        openSetExecutionQuickModal();
        return;
    }

    const willComplete = !set.completed;
    set.completed = willComplete;
    if (willComplete) {
        triggerHaptic(20);
        if (!navigator.onLine) {
            scheduleCompletedWorkoutSync();
        }
    }

    updateExercisePRs(exIdx);

    if (set.completed) {
        startRestTimer(60); // Default 60s
        if (!set.logged) {
            appendCompletedSetLog({
                id: `${workoutState.sessionId}-${exIdx}-${setIdx}`,
                sessionId: workoutState.sessionId,
                studentId: memoryGetItem('currentStudentId'),
                workoutTitle: workoutState.title,
                exercise: exercise.nome,
                serie: setIdx + 1,
                peso: parseFloat(set.weight) || 0,
                reps: parseInt(set.reps) || 0,
                intensidade: set.intensityLevel || 0,
                rpe: set.rpe ? null,
                rir: set.rir ? null,
                execucao: set.execucao ? null,
                completedAt: new Date().toISOString()
            });
            set.logged = true;
        }
        maybeNotifySetPR(exIdx, setIdx);
    } else {
        set.prNotified = false;
        hideRestTimer();
    }

    saveWorkoutBackup();
    renderWorkoutLog();
}

function computeSupersetGroups(exercises) {
    const groups = [];
    let g = 0;
    for (let i = 0; i < exercises.length; i++) {
        const prevLinks = i > 0 && !!exercises[i - 1]?.supersetWithNext;
        const currLinks = !!exercises[i]?.supersetWithNext;

        if (prevLinks) {
            groups[i] = groups[i - 1] || ++g;
            continue;
        }
        if (currLinks) {
            groups[i] = ++g;
            continue;
        }
        groups[i] = 0;
    }
    return groups;
}

function openSetEffortQuickModal(exIdx, setIdx, completeAfter = false) {
    if (Number.isInteger(exIdx) && Number.isInteger(setIdx)) {
        pendingSetCompletion = { exIdx, setIdx, completeAfter: !!completeAfter };
    }
    const modal = document.getElementById('set-effort-quick-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    applyPseColorStyles();
}

function closeSetEffortQuickModal() {
    const modal = document.getElementById('set-effort-quick-modal');
    if (!modal) return;
    pendingSetCompletion = null;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 180);
}

function openSetExecutionQuickModal(exIdx, setIdx, completeAfter = false) {
    if (Number.isInteger(exIdx) && Number.isInteger(setIdx)) {
        pendingExecCompletion = { exIdx, setIdx, completeAfter: !!completeAfter };
    }
    const modal = document.getElementById('set-exec-quick-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeSetExecutionQuickModal() {
    const modal = document.getElementById('set-exec-quick-modal');
    if (!modal) return;
    pendingExecCompletion = null;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 180);
}

function chooseQuickSetPse(pse) {
    if (!pendingSetCompletion) return;
    const { exIdx, setIdx, completeAfter } = pendingSetCompletion;
    setSetPse(exIdx, setIdx, pse);
    pendingSetCompletion = null;
    closeSetEffortQuickModal();
    if (completeAfter) {
        toggleSetCompletion(exIdx, setIdx);
        triggerHaptic(20);
    }
}

function chooseQuickSetExecution(value) {
    if (!pendingExecCompletion) return;
    const { exIdx, setIdx, completeAfter } = pendingExecCompletion;
    setSetExecution(exIdx, setIdx, value);
    pendingExecCompletion = null;
    closeSetExecutionQuickModal();
    if (completeAfter) {
        toggleSetCompletion(exIdx, setIdx);
        triggerHaptic(20);
    }
}

function applyPseColorStyles() {
    document.querySelectorAll('.pse-color-btn').forEach(btn => {
        const value = Number(btn.dataset.pse || 0);
        if (!value) return;
        btn.style.cssText = getPseButtonStyle(value);
    });
}

function openSetTypePopover(event, exIdx, setIdx) {
    if (!workoutState) return;
    if (event) event.stopPropagation();
    closeSetTypePopover();

    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set) return;
    const currentType = set.type || 'normal';

    const popover = document.createElement('div');
    popover.className = 'set-type-popover';
    const optionsHtml = SET_TYPE_OPTIONS.map(opt => {
        const active = opt.value === currentType ? 'active' : '';
        const chip = opt.short ? `<span class="set-type-chip">${opt.short}</span>` : '';
        return `<button type="button" class="set-type-option ${active}" onclick="selectSetType(${exIdx}, ${setIdx}, '${opt.value}')">${chip}<span>${opt.label}</span></button>`;
    }).join('');
    const canRemoveSet = workoutState.exercises?.[exIdx]?.sets?.length > 1;
    const removeHtml = `
        <div class="set-type-divider"></div>
        <button type="button" class="set-type-remove" ${canRemoveSet ? '' : 'disabled'} title="${canRemoveSet ? 'Remover série' : 'Mínimo 1 série'}"
            onclick="removeSetFromPopover(${exIdx}, ${setIdx})">
            ${uiSvgIcon('x')} <span>Remover série</span>
        </button>
    `;
    popover.innerHTML = optionsHtml + removeHtml;

    popover.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(popover);

    const rect = event?.currentTarget?.getBoundingClientRect?.() || { left: 0, bottom: 0 };
    const margin = 8;
    const top = Math.min(rect.bottom + 6, window.innerHeight - popover.offsetHeight - margin);
    const left = Math.min(rect.left, window.innerWidth - popover.offsetWidth - margin);
    popover.style.top = `${Math.max(margin, top)}px`;
    popover.style.left = `${Math.max(margin, left)}px`;

    activeSetTypePopover = popover;
    document.addEventListener('click', closeSetTypePopover, { once: true });
}

function closeSetTypePopover() {
    if (!activeSetTypePopover) return;
    activeSetTypePopover.remove();
    activeSetTypePopover = null;
}

function selectSetType(exIdx, setIdx, type) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set) return;
    const allowed = SET_TYPE_OPTIONS.some(opt => opt.value === type);
    set.type = allowed ? type : 'normal';
    saveWorkoutBackup();
    renderWorkoutLog();
    closeSetTypePopover();
}
// â”€â”€â”€ REST TIMER LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startRestTimer(seconds) {
    const safeSeconds = Math.max(1, parseInt(seconds, 10) || 60);
    const now = Date.now();
    restStartedAt = now;
    restEndAt = now + (safeSeconds * 1000);
    restTimeLeft = safeSeconds;
    totalRestTime = safeSeconds;

    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.classList.remove('timer-ended');
    }

    updateRestTimerUI();

    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
        if (!restEndAt) {
            clearInterval(restTimerInterval);
            return;
        }
        const remainingMs = restEndAt - Date.now();
        restTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
        updateRestTimerUI();

        if (remainingMs <= 0) {
            clearInterval(restTimerInterval);
            restTimerInterval = null;
            onRestTimerEnd();
        }
    }, 250);
}

function updateRestTimerUI() {
    if (restEndAt && restStartedAt) {
        const remainingMs = restEndAt - Date.now();
        restTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
        totalRestTime = Math.max(1, Math.ceil((restEndAt - restStartedAt) / 1000));
    }

    const mins = Math.floor(restTimeLeft / 60).toString().padStart(2, '0');
    const secs = (restTimeLeft % 60).toString().padStart(2, '0');
    const countdownEl = document.getElementById('rest-countdown');
    if (countdownEl) countdownEl.innerText = `${mins}:${secs}`;

    const progressFill = document.getElementById('rest-progress-fill');
    if (progressFill && totalRestTime > 0) {
        const percentage = Math.max(0, Math.min(100, (restTimeLeft / totalRestTime) * 100));
        progressFill.style.width = `${percentage}%`;
        const overlay = document.getElementById('rest-timer-overlay');
        if (overlay) overlay.style.setProperty('--rest-progress', `${percentage}%`);
    }
}

function getNotificationActivityDate(notification) {
    const raw = notification?.repliedAt || notification?.time;
    const d = raw ? new Date(raw) : new Date(0);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function formatChatMessageText(text) {
    const safeText = escHtml(text || '');
    return safeText.replace(/\r?\n/g, '<br>');
}

function getChatPreviewMessage(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return 'Sem mensagens';

    const ordered = [...messages].sort((a, b) => getNotificationActivityDate(b) - getNotificationActivityDate(a));
    const latest = ordered[0];
    if (!latest) return 'Sem mensagens';

    const baseText = latest.reply || latest.desc || '';
    const normalized = String(baseText).replace(/\s+/g, ' ').trim();
    if (normalized) return normalized;

    if (latest.replyMedia || latest.media) return 'Midia enviada';
    return 'Sem mensagem de texto';
}

function onRestTimerEnd() {
    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) {
        overlay.classList.add('timer-ended');
    }
    if (navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
    }
    playRestEndBeep();
}

function playRestEndBeep() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.17);
        osc.onended = () => ctx.close();
    } catch (_) {
        // no-op for devices that block WebAudio in background
    }
}

function skipRestTimer() {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    hideRestTimer();
}

function adjustRestTimer(seconds) {
    const delta = parseInt(seconds, 10) || 0;
    if (!restEndAt || !restStartedAt) return;
    restEndAt += (delta * 1000);
    if (restEndAt < Date.now()) restEndAt = Date.now();
    updateRestTimerUI();

    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay && overlay.classList.contains('timer-ended') && restTimeLeft > 0) {
        overlay.classList.remove('timer-ended');
        if (!restTimerInterval) {
            restTimerInterval = setInterval(() => {
                const remainingMs = restEndAt - Date.now();
                restTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
                updateRestTimerUI();
                if (remainingMs <= 0) {
                    clearInterval(restTimerInterval);
                    restTimerInterval = null;
                    onRestTimerEnd();
                }
            }, 250);
        }
    }
}

function hideRestTimer() {
    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('timer-ended');
    }
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = null;
    restStartedAt = 0;
    restEndAt = 0;
    restTimeLeft = 0;
    totalRestTime = 0;
}

function addSetToExercise(exIdx) {
    if (!workoutState) return;
    const ex = workoutState.exercises[exIdx];
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({
        id: `set-${exIdx}-${ex.sets.length}`,
        weight: lastSet ? lastSet.weight : '',
        reps: lastSet ? lastSet.reps : '',
        type: 'normal',
        intensityLevel: 0,
        rpe: '',
        rir: '',
        execucao: 0,
        logged: false,
        completed: false,
        brokenPRs: { weight: false, volume: false, reps: false },
        prev: '-'
    });
    saveWorkoutBackup();
    renderWorkoutLog();
}

function removeSetFromExercise(exIdx, setIdx) {
    if (!workoutState) return;
    const ex = workoutState.exercises?.[exIdx];
    if (!ex || !Array.isArray(ex.sets)) return;
    if (ex.sets.length <= 1) {
        alert('O exercício precisa ter ao menos 1 série.');
        return;
    }
    const target = ex.sets[setIdx];
    if (target?.completed) {
        if (!confirm('Esta série já foi marcada como concluída. Remover mesmo assim?')) return;
    }
    ex.sets.splice(setIdx, 1);
    updateExercisePRs(exIdx);
    saveWorkoutBackup();
    renderWorkoutLog();
}

function removeSetFromPopover(exIdx, setIdx) {
    removeSetFromExercise(exIdx, setIdx);
    closeSetTypePopover();
}

function removeExerciseFromLog(exIdx) {
    if (!workoutState || !confirm('Remover exercício do log?')) return;
    workoutState.exercises.splice(exIdx, 1);
    saveWorkoutBackup();
    renderWorkoutLog();
}

function toggleLogSubstitutes(exIdx) {
    if (!workoutState) return;
    const ex = workoutState.exercises?.[exIdx];
    if (!ex) return;
    ex.showSubstitutes = !ex.showSubstitutes;
    renderWorkoutLog();
}

function applyExerciseSubstitute(exIdx, substituteName) {
    if (!workoutState) return;
    const ex = workoutState.exercises?.[exIdx];
    if (!ex) return;
    ex.nome = substituteName;
    ex.showSubstitutes = false;
    saveWorkoutBackup();
    renderWorkoutLog();
}

function applyExerciseSubstituteEncoded(exIdx, encodedName) {
    applyExerciseSubstitute(exIdx, decodeURIComponent(encodedName || ''));
}

function handleFinishWorkout() {
    if (!workoutState) return;

    const completedSets = workoutState.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);

    if (completedSets === 0) {
        if (!confirm('Nenhuma série foi marcada como concluída. Deseja realmente finalizar?')) return;
    }

    openWorkoutFeedbackModal();
}

function openWorkoutFeedbackModal() {
    const modal = document.getElementById('workout-feedback-modal-overlay');
    if (!modal) {
        finalizeWorkoutWithFeedback();
        return;
    }

    workoutFeedbackRating = 0;
    workoutFeedbackIntensity = 'moderado';

    const notes = document.getElementById('workout-feedback-notes');
    if (notes) notes.value = '';

    updateWorkoutFeedbackUI();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeWorkoutFeedbackModal() {
    const modal = document.getElementById('workout-feedback-modal-overlay');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 220);
}

function setWorkoutFeedbackRating(rating) {
    workoutFeedbackRating = Number(rating) || 0;
    updateWorkoutFeedbackUI();
}

function setWorkoutFeedbackIntensity(level) {
    workoutFeedbackIntensity = level || 'moderado';
    updateWorkoutFeedbackUI();
}

function updateWorkoutFeedbackUI() {
    const ratingButtons = document.querySelectorAll('.wfb-emoji-btn');
    ratingButtons.forEach(btn => {
        const rating = Number(btn.dataset.rating || 0);
        btn.classList.toggle('active', rating <= workoutFeedbackRating && workoutFeedbackRating > 0);
    });

    const intensityButtons = document.querySelectorAll('.wfb-intensity-btn');
    intensityButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === workoutFeedbackIntensity);
    });
}

function confirmWorkoutFeedbackAndFinish() {
    const feedback = {
        quality: workoutFeedbackRating,
        intensity: workoutFeedbackIntensity,
        notes: document.getElementById('workout-feedback-notes')?.value.trim() || ''
    };
    closeWorkoutFeedbackModal();
    finalizeWorkoutWithFeedback(feedback);
}

function finalizeWorkoutWithFeedback(feedback = {}) {
    if (!workoutState) return;

    const elapsed = Math.floor((Date.now() - workoutState.startTime) / 1000);

    // Build the requested JSON structure
    const studentId = memoryGetItem('currentStudentId');

    // Calculate volume only for completed sets
    const totalVolume = workoutState.exercises.reduce((v, ex) =>
        v + ex.sets.reduce((sv, s) => sv + (s.completed ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0), 0), 0
    );

    const workoutArchive = {
        ID_Usuario: studentId,
        Nome_Treino: workoutState.title || '',
        Data_Treino: new Date().toISOString(),
        Duracao: elapsed,
        Volume_Total: totalVolume,
        Exercicios: workoutState.exercises.map(ex => ({
            nome: ex.nome,
            nota: ex.notes || '',
            sets: ex.sets
                .filter(s => s.completed)
                .map(s => ({
                    peso: parseFloat(s.weight) || 0,
                    reps: parseInt(s.reps) || 0,
                    type: s.type || 'normal',
                    intensidade: s.intensityLevel || null,
                    rpe: s.rpe ? parseFloat(s.rpe) : null,
                    rir: s.rir ? parseInt(s.rir) : null,
                    execucao: s.execucao ? parseInt(s.execucao) : null,
                    brokenPRs: s.brokenPRs // Keep this for summary visualization
                }))
        })).filter(ex => ex.sets.length > 0 || ex.nota),
        Avaliacao_Geral: {
            qualidade: Number(feedback.quality) || 0,
            intensidade: feedback.intensity || 'moderado',
            comentario: feedback.notes || ''
        }
    };

    // SAVE TO HISTORY
    const history = readStorageJSON('workoutHistory', []);
    history.push(workoutArchive);
    memorySetItem('workoutHistory', JSON.stringify(history));

    // UPDATE PERSONAL RECORDS PERMANENTLY
    const students = readStorageJSON('trainerStudents', []);
    const sIdx = students.findIndex(s => s.id === studentId);

    if (sIdx !== -1) {
        students[sIdx].lastWorkoutAt = workoutArchive.Data_Treino;
        if (!students[sIdx].personalRecords) students[sIdx].personalRecords = {};

        workoutState.exercises.forEach(ex => {
            const currentMelhores = students[sIdx].personalRecords[ex.nome] || { maxWeight: 0, maxVolume: 0, maxOneRM: 0 };

            ex.sets.forEach(set => {
                if (!set.completed) return;
                const w = getSetWeightValue(set);
                const r = getSetRepsValue(set);
                const v = w * r;
                const oneRM = getSetOneRMValue(set);

                if (w > currentMelhores.maxWeight) currentMelhores.maxWeight = w;
                if (v > currentMelhores.maxVolume) currentMelhores.maxVolume = v;
                if (oneRM > (currentMelhores.maxOneRM || 0)) currentMelhores.maxOneRM = oneRM;
            });

            students[sIdx].personalRecords[ex.nome] = currentMelhores;
        });

        memorySetItem('trainerStudents', JSON.stringify(students));
    }

    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    hideRestTimer();

    // Trigger Summary instead of direct exit
    showWorkoutSummary(workoutArchive);
}

function showWorkoutSummary(archive) {
    const screen = document.getElementById('view-student-workout-summary');
    const statsGrid = document.getElementById('summary-stats-grid');
    const exerciseList = document.getElementById('summary-exercise-list');

    if (!screen || !statsGrid || !exerciseList) return;
    lastWorkoutArchive = archive;

    // Calculate PR Count
    let prCount = 0;
    archive.Exercicios.forEach(ex => {
        ex.sets.forEach(s => {
            prCount += getSetPRTypes(s).length;
        });
    });

    // Format Duration
    const hrs = Math.floor(archive.Duracao / 3600);
    const mins = Math.floor((archive.Duracao % 3600) / 60);
    const secs = archive.Duracao % 60;
    const durStr = hrs > 0 ?
        `${hrs}h ${mins}m` :
        `${mins}m ${secs}s`;

    // Render Stats
    statsGrid.innerHTML = `
        <div class="summary-stat-card">
            <i class="ph-bold ph-timer"></i>
            <span class="summary-stat-value">${durStr}</span>
            <span class="summary-stat-label">Duração</span>
        </div>
        <div class="summary-stat-card">
            <i class="ph-bold ph-lightning"></i>
            <span class="summary-stat-value">${archive.Volume_Total} kg</span>
            <span class="summary-stat-label">Volume Total</span>
        </div>
        <div class="summary-stat-card">
            <i class="ph-bold ph-trophy"></i>
            <span class="summary-stat-value">${prCount}</span>
            <span class="summary-stat-label">Novos PRs</span>
        </div>
        <div class="summary-stat-card">
            <i class="ph-bold ph-smiley"></i>
            <span class="summary-stat-value">${archive.Avaliacao_Geral?.qualidade ? `${archive.Avaliacao_Geral.qualidade}/5` : '-'}</span>
            <span class="summary-stat-label">Qualidade</span>
        </div>
    `;

    // Render Exercises
    exerciseList.innerHTML = archive.Exercicios.map(ex => `
        <div class="summary-exercise-card">
            <div class="summary-ex-title">
                <span>${escHtml(ex.nome)}</span>
            </div>
            <div class="summary-set-list">
                ${ex.sets.map((s, idx) => {
        const hasPR = getSetPRTypes(s).length > 0;
        return `
                        <div class="summary-set-pill ${hasPR ? 'has-pr' : ''}">
                            <span>${idx + 1}ª: <strong>${s.peso}kg</strong> x ${s.reps}</span>
                            ${hasPR ? '<i class="ph-fill ph-trophy" style="font-size: 0.8rem;"></i>' : ''}
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `).join('');

    // Switch View
    switchStudentView('workout-summary');
    window.scrollTo(0, 0);
}

function applyLastWorkoutAsTemplate() {
    if (!lastWorkoutArchive) {
        alert('Nenhum treino recente para aplicar.');
        return;
    }

    if (!confirm('Deseja substituir o modelo padrao pelo ultimo treino realizado?')) {
        return;
    }

    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const sIdx = students.findIndex(s => String(s.id) === String(studentId));
    if (sIdx < 0) return;

    const blocks = students[sIdx].workoutBlocks || [];
    if (!blocks.length) return;

    const targetTitle = lastWorkoutArchive.Nome_Treino || lastWorkoutArchive.title || '';
    let blockIdx = blocks.findIndex((b, idx) => getWorkoutBlockTitle(b, idx) === targetTitle);
    if (blockIdx < 0) blockIdx = Number.isFinite(currentWorkoutTab) ? currentWorkoutTab : 0;
    const block = blocks[blockIdx];
    if (!block || !Array.isArray(block.exercises)) return;

    const historyExercises = lastWorkoutArchive.Exercicios || [];

    block.exercises.forEach(ex => {
        const past = historyExercises.find(e => e.nome === ex.nome);
        if (!past || !Array.isArray(past.sets) || past.sets.length === 0) return;

        const templates = past.sets.map((s) => ({
            weight: Number.isFinite(s.peso) ? s.peso : (s.weight ? ex.carga ? ''),
            reps: Number.isFinite(s.reps) ? s.reps : (s.reps ? ex.reps ? ''),
            type: s.type || s.setType || 'normal'
        }));

        ex.setTemplates = templates;
        ex.series = String(templates.length);
        ex.carga = templates[0]?.weight ? ex.carga ? '';
        ex.reps = templates[0]?.reps ? ex.reps ? '';
    });

    students[sIdx].workoutBlocks = blocks;
    memorySetItem('trainerStudents', JSON.stringify(students));
    if (typeof scheduleRemoteSync === 'function') scheduleRemoteSync('apply-template');
    alert('Modelo padrão atualizado com base no último treino.');
}

function closeWorkoutSummary() {
    // Final clear of state and return home
    workoutState = null;
    workoutFeedbackRating = 0;
    workoutFeedbackIntensity = 'moderado';
    clearWorkoutBackup();
    switchStudentView('home');
    refreshWorkoutBackupIndicator();
}

function finishWorkout() {
    handleFinishWorkout();
}

// Utility: Escape HTML to avoid XSS and breaking template literals
function escHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXERCISE CATALOG (Trainer > Exercicios view)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const EXERCISE_CATALOG_DATA = [
    { name: "Puxada Alta na Polia", group: "Dorsais", equipment: "Maquina", icon: "ph-barbell", hasHistory: true },
    { name: "Remada Sentada na Polia", group: "CostasSuperiores", equipment: "Maquina", icon: "ph-arrows-in-line-vertical", hasHistory: true },
    { name: "Supino (Barra)", group: "Peito", equipment: "Barra", icon: "ph-barbell", hasHistory: true },
    { name: "Supino Inclinado (Halter)", group: "Peito", equipment: "Haltere", icon: "ph-barbell", hasHistory: false },
    { name: "Crucifixo no Voador", group: "Peito", equipment: "Maquina", icon: "ph-barbell", hasHistory: true },
    { name: "Rosca Scott (Máquina)", group: "Biceps", equipment: "Maquina", icon: "ph-barbell", hasHistory: true },
    { name: "Rosca Direta (Barra W)", group: "Biceps", equipment: "Barra", icon: "ph-barbell", hasHistory: true },
    { name: "Tríceps na Polia com Corda", group: "Triceps", equipment: "Maquina", icon: "ph-barbell", hasHistory: true },
    { name: "Desenvolvimento (Halteres)", group: "Ombros", equipment: "Haltere", icon: "ph-barbell", hasHistory: false },
    { name: "Elevação Lateral", group: "Ombros", equipment: "Haltere", icon: "ph-barbell", hasHistory: false },
    { name: "Agachamento Livre", group: "Pernas", equipment: "Barra", icon: "ph-person-simple-walk", hasHistory: true },
    { name: "Leg Press 45", group: "Pernas", equipment: "Maquina", icon: "ph-person-simple-walk", hasHistory: true },
    { name: "Cadeira Extensora", group: "Quadriceps", equipment: "Maquina", icon: "ph-person-simple-walk", hasHistory: true },
    { name: "Mesa Flexora", group: "Posteriores", equipment: "Maquina", icon: "ph-person-simple-walk", hasHistory: false },
    { name: "Stiff com Halteres", group: "Posteriores", equipment: "Haltere", icon: "ph-person-simple-walk", hasHistory: false },
    { name: "Abdução de Quadril", group: "Abdutores", equipment: "Maquina", icon: "ph-person-simple-walk", hasHistory: false },
    { name: "Adução de Quadril", group: "Adutores", equipment: "Maquina", icon: "ph-person-simple-walk", hasHistory: false },
    { name: "Prancha", group: "Abdominais", equipment: "Nenhum", icon: "ph-person-simple", hasHistory: false },
    { name: "Abdominal Infra", group: "Abdominais", equipment: "Nenhum", icon: "ph-person-simple", hasHistory: true },
    { name: "Corrida Esteira", group: "Cardio", equipment: "Maquina", icon: "ph-heartbeat", hasHistory: false },
    { name: "Burpee", group: "CorpoInteiro", equipment: "Nenhum", icon: "ph-lightning", hasHistory: false },
    { name: "Kettlebell Swing", group: "CorpoInteiro", equipment: "Kettlebell", icon: "ph-barbell", hasHistory: false }
];

function getExerciseCatalogData() {
    const custom = readStorageJSON('customExercises', []);
    if (!Array.isArray(custom)) return [...EXERCISE_CATALOG_DATA];
    return [...EXERCISE_CATALOG_DATA, ...custom];
}

// Display-friendly labels
const GROUP_DISPLAY = {
    "todos": "Todos os Músculos",
    "Abdominais": "Abdominais",
    "Abdutores": "Abdutores",
    "Adutores": "Adutores",
    "Biceps": "Bíceps",
    "Cardio": "Cardio",
    "CorpoInteiro": "Corpo Inteiro",
    "CostasSuperiores": "Costas Superiores",
    "Dorsais": "Dorsais",
    "Ombros": "Ombros",
    "Peito": "Peito",
    "Pernas": "Pernas",
    "Posteriores": "Posteriores",
    "Quadriceps": "Quadríceps",
    "Triceps": "Tríceps"
};

const EQUIPMENT_DISPLAY = {
    "todos": "Todo o Equipamento",
    "Nenhum": "Nenhum",
    "Banda": "Banda de Resistência",
    "Barra": "Barra",
    "Disco": "Disco de Peso",
    "Haltere": "Haltere",
    "Kettlebell": "Kettlebell",
    "Maquina": "Máquina",
    "Outro": "Outro"
};

const MUSCLE_FILTER_OPTIONS = [
    { value: 'todos', label: 'Todos os Músculos', icon: 'ph-squares-four' },
    { value: 'Abdominais', label: 'Abdominais', icon: 'ph-person-simple' },
    { value: 'Abdutores', label: 'Abdutores', icon: 'ph-person-simple-walk' },
    { value: 'Adutores', label: 'Adutores', icon: 'ph-person-simple-walk' },
    { value: 'Biceps', label: 'Bíceps', icon: 'ph-barbell' },
    { value: 'Cardio', label: 'Cardio', icon: 'ph-heartbeat' },
    { value: 'CorpoInteiro', label: 'Corpo Inteiro', icon: 'ph-person-simple' },
    { value: 'CostasSuperiores', label: 'Costas Superiores', icon: 'ph-arrows-in-line-vertical' },
    { value: 'Dorsais', label: 'Dorsais', icon: 'ph-arrows-in-line-vertical' },
    { value: 'Ombros', label: 'Ombros', icon: 'ph-barbell' },
    { value: 'Peito', label: 'Peito', icon: 'ph-barbell' },
    { value: 'Pernas', label: 'Pernas', icon: 'ph-person-simple-walk' },
    { value: 'Posteriores', label: 'Posteriores', icon: 'ph-person-simple-walk' },
    { value: 'Quadriceps', label: 'Quadríceps', icon: 'ph-person-simple-walk' },
    { value: 'Triceps', label: 'Tríceps', icon: 'ph-barbell' }
];

const EQUIPMENT_FILTER_OPTIONS = [
    { value: 'todos', label: 'Todo o Equipamento', icon: 'ph-squares-four' },
    { value: 'Nenhum', label: 'Nenhum', icon: 'ph-person-simple' },
    { value: 'Banda', label: 'Banda de Resistência', icon: 'ph-wave-sine' },
    { value: 'Barra', label: 'Barra', icon: 'ph-barbell' },
    { value: 'Disco', label: 'Disco de Peso', icon: 'ph-circle' },
    { value: 'Haltere', label: 'Haltere', icon: 'ph-barbell' },
    { value: 'Kettlebell', label: 'Kettlebell', icon: 'ph-barbell' },
    { value: 'Maquina', label: 'Máquina', icon: 'ph-desktop' },
    { value: 'Outro', label: 'Outro', icon: 'ph-dots-three' }
];

// Map chip labels to internal group keys
const GROUP_MAP = {
    "todos": null,
    "Peito": "Peito",
    "Costas": "Dorsais",
    "Pernas": "Pernas",
    "Ombros": "Ombros",
    "Bracos": "Biceps"
};

let _exCatalogActiveGroup = "todos";
let _exCatalogSearchQuery = "";

function renderExerciseCatalog() {
    const container = document.getElementById("ex-catalog-list");
    if (!container) return;

    let filtered = getExerciseCatalogData();

    // Filter by group
    if (_exCatalogActiveGroup !== "todos") {
        const groupKey = GROUP_MAP[_exCatalogActiveGroup] || _exCatalogActiveGroup;
        filtered = filtered.filter(e => e.group === groupKey);
    }

    // Filter by search
    if (_exCatalogSearchQuery) {
        const q = _exCatalogSearchQuery.toLowerCase();
        filtered = filtered.filter(e =>
            e.name.toLowerCase().includes(q) ||
            (GROUP_DISPLAY[e.group] || e.group).toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="ex-catalog-empty">
                <i class="ph-bold ph-magnifying-glass"></i>
                <p>Nenhum exercicio encontrado.</p>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(ex => `
        <div class="ex-catalog-item" onclick="void(0)">
            <div class="ex-catalog-thumb">
                <i class="ph-bold ${ex.icon}"></i>
            </div>
            <div class="ex-catalog-info">
                <div class="ex-catalog-name">${escapeHTML(ex.name)}</div>
                <div class="ex-catalog-group">${escapeHTML(GROUP_DISPLAY[ex.group] || ex.group)}</div>
            </div>
            ${ex.hasHistory
            ? '<div class="ex-catalog-history" title="Historico de evolucao"><i class="ph-bold ph-chart-line-up"></i></div>'
            : '<div class="ex-catalog-history" title="Sem historico"><i class="ph-bold ph-lightning"></i></div>'
        }
        </div>
    `).join("");
}

function filterExercisesByGroup(group) {
    _exCatalogActiveGroup = group;

    // Update chip active states
    document.querySelectorAll(".ex-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.group === group);
    });

    renderExerciseCatalog();
}

function searchExercises(query) {
    _exCatalogSearchQuery = query.trim();
    renderExerciseCatalog();
}

function addCustomExercise() {
    const nameInput = document.getElementById('exercise-new-name');
    const groupInput = document.getElementById('exercise-new-group');
    const equipInput = document.getElementById('exercise-new-equipment');
    if (!nameInput || !groupInput || !equipInput) return;

    const name = sanitizeUserInput(nameInput.value, { maxLen: 80 });
    if (!name) {
        nameInput.focus();
        return;
    }

    const group = groupInput.value || 'Peito';
    const equipment = equipInput.value || 'Nenhum';
    const catalog = getExerciseCatalogData();
    const exists = catalog.some((ex) => normalizeText(ex.name) === normalizeText(name));
    if (exists) {
        alert('Exercicio ja existe no catalogo.');
        return;
    }

    const custom = readStorageJSON('customExercises', []);
    const next = Array.isArray(custom) ? custom.slice() : [];
    next.push({
        name,
        group,
        equipment,
        icon: 'ph-barbell',
        hasHistory: false,
        custom: true
    });
    memorySetItem('customExercises', JSON.stringify(next));
    nameInput.value = '';
    renderExerciseCatalog();
}


function mapPseToMetrics(pse) {
    const rpe = Number(pse) || 0;
    if (!rpe) return { rpe: null, rir: null, intensityLevel: 0 };
    const intensityLevel = Math.min(5, Math.max(1, Math.round(rpe)));
    const rir = Math.max(0, Math.round(5 - rpe));
    return { rpe, rir, intensityLevel };
}

function getPseLabel(rpe) {
    if (!rpe) return 'PSE --';
    const value = Number(rpe);
    if (!Number.isFinite(value)) return 'PSE --';
    const text = value % 1 === 0 ? String(value) : value.toFixed(1);
    return `PSE ${text}`;
}

function getPseRgb(rpe) {
    const value = Math.max(1, Math.min(5, Number(rpe) || 0));
    if (!value) return { r: 163, g: 163, b: 163 };
    const green = { r: 34, g: 197, b: 94 };
    const yellow = { r: 250, g: 204, b: 21 };
    const red = { r: 239, g: 68, b: 68 };
    if (value <= 3) {
        const t = (value - 1) / 2;
        return {
            r: Math.round(green.r + (yellow.r - green.r) * t),
            g: Math.round(green.g + (yellow.g - green.g) * t),
            b: Math.round(green.b + (yellow.b - green.b) * t)
        };
    }
    const t = (value - 3) / 2;
    return {
        r: Math.round(yellow.r + (red.r - yellow.r) * t),
        g: Math.round(yellow.g + (red.g - yellow.g) * t),
        b: Math.round(yellow.b + (red.b - yellow.b) * t)
    };
}

function getPseButtonStyle(rpe) {
    const { r, g, b } = getPseRgb(rpe);
    return `background: rgba(${r}, ${g}, ${b}, 0.12); border-color: rgba(${r}, ${g}, ${b}, 0.35); color: rgb(${r}, ${g}, ${b});`;
}

function renderPseSelector(exIdx, setIdx, rpe) {
    const value = Number(rpe);
    const label = Number.isFinite(value) && value > 0 ? (value % 1 === 0 ? String(value) : value.toFixed(1)) : '--';
    const hasValue = Number.isFinite(value) && value > 0;
    const style = hasValue ? ` style="${getPseButtonStyle(value)}"` : '';
    return `<button type="button" class="set-pse-btn ${hasValue ? 'has-value' : ''}"${style} onclick="openSetEffortQuickModal(${exIdx}, ${setIdx}, false)">${label}</button>`;
}

function renderExecSelector(exIdx, setIdx, execValue) {
    const value = Number(execValue);
    const label = Number.isFinite(value) && value > 0 ? String(value) : '--';
    const hasValue = Number.isFinite(value) && value > 0;
    return `<button type="button" class="set-exec-btn ${hasValue ? 'has-value' : ''}" onclick="openSetExecutionQuickModal(${exIdx}, ${setIdx}, false)">${label}</button>`;
}

function setSetPse(exIdx, setIdx, pse) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set) return;

    const mapped = mapPseToMetrics(pse);
    set.rpe = mapped.rpe;
    set.rir = mapped.rir;
    set.intensityLevel = mapped.intensityLevel;

    saveWorkoutBackup();
    renderWorkoutLog();
}

function setSetExecution(exIdx, setIdx, execValue) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set) return;
    const normalized = Math.min(5, Math.max(1, Number(execValue) || 0));
    set.execucao = normalized || 0;
    saveWorkoutBackup();
    renderWorkoutLog();
}







