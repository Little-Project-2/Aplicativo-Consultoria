function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    const app = document.getElementById('app');
    if (app) app.classList.remove('wide');
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
        const raw = localStorage.getItem(key);
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
        return parsed ?? fallback;
    } catch (err) {
        console.warn(`Falha ao ler localStorage["${key}"]`, err);
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
        trainerCode: String(student.trainerCode || localStorage.getItem('connectedTrainerCode') || ''),
        name: String(student.name || localStorage.getItem('studentName') || 'Aluno'),
        issuedAt: new Date().toISOString()
    };
    localStorage.setItem(STUDENT_AUTH_TOKEN_KEY, JSON.stringify(payload));
}

function clearStudentAuthToken() {
    localStorage.removeItem(STUDENT_AUTH_TOKEN_KEY);
}

function openStudentDashboardSession(student, opts = {}) {
    if (!student || !student.id) return false;
    const studentDashboardScreen = document.getElementById('student-dashboard-screen');
    if (!studentDashboardScreen) return false;

    localStorage.setItem('currentStudentId', String(student.id));
    localStorage.setItem('studentName', String(student.name || 'Aluno'));
    localStorage.setItem('connectedTrainerCode', String(student.trainerCode || '00001'));

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
            assessmentPending: current.assessmentPending ?? false,
            workoutBlocks: Array.isArray(current.workoutBlocks) && current.workoutBlocks.length > 0
                ? current.workoutBlocks
                : defaultWorkoutBlocks,
            mealBlocks: Array.isArray(current.mealBlocks) && current.mealBlocks.length > 0
                ? current.mealBlocks
                : JSON.parse(JSON.stringify(DEMO_MEAL_BLOCKS))
        };
    }

    localStorage.setItem('trainerStudents', JSON.stringify(students));
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
            assessmentPending: current.assessmentPending ?? true,
            workoutBlocks: Array.isArray(current.workoutBlocks) && current.workoutBlocks.length > 0 ? current.workoutBlocks : DEMO_WORKOUT_BLOCKS,
            mealBlocks: Array.isArray(current.mealBlocks) && current.mealBlocks.length > 0 ? current.mealBlocks : DEMO_MEAL_BLOCKS,
            metricHistory: Array.isArray(current.metricHistory) && current.metricHistory.length > 0 ? current.metricHistory : [baselineMetric]
        };
    }

    localStorage.setItem('trainerStudents', JSON.stringify(students));
}

function goToHome() {
    // Keep remember-me token, clear only active session data.
    localStorage.removeItem('currentStudentId');
    localStorage.removeItem('connectedTrainerCode');
    localStorage.removeItem('studentName');
    hideAllScreens();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('active');
}

function logout() {
    if (workoutState && !confirmExitActiveWorkout()) return;
    if (confirm('Deseja realmente sair?')) {
        localStorage.clear();
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

let syncPushTimer = null;
let syncPullTimer = null;
let syncPullInFlight = false;
let isApplyingRemoteState = false;

function isSupabaseReady() {
    return typeof window.supabase?.from === 'function';
}

function getActiveSyncTrainerCode() {
    return (
        localStorage.getItem('currentTrainerCode') ||
        localStorage.getItem('connectedTrainerCode') ||
        localStorage.getItem('trainerCodeDefault') ||
        ''
    );
}

function getLocalStateUpdatedAt() {
    return localStorage.getItem('app_state_updated_at') || '';
}

function setLocalStateUpdatedAt(ts) {
    if (ts) localStorage.setItem('app_state_updated_at', ts);
}

function getLocalSyncPayload() {
    const payload = {};
    SYNC_KEYS.forEach((key) => {
        const raw = localStorage.getItem(key);
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
    const rawSet = window.__rawSetItem || localStorage.setItem.bind(localStorage);
    if (typeof value === 'string') {
        rawSet(key, value);
    } else {
        rawSet(key, JSON.stringify(value));
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
    if (!isSupabaseReady()) return;
    if (syncPushTimer) clearTimeout(syncPushTimer);
    syncPushTimer = setTimeout(() => pushAppState(reason), 800);
}

function startSyncPolling() {
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
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    window.__rawSetItem = originalSetItem;
    window.__rawRemoveItem = originalRemoveItem;

    localStorage.setItem = (key, value) => {
        originalSetItem(key, value);
        if (SYNC_KEYS.includes(key) && !isApplyingRemoteState) scheduleRemoteSync(`set:${key}`);
    };

    localStorage.removeItem = (key) => {
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
        const currentStudentId = localStorage.getItem('currentStudentId');
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
        const studentId = localStorage.getItem('currentStudentId');
        if (studentId) {
            initStudentDashboard();
        }
    }
};

async function loadSPAComponents() {
    const containers = document.querySelectorAll('[data-page]');
    const promises = Array.from(containers).map(async (container) => {
        const rawUrl = container.getAttribute('data-page');
        const url = rawUrl && !rawUrl.startsWith('/') ? `/${rawUrl}` : rawUrl;
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
    const studentId = localStorage.getItem('currentStudentId');
    if (studentId) {
        const students = readStorageJSON('trainerStudents', []);
        const legacyStudent = students.find(s => String(s.id) === String(studentId));
        if (legacyStudent) {
            if (openStudentDashboardSession(legacyStudent, { persistToken: true })) {
                return;
            }
        }
        localStorage.removeItem('currentStudentId');
        localStorage.removeItem('connectedTrainerCode');
        localStorage.removeItem('studentName');
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
        const studentId = localStorage.getItem('currentStudentId');
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
    localStorage.removeItem('trainerSessionCode');
    localStorage.removeItem('trainerName');
    localStorage.removeItem('currentTrainerCode');
    window.location.href = 'index.html';
}

function editTrainerProfile() {
    const trainerName = localStorage.getItem('trainerName') || 'Treinador';
    const trainerCode = localStorage.getItem('currentTrainerCode') || '00001';

    alert(`?? Editar Perfil\n\nNome: ${trainerName}\nCódigo: ${trainerCode}\n\nEsta funcionalidade será implementada em breve.`);
    closeTrainerProfileMenu();
}

function viewTrainerStats() {
    const students = readStorageJSON('trainerStudents', []);
    const trainerCode = localStorage.getItem('currentTrainerCode') || '00001';
    const myStudents = students.filter(s => s.trainerCode === trainerCode);

    const total = myStudents.length;
    const active = myStudents.filter(s => s.active).length;
    const pending = myStudents.filter(s => s.pending).length;

    alert(`?? Estatísticas\n\nTotal de Alunos: ${total}\nAtivos: ${active}\nPendentes: ${pending}\n\nVisita a aba "Alunos" para gerenciar.`);
    closeTrainerProfileMenu();
    switchDashView('alunos');
}

function shareTrainerCode() {
    const trainerCode = localStorage.getItem('currentTrainerCode') || '00001';
    const message = `Meu código de consultoria: ${trainerCode}\n\nJunte-se ao meu programa de treino e nutrição!`;

    if (navigator.share) {
        navigator.share({
            title: 'Código de Consultoria',
            text: message
        });
    } else {
        alert(`?? Código para compartilhar:\n\n${trainerCode}\n\nCopie este código e compartilhe com seus alunos.`);
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
    localStorage.setItem('registeredUsers', JSON.stringify(users));

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
        let trainerCode = localStorage.getItem('currentTrainerCode') || '00001';
        localStorage.setItem('trainerName', safeUserName.split(' ')[0]);
        localStorage.setItem('currentTrainerCode', trainerCode);
        window.location.href = 'trainer.html';
    } else {
        localStorage.setItem('studentName', safeUserName);
        // Find if this user already has an ID, or generate one
        let studentId = localStorage.getItem('currentStudentId') || Math.floor(10000 + Math.random() * 90000).toString();
        if (studentId === ADMIN_STUDENT_CODE || studentId === SELF_TRAINING_STUDENT_CODE) {
            studentId = Math.floor(10000 + Math.random() * 90000).toString();
        }
        localStorage.setItem('currentStudentId', studentId);

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
        const studentId = localStorage.getItem('currentStudentId');
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
        const studentId = localStorage.getItem('currentStudentId');
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
    const lastSent = parseInt(localStorage.getItem(lastKey) || '0', 10);
    const minIntervalMs = 30_000;
    if (!options.force && now - lastSent < minIntervalMs) return;

    const studentName = sanitizeUserInput(student?.name || localStorage.getItem('studentName') || 'Aluno', { maxLen: 90 }) || 'Aluno';
    const notifs = readStorageJSON('trainerNotifications', []);
    notifs.unshift({
        type: 'duvida',
        kind: 'workout_update',
        studentId,
        studentName,
        title: `?? Treino atualizado - ${studentName}`,
        desc: `[Plano de treino atualizado] ${blocks.length} treino(s), ${totalExercises} exercícios.`,
        time: new Date().toISOString(),
        unread: true
    });
    localStorage.setItem('trainerNotifications', JSON.stringify(notifs));
    localStorage.setItem(lastKey, String(now));
    syncChannel.postMessage({ type: 'NEW_DOUBT', payload: { studentId } });
}

function promptStudentField(label, defaultValue = '', options = {}) {
    const raw = prompt(label, defaultValue ?? '');
    if (raw === null) return null;
    return sanitizeUserInput(raw, {
        maxLen: Number.isFinite(options.maxLen) ? options.maxLen : 90,
        allowNewlines: !!options.allowNewlines
    });
}

function addStudentWorkoutBlock() {
    const studentId = localStorage.getItem('currentStudentId');
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
    const studentId = localStorage.getItem('currentStudentId');
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
    const studentId = localStorage.getItem('currentStudentId');
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
    const studentId = localStorage.getItem('currentStudentId');
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
    const studentId = localStorage.getItem('currentStudentId');
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
    const studentId = localStorage.getItem('currentStudentId');
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

    const studentId = localStorage.getItem('currentStudentId');
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
        title: `?? Dúvida de ${safeName}`,
        desc: safeText || '[Mídia enviada]',
        media,
        time: nowIso,
        unread: true
    });

    localStorage.setItem('trainerNotifications', JSON.stringify(notifications));
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
    localStorage.setItem(storageKey, JSON.stringify(merged));
    return merged;
}

function saveStudentChatMessages(studentId, messages) {
    localStorage.setItem(getStudentChatStorageKey(studentId), JSON.stringify(messages || []));
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
    const studentId = localStorage.getItem('currentStudentId');
    const studentName = localStorage.getItem('studentName') || 'Aluno';
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
    const studentId = localStorage.getItem('currentStudentId');
    const studentName = localStorage.getItem('studentName') || 'Aluno';
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

    const studentId = localStorage.getItem('currentStudentId');
    const studentName = localStorage.getItem('studentName') || 'Aluno';
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
    const studentId = localStorage.getItem('currentStudentId');
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

    const exercises = Array.isArray(workout.Exercicios) ? workout.Exercicios : [];
    const exercisesHtml = exercises.length
        ? exercises.map(renderHistoryExerciseDetail).join('')
        : '<div class="hd-empty">Sem exercícios registrados.</div>';
    const noteHtml = note
        ? `<div class="history-detail-note">${escHtml(note)}</div>`
        : '<div class="history-detail-note muted">Sem observações do treino.</div>';

    body.innerHTML = `
        <div class="history-detail-stats">
            <div class="hd-stat">
                <i class="ph-bold ph-timer"></i>
                <span>${durationMin}:${durationSec.toString().padStart(2, '0')}</span>
                <small>Duração</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-chart-line-up"></i>
                <span>${rpeLabel}</span>
                <small>PSE médio</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-star"></i>
                <span>${qualityLabel}</span>
                <small>Qualidade</small>
            </div>
            <div class="hd-stat">
                <i class="ph-bold ph-fire"></i>
                <span>${intensityLabel}</span>
                <small>Intensidade</small>
            </div>
            <div class="hd-stat">
                <i class="ph-fill ph-trophy"></i>
                <span>${prTotal}</span>
                <small>PRs</small>
            </div>
        </div>
        ${noteHtml}
        <div class="history-detail-exercises">
            ${exercisesHtml}
        </div>
    `;

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
}

function closeTrainerHistoryDetail() {
    const modal = document.getElementById('trainer-history-detail-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 200);
}

function openExerciseProgressModalEncoded(encodedName) {
    if (!encodedName) return;
    openExerciseProgressModal(decodeURIComponent(encodedName));
}

function openExerciseProgressModal(exerciseName) {
    const modal = document.getElementById('exercise-progress-modal-overlay');
    const title = document.getElementById('exercise-progress-title');
    const body = document.getElementById('exercise-progress-body');
    if (!modal || !title || !body) return;

    const studentId = localStorage.getItem('currentStudentId');
    const history = readStorageJSON('workoutHistory', []).filter(w => String(w.ID_Usuario) === String(studentId));
    const records = history.map(entry => {
        const ex = (entry.Exercicios || []).find(e => String(e.nome || '').toLowerCase() === String(exerciseName || '').toLowerCase());
        if (!ex) return null;
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        const maxWeight = sets.reduce((max, s) => Math.max(max, getSetWeightValue(s)), 0);
        const maxVolume = sets.reduce((max, s) => Math.max(max, getSetVolumeValue(s)), 0);
        const maxOneRm = sets.reduce((max, s) => Math.max(max, getSetOneRMValue(s)), 0);
        return {
            date: entry.Data_Treino,
            weight: maxWeight,
            volume: maxVolume,
            oneRm: maxOneRm
        };
    }).filter(Boolean);

    const last = records[records.length - 1];
    const prWeight = records.reduce((max, r) => Math.max(max, r.weight || 0), 0);
    const prVolume = records.reduce((max, r) => Math.max(max, r.volume || 0), 0);
    const prOneRm = records.reduce((max, r) => Math.max(max, r.oneRm || 0), 0);

    title.textContent = `Histórico de Carga - ${exerciseName}`;

    body.innerHTML = `
        <div class="exercise-progress-head refined">
            <div class="exercise-progress-stat">
                <label>Última carga</label>
                <strong>${last ? formatMetricNumber(last.weight) : '--'} kg</strong>
            </div>
            <div class="exercise-progress-stat">
                <label>PR Peso</label>
                <strong>${prWeight ? formatMetricNumber(prWeight) : '--'} kg</strong>
            </div>
            <div class="exercise-progress-stat">
                <label>PR Volume</label>
                <strong>${prVolume ? formatMetricNumber(prVolume) : '--'} kg</strong>
            </div>
            <div class="exercise-progress-stat">
                <label>PR 1RM</label>
                <strong>${prOneRm ? formatMetricNumber(prOneRm) : '--'} kg</strong>
            </div>
        </div>
        <div class="exercise-progress-list">
            ${records.length ? records.slice().reverse().map(r => `
                <div class="exercise-progress-item">
                    <span>${formatDate(r.date)}</span>
                    <span>${formatMetricNumber(r.weight)} kg</span>
                    <span>Vol ${formatMetricNumber(r.volume)} kg</span>
                    <span>1RM ${formatMetricNumber(r.oneRm)} kg</span>
                </div>
            `).join('') : '<p class="muted">Sem registros para este exercício.</p>'}
        </div>
    `;

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
}

function closeExerciseProgressModal() {
    const modal = document.getElementById('exercise-progress-modal-overlay');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 200);
}

function ensureStyleFallback() {
    const applyFallback = async () => {
        try {
            const bg = getComputedStyle(document.body).backgroundColor;
            const looksUnstyled = bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)';
            if (!looksUnstyled) return;
            const candidates = ['style.css?v=1', '/style.css?v=1', '/public/style.css?v=1'];
            for (const href of candidates) {
                const res = await fetch(href);
                if (!res.ok) continue;
                const css = await res.text();
                const styleTag = document.createElement('style');
                styleTag.setAttribute('data-fallback-style', '1');
                styleTag.textContent = css;
                document.head.appendChild(styleTag);
                break;
            }
        } catch {
            // ignore fallback failures
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', applyFallback);
    } else {
        applyFallback();
    }
}

ensureStyleFallback();
