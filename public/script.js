function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach((screen) => {
        screen.classList.remove('active', 'auth-screen-enter');
    });
    const app = document.getElementById('app');
    if (app) app.classList.remove('wide');
}

function activateScreen(screenId, options = {}) {
    const screen = document.getElementById(screenId);
    if (!screen) return false;
    hideAllScreens();
    screen.classList.add('active');

    if (options.animate) {
        screen.classList.remove('auth-screen-enter');
        void screen.offsetWidth;
        screen.classList.add('auth-screen-enter');
        setTimeout(() => screen.classList.remove('auth-screen-enter'), 340);
    }

    return true;
}


const appStorage = (() => {
    const memoryStore = new Map();
    const safeMemory = {
        getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
        setItem: (key, value) => memoryStore.set(String(key), String(value)),
        removeItem: (key) => memoryStore.delete(String(key)),
        clear: () => memoryStore.clear()
    };

    const hasLocalStorage = (() => {
        try {
            const testKey = '__consultoria_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (err) {
            return false;
        }
    })();

    let activeBackend = hasLocalStorage ? window.localStorage : safeMemory;

    return {
        getItem: (key) => activeBackend.getItem(String(key)),
        setItem: (key, value) => {
            try {
                activeBackend.setItem(String(key), String(value));
            } catch (err) {
                if (activeBackend !== safeMemory) {
                    activeBackend = safeMemory;
                    activeBackend.setItem(String(key), String(value));
                }
            }
        },
        removeItem: (key) => activeBackend.removeItem(String(key)),
        clear: () => activeBackend.clear(),
        isPersistent: () => activeBackend === window.localStorage
    };
})();

function memoryGetItem(key) {
    return appStorage.getItem(key);
}
function memorySetItem(key, value) {
    appStorage.setItem(key, value);
}
function memoryRemoveItem(key) {
    appStorage.removeItem(key);
}
function memoryClear() {
    appStorage.clear();
}

const ADMIN_STUDENT_CODE = '12345';
const ADMIN_STUDENT_NAME = 'Nicolas';
const SELF_TRAINING_STUDENT_CODE = '77777';
const SELF_TRAINING_STUDENT_NAME = 'Diego';
const SELF_TRAINING_STUDENT_CODES = [SELF_TRAINING_STUDENT_CODE];
const ENABLE_DEMO_ACCESS = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAINER_SETTINGS_KEY = 'trainer_settings_v1';
const AUTH_MIGRATION_DONE_KEY = 'migration_done_v1';
let activeDashboardFilter = 'all';
let activeEngagementRange = 7;
let lastMainTrainerView = 'dashboard';
let trainerDrawerOpen = false;
let trainerRouteLock = false;
const TRAINER_DASHBOARD_TUTORIAL_KEY = 'trainer_dashboard_tutorial_v1';

function getMigrationDoneKey(userId = '') {
    const safeId = String(userId || '').trim();
    return safeId ? `${AUTH_MIGRATION_DONE_KEY}:${safeId}` : AUTH_MIGRATION_DONE_KEY;
}

function hasMigrationCompleted(userId = '') {
    return memoryGetItem(getMigrationDoneKey(userId)) === '1';
}

function markMigrationCompleted(userId = '') {
    memorySetItem(getMigrationDoneKey(userId), '1');
    memorySetItem(AUTH_MIGRATION_DONE_KEY, '1');
}

function clearAuthRuntimeContext() {
    memoryRemoveItem('currentUserId');
    memoryRemoveItem('currentUserEmail');
    memoryRemoveItem('currentUserRoles');
    memoryRemoveItem('currentUserRole');
    memoryRemoveItem('currentOnboardingStep');
    memoryRemoveItem('currentStudentId');
    memoryRemoveItem('connectedTrainerCode');
    memoryRemoveItem('studentName');
    memoryRemoveItem('currentAnamnesis');
}

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

// Base da dieta inspirada no motor do arquivo "Dieta" (TMB/TDEE/macros/preset de refeicoes)
const DIETA_ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    intense: 1.725
};

const DIETA_GOAL_RULES = {
    fat_loss: { adjust: -0.2, proteinMultiplier: 2.0, fatMultiplier: 0.9 },
    lean_bulk: { adjust: 0.1, proteinMultiplier: 1.8, fatMultiplier: 0.9 },
    recomposition: { adjust: -0.05, proteinMultiplier: 2.2, fatMultiplier: 0.8 },
    maintenance: { adjust: 0, proteinMultiplier: 1.6, fatMultiplier: 0.9 }
};

const DIETA_MEAL_PRESETS = {
    3: [0.3, 0.4, 0.3],
    4: [0.25, 0.3, 0.25, 0.2],
    5: [0.2, 0.25, 0.25, 0.2, 0.1],
    6: [0.2, 0.2, 0.2, 0.2, 0.1, 0.1]
};

const DIETA_MEAL_NAMES = {
    3: ['Cafe da Manha', 'Almoco', 'Jantar'],
    4: ['Cafe da Manha', 'Almoco', 'Lanche', 'Jantar'],
    5: ['Cafe da Manha', 'Almoco', 'Lanche', 'Jantar', 'Ceia'],
    6: ['Cafe da Manha', 'Colacao', 'Almoco', 'Lanche', 'Jantar', 'Ceia']
};

function roundMacro(value, min = 0) {
    const n = Math.round(Number(value) || 0);
    return Math.max(min, n);
}

function mapGoalToDietaRule(goalText) {
    const goal = String(goalText || '').toLowerCase();
    if (goal.includes('emag') || goal.includes('gordura') || goal.includes('secar') || goal.includes('perder')) {
        return 'fat_loss';
    }
    if (goal.includes('recomp')) return 'recomposition';
    if (goal.includes('hipertrof') || goal.includes('massa') || goal.includes('ganho')) {
        return 'lean_bulk';
    }
    return 'maintenance';
}

function mapQuestionnaireActivity(questionnaire) {
    const trabalho = String(questionnaire?.rotina?.trabalho || '').toLowerCase();
    if (trabalho.includes('pesado') || trabalho.includes('bracal') || trabalho.includes('manual')) return 'intense';
    if (trabalho.includes('em pe') || trabalho.includes('ativo')) return 'moderate';
    if (trabalho.includes('sentado')) return 'sedentary';
    return 'light';
}

function getDietaMealCount(questionnaire) {
    const parsed = parseInt(questionnaire?.nutricao?.refeicoes, 10);
    if (Number.isFinite(parsed)) return Math.min(6, Math.max(3, parsed));
    return 4;
}

function buildMealItemsFromTargets(mealName, targets) {
    const name = String(mealName || '').toLowerCase();
    const p = roundMacro(targets.protein, 8);
    const c = roundMacro(targets.carb, 5);
    const f = roundMacro(targets.fat, 3);
    const totalKcal = roundMacro((p * 4) + (c * 4) + (f * 9), 120);

    if (name.includes('cafe') || name.includes('colacao')) {
        return [
            { nome: 'Ovos mexidos', qtd: `${Math.max(2, Math.round(p / 8))} un`, kcal: roundMacro(totalKcal * 0.45), prot: roundMacro(p * 0.55), carb: roundMacro(c * 0.15), gord: roundMacro(f * 0.7) },
            { nome: 'Aveia com banana', qtd: `${Math.max(35, Math.round(c * 2.3))} g`, kcal: roundMacro(totalKcal * 0.55), prot: roundMacro(p * 0.45), carb: roundMacro(c * 0.85), gord: roundMacro(f * 0.3) }
        ];
    }

    if (name.includes('almoco')) {
        return [
            { nome: 'Frango grelhado', qtd: `${Math.max(120, Math.round(p * 4.2))} g`, kcal: roundMacro(totalKcal * 0.5), prot: roundMacro(p * 0.62), carb: roundMacro(c * 0.12), gord: roundMacro(f * 0.45) },
            { nome: 'Arroz + feijao', qtd: `${Math.max(120, Math.round(c * 3.2))} g`, kcal: roundMacro(totalKcal * 0.5), prot: roundMacro(p * 0.38), carb: roundMacro(c * 0.88), gord: roundMacro(f * 0.55) }
        ];
    }

    if (name.includes('jantar')) {
        return [
            { nome: 'Carne magra', qtd: `${Math.max(110, Math.round(p * 3.9))} g`, kcal: roundMacro(totalKcal * 0.48), prot: roundMacro(p * 0.6), carb: roundMacro(c * 0.18), gord: roundMacro(f * 0.52) },
            { nome: 'Batata doce', qtd: `${Math.max(110, Math.round(c * 3.1))} g`, kcal: roundMacro(totalKcal * 0.52), prot: roundMacro(p * 0.4), carb: roundMacro(c * 0.82), gord: roundMacro(f * 0.48) }
        ];
    }

    if (name.includes('ceia')) {
        return [
            { nome: 'Iogurte natural', qtd: `${Math.max(150, Math.round(p * 4))} g`, kcal: roundMacro(totalKcal * 0.55), prot: roundMacro(p * 0.62), carb: roundMacro(c * 0.35), gord: roundMacro(f * 0.4) },
            { nome: 'Castanhas', qtd: `${Math.max(15, Math.round(f * 1.4))} g`, kcal: roundMacro(totalKcal * 0.45), prot: roundMacro(p * 0.38), carb: roundMacro(c * 0.65), gord: roundMacro(f * 0.6) }
        ];
    }

    return [
        { nome: 'Iogurte + whey', qtd: `${Math.max(180, Math.round(p * 3.8))} g`, kcal: roundMacro(totalKcal * 0.5), prot: roundMacro(p * 0.58), carb: roundMacro(c * 0.38), gord: roundMacro(f * 0.45) },
        { nome: 'Fruta + pasta de amendoim', qtd: `${Math.max(130, Math.round(c * 2.7))} g`, kcal: roundMacro(totalKcal * 0.5), prot: roundMacro(p * 0.42), carb: roundMacro(c * 0.62), gord: roundMacro(f * 0.55) }
    ];
}

function createDietBaseFromStudent(studentLike = {}) {
    const weight = Math.max(35, parseDecimalSafe(studentLike.weight) || 70);
    const height = Math.max(130, parseDecimalSafe(studentLike.height) || 170);
    const age = Math.max(14, parseIntegerSafe(studentLike.age) || 25);
    const sex = String(studentLike.gender || 'M').toLowerCase().startsWith('f') ? 'female' : 'male';
    const goalKey = mapGoalToDietaRule(studentLike.goal);
    const goalRule = DIETA_GOAL_RULES[goalKey] || DIETA_GOAL_RULES.maintenance;
    const activityKey = mapQuestionnaireActivity(studentLike.questionnaire);
    const activityFactor = DIETA_ACTIVITY_FACTORS[activityKey] || DIETA_ACTIVITY_FACTORS.light;
    const mealCount = getDietaMealCount(studentLike.questionnaire);
    const percentages = DIETA_MEAL_PRESETS[mealCount] || DIETA_MEAL_PRESETS[4];
    const mealNames = DIETA_MEAL_NAMES[mealCount] || DIETA_MEAL_NAMES[4];

    const baseBmr = (10 * weight) + (6.25 * height) - (5 * age);
    const bmr = sex === 'male' ? baseBmr + 5 : baseBmr - 161;
    const tdee = bmr * activityFactor;
    const targetCalories = Math.max(1400, Math.round(tdee * (1 + goalRule.adjust)));

    const protein = Math.max(90, Math.round(weight * goalRule.proteinMultiplier));
    const fat = Math.max(40, Math.round(weight * goalRule.fatMultiplier));
    const remainingCarbsKcal = Math.max(0, targetCalories - (protein * 4) - (fat * 9));
    const carb = Math.max(80, Math.round(remainingCarbsKcal / 4));

    const mealBlocks = percentages.map((ratio, index) => {
        const targets = {
            kcal: roundMacro(targetCalories * ratio, 150),
            protein: roundMacro(protein * ratio, 8),
            carb: roundMacro(carb * ratio, 8),
            fat: roundMacro(fat * ratio, 4)
        };
        return {
            name: mealNames[index] || `Refeicao ${index + 1}`,
            items: buildMealItemsFromTargets(mealNames[index], targets)
        };
    });

    const dietMeta = {
        kcal: targetCalories,
        protein,
        carb,
        fat,
        tmb: Math.round(bmr),
        gasto: Math.round(tdee),
        source: 'dieta_engine_base_v1',
        updatedAt: new Date().toISOString()
    };

    return { mealBlocks, dietMeta };
}

function getDefaultWorkoutBlocks() {
    return JSON.parse(JSON.stringify(DEMO_WORKOUT_BLOCKS));
}

function getDefaultMealBlocks() {
    return JSON.parse(JSON.stringify(DEMO_MEAL_BLOCKS));
}

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
        return parsed ?? fallback;
    } catch (err) {
        console.warn(`Falha ao ler storage["${key}"]`, err);
        return fallback;
    }
}

function openStudentDashboardSession(student) {
    if (!student || !student.id) return false;
    const studentDashboardScreen = document.getElementById('student-dashboard-screen');
    if (!studentDashboardScreen) return false;
    if (!ENABLE_DEMO_ACCESS && !memoryGetItem('currentUserId')) {
        console.warn('Sessao de aluno bloqueada: usuario nao autenticado.');
        goToGlobalLogin();
        return false;
    }

    memorySetItem('currentStudentId', String(student.id));
    memorySetItem('studentName', String(student.name || 'Aluno'));
    const studentTrainerCode = sanitizeCodeInput(
        student.trainerCode || student.trainer_code || memoryGetItem('connectedTrainerCode') || '',
        5
    );
    if (studentTrainerCode) {
        memorySetItem('connectedTrainerCode', studentTrainerCode);
    }
    if (navigator.onLine === false) setStudentSyncState('offline', 'Sem conexão');
    else setStudentSyncState('synced', 'Sincronizado');

    hideAllScreens();
    const app = document.getElementById('app');
    if (app) app.classList.add('wide');
    studentDashboardScreen.classList.add('active');
    initStudentDashboard();
    switchStudentView('home');
    return true;
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

function getTrainerDashboardTutorialStorageKey() {
    const trainerCode = memoryGetItem('currentTrainerCode') || '00001';
    return `${TRAINER_DASHBOARD_TUTORIAL_KEY}:${trainerCode}`;
}

function isTrainerDashboardTutorialSeen() {
    return memoryGetItem(getTrainerDashboardTutorialStorageKey()) === '1';
}

function showTrainerDashboardTutorial() {
    const tutorial = document.getElementById('dashboard-onboarding');
    if (!tutorial) return;
    tutorial.style.display = '';
    tutorial.classList.add('is-visible');
}

function dismissTrainerDashboardTutorial(markAsSeen = true) {
    const tutorial = document.getElementById('dashboard-onboarding');
    if (tutorial) {
        tutorial.classList.remove('is-visible');
        tutorial.style.display = 'none';
    }
    if (markAsSeen) {
        memorySetItem(getTrainerDashboardTutorialStorageKey(), '1');
    }
}

function syncTrainerDashboardTutorialVisibility() {
    const tutorial = document.getElementById('dashboard-onboarding');
    const reopen = document.getElementById('dashboard-tutorial-reopen');
    if (!tutorial) return;
    const seen = isTrainerDashboardTutorialSeen();
    if (seen) {
        tutorial.style.display = 'none';
        tutorial.classList.remove('is-visible');
    } else {
        tutorial.style.display = '';
        tutorial.classList.add('is-visible');
    }
    if (reopen) {
        reopen.style.display = seen ? 'inline-flex' : 'none';
    }
}

function buildEngagementSeries(daysBack = 7) {
    const now = new Date();
    const days = [];
    const totalDays = Math.max(7, Number(daysBack) || 7);
    for (let i = totalDays - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = totalDays <= 7
            ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
            : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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

function setEngagementRange(days, event) {
    if (event) event.stopPropagation();
    activeEngagementRange = Number(days) || 7;
    document.querySelectorAll('.engagement-range-btn').forEach((btn) => {
        const isActive = Number(btn.dataset.range) === activeEngagementRange;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const subtitle = document.querySelector('.engagement-header .subtitle');
    if (subtitle) {
        subtitle.textContent = `Treinos concluidos nos ultimos ${activeEngagementRange} dias`;
    }
    renderEngagementChart();
}

function renderEngagementChart() {
    const svg = document.getElementById('engagement-chart');
    const labels = document.getElementById('engagement-labels');
    const totalEl = document.getElementById('engagement-total');
    const tooltip = document.getElementById('engagement-tooltip');
    if (!svg || !labels || !totalEl) return;

    const series = buildEngagementSeries(activeEngagementRange);
    document.querySelectorAll('.engagement-range-btn').forEach((btn) => {
        const isActive = Number(btn.dataset.range) === activeEngagementRange;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const counts = series.map((d) => d.count);
    const total = counts.reduce((sum, val) => sum + val, 0);
    const avg = total > 0 ? (total / series.length) : 0;
    const peakPoint = series.reduce((best, item) => (item.count > (best?.count || -1) ? item : best), null);
    totalEl.textContent = total;
    const avgEl = document.getElementById('engagement-avg');
    if (avgEl) avgEl.textContent = avg.toFixed(1);
    const peakEl = document.getElementById('engagement-peak');
    if (peakEl) {
        peakEl.textContent = peakPoint && peakPoint.count > 0 ? `${peakPoint.label} (${peakPoint.count})` : '-';
    }

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

    const smoothPath = (pts) => {
        if (pts.length <= 1) return '';
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i += 1) {
            const current = pts[i];
            const next = pts[i + 1];
            const cx = (current.x + next.x) / 2;
            path += ` Q ${cx} ${current.y}, ${next.x} ${next.y}`;
        }
        return path;
    };

    const linePath = smoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    const gridLines = Array.from({ length: 4 }, (_, i) => {
        const value = Math.round((maxVal / 3) * i);
        const y = height - padding - (value * yScale);
        return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" class="engagement-grid-line"></line>`;
    }).join('');

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.remove('engagement-chart-enter');
    void svg.offsetWidth;
    svg.classList.add('engagement-chart-enter');
    svg.classList.toggle('is-empty', total === 0);
    svg.innerHTML = `
        <defs>
            <linearGradient id="engagementAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(163,230,53,0.35)"></stop>
                <stop offset="100%" stop-color="rgba(163,230,53,0.01)"></stop>
            </linearGradient>
        </defs>
        ${gridLines}
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="engagement-baseline"></line>
        <path class="engagement-area" d="${areaPath}"></path>
        <path class="engagement-line" d="${linePath}"></path>
        ${points.map((p, idx) => `
            <circle
                class="engagement-dot"
                cx="${p.x}"
                cy="${p.y}"
                r="4"
                tabindex="0"
                data-index="${idx}"
                data-label="${series[idx].label}"
                data-value="${p.value}"
            ></circle>
        `).join('')}
    `;

    const labelStride = series.length > 14 ? 3 : (series.length > 7 ? 2 : 1);
    labels.style.setProperty('--engagement-label-count', String(series.length));
    labels.innerHTML = series.map((d, index) => `
        <div class="engagement-label">
            <span>${index % labelStride === 0 ? d.label : ''}</span>
            <strong>${d.count}</strong>
        </div>
    `).join('');

    const line = svg.querySelector('.engagement-line');
    if (line && typeof line.getTotalLength === 'function') {
        const length = line.getTotalLength();
        line.style.strokeDasharray = `${length}`;
        line.style.strokeDashoffset = `${length}`;
        requestAnimationFrame(() => {
            line.style.strokeDashoffset = '0';
        });
    }

    if (tooltip) {
        tooltip.style.opacity = '0';
    }
    svg.querySelectorAll('.engagement-dot').forEach((dot) => {
        const show = (evt) => {
            if (!tooltip) return;
            const value = dot.getAttribute('data-value') || '0';
            const label = dot.getAttribute('data-label') || '';
            tooltip.textContent = `${label}: ${value} treino${value === '1' ? '' : 's'}`;
            tooltip.style.opacity = '1';

            const svgRect = svg.getBoundingClientRect();
            const targetRect = (evt?.target || dot).getBoundingClientRect();
            const left = targetRect.left - svgRect.left + targetRect.width / 2;
            const top = targetRect.top - svgRect.top - 10;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        };
        const hide = () => {
            if (!tooltip) return;
            tooltip.style.opacity = '0';
        };

        dot.addEventListener('mouseenter', show);
        dot.addEventListener('mousemove', show);
        dot.addEventListener('focus', show);
        dot.addEventListener('mouseleave', hide);
        dot.addEventListener('blur', hide);
    });
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
            'nav-config': 'nav-config'
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
    return !!student?.canSelfEditWorkout || (ENABLE_DEMO_ACCESS && SELF_TRAINING_STUDENT_CODES.includes(id));
}

function ensureSelfTrainingStudent() {
    if (!ENABLE_DEMO_ACCESS) return;
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
    const defaultWorkoutBlocks = getDefaultWorkoutBlocks();

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
        mealBlocks: [],
        lastWorkoutAt: selfLastWorkout.toISOString(),
        assessmentPending: false,
        metricHistory: [baselineMetric],
        progressLogs: [{ date: new Date().toISOString().slice(0, 10), weight: 82, notes: 'Perfil Diego auto-treino.' }],
        personalRecords: {}
    };
    selfStudent.tmbBase = Math.round(calcTMBMifflin(selfStudent.weight, selfStudent.height, selfStudent.age, selfStudent.gender));
    const selfDietBase = createDietBaseFromStudent(selfStudent);
    selfStudent.mealBlocks = selfDietBase.mealBlocks;
    selfStudent.dietMeta = selfDietBase.dietMeta;

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
                : selfDietBase.mealBlocks,
            dietMeta: current.dietMeta && typeof current.dietMeta === 'object'
                ? current.dietMeta
                : selfDietBase.dietMeta
        };
    }

    saveStudentData(students);
}

function ensureAdminStudent() {
    if (!ENABLE_DEMO_ACCESS) return;
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
        mealBlocks: [],
        lastWorkoutAt: adminLastWorkout.toISOString(),
        assessmentPending: true,
        metricHistory: [baselineMetric],
        progressLogs: [{ date: new Date().toISOString().slice(0, 10), weight: 78, notes: 'Perfil demo Beta inicial.' }],
        personalRecords: {}
    };
    demoStudent.tmbBase = Math.round(calcTMBMifflin(demoStudent.weight, demoStudent.height, demoStudent.age, demoStudent.gender));
    const demoDietBase = createDietBaseFromStudent(demoStudent);
    demoStudent.mealBlocks = demoDietBase.mealBlocks;
    demoStudent.dietMeta = demoDietBase.dietMeta;

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
            mealBlocks: Array.isArray(current.mealBlocks) && current.mealBlocks.length > 0 ? current.mealBlocks : demoDietBase.mealBlocks,
            dietMeta: current.dietMeta && typeof current.dietMeta === 'object'
                ? current.dietMeta
                : demoDietBase.dietMeta,
            metricHistory: Array.isArray(current.metricHistory) && current.metricHistory.length > 0 ? current.metricHistory : [baselineMetric]
        };
    }

    saveStudentData(students);
}

function goToHome() {
    stopSupabaseRealtimeSync();
    memoryRemoveItem('currentStudentId');
    memoryRemoveItem('connectedTrainerCode');
    memoryRemoveItem('studentName');
    activateScreen('home-screen');
}

async function logout() {
    if (workoutState && !confirmExitActiveWorkout()) return;
    if (confirm('Deseja realmente sair?')) {
        stopSupabaseRealtimeSync();
        clearAuthRuntimeContext();
        workoutState = null;
        workoutFeedbackRating = 0;
        workoutFeedbackIntensity = 'moderado';
        clearWorkoutBackup();
        try {
            if (typeof window.supabase?.auth?.signOut === 'function') {
                await window.supabase.auth.signOut();
            }
        } catch (err) {
            console.warn('Falha ao encerrar sessao no Supabase.', err);
        }
        setStudentSyncState('synced', 'Sessão encerrada');
        goToGlobalLogin();
    }
}

async function goBackFromStudentConnect() {
    const activeUser = await getSupabaseSessionUser();
    const currentUserId = String(memoryGetItem('currentUserId') || '');
    const connectedCode = sanitizeCodeInput(memoryGetItem('connectedTrainerCode') || '', 5);
    if (activeUser?.id && currentUserId && String(activeUser.id) === currentUserId) {
        const opened = await openStudentDashboardForUser(activeUser.id, connectedCode);
        if (opened) return;
    }
    goToHome();
}

// -------------------------------
// Supabase Sync (multi-device)
// -------------------------------
const SYNC_KEYS = [
    'trainerStudents',
    'workoutHistory',
    'trainerNotifications',
    'allTrainers',
    'customExercises',
    'trainer_settings_v1'
];
const APP_STATE_SYNC_ENABLED = false;

let syncPushTimer = null;
let syncPullTimer = null;
let syncPullInFlight = false;
let isApplyingRemoteState = false;
let supabaseStudentsPollTimer = null;
let supabaseStudentsChannel = null;
let supabaseTrainerChannel = null;
let supabaseRealtimeTrainerCode = '';
let supabaseRealtimeRefreshTimer = null;

function isSupabaseReady() {
    return typeof window.supabase?.from === 'function';
}


const SUPABASE_TABLES = {
    trainers: 'app_trainers',
    students: 'app_students',
    foods: 'app_foods',
    foodPortions: 'app_food_portions',
    studentProfiles: 'student_profiles',
    dietLogs: 'diet_logs',
    workoutSessions: 'workout_sessions',
    workoutSets: 'workout_sets',
    studentConnections: 'student_connections'
};

let supabaseStudentsSyncTimer = null;
let supabaseFoodsChannel = null;
let supabaseFoodsSyncTimer = null;
let foodCatalogCache = [];
let supabaseEntityDietSyncTimers = new Map();
let studentSyncState = {
    status: 'synced',
    message: 'Sincronizado',
    updatedAt: ''
};
const entityTablesAvailability = {
    dietLogs: true,
    workout: true,
    connections: true,
    profiles: true
};
const DIET_SCHEMA_VERSION = 2;
const SUPABASE_TRAINER_CODES_CACHE_TTL_MS = 60000;
const supabaseTrainerCodesCache = {
    userId: '',
    expiresAt: 0,
    codes: new Set()
};

function normalizeDietMetaShape(meta) {
    const m = meta && typeof meta === 'object' ? meta : {};
    return {
        kcal: parseDecimalSafe(m.kcal) || '',
        protein: parseDecimalSafe(m.protein) || '',
        carb: parseDecimalSafe(m.carb) || '',
        fat: parseDecimalSafe(m.fat) || ''
    };
}

function normalizeDietMealItem(item = {}) {
    const name = sanitizeUserInput(item.nome || item.name || '', { maxLen: 140 }) || 'Alimento';
    const qtd = sanitizeUserInput(item.qtd || '100g', { maxLen: 40 }) || '100g';
    const kcal = parseDecimalSafe(item.kcal);
    const prot = parseDecimalSafe(item.prot || item.protein);
    const carb = parseDecimalSafe(item.carb);
    const gord = parseDecimalSafe(item.gord || item.fat);
    const parsedQty = parseAmountAndUnit(qtd, item.unitKey || item.unit_key || item.baseUnit || item.base_unit || 'g');
    const unitKey = normalizeFoodUnitKey(item.unitKey || item.unit_key || parsedQty.unit || 'g');
    const amount = Math.max(0.1, parseDecimalSafe(item.amount || item.portionAmount) || parsedQty.amount || 1);
    return {
        nome: name,
        qtd,
        kcal: Number.isFinite(kcal) ? kcal : Math.round((prot * 4) + (carb * 4) + (gord * 9)),
        prot: Number.isFinite(prot) ? prot : 0,
        carb: Number.isFinite(carb) ? carb : 0,
        gord: Number.isFinite(gord) ? gord : 0,
        foodId: String(item.foodId || item.food_id || ''),
        baseQty: Math.max(0.1, parseDecimalSafe(item.baseQty || item.base_qty) || parsedQty.amount || 100),
        baseUnit: normalizeFoodUnitKey(item.baseUnit || item.base_unit || parsedQty.unit || 'g'),
        source: sanitizeUserInput(item.source || 'manual', { maxLen: 40 }) || 'manual',
        amount,
        unitKey,
        portionId: String(item.portionId || item.portion_id || ''),
        portionLabel: sanitizeUserInput(item.portionLabel || item.portion_label || '', { maxLen: 80 }),
        portions: Array.isArray(item.portions) ? item.portions.map(normalizeFoodPortionRow).filter(Boolean) : []
    };
}

function normalizeDietMealBlocksShape(mealBlocks) {
    const blocks = Array.isArray(mealBlocks) ? mealBlocks : [];
    return blocks.map((meal, idx) => ({
        name: sanitizeUserInput(meal?.name || `Refeição ${idx + 1}`, { maxLen: 80 }) || `Refeição ${idx + 1}`,
        items: Array.isArray(meal?.items) ? meal.items.map(normalizeDietMealItem) : []
    }));
}

function normalizeDietLogsShape(dietLogs, mealBlocks) {
    const logs = dietLogs && typeof dietLogs === 'object' ? dietLogs : {};
    const normalized = {};
    Object.keys(logs).forEach((dateKey) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return;
        const entry = logs[dateKey] && typeof logs[dateKey] === 'object' ? logs[dateKey] : {};
        const meals = entry.meals && typeof entry.meals === 'object' ? entry.meals : {};
        const normalizedMeals = {};
        Object.keys(meals).forEach((mealIdxKey) => {
            const mealIdx = parseInt(mealIdxKey, 10);
            if (!Number.isFinite(mealIdx) || mealIdx < 0) return;
            const mealLog = meals[mealIdxKey] && typeof meals[mealIdxKey] === 'object' ? meals[mealIdxKey] : {};
            const items = mealLog.items && typeof mealLog.items === 'object' ? mealLog.items : {};
            const normalizedItems = {};
            Object.keys(items).forEach((itemIdxKey) => {
                const itemIdx = parseInt(itemIdxKey, 10);
                if (!Number.isFinite(itemIdx) || itemIdx < 0) return;
                const row = items[itemIdxKey] && typeof items[itemIdxKey] === 'object' ? items[itemIdxKey] : {};
                const sub = row.substitute && typeof row.substitute === 'object' ? row.substitute : {};
                normalizedItems[itemIdx] = {
                    checked: !!row.checked,
                    qty: sanitizeUserInput(row.qty || '', { maxLen: 40 }),
                    amount: Math.max(0.1, parseDecimalSafe(row.amount) || parseAmountAndUnit(row.qty || '', row.unitKey || row.unit_key || 'g').amount || 1),
                    unitKey: normalizeFoodUnitKey(row.unitKey || row.unit_key || parseAmountAndUnit(row.qty || '', 'g').unit || 'g'),
                    portionId: String(row.portionId || row.portion_id || ''),
                    portionLabel: sanitizeUserInput(row.portionLabel || row.portion_label || '', { maxLen: 80 }),
                    substitute: {
                        enabled: !!sub.enabled,
                        name: sanitizeUserInput(sub.name || '', { maxLen: 140 }),
                        qty: sanitizeUserInput(sub.qty || '', { maxLen: 40 }),
                        kcal: parseDecimalSafe(sub.kcal) || 0,
                        prot: parseDecimalSafe(sub.prot) || 0,
                        carb: parseDecimalSafe(sub.carb) || 0,
                        gord: parseDecimalSafe(sub.gord) || 0,
                        foodId: String(sub.foodId || sub.food_id || ''),
                        baseQty: Math.max(0.1, parseDecimalSafe(sub.baseQty || sub.base_qty) || 100),
                        baseUnit: normalizeFoodUnitKey(sub.baseUnit || sub.base_unit || 'g'),
                        source: sanitizeUserInput(sub.source || 'manual', { maxLen: 40 }) || 'manual',
                        amount: Math.max(0.1, parseDecimalSafe(sub.amount) || parseAmountAndUnit(sub.qty || '', sub.unitKey || sub.unit_key || 'g').amount || 1),
                        unitKey: normalizeFoodUnitKey(sub.unitKey || sub.unit_key || parseAmountAndUnit(sub.qty || '', 'g').unit || 'g'),
                        portionId: String(sub.portionId || sub.portion_id || ''),
                        portionLabel: sanitizeUserInput(sub.portionLabel || sub.portion_label || '', { maxLen: 80 })
                    }
                };
            });
            normalizedMeals[mealIdx] = { items: normalizedItems };
        });

        // ensure all current meal items have a log slot
        (Array.isArray(mealBlocks) ? mealBlocks : []).forEach((meal, mealIdx) => {
            if (!normalizedMeals[mealIdx]) normalizedMeals[mealIdx] = { items: {} };
            (Array.isArray(meal?.items) ? meal.items : []).forEach((_, itemIdx) => {
                if (!normalizedMeals[mealIdx].items[itemIdx]) {
                    normalizedMeals[mealIdx].items[itemIdx] = {
                        checked: false,
                        qty: '',
                        amount: 1,
                        unitKey: 'g',
                        portionId: '',
                        portionLabel: '',
                        substitute: {
                            enabled: false,
                            name: '',
                            qty: '',
                            kcal: 0,
                            prot: 0,
                            carb: 0,
                            gord: 0,
                            foodId: '',
                            baseQty: 100,
                            baseUnit: 'g',
                            source: 'manual',
                            amount: 1,
                            unitKey: 'g',
                            portionId: '',
                            portionLabel: ''
                        }
                    };
                }
            });
        });
        normalized[dateKey] = { meals: normalizedMeals };
    });
    return normalized;
}

function normalizeStudentDietSchema(studentLike = {}) {
    const student = studentLike && typeof studentLike === 'object' ? studentLike : {};
    const mealBlocks = normalizeDietMealBlocksShape(student.mealBlocks);
    const dietMeta = normalizeDietMetaShape(student.dietMeta);
    const dietLogs = normalizeDietLogsShape(student.dietLogs, mealBlocks);
    return {
        ...student,
        mealBlocks,
        dietMeta,
        dietLogs,
        dietSchemaVersion: DIET_SCHEMA_VERSION
    };
}

function normalizeStudentsDietSchema(students = []) {
    return (Array.isArray(students) ? students : []).map((student) => normalizeStudentDietSchema(student));
}

function needsDietSchemaMigration(student) {
    if (!student || typeof student !== 'object') return true;
    const version = parseInt(student.dietSchemaVersion || 0, 10) || 0;
    if (version < DIET_SCHEMA_VERSION) return true;
    if (!Array.isArray(student.mealBlocks)) return true;
    if (!student.dietMeta || typeof student.dietMeta !== 'object') return true;
    if (!student.dietLogs || typeof student.dietLogs !== 'object') return true;
    return false;
}

function migrateStoredStudentsDietSchema({ syncRemote = true } = {}) {
    const localStudents = readStorageJSON('trainerStudents', []);
    if (!Array.isArray(localStudents) || localStudents.length === 0) return false;
    const shouldMigrate = localStudents.some(needsDietSchemaMigration);
    if (!shouldMigrate) return false;
    const normalized = normalizeStudentsDietSchema(localStudents);
    memorySetItem('trainerStudents', JSON.stringify(normalized));
    if (syncRemote && isSupabaseReady()) queueSupabaseStudentsSync(normalized);
    return true;
}

function normalizeStudentRow(row) {
    if (!row) return null;
    const student = row.data && typeof row.data === 'object' ? row.data : {};
    student.id = student.id || row.id || '';
    student.trainerCode = student.trainerCode || row.trainer_code || '';
    return normalizeStudentDietSchema(student);
}

function normalizeFoodCatalogRow(row) {
    if (!row) return null;
    const name = sanitizeUserInput(row.name || row.nome || '', { maxLen: 140 });
    if (!name) return null;
    const baseUnit = normalizeFoodUnitKey(row.base_unit || row.baseUnit || 'g');
    const portionsInput = Array.isArray(row.portions) ? row.portions : [];
    const normalizedPortions = portionsInput.map(normalizeFoodPortionRow).filter(Boolean);
    return {
        id: String(row.id || ''),
        name,
        brand: sanitizeUserInput(row.brand || '', { maxLen: 80 }),
        base_qty: Math.max(0.1, parseDecimalSafe(row.base_qty) || 100),
        base_unit: baseUnit,
        kcal: Math.max(0, parseDecimalSafe(row.kcal)),
        protein: Math.max(0, parseDecimalSafe(row.protein || row.prot)),
        carb: Math.max(0, parseDecimalSafe(row.carb)),
        fat: Math.max(0, parseDecimalSafe(row.fat || row.gord)),
        source: sanitizeUserInput(row.source || 'manual', { maxLen: 40 }) || 'manual',
        created_by: sanitizeUserInput(row.created_by || '', { maxLen: 80 }),
        portions: normalizedPortions
    };
}

function getCurrentFoodCreatorId() {
    return memoryGetItem('currentUserId')
        || memoryGetItem('currentStudentId')
        || memoryGetItem('currentTrainerCode')
        || 'anon';
}

const FOOD_UNIT_KEYS = ['g', 'ml', 'un', 'slice', 'tbsp', 'tsp', 'cup', 'glass', 'ladle'];
const FOOD_UNIT_LABELS = {
    g: { single: 'grama', plural: 'gramas', short: 'g' },
    ml: { single: 'mililitro', plural: 'mililitros', short: 'ml' },
    un: { single: 'unidade', plural: 'unidades', short: 'un' },
    slice: { single: 'fatia', plural: 'fatias', short: 'fatia' },
    tbsp: { single: 'colher de sopa', plural: 'colheres de sopa', short: 'cs' },
    tsp: { single: 'colher de chá', plural: 'colheres de chá', short: 'ccha' },
    cup: { single: 'xícara', plural: 'xícaras', short: 'xic' },
    glass: { single: 'copo', plural: 'copos', short: 'copo' },
    ladle: { single: 'concha', plural: 'conchas', short: 'concha' }
};
const FOOD_UNIT_ALIASES = {
    g: ['g', 'gr', 'grama', 'gramas'],
    ml: ['ml', 'mililitro', 'mililitros'],
    un: ['un', 'und', 'unid', 'unidade', 'unidades'],
    slice: ['fatia', 'fatias', 'slice', 'slices'],
    tbsp: ['colher de sopa', 'colher sopa', 'colheres de sopa', 'tbsp', 'cs'],
    tsp: ['colher de cha', 'colher de chá', 'colher cha', 'colheres de cha', 'colheres de chá', 'tsp', 'ccha'],
    cup: ['xicara', 'xícara', 'xicaras', 'xícaras', 'cup'],
    glass: ['copo', 'copos', 'glass'],
    ladle: ['concha', 'conchas', 'ladle']
};

function normalizeFoodUnitKey(rawValue) {
    const raw = normalizeText(String(rawValue || '').trim());
    if (!raw) return 'g';
    if (FOOD_UNIT_KEYS.includes(raw)) return raw;
    const found = FOOD_UNIT_KEYS.find((key) => (FOOD_UNIT_ALIASES[key] || []).some((alias) => normalizeText(alias) === raw));
    return found || 'g';
}

function getFoodUnitLabel(unitKey, amount = 1) {
    const safeUnit = normalizeFoodUnitKey(unitKey);
    const dictionary = FOOD_UNIT_LABELS[safeUnit] || FOOD_UNIT_LABELS.g;
    return Number(amount || 0) === 1 ? dictionary.single : dictionary.plural;
}

function getFoodUnitShort(unitKey) {
    const safeUnit = normalizeFoodUnitKey(unitKey);
    return (FOOD_UNIT_LABELS[safeUnit] || FOOD_UNIT_LABELS.g).short;
}

function formatFoodQuantity(amountValue, unitKey, { compact = false } = {}) {
    const safeUnit = normalizeFoodUnitKey(unitKey);
    const numericAmount = Math.max(0.1, parseDecimalSafe(amountValue) || 0);
    const roundedAmount = Number.isInteger(numericAmount) ? numericAmount : Math.round(numericAmount * 10) / 10;
    if (safeUnit === 'g' || safeUnit === 'ml') {
        return `${roundedAmount}${safeUnit}`;
    }
    if (compact) {
        return `${roundedAmount}${getFoodUnitShort(safeUnit)}`;
    }
    return `${roundedAmount} ${getFoodUnitLabel(safeUnit, roundedAmount)}`;
}

function normalizeFoodPortionRow(row) {
    if (!row) return null;
    const unitKey = normalizeFoodUnitKey(row.unit_key || row.unitKey || 'g');
    const amount = Math.max(0.1, parseDecimalSafe(row.amount) || 1);
    const baseEquivalent = Math.max(0.1, parseDecimalSafe(row.base_qty_equivalent || row.baseQtyEquivalent) || amount);
    const label = sanitizeUserInput(row.label || `${getFoodUnitLabel(unitKey, amount)}`, { maxLen: 90 }) || `${getFoodUnitLabel(unitKey, amount)}`;
    return {
        id: String(row.id || ''),
        food_id: String(row.food_id || row.foodId || ''),
        label,
        amount,
        unit_key: unitKey,
        base_qty_equivalent: baseEquivalent,
        is_default: !!row.is_default,
        sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0
    };
}

function addFallbackPortion(portions, foodId, portion) {
    if (!Array.isArray(portions) || !portion) return;
    const normalized = normalizeFoodPortionRow({
        ...portion,
        id: '',
        food_id: String(foodId || portion.food_id || '')
    });
    if (!normalized) return;
    const key = `${normalizeFoodUnitKey(normalized.unit_key)}:${normalizeText(normalized.label)}`;
    const exists = portions.some((item) => `${normalizeFoodUnitKey(item.unit_key)}:${normalizeText(item.label)}` === key);
    if (!exists) portions.push(normalized);
}

function inferUnitEquivalentByFoodName(foodName, baseQty) {
    const safeBase = Math.max(1, parseDecimalSafe(baseQty) || 100);
    const rules = [
        { term: 'ovo', equivalent: 50 },
        { term: 'banana', equivalent: 90 },
        { term: 'maca', equivalent: 130 },
        { term: 'pera', equivalent: 140 },
        { term: 'laranja', equivalent: 130 },
        { term: 'tangerina', equivalent: 120 },
        { term: 'kiwi', equivalent: 75 },
        { term: 'abacate', equivalent: 150 },
        { term: 'manga', equivalent: 150 }
    ];
    const match = rules.find((rule) => foodName.includes(rule.term));
    return Math.max(1, parseDecimalSafe(match?.equivalent) || safeBase);
}

function getFallbackFoodPortions(foodLike = {}) {
    const food = normalizeFoodCatalogRow(foodLike) || {};
    const defaultPortions = [];
    const baseUnit = normalizeFoodUnitKey(food.base_unit || 'g');
    const baseQty = Math.max(0.1, parseDecimalSafe(food.base_qty) || 100);
    const foodId = String(food.id || '');
    const foodName = normalizeText(food.name || '');
    if (baseUnit === 'ml') {
        addFallbackPortion(defaultPortions, foodId, { label: 'mililitro (ml)', amount: 1, unit_key: 'ml', base_qty_equivalent: 1, is_default: true, sort_order: 0 });
        addFallbackPortion(defaultPortions, foodId, { label: 'colher de chá', amount: 1, unit_key: 'tsp', base_qty_equivalent: 5, is_default: false, sort_order: 10 });
        addFallbackPortion(defaultPortions, foodId, { label: 'colher de sopa', amount: 1, unit_key: 'tbsp', base_qty_equivalent: 15, is_default: false, sort_order: 20 });
        addFallbackPortion(defaultPortions, foodId, { label: 'xícara', amount: 1, unit_key: 'cup', base_qty_equivalent: 240, is_default: false, sort_order: 30 });
        addFallbackPortion(defaultPortions, foodId, { label: 'copo', amount: 1, unit_key: 'glass', base_qty_equivalent: 200, is_default: false, sort_order: 40 });
        addFallbackPortion(defaultPortions, foodId, { label: 'concha', amount: 1, unit_key: 'ladle', base_qty_equivalent: 100, is_default: false, sort_order: 50 });
    } else if (baseUnit === 'un') {
        addFallbackPortion(defaultPortions, foodId, { label: 'unidade', amount: 1, unit_key: 'un', base_qty_equivalent: 1, is_default: true, sort_order: 0 });
    } else {
        addFallbackPortion(defaultPortions, foodId, { label: 'grama (g)', amount: 1, unit_key: 'g', base_qty_equivalent: 1, is_default: true, sort_order: 0 });
    }

    if (foodName.includes('pao')) {
        addFallbackPortion(defaultPortions, foodId, {
            label: 'fatia',
            amount: 1,
            unit_key: 'slice',
            base_qty_equivalent: 25,
            is_default: false,
            sort_order: 15
        });
    }

    const portableTerms = ['ovo', 'banana', 'maca', 'pera', 'laranja', 'tangerina', 'kiwi', 'manga', 'abacate', 'goiaba'];
    if (baseUnit === 'g' && portableTerms.some((term) => foodName.includes(term))) {
        addFallbackPortion(defaultPortions, foodId, {
            label: 'unidade',
            amount: 1,
            unit_key: 'un',
            base_qty_equivalent: inferUnitEquivalentByFoodName(foodName, baseQty),
            is_default: false,
            sort_order: 12
        });
    }

    const spoonFriendlyTerms = ['arroz', 'feijao', 'lentilha', 'grao de bico', 'ervilha', 'macarrao', 'quinoa', 'cuscuz', 'aveia', 'granola', 'farofa'];
    if (baseUnit === 'g' && spoonFriendlyTerms.some((term) => foodName.includes(term))) {
        addFallbackPortion(defaultPortions, foodId, { label: 'colher de chá', amount: 1, unit_key: 'tsp', base_qty_equivalent: 5, is_default: false, sort_order: 18 });
        addFallbackPortion(defaultPortions, foodId, { label: 'colher de sopa', amount: 1, unit_key: 'tbsp', base_qty_equivalent: 15, is_default: false, sort_order: 20 });
        addFallbackPortion(defaultPortions, foodId, { label: 'xícara', amount: 1, unit_key: 'cup', base_qty_equivalent: 160, is_default: false, sort_order: 25 });
        addFallbackPortion(defaultPortions, foodId, { label: 'concha', amount: 1, unit_key: 'ladle', base_qty_equivalent: 100, is_default: false, sort_order: 30 });
    }

    return defaultPortions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function getFoodPortions(foodLike = {}) {
    const normalizedFood = normalizeFoodCatalogRow(foodLike);
    if (!normalizedFood) return [];
    const provided = Array.isArray(normalizedFood.portions)
        ? normalizedFood.portions.map(normalizeFoodPortionRow).filter(Boolean)
        : [];
    const list = provided.length ? provided : getFallbackFoodPortions(normalizedFood);
    return list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function parseAmountAndUnit(rawValue, fallbackUnit = 'g') {
    const text = String(rawValue || '').trim();
    const normalizedTextValue = normalizeText(text);
    const numericMatches = text.replace(',', '.').match(/-?\d+(\.\d+)?/);
    const amount = Math.max(0, parseDecimalSafe(numericMatches?.[0] || '0'));
    const normalizedFallback = normalizeFoodUnitKey(fallbackUnit || 'g');

    let unitKey = normalizedFallback;
    if (normalizedTextValue) {
        for (const key of FOOD_UNIT_KEYS) {
            const aliases = FOOD_UNIT_ALIASES[key] || [];
            if (aliases.some((alias) => normalizedTextValue.includes(normalizeText(alias)))) {
                unitKey = key;
                break;
            }
        }
    }
    return {
        amount: amount > 0 ? amount : 0,
        unit: unitKey,
        unitKey
    };
}

function resolveFoodQuantity(foodLike, amountValue, unitKeyValue, portionId = '') {
    const food = normalizeFoodCatalogRow(foodLike);
    if (!food) {
        return {
            factor: 1,
            amount: Math.max(0.1, parseDecimalSafe(amountValue) || 100),
            unitKey: normalizeFoodUnitKey(unitKeyValue || 'g'),
            portion: null,
            qtyText: formatFoodQuantity(Math.max(0.1, parseDecimalSafe(amountValue) || 100), unitKeyValue || 'g')
        };
    }
    const baseQty = Math.max(0.1, parseDecimalSafe(food.base_qty) || 100);
    const amount = Math.max(0.1, parseDecimalSafe(amountValue) || baseQty);
    const unitKey = normalizeFoodUnitKey(unitKeyValue || food.base_unit || 'g');
    const portions = getFoodPortions(food);
    let selectedPortion = null;
    if (portionId) {
        selectedPortion = portions.find((portion) => String(portion.id || '') === String(portionId));
    }
    if (!selectedPortion) {
        selectedPortion = portions.find((portion) => normalizeFoodUnitKey(portion.unit_key) === unitKey && !!portion.is_default)
            || portions.find((portion) => normalizeFoodUnitKey(portion.unit_key) === unitKey)
            || null;
    }

    let baseEquivalent = amount;
    if (selectedPortion) {
        const perAmount = Math.max(0.0001, parseDecimalSafe(selectedPortion.base_qty_equivalent) || 1) / Math.max(0.0001, parseDecimalSafe(selectedPortion.amount) || 1);
        baseEquivalent = amount * perAmount;
    } else if (unitKey === normalizeFoodUnitKey(food.base_unit || 'g')) {
        baseEquivalent = amount;
    }
    const factor = Math.max(0.01, baseEquivalent / baseQty);
    return {
        factor,
        amount,
        unitKey,
        portion: selectedPortion,
        baseEquivalent,
        qtyText: formatFoodQuantity(amount, unitKey)
    };
}

function computeMacrosByAmount(food, amount, unit, portionId = '') {
    const normalized = normalizeFoodCatalogRow(food);
    if (!normalized) {
        return { kcal: 0, protein: 0, carb: 0, fat: 0, base_qty: 100, base_unit: 'g', amount: 0, unit_key: 'g', portion_id: '', portion_label: '' };
    }
    const resolved = resolveFoodQuantity(normalized, amount, unit, portionId);
    const factor = resolved.factor;
    return {
        kcal: Math.round((normalized.kcal || 0) * factor),
        protein: Math.round((normalized.protein || 0) * factor * 10) / 10,
        carb: Math.round((normalized.carb || 0) * factor * 10) / 10,
        fat: Math.round((normalized.fat || 0) * factor * 10) / 10,
        base_qty: Math.max(0.1, normalized.base_qty || 100),
        base_unit: normalized.base_unit,
        amount: resolved.amount,
        unit_key: resolved.unitKey,
        portion_id: String(resolved.portion?.id || ''),
        portion_label: resolved.portion?.label || getFoodUnitLabel(resolved.unitKey, resolved.amount)
    };
}

async function fetchFoodPortionsByFoodIds(foodIds = []) {
    const safeIds = Array.from(new Set((Array.isArray(foodIds) ? foodIds : []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!safeIds.length || !isSupabaseReady()) return new Map();
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.foodPortions)
        .select('*')
        .in('food_id', safeIds);
    if (error) {
        console.warn('Supabase food portions fetch failed', error.message);
        return new Map();
    }
    const grouped = new Map();
    (data || []).forEach((row) => {
        const normalized = normalizeFoodPortionRow(row);
        if (!normalized) return;
        const foodId = String(normalized.food_id || '').trim();
        if (!foodId) return;
        if (!grouped.has(foodId)) grouped.set(foodId, []);
        grouped.get(foodId).push(normalized);
    });
    return grouped;
}

const BASELINE_FOOD_LIBRARY_SEED = [
    { name: 'Arroz branco cozido', base_qty: 100, base_unit: 'g', kcal: 130, protein: 2.7, carb: 28.0, fat: 0.3, source: 'baseline' },
    { name: 'Arroz integral cozido', base_qty: 100, base_unit: 'g', kcal: 124, protein: 2.6, carb: 25.8, fat: 1.0, source: 'baseline' },
    { name: 'Feijao carioca cozido', base_qty: 100, base_unit: 'g', kcal: 76, protein: 4.8, carb: 13.6, fat: 0.5, source: 'baseline' },
    { name: 'Feijao preto cozido', base_qty: 100, base_unit: 'g', kcal: 77, protein: 4.5, carb: 14.0, fat: 0.5, source: 'baseline' },
    { name: 'Lentilha cozida', base_qty: 100, base_unit: 'g', kcal: 93, protein: 6.3, carb: 16.3, fat: 0.4, source: 'baseline' },
    { name: 'Grao de bico cozido', base_qty: 100, base_unit: 'g', kcal: 164, protein: 8.9, carb: 27.4, fat: 2.6, source: 'baseline' },
    { name: 'Macarrao cozido', base_qty: 100, base_unit: 'g', kcal: 157, protein: 5.8, carb: 30.9, fat: 0.9, source: 'baseline' },
    { name: 'Batata inglesa cozida', base_qty: 100, base_unit: 'g', kcal: 52, protein: 1.2, carb: 11.9, fat: 0.1, source: 'baseline' },
    { name: 'Batata doce cozida', base_qty: 100, base_unit: 'g', kcal: 77, protein: 0.6, carb: 18.4, fat: 0.1, source: 'baseline' },
    { name: 'Mandioca cozida', base_qty: 100, base_unit: 'g', kcal: 125, protein: 0.6, carb: 30.1, fat: 0.3, source: 'baseline' },
    { name: 'Inhame cozido', base_qty: 100, base_unit: 'g', kcal: 96, protein: 2.1, carb: 23.0, fat: 0.2, source: 'baseline' },
    { name: 'Aveia em flocos', base_qty: 100, base_unit: 'g', kcal: 394, protein: 13.9, carb: 66.6, fat: 8.5, source: 'baseline' },
    { name: 'Tapioca (goma)', base_qty: 100, base_unit: 'g', kcal: 331, protein: 0.6, carb: 82.0, fat: 0.2, source: 'baseline' },
    { name: 'Pao frances', base_qty: 100, base_unit: 'g', kcal: 300, protein: 8.0, carb: 58.6, fat: 3.1, source: 'baseline' },
    { name: 'Pao integral', base_qty: 100, base_unit: 'g', kcal: 253, protein: 9.4, carb: 43.0, fat: 3.4, source: 'baseline' },
    { name: 'Torrada integral', base_qty: 100, base_unit: 'g', kcal: 418, protein: 12.0, carb: 72.0, fat: 8.0, source: 'baseline' },
    { name: 'Cuscuz nordestino cozido', base_qty: 100, base_unit: 'g', kcal: 112, protein: 2.2, carb: 25.3, fat: 0.7, source: 'baseline' },
    { name: 'Milho verde cozido', base_qty: 100, base_unit: 'g', kcal: 98, protein: 3.2, carb: 17.1, fat: 2.0, source: 'baseline' },
    { name: 'Banana prata', base_qty: 100, base_unit: 'g', kcal: 98, protein: 1.3, carb: 26.0, fat: 0.1, source: 'baseline' },
    { name: 'Banana nanica', base_qty: 100, base_unit: 'g', kcal: 92, protein: 1.4, carb: 23.8, fat: 0.1, source: 'baseline' },
    { name: 'Maca', base_qty: 100, base_unit: 'g', kcal: 56, protein: 0.3, carb: 15.2, fat: 0.2, source: 'baseline' },
    { name: 'Pera', base_qty: 100, base_unit: 'g', kcal: 53, protein: 0.3, carb: 14.0, fat: 0.1, source: 'baseline' },
    { name: 'Laranja', base_qty: 100, base_unit: 'g', kcal: 47, protein: 0.9, carb: 11.8, fat: 0.1, source: 'baseline' },
    { name: 'Mamao', base_qty: 100, base_unit: 'g', kcal: 45, protein: 0.8, carb: 11.6, fat: 0.1, source: 'baseline' },
    { name: 'Abacaxi', base_qty: 100, base_unit: 'g', kcal: 50, protein: 0.5, carb: 13.0, fat: 0.1, source: 'baseline' },
    { name: 'Melancia', base_qty: 100, base_unit: 'g', kcal: 30, protein: 0.6, carb: 7.6, fat: 0.2, source: 'baseline' },
    { name: 'Uva', base_qty: 100, base_unit: 'g', kcal: 53, protein: 0.6, carb: 13.6, fat: 0.2, source: 'baseline' },
    { name: 'Morango', base_qty: 100, base_unit: 'g', kcal: 30, protein: 0.9, carb: 6.8, fat: 0.3, source: 'baseline' },
    { name: 'Abacate', base_qty: 100, base_unit: 'g', kcal: 96, protein: 1.2, carb: 6.0, fat: 8.4, source: 'baseline' },
    { name: 'Manga', base_qty: 100, base_unit: 'g', kcal: 60, protein: 0.8, carb: 15.0, fat: 0.4, source: 'baseline' },
    { name: 'Iogurte natural desnatado', base_qty: 100, base_unit: 'g', kcal: 42, protein: 3.8, carb: 5.2, fat: 0.1, source: 'baseline' },
    { name: 'Leite desnatado', base_qty: 100, base_unit: 'ml', kcal: 34, protein: 3.4, carb: 4.9, fat: 0.1, source: 'baseline' },
    { name: 'Leite integral', base_qty: 100, base_unit: 'ml', kcal: 61, protein: 3.2, carb: 4.7, fat: 3.3, source: 'baseline' },
    { name: 'Whey protein concentrado', base_qty: 30, base_unit: 'g', kcal: 120, protein: 23.0, carb: 3.0, fat: 2.0, source: 'baseline' },
    { name: 'Ovo cozido', base_qty: 100, base_unit: 'g', kcal: 155, protein: 13.0, carb: 1.1, fat: 11.0, source: 'baseline' },
    { name: 'Ovo mexido', base_qty: 100, base_unit: 'g', kcal: 167, protein: 11.0, carb: 1.6, fat: 12.3, source: 'baseline' },
    { name: 'Peito de frango grelhado', base_qty: 100, base_unit: 'g', kcal: 165, protein: 31.0, carb: 0.0, fat: 3.6, source: 'baseline' },
    { name: 'Coxa de frango assada sem pele', base_qty: 100, base_unit: 'g', kcal: 175, protein: 25.0, carb: 0.0, fat: 7.5, source: 'baseline' },
    { name: 'Patinho grelhado', base_qty: 100, base_unit: 'g', kcal: 219, protein: 35.0, carb: 0.0, fat: 8.0, source: 'baseline' },
    { name: 'Carne moida magra cozida', base_qty: 100, base_unit: 'g', kcal: 212, protein: 26.0, carb: 0.0, fat: 11.0, source: 'baseline' },
    { name: 'Tilapia grelhada', base_qty: 100, base_unit: 'g', kcal: 129, protein: 26.0, carb: 0.0, fat: 2.7, source: 'baseline' },
    { name: 'Sardinha em lata', base_qty: 100, base_unit: 'g', kcal: 208, protein: 24.0, carb: 0.0, fat: 11.0, source: 'baseline' },
    { name: 'Atum em agua', base_qty: 100, base_unit: 'g', kcal: 116, protein: 25.0, carb: 0.0, fat: 1.0, source: 'baseline' },
    { name: 'Salmao grelhado', base_qty: 100, base_unit: 'g', kcal: 206, protein: 22.0, carb: 0.0, fat: 12.0, source: 'baseline' },
    { name: 'Queijo minas frescal', base_qty: 100, base_unit: 'g', kcal: 264, protein: 17.0, carb: 3.2, fat: 20.0, source: 'baseline' },
    { name: 'Queijo muçarela', base_qty: 100, base_unit: 'g', kcal: 300, protein: 22.6, carb: 3.0, fat: 22.0, source: 'baseline' },
    { name: 'Ricota', base_qty: 100, base_unit: 'g', kcal: 140, protein: 11.0, carb: 3.0, fat: 8.0, source: 'baseline' },
    { name: 'Cottage', base_qty: 100, base_unit: 'g', kcal: 98, protein: 11.0, carb: 3.4, fat: 4.3, source: 'baseline' },
    { name: 'Peito de peru', base_qty: 100, base_unit: 'g', kcal: 95, protein: 16.0, carb: 2.0, fat: 2.0, source: 'baseline' },
    { name: 'Tofu firme', base_qty: 100, base_unit: 'g', kcal: 76, protein: 8.0, carb: 1.9, fat: 4.8, source: 'baseline' },
    { name: 'Azeite de oliva', base_qty: 100, base_unit: 'ml', kcal: 884, protein: 0.0, carb: 0.0, fat: 100.0, source: 'baseline' },
    { name: 'Pasta de amendoim integral', base_qty: 100, base_unit: 'g', kcal: 588, protein: 25.0, carb: 20.0, fat: 50.0, source: 'baseline' },
    { name: 'Castanha do para', base_qty: 100, base_unit: 'g', kcal: 656, protein: 14.0, carb: 12.0, fat: 66.0, source: 'baseline' },
    { name: 'Amendoas', base_qty: 100, base_unit: 'g', kcal: 579, protein: 21.0, carb: 22.0, fat: 50.0, source: 'baseline' },
    { name: 'Nozes', base_qty: 100, base_unit: 'g', kcal: 654, protein: 15.0, carb: 14.0, fat: 65.0, source: 'baseline' },
    { name: 'Chia', base_qty: 100, base_unit: 'g', kcal: 486, protein: 17.0, carb: 42.0, fat: 31.0, source: 'baseline' },
    { name: 'Linhaca', base_qty: 100, base_unit: 'g', kcal: 534, protein: 18.0, carb: 29.0, fat: 42.0, source: 'baseline' },
    { name: 'Brocolis cozido', base_qty: 100, base_unit: 'g', kcal: 35, protein: 2.4, carb: 7.2, fat: 0.4, source: 'baseline' },
    { name: 'Cenoura cozida', base_qty: 100, base_unit: 'g', kcal: 30, protein: 0.8, carb: 6.7, fat: 0.2, source: 'baseline' },
    { name: 'Abobrinha cozida', base_qty: 100, base_unit: 'g', kcal: 19, protein: 1.1, carb: 3.2, fat: 0.1, source: 'baseline' },
    { name: 'Alface', base_qty: 100, base_unit: 'g', kcal: 15, protein: 1.4, carb: 2.9, fat: 0.2, source: 'baseline' },
    { name: 'Tomate', base_qty: 100, base_unit: 'g', kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2, source: 'baseline' },
    { name: 'Pepino', base_qty: 100, base_unit: 'g', kcal: 15, protein: 0.7, carb: 3.6, fat: 0.1, source: 'baseline' },
    { name: 'Couve refogada', base_qty: 100, base_unit: 'g', kcal: 90, protein: 2.9, carb: 6.0, fat: 6.0, source: 'baseline' },
    { name: 'Beterraba cozida', base_qty: 100, base_unit: 'g', kcal: 32, protein: 1.3, carb: 7.2, fat: 0.1, source: 'baseline' }
];

let baselineFoodCatalogCache = null;

function getFoodCatalogMergeKey(item = {}) {
    const name = normalizeText(item.name || item.nome || '');
    const brand = normalizeText(item.brand || '');
    const unit = normalizeFoodUnitKey(item.base_unit || item.baseUnit || 'g');
    return `${name}|${brand}|${unit}`;
}

function mergeFoodCatalogSources(primary = [], secondary = [], limit = 0) {
    const output = [];
    const seen = new Set();
    const maxItems = Number(limit) > 0 ? Math.max(1, parseInt(limit, 10)) : Infinity;
    const merged = [
        ...(Array.isArray(primary) ? primary : []),
        ...(Array.isArray(secondary) ? secondary : [])
    ];
    for (const rawItem of merged) {
        if (output.length >= maxItems) break;
        const normalized = normalizeFoodCatalogRow(rawItem);
        if (!normalized) continue;
        const key = getFoodCatalogMergeKey(normalized);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        output.push({
            ...normalized,
            portions: getFoodPortions(normalized)
        });
    }
    return output;
}

function getBaselineFoodCatalog(limit = 0) {
    if (!Array.isArray(baselineFoodCatalogCache) || !baselineFoodCatalogCache.length) {
        baselineFoodCatalogCache = BASELINE_FOOD_LIBRARY_SEED
            .map((item, idx) => normalizeFoodCatalogRow({
                ...item,
                id: `baseline-${idx + 1}`
            }))
            .filter(Boolean);
    }
    return mergeFoodCatalogSources(baselineFoodCatalogCache, [], limit);
}

function getEffectiveFoodCatalog(limit = 0) {
    return mergeFoodCatalogSources(foodCatalogCache || [], getBaselineFoodCatalog(), limit);
}

async function hydrateFoodRowsWithPortions(foodRows = []) {
    const baseRows = (Array.isArray(foodRows) ? foodRows : []).map(normalizeFoodCatalogRow).filter(Boolean);
    if (!baseRows.length) return [];
    const ids = baseRows.map((row) => String(row.id || '')).filter(Boolean);
    if (!ids.length || !isSupabaseReady()) {
        return baseRows.map((row) => ({ ...row, portions: getFoodPortions(row) }));
    }
    const portionsByFood = await fetchFoodPortionsByFoodIds(ids);
    return baseRows.map((row) => ({
        ...row,
        portions: getFoodPortions({
            ...row,
            portions: portionsByFood.get(String(row.id || '')) || row.portions || []
        })
    }));
}

async function searchFoodsCatalog(query, limit = 12) {
    const q = sanitizeUserInput(query || '', { maxLen: 90 });
    if (!q || q.length < 2) return [];
    const safeLimit = Math.max(1, Math.min(60, parseInt(limit, 10) || 12));
    const localMatches = getEffectiveFoodCatalog()
        .filter((item) => normalizeText(item.name).includes(normalizeText(q)))
        .slice(0, safeLimit);
    if (!isSupabaseReady()) {
        return localMatches;
    }
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.foods)
        .select('*')
        .ilike('name', `%${q}%`)
        .order('name', { ascending: true })
        .limit(safeLimit);
    if (error) {
        console.warn('Supabase foods search failed', error.message);
        return localMatches;
    }
    const remoteMatches = await hydrateFoodRowsWithPortions(data || []);
    return mergeFoodCatalogSources(remoteMatches, localMatches, safeLimit);
}

async function fetchFoodsCatalogDefault(limit = 24) {
    const safeLimit = Math.max(1, Math.min(60, parseInt(limit, 10) || 24));
    const localDefault = getEffectiveFoodCatalog(safeLimit);
    if (!isSupabaseReady()) {
        return localDefault;
    }
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.foods)
        .select('*')
        .order('name', { ascending: true })
        .limit(safeLimit);
    if (error) {
        console.warn('Supabase foods default fetch failed', error.message);
        return localDefault;
    }
    const remoteDefault = await hydrateFoodRowsWithPortions(data || []);
    return mergeFoodCatalogSources(remoteDefault, localDefault, safeLimit);
}

async function insertFoodIntoCatalog(foodPayload = {}) {
    const normalized = normalizeFoodCatalogRow(foodPayload);
    if (!normalized || !normalized.name) return null;

    const normalizedName = normalizeText(normalized.name);
    const normalizedBrand = normalizeText(normalized.brand || '');
    const localMatch = (foodCatalogCache || []).find((item) =>
        normalizeText(item.name) === normalizedName
        && normalizeText(item.brand || '') === normalizedBrand
        && String(item.base_unit || 'g') === String(normalized.base_unit || 'g')
    );
    if (localMatch) return localMatch;

    if (!isSupabaseReady()) {
        const fake = {
            ...normalized,
            id: `local-${Date.now()}`,
            portions: getFoodPortions(normalized)
        };
        foodCatalogCache = [fake, ...foodCatalogCache.filter((x) =>
            !(normalizeText(x.name) === normalizedName && normalizeText(x.brand || '') === normalizedBrand)
        )];
        return fake;
    }

    const { data: existingRows, error: existingError } = await window.supabase
        .from(SUPABASE_TABLES.foods)
        .select('*')
        .ilike('name', normalized.name)
        .limit(20);
    if (!existingError && Array.isArray(existingRows)) {
        const existing = existingRows
            .map(normalizeFoodCatalogRow)
            .find((item) =>
                item
                && normalizeText(item.name) === normalizedName
                && normalizeText(item.brand || '') === normalizedBrand
                && String(item.base_unit || 'g') === String(normalized.base_unit || 'g')
            );
        if (existing) {
            const [hydratedExisting] = await hydrateFoodRowsWithPortions([existing]);
            const safeExisting = hydratedExisting || { ...existing, portions: getFoodPortions(existing) };
            foodCatalogCache = [safeExisting, ...foodCatalogCache.filter((x) => String(x.id) !== String(safeExisting.id))];
            return safeExisting;
        }
    }

    const row = {
        name: normalized.name,
        brand: normalized.brand || null,
        base_qty: normalized.base_qty,
        base_unit: normalized.base_unit,
        kcal: normalized.kcal,
        protein: normalized.protein,
        carb: normalized.carb,
        fat: normalized.fat,
        source: normalized.source || 'manual',
        created_by: normalized.created_by || getCurrentFoodCreatorId(),
        updated_at: new Date().toISOString()
    };
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.foods)
        .insert(row)
        .select('*')
        .single();
    if (error) {
        console.warn('Supabase food insert failed', error.message);
        const fallback = { ...normalized, id: `local-${Date.now()}`, portions: getFoodPortions(normalized) };
        foodCatalogCache = [fallback, ...foodCatalogCache.filter((x) =>
            !(normalizeText(x.name) === normalizedName && normalizeText(x.brand || '') === normalizedBrand)
        )];
        return fallback;
    }
    const [inserted] = await hydrateFoodRowsWithPortions([data]);
    if (inserted) {
        foodCatalogCache = [inserted, ...foodCatalogCache.filter((x) => String(x.id) !== String(inserted.id))];
    }
    return inserted;
}

async function syncFoodsCatalogFromSupabase() {
    if (!isSupabaseReady()) return;
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.foods)
        .select('*')
        .order('name', { ascending: true })
        .limit(400);
    if (error) {
        console.warn('Supabase foods sync failed', error.message);
        return;
    }
    foodCatalogCache = await hydrateFoodRowsWithPortions(data || []);
}

function scheduleFoodsCatalogSync(delayMs = 120) {
    if (supabaseFoodsSyncTimer) clearTimeout(supabaseFoodsSyncTimer);
    supabaseFoodsSyncTimer = setTimeout(() => {
        syncFoodsCatalogFromSupabase();
    }, delayMs);
}

function startSupabaseFoodsRealtimeSync() {
    if (!isSupabaseReady()) return;
    if (supabaseFoodsChannel) return;
    supabaseFoodsChannel = window.supabase
        .channel('foods-live-global')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: SUPABASE_TABLES.foods },
            () => scheduleFoodsCatalogSync(80)
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: SUPABASE_TABLES.foodPortions },
            () => scheduleFoodsCatalogSync(80)
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') scheduleFoodsCatalogSync(40);
        });
}

function mergeDietLogEntries(baseEntry, incomingEntry) {
    const base = baseEntry && typeof baseEntry === 'object' ? baseEntry : { meals: {} };
    const incoming = incomingEntry && typeof incomingEntry === 'object' ? incomingEntry : { meals: {} };
    const merged = { ...base, ...incoming, meals: {} };
    const mealKeys = new Set([
        ...Object.keys(base.meals || {}),
        ...Object.keys(incoming.meals || {})
    ]);
    mealKeys.forEach((mealKey) => {
        const baseMeal = base.meals?.[mealKey] || {};
        const incomingMeal = incoming.meals?.[mealKey] || {};
        const mergedMeal = { ...baseMeal, ...incomingMeal, items: {} };
        const itemKeys = new Set([
            ...Object.keys(baseMeal.items || {}),
            ...Object.keys(incomingMeal.items || {})
        ]);
        itemKeys.forEach((itemKey) => {
            mergedMeal.items[itemKey] = {
                ...(baseMeal.items?.[itemKey] || {}),
                ...(incomingMeal.items?.[itemKey] || {})
            };
        });
        merged.meals[mealKey] = mergedMeal;
    });
    return merged;
}

function mergeDietLogsByDate(baseLogs, incomingLogs) {
    const base = baseLogs && typeof baseLogs === 'object' ? baseLogs : {};
    const incoming = incomingLogs && typeof incomingLogs === 'object' ? incomingLogs : {};
    const merged = {};
    const dateKeys = new Set([...Object.keys(base), ...Object.keys(incoming)]);
    dateKeys.forEach((dateKey) => {
        merged[dateKey] = mergeDietLogEntries(base[dateKey], incoming[dateKey]);
    });
    return merged;
}

function mergeStudentRemoteLocal(localStudent, remoteStudent) {
    if (!remoteStudent) return null;
    const local = localStudent && typeof localStudent === 'object' ? localStudent : {};
    const remote = remoteStudent && typeof remoteStudent === 'object' ? remoteStudent : {};
    const merged = { ...local, ...remote };
    merged.id = remote.id || local.id || '';
    merged.trainerCode = remote.trainerCode || local.trainerCode || remote.trainer_code || '';
    merged.mealBlocks = Array.isArray(remote.mealBlocks) ? remote.mealBlocks : (Array.isArray(local.mealBlocks) ? local.mealBlocks : []);
    merged.dietMeta = (remote.dietMeta && typeof remote.dietMeta === 'object')
        ? remote.dietMeta
        : (local.dietMeta && typeof local.dietMeta === 'object' ? local.dietMeta : {});
    merged.dietLogs = mergeDietLogsByDate(local.dietLogs, remote.dietLogs);
    merged.dietSchemaVersion = Math.max(
        parseInt(local.dietSchemaVersion || 0, 10) || 0,
        parseInt(remote.dietSchemaVersion || 0, 10) || 0,
        DIET_SCHEMA_VERSION
    );
    return normalizeStudentDietSchema(merged);
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

function cacheTrainerLocal(trainerLike) {
    if (!trainerLike || !trainerLike.code) return null;
    const normalized = {
        code: String(trainerLike.code),
        name: sanitizeUserInput(trainerLike.name || 'Treinador', { maxLen: 90 }),
        consultoriaName: sanitizeUserInput(
            trainerLike.consultoriaName || trainerLike.consultoria_name || '',
            { maxLen: 120 }
        ),
        services: trainerLike.services || 'treino'
    };
    const trainers = readStorageJSON('allTrainers', []);
    const idx = trainers.findIndex(t => String(t.code) === normalized.code);
    if (idx >= 0) {
        trainers[idx] = { ...trainers[idx], ...normalized };
    } else {
        trainers.push(normalized);
    }
    memorySetItem('allTrainers', JSON.stringify(trainers));
    return normalized;
}

async function resolveTrainerByCode(code) {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) return null;
    const trainers = readStorageJSON('allTrainers', []);
    const localTrainer = trainers.find(t => String(t.code) === normalizedCode);
    if (localTrainer) return localTrainer;
    const remote = await getTrainerByCodeRemote(normalizedCode);
    if (!remote) return null;
    return cacheTrainerLocal({
        code: remote.code,
        name: remote.name,
        consultoria_name: remote.consultoria_name,
        services: remote.services
    });
}

async function getStudentByIdRemote(studentId) {
    if (!isSupabaseReady() || !studentId) return null;
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.students)
        .select('*')
        .eq('id', String(studentId))
        .maybeSingle();
    if (error) {
        console.warn('Supabase student fetch failed', error.message);
        return null;
    }
    return normalizeStudentRow(data);
}

async function getStudentByUserIdRemote(userId, trainerCode = '') {
    if (!isSupabaseReady() || !userId) return null;
    const safeUserId = String(userId || '').trim();
    const safeTrainerCode = sanitizeCodeInput(trainerCode, 5);
    let query = window.supabase
        .from(SUPABASE_TABLES.students)
        .select('*')
        .contains('data', { userId: safeUserId })
        .order('updated_at', { ascending: false })
        .limit(1);

    if (safeTrainerCode) query = query.eq('trainer_code', safeTrainerCode);

    const { data, error } = await query;
    if (error) {
        console.warn('Supabase student user fetch failed', error.message || error);
        return null;
    }
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return normalizeStudentRow(row);
}

async function generateUniqueTrainerCode() {
    const localCodes = new Set(readStorageJSON('allTrainers', []).map(t => String(t.code || '')));
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const code = Math.floor(10000 + Math.random() * 89999).toString();
        if (localCodes.has(code)) continue;
        if (!isSupabaseReady()) return code;
        const remote = await getTrainerByCodeRemote(code);
        if (!remote) return code;
    }
    return `${Math.floor(Date.now() / 1000)}`.slice(-5);
}

async function ensureTrainerExistsRemote(code, fallbackName = 'Treinador', fallbackConsultoria = '') {
    if (!isSupabaseReady() || !code) return null;
    const sessionUser = await getSupabaseSessionUser();
    const existing = await getTrainerByCodeRemote(code);
    if (existing) {
        if (!existing.owner_id && sessionUser?.id) {
            await window.supabase
                .from(SUPABASE_TABLES.trainers)
                .update({ owner_id: sessionUser.id })
                .eq('code', String(code));
            return { ...existing, owner_id: sessionUser.id };
        }
        return existing;
    }
    const row = {
        code: String(code),
        name: fallbackName,
        consultoria_name: fallbackConsultoria,
        owner_id: sessionUser?.id || null,
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

function getStudentTrainerCodeValue(studentLike = {}) {
    const rawCode =
        studentLike?.trainerCode
        || studentLike?.trainer_code
        || studentLike?.data?.trainerCode
        || studentLike?.data?.trainer_code
        || '';
    return sanitizeCodeInput(rawCode, 5);
}

function getStudentUserIdValue(studentLike = {}) {
    return String(
        studentLike?.userId
        || studentLike?.user_id
        || studentLike?.data?.userId
        || studentLike?.data?.user_id
        || ''
    ).trim();
}

async function getOwnedTrainerCodesForUser(userId, { force = false } = {}) {
    const safeUserId = String(userId || '').trim();
    if (!safeUserId || !isSupabaseReady()) return new Set();
    const now = Date.now();
    if (
        !force
        && supabaseTrainerCodesCache.userId === safeUserId
        && supabaseTrainerCodesCache.expiresAt > now
    ) {
        return new Set(supabaseTrainerCodesCache.codes);
    }

    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.trainers)
        .select('code')
        .eq('owner_id', safeUserId);

    if (error) {
        console.warn('[students-sync] Falha ao buscar códigos do treinador dono', error.message || error);
        return new Set();
    }

    const ownedCodes = new Set(
        (data || [])
            .map((row) => sanitizeCodeInput(row?.code || '', 5))
            .filter(Boolean)
    );

    supabaseTrainerCodesCache.userId = safeUserId;
    supabaseTrainerCodesCache.expiresAt = now + SUPABASE_TRAINER_CODES_CACHE_TTL_MS;
    supabaseTrainerCodesCache.codes = new Set(ownedCodes);
    return ownedCodes;
}

async function syncStudentsFromSupabase(trainerCode) {
    if (!isSupabaseReady() || !trainerCode) return;
    const scopedTrainerCode = sanitizeCodeInput(trainerCode, 5);
    if (!scopedTrainerCode) return;
    if (navigator.onLine === false) {
        setStudentSyncState('offline', 'Sem conexão');
        return;
    }
    const { data, error } = await window.supabase
        .from(SUPABASE_TABLES.students)
        .select('*')
        .eq('trainer_code', String(scopedTrainerCode));
    if (error) {
        console.warn('Supabase students sync failed', error.message);
        setStudentSyncState('error', 'Falha ao atualizar dados');
        return;
    }
    if (!data) return;
    const remoteStudents = data.map(normalizeStudentRow).filter(Boolean);
    const localStudents = normalizeStudentsDietSchema(readStorageJSON('trainerStudents', []));
    const localScoped = localStudents.filter((student) => getStudentTrainerCodeValue(student) === scopedTrainerCode);
    const localOthers = localStudents.filter((student) => getStudentTrainerCodeValue(student) !== scopedTrainerCode);
    const localScopedById = new Map(localScoped.map((student) => [String(student.id || ''), student]));
    const mergedScopedById = new Map();

    remoteStudents.forEach((remoteStudent) => {
        const id = String(remoteStudent.id || '');
        if (!id) return;
        const localMatch = localScopedById.get(id);
        mergedScopedById.set(id, mergeStudentRemoteLocal(localMatch, remoteStudent));
    });

    localScoped.forEach((localStudent) => {
        const id = String(localStudent.id || '');
        if (!id) return;
        if (!mergedScopedById.has(id)) {
            // Preserve local fallback (especially pending requests) until remote confirms.
            mergedScopedById.set(id, normalizeStudentDietSchema(localStudent));
        }
    });

    const students = normalizeStudentsDietSchema([
        ...localOthers,
        ...Array.from(mergedScopedById.values()).filter(Boolean)
    ]);

    if (isSupabaseReady()) {
        const fallbackName = scopedTrainerCode === '00001' ? 'Administrador Teste' : 'Treinador';
        const fallbackConsultoria = fallbackName ? `Consultoria de ${fallbackName.split(' ')[0]} ` : '';
        await ensureTrainerExistsRemote(scopedTrainerCode, fallbackName, fallbackConsultoria);
    }

    saveStudentData(students, { skipSupabaseSync: true });
    mergeWorkoutHistoryFromStudents(students);
    syncChatMessagesFromStudents(students);
    renderStudents();
    renderPendingRequests();
    updateTrainerStats();
    setStudentSyncState('synced', 'Sincronizado');
}

function clearSupabaseStudentsPolling() {
    if (supabaseStudentsPollTimer) {
        clearInterval(supabaseStudentsPollTimer);
        supabaseStudentsPollTimer = null;
    }
}

function ensureSupabaseStudentsPolling(trainerCode) {
    if (!trainerCode) return;
    if (supabaseStudentsPollTimer) return;
    supabaseStudentsPollTimer = setInterval(() => {
        syncStudentsFromSupabase(trainerCode);
    }, 20000);
}

function stopSupabaseRealtimeSync() {
    clearSupabaseStudentsPolling();
    if (supabaseRealtimeRefreshTimer) {
        clearTimeout(supabaseRealtimeRefreshTimer);
        supabaseRealtimeRefreshTimer = null;
    }
    if (supabaseStudentsChannel && isSupabaseReady()) {
        window.supabase.removeChannel(supabaseStudentsChannel);
    }
    if (supabaseTrainerChannel && isSupabaseReady()) {
        window.supabase.removeChannel(supabaseTrainerChannel);
    }
    if (supabaseFoodsChannel && isSupabaseReady()) {
        window.supabase.removeChannel(supabaseFoodsChannel);
    }
    supabaseStudentsChannel = null;
    supabaseTrainerChannel = null;
    supabaseFoodsChannel = null;
    supabaseRealtimeTrainerCode = '';
}

function scheduleRealtimeStudentsRefresh(trainerCode, delayMs = 350) {
    if (!trainerCode) return;
    if (supabaseRealtimeRefreshTimer) clearTimeout(supabaseRealtimeRefreshTimer);
    supabaseRealtimeRefreshTimer = setTimeout(() => {
        syncStudentsFromSupabase(trainerCode);
    }, delayMs);
}

function startSupabaseRealtimeSync(trainerCode) {
    if (!isSupabaseReady()) return;
    const code = String(trainerCode || '').trim();
    if (!code || code === '00000') return;
    if (supabaseRealtimeTrainerCode === code && supabaseStudentsChannel && supabaseTrainerChannel) {
        return;
    }

    stopSupabaseRealtimeSync();
    supabaseRealtimeTrainerCode = code;

    const studentChannelName = `students-live-${code}`;
    const trainerChannelName = `trainers-live-${code}`;

    supabaseStudentsChannel = window.supabase
        .channel(studentChannelName)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: SUPABASE_TABLES.students, filter: `trainer_code=eq.${code}` },
            () => scheduleRealtimeStudentsRefresh(code, 180)
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                clearSupabaseStudentsPolling();
                scheduleRealtimeStudentsRefresh(code, 40);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                ensureSupabaseStudentsPolling(code);
            }
        });

    supabaseTrainerChannel = window.supabase
        .channel(trainerChannelName)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: SUPABASE_TABLES.trainers, filter: `code=eq.${code}` },
            () => scheduleRealtimeStudentsRefresh(code, 180)
        )
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                ensureSupabaseStudentsPolling(code);
            }
        });
}

function queueSupabaseStudentsSync(students) {
    if (!isSupabaseReady()) return;
    if (navigator.onLine === false) {
        setStudentSyncState('offline', 'Sem conexão');
        return;
    }
    setStudentSyncState('pending', 'Sincronização pendente');
    if (supabaseStudentsSyncTimer) clearTimeout(supabaseStudentsSyncTimer);
    const payload = normalizeStudentsDietSchema(JSON.parse(JSON.stringify(students || [])));
    supabaseStudentsSyncTimer = setTimeout(async () => {
        const sessionUser = await getSupabaseSessionUser();
        if (!sessionUser?.id) return;
        const actorUserId = String(sessionUser.id);
        const profile = await getProfileByUserId(actorUserId);
        const actorRoles = normalizeAppRoles(
            profile?.roles || sessionUser?.user_metadata?.roles,
            profile?.role || sessionUser?.user_metadata?.role
        );
        const canActAsTrainer = actorRoles.includes('trainer');
        const canActAsStudent = actorRoles.includes('student');
        const ownedTrainerCodes = canActAsTrainer
            ? await getOwnedTrainerCodesForUser(actorUserId)
            : new Set();
        const inferredTrainerCode = sanitizeCodeInput(
            profile?.trainer_code || memoryGetItem('currentTrainerCode') || '',
            5
        );
        if (canActAsTrainer && inferredTrainerCode) {
            ownedTrainerCodes.add(inferredTrainerCode);
        }

        let skippedUnauthorized = 0;
        const permittedStudents = payload.filter((student) => {
            const studentId = String(student?.id || '').trim();
            const trainerCode = getStudentTrainerCodeValue(student);
            const studentUserId = getStudentUserIdValue(student);
            if (!studentId || !trainerCode) {
                skippedUnauthorized += 1;
                console.warn(`[students-sync] Registro ignorado (id/trainer_code ausente). id=${studentId || '-'} trainer_code=${trainerCode || '-'}`);
                return false;
            }
            const allowByStudent = canActAsStudent && studentUserId === actorUserId;
            const allowByTrainer = canActAsTrainer && ownedTrainerCodes.has(trainerCode);
            if (!allowByStudent && !allowByTrainer) {
                skippedUnauthorized += 1;
                console.warn(
                    `[students-sync] Registro sem permissão, ignorado. id=${studentId} trainer_code=${trainerCode} user_id=${studentUserId || '-'} actor=${actorUserId} roles=${actorRoles.join(',')}`
                );
                return false;
            }
            return true;
        });

        if (permittedStudents.length === 0) {
            if (skippedUnauthorized > 0) {
                console.warn(`[students-sync] Nenhum registro permitido para sync. ignorados=${skippedUnauthorized}`);
            }
            return;
        }

        const ids = permittedStudents.map((student) => String(student.id || '')).filter(Boolean);
        let remoteById = new Map();
        if (ids.length > 0) {
            const { data: remoteRows } = await window.supabase
                .from(SUPABASE_TABLES.students)
                .select('id,data')
                .in('id', ids);
            if (Array.isArray(remoteRows)) {
                remoteById = new Map(remoteRows.map((row) => [String(row.id || ''), normalizeStudentRow(row)]));
            }
        }

        const rows = permittedStudents.map((student) => {
            const id = String(student.id || '');
            const remote = remoteById.get(id);
            const mergedStudent = mergeStudentRemoteLocal(student, remote || student);
            const trainerCode = getStudentTrainerCodeValue(mergedStudent);
            const studentUserId = getStudentUserIdValue(mergedStudent);
            if (!trainerCode) return null;
            return {
                id: String(mergedStudent.id || id),
                trainer_code: trainerCode,
                data: {
                    ...mergedStudent,
                    trainerCode,
                    userId: studentUserId || actorUserId,
                    pending: Boolean(mergedStudent?.pending),
                    active: Boolean(mergedStudent?.active)
                },
                updated_at: new Date().toISOString()
            };
        }).filter((row) => row?.id && row?.trainer_code);
        if (rows.length === 0) return;

        let syncedCount = 0;
        let failedCount = 0;
        for (const row of rows) {
            const { error: rowError } = await window.supabase
                .from(SUPABASE_TABLES.students)
                .upsert(row, { onConflict: 'id' });
            if (rowError) {
                failedCount += 1;
                console.warn(
                    `[students-sync] Upsert falhou para id=${row.id} trainer_code=${row.trainer_code} actor=${actorUserId}. ${rowError.message || rowError}`
                );
                continue;
            }
            syncedCount += 1;
        }

        if (failedCount > 0 || skippedUnauthorized > 0) {
            console.warn(
                `[students-sync] Resumo sync: enviados=${rows.length} sucesso=${syncedCount} falhas=${failedCount} ignorados=${skippedUnauthorized}`
            );
        }
        if (failedCount > 0) {
            setStudentSyncState('error', `Falha em ${failedCount} registro(s)`);
        } else if (syncedCount > 0) {
            setStudentSyncState('synced', 'Sincronizado');
        } else {
            setStudentSyncState('pending', 'Sem alterações para sincronizar');
        }
    }, 400);
}

function buildDietLogRowsForSync(student, dateKey, dayLog) {
    const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) ? String(dateKey) : getTodayDateKey();
    const studentUserId = String(student?.userId || memoryGetItem('currentUserId') || '').trim();
    const studentLocalId = String(student?.id || '').trim();
    if (!studentUserId || !studentLocalId) return [];

    const meals = dayLog?.meals && typeof dayLog.meals === 'object' ? dayLog.meals : {};
    const rows = [];
    Object.keys(meals).forEach((mealIdxKey) => {
        const mealIdx = parseInt(mealIdxKey, 10);
        const meal = meals[mealIdxKey] || {};
        const items = meal?.items && typeof meal.items === 'object' ? meal.items : {};
        Object.keys(items).forEach((itemIdxKey) => {
            const itemIdx = parseInt(itemIdxKey, 10);
            const item = items[itemIdxKey] || {};
            const parsedQty = parseAmountAndUnit(item.qty || '', item.unitKey || item.unit_key || 'g');
            rows.push({
                student_user_id: studentUserId,
                student_local_id: studentLocalId,
                log_date: safeDate,
                meal_idx: Number.isFinite(mealIdx) ? mealIdx : 0,
                item_idx: Number.isFinite(itemIdx) ? itemIdx : 0,
                checked: !!item.checked,
                qty: String(item.qty || ''),
                amount: Math.max(0.1, parseDecimalSafe(item.amount) || parsedQty.amount || 1),
                unit_key: normalizeFoodUnitKey(item.unitKey || item.unit_key || parsedQty.unit || 'g'),
                portion_id: String(item.portionId || item.portion_id || '') || null,
                portion_label: sanitizeUserInput(item.portionLabel || item.portion_label || '', { maxLen: 80 }) || null,
                substitute: item?.substitute && typeof item.substitute === 'object'
                    ? item.substitute
                    : { enabled: false },
                updated_at: new Date().toISOString()
            });
        });
    });
    return rows;
}

async function syncStudentProfileEntity(student) {
    if (!isSupabaseReady() || !student || !entityTablesAvailability.profiles) return;
    const studentUserId = String(student?.userId || memoryGetItem('currentUserId') || '').trim();
    if (!studentUserId) return;
    const payload = {
        student_user_id: studentUserId,
        student_local_id: String(student.id || ''),
        trainer_code: getStudentTrainerCodeValue(student),
        profile_data: {
            name: student.name || '',
            age: student.age || '',
            gender: student.gender || '',
            goal: student.goal || '',
            weight: student.weight || '',
            height: student.height || '',
            bodyFat: student.bodyFat || '',
            questionnaire: student.questionnaire || {}
        },
        updated_at: new Date().toISOString()
    };
    const { error } = await window.supabase
        .from(SUPABASE_TABLES.studentProfiles)
        .upsert(payload, { onConflict: 'student_user_id' });
    if (error) {
        console.warn('[entity-sync] student_profiles upsert falhou', error.message || error);
        if (String(error.message || '').toLowerCase().includes('does not exist')) {
            entityTablesAvailability.profiles = false;
        }
    }
}

function queueEntityDietLogsSync(student, dateKey) {
    if (!isSupabaseReady() || !student?.id || !entityTablesAvailability.dietLogs) return;
    const timerKey = `${student.id}:${dateKey}`;
    const existingTimer = supabaseEntityDietSyncTimers.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    const nextTimer = setTimeout(async () => {
        const dayLog = getStudentDietLogForDate(student, dateKey);
        const rows = buildDietLogRowsForSync(student, dateKey, dayLog);
        if (!rows.length) {
            supabaseEntityDietSyncTimers.delete(timerKey);
            return;
        }
        const { error } = await window.supabase
            .from(SUPABASE_TABLES.dietLogs)
            .upsert(rows, { onConflict: 'student_user_id,log_date,meal_idx,item_idx' });
        if (error) {
            const message = String(error.message || '').toLowerCase();
            const legacyColumnsMissing = (
                message.includes('column "amount"')
                || message.includes('column "unit_key"')
                || message.includes('column "portion_id"')
                || message.includes('column "portion_label"')
            );
            if (legacyColumnsMissing) {
                const legacyRows = rows.map(({ amount, unit_key, portion_id, portion_label, ...rest }) => rest);
                const { error: legacyError } = await window.supabase
                    .from(SUPABASE_TABLES.dietLogs)
                    .upsert(legacyRows, { onConflict: 'student_user_id,log_date,meal_idx,item_idx' });
                if (!legacyError) {
                    setStudentSyncState('synced', 'Sincronizado');
                    supabaseEntityDietSyncTimers.delete(timerKey);
                    return;
                }
            }
            console.warn('[entity-sync] diet_logs upsert falhou', error.message || error);
            if (String(error.message || '').toLowerCase().includes('does not exist')) {
                entityTablesAvailability.dietLogs = false;
            }
            setStudentSyncState('error', 'Falha ao salvar logs de dieta');
            supabaseEntityDietSyncTimers.delete(timerKey);
            return;
        }
        setStudentSyncState('synced', 'Sincronizado');
        supabaseEntityDietSyncTimers.delete(timerKey);
    }, 360);

    supabaseEntityDietSyncTimers.set(timerKey, nextTimer);
}

async function syncWorkoutArchiveToEntities(student, workoutArchive, sessionId = '') {
    if (!isSupabaseReady() || !student || !workoutArchive || !entityTablesAvailability.workout) return;
    const studentUserId = String(student?.userId || memoryGetItem('currentUserId') || '').trim();
    if (!studentUserId) return;
    const normalizedSessionId = String(sessionId || `session-${Date.now()}`);
    const startedAt = workoutState?.startTime
        ? new Date(workoutState.startTime).toISOString()
        : new Date(workoutArchive.Data_Treino).toISOString();
    const finishedAt = new Date(workoutArchive.Data_Treino).toISOString();

    const sessionRow = {
        id: normalizedSessionId,
        student_user_id: studentUserId,
        student_local_id: String(student.id || ''),
        workout_title: String(workoutArchive.Nome_Treino || ''),
        started_at: startedAt,
        finished_at: finishedAt,
        duration_seconds: Number(workoutArchive.Duracao || 0),
        volume_total: Number(workoutArchive.Volume_Total || 0),
        feedback: workoutArchive.Avaliacao_Geral || {},
        updated_at: new Date().toISOString()
    };

    const setRows = [];
    (workoutArchive.Exercicios || []).forEach((exercise, exIdx) => {
        (exercise.sets || []).forEach((set, setIdx) => {
            setRows.push({
                session_id: normalizedSessionId,
                exercise_index: exIdx,
                exercise_name: String(exercise.nome || ''),
                set_index: setIdx,
                weight: Number(set.peso || 0),
                reps: Number(set.reps || 0),
                rpe: set.rpe === null || set.rpe === undefined ? null : Number(set.rpe),
                execucao: set.execucao === null || set.execucao === undefined ? null : Number(set.execucao),
                extra: {
                    type: set.type || 'normal',
                    intensidade: set.intensidade ?? null,
                    rir: set.rir ?? null,
                    brokenPRs: set.brokenPRs || {}
                },
                completed_at: finishedAt,
                updated_at: new Date().toISOString()
            });
        });
    });

    const { error: sessionError } = await window.supabase
        .from(SUPABASE_TABLES.workoutSessions)
        .upsert(sessionRow, { onConflict: 'id' });
    if (sessionError) {
        console.warn('[entity-sync] workout_sessions upsert falhou', sessionError.message || sessionError);
        if (String(sessionError.message || '').toLowerCase().includes('does not exist')) {
            entityTablesAvailability.workout = false;
        }
        return;
    }
    if (setRows.length > 0) {
        const { error: setsError } = await window.supabase
            .from(SUPABASE_TABLES.workoutSets)
            .upsert(setRows, { onConflict: 'session_id,exercise_index,set_index' });
        if (setsError) {
            console.warn('[entity-sync] workout_sets upsert falhou', setsError.message || setsError);
            if (String(setsError.message || '').toLowerCase().includes('does not exist')) {
                entityTablesAvailability.workout = false;
            }
            return;
        }
    }
}

async function syncStudentConnectionEntity(studentUserId, trainerCode, status = 'pending') {
    if (!isSupabaseReady() || !entityTablesAvailability.connections) return;
    const safeUserId = String(studentUserId || '').trim();
    const safeTrainerCode = sanitizeCodeInput(trainerCode, 5);
    const safeStatus = ['pending', 'approved', 'rejected'].includes(String(status || '').toLowerCase())
        ? String(status || '').toLowerCase()
        : 'pending';
    if (!safeUserId || !safeTrainerCode) return;

    const payload = {
        student_user_id: safeUserId,
        trainer_code: safeTrainerCode,
        status: safeStatus,
        requested_at: new Date().toISOString(),
        decided_at: safeStatus === 'pending' ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    const { error } = await window.supabase
        .from(SUPABASE_TABLES.studentConnections)
        .upsert(payload, { onConflict: 'student_user_id,trainer_code' });
    if (error) {
        console.warn('[entity-sync] student_connections upsert falhou', error.message || error);
        if (String(error.message || '').toLowerCase().includes('does not exist')) {
            entityTablesAvailability.connections = false;
        }
    }
}

function getActiveSyncTrainerCode() {
    return (
        memoryGetItem('currentTrainerCode') ||
        memoryGetItem('connectedTrainerCode') ||
        memoryGetItem('trainerCodeDefault') ||
        ''
    );
}

function setStudentSyncState(status = 'synced', message = '', options = {}) {
    const normalizedStatus = String(status || 'synced').toLowerCase();
    const validStatus = ['synced', 'pending', 'offline', 'error'].includes(normalizedStatus)
        ? normalizedStatus
        : 'synced';
    studentSyncState = {
        status: validStatus,
        message: message || (
            validStatus === 'synced'
                ? 'Sincronizado'
                : validStatus === 'pending'
                    ? 'Sincronização pendente'
                    : validStatus === 'offline'
                        ? 'Sem conexão'
                        : 'Falha de sincronização'
        ),
        updatedAt: options.updatedAt || new Date().toISOString()
    };
    renderDietSyncStatus();
}

function renderDietSyncStatus() {
    const pill = document.getElementById('diet-sync-pill');
    if (!pill) return;
    const statusClass = `is-${studentSyncState.status || 'synced'}`;
    pill.classList.remove('is-synced', 'is-pending', 'is-offline', 'is-error');
    pill.classList.add(statusClass);
    pill.textContent = studentSyncState.message || 'Sincronizado';
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
            if (typeof renderWorkouts === 'function') renderWorkouts();
            if (typeof renderMeals === 'function') renderMeals();
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
    const { type } = event.data;

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
            const sanitizedHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '');
            container.outerHTML = sanitizedHtml;
        } catch (e) {
            console.error('Error loading component:', url, e);
        }
    });
    await Promise.all(promises);
}

async function ensureScreenElement(screenId, pagePath) {
    const existing = document.getElementById(screenId);
    if (existing) return existing;
    if (!pagePath) return null;

    try {
        const res = await fetch(pagePath, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const sanitizedHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '');
        const app = document.getElementById('app');
        if (!app) return null;
        app.insertAdjacentHTML('beforeend', sanitizedHtml);
        return document.getElementById(screenId);
    } catch (err) {
        console.error(`Falha ao carregar tela ${screenId} (${pagePath})`, err);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSPAComponents();
    setupClientSideFormProtection();
    migrateStoredStudentsDietSchema({ syncRemote: false });
    if (ENABLE_DEMO_ACCESS) {
        ensureAdminStudent();
        ensureSelfTrainingStudent();
    }
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

    document.addEventListener('keydown', (event) => {
        const foodModal = document.getElementById('food-modal');
        if (foodModal?.classList.contains('active')) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeFoodModal();
                return;
            }
            if (event.key === 'Enter' && event.target?.id === 'food-qtd') {
                event.preventDefault();
                confirmAddFood();
                return;
            }
        }
        if (dietFoodPickerState?.open && event.key === 'Escape') {
            event.preventDefault();
            closeDietFoodPicker();
        }
    });

    // Prevent # anchors from jumping the page in app navigation
    document.querySelectorAll('.sidebar-nav .nav-item[href="#"]').forEach((link) => {
        if (link.dataset.preventInit === '1') return;
        link.addEventListener('click', (evt) => evt.preventDefault());
        link.dataset.preventInit = '1';
    });

    optimizeMediaElements(document);

    const hasPublicHome = !!document.getElementById('home-screen');
    if (hasPublicHome) {
        const activeUser = await getSupabaseSessionUser();
        if (activeUser) {
            await processLogin({
                id: activeUser.id,
                roles: normalizeAppRoles(activeUser?.user_metadata?.roles, activeUser?.user_metadata?.role),
                name: sanitizeUserInput(activeUser?.user_metadata?.name || activeUser?.email || 'Usuário', { maxLen: 90 }),
                email: activeUser?.email || ''
            });
            return;
        }
    }

    clearAuthRuntimeContext();

    if (isSupabaseReady() && typeof window.supabase?.auth?.onAuthStateChange === 'function') {
        window.supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                clearAuthRuntimeContext();
                goToGlobalLogin();
            }
        });
    }

    const login = document.getElementById('global-login-screen');
    if (login) {
        await goToGlobalLogin();
        return;
    }

    const home = document.getElementById('home-screen');
    if (home) {
        hideAllScreens();
        home.classList.add('active');
    }
});

window.addEventListener('online', () => {
    setStudentSyncState('pending', 'Reconectado, sincronizando...');
    const students = readStorageJSON('trainerStudents', []);
    if (Array.isArray(students) && students.length > 0) {
        queueSupabaseStudentsSync(students);
    }
});

window.addEventListener('offline', () => {
    setStudentSyncState('offline', 'Sem conexão');
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
                    if (typeof renderWorkouts === 'function') renderWorkouts();
                    if (typeof renderMeals === 'function') renderMeals();
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

function showAdminCopyFeedback() {
    const badge = document.getElementById('sidebar-trainer-code-badge');
    if (!badge) return;
    badge.classList.add('copied');
    clearTimeout(window.__sidebarCodeCopiedTimer);
    window.__sidebarCodeCopiedTimer = setTimeout(() => {
        badge.classList.remove('copied');
    }, 1200);
    if (typeof showDietRuntimeMessage === 'function') {
        showDietRuntimeMessage('Código copiado com sucesso.', 'success');
    }
}

function copySidebarAdminCode(event) {
    if (event) event.stopPropagation();
    const code = (document.getElementById('sidebar-trainer-code')?.textContent || '').replace(/\D/g, '');
    if (!code) return;
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
        showAdminCopyFeedback();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(showAdminCopyFeedback).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
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
    stopSupabaseRealtimeSync();
    memoryRemoveItem('trainerName');
    memoryRemoveItem('currentTrainerCode');
    window.location.href = 'index.html';
}

function editTrainerProfile() {
    const trainerName = memoryGetItem('trainerName') || 'Treinador';
    const trainerCode = memoryGetItem('currentTrainerCode') || '00001';

    alert(`?? Editar Perfil\n\nNome: ${trainerName}\nCódigo: ${trainerCode}\n\nEsta funcionalidade será implementada em breve.`);
    closeTrainerProfileMenu();
}

function viewTrainerStats() {
    const students = readStorageJSON('trainerStudents', []);
    const trainerCode = memoryGetItem('currentTrainerCode') || '00001';
    const myStudents = students.filter(s => s.trainerCode === trainerCode);

    const total = myStudents.length;
    const active = myStudents.filter(s => s.active).length;
    const pending = myStudents.filter(s => s.pending).length;

    alert(`?? Estatísticas\n\nTotal de Alunos: ${total}\nAtivos: ${active}\nPendentes: ${pending}\n\nVisita a aba "Alunos" para gerenciar.`);
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
        alert(`?? Código para compartilhar:\n\n${trainerCode}\n\nCopie este código e compartilhe com seus alunos.`);
    }
    closeTrainerProfileMenu();
}

async function goToGlobalLogin() {
    const loginScreen = await ensureScreenElement('global-login-screen', 'pages/login.html');
    if (!loginScreen) {
        console.warn('Tela de login indisponivel, abrindo home.');
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            activateScreen('home-screen');
            return;
        }
        return;
    }
    const testButton = loginScreen.querySelector('.auth-alt-btn-test');
    if (testButton) {
        testButton.style.display = ENABLE_DEMO_ACCESS ? '' : 'none';
    }
    activateScreen('global-login-screen', { animate: true });
}

async function goToProfileCreate() {
    const profileCreateScreen = await ensureScreenElement('profile-create-screen', 'pages/profile-create.html');
    if (!profileCreateScreen) {
        const hasInline = setAuthInlineFeedback(
            'login-inline-feedback',
            'Nao foi possivel abrir a tela de cadastro. Recarregue a pagina e tente novamente.',
            'error'
        );
        if (!hasInline) {
            alert('Nao foi possivel abrir a tela de cadastro. Recarregue a pagina e tente novamente.');
        }
        return;
    }
    activateScreen('profile-create-screen', { animate: true });
}

async function openTrainerArea() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser || !isEmailConfirmed(activeUser)) {
        alert('Faça login com e-mail e senha para acessar a área do treinador.');
        goToGlobalLogin();
        return;
    }
    const profile = await getProfileByUserId(activeUser.id);
    const roles = normalizeAppRoles(profile?.roles || activeUser?.user_metadata?.roles, profile?.role || activeUser?.user_metadata?.role);
    if (!roles.includes('trainer')) {
        alert('Sua conta não possui acesso de treinador.');
        return;
    }
    window.location.href = 'trainer.html';
}

function toggleElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// â”€â”€â”€ Authentication Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function normalizeAppRole(role) {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'treinador' || value === 'trainer') return 'trainer';
    if (value === 'aluno' || value === 'student') return 'student';
    return '';
}

function normalizeAppRoles(rolesLike, legacyRole = '') {
    const candidates = [];
    if (Array.isArray(rolesLike)) {
        candidates.push(...rolesLike);
    } else if (typeof rolesLike === 'string' && rolesLike.trim()) {
        candidates.push(...rolesLike.split(','));
    }
    if (legacyRole) candidates.push(legacyRole);
    const normalized = [];
    candidates.forEach((entry) => {
        const role = normalizeAppRole(entry);
        if (role && !normalized.includes(role)) normalized.push(role);
    });
    if (normalized.length === 0) normalized.push('student');
    return normalized;
}

function rolesFromChoice(choice) {
    const normalized = String(choice || '').trim().toLowerCase();
    if (normalized === 'trainer' || normalized === 'treinador') return ['trainer'];
    if (normalized === 'both' || normalized === 'ambos') return ['trainer', 'student'];
    return ['student'];
}

function hasAppRole(rolesLike, role) {
    return normalizeAppRoles(rolesLike).includes(role);
}

function isEmailConfirmed(user) {
    return !!user?.email_confirmed_at;
}

function mapOnboardingStep(profile, roles) {
    const normalizedRoles = normalizeAppRoles(roles, profile?.role);
    const hasStudent = normalizedRoles.includes('student');

    if (!profile?.profile_complete) return 'profile_setup';
    if (hasStudent && !profile?.anamnesis) return 'profile_setup';
    if (hasStudent && !sanitizeCodeInput(profile?.connected_trainer_code || '', 5)) return 'trainer_connect';
    return 'done';
}

async function getSupabaseSessionUser() {
    if (typeof window.supabase?.auth?.getSession !== 'function') return null;
    const { data, error } = await window.supabase.auth.getSession();
    if (error) return null;
    return data?.session?.user || null;
}

async function runOneShotLegacyMigration(user, profile, roles = []) {
    if (!user?.id || !isSupabaseReady()) return;
    if (hasMigrationCompleted(user.id)) return;

    try {
        const localStudents = normalizeStudentsDietSchema(readStorageJSON('trainerStudents', []));
        if (Array.isArray(localStudents) && localStudents.length > 0) {
            let scopedStudents = localStudents;
            const isTrainer = normalizeAppRoles(roles, profile?.role).includes('trainer');
            const isStudent = normalizeAppRoles(roles, profile?.role).includes('student');

            if (isTrainer) {
                const trainerCode = sanitizeCodeInput(profile?.trainer_code || memoryGetItem('currentTrainerCode') || '', 5);
                if (trainerCode) {
                    scopedStudents = localStudents.filter((s) =>
                        sanitizeCodeInput(s?.trainerCode || s?.trainer_code || '', 5) === trainerCode
                    );
                }
            } else if (isStudent) {
                const currentStudentId = String(memoryGetItem('currentStudentId') || '');
                scopedStudents = localStudents
                    .filter((s) =>
                        String(s?.userId || '') === String(user.id) ||
                        (currentStudentId && String(s?.id || '') === currentStudentId)
                    )
                    .map((s) => ({ ...s, userId: user.id }));
            }

            if (scopedStudents.length > 0) {
                queueSupabaseStudentsSync(scopedStudents);
            }
        }
    } catch (err) {
        console.warn('Falha na migracao one-shot do legado', err);
    } finally {
        markMigrationCompleted(user.id);
    }
}

async function getProfileByUserId(userId) {
    if (!isSupabaseReady() || !userId) return null;
    const { data, error } = await window.supabase
        .from('profiles')
        .select('id,role,roles,name,avatar_url,trainer_code,connected_trainer_code,profile_complete,onboarding_step,anamnesis')
        .eq('id', String(userId))
        .maybeSingle();
    if (error) return null;
    return data || null;
}

async function upsertOwnProfile(payload) {
    if (!isSupabaseReady()) return null;
    const { data, error } = await window.supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('id,role,roles,name,avatar_url,trainer_code,connected_trainer_code,profile_complete,onboarding_step,anamnesis')
        .maybeSingle();
    if (error) {
        console.warn('Falha ao salvar perfil.', error.message || error);
        return null;
    }
    return data || null;
}

function cacheAuthenticatedContext(user, profile, roles, onboardingStep) {
    if (user?.id) memorySetItem('currentUserId', String(user.id));
    if (user?.email) memorySetItem('currentUserEmail', sanitizeEmailInput(user.email));
    memorySetItem('currentUserRoles', JSON.stringify(roles));
    memorySetItem('currentUserRole', roles[0] || 'student');
    memorySetItem('currentOnboardingStep', onboardingStep);
    if (profile?.connected_trainer_code) {
        memorySetItem('connectedTrainerCode', sanitizeCodeInput(profile.connected_trainer_code, 5));
    }
    if (profile?.anamnesis && typeof profile.anamnesis === 'object') {
        memorySetItem('currentAnamnesis', JSON.stringify(profile.anamnesis));
    }
}

async function openStudentDashboardForUser(userId, trainerCode = '') {
    let students = readStorageJSON('trainerStudents', []);
    let student = students.find((s) => String(s.userId || '') === String(userId));
    const safeTrainerCode = sanitizeCodeInput(trainerCode, 5);

    if (!student && safeTrainerCode && isSupabaseReady()) {
        await syncStudentsFromSupabase(safeTrainerCode);
        students = readStorageJSON('trainerStudents', []);
        student = students.find((s) => String(s.userId || '') === String(userId));
    }

    if (!student && isSupabaseReady()) {
        const remoteStudent = await getStudentByUserIdRemote(userId, safeTrainerCode);
        if (remoteStudent) {
            const mergedStudents = normalizeStudentsDietSchema([
                ...students.filter((s) => String(s.id) !== String(remoteStudent.id)),
                remoteStudent
            ]);
            saveStudentData(mergedStudents);
            student = remoteStudent;
            const remoteTrainerCode = getStudentTrainerCodeValue(remoteStudent);
            if (remoteTrainerCode) {
                memorySetItem('connectedTrainerCode', remoteTrainerCode);
            }
            if (remoteTrainerCode && remoteTrainerCode !== safeTrainerCode) {
                await syncStudentsFromSupabase(remoteTrainerCode);
                students = readStorageJSON('trainerStudents', []);
                student = students.find((s) => String(s.userId || '') === String(userId)) || student;
            }
        }
    }

    if (!student) return false;
    return openStudentDashboardSession(student);
}

function showProfileSetupScreen(profile, roles) {
    hideAllScreens();
    const screen = document.getElementById('profile-setup-screen');
    if (!screen) {
        goToProfileCreate();
        return;
    }
    screen.classList.add('active');
    screen.dataset.roles = JSON.stringify(roles);

    const nameInput = document.getElementById('profile-setup-name');
    const avatarInput = document.getElementById('profile-setup-avatar');
    const heading = document.getElementById('profile-setup-heading');
    const studentHint = document.getElementById('profile-setup-student-hint');
    const roleList = roles.map((r) => (r === 'trainer' ? 'Treinador' : 'Aluno')).join(' + ');

    if (heading) heading.textContent = `Finalizar conta (${roleList})`;
    if (nameInput) nameInput.value = sanitizeUserInput(profile?.name || memoryGetItem('studentName') || '', { maxLen: 90 });
    if (avatarInput) avatarInput.value = sanitizeUserInput(profile?.avatar_url || '', { maxLen: 300 });
    if (studentHint) studentHint.style.display = roles.includes('student') ? '' : 'none';
}

function showTrainerConnectScreen() {
    activateScreen('student-screen', { animate: true });

    const title = document.getElementById('student-connect-title');
    const subtitle = document.getElementById('student-connect-subtitle');
    const trainerCodeInput = document.getElementById('trainer-code');
    const currentCode = sanitizeCodeInput(
        memoryGetItem('connectedTrainerCode') || memoryGetItem('currentTrainerCode') || '',
        5
    );
    if (title) title.textContent = 'Conectar com Treinador';
    if (subtitle) {
        subtitle.textContent = currentCode
            ? `Código atual: ${currentCode}. Informe outro código para reconectar sua conta.`
            : 'Adicione o código do treinador para concluir seu acesso como aluno.';
    }
    if (trainerCodeInput) trainerCodeInput.value = currentCode || '';
}

async function openStudentConnectFromDashboard() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser) {
        goToGlobalLogin();
        return;
    }
    document.querySelectorAll('#student-dashboard-screen .sidebar-nav .nav-item').forEach((item) => {
        item.classList.remove('active');
    });
    const navConnect = document.getElementById('snav-connect');
    if (navConnect) navConnect.classList.add('active');
    showTrainerConnectScreen();
}

async function routeByOnboarding(user, profile, roles) {
    const onboardingStep = mapOnboardingStep(profile, roles);
    cacheAuthenticatedContext(user, profile, roles, onboardingStep);

    if (onboardingStep === 'profile_setup') {
        if ((profile?.onboarding_step || '') !== 'profile_setup') {
            await upsertOwnProfile({ id: user.id, onboarding_step: 'profile_setup' });
        }
        showProfileSetupScreen(profile, roles);
        return;
    }

    if (onboardingStep === 'trainer_connect') {
        if ((profile?.onboarding_step || '') !== 'trainer_connect') {
            await upsertOwnProfile({ id: user.id, onboarding_step: 'trainer_connect' });
        }
        showTrainerConnectScreen();
        return;
    }

    if (roles.includes('student')) {
        const connectedCode = sanitizeCodeInput(profile?.connected_trainer_code || '', 5);
        if (await openStudentDashboardForUser(user.id, connectedCode)) return;
        showTrainerConnectScreen();
        return;
    }

    window.location.href = 'trainer.html';
}

function setAuthInlineFeedback(elementId, message = '', type = 'info') {
    const feedback = document.getElementById(elementId);
    if (!feedback) return false;
    feedback.textContent = message || '';
    feedback.style.display = message ? 'block' : 'none';
    feedback.classList.remove('is-error', 'is-success', 'is-info', 'is-warning');
    if (message) feedback.classList.add(`is-${type}`);
    return true;
}

function setAuthSubmitLoading(config = {}, isLoading = false) {
    const button = document.getElementById(config.buttonId || '');
    if (!button) return;
    const textEl = document.getElementById(config.textId || '');
    const spinnerEl = document.getElementById(config.spinnerId || '');
    if (textEl && !textEl.dataset.defaultText) {
        textEl.dataset.defaultText = textEl.textContent || '';
    }
    button.disabled = !!isLoading;
    button.classList.toggle('is-loading', !!isLoading);
    if (textEl) {
        textEl.textContent = isLoading
            ? (config.loadingText || 'Carregando...')
            : (textEl.dataset.defaultText || textEl.textContent || '');
    }
    if (spinnerEl) spinnerEl.style.display = isLoading ? 'inline-block' : 'none';
}

function setProfileSetupFeedback(message, isError = false) {
    setAuthInlineFeedback('profile-setup-feedback', message, isError ? 'error' : 'success');
}

async function completeProfileSetup() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser) {
        alert('Sua sessao expirou. Faca login novamente para continuar o onboarding.');
        goToGlobalLogin();
        return;
    }

    const screen = document.getElementById('profile-setup-screen');
    let storedRoles = [];
    try {
        storedRoles = JSON.parse(screen?.dataset?.roles || memoryGetItem('currentUserRoles') || '[]');
    } catch (err) {
        storedRoles = [];
    }
    const roles = normalizeAppRoles(storedRoles, memoryGetItem('currentUserRole'));

    const hasStudent = roles.includes('student');
    const displayName = sanitizeUserInput(document.getElementById('profile-setup-name')?.value, { maxLen: 90 });
    const avatarUrl = sanitizeUserInput(document.getElementById('profile-setup-avatar')?.value, { maxLen: 300 });
    const newPass = document.getElementById('profile-setup-pass')?.value || '';
    const passConfirm = document.getElementById('profile-setup-pass-confirm')?.value || '';

    if (!displayName || displayName.length < 3) {
        setProfileSetupFeedback('Informe seu nome com pelo menos 3 caracteres.', true);
        return;
    }

    if (newPass || passConfirm) {
        const hasLetter = /[A-Za-z]/.test(newPass);
        const hasNumber = /\d/.test(newPass);
        if (newPass !== passConfirm) {
            setProfileSetupFeedback('A confirmação da senha não confere.', true);
            return;
        }
        if (newPass.length < 8 || !hasLetter || !hasNumber) {
            setProfileSetupFeedback('A senha precisa ter 8+ caracteres com letras e números.', true);
            return;
        }
    }

    setProfileSetupFeedback('');
    setAuthSubmitLoading({
        buttonId: 'profile-setup-submit-btn',
        textId: 'profile-setup-btn-text',
        spinnerId: 'profile-setup-btn-spinner',
        loadingText: 'Salvando...'
    }, true);

    try {
        if (newPass) {
            const { error: passwordError } = await window.supabase.auth.updateUser({ password: newPass });
            if (passwordError) {
                setProfileSetupFeedback(passwordError.message || 'Não foi possível atualizar a senha.', true);
                return;
            }
        }

        const { error: updateUserError } = await window.supabase.auth.updateUser({
            data: { name: displayName, roles, role: roles[0] }
        });
        if (updateUserError) {
            setProfileSetupFeedback(updateUserError.message || 'Não foi possível atualizar seus dados de conta.', true);
            return;
        }

        const targetStep = hasStudent ? 'profile_setup' : 'done';
        const profile = await upsertOwnProfile({
            id: activeUser.id,
            role: roles[0],
            roles,
            name: displayName,
            avatar_url: avatarUrl || null,
            profile_complete: true,
            onboarding_step: targetStep
        });

        if (!profile) {
            setProfileSetupFeedback('Não foi possível salvar o perfil no banco.', true);
            return;
        }

        if (!hasStudent) {
            await routeByOnboarding(activeUser, profile, roles);
            return;
        }

        memorySetItem('onboardingPendingQuestionnaire', '1');
        setProfileSetupFeedback('');
        hideAllScreens();
        const app = document.getElementById('app');
        if (app) app.classList.add('wide');
        const qScreen = document.getElementById('student-questionnaire-screen');
        if (qScreen) qScreen.classList.add('active');
        switchQTab('saude');
        const nameField = document.getElementById('q_nome');
        if (nameField && !nameField.value) nameField.value = displayName;
    } finally {
        setAuthSubmitLoading({
            buttonId: 'profile-setup-submit-btn',
            textId: 'profile-setup-btn-text',
            spinnerId: 'profile-setup-btn-spinner',
            loadingText: 'Salvando...'
        }, false);
    }
}

async function handleEmailLogin() {
    const email = sanitizeEmailInput(document.getElementById('login-email')?.value);
    const pass = document.getElementById('login-pass')?.value || '';
    const showLoginFeedback = (message, type = 'error') => {
        const hasInline = setAuthInlineFeedback('login-inline-feedback', message, type);
        if (!hasInline && message) alert(message);
    };
    showLoginFeedback('');

    if (!EMAIL_REGEX.test(email)) {
        showLoginFeedback('Informe um e-mail valido.', 'error');
        return;
    }

    if (typeof window.supabase?.auth?.signInWithPassword !== 'function') {
        showLoginFeedback('Login indisponivel. Configure o Supabase primeiro.', 'error');
        return;
    }

    setAuthSubmitLoading({
        buttonId: 'login-submit-btn',
        textId: 'login-btn-text',
        spinnerId: 'login-btn-spinner',
        loadingText: 'Entrando...'
    }, true);

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password: pass
        });

        if (error || !data?.user) {
            showLoginFeedback('E-mail ou senha incorretos.', 'error');
            return;
        }

        if (!isEmailConfirmed(data.user)) {
            await window.supabase.auth.signOut();
            memorySetItem('pendingVerificationEmail', email);
            showLoginFeedback('Seu e-mail ainda nao foi verificado. Use "Reenviar verificacao de e-mail".', 'warning');
            return;
        }

        await processLogin({
            id: data.user.id,
            roles: normalizeAppRoles(data.user?.user_metadata?.roles, data.user?.user_metadata?.role),
            name: sanitizeUserInput(data.user?.user_metadata?.name || data.user?.email || 'Usuário', { maxLen: 90 }),
            email: data.user?.email || '',
            trainerCode: ''
        });
    } finally {
        setAuthSubmitLoading({
            buttonId: 'login-submit-btn',
            textId: 'login-btn-text',
            spinnerId: 'login-btn-spinner',
            loadingText: 'Entrando...'
        }, false);
    }
}

function handleTestLogin() {
    const showLoginFeedback = (message, type = 'info') => {
        const hasInline = setAuthInlineFeedback('login-inline-feedback', message, type);
        if (!hasInline && message) alert(message);
    };

    if (!ENABLE_DEMO_ACCESS) {
        showLoginFeedback('Acesso de teste disponivel apenas em ambiente local.', 'warning');
        return;
    }

    ensureAdminStudent();
    const students = readStorageJSON('trainerStudents', []);
    const demoStudent = students.find((s) => String(s.id) === String(ADMIN_STUDENT_CODE)) || {
        id: ADMIN_STUDENT_CODE,
        name: ADMIN_STUDENT_NAME,
        trainerCode: '00001',
        active: true,
        pending: false
    };

    showLoginFeedback('Entrando em modo teste...', 'success');
    openStudentDashboardSession(demoStudent);
}

async function resendVerificationEmailFromLogin() {
    const emailInput = sanitizeEmailInput(document.getElementById('login-email')?.value);
    const rememberedEmail = sanitizeEmailInput(memoryGetItem('pendingVerificationEmail') || '');
    const email = emailInput || rememberedEmail;

    if (!EMAIL_REGEX.test(email)) {
        const hasInline = setAuthInlineFeedback('login-inline-feedback', 'Digite seu e-mail para reenviar a verificacao.', 'error');
        if (!hasInline) alert('Digite seu e-mail no campo acima para reenviar a verificacao.');
        return;
    }
    if (typeof window.supabase?.auth?.resend !== 'function') {
        const hasInline = setAuthInlineFeedback('login-inline-feedback', 'Reenvio indisponivel no momento.', 'error');
        if (!hasInline) alert('Reenvio indisponivel no momento.');
        return;
    }

    const { error } = await window.supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/` }
    });
    if (error) {
        const hasInline = setAuthInlineFeedback('login-inline-feedback', error.message || 'Nao foi possivel reenviar o e-mail de verificacao.', 'error');
        if (!hasInline) alert(error.message || 'Nao foi possivel reenviar o e-mail de verificacao.');
        return;
    }

    memorySetItem('pendingVerificationEmail', email);
    const hasInline = setAuthInlineFeedback('login-inline-feedback', 'Enviamos um novo e-mail de verificacao. Confira sua caixa de entrada e spam.', 'success');
    if (!hasInline) alert('Enviamos um novo e-mail de verificacao. Confira sua caixa de entrada e spam.');
}

async function handleProfileCreation() {
    const name = sanitizeUserInput(document.getElementById('reg-name')?.value, { maxLen: 90 });
    const email = sanitizeEmailInput(document.getElementById('reg-email')?.value);
    const pass = document.getElementById('reg-pass').value;
    const passConfirm = document.getElementById('reg-pass-confirm')?.value || '';
    const acceptedTerms = !!document.getElementById('reg-terms')?.checked;
    const rawRole = document.querySelector('input[name="reg-role"]:checked')?.value || 'student';
    const roles = rolesFromChoice(rawRole);

    const showSignupFeedback = (message, type = 'error') => {
        const hasInline = setAuthInlineFeedback('signup-inline-feedback', message, type);
        if (!hasInline && message) alert(message);
    };
    showSignupFeedback('');

    if (!name || !email || !pass || !passConfirm) {
        showSignupFeedback('Preencha todos os campos para criar sua conta.', 'error');
        return;
    }

    if (name.length < 3) {
        showSignupFeedback('Informe seu nome completo (minimo 3 caracteres).', 'error');
        return;
    }

    if (!EMAIL_REGEX.test(email)) {
        showSignupFeedback('Informe um e-mail valido.', 'error');
        return;
    }

    const hasLetter = /[A-Za-z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    if (pass.length < 8 || !hasLetter || !hasNumber) {
        showSignupFeedback('A senha deve ter ao menos 8 caracteres, com letras e numeros.', 'error');
        return;
    }

    if (pass !== passConfirm) {
        showSignupFeedback('A confirmacao de senha nao confere.', 'error');
        return;
    }

    if (!acceptedTerms) {
        showSignupFeedback('Voce precisa aceitar os Termos de Uso para continuar.', 'error');
        return;
    }

    if (typeof window.supabase?.auth?.signUp !== 'function') {
        showSignupFeedback('Cadastro indisponivel. Configure o Supabase primeiro.', 'error');
        return;
    }

    setAuthSubmitLoading({
        buttonId: 'signup-submit-btn',
        textId: 'signup-btn-text',
        spinnerId: 'signup-btn-spinner',
        loadingText: 'Criando conta...'
    }, true);

    try {
        const { data, error } = await window.supabase.auth.signUp({
            email,
            password: pass,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: {
                    name,
                    roles,
                    role: roles[0]
                }
            }
        });

        if (error) {
            showSignupFeedback(error.message || 'Nao foi possivel criar sua conta.', 'error');
            return;
        }

        const user = data?.user;
        if (!user) {
            showSignupFeedback('Conta criada, mas nao foi possivel carregar seu perfil.', 'error');
            return;
        }

        if (data?.session?.user) {
            const trainerCode = roles.includes('trainer') ? await generateUniqueTrainerCode() : '';
            await upsertOwnProfile({
                id: user.id,
                role: roles[0],
                roles,
                name,
                trainer_code: trainerCode || null,
                profile_complete: false,
                onboarding_step: 'pending_verification'
            });
            await window.supabase.auth.signOut();
        }

        memorySetItem('pendingVerificationEmail', email);
        showSignupFeedback('Conta criada com sucesso. Verifique seu e-mail para continuar.', 'success');
        setTimeout(() => goToGlobalLogin(), 900);
    } finally {
        setAuthSubmitLoading({
            buttonId: 'signup-submit-btn',
            textId: 'signup-btn-text',
            spinnerId: 'signup-btn-spinner',
            loadingText: 'Criando conta...'
        }, false);
    }
}

async function handleGoogleLogin() {
    if (typeof window.supabase?.auth?.signInWithOAuth !== 'function') {
        alert('Login Google indisponivel no momento.');
        return;
    }
    const { error } = await window.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` }
    });
    if (error) {
        alert(error.message || 'Nao foi possivel iniciar o login com Google.');
    }
}

async function processLogin(user) {
    const sessionUser = await getSupabaseSessionUser();
    const activeUser = sessionUser || user || null;
    if (!activeUser?.id) {
        alert('Sessao invalida. Faca login novamente.');
        goToGlobalLogin();
        return;
    }

    if (!isEmailConfirmed(activeUser)) {
        await window.supabase.auth.signOut();
        alert('Verifique seu e-mail antes de acessar o aplicativo.');
        goToGlobalLogin();
        return;
    }

    const safeUserName = sanitizeUserInput(user?.name || activeUser?.user_metadata?.name || activeUser?.email || 'Usuário', { maxLen: 90 }) || 'Usuário';
    const safeEmail = sanitizeEmailInput(activeUser?.email || user?.email || '');
    const requestedRoles = normalizeAppRoles(user?.roles, user?.role || activeUser?.user_metadata?.role);
    let profile = await getProfileByUserId(activeUser.id);

    if (!profile) {
        let trainerCode = '';
        if (requestedRoles.includes('trainer')) trainerCode = await generateUniqueTrainerCode();
        profile = await upsertOwnProfile({
            id: activeUser.id,
            role: requestedRoles[0],
            roles: requestedRoles,
            name: safeUserName,
            trainer_code: trainerCode || null,
            profile_complete: false,
            onboarding_step: 'profile_setup'
        });
    }

    if (!profile) {
        alert('Nao foi possivel carregar seu perfil. Tente novamente.');
        return;
    }

    const roles = normalizeAppRoles(profile.roles, profile.role || requestedRoles[0]);
    const needsTrainerCode = roles.includes('trainer') && !sanitizeCodeInput(profile.trainer_code || '', 5);
    if (needsTrainerCode) {
        const trainerCode = await generateUniqueTrainerCode();
        profile = (await upsertOwnProfile({
            id: activeUser.id,
            trainer_code: trainerCode,
            role: roles[0],
            roles
        })) || { ...profile, trainer_code: trainerCode };
    }

    if (safeEmail) memorySetItem('currentUserEmail', safeEmail);
    memorySetItem('studentName', safeUserName);
    memorySetItem('trainerName', safeUserName.split(' ')[0]);
    if (profile?.trainer_code) memorySetItem('currentTrainerCode', sanitizeCodeInput(profile.trainer_code, 5));
    await runOneShotLegacyMigration(activeUser, profile, roles);

    await routeByOnboarding(activeUser, profile, roles);
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        goToGlobalLogin,
        goToProfileCreate,
        handleEmailLogin,
        handleGoogleLogin,
        resendVerificationEmailFromLogin,
        handleProfileCreation,
        handleTestLogin,
        completeProfileSetup,
        connectStudent,
        confirmConnection,
        openTrainerArea,
        goToTrainerArea,
        goToTrainerCreate,
        connectTrainer,
        createConsultoria,
        goToHome,
        goBackFromStudentConnect,
        openStudentConnectFromDashboard,
        repeatPreviousDietDay,
        undoRepeatPreviousDietDay,
        toggleDietDayCompletion,
        openPerfilAnamnesisModal,
        closePerfilAnamnesisModal
    });
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

async function switchStudentView(view) {
    const protectedViews = ['home', 'treino', 'dieta', 'perfil', 'log-workout', 'workout-summary'];
    if (protectedViews.includes(view) && !ENABLE_DEMO_ACCESS) {
        const activeUser = await getSupabaseSessionUser();
        if (!activeUser || !isEmailConfirmed(activeUser)) {
            clearAuthRuntimeContext();
            goToGlobalLogin();
            return;
        }
    }
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
    const navConnect = document.getElementById('snav-connect');
    if (navConnect) navConnect.classList.remove('active');

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
        title: `?? Treino atualizado - ${studentName}`,
        desc: `[Plano de treino atualizado] ${blocks.length} treino(s), ${totalExercises} exercícios.`,
        time: new Date().toISOString(),
        unread: true
    });
    memorySetItem('trainerNotifications', JSON.stringify(notifs));
    memorySetItem(lastKey, String(now));
    syncChannel.postMessage({ type: 'NEW_DOUBT', payload: { studentId } });
}

function promptStudentField(label, defaultValue = '', options = {}) {
    const raw = prompt(label, defaultValue || '');
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
        title: `?? Dúvida de ${safeName}`,
        desc: safeText || '[Mídia enviada]',
        media,
        time: nowIso,
        unread: true
    });

    memorySetItem('trainerNotifications', JSON.stringify(notifications));
    updateStudentRecord(studentId, { lastMessageAt: nowIso });
    syncChannel.postMessage({ type: 'NEW_DOUBT', payload: { studentId } });
    if (document.getElementById('duvidas-nav-badge')) {
        updateTrainerStats();
        renderDuvidas();
    }
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
    const trimmed = Array.isArray(messages) ? messages.slice(-200) : [];
    memorySetItem(getStudentChatStorageKey(studentId), JSON.stringify(trimmed));
    setStudentChatMessages(studentId, trimmed);
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

        saveStudentData(students);
        renderStudentPerfil();
        syncChannel.postMessage({ type: 'student_data_updated' });
    }
}

// --- Q&A / Dúvidas ----------------------------------------------------------

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
        title: `?? Dúvida de ${studentName}`,
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
    alert('? Dúvida enviada com sucesso! Seu treinador receberá a mensagem.');
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

function computeDietMacroData(student, dateKey = getTodayDateKey()) {
    const blocks = Array.isArray(student?.mealBlocks) ? student.mealBlocks : [];
    const dayLog = getStudentDietLogForDate(student, dateKey);
    let prescribedProtein = 0;
    let prescribedCarb = 0;
    let prescribedFat = 0;
    let consumedProtein = 0;
    let consumedCarb = 0;
    let consumedFat = 0;
    let consumedKcal = 0;
    let checkedItems = 0;
    let totalItems = 0;

    blocks.forEach((meal, mealIdx) => {
        (meal.items || []).forEach((item, itemIdx) => {
            totalItems += 1;
            const base = getDietItemBaseMacros(item);
            prescribedProtein += base.prot;
            prescribedCarb += base.carb;
            prescribedFat += base.gord;

            const logEntry = getDietLogItem(dayLog, mealIdx, itemIdx);
            if (!logEntry || !logEntry.checked) return;
            checkedItems += 1;
            const consumed = computeDietConsumedMacros(item, logEntry);
            consumedProtein += consumed.prot;
            consumedCarb += consumed.carb;
            consumedFat += consumed.gord;
            consumedKcal += consumed.kcal;
        });
    });

    const targetProtein = Math.max(1, parseDecimalSafe(student?.dietMeta?.protein) || prescribedProtein || 150);
    const targetCarb = Math.max(1, parseDecimalSafe(student?.dietMeta?.carb) || prescribedCarb || 220);
    const targetFat = Math.max(1, parseDecimalSafe(student?.dietMeta?.fat) || prescribedFat || 70);
    const targetKcal = Math.max(1, parseDecimalSafe(student?.dietMeta?.kcal) || Math.round((targetProtein * 4) + (targetCarb * 4) + (targetFat * 9)));

    return {
        totals: {
            prescribed: {
                protein: Math.round(prescribedProtein),
                carb: Math.round(prescribedCarb),
                fat: Math.round(prescribedFat)
            },
            consumed: {
                protein: Math.round(consumedProtein),
                carb: Math.round(consumedCarb),
                fat: Math.round(consumedFat),
                kcal: Math.round(consumedKcal)
            }
        },
        targets: {
            protein: Math.round(targetProtein),
            carb: Math.round(targetCarb),
            fat: Math.round(targetFat),
            kcal: Math.round(targetKcal)
        },
        progress: {
            protein: Math.min(100, Math.max(0, Math.round((consumedProtein / targetProtein) * 100))),
            carb: Math.min(100, Math.max(0, Math.round((consumedCarb / targetCarb) * 100))),
            fat: Math.min(100, Math.max(0, Math.round((consumedFat / targetFat) * 100))),
            kcal: Math.min(100, Math.max(0, Math.round((consumedKcal / targetKcal) * 100)))
        },
        completion: {
            done: checkedItems,
            total: totalItems
        }
    };
}

function getTodayDateKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseQuantityNumeric(value) {
    const n = parseDecimalSafe(String(value || '').replace(/[^\d,.\-]/g, '').replace(',', '.'));
    return n > 0 ? n : 0;
}

function getDietItemBaseMacros(item) {
    const prot = parseDecimalSafe(item?.prot);
    const carb = parseDecimalSafe(item?.carb);
    const gord = parseDecimalSafe(item?.gord);
    const kcal = parseDecimalSafe(item?.kcal) || Math.round((prot * 4) + (carb * 4) + (gord * 9));
    return { prot, carb, gord, kcal };
}

function getDietLogItem(dayLog, mealIdx, itemIdx) {
    return dayLog?.meals?.[mealIdx]?.items?.[itemIdx] || null;
}

function getStudentDietLogForDate(student, dateKey) {
    const logs = (student && typeof student.dietLogs === 'object' && student.dietLogs) ? student.dietLogs : {};
    const dayLog = logs[dateKey];
    if (dayLog && typeof dayLog === 'object') return dayLog;
    return { meals: {} };
}

function computeDietConsumedMacros(baseItem, logEntry) {
    if (logEntry?.substitute?.enabled) {
        const sub = logEntry.substitute || {};
        const parsedSubQty = parseAmountAndUnit(sub.qty || '', sub.unitKey || sub.unit_key || sub.baseUnit || sub.base_unit || 'g');
        const subCalc = computeMacrosByAmount({
            id: sub.foodId || '',
            name: sub.name || baseItem?.nome || 'Substituto',
            base_qty: Math.max(0.1, parseDecimalSafe(sub.baseQty || sub.base_qty) || 100),
            base_unit: normalizeFoodUnitKey(sub.baseUnit || sub.base_unit || parsedSubQty.unit || 'g'),
            kcal: parseDecimalSafe(sub.kcal),
            protein: parseDecimalSafe(sub.prot),
            carb: parseDecimalSafe(sub.carb),
            fat: parseDecimalSafe(sub.gord)
        }, Math.max(0.1, parseDecimalSafe(sub.amount) || parsedSubQty.amount || parseDecimalSafe(sub.baseQty || sub.base_qty) || 1), normalizeFoodUnitKey(sub.unitKey || sub.unit_key || parsedSubQty.unit || 'g'), sub.portionId || sub.portion_id || '');
        return { prot: subCalc.protein, carb: subCalc.carb, gord: subCalc.fat, kcal: subCalc.kcal };
    }

    const base = getDietItemBaseMacros(baseItem);
    const parsedQty = parseAmountAndUnit(logEntry?.qty || '', logEntry?.unitKey || logEntry?.unit_key || baseItem?.unitKey || baseItem?.baseUnit || baseItem?.base_unit || 'g');
    const amount = Math.max(0.1, parseDecimalSafe(logEntry?.amount) || parsedQty.amount || parseDecimalSafe(baseItem?.amount) || parseQuantityNumeric(baseItem?.qtd) || 1);
    const unitKey = normalizeFoodUnitKey(logEntry?.unitKey || logEntry?.unit_key || parsedQty.unit || baseItem?.unitKey || baseItem?.baseUnit || baseItem?.base_unit || 'g');
    const foodFromCache = (foodCatalogCache || []).find((item) => String(item.id || '') === String(baseItem?.foodId || ''));
    const foodPayload = {
        id: baseItem?.foodId || '',
        name: baseItem?.nome || baseItem?.name || foodFromCache?.name || 'Alimento',
        base_qty: Math.max(0.1, parseDecimalSafe(baseItem?.baseQty) || parseQuantityNumeric(baseItem?.qtd) || 1),
        base_unit: normalizeFoodUnitKey(baseItem?.baseUnit || baseItem?.base_unit || foodFromCache?.base_unit || 'g'),
        kcal: base.kcal,
        protein: base.prot,
        carb: base.carb,
        fat: base.gord,
        portions: getFoodPortions(foodFromCache || baseItem || {})
    };
    const calc = computeMacrosByAmount(foodPayload, amount, unitKey, logEntry?.portionId || logEntry?.portion_id || baseItem?.portionId || baseItem?.portion_id || '');
    return { prot: calc.protein, carb: calc.carb, gord: calc.fat, kcal: calc.kcal };
}

function renderStudentDietContent(student) {
    const selectedDate = studentDietSelectedDateKey || getTodayDateKey();
    const macro = computeDietMacroData(student, selectedDate);
    const meals = Array.isArray(student?.mealBlocks) ? student.mealBlocks : [];
    const dayLog = getStudentDietLogForDate(student, selectedDate);
    const weekly = buildWeeklyDietSummary(student, selectedDate);
    const completionPercent = macro.completion.total > 0
        ? Math.round((macro.completion.done / macro.completion.total) * 100)
        : 0;
    const isDayCompleted = !!dayLog?.meta?.completed;
    const completionLabel = isDayCompleted ? 'Dia concluído' : `${completionPercent}% concluído`;
    const statusClass = isDayCompleted ? 'done' : 'pending';
    const canUndoCopy = !!(
        studentDietRepeatUndoState
        && String(studentDietRepeatUndoState.studentId || '') === String(student.id || '')
        && studentDietRepeatUndoState.dateKey === selectedDate
    );

    const summaryCard = `
        <div class="diet-modern-summary-card">
            <div class="diet-modern-summary-head">
                <div class="diet-modern-summary-title">Macros Diários</div>
                <span class="diet-modern-day-status ${statusClass}">${completionLabel}</span>
            </div>
            <div class="diet-modern-date-controls">
                <button type="button" class="diet-modern-icon-btn" onclick="setStudentDietDate('${getDateKeyShift(selectedDate, -1)}')"><i class="ph-bold ph-caret-left"></i></button>
                <input type="date" class="diet-modern-date-input" value="${selectedDate}" onchange="setStudentDietDate(this.value)">
                <button type="button" class="diet-modern-icon-btn" onclick="setStudentDietDate('${getDateKeyShift(selectedDate, 1)}')"><i class="ph-bold ph-caret-right"></i></button>
            </div>
            <div class="diet-progress-row">
                <div class="diet-progress-label protein">${uiSvgIcon('protein')} Proteína</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill protein" style="width:${macro.progress.protein}%"></span></div>
                <div class="diet-progress-value">${macro.totals.consumed.protein}/${macro.targets.protein}g</div>
            </div>
            <div class="diet-progress-row">
                <div class="diet-progress-label carb">${uiSvgIcon('carb')} Carboidrato</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill carb" style="width:${macro.progress.carb}%"></span></div>
                <div class="diet-progress-value">${macro.totals.consumed.carb}/${macro.targets.carb}g</div>
            </div>
            <div class="diet-progress-row">
                <div class="diet-progress-label fat">${uiSvgIcon('fat')} Gordura</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill fat" style="width:${macro.progress.fat}%"></span></div>
                <div class="diet-progress-value">${macro.totals.consumed.fat}/${macro.targets.fat}g</div>
            </div>
            <div class="diet-progress-row">
                <div class="diet-progress-label kcal"><i class="ph-fill ph-fire"></i> Calorias</div>
                <div class="diet-progress-bar"><span class="diet-progress-fill fat" style="width:${macro.progress.kcal}%"></span></div>
                <div class="diet-progress-value">${macro.totals.consumed.kcal}/${macro.targets.kcal} kcal</div>
            </div>
            <div class="diet-modern-summary-foot">${selectedDate} · ${macro.completion.done}/${macro.completion.total} alimentos marcados</div>
            <div class="diet-modern-day-actions">
                <button type="button" class="diet-modern-ghost-btn" onclick="repeatPreviousDietDay()">
                    Repetir dia anterior
                </button>
                ${canUndoCopy ? `
                    <button type="button" class="diet-modern-ghost-btn" onclick="undoRepeatPreviousDietDay()">
                        Desfazer cópia
                    </button>
                ` : ''}
                <button type="button" class="diet-modern-cta-btn ${isDayCompleted ? 'done' : ''}" onclick="toggleDietDayCompletion()">
                    ${isDayCompleted ? 'Reabrir dia alimentar' : 'Concluir dia alimentar'}
                </button>
            </div>
        </div>
        <div class="diet-modern-weekly-card">
            <div class="diet-modern-weekly-title">Resumo Semanal</div>
            <div class="diet-modern-weekly-grid">
                <div><span>Aderência média</span><strong>${weekly.avgAdherence}%</strong></div>
                <div><span>Kcal média</span><strong>${weekly.avgKcal}</strong></div>
                <div><span>Proteína média</span><strong>${weekly.avgProtein}g</strong></div>
                <div><span>Carbo médio</span><strong>${weekly.avgCarb}g</strong></div>
                <div><span>Gordura média</span><strong>${weekly.avgFat}g</strong></div>
            </div>
            <div class="diet-modern-weekly-days">
                ${weekly.days.map((d) => `<span class="diet-week-day">${d.key.slice(5)} · ${d.adherence}%</span>`).join('')}
            </div>
        </div>
    `;

    const mealCards = meals.map((meal, mealIdx) => {
        const mealItems = Array.isArray(meal?.items) ? meal.items : [];
        const doneItems = mealItems.reduce((acc, _item, itemIdx) => acc + (getDietLogItem(dayLog, mealIdx, itemIdx)?.checked ? 1 : 0), 0);
        const mealProgressLabel = mealItems.length
            ? `${doneItems}/${mealItems.length} itens concluídos`
            : 'Sem itens cadastrados';
        return `
        <div class="diet-modern-meal-card tone-${mealIdx % 3}" style="--meal-order:${mealIdx};">
            <div class="diet-modern-meal-header">
                <div class="diet-modern-meal-title-wrap">
                    <h3>${escHtml(meal.name)}</h3>
                    <span class="diet-modern-meal-meta">${mealProgressLabel}</span>
                </div>
                <div class="diet-modern-meal-actions">
                    <button type="button" class="diet-modern-check-all-btn ${isStudentMealCompleted(dayLog, mealIdx, meal) ? 'done' : ''}" onclick="toggleDietMealCheck(${mealIdx})" title="Marcar ou desmarcar todos os itens">
                        ${isStudentMealCompleted(dayLog, mealIdx, meal) ? 'Desfazer' : 'Marcar tudo'}
                    </button>
                    <button type="button" class="diet-modern-icon-btn" onclick="toggleStudentMealAddForm(${mealIdx})" title="Adicionar alimento">
                        <i class="ph-bold ph-plus"></i>
                    </button>
                    <button type="button" class="diet-modern-icon-btn ${isStudentMealCompleted(dayLog, mealIdx, meal) ? 'done' : ''}" onclick="toggleDietMealCheck(${mealIdx})" title="Marcar refeição completa">
                        <i class="ph-bold ${isStudentMealCompleted(dayLog, mealIdx, meal) ? 'ph-check-circle' : 'ph-circle'}"></i>
                    </button>
                </div>
            </div>
            ${activeStudentMealAddFormIdx === mealIdx ? `
                <div class="diet-modern-add-food-box">
                    <input type="text" class="diet-modern-input" placeholder="Alimento" value="${escHtml(studentDietMealDraft.name || '')}" oninput="updateStudentMealDraftName(this.value)">
                    <input type="text" class="diet-modern-input" placeholder="Quantidade (ex: 120g)" value="${escHtml(studentDietMealDraft.qtd || '')}" oninput="updateStudentMealDraftField('qtd', this.value)">
                    <input type="number" class="diet-modern-input" placeholder="kcal" value="${escHtml(studentDietMealDraft.kcal || '')}" oninput="updateStudentMealDraftField('kcal', this.value)">
                    <input type="number" class="diet-modern-input" placeholder="Proteína" value="${escHtml(studentDietMealDraft.prot || '')}" oninput="updateStudentMealDraftField('prot', this.value)">
                    <input type="number" class="diet-modern-input" placeholder="Carboidrato" value="${escHtml(studentDietMealDraft.carb || '')}" oninput="updateStudentMealDraftField('carb', this.value)">
                    <input type="number" class="diet-modern-input" placeholder="Gordura" value="${escHtml(studentDietMealDraft.gord || '')}" oninput="updateStudentMealDraftField('gord', this.value)">
                    ${studentDietFoodSearchResults.length ? `
                        <div class="diet-modern-draft-results">
                            ${studentDietFoodSearchResults.map((food, idx) => `
                                <button type="button" class="diet-modern-draft-item" onclick="selectStudentMealDraftFood(${idx})">
                                    <strong>${escHtml(food.name)}</strong>
                                    <span>${food.kcal}kcal · P ${food.protein}g · C ${food.carb}g · G ${food.fat}g (${formatFoodQuantity(food.base_qty, food.base_unit)})</span>
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="diet-modern-add-food-actions">
                        <button type="button" class="diet-modern-save-btn" onclick="saveStudentMealDraft(${mealIdx})">Salvar alimento</button>
                        <button type="button" class="diet-modern-cancel-btn" onclick="toggleStudentMealAddForm(${mealIdx})">Cancelar</button>
                    </div>
                </div>
            ` : ''}
            <div class="diet-modern-food-list">
                ${(meal.items || []).map((item, itemIdx) => {
                    const logEntry = getDietLogItem(dayLog, mealIdx, itemIdx);
                    const checked = !!logEntry?.checked;
                    const base = getDietItemBaseMacros(item);
                    const consumed = computeDietConsumedMacros(item, logEntry || {});
                    const qtyValue = logEntry?.qty || item.qtd || '';
                    const substituteEnabled = !!logEntry?.substitute?.enabled;
                    const sub = logEntry?.substitute || {};
                    return `<div class="diet-modern-food-row ${checked ? 'is-checked' : ''}">
                        <div class="diet-modern-food-main">
                            <div style="flex:1;">
                                <label class="diet-modern-check">
                                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleDietItemCheck(${mealIdx}, ${itemIdx}, this.checked)">
                                    <span class="diet-food-detail-trigger student" title="Clique para ver detalhes nutricionais"
                                        onclick="event.preventDefault(); event.stopPropagation(); openFoodDetailsFromStudentItem(${mealIdx}, ${itemIdx});">${escHtml(item.nome)}</span>
                                </label>
                                <span class="diet-modern-base-qty">Base: ${escHtml(item.qtd || '--')}</span>
                            </div>
                            ${item.addedByStudent ? `
                                <button type="button" class="diet-modern-trash-btn" onclick="removeStudentMealFood(${mealIdx}, ${itemIdx})" title="Remover alimento">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="diet-modern-food-controls">
                            <input type="text" class="diet-modern-input" value="${escHtml(qtyValue)}" placeholder="Quantidade consumida"
                                oninput="updateDietItemQty(${mealIdx}, ${itemIdx}, this.value)">
                            <button type="button" class="diet-modern-sub-btn ${substituteEnabled ? 'active' : ''}" onclick="openDietItemSubstitutePicker(${mealIdx}, ${itemIdx})">
                                ${substituteEnabled ? 'Trocar substituto' : 'Substituir alimento'}
                            </button>
                            ${substituteEnabled ? `
                                <button type="button" class="diet-modern-sub-btn" onclick="toggleDietItemSubstitute(${mealIdx}, ${itemIdx})">
                                    Cancelar
                                </button>
                            ` : ''}
                        </div>
                        ${substituteEnabled ? `
                        <div class="diet-modern-substitute-box">
                            <div class="diet-substitute-summary">
                                <strong>${escHtml(sub.name || 'Substituto')}</strong>
                                <span>${escHtml(sub.qty || '--')}</span>
                            </div>
                            <div class="diet-modern-macro-chips">
                                <span class="diet-modern-chip kcal">${parseDecimalSafe(sub.kcal) || 0} kcal</span>
                                <span class="diet-modern-chip protein">${uiSvgIcon('protein')} ${parseDecimalSafe(sub.prot) || 0}g P</span>
                                <span class="diet-modern-chip carb">${uiSvgIcon('carb')} ${parseDecimalSafe(sub.carb) || 0}g C</span>
                                <span class="diet-modern-chip fat">${uiSvgIcon('fat')} ${parseDecimalSafe(sub.gord) || 0}g G</span>
                            </div>
                        </div>` : ''}
                        <div class="diet-modern-macro-chips">
                            <span class="diet-modern-chip kcal">${checked ? consumed.kcal : base.kcal} kcal</span>
                            <span class="diet-modern-chip protein">${uiSvgIcon('protein')} ${(checked ? consumed.prot : base.prot)}g P</span>
                            <span class="diet-modern-chip carb">${uiSvgIcon('carb')} ${(checked ? consumed.carb : base.carb)}g C</span>
                            <span class="diet-modern-chip fat">${uiSvgIcon('fat')} ${(checked ? consumed.gord : base.gord)}g G</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
    }).join('');

    return `${summaryCard}${mealCards}`;
}

function getDateKeyShift(baseDateKey, shiftDays) {
    const base = new Date(`${baseDateKey}T00:00:00`);
    if (Number.isNaN(base.getTime())) return baseDateKey;
    base.setDate(base.getDate() + shiftDays);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function buildWeeklyDietSummary(student, endDateKey = getTodayDateKey()) {
    const days = [];
    let sumProtein = 0;
    let sumCarb = 0;
    let sumFat = 0;
    let sumKcal = 0;
    let sumAdherence = 0;
    for (let i = 6; i >= 0; i -= 1) {
        const key = getDateKeyShift(endDateKey, -i);
        const daily = computeDietMacroData(student, key);
        const adherence = daily.completion.total > 0 ? Math.round((daily.completion.done / daily.completion.total) * 100) : 0;
        sumProtein += daily.totals.consumed.protein;
        sumCarb += daily.totals.consumed.carb;
        sumFat += daily.totals.consumed.fat;
        sumKcal += daily.totals.consumed.kcal;
        sumAdherence += adherence;
        days.push({ key, adherence, kcal: daily.totals.consumed.kcal });
    }
    return {
        days,
        avgProtein: Math.round(sumProtein / 7),
        avgCarb: Math.round(sumCarb / 7),
        avgFat: Math.round(sumFat / 7),
        avgKcal: Math.round(sumKcal / 7),
        avgAdherence: Math.round(sumAdherence / 7)
    };
}

function getDietDailyCompletion(student, dateKey = getTodayDateKey()) {
    const daily = computeDietMacroData(student, dateKey);
    const completion = daily.completion.total > 0
        ? Math.round((daily.completion.done / daily.completion.total) * 100)
        : 0;
    return {
        done: daily.completion.done,
        total: daily.completion.total,
        percent: completion
    };
}

function cloneDietDayLog(dayLog = {}, mealBlocks = []) {
    const next = {
        meals: {}
    };
    const sourceMeals = dayLog?.meals && typeof dayLog.meals === 'object' ? dayLog.meals : {};
    (Array.isArray(mealBlocks) ? mealBlocks : []).forEach((meal, mealIdx) => {
        const sourceMeal = sourceMeals?.[mealIdx] || {};
        const sourceItems = sourceMeal?.items && typeof sourceMeal.items === 'object' ? sourceMeal.items : {};
        const targetItems = {};
        (Array.isArray(meal?.items) ? meal.items : []).forEach((_, itemIdx) => {
            const sourceItem = sourceItems?.[itemIdx] || {};
            targetItems[itemIdx] = {
                checked: !!sourceItem.checked,
                qty: String(sourceItem.qty || ''),
                amount: Math.max(0.1, parseDecimalSafe(sourceItem.amount) || parseAmountAndUnit(sourceItem.qty || '', sourceItem.unitKey || sourceItem.unit_key || 'g').amount || 1),
                unitKey: normalizeFoodUnitKey(sourceItem.unitKey || sourceItem.unit_key || parseAmountAndUnit(sourceItem.qty || '', 'g').unit || 'g'),
                portionId: String(sourceItem.portionId || sourceItem.portion_id || ''),
                portionLabel: sanitizeUserInput(sourceItem.portionLabel || sourceItem.portion_label || '', { maxLen: 80 }),
                substitute: sourceItem?.substitute && typeof sourceItem.substitute === 'object'
                    ? { ...sourceItem.substitute }
                    : { enabled: false }
            };
        });
        next.meals[mealIdx] = { items: targetItems };
    });
    if (dayLog?.meta && typeof dayLog.meta === 'object') {
        next.meta = { ...dayLog.meta };
    }
    return next;
}

let activeStudentMealAddFormIdx = null;
let studentDietMealDraft = { name: '', qtd: '', kcal: '', prot: '', carb: '', gord: '' };
let studentDietSelectedDateKey = getTodayDateKey();
let studentDietFoodSearchResults = [];
let studentDietFoodSearchTimer = null;
let studentDietRepeatUndoState = null;
let dietFoodPickerState = {
    open: false,
    view: 'list',
    context: '',
    mealIdx: null,
    itemIdx: null,
    baseItem: null,
    query: '',
    loading: false,
    allResults: [],
    results: [],
    selected: null,
    qty: '',
    qtyTouched: false,
    highlightIndex: -1,
    listScrollTop: 0,
    filters: {
        favoritesOnly: false,
        recentOnly: false
    }
};
let dietFoodPickerTimer = null;

function setStudentDietDate(dateKey) {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) ? String(dateKey) : getTodayDateKey();
    studentDietSelectedDateKey = safe;
    activeStudentMealAddFormIdx = null;
    refreshStudentDietViews();
}

function repeatPreviousDietDay() {
    if (!ensureDietWriteAllowed('student')) return;
    const { studentId, students, student } = getStudentData();
    if (!student) return;
    const targetDate = studentDietSelectedDateKey || getTodayDateKey();
    const previousDate = getDateKeyShift(targetDate, -1);
    const previousDayLog = getStudentDietLogForDate(student, previousDate);
    const hasSourceData = Object.keys(previousDayLog?.meals || {}).length > 0;
    if (!hasSourceData) {
        showDietRuntimeMessage('Não há dados no dia anterior para copiar.', 'info');
        return;
    }
    const currentDayLog = getStudentDietLogForDate(student, targetDate);
    const nextDayLog = cloneDietDayLog(previousDayLog, student.mealBlocks || []);
    nextDayLog.meta = {
        ...(nextDayLog.meta || {}),
        copiedFrom: previousDate,
        copiedAt: new Date().toISOString(),
        completed: false
    };

    const idx = students.findIndex((s) => String(s.id) === String(studentId));
    if (idx < 0) return;
    if (!students[idx].dietLogs || typeof students[idx].dietLogs !== 'object') students[idx].dietLogs = {};
    studentDietRepeatUndoState = {
        studentId: String(studentId),
        dateKey: targetDate,
        previousSnapshot: cloneDietDayLog(currentDayLog, student.mealBlocks || [])
    };
    students[idx].dietLogs[targetDate] = nextDayLog;
    saveStudentData(students);
    queueEntityDietLogsSync(students[idx], targetDate);
    setStudentSyncState('pending', 'Sincronização pendente');
    showDietRuntimeMessage('Plano copiado do dia anterior.', 'success');
    refreshStudentDietViews();
}

function undoRepeatPreviousDietDay() {
    if (!ensureDietWriteAllowed('student')) return;
    const { studentId, students } = getStudentData();
    const targetDate = studentDietSelectedDateKey || getTodayDateKey();
    const canUndo = !!(
        studentDietRepeatUndoState
        && String(studentDietRepeatUndoState.studentId || '') === String(studentId || '')
        && studentDietRepeatUndoState.dateKey === targetDate
    );
    if (!canUndo) {
        showDietRuntimeMessage('Nenhuma cópia recente para desfazer.', 'info');
        return;
    }
    const idx = students.findIndex((s) => String(s.id) === String(studentId));
    if (idx < 0) return;
    if (!students[idx].dietLogs || typeof students[idx].dietLogs !== 'object') students[idx].dietLogs = {};
    students[idx].dietLogs[targetDate] = cloneDietDayLog(studentDietRepeatUndoState.previousSnapshot || {}, students[idx].mealBlocks || []);
    saveStudentData(students);
    queueEntityDietLogsSync(students[idx], targetDate);
    studentDietRepeatUndoState = null;
    setStudentSyncState('pending', 'Sincronização pendente');
    showDietRuntimeMessage('Cópia desfeita com sucesso.', 'success');
    refreshStudentDietViews();
}

function toggleDietDayCompletion() {
    persistStudentDietLog((dayLog) => {
        if (!dayLog.meta || typeof dayLog.meta !== 'object') dayLog.meta = {};
        const nowCompleted = !dayLog.meta.completed;
        dayLog.meta.completed = nowCompleted;
        dayLog.meta.completedAt = nowCompleted ? new Date().toISOString() : null;
    });
    showDietRuntimeMessage('Status do dia alimentar atualizado.', 'success');
}

function resetStudentMealDraft() {
    studentDietMealDraft = { name: '', qtd: '', kcal: '', prot: '', carb: '', gord: '', amount: '', unitKey: 'g', portionId: '', portionLabel: '' };
    studentDietFoodSearchResults = [];
}

function updateStudentMealDraftField(field, value) {
    studentDietMealDraft[field] = value;
    if (field === 'qtd' && studentDietMealDraft.baseQty) {
        const parsed = parseAmountAndUnit(value, studentDietMealDraft.unitKey || studentDietMealDraft.baseUnit || 'g');
        const calc = computeMacrosByAmount({
            name: studentDietMealDraft.name,
            base_qty: studentDietMealDraft.baseQty,
            base_unit: studentDietMealDraft.baseUnit || 'g',
            kcal: parseDecimalSafe(studentDietMealDraft.kcal),
            protein: parseDecimalSafe(studentDietMealDraft.prot),
            carb: parseDecimalSafe(studentDietMealDraft.carb),
            fat: parseDecimalSafe(studentDietMealDraft.gord),
            portions: Array.isArray(studentDietMealDraft.portions) ? studentDietMealDraft.portions : []
        }, parsed.amount || parseDecimalSafe(studentDietMealDraft.baseQty), parsed.unit || studentDietMealDraft.baseUnit || 'g', studentDietMealDraft.portionId || '');
        studentDietMealDraft.kcal = String(calc.kcal);
        studentDietMealDraft.prot = String(calc.protein);
        studentDietMealDraft.carb = String(calc.carb);
        studentDietMealDraft.gord = String(calc.fat);
        studentDietMealDraft.amount = calc.amount;
        studentDietMealDraft.unitKey = calc.unit_key;
        studentDietMealDraft.portionId = calc.portion_id || '';
        studentDietMealDraft.portionLabel = calc.portion_label || '';
        refreshStudentDietViews();
    }
}

function updateStudentMealDraftName(value) {
    updateStudentMealDraftField('name', value);
    if (studentDietFoodSearchTimer) clearTimeout(studentDietFoodSearchTimer);
    const term = String(value || '').trim();
    if (term.length < 2) {
        studentDietFoodSearchResults = [];
        refreshStudentDietViews();
        return;
    }
    studentDietFoodSearchTimer = setTimeout(async () => {
        studentDietFoodSearchResults = await searchFoodsCatalog(term, 8);
        refreshStudentDietViews();
    }, 220);
}

function selectStudentMealDraftFood(index) {
    const food = studentDietFoodSearchResults[index];
    if (!food) return;
    const portions = getFoodPortions(food);
    const defaultPortion = portions.find((portion) => portion.is_default) || portions[0] || null;
    const initialAmount = Math.max(0.1, parseDecimalSafe(defaultPortion?.amount) || parseDecimalSafe(food.base_qty) || 100);
    const initialUnit = normalizeFoodUnitKey(defaultPortion?.unit_key || food.base_unit || 'g');
    studentDietMealDraft.name = food.name;
    studentDietMealDraft.qtd = formatFoodQuantity(initialAmount, initialUnit);
    const calc = computeMacrosByAmount(food, initialAmount, initialUnit, defaultPortion?.id || '');
    studentDietMealDraft.kcal = String(calc.kcal);
    studentDietMealDraft.prot = String(calc.protein);
    studentDietMealDraft.carb = String(calc.carb);
    studentDietMealDraft.gord = String(calc.fat);
    studentDietMealDraft.foodId = food.id;
    studentDietMealDraft.baseQty = food.base_qty;
    studentDietMealDraft.baseUnit = food.base_unit;
    studentDietMealDraft.source = food.source || 'catalog';
    studentDietMealDraft.amount = calc.amount;
    studentDietMealDraft.unitKey = calc.unit_key;
    studentDietMealDraft.portionId = calc.portion_id || '';
    studentDietMealDraft.portionLabel = calc.portion_label || '';
    studentDietMealDraft.portions = portions;
    studentDietFoodSearchResults = [];
    refreshStudentDietViews();
}

function toggleStudentMealAddForm(mealIdx) {
    if (activeStudentMealAddFormIdx === mealIdx) {
        activeStudentMealAddFormIdx = null;
        resetStudentMealDraft();
    } else {
        activeStudentMealAddFormIdx = mealIdx;
        resetStudentMealDraft();
    }
    refreshStudentDietViews();
}

async function saveStudentMealDraft(mealIdx) {
    const nome = String(studentDietMealDraft.name || '').trim();
    if (!nome) return;
    const qtd = String(studentDietMealDraft.qtd || '').trim() || '100g';
    const parsedQty = parseAmountAndUnit(qtd, normalizeFoodUnitKey(studentDietMealDraft.unitKey || studentDietMealDraft.baseUnit || 'g'));
    const baseQty = Math.max(0.1, parseDecimalSafe(studentDietMealDraft.baseQty) || parsedQty.amount || 100);
    const baseUnit = normalizeFoodUnitKey(studentDietMealDraft.baseUnit || parsedQty.unit || 'g');
    const source = studentDietMealDraft.source || (studentDietMealDraft.foodId ? 'catalog' : 'manual');
    const selectedAmount = Math.max(0.1, parseDecimalSafe(studentDietMealDraft.amount) || parsedQty.amount || baseQty);
    const selectedUnit = normalizeFoodUnitKey(studentDietMealDraft.unitKey || parsedQty.unit || baseUnit);
    const selectedPortionId = String(studentDietMealDraft.portionId || '');

    let foodId = studentDietMealDraft.foodId || '';
    let baseKcal = parseDecimalSafe(studentDietMealDraft.kcal);
    let baseProt = parseDecimalSafe(studentDietMealDraft.prot);
    let baseCarb = parseDecimalSafe(studentDietMealDraft.carb);
    let baseFat = parseDecimalSafe(studentDietMealDraft.gord);

    if (!foodId) {
        const inserted = await insertFoodIntoCatalog({
            name: nome,
            base_qty: baseQty,
            base_unit: baseUnit,
            kcal: baseKcal,
            protein: baseProt,
            carb: baseCarb,
            fat: baseFat,
            source: source === 'manual' ? 'manual' : source,
            created_by: getCurrentFoodCreatorId()
        });
        if (inserted) {
            foodId = inserted.id;
            baseKcal = inserted.kcal;
            baseProt = inserted.protein;
            baseCarb = inserted.carb;
            baseFat = inserted.fat;
        }
    }

    const calc = computeMacrosByAmount({
        name: nome,
        base_qty: baseQty,
        base_unit: baseUnit,
        kcal: baseKcal,
        protein: baseProt,
        carb: baseCarb,
        fat: baseFat,
        portions: Array.isArray(studentDietMealDraft.portions) ? studentDietMealDraft.portions : []
    }, selectedAmount, selectedUnit, selectedPortionId);

    persistStudentMealBlocks((student) => {
        if (!Array.isArray(student.mealBlocks)) student.mealBlocks = [];
        if (!student.mealBlocks[mealIdx]) return;
        if (!Array.isArray(student.mealBlocks[mealIdx].items)) student.mealBlocks[mealIdx].items = [];
        student.mealBlocks[mealIdx].items.push({
            nome,
            qtd: formatFoodQuantity(calc.amount, calc.unit_key),
            kcal: calc.kcal,
            prot: calc.protein,
            carb: calc.carb,
            gord: calc.fat,
            addedByStudent: true,
            foodId: foodId || '',
            baseQty,
            baseUnit,
            source,
            amount: calc.amount,
            unitKey: calc.unit_key,
            portionId: calc.portion_id || '',
            portionLabel: calc.portion_label || ''
        });
    });

    activeStudentMealAddFormIdx = null;
    resetStudentMealDraft();
    refreshStudentDietViews();
}

function removeStudentMealFood(mealIdx, itemIdx) {
    persistStudentMealBlocks((student) => {
        const meal = student?.mealBlocks?.[mealIdx];
        if (!meal || !Array.isArray(meal.items)) return;
        meal.items.splice(itemIdx, 1);
    });
}

function isStudentMealCompleted(dayLog, mealIdx, meal) {
    const items = Array.isArray(meal?.items) ? meal.items : [];
    if (!items.length) return false;
    return items.every((_, itemIdx) => !!getDietLogItem(dayLog, mealIdx, itemIdx)?.checked);
}

function showDietRuntimeMessage(message, type = 'info') {
    const text = sanitizeUserInput(message || '', { maxLen: 220 });
    if (!text) return;
    let toast = document.getElementById('diet-runtime-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'diet-runtime-toast';
        toast.className = 'diet-runtime-toast';
        document.body.appendChild(toast);
    }
    toast.classList.remove('show', 'success', 'error', 'info');
    toast.classList.add(type || 'info');
    toast.textContent = text;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(window.__dietRuntimeToastTimer);
    window.__dietRuntimeToastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function ensureDietWriteAllowed(context = 'diet') {
    if (navigator.onLine === false) {
        showDietRuntimeMessage('Sem internet. Conecte-se para editar a dieta.', 'error');
        setStudentSyncState('offline', 'Sem conexão');
        if (context === 'planner') setSettingsSavebarState('error', 'Conecte-se para salvar alterações');
        return false;
    }
    if (studentSyncState.status === 'offline') {
        setStudentSyncState('pending', 'Sincronização pendente');
    }
    return true;
}

function toggleDietMealCheck(mealIdx) {
    persistStudentDietLog((dayLog, student) => {
        const meal = student?.mealBlocks?.[mealIdx];
        const items = Array.isArray(meal?.items) ? meal.items : [];
        const allChecked = items.length > 0 && items.every((_, itemIdx) => !!getDietLogItem(dayLog, mealIdx, itemIdx)?.checked);
        items.forEach((_, itemIdx) => {
            const row = ensureDietLogItem(dayLog, mealIdx, itemIdx);
            row.checked = !allChecked;
        });
    });
}

function persistStudentDietLog(updateFn) {
    if (!ensureDietWriteAllowed('student')) return;
    const studentId = memoryGetItem('currentStudentId');
    if (!studentId || typeof updateFn !== 'function') return;
    const students = readStorageJSON('trainerStudents', []);
    const idx = students.findIndex((s) => String(s.id) === String(studentId));
    if (idx < 0) return;
    const student = students[idx];
    const dateKey = studentDietSelectedDateKey || getTodayDateKey();
    if (!student.dietLogs || typeof student.dietLogs !== 'object') student.dietLogs = {};
    if (!student.dietLogs[dateKey] || typeof student.dietLogs[dateKey] !== 'object') student.dietLogs[dateKey] = { meals: {} };
    if (!student.dietLogs[dateKey].meals || typeof student.dietLogs[dateKey].meals !== 'object') student.dietLogs[dateKey].meals = {};
    updateFn(student.dietLogs[dateKey], student);
    students[idx] = student;
    saveStudentData(students);
    queueEntityDietLogsSync(student, dateKey);
    setStudentSyncState('pending', 'Sincronização pendente');
    refreshStudentDietViews();
}

function persistStudentMealBlocks(updateFn) {
    if (!ensureDietWriteAllowed('student')) return;
    const studentId = memoryGetItem('currentStudentId');
    if (!studentId || typeof updateFn !== 'function') return;
    const students = readStorageJSON('trainerStudents', []);
    const idx = students.findIndex((s) => String(s.id) === String(studentId));
    if (idx < 0) return;
    const student = students[idx];
    updateFn(student);
    students[idx] = student;
    saveStudentData(normalizeStudentsDietSchema(students));
    queueEntityDietLogsSync(student, studentDietSelectedDateKey || getTodayDateKey());
    setStudentSyncState('pending', 'Sincronização pendente');
}

function refreshStudentDietViews() {
    const { student } = getStudentData();
    if (!student) return;

    const modalContainer = document.getElementById('student-diet-content');
    if (modalContainer) {
        modalContainer.innerHTML = renderStudentDietContent(student);
        optimizeMediaElements(modalContainer);
    }

    const mainContainer = document.getElementById('student-diet-content-main');
    if (mainContainer) {
        mainContainer.innerHTML = renderStudentDietContent(student);
        optimizeMediaElements(mainContainer);
    }
    renderDietSyncStatus();
}

function ensureDietLogItem(dayLog, mealIdx, itemIdx) {
    if (!dayLog.meals[mealIdx]) dayLog.meals[mealIdx] = { items: {} };
    if (!dayLog.meals[mealIdx].items[itemIdx]) {
        dayLog.meals[mealIdx].items[itemIdx] = {
            checked: false,
            qty: '',
            amount: 1,
            unitKey: 'g',
            portionId: '',
            portionLabel: '',
            substitute: {
                enabled: false,
                name: '',
                qty: '',
                kcal: 0,
                prot: 0,
                carb: 0,
                gord: 0,
                foodId: '',
                baseQty: 100,
                baseUnit: 'g',
                source: 'manual',
                amount: 1,
                unitKey: 'g',
                portionId: '',
                portionLabel: ''
            }
        };
    }
    return dayLog.meals[mealIdx].items[itemIdx];
}

function toggleDietItemCheck(mealIdx, itemIdx, checked) {
    persistStudentDietLog((dayLog) => {
        const item = ensureDietLogItem(dayLog, mealIdx, itemIdx);
        item.checked = !!checked;
    });
}

function updateDietItemQty(mealIdx, itemIdx, qty) {
    persistStudentDietLog((dayLog) => {
        const item = ensureDietLogItem(dayLog, mealIdx, itemIdx);
        const safeQty = String(qty || '');
        const parsed = parseAmountAndUnit(safeQty, item.unitKey || 'g');
        item.qty = safeQty;
        item.amount = Math.max(0.1, parsed.amount || item.amount || 1);
        item.unitKey = normalizeFoodUnitKey(parsed.unit || item.unitKey || 'g');
    });
}

function getDietBaseItemForContext(context, mealIdx, itemIdx) {
    if (context === 'trainer-replace') {
        return mealBlocks?.[mealIdx]?.items?.[itemIdx] || {};
    }
    const { student } = getStudentData();
    return student?.mealBlocks?.[mealIdx]?.items?.[itemIdx] || {};
}

function getDietFoodPickerTitle() {
    return dietFoodPickerState.context === 'trainer-replace'
        ? 'Substituir Alimento da Refeição'
        : 'Substituir Alimento Consumido';
}

function resolveDietFoodPickerDefaultQty(foodLike = null, fallbackQty = '100g') {
    const food = normalizeFoodCatalogRow(foodLike);
    if (!food) return String(fallbackQty || '100g');
    const portions = getFoodPortions(food);
    const defaultPortion = portions.find((portion) => portion.is_default) || portions[0] || null;
    const amount = Math.max(
        0.1,
        parseDecimalSafe(defaultPortion?.amount)
        || parseDecimalSafe(food.base_qty)
        || parseAmountAndUnit(fallbackQty, food.base_unit || 'g').amount
        || 100
    );
    const unitKey = normalizeFoodUnitKey(defaultPortion?.unit_key || food.base_unit || parseAmountAndUnit(fallbackQty, 'g').unit || 'g');
    return formatFoodQuantity(amount, unitKey);
}

function findDietFoodPickerMatchingPortion(foodLike, amountValue, unitKeyValue) {
    const food = normalizeFoodCatalogRow(foodLike);
    if (!food) return null;
    const safeAmount = Math.max(0.1, parseDecimalSafe(amountValue) || 0);
    const safeUnit = normalizeFoodUnitKey(unitKeyValue || food.base_unit || 'g');
    return getFoodPortions(food).find((portion) => {
        if (normalizeFoodUnitKey(portion.unit_key) !== safeUnit) return false;
        const portionAmount = Math.max(0.1, parseDecimalSafe(portion.amount) || 1);
        return Math.abs(portionAmount - safeAmount) < 0.11;
    }) || null;
}

function getDietFoodPickerNormalizedQty(foodLike, qtyRaw = '') {
    const food = normalizeFoodCatalogRow(foodLike);
    if (!food) {
        return {
            amount: 100,
            unitKey: 'g',
            qtyText: '100g',
            usedFallback: true,
            portionId: ''
        };
    }
    const fallbackQty = resolveDietFoodPickerDefaultQty(food, '100g');
    const parsed = parseAmountAndUnit(qtyRaw || '', food.base_unit || 'g');
    let amount = Math.max(0, parseDecimalSafe(parsed.amount));
    let unitKey = normalizeFoodUnitKey(parsed.unit || food.base_unit || 'g');
    let usedFallback = false;
    if (!(amount > 0)) {
        const fallbackParsed = parseAmountAndUnit(fallbackQty, food.base_unit || 'g');
        amount = Math.max(
            0.1,
            parseDecimalSafe(fallbackParsed.amount)
            || parseDecimalSafe(food.base_qty)
            || 100
        );
        unitKey = normalizeFoodUnitKey(fallbackParsed.unit || food.base_unit || 'g');
        usedFallback = true;
    }
    const qtyText = formatFoodQuantity(amount, unitKey);
    const matchedPortion = findDietFoodPickerMatchingPortion(food, amount, unitKey);
    return {
        amount,
        unitKey,
        qtyText,
        usedFallback,
        portionId: String(matchedPortion?.id || '')
    };
}

function setDietFoodPickerFeedback(message = '', type = 'info') {
    const feedback = document.getElementById('diet-food-picker-feedback');
    if (!feedback) return;
    const text = sanitizeUserInput(message || '', { maxLen: 140 });
    feedback.textContent = text;
    feedback.classList.remove('is-warning', 'is-success', 'is-info');
    if (!text) return;
    if (type === 'warning') feedback.classList.add('is-warning');
    else if (type === 'success') feedback.classList.add('is-success');
    else feedback.classList.add('is-info');
}

function syncDietFoodPickerPrimaryActionState() {
    const confirmButton = document.getElementById('diet-food-picker-confirm');
    if (!confirmButton) return;
    const canSubmit = !!dietFoodPickerState?.open
        && dietFoodPickerState?.view === 'detail'
        && !!dietFoodPickerState?.selected
        && !dietFoodPickerState?.loading;
    confirmButton.disabled = !canSubmit;
    confirmButton.setAttribute('aria-disabled', canSubmit ? 'false' : 'true');
}

function focusDietFoodPickerHighlightedResult() {
    if (dietFoodPickerState?.view !== 'list') return;
    const container = document.getElementById('diet-food-picker-results');
    if (!container) return;
    const target = container.querySelector('.diet-food-picker-item.is-highlight') || container.querySelector('.diet-food-picker-item.active');
    if (!target || typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function storeDietFoodPickerListScroll() {
    const container = document.getElementById('diet-food-picker-results');
    if (!container) return;
    dietFoodPickerState.listScrollTop = Math.max(0, parseIntegerSafe(container.scrollTop) || 0);
}

function restoreDietFoodPickerListScroll() {
    const container = document.getElementById('diet-food-picker-results');
    if (!container) return;
    const safeTop = Math.max(0, parseIntegerSafe(dietFoodPickerState.listScrollTop) || 0);
    container.scrollTop = safeTop;
}

function setDietFoodPickerView(view = 'list', options = {}) {
    const targetView = view === 'detail' ? 'detail' : 'list';
    if (targetView === 'detail' && !dietFoodPickerState.selected) return;
    if (dietFoodPickerState.view === targetView) {
        if (targetView === 'list') {
            requestAnimationFrame(() => restoreDietFoodPickerListScroll());
        }
        return;
    }

    if (dietFoodPickerState.view === 'list' && targetView === 'detail') {
        storeDietFoodPickerListScroll();
    }

    dietFoodPickerState.view = targetView;
    renderDietFoodPickerModal();

    if (targetView === 'list') {
        requestAnimationFrame(() => {
            restoreDietFoodPickerListScroll();
            if (options.focusSearch !== false) {
                const search = document.getElementById('diet-food-picker-search');
                if (search) search.focus();
            }
        });
        return;
    }

    requestAnimationFrame(() => {
        const qty = document.getElementById('diet-food-picker-qty');
        if (qty && options.focusQty !== false) qty.focus();
    });
}

function backDietFoodPickerToList() {
    if (!dietFoodPickerState.open) return;
    setDietFoodPickerFeedback('');
    setDietFoodPickerView('list');
}

function getDietFoodPickerQtyStep(unitKey, amount = 0) {
    const safeUnit = normalizeFoodUnitKey(unitKey || 'g');
    const safeAmount = Math.max(0, parseDecimalSafe(amount) || 0);
    if (safeUnit === 'g' || safeUnit === 'ml') {
        if (safeAmount >= 500) return 50;
        if (safeAmount >= 200) return 25;
        if (safeAmount >= 80) return 10;
        return 5;
    }
    if (safeUnit === 'tbsp' || safeUnit === 'tsp') return 0.5;
    return 1;
}

function adjustDietFoodPickerQty(direction = 1) {
    if (!dietFoodPickerState?.selected || dietFoodPickerState.view !== 'detail') return;
    const normalized = getDietFoodPickerNormalizedQty(dietFoodPickerState.selected, dietFoodPickerState.qty);
    const step = getDietFoodPickerQtyStep(normalized.unitKey, normalized.amount);
    const nextAmount = Math.max(0.1, Math.round((normalized.amount + (step * Number(direction || 0))) * 10) / 10);
    dietFoodPickerState.qty = formatFoodQuantity(nextAmount, normalized.unitKey);
    dietFoodPickerState.qtyTouched = true;
    const qtyInput = document.getElementById('diet-food-picker-qty');
    if (qtyInput) qtyInput.value = dietFoodPickerState.qty;
    setDietFoodPickerFeedback('');
    renderDietFoodPickerPreview();
    renderDietFoodPickerPortions();
}

function syncDietFoodPickerSearchActionState() {
    const clearButton = document.getElementById('diet-food-picker-search-clear');
    if (!clearButton) return;
    const hasQuery = String(dietFoodPickerState?.query || '').trim().length > 0;
    clearButton.disabled = !hasQuery;
    clearButton.classList.toggle('is-active', hasQuery);
    clearButton.setAttribute('aria-hidden', hasQuery ? 'false' : 'true');
}

function clearDietFoodPickerSearch() {
    if (!dietFoodPickerState.open) return;
    const search = document.getElementById('diet-food-picker-search');
    dietFoodPickerState.query = '';
    if (search) {
        search.value = '';
        search.focus();
    }
    syncDietFoodPickerSearchActionState();
    scheduleDietFoodPickerSearch('');
}

function resetDietFoodPickerFlags() {
    if (!dietFoodPickerState.filters) return;
    dietFoodPickerState.filters.favoritesOnly = false;
    dietFoodPickerState.filters.recentOnly = false;
    updateDietFoodPickerFilterUI();
    applyDietFoodPickerFiltersAndRender();
}

function scoreDietFoodPickerResult(item, queryNorm = '', favoritesSet = new Set(), recentsSet = new Set(), selectedKey = '') {
    const nameNorm = normalizeText(item?.name || item?.nome || '');
    const key = getFoodItemKey(item);
    let score = 0;
    if (queryNorm) {
        if (nameNorm === queryNorm) score += 220;
        else if (nameNorm.startsWith(queryNorm)) score += 160;
        else if (nameNorm.includes(queryNorm)) score += 110;
        else score -= 40;
        const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
        queryTokens.forEach((token) => {
            if (token && nameNorm.includes(token)) score += 18;
        });
    }
    if (favoritesSet.has(key)) score += 36;
    if (recentsSet.has(key)) score += 24;
    if (selectedKey && selectedKey === key) score += 10;
    return score;
}

function sortDietFoodPickerResults(items = []) {
    const queryNorm = normalizeText(dietFoodPickerState.query || '');
    const prefs = readFoodModalPrefs();
    const favoritesSet = new Set(prefs.favorites || []);
    const recentsSet = new Set(prefs.recents || []);
    const selectedKey = getFoodItemKey(dietFoodPickerState.selected);
    return (Array.isArray(items) ? items : [])
        .map((item, index) => ({
            item,
            index,
            score: scoreDietFoodPickerResult(item, queryNorm, favoritesSet, recentsSet, selectedKey)
        }))
        .sort((a, b) => (b.score - a.score) || (a.index - b.index))
        .map((entry) => entry.item);
}

function renderDietFoodPickerResultName(name = '', query = '') {
    const safeName = String(name || '');
    const term = String(query || '').trim();
    if (term.length < 2) return escHtml(safeName);
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let output = '';
    let cursor = 0;
    try {
        const matcher = new RegExp(escapedTerm, 'ig');
        safeName.replace(matcher, (match, offset) => {
            const safeOffset = Math.max(0, Number(offset) || 0);
            output += escHtml(safeName.slice(cursor, safeOffset));
            output += `<mark class="diet-food-picker-mark">${escHtml(match)}</mark>`;
            cursor = safeOffset + match.length;
            return match;
        });
    } catch (_error) {
        return escHtml(safeName);
    }
    if (!output) return escHtml(safeName);
    output += escHtml(safeName.slice(cursor));
    return output;
}

function getDietStarterSuggestions(baseItem = {}, limit = 18) {
    const sourcePool = getEffectiveFoodCatalog(Math.max(24, parseInt(limit, 10) * 3));
    if (!sourcePool.length) return [];
    const targetMacro = getQuickMacroTarget(baseItem);
    const targetKcal = Math.max(0, parseDecimalSafe(baseItem?.kcal));
    const baseNameNorm = normalizeText(baseItem?.nome || baseItem?.name || '');
    const prefs = readFoodModalPrefs();
    const favorites = new Set(prefs.favorites || []);
    const recents = new Set(prefs.recents || []);

    const scored = sourcePool
        .filter((item) => item && item.name)
        .filter((item) => normalizeText(item.name) !== baseNameNorm)
        .map((item) => {
            const macroScore = targetMacro === 'protein'
                ? parseDecimalSafe(item.protein)
                : targetMacro === 'carb'
                    ? parseDecimalSafe(item.carb)
                    : parseDecimalSafe(item.fat);
            const kcalValue = Math.max(0, parseDecimalSafe(item.kcal));
            const kcalPenalty = targetKcal > 0 ? Math.min(1.5, Math.abs(kcalValue - targetKcal) / Math.max(targetKcal, 1)) : 0;
            const key = getFoodItemKey(item);
            const favBonus = favorites.has(key) ? 2 : 0;
            const recentBonus = recents.has(key) ? 1 : 0;
            const score = (macroScore * 12) - (kcalPenalty * 4) + favBonus + recentBonus;
            return { item, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.item);

    return scored;
}

function mergeUniqueFoods(primary = [], secondary = [], limit = 24) {
    const output = [];
    const seen = new Set();
    [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(secondary) ? secondary : [])].forEach((item) => {
        if (!item) return;
        const key = getFoodItemKey(item);
        if (!key || seen.has(key)) return;
        seen.add(key);
        output.push(item);
    });
    return output.slice(0, Math.max(1, limit));
}

function ensureDietFoodPickerModal() {
    if (document.getElementById('diet-food-picker-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'diet-food-picker-overlay';
    overlay.className = 'diet-food-picker-overlay';
    overlay.addEventListener('click', closeDietFoodPicker);

    const modal = document.createElement('div');
    modal.id = 'diet-food-picker-modal';
    modal.className = 'diet-food-picker-modal';
    modal.innerHTML = `
        <div class="diet-food-picker-header">
            <div class="diet-food-picker-header-main">
                <button id="diet-food-picker-back" type="button" class="diet-food-picker-back-btn" onclick="backDietFoodPickerToList()">
                    <i class="ph-bold ph-arrow-left"></i>
                    <span>Voltar</span>
                </button>
                <h3 id="diet-food-picker-title">Substituir alimento</h3>
            </div>
            <button type="button" class="diet-food-picker-close" onclick="closeDietFoodPicker()"><i class="ph-bold ph-x"></i></button>
        </div>
        <div class="diet-food-picker-body">
            <div id="diet-food-picker-context" class="diet-food-picker-context"></div>
            <div id="diet-food-picker-list-view" class="diet-food-picker-view diet-food-picker-list-view">
                <div class="diet-food-picker-search-row">
                    <input id="diet-food-picker-search" type="text" class="diet-modern-input" placeholder="Buscar alimento (ex: arroz, frango, banana)" autocomplete="off">
                    <button id="diet-food-picker-search-clear" type="button" class="diet-food-picker-search-clear" onclick="clearDietFoodPickerSearch()" aria-label="Limpar busca">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                <div id="diet-food-picker-filters" class="diet-food-picker-filters">
                    <button type="button" class="diet-food-picker-filter-chip" data-group="flags" data-value="favorites">Favoritos</button>
                    <button type="button" class="diet-food-picker-filter-chip" data-group="flags" data-value="recent">Recentes</button>
                </div>
                <div id="diet-food-picker-results-title" class="diet-food-picker-results-title">Selecione um alimento</div>
                <div id="diet-food-picker-results" class="diet-food-picker-results"></div>
            </div>
            <div id="diet-food-picker-detail-view" class="diet-food-picker-view diet-food-picker-detail-view">
                <div id="diet-food-picker-detail" class="diet-food-picker-detail">
                    <div id="diet-food-picker-preview" class="diet-food-picker-preview"></div>
                    <div id="diet-food-picker-portions" class="diet-food-picker-portions"></div>
                    <div class="diet-food-picker-qty-row">
                        <button type="button" class="diet-food-picker-step-btn" onclick="adjustDietFoodPickerQty(-1)" aria-label="Diminuir quantidade">-</button>
                        <input id="diet-food-picker-qty" type="text" class="diet-modern-input" placeholder="Quantidade (ex: 2 fatias, 250ml, 120g)" autocomplete="off">
                        <button type="button" class="diet-food-picker-step-btn" onclick="adjustDietFoodPickerQty(1)" aria-label="Aumentar quantidade">+</button>
                    </div>
                    <div id="diet-food-picker-feedback" class="diet-food-picker-feedback"></div>
                </div>
            </div>
        </div>
        <div class="diet-food-picker-footer">
            <button type="button" class="diet-modern-cancel-btn" onclick="closeDietFoodPicker()">Cancelar</button>
            <button id="diet-food-picker-confirm" type="button" class="diet-modern-save-btn" onclick="confirmDietFoodPickerSelection()">Adicionar alimento</button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    modal.addEventListener('keydown', handleDietFoodPickerKeydown);

    const searchInput = modal.querySelector('#diet-food-picker-search');
    const qtyInput = modal.querySelector('#diet-food-picker-qty');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            dietFoodPickerState.query = String(event.target.value || '');
            syncDietFoodPickerSearchActionState();
            scheduleDietFoodPickerSearch(dietFoodPickerState.query);
        });
    }
    if (qtyInput) {
        qtyInput.addEventListener('input', (event) => {
            dietFoodPickerState.qty = String(event.target.value || '');
            dietFoodPickerState.qtyTouched = true;
            setDietFoodPickerFeedback('');
            renderDietFoodPickerPreview();
            renderDietFoodPickerPortions();
        });
        qtyInput.addEventListener('blur', () => {
            if (!dietFoodPickerState.selected) return;
            const normalized = getDietFoodPickerNormalizedQty(dietFoodPickerState.selected, dietFoodPickerState.qty);
            dietFoodPickerState.qty = normalized.qtyText;
            qtyInput.value = normalized.qtyText;
            setDietFoodPickerFeedback(
                normalized.usedFallback
                    ? 'Quantidade inválida. Ajustamos para o padrão do alimento.'
                    : '',
                normalized.usedFallback ? 'warning' : 'info'
            );
            renderDietFoodPickerPreview();
            renderDietFoodPickerPortions();
        });
    }
    modal.querySelectorAll('#diet-food-picker-filters .diet-food-picker-filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const group = chip.getAttribute('data-group') || '';
            const value = chip.getAttribute('data-value') || 'all';
            if (group === 'flags') {
                toggleDietFoodPickerFlag(value);
                return;
            }
        });
    });
    syncDietFoodPickerSearchActionState();
    syncDietFoodPickerPrimaryActionState();
}

function handleDietFoodPickerKeydown(event) {
    if (!dietFoodPickerState.open) return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (dietFoodPickerState.view === 'detail') confirmDietFoodPickerSelection();
        return;
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        if (dietFoodPickerState.view === 'detail') {
            backDietFoodPickerToList();
        } else {
            closeDietFoodPicker();
        }
        return;
    }
    if (event.key === 'Enter' && event.target?.id === 'diet-food-picker-qty') {
        event.preventDefault();
        confirmDietFoodPickerSelection();
        return;
    }
    if (dietFoodPickerState.view !== 'list') return;
    if (!Array.isArray(dietFoodPickerState.results) || !dietFoodPickerState.results.length) return;
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        dietFoodPickerState.highlightIndex = Math.min(dietFoodPickerState.results.length - 1, (dietFoodPickerState.highlightIndex < 0 ? 0 : dietFoodPickerState.highlightIndex + 1));
        renderDietFoodPickerResults();
        focusDietFoodPickerHighlightedResult();
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        dietFoodPickerState.highlightIndex = Math.max(0, (dietFoodPickerState.highlightIndex < 0 ? 0 : dietFoodPickerState.highlightIndex - 1));
        renderDietFoodPickerResults();
        focusDietFoodPickerHighlightedResult();
        return;
    }
    if (event.key === 'Home') {
        event.preventDefault();
        dietFoodPickerState.highlightIndex = 0;
        renderDietFoodPickerResults();
        focusDietFoodPickerHighlightedResult();
        return;
    }
    if (event.key === 'End') {
        event.preventDefault();
        dietFoodPickerState.highlightIndex = Math.max(0, dietFoodPickerState.results.length - 1);
        renderDietFoodPickerResults();
        focusDietFoodPickerHighlightedResult();
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        const idx = dietFoodPickerState.highlightIndex >= 0 ? dietFoodPickerState.highlightIndex : 0;
        selectDietFoodPickerResult(idx);
    }
}

function renderDietFoodPickerModal() {
    ensureDietFoodPickerModal();
    const overlay = document.getElementById('diet-food-picker-overlay');
    const modal = document.getElementById('diet-food-picker-modal');
    if (!overlay || !modal) return;

    overlay.classList.toggle('active', !!dietFoodPickerState.open);
    modal.classList.toggle('active', !!dietFoodPickerState.open);
    document.body.classList.toggle('diet-food-picker-open', !!dietFoodPickerState.open);
    if (!dietFoodPickerState.open) return;

    const title = document.getElementById('diet-food-picker-title');
    const backButton = document.getElementById('diet-food-picker-back');
    const context = document.getElementById('diet-food-picker-context');
    const search = document.getElementById('diet-food-picker-search');
    const qty = document.getElementById('diet-food-picker-qty');
    const listView = dietFoodPickerState.view === 'list';

    modal.classList.toggle('is-list-view', listView);
    modal.classList.toggle('is-detail-view', !listView);

    if (title) {
        title.textContent = listView
            ? getDietFoodPickerTitle()
            : 'Detalhes do alimento';
    }
    if (backButton) {
        backButton.classList.toggle('active', !listView);
        backButton.setAttribute('aria-hidden', listView ? 'true' : 'false');
    }
    if (context) {
        const baseName = escHtml(dietFoodPickerState.baseItem?.nome || dietFoodPickerState.baseItem?.name || '');
        const baseQty = escHtml(dietFoodPickerState.baseItem?.qtd || '--');
        context.innerHTML = baseName
            ? `<strong>Base atual:</strong> ${baseName} <span>${baseQty}</span>`
            : '';
        context.classList.toggle('active', !!baseName);
    }
    if (search) search.value = dietFoodPickerState.query || '';
    if (qty) qty.value = dietFoodPickerState.qty || '';
    setDietFoodPickerFeedback('');
    syncDietFoodPickerSearchActionState();
    updateDietFoodPickerFilterUI();

    renderDietFoodPickerResults();
    renderDietFoodPickerPortions();
    renderDietFoodPickerPreview();
    syncDietFoodPickerPrimaryActionState();

    if (listView && search) {
        setTimeout(() => search.focus(), 10);
    }
}

function closeDietFoodPicker() {
    dietFoodPickerState = {
        open: false,
        view: 'list',
        context: '',
        mealIdx: null,
        itemIdx: null,
        baseItem: null,
        query: '',
        loading: false,
        allResults: [],
        results: [],
        selected: null,
        qty: '',
        qtyTouched: false,
        highlightIndex: -1,
        listScrollTop: 0,
        filters: {
            favoritesOnly: false,
            recentOnly: false
        }
    };
    if (dietFoodPickerTimer) clearTimeout(dietFoodPickerTimer);
    document.body.classList.remove('diet-food-picker-open');
    setDietFoodPickerFeedback('');
    renderDietFoodPickerModal();
}

function openDietFoodPicker(context, mealIdx, itemIdx) {
    const baseItem = getDietBaseItemForContext(context, mealIdx, itemIdx);
    const defaultName = String(baseItem?.nome || '');
    const starter = getDietStarterSuggestions(baseItem, 18);
    const starterPool = starter.length ? starter : getEffectiveFoodCatalog(18);
    const initialQuery = context === 'student-substitute' ? '' : defaultName;
    dietFoodPickerState = {
        open: true,
        view: 'list',
        context,
        mealIdx,
        itemIdx,
        baseItem: baseItem || null,
        query: initialQuery,
        loading: false,
        allResults: starterPool,
        results: starterPool,
        selected: null,
        qty: '',
        qtyTouched: false,
        highlightIndex: starterPool.length ? 0 : -1,
        listScrollTop: 0,
        filters: {
            favoritesOnly: false,
            recentOnly: false
        }
    };
    renderDietFoodPickerModal();
    applyDietFoodPickerFiltersAndRender();
    if (initialQuery.length >= 2) {
        scheduleDietFoodPickerSearch(initialQuery);
    } else {
        loadDietFoodPickerInitialResults(defaultName);
    }
}

function openDietItemSubstitutePicker(mealIdx, itemIdx) {
    openDietFoodPicker('student-substitute', mealIdx, itemIdx);
}

function openTrainerFoodReplacePicker(mealIdx, itemIdx) {
    openDietFoodPicker('trainer-replace', mealIdx, itemIdx);
}

function updateDietFoodPickerFilterUI() {
    document.querySelectorAll('#diet-food-picker-filters .diet-food-picker-filter-chip').forEach((chip) => {
        const group = chip.getAttribute('data-group') || 'flags';
        const value = chip.getAttribute('data-value') || '';
        let active = false;
        if (group === 'flags' && value === 'favorites') active = !!dietFoodPickerState.filters?.favoritesOnly;
        if (group === 'flags' && value === 'recent') active = !!dietFoodPickerState.filters?.recentOnly;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function applyDietFoodPickerFiltersAndRender() {
    let switchedToListView = false;
    const filtered = applyFoodFilters(
        dietFoodPickerState.allResults,
        dietFoodPickerState.filters
    );
    dietFoodPickerState.results = sortDietFoodPickerResults(filtered);

    const selectedKey = getFoodItemKey(dietFoodPickerState.selected);
    const selectedIndex = dietFoodPickerState.results.findIndex((item) => getFoodItemKey(item) === selectedKey);
    const hasCurrentSelected = selectedIndex >= 0;

    if (!hasCurrentSelected && dietFoodPickerState.selected && dietFoodPickerState.view !== 'detail') {
        dietFoodPickerState.selected = null;
    }

    if (dietFoodPickerState.view === 'detail') {
        if (!hasCurrentSelected) {
            if (dietFoodPickerState.results.length) {
                dietFoodPickerState.selected = dietFoodPickerState.results[0];
                if (!dietFoodPickerState.qtyTouched) {
                    dietFoodPickerState.qty = resolveDietFoodPickerDefaultQty(
                        dietFoodPickerState.selected,
                        dietFoodPickerState.qty || '100g'
                    );
                }
            } else {
                dietFoodPickerState.selected = null;
                dietFoodPickerState.view = 'list';
                switchedToListView = true;
            }
        }
    }

    const maxIndex = dietFoodPickerState.results.length - 1;
    if (maxIndex < 0) {
        dietFoodPickerState.highlightIndex = -1;
    } else if (dietFoodPickerState.view === 'detail' && dietFoodPickerState.selected) {
        const activeIndex = dietFoodPickerState.results.findIndex((item) => getFoodItemKey(item) === getFoodItemKey(dietFoodPickerState.selected));
        dietFoodPickerState.highlightIndex = Math.max(0, activeIndex);
    } else if (dietFoodPickerState.highlightIndex < 0 || dietFoodPickerState.highlightIndex > maxIndex) {
        dietFoodPickerState.highlightIndex = 0;
    }

    if (switchedToListView) {
        renderDietFoodPickerModal();
        requestAnimationFrame(() => restoreDietFoodPickerListScroll());
        return;
    }

    renderDietFoodPickerResults();
    renderDietFoodPickerPortions();
    renderDietFoodPickerPreview();
    syncDietFoodPickerPrimaryActionState();
    if (dietFoodPickerState.view === 'list') {
        focusDietFoodPickerHighlightedResult();
    }
}

function toggleDietFoodPickerFlag(flag) {
    if (!dietFoodPickerState.filters) return;
    if (flag === 'favorites') dietFoodPickerState.filters.favoritesOnly = !dietFoodPickerState.filters.favoritesOnly;
    if (flag === 'recent') dietFoodPickerState.filters.recentOnly = !dietFoodPickerState.filters.recentOnly;
    updateDietFoodPickerFilterUI();
    applyDietFoodPickerFiltersAndRender();
}

async function loadDietFoodPickerInitialResults(baseName = '') {
    if (!dietFoodPickerState.open) return;
    if (dietFoodPickerState.loading) return;
    const currentCount = Array.isArray(dietFoodPickerState.allResults) ? dietFoodPickerState.allResults.length : 0;
    if (currentCount >= 10) return;

    dietFoodPickerState.loading = true;
    renderDietFoodPickerResults();

    const [defaultFoods, similarFoods] = await Promise.all([
        fetchFoodsCatalogDefault(24),
        String(baseName || '').trim().length >= 2 ? searchFoodsWithFallback(baseName, 10) : Promise.resolve([])
    ]);

    if (!dietFoodPickerState.open) return;
    const baselineFoods = getBaselineFoodCatalog(30);
    const merged = mergeFoodCatalogSources(
        mergeFoodCatalogSources(dietFoodPickerState.allResults, baselineFoods, 72),
        mergeFoodCatalogSources(similarFoods, defaultFoods, 72),
        36
    );
    dietFoodPickerState.loading = false;
    dietFoodPickerState.allResults = merged;
    applyDietFoodPickerFiltersAndRender();
}

async function searchFoodsWithFallback(query, limit = 12) {
    const term = String(query || '').trim();
    if (term.length < 2) return [];
    const catalogResults = await searchFoodsCatalog(term, limit);
    if (catalogResults.length > 0) return catalogResults;

    try {
        const url = `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=${Math.min(limit, 12)}`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'AplicativoConsultoria - Browser - v1.0' } });
        const data = await resp.json();
        return (data.products || []).map((item) => normalizeFoodCatalogRow({
            id: '',
            name: item.product_name || item.generic_name || '',
            brand: item.brands || '',
            base_qty: 100,
            base_unit: 'g',
            kcal: parseDecimalSafe(item.nutriments?.['energy-kcal_100g']),
            protein: parseDecimalSafe(item.nutriments?.proteins_100g),
            carb: parseDecimalSafe(item.nutriments?.carbohydrates_100g),
            fat: parseDecimalSafe(item.nutriments?.fat_100g),
            source: 'openfoodfacts',
            portions: getFallbackFoodPortions({
                name: item.product_name || item.generic_name || '',
                base_unit: 'g'
            })
        })).filter(Boolean);
    } catch (error) {
        console.warn('OpenFoodFacts search failed', error);
        return [];
    }
}

function scheduleDietFoodPickerSearch(query) {
    if (dietFoodPickerTimer) clearTimeout(dietFoodPickerTimer);
    const term = String(query || '').trim();
    if (term.length < 2) {
        dietFoodPickerState.loading = false;
        const starter = getDietStarterSuggestions(dietFoodPickerState.baseItem || {}, 18);
        dietFoodPickerState.allResults = mergeFoodCatalogSources(
            starter,
            getEffectiveFoodCatalog(24),
            18
        );
        applyDietFoodPickerFiltersAndRender();
        loadDietFoodPickerInitialResults(dietFoodPickerState.baseItem?.nome || '');
        return;
    }
    dietFoodPickerState.loading = true;
    renderDietFoodPickerResults();
    dietFoodPickerTimer = setTimeout(async () => {
        const results = await searchFoodsWithFallback(term, 12);
        if (dietFoodPickerState.query.trim() !== term) return;
        const starter = getDietStarterSuggestions(dietFoodPickerState.baseItem || {}, 18);
        dietFoodPickerState.loading = false;
        dietFoodPickerState.allResults = mergeFoodCatalogSources(
            mergeFoodCatalogSources(results, starter, 30),
            getBaselineFoodCatalog(24),
            24
        );
        if (!dietFoodPickerState.allResults.length) {
            loadDietFoodPickerInitialResults(term);
        }
        applyDietFoodPickerFiltersAndRender();
    }, 240);
}

function selectDietFoodPickerResult(index) {
    const selected = dietFoodPickerState.results[index];
    if (!selected) return;
    dietFoodPickerState.selected = selected;
    dietFoodPickerState.highlightIndex = index;
    dietFoodPickerState.qty = resolveDietFoodPickerDefaultQty(
        selected,
        String(dietFoodPickerState.baseItem?.qtd || dietFoodPickerState.qty || '100g')
    );
    dietFoodPickerState.qtyTouched = false;
    setDietFoodPickerFeedback('');
    renderDietFoodPickerResults();
    renderDietFoodPickerPortions();
    renderDietFoodPickerPreview();
    syncDietFoodPickerPrimaryActionState();
    setDietFoodPickerView('detail', { focusQty: true });
}

function getQuickMacroTarget(item = {}) {
    const prot = parseDecimalSafe(item?.prot);
    const carb = parseDecimalSafe(item?.carb);
    const fat = parseDecimalSafe(item?.gord);
    const macroScores = [
        { key: 'protein', value: prot },
        { key: 'carb', value: carb },
        { key: 'fat', value: fat }
    ].sort((a, b) => b.value - a.value);
    return macroScores[0]?.value > 0 ? macroScores[0].key : 'protein';
}


function selectDietFoodPickerPortion(index) {
    const selected = dietFoodPickerState.selected;
    if (!selected || dietFoodPickerState.view !== 'detail') return;
    const portions = getFoodPortions(selected);
    const portion = portions[index];
    if (!portion) return;
    const amount = Math.max(0.1, parseDecimalSafe(portion.amount) || 1);
    const unitKey = normalizeFoodUnitKey(portion.unit_key || selected.base_unit || 'g');
    dietFoodPickerState.qty = formatFoodQuantity(amount, unitKey);
    dietFoodPickerState.qtyTouched = true;
    setDietFoodPickerFeedback('');
    renderDietFoodPickerPortions();
    renderDietFoodPickerPreview();
}

function renderDietFoodPickerPortions() {
    const container = document.getElementById('diet-food-picker-portions');
    if (!container) return;
    const selected = dietFoodPickerState.selected;
    if (!selected) {
        container.innerHTML = '';
        return;
    }
    const portions = getFoodPortions(selected).slice(0, 8);
    if (!portions.length) {
        container.innerHTML = '';
        return;
    }
    const parsedQty = parseAmountAndUnit(
        dietFoodPickerState.qty || formatFoodQuantity(selected.base_qty, selected.base_unit),
        selected.base_unit || 'g'
    );
    container.innerHTML = `
        <div class="diet-food-picker-portions-title">Medidas rápidas</div>
        <div class="diet-food-picker-portions-list">
            ${portions.map((portion, index) => {
                const amount = Math.max(0.1, parseDecimalSafe(portion.amount) || 1);
                const unit = normalizeFoodUnitKey(portion.unit_key || 'g');
                const active = normalizeFoodUnitKey(parsedQty.unit || 'g') === unit
                    && Math.abs((parseDecimalSafe(parsedQty.amount) || 0) - amount) < 0.11;
                const baseRef = `${Math.round((parseDecimalSafe(portion.base_qty_equivalent) || 0) * 10) / 10}${getFoodUnitShort(selected.base_unit || 'g')}`;
                return `
                    <button type="button" class="diet-food-picker-portion-chip ${active ? 'active' : ''}" onclick="selectDietFoodPickerPortion(${index})">
                        <strong>${escHtml(formatFoodQuantity(amount, unit))}</strong>
                        <span>${escHtml(portion.label)} · ${escHtml(baseRef)}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function renderDietFoodPickerResults() {
    const container = document.getElementById('diet-food-picker-results');
    const title = document.getElementById('diet-food-picker-results-title');
    if (!container) return;
    if (dietFoodPickerState.loading) {
        if (title) title.textContent = 'Buscando alimentos...';
        container.innerHTML = '<div class="diet-food-picker-empty">Buscando alimentos...</div>';
        syncDietFoodPickerPrimaryActionState();
        return;
    }
    if (!Array.isArray(dietFoodPickerState.results) || !dietFoodPickerState.results.length) {
        if (title) title.textContent = 'Selecione um alimento';
        const hasActiveFlags = !!(dietFoodPickerState.filters?.favoritesOnly || dietFoodPickerState.filters?.recentOnly);
        container.innerHTML = hasActiveFlags
            ? '<div class="diet-food-picker-empty">Sem resultados com os filtros ativos. <button type="button" class="diet-food-picker-reset-link" onclick="resetDietFoodPickerFlags()">Limpar filtros</button></div>'
            : '<div class="diet-food-picker-empty">Sem resultados. Digite outro termo.</div>';
        syncDietFoodPickerPrimaryActionState();
        return;
    }
    if (title) {
        const count = dietFoodPickerState.results.length;
        title.textContent = `Selecione um alimento (${count})`;
    }
    container.innerHTML = dietFoodPickerState.results.map((item, index) => {
        const selected = dietFoodPickerState.selected
            && getFoodItemKey(dietFoodPickerState.selected) === getFoodItemKey(item);
        const highlighted = dietFoodPickerState.highlightIndex === index;
        return `
            <button type="button" class="diet-food-picker-item ${selected ? 'active' : ''} ${highlighted ? 'is-highlight' : ''}" onclick="selectDietFoodPickerResult(${index})" aria-pressed="${selected ? 'true' : 'false'}" data-food-key="${escHtml(getFoodItemKey(item))}">
                <span>${renderDietFoodPickerResultName(item.name, dietFoodPickerState.query)}</span>
            </button>
        `;
    }).join('');
    syncDietFoodPickerPrimaryActionState();
}

function renderDietFoodPickerPreview() {
    const preview = document.getElementById('diet-food-picker-preview');
    if (!preview) return;
    if (!dietFoodPickerState.selected) {
        preview.innerHTML = '<span>Selecione um alimento para visualizar os dados nutricionais.</span>';
        setDietFoodPickerFeedback('');
        return;
    }
    const food = dietFoodPickerState.selected;
    const normalized = getDietFoodPickerNormalizedQty(
        food,
        dietFoodPickerState.qty || formatFoodQuantity(food.base_qty, food.base_unit)
    );
    const calc = computeMacrosByAmount(food, normalized.amount, normalized.unitKey, normalized.portionId);
    const qtyLabel = normalized.qtyText;
    const baseLabel = formatFoodQuantity(food.base_qty || 100, food.base_unit || 'g');
    preview.innerHTML = `
        <div class="diet-food-picker-preview-food">${escHtml(food.name)}</div>
        <div class="diet-food-picker-preview-base">Base nutricional: ${escHtml(baseLabel)}</div>
        <div class="diet-food-picker-preview-title">Porção selecionada: ${qtyLabel}</div>
        <div class="diet-modern-macro-chips">
            <span class="diet-modern-chip kcal">${calc.kcal} kcal</span>
            <span class="diet-modern-chip protein">${uiSvgIcon('protein')} ${calc.protein}g P</span>
            <span class="diet-modern-chip carb">${uiSvgIcon('carb')} ${calc.carb}g C</span>
            <span class="diet-modern-chip fat">${uiSvgIcon('fat')} ${calc.fat}g G</span>
        </div>
    `;
}

async function ensurePickerFoodSaved(food) {
    if (!food) return null;
    if (food.id) return food;
    const inserted = await insertFoodIntoCatalog({
        name: food.name,
        brand: food.brand || '',
        base_qty: food.base_qty || 100,
        base_unit: food.base_unit || 'g',
        kcal: food.kcal || 0,
        protein: food.protein || 0,
        carb: food.carb || 0,
        fat: food.fat || 0,
        source: food.source || 'manual',
        created_by: getCurrentFoodCreatorId()
    });
    return inserted || food;
}

async function confirmDietFoodPickerSelection() {
    const selected = dietFoodPickerState.selected;
    if (!selected || dietFoodPickerState.loading || dietFoodPickerState.view !== 'detail') return;

    const persistedFood = await ensurePickerFoodSaved(selected);
    if (!persistedFood) return;
    registerRecentFood({
        id: persistedFood?.id || selected?.id || '',
        name: persistedFood?.name || selected?.name || ''
    });
    const normalizedQty = getDietFoodPickerNormalizedQty(
        persistedFood,
        dietFoodPickerState.qty || formatFoodQuantity(persistedFood.base_qty, persistedFood.base_unit),
    );
    const unit = normalizedQty.unitKey;
    const calc = computeMacrosByAmount(
        persistedFood,
        normalizedQty.amount,
        unit,
        normalizedQty.portionId
    );
    const qtyText = formatFoodQuantity(calc.amount, calc.unit_key);
    const usedQtyFallback = !!normalizedQty.usedFallback;

    if (dietFoodPickerState.context === 'trainer-replace') {
        const meal = mealBlocks?.[dietFoodPickerState.mealIdx];
        const item = meal?.items?.[dietFoodPickerState.itemIdx];
        if (item) {
            item.nome = persistedFood.name;
            item.qtd = qtyText;
            item.kcal = calc.kcal;
            item.prot = calc.protein;
            item.carb = calc.carb;
            item.gord = calc.fat;
            item.foodId = persistedFood.id || '';
            item.baseQty = persistedFood.base_qty || 100;
            item.baseUnit = persistedFood.base_unit || unit;
            item.source = persistedFood.source || 'catalog';
            item.amount = calc.amount;
            item.unitKey = calc.unit_key;
            item.portionId = calc.portion_id || '';
            item.portionLabel = calc.portion_label || '';
        }
        renderMeals();
        updateDietPlannerSummary();
    } else {
        persistStudentDietLog((dayLog) => {
            const logItem = ensureDietLogItem(dayLog, dietFoodPickerState.mealIdx, dietFoodPickerState.itemIdx);
            logItem.substitute = {
                enabled: true,
                name: persistedFood.name,
                qty: qtyText,
                kcal: calc.kcal,
                prot: calc.protein,
                carb: calc.carb,
                gord: calc.fat,
                foodId: persistedFood.id || '',
                baseQty: persistedFood.base_qty || 100,
                baseUnit: persistedFood.base_unit || unit,
                source: persistedFood.source || 'catalog',
                amount: calc.amount,
                unitKey: calc.unit_key,
                portionId: calc.portion_id || '',
                portionLabel: calc.portion_label || ''
            };
        });
    }
    closeDietFoodPicker();
    if (usedQtyFallback) {
        showDietRuntimeMessage('Quantidade inválida ajustada para o padrão do alimento.', 'info');
    } else {
        showDietRuntimeMessage('Alimento adicionado com sucesso.', 'success');
    }
}

function toggleDietItemSubstitute(mealIdx, itemIdx) {
    persistStudentDietLog((dayLog) => {
        const item = ensureDietLogItem(dayLog, mealIdx, itemIdx);
        item.substitute = {
            enabled: false,
            name: '',
            qty: '',
            kcal: 0,
            prot: 0,
            carb: 0,
            gord: 0,
            foodId: '',
            baseQty: 100,
            baseUnit: 'g',
            source: 'manual',
            amount: 1,
            unitKey: 'g',
            portionId: '',
            portionLabel: ''
        };
    });
}

let foodDetailsState = {
    open: false,
    mode: '',
    mealIdx: null,
    itemIdx: null,
    food: null,
    amount: 1,
    unitKey: 'g',
    portionId: '',
    selectedPortionIndex: -1,
    portions: [],
    shouldAutoFocus: false
};

function resolveFoodReferenceForItem(item = {}) {
    const cacheMatch = (foodCatalogCache || []).find((food) => String(food.id || '') === String(item.foodId || ''));
    const fallback = {
        id: item.foodId || '',
        name: item.nome || item.name || cacheMatch?.name || 'Alimento',
        brand: item.brand || cacheMatch?.brand || '',
        base_qty: Math.max(0.1, parseDecimalSafe(item.baseQty || item.base_qty) || parseAmountAndUnit(item.qtd || '', item.baseUnit || item.base_unit || cacheMatch?.base_unit || 'g').amount || 100),
        base_unit: normalizeFoodUnitKey(item.baseUnit || item.base_unit || cacheMatch?.base_unit || parseAmountAndUnit(item.qtd || '', 'g').unit || 'g'),
        kcal: parseDecimalSafe(item.kcal) || parseDecimalSafe(cacheMatch?.kcal),
        protein: parseDecimalSafe(item.prot || item.protein) || parseDecimalSafe(cacheMatch?.protein),
        carb: parseDecimalSafe(item.carb) || parseDecimalSafe(cacheMatch?.carb),
        fat: parseDecimalSafe(item.gord || item.fat) || parseDecimalSafe(cacheMatch?.fat),
        source: item.source || cacheMatch?.source || 'manual',
        portions: Array.isArray(item.portions) && item.portions.length
            ? item.portions
            : (cacheMatch?.portions || [])
    };
    return normalizeFoodCatalogRow(cacheMatch ? { ...cacheMatch, ...fallback } : fallback);
}

function ensureFoodDetailsModal() {
    if (document.getElementById('food-details-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'food-details-overlay';
    overlay.className = 'food-details-overlay';
    overlay.onclick = (event) => {
        if (event.target?.id === 'food-details-overlay') closeFoodDetailsModal();
    };

    const modal = document.createElement('div');
    modal.id = 'food-details-modal';
    modal.className = 'food-details-modal';
    modal.innerHTML = `
        <div class="food-details-header">
            <div>
                <h3 id="food-details-title">Detalhes do alimento</h3>
                <small id="food-details-subtitle"></small>
            </div>
            <button type="button" class="food-details-close" onclick="closeFoodDetailsModal()">
                <i class="ph-bold ph-x"></i>
            </button>
        </div>
        <div class="food-details-body">
            <div class="food-details-field">
                <label>Quantidade</label>
                <div class="food-details-amount-control">
                    <button type="button" class="food-details-step-btn" onclick="adjustFoodDetailsAmount(-0.5)" aria-label="Diminuir quantidade">-</button>
                    <input id="food-details-amount" type="number" min="0.1" step="0.1" class="diet-modern-input" oninput="updateFoodDetailsAmount(this.value)">
                    <button type="button" class="food-details-step-btn" onclick="adjustFoodDetailsAmount(0.5)" aria-label="Aumentar quantidade">+</button>
                </div>
            </div>
            <div class="food-details-field">
                <label>Medida</label>
                <select id="food-details-unit" class="diet-modern-input" onchange="selectFoodDetailsPortion(this.value)"></select>
            </div>
            <div id="food-details-base" class="food-details-base"></div>
            <div id="food-details-qty" class="food-details-qty"></div>
            <div id="food-details-preview" class="food-details-preview"></div>
        </div>
        <div class="food-details-footer">
            <button type="button" class="diet-modern-cancel-btn" onclick="closeFoodDetailsModal()">Cancelar</button>
            <button type="button" class="diet-modern-save-btn" onclick="confirmFoodDetailsModal()">Salvar</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleFoodDetailsKeydown);
}

function handleFoodDetailsKeydown(event) {
    if (!foodDetailsState.open) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeFoodDetailsModal();
        return;
    }
    if (event.key === 'Enter') {
        const targetTag = String(event.target?.tagName || '').toLowerCase();
        if (targetTag === 'textarea') return;
        event.preventDefault();
        confirmFoodDetailsModal();
    }
}

function openFoodDetailsModal(state = {}) {
    const food = resolveFoodReferenceForItem(state.food || {});
    if (!food) return;
    const portions = getFoodPortions(food);
    const parsedQty = parseAmountAndUnit(state.qty || '', state.unitKey || food.base_unit || 'g');
    const initialAmount = Math.max(0.1, parseDecimalSafe(state.amount) || parsedQty.amount || parseDecimalSafe(portions[0]?.amount) || 1);
    let selectedPortionIndex = portions.findIndex((portion) => String(portion.id || '') === String(state.portionId || ''));
    if (selectedPortionIndex < 0) {
        selectedPortionIndex = portions.findIndex((portion) => normalizeFoodUnitKey(portion.unit_key) === normalizeFoodUnitKey(state.unitKey || parsedQty.unit || food.base_unit || 'g'));
    }
    if (selectedPortionIndex < 0) selectedPortionIndex = 0;
    const selectedPortion = portions[selectedPortionIndex] || null;

    foodDetailsState = {
        open: true,
        mode: state.mode || 'student',
        mealIdx: Number.isFinite(Number(state.mealIdx)) ? Number(state.mealIdx) : null,
        itemIdx: Number.isFinite(Number(state.itemIdx)) ? Number(state.itemIdx) : null,
        food,
        portions,
        selectedPortionIndex,
        amount: initialAmount,
        unitKey: normalizeFoodUnitKey(selectedPortion?.unit_key || state.unitKey || parsedQty.unit || food.base_unit || 'g'),
        portionId: String(selectedPortion?.id || state.portionId || ''),
        shouldAutoFocus: true
    };
    renderFoodDetailsModal();
}

function renderFoodDetailsModal() {
    ensureFoodDetailsModal();
    const overlay = document.getElementById('food-details-overlay');
    const title = document.getElementById('food-details-title');
    const subtitle = document.getElementById('food-details-subtitle');
    const amountInput = document.getElementById('food-details-amount');
    const unitSelect = document.getElementById('food-details-unit');
    const baseEl = document.getElementById('food-details-base');
    const qtyEl = document.getElementById('food-details-qty');
    const preview = document.getElementById('food-details-preview');
    if (!overlay || !title || !subtitle || !amountInput || !unitSelect || !baseEl || !qtyEl || !preview) return;

    overlay.classList.toggle('active', !!foodDetailsState.open);
    document.body.classList.toggle('food-details-open', !!foodDetailsState.open);
    if (!foodDetailsState.open) return;

    const food = foodDetailsState.food || {};
    const portions = Array.isArray(foodDetailsState.portions) ? foodDetailsState.portions : getFoodPortions(food);
    const selectedIndex = Number.isFinite(foodDetailsState.selectedPortionIndex) ? foodDetailsState.selectedPortionIndex : 0;
    const selectedPortion = portions[selectedIndex] || portions[0] || null;
    title.textContent = foodDetailsState.mode === 'trainer' ? 'Editar alimento do plano' : 'Ajustar consumo do alimento';
    subtitle.textContent = `${food.name || 'Alimento'}${food.brand ? ` · ${food.brand}` : ''}`;

    amountInput.value = String(Math.max(0.1, parseDecimalSafe(foodDetailsState.amount) || 1));
    unitSelect.innerHTML = portions.map((portion, index) => {
        const unitLabel = getFoodUnitLabel(portion.unit_key, portion.amount);
        const suffix = `${portion.amount} ${unitLabel} ≈ ${Math.round((parseDecimalSafe(portion.base_qty_equivalent) || 0) * 10) / 10}${getFoodUnitShort(food.base_unit || 'g')}`;
        return `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${escHtml(portion.label)} (${escHtml(suffix)})</option>`;
    }).join('');

    const resolved = resolveFoodQuantity(food, foodDetailsState.amount, foodDetailsState.unitKey, foodDetailsState.portionId);
    const calc = computeMacrosByAmount(food, foodDetailsState.amount, foodDetailsState.unitKey, foodDetailsState.portionId);
    const baseUnitShort = getFoodUnitShort(food.base_unit || 'g');
    const baseAmountRounded = Math.round((parseDecimalSafe(food.base_qty) || 100) * 10) / 10;
    const baseReference = `${baseAmountRounded}${baseUnitShort}`;
    const baseKcal = Math.round(parseDecimalSafe(food.kcal) || 0);
    const baseProtein = Math.round((parseDecimalSafe(food.protein) || 0) * 10) / 10;
    const baseCarb = Math.round((parseDecimalSafe(food.carb) || 0) * 10) / 10;
    const baseFat = Math.round((parseDecimalSafe(food.fat) || 0) * 10) / 10;
    const equivalent = Math.round((parseDecimalSafe(resolved.baseEquivalent) || 0) * 10) / 10;
    const selectedLabel = selectedPortion?.label ? ` · ${selectedPortion.label}` : '';
    baseEl.textContent = `Base nutricional (${baseReference}): ${baseKcal} kcal · P ${baseProtein}g · C ${baseCarb}g · G ${baseFat}g`;
    qtyEl.textContent = `Quantidade: ${formatFoodQuantity(calc.amount, calc.unit_key)}${selectedLabel} · Equivalente: ${equivalent}${baseUnitShort}`;
    preview.innerHTML = `
        <div class="food-details-chip kcal">${calc.kcal} kcal</div>
        <div class="food-details-chip">${uiSvgIcon('protein')} ${calc.protein}g proteína</div>
        <div class="food-details-chip">${uiSvgIcon('carb')} ${calc.carb}g carboidrato</div>
        <div class="food-details-chip">${uiSvgIcon('fat')} ${calc.fat}g gordura</div>
    `;

    if (foodDetailsState.shouldAutoFocus) {
        foodDetailsState.shouldAutoFocus = false;
        requestAnimationFrame(() => {
            amountInput.focus();
            amountInput.select();
        });
    }
}

function closeFoodDetailsModal() {
    foodDetailsState.open = false;
    const overlay = document.getElementById('food-details-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('food-details-open');
}

function selectFoodDetailsPortion(indexValue) {
    const idx = Math.max(0, parseInt(indexValue, 10) || 0);
    const portion = foodDetailsState.portions?.[idx];
    if (!portion) return;
    foodDetailsState.selectedPortionIndex = idx;
    foodDetailsState.unitKey = normalizeFoodUnitKey(portion.unit_key || foodDetailsState.unitKey || 'g');
    foodDetailsState.portionId = String(portion.id || '');
    renderFoodDetailsModal();
}

function updateFoodDetailsAmount(value) {
    const next = Math.max(0.1, parseDecimalSafe(value) || 0.1);
    foodDetailsState.amount = next;
    renderFoodDetailsModal();
}

function adjustFoodDetailsAmount(delta) {
    const numericDelta = parseDecimalSafe(delta) || 0;
    if (!numericDelta) return;
    const current = Math.max(0.1, parseDecimalSafe(foodDetailsState.amount) || 0.1);
    const next = Math.max(0.1, Math.round((current + numericDelta) * 10) / 10);
    foodDetailsState.amount = next;
    renderFoodDetailsModal();
}

function openFoodDetailsFromTrainerItem(mealIdx, itemIdx) {
    const item = mealBlocks?.[mealIdx]?.items?.[itemIdx];
    if (!item) return;
    openFoodDetailsModal({
        mode: 'trainer',
        mealIdx,
        itemIdx,
        food: item,
        amount: parseDecimalSafe(item.amount) || parseAmountAndUnit(item.qtd || '', item.unitKey || item.baseUnit || 'g').amount || 1,
        unitKey: item.unitKey || parseAmountAndUnit(item.qtd || '', item.baseUnit || 'g').unit || item.baseUnit || 'g',
        portionId: item.portionId || '',
        qty: item.qtd || ''
    });
}

function openFoodDetailsFromStudentItem(mealIdx, itemIdx) {
    const { student } = getStudentData();
    const item = student?.mealBlocks?.[mealIdx]?.items?.[itemIdx];
    if (!item) return;
    const dayLog = getStudentDietLogForDate(student, studentDietSelectedDateKey || getTodayDateKey());
    const logItem = getDietLogItem(dayLog, mealIdx, itemIdx) || {};
    openFoodDetailsModal({
        mode: 'student',
        mealIdx,
        itemIdx,
        food: item,
        amount: parseDecimalSafe(logItem.amount) || parseAmountAndUnit(logItem.qty || item.qtd || '', logItem.unitKey || item.unitKey || item.baseUnit || 'g').amount || 1,
        unitKey: logItem.unitKey || parseAmountAndUnit(logItem.qty || item.qtd || '', item.unitKey || item.baseUnit || 'g').unit || item.unitKey || item.baseUnit || 'g',
        portionId: logItem.portionId || item.portionId || '',
        qty: logItem.qty || item.qtd || ''
    });
}

function confirmFoodDetailsModal() {
    const food = foodDetailsState.food;
    if (!food) return;
    const calc = computeMacrosByAmount(food, foodDetailsState.amount, foodDetailsState.unitKey, foodDetailsState.portionId);
    const qtyText = formatFoodQuantity(calc.amount, calc.unit_key);

    if (foodDetailsState.mode === 'trainer') {
        const meal = mealBlocks?.[foodDetailsState.mealIdx];
        const item = meal?.items?.[foodDetailsState.itemIdx];
        if (!item) return;
        item.qtd = qtyText;
        item.kcal = calc.kcal;
        item.prot = calc.protein;
        item.carb = calc.carb;
        item.gord = calc.fat;
        item.foodId = item.foodId || food.id || '';
        item.baseQty = Math.max(0.1, parseDecimalSafe(food.base_qty) || parseDecimalSafe(item.baseQty) || 100);
        item.baseUnit = normalizeFoodUnitKey(food.base_unit || item.baseUnit || 'g');
        item.source = food.source || item.source || 'catalog';
        item.amount = calc.amount;
        item.unitKey = calc.unit_key;
        item.portionId = calc.portion_id || '';
        item.portionLabel = calc.portion_label || '';
        renderMeals();
        updateDietPlannerSummary();
        signalStudentPlanDirty();
        closeFoodDetailsModal();
        return;
    }

    persistStudentDietLog((dayLog) => {
        const logItem = ensureDietLogItem(dayLog, foodDetailsState.mealIdx, foodDetailsState.itemIdx);
        logItem.qty = qtyText;
        logItem.amount = calc.amount;
        logItem.unitKey = calc.unit_key;
        logItem.portionId = calc.portion_id || '';
        logItem.portionLabel = calc.portion_label || '';
    });
    closeFoodDetailsModal();
}

function renderStudentDietMain() {
    const studentId = memoryGetItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    const container = document.getElementById('student-diet-content-main');
    if (!container) return;
    const actionsInline = document.getElementById('diet-day-actions-inline');
    if (navigator.onLine === false) {
        setStudentSyncState('offline', 'Sem conexão');
    } else if (studentSyncState.status === 'offline') {
        setStudentSyncState('synced', 'Sincronizado');
    } else {
        renderDietSyncStatus();
    }

    if (!student || !student.active || !student.mealBlocks) {
        container.innerHTML = `<div class="empty-state-card" style="margin-top:2rem;">
            <i class="ph-fill ph-hourglass-high"></i>
            <div class="empty-info">
                <h3>Dieta em análise</h3>
                <p>Seu plano alimentar ainda não foi liberado pelo treinador.</p>
            </div>
        </div>`;
        if (actionsInline) actionsInline.innerHTML = '';
        return;
    }

    if (!studentDietSelectedDateKey) studentDietSelectedDateKey = getTodayDateKey();
    container.innerHTML = renderStudentDietContent(student);
    optimizeMediaElements(container);
    if (actionsInline) actionsInline.innerHTML = '';
}

let pendingTrainerCode = '';

async function connectStudent() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser) {
        alert('Faça login com e-mail e senha antes de conectar ao treinador.');
        goToGlobalLogin();
        return;
    }
    const profile = await getProfileByUserId(activeUser.id);
    const roles = normalizeAppRoles(profile?.roles || activeUser?.user_metadata?.roles, profile?.role || activeUser?.user_metadata?.role);
    if (!roles.includes('student')) {
        alert('Apenas contas de aluno podem usar esta opção.');
        return;
    }

    const code = sanitizeCodeInput(document.getElementById('trainer-code')?.value, 5);
    const codeInput = document.getElementById('trainer-code');
    if (codeInput) codeInput.value = code;
    if (code.length !== 5) {
        alert('O código deve ter exatamente 5 dígitos.');
        return;
    }

    // Admin code fallback
    let coachName = '';
    let consultoriaName = '';

    if (ENABLE_DEMO_ACCESS && code === '00001') {
        coachName = 'Administrador Teste';
        consultoriaName = 'Admin Consultoria';
    } else {
        // Search in trainer data
        const trainers = readStorageJSON('allTrainers', []);
        const t = trainers.find(x => x.code === code);
        if (t) {
            coachName = t.name;
            consultoriaName = t.consultoriaName || `Consultoria de ${t.name.split(' ')[0]} `;
        } else if (isSupabaseReady()) {
            const remoteTrainer = await getTrainerByCodeRemote(code);
            if (remoteTrainer) {
                coachName = remoteTrainer.name || 'Treinador';
                consultoriaName = remoteTrainer.consultoria_name || `Consultoria de ${coachName.split(' ')[0]} `;
            } else {
                alert('Código de treinador não encontrado.');
                return;
            }
        } else {
            alert('Código de treinador não encontrado.');
            return;
        }
    }

    pendingTrainerCode = code;
    const hint = coachName ? `${coachName} • ${consultoriaName || 'Consultoria'}` : 'Consultoria conectada';
    alert(`Código validado com sucesso.\n${hint}`);
    await confirmConnection();
}

async function confirmConnection() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser) {
        goToGlobalLogin();
        return;
    }
    const onboardingDraft = memoryGetItem('onboardingQuestionnaireDraft');
    const onboardingPending = memoryGetItem('onboardingPendingQuestionnaire') === '1';
    const onboardingStep = memoryGetItem('currentOnboardingStep');
    if ((onboardingPending && onboardingDraft) || onboardingStep === 'trainer_connect') {
        await finalizeStudentOnboardingConnection().catch((err) => {
            console.error('Erro ao finalizar onboarding do aluno', err);
            alert('Não foi possível concluir a conexão com o treinador.');
        });
        return;
    }

    const currentStudentId = String(memoryGetItem('currentStudentId') || '');
    if (currentStudentId && pendingTrainerCode) {
        const students = readStorageJSON('trainerStudents', []);
        const sIdx = students.findIndex((s) => String(s.id) === currentStudentId);
        if (sIdx >= 0) {
            students[sIdx].trainerCode = pendingTrainerCode;
            students[sIdx].trainer_code = pendingTrainerCode;
            students[sIdx].pending = true;
            students[sIdx].active = false;
            saveStudentData(students);
        }
        await upsertOwnProfile({
            id: activeUser.id,
            connected_trainer_code: pendingTrainerCode,
            onboarding_step: 'done'
        });
        await syncStudentConnectionEntity(activeUser.id, pendingTrainerCode, 'pending');
        memorySetItem('connectedTrainerCode', pendingTrainerCode);
        showDietRuntimeMessage('Conexão atualizada. Aguardando aprovação do treinador.', 'success');
        await openStudentDashboardForUser(activeUser.id, pendingTrainerCode);
        return;
    }

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

    const questionnairePayload = {
        name: nome,
        age,
        gender,
        weight,
        height,
        goal,
        questionnaire
    };

    const onboardingPending = memoryGetItem('onboardingPendingQuestionnaire') === '1';
    if (onboardingPending && (!pendingTrainerCode || pendingTrainerCode.length !== 5)) {
        memorySetItem('onboardingQuestionnaireDraft', JSON.stringify(questionnairePayload));
        const activeUser = await getSupabaseSessionUser();
        if (activeUser) {
            await upsertOwnProfile({
                id: activeUser.id,
                anamnesis: questionnairePayload,
                profile_complete: true,
                onboarding_step: 'trainer_connect'
            });
        }
        alert('Anamnese salva. Agora conecte o código do treinador para concluir.');
        showTrainerConnectScreen();
        return;
    }

    if (!pendingTrainerCode || pendingTrainerCode.length !== 5) {
        alert('Conexão com treinador inválida. Refaça o processo de conexão.');
        return;
    }

    let id = Math.floor(10000 + Math.random() * 90000).toString();
    const usedIds = new Set((readStorageJSON('trainerStudents', [])).map(s => String(s.id)));
    while (id === ADMIN_STUDENT_CODE || id === SELF_TRAINING_STUDENT_CODE || usedIds.has(id)) {
        id = Math.floor(10000 + Math.random() * 90000).toString();
    }
    const newStudent = {
        id: id,
        userId: String((await getSupabaseSessionUser())?.id || ''),
        name: nome,
        age: age,
        gender: gender,
        weight: weight,
        height: height,
        goal: goal,
        active: false,
        pending: true,
        trainerCode: pendingTrainerCode,
        trainer_code: pendingTrainerCode,
        joinedAt: new Date().toISOString(),
        workoutBlocks: getDefaultWorkoutBlocks(),
        mealBlocks: [],
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
    const dietBase = createDietBaseFromStudent(newStudent);
    newStudent.mealBlocks = dietBase.mealBlocks;
    newStudent.dietMeta = dietBase.dietMeta;

    if (isSupabaseReady()) {
        const fallbackName = pendingTrainerCode === '00001' ? 'Administrador Teste' : 'Treinador';
        const fallbackConsultoria = fallbackName ? `Consultoria de ${fallbackName.split(' ')[0]} ` : '';
        await ensureTrainerExistsRemote(pendingTrainerCode, fallbackName, fallbackConsultoria);
    }

    let students = readStorageJSON('trainerStudents', []);
    students.push(newStudent);
    saveStudentData(students);
    syncStudentProfileEntity(newStudent);

    let notifs = readStorageJSON('trainerNotifications', []);
    notifs.unshift({
        type: 'questionnaire',
        title: 'Questionário Respondido!',
        desc: 'Um novo aluno acabou de enviar o questionário inicial.',
        time: 'Agora mesmo',
        unread: true
    });
    memorySetItem('trainerNotifications', JSON.stringify(notifs));

    const activeUser = await getSupabaseSessionUser();
    if (activeUser) {
        const profile = await getProfileByUserId(activeUser.id);
        const roles = normalizeAppRoles(profile?.roles || activeUser?.user_metadata?.roles, profile?.role || activeUser?.user_metadata?.role);
        await upsertOwnProfile({
            id: activeUser.id,
            role: roles[0],
            roles,
            profile_complete: true,
            connected_trainer_code: pendingTrainerCode,
            onboarding_step: 'done',
            anamnesis: questionnairePayload
        });
        await syncStudentConnectionEntity(activeUser.id, pendingTrainerCode, 'pending');
        memorySetItem('currentOnboardingStep', 'done');
        memoryRemoveItem('onboardingPendingQuestionnaire');
        memoryRemoveItem('onboardingQuestionnaireDraft');
    }

    // Save current session info + remember-me token
    openStudentDashboardSession(newStudent);
}

async function finalizeStudentOnboardingConnection() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser) {
        goToGlobalLogin();
        return;
    }
    const profile = await getProfileByUserId(activeUser.id);
    const roles = normalizeAppRoles(profile?.roles || activeUser?.user_metadata?.roles, profile?.role || activeUser?.user_metadata?.role);
    if (!roles.includes('student')) {
        alert('Essa conta não possui papel de aluno.');
        return;
    }

    const draftRaw = memoryGetItem('onboardingQuestionnaireDraft');
    let draft = null;
    if (draftRaw) {
        try {
            draft = JSON.parse(draftRaw);
        } catch (err) {
            memoryRemoveItem('onboardingQuestionnaireDraft');
        }
    }
    if (!draft && profile?.anamnesis && typeof profile.anamnesis === 'object') {
        draft = profile.anamnesis;
    }
    if (!draft) {
        alert('A anamnese nao foi encontrada. Refaça essa etapa.');
        hideAllScreens();
        const app = document.getElementById('app');
        if (app) app.classList.add('wide');
        const qScreen = document.getElementById('student-questionnaire-screen');
        if (qScreen) qScreen.classList.add('active');
        return;
    }

    const trainerCode = sanitizeCodeInput(pendingTrainerCode, 5);
    if (trainerCode.length !== 5) {
        alert('Código do treinador inválido.');
        return;
    }

    let students = readStorageJSON('trainerStudents', []);
    let existingStudent = students.find((s) => String(s.userId || '') === String(activeUser.id));
    let studentId = existingStudent?.id || Math.floor(10000 + Math.random() * 90000).toString();
    const usedIds = new Set(students.map((s) => String(s.id)));
    while ((!existingStudent && usedIds.has(studentId)) || studentId === ADMIN_STUDENT_CODE || studentId === SELF_TRAINING_STUDENT_CODE) {
        studentId = Math.floor(10000 + Math.random() * 90000).toString();
    }

    const newStudent = {
        id: studentId,
        userId: String(activeUser.id),
        name: sanitizeUserInput(draft.name || activeUser?.user_metadata?.name || 'Aluno', { maxLen: 90 }),
        age: String(draft.age || '25'),
        gender: draft.gender || 'M',
        weight: String(draft.weight || '70'),
        height: String(draft.height || '175'),
        goal: sanitizeUserInput(draft.goal || 'Hipertrofia', { maxLen: 120 }),
        active: false,
        pending: true,
        trainerCode,
        trainer_code: trainerCode,
        joinedAt: existingStudent?.joinedAt || new Date().toISOString(),
        workoutBlocks: Array.isArray(existingStudent?.workoutBlocks) && existingStudent.workoutBlocks.length > 0
            ? existingStudent.workoutBlocks
            : getDefaultWorkoutBlocks(),
        mealBlocks: [],
        metricHistory: Array.isArray(existingStudent?.metricHistory) && existingStudent.metricHistory.length > 0
            ? existingStudent.metricHistory
            : [{
                date: new Date().toISOString(),
                weight: parseFloat(draft.weight || 70),
                height: parseFloat(draft.height || 175),
                bodyFat: null
            }],
        personalRecords: existingStudent?.personalRecords || {},
        questionnaire: draft.questionnaire || draft || {}
    };
    newStudent.tmbBase = Math.round(calcTMBMifflin(newStudent.weight, newStudent.height, newStudent.age, newStudent.gender));
    const dietBase = createDietBaseFromStudent(newStudent);
    newStudent.mealBlocks = Array.isArray(existingStudent?.mealBlocks) && existingStudent.mealBlocks.length > 0
        ? existingStudent.mealBlocks
        : dietBase.mealBlocks;
    newStudent.dietMeta = existingStudent?.dietMeta && typeof existingStudent.dietMeta === 'object'
        ? existingStudent.dietMeta
        : dietBase.dietMeta;

    students = students.filter((s) => String(s.id) !== String(newStudent.id));
    students.push(newStudent);
    saveStudentData(students);
    syncStudentProfileEntity(newStudent);

    if (isSupabaseReady()) {
        const fallbackName = trainerCode === '00001' ? 'Administrador Teste' : 'Treinador';
        const fallbackConsultoria = fallbackName ? `Consultoria de ${fallbackName.split(' ')[0]} ` : '';
        await ensureTrainerExistsRemote(trainerCode, fallbackName, fallbackConsultoria);
    }

    await upsertOwnProfile({
        id: activeUser.id,
        role: roles[0],
        roles,
        profile_complete: true,
        connected_trainer_code: trainerCode,
        onboarding_step: 'done',
        anamnesis: draft
    });
    await syncStudentConnectionEntity(activeUser.id, trainerCode, 'pending');

    memorySetItem('currentOnboardingStep', 'done');
    memoryRemoveItem('onboardingPendingQuestionnaire');
    memoryRemoveItem('onboardingQuestionnaireDraft');
    openStudentDashboardSession(newStudent);
}

// ? Student Dashboard (Real Data) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function initStudentDashboard() {
    migrateStoredStudentsDietSchema();
    pullAppStateIfNewer();
    startSyncPolling();
    const trainerCode = memoryGetItem('connectedTrainerCode');
    if (trainerCode && trainerCode !== '00000') {
        await syncStudentsFromSupabase(trainerCode);
        startSupabaseRealtimeSync(trainerCode);
    }
    if (isSupabaseReady()) {
        startSupabaseFoodsRealtimeSync();
        scheduleFoodsCatalogSync(30);
    }
    const studentId = memoryGetItem('currentStudentId');
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
        let changed = nextTmb !== prevTmb;
        if (!Array.isArray(student.mealBlocks) || student.mealBlocks.length === 0) {
            const dietBase = createDietBaseFromStudent(student);
            student.mealBlocks = dietBase.mealBlocks;
            student.dietMeta = {
                ...(student.dietMeta || {}),
                ...dietBase.dietMeta
            };
            changed = true;
        } else if (!student.dietMeta || typeof student.dietMeta !== 'object') {
            const dietBase = createDietBaseFromStudent(student);
            student.dietMeta = dietBase.dietMeta;
            changed = true;
        }
        if (changed) {
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

    if (!studentDietSelectedDateKey) studentDietSelectedDateKey = getTodayDateKey();
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

function saveStudentData(students, options = {}) {
    const skipSupabaseSync = !!options?.skipSupabaseSync;
    const normalized = normalizeStudentsDietSchema(students || []);
    memorySetItem('trainerStudents', JSON.stringify(normalized));
    if (!skipSupabaseSync) {
        queueSupabaseStudentsSync(normalized);
    }
}

function updateStudentRecord(studentId, updater) {
    if (!studentId) return;
    const students = readStorageJSON('trainerStudents', []);
    const idx = students.findIndex(s => String(s.id) === String(studentId));
    if (idx < 0) return;
    const current = students[idx] || {};
    const nextPartial = typeof updater === 'function' ? updater(current) : updater;
    if (!nextPartial || typeof nextPartial !== 'object') return;
    students[idx] = { ...current, ...nextPartial, id: current.id };
    saveStudentData(students);
}

function appendStudentWorkoutHistory(studentId, workoutArchive) {
    if (!studentId || !workoutArchive) return;
    updateStudentRecord(studentId, (current) => {
        const history = Array.isArray(current.workoutHistory) ? current.workoutHistory.slice() : [];
        history.push(workoutArchive);
        const trimmed = history.slice(-200);
        return { workoutHistory: trimmed };
    });
}

function setStudentChatMessages(studentId, messages) {
    if (!studentId) return;
    const trimmed = Array.isArray(messages) ? messages.slice(-200) : [];
    updateStudentRecord(studentId, { chatMessages: trimmed });
}

function mergeWorkoutHistoryFromStudents(students) {
    const local = readStorageJSON('workoutHistory', []);
    const map = new Map();
    const addItem = (item) => {
        if (!item) return;
        const key = `${item.ID_Usuario || ''}-${item.Data_Treino || ''}-${item.Nome_Treino || ''}`;
        if (!map.has(key)) map.set(key, item);
    };
    local.forEach(addItem);
    (students || []).forEach((s) => {
        if (Array.isArray(s.workoutHistory)) {
            s.workoutHistory.forEach(addItem);
        }
    });
    const merged = Array.from(map.values());
    memorySetItem('workoutHistory', JSON.stringify(merged));
}

function syncChatMessagesFromStudents(students) {
    (students || []).forEach((s) => {
        if (!s?.id || !Array.isArray(s.chatMessages)) return;
        const storageKey = getStudentChatStorageKey(s.id);
        const local = readStorageJSON(storageKey, []);
        const map = new Map();
        [...local, ...s.chatMessages].forEach((msg) => {
            if (!msg) return;
            const key = msg.id || `${msg.sender || ''}-${msg.time || ''}-${msg.text || ''}`;
            if (!map.has(key)) map.set(key, msg);
        });
        const merged = Array.from(map.values()).slice(-200);
        memorySetItem(storageKey, JSON.stringify(merged));
    });
}

function calcIMC(weight, height) {
    if (!weight || !height) return 0;
    const h = parseFloat(height) / 100;
    return (parseFloat(weight) / (h * h)).toFixed(1);
}

function parseDecimalSafe(value) {
    const parsed = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseIntegerSafe(value) {
    const parsed = parseInt(String(value || ''), 10);
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

    const anamnesisSummary = document.getElementById('perfil-anamnesis-summary');
    if (anamnesisSummary) {
        const anamnesisView = buildPerfilAnamnesisView(student);
        anamnesisSummary.innerHTML = anamnesisView;
    }

    // History list
    renderPerfilHistory(student);

    // Chart
    renderPerfilChart();
}

function getStudentAnamnesisSource(student = {}) {
    if (student?.questionnaire && typeof student.questionnaire === 'object') {
        return student.questionnaire;
    }
    if (student?.anamnesis?.questionnaire && typeof student.anamnesis.questionnaire === 'object') {
        return student.anamnesis.questionnaire;
    }
    const cachedRaw = memoryGetItem('currentAnamnesis');
    if (cachedRaw) {
        try {
            const cached = JSON.parse(cachedRaw);
            if (cached?.questionnaire && typeof cached.questionnaire === 'object') return cached.questionnaire;
            if (cached && typeof cached === 'object') return cached;
        } catch (err) {
            // noop
        }
    }
    return null;
}

function buildPerfilAnamnesisView(student = {}) {
    const anamnesis = getStudentAnamnesisSource(student);
    if (!anamnesis) {
        return `
            <div class="perfil-history-empty">
                <i class="ph-bold ph-clipboard-text"></i>
                <p>A anamnese ainda não foi encontrada. Conecte sua conta para concluir o onboarding.</p>
            </div>
        `;
    }

    const summaryItems = [
        { label: 'Dor / Limitações', value: anamnesis?.saude?.dor === 'sim' ? 'Sim' : 'Não' },
        { label: 'Uso de medicação', value: anamnesis?.saude?.med === 'sim' ? 'Sim' : 'Não' },
        { label: 'Horas de sono', value: `${anamnesis?.rotina?.sono || '--'} h` },
        { label: 'Refeições por dia', value: anamnesis?.nutricao?.refeicoes || '--' },
        { label: 'Estresse', value: anamnesis?.rotina?.estresse || '--' },
        { label: 'Duração de treino', value: `${anamnesis?.treino?.duracao || '--'} min` }
    ];

    return `
        <p style="margin:0; color:var(--text-muted);">
            Resumo do seu questionário inicial usado para montar treino e dieta.
        </p>
        <div class="perfil-anamnesis-summary-grid">
            ${summaryItems.map((item) => `
                <div class="perfil-anamnesis-item">
                    <span>${escHtml(item.label)}</span>
                    <strong>${escHtml(String(item.value || '--'))}</strong>
                </div>
            `).join('')}
        </div>
        <div class="perfil-anamnesis-actions">
            <button class="btn-secondary" type="button" onclick="openPerfilAnamnesisModal()">
                <i class="ph-bold ph-eye"></i> Ver completo
            </button>
        </div>
    `;
}

function openPerfilAnamnesisModal() {
    const modal = document.getElementById('perfil-anamnesis-modal');
    const body = document.getElementById('perfil-anamnesis-modal-body');
    const { student } = getStudentData();
    if (!modal || !body) return;
    const anamnesis = getStudentAnamnesisSource(student || {});
    if (!anamnesis) {
        body.innerHTML = '<p style="color:var(--text-muted); margin:0;">A anamnese ainda não foi preenchida.</p>';
    } else {
        const sections = [
            { title: 'Saúde', data: anamnesis.saude || {} },
            { title: 'Nutrição', data: anamnesis.nutricao || {} },
            { title: 'Rotina', data: anamnesis.rotina || {} },
            { title: 'Treino', data: anamnesis.treino || {} },
            { title: 'Metas', data: anamnesis.metas || {} }
        ];
        body.innerHTML = `
            <div class="perfil-anamnesis-details">
                ${sections.map((section) => `
                    <div class="perfil-anamnesis-item">
                        <span>${escHtml(section.title)}</span>
                        <strong>${escHtml(
                            Object.entries(section.data || {})
                                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : (value || '--')}`)
                                .join(' | ') || '--'
                        )}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    }
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closePerfilAnamnesisModal() {
    const modal = document.getElementById('perfil-anamnesis-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 220);
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
        syncStudentProfileEntity(student);

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

async function connectTrainer() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser || !isEmailConfirmed(activeUser)) {
        alert('Faça login com e-mail e senha antes de acessar o painel do treinador.');
        window.location.href = 'index.html';
        return;
    }

    const profile = await getProfileByUserId(activeUser.id);
    const roles = normalizeAppRoles(profile?.roles || activeUser?.user_metadata?.roles, profile?.role || activeUser?.user_metadata?.role);
    if (!roles.includes('trainer')) {
        alert('Seu usuário não tem permissão de treinador.');
        window.location.href = 'index.html';
        return;
    }

    let trainerCode = sanitizeCodeInput(profile?.trainer_code || memoryGetItem('currentTrainerCode') || '', 5);
    if (!trainerCode) trainerCode = await generateUniqueTrainerCode();

    const trainerName = sanitizeUserInput(profile?.name || activeUser?.user_metadata?.name || activeUser?.email || 'Treinador', { maxLen: 90 }) || 'Treinador';
    memorySetItem('trainerName', trainerName.split(' ')[0]);
    memorySetItem('currentTrainerCode', trainerCode);
    const profileRoles = normalizeAppRoles(profile?.roles, profile?.role || 'trainer');
    if (!profileRoles.includes('trainer')) profileRoles.unshift('trainer');
    await window.supabase
        .from('profiles')
        .update({ trainer_code: trainerCode, role: 'trainer', roles: profileRoles })
        .eq('id', activeUser.id);
    await ensureTrainerExistsRemote(
        trainerCode,
        trainerName,
        `Consultoria de ${trainerName.split(' ')[0]} `
    );

    // Go to dashboard
    hideAllScreens();
    document.getElementById('app').classList.add('wide');
    document.getElementById('trainer-dashboard-screen').classList.add('active');
    await initTrainerDashboard();
}

async function createConsultoria() {
    const activeUser = await getSupabaseSessionUser();
    if (!activeUser) {
        alert('Faça login antes de criar sua consultoria.');
        window.location.href = 'index.html';
        return;
    }
    const profile = await getProfileByUserId(activeUser.id);
    const roles = normalizeAppRoles(profile?.roles || activeUser?.user_metadata?.roles, profile?.role || activeUser?.user_metadata?.role);
    if (!roles.includes('trainer')) {
        alert('Apenas treinadores podem criar consultoria.');
        return;
    }

    const name = sanitizeUserInput(document.getElementById('trainer-name')?.value, { maxLen: 90 });
    const nameInput = document.getElementById('trainer-name');
    if (nameInput) nameInput.value = name;
    const services = document.querySelector('input[name="services"]:checked');

    if (!name.trim() || !services) {
        alert('Preencha todos os dados corretamente.');
        return;
    }

    const firstName = sanitizeUserInput(name.split(' ')[0], { maxLen: 30 }) || 'Coach';
    const newCode = await generateUniqueTrainerCode();

    // Save trainer to "global" list
    const trainers = readStorageJSON('allTrainers', []);
    const trainerPayload = {
        name: name,
        code: newCode,
        consultoriaName: `Consultoria de ${firstName} `,
        services: services.value
    };
    trainers.push(trainerPayload);
    memorySetItem('allTrainers', JSON.stringify(trainers));

    if (isSupabaseReady()) {
        await ensureTrainerExistsRemote(
            newCode,
            trainerPayload.name,
            trainerPayload.consultoriaName
        );
    }

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
async function initTrainerDashboard() {
    migrateStoredStudentsDietSchema();

    const sessionUser = await getSupabaseSessionUser();
    if (!sessionUser) {
        hideAllScreens();
        const trainerLoginScreen = document.getElementById('trainer-login-screen');
        if (trainerLoginScreen) trainerLoginScreen.classList.add('active');
        return;
    }

    const profile = await getProfileByUserId(sessionUser.id);
    const sessionRoles = normalizeAppRoles(profile?.roles || sessionUser?.user_metadata?.roles, profile?.role || sessionUser?.user_metadata?.role);
    if (!sessionRoles.includes('trainer')) {
        alert('Acesso restrito ao treinador.');
        window.location.href = 'index.html';
        return;
    }

    const trainerNameResolved = sanitizeUserInput(profile?.name || sessionUser?.user_metadata?.name || memoryGetItem('trainerName') || 'Treinador', { maxLen: 90 }) || 'Treinador';
    let trainerCodeResolved = sanitizeCodeInput(profile?.trainer_code || memoryGetItem('currentTrainerCode') || '', 5);
    if (!trainerCodeResolved) {
        trainerCodeResolved = await generateUniqueTrainerCode();
        const updateRoles = normalizeAppRoles(profile?.roles, profile?.role || 'trainer');
        if (!updateRoles.includes('trainer')) updateRoles.unshift('trainer');
        await window.supabase
            .from('profiles')
            .update({ trainer_code: trainerCodeResolved, role: 'trainer', roles: updateRoles })
            .eq('id', sessionUser.id);
    }
    memorySetItem('trainerName', trainerNameResolved.split(' ')[0]);
    memorySetItem('currentTrainerCode', trainerCodeResolved);
    await ensureTrainerExistsRemote(
        trainerCodeResolved,
        trainerNameResolved,
        `Consultoria de ${trainerNameResolved.split(' ')[0]} `
    );

    const trainerName = memoryGetItem('trainerName') || 'Treinador';
    const trainerCode = memoryGetItem('currentTrainerCode') || trainerCodeResolved || '00000';
    if (!memoryGetItem('trainerCodeDefault') && trainerCode && trainerCode !== '00000') {
        memorySetItem('trainerCodeDefault', trainerCode);
    }

    pullAppStateIfNewer();
    startSyncPolling();
    if (trainerCode && trainerCode !== '00000') {
        syncStudentsFromSupabase(trainerCode);
        startSupabaseRealtimeSync(trainerCode);
    }
    if (isSupabaseReady()) {
        startSupabaseFoodsRealtimeSync();
        scheduleFoodsCatalogSync(30);
    }

    const dashboardScreen = document.getElementById('trainer-dashboard-screen');
    if (dashboardScreen) {
        hideAllScreens();
        const app = document.getElementById('app');
        if (app) app.classList.add('wide');
        dashboardScreen.classList.add('active');
    }

    const elDashName = document.getElementById('dash-trainer-name');
    if (elDashName) elDashName.innerText = trainerName;
    const elSidebarName = document.getElementById('sidebar-trainer-name');
    if (elSidebarName) elSidebarName.innerText = 'Modo Admin';

    const elDashCode = document.getElementById('dash-trainer-code');
    if (elDashCode) elDashCode.innerText = trainerCode;
    const elSidebarCode = document.getElementById('sidebar-trainer-code');
    if (elSidebarCode) elSidebarCode.innerText = trainerCode;

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
            pullIndicator.textContent = '? Atualizar';
            mainContent.style.position = 'relative';
            mainContent.appendChild(pullIndicator);
        };

        mainContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = true;

            // Check if at top of scroll for pull-to-refresh
            if (mainContent.scrollTop === 0) {
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
                    pullIndicator.textContent = '? Atualizado';
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
        hint.innerHTML = '?? Deslize para navegar entre as telas';
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
        brandLogo: '',
        billingStartDate: '',
        billingMonthlyAmount: '',
        billingCurrentStatus: 'pendente',
        billingCurrentPaidAt: '',
        billingNotes: '',
        billingHistory: []
    };
    const stored = readStorageJSON(TRAINER_SETTINGS_KEY, {});
    const specialties = Array.isArray(stored.specialties) ? stored.specialties : [];
    const billingHistory = Array.isArray(stored.billingHistory) ? stored.billingHistory : [];
    return { ...defaults, ...stored, specialties, billingHistory };
}

function updateTrainerSettings(partial) {
    const current = loadTrainerSettings();
    const next = { ...current, ...partial };
    memorySetItem(TRAINER_SETTINGS_KEY, JSON.stringify(next));
    return next;
}

async function getLoggedTrainerUserRecord() {
    const sessionUser = await getSupabaseSessionUser();
    if (!sessionUser) return null;
    const profile = await getProfileByUserId(sessionUser.id);
    const roles = normalizeAppRoles(profile?.roles || sessionUser?.user_metadata?.roles, profile?.role || sessionUser?.user_metadata?.role);
    if (!roles.includes('trainer')) return null;
    return { sessionUser, profile };
}

function setTrainerPasswordFeedback(message, type = '') {
    const feedback = document.getElementById('trainer-password-feedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (type) feedback.classList.add(type);
}

async function changeTrainerPassword() {
    const currentPass = document.getElementById('trainer-current-password')?.value || '';
    const nextPass = document.getElementById('trainer-new-password')?.value || '';
    const confirmPass = document.getElementById('trainer-confirm-password')?.value || '';

    const loginRecord = await getLoggedTrainerUserRecord();
    if (!loginRecord) {
        setTrainerPasswordFeedback('Nao foi possivel identificar a conta do treinador logado.', 'error');
        return;
    }
    if (!currentPass || !nextPass || !confirmPass) {
        setTrainerPasswordFeedback('Preencha senha atual, nova senha e confirmacao.', 'error');
        return;
    }
    const hasLetter = /[A-Za-z]/.test(nextPass);
    const hasNumber = /\d/.test(nextPass);
    if (nextPass.length < 8 || !hasLetter || !hasNumber) {
        setTrainerPasswordFeedback('A nova senha precisa ter no minimo 8 caracteres com letras e numeros.', 'error');
        return;
    }
    if (nextPass !== confirmPass) {
        setTrainerPasswordFeedback('A confirmacao da nova senha nao confere.', 'error');
        return;
    }

    if (typeof window.supabase?.auth?.signInWithPassword !== 'function') {
        setTrainerPasswordFeedback('Supabase Auth indisponivel.', 'error');
        return;
    }

    const email = sanitizeEmailInput(loginRecord.sessionUser?.email || '');
    const reauth = await window.supabase.auth.signInWithPassword({
        email,
        password: currentPass
    });
    if (reauth?.error) {
        setTrainerPasswordFeedback('A senha atual esta incorreta.', 'error');
        return;
    }

    const { error: updateError } = await window.supabase.auth.updateUser({
        password: nextPass
    });
    if (updateError) {
        setTrainerPasswordFeedback(updateError.message || 'Nao foi possivel alterar a senha.', 'error');
        return;
    }

    setTrainerPasswordFeedback('Senha alterada com sucesso.', 'success');

    const currentInput = document.getElementById('trainer-current-password');
    const newInput = document.getElementById('trainer-new-password');
    const confirmInput = document.getElementById('trainer-confirm-password');
    if (currentInput) currentInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';
    handleTrainerPasswordInputFeedback();
}

function parseISODateSafe(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatCompetence(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getConsultoriaMonthIndex(startDate, refDate = new Date()) {
    if (!startDate) return 0;
    const months = (refDate.getFullYear() - startDate.getFullYear()) * 12 + (refDate.getMonth() - startDate.getMonth());
    return months >= 0 ? months + 1 : 0;
}

function getNextBillingDueDate(startDate, monthIndex) {
    if (!startDate || monthIndex <= 0) return null;
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + monthIndex);
    return due;
}

function formatPtDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('pt-BR');
}

function normalizeBillingStatus(status) {
    if (status === 'pago' || status === 'atrasado' || status === 'pendente') return status;
    return 'pendente';
}

function setSettingsSavebarState(state = 'clean', customMessage = '') {
    studentConfigSaveState = state;
    const bar = document.getElementById('settings-sticky-savebar');
    const label = document.getElementById('settings-savebar-status');
    const btn = document.getElementById('settings-savebar-btn');
    if (!bar || !label || !btn) return;

    const map = {
        clean: 'Sem alterações pendentes',
        dirty: 'Alterações pendentes nesta configuração',
        saving: 'Salvando alterações...',
        saved: 'Tudo salvo com sucesso',
        error: 'Erro ao salvar. Tente novamente'
    };
    bar.dataset.state = state;
    label.textContent = customMessage || map[state] || map.clean;

    if (state === 'saving') {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner-gap"></i> Salvando...';
    } else if (state === 'saved') {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-check"></i> Salvo';
    } else if (state === 'error') {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-warning-circle"></i> Tentar novamente';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar Alterações';
    }
    setTopSaveButtonState(state);
}

function setTopSaveButtonState(state = 'clean') {
    document.querySelectorAll('.btn-save-plan').forEach((btn) => {
        btn.classList.remove('is-dirty', 'is-saving', 'is-saved', 'is-error');
        if (state === 'dirty') {
            btn.classList.add('is-dirty');
            btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar Alterações';
            return;
        }
        if (state === 'saving') {
            btn.classList.add('is-saving');
            btn.innerHTML = '<i class="ph-bold ph-spinner-gap"></i> Salvando...';
            return;
        }
        if (state === 'saved') {
            btn.classList.add('is-saved');
            btn.innerHTML = '<i class="ph-bold ph-check"></i> Salvo';
            return;
        }
        if (state === 'error') {
            btn.classList.add('is-error');
            btn.innerHTML = '<i class="ph-bold ph-warning-circle"></i> Tentar novamente';
            return;
        }
        btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar Alterações';
    });
}

function markStudentConfigDirty() {
    studentConfigDirty = true;
    setSettingsSavebarState('dirty');
}

function signalStudentPlanDirty() {
    markStudentConfigDirty();
}

function clearStudentConfigDirty() {
    studentConfigDirty = false;
    setSettingsSavebarState('clean');
}

function setStudentBillingInlineFeedback(message, type = '') {
    const el = document.getElementById('student-billing-inline-feedback');
    if (!el) return;
    el.classList.remove('success', 'error', 'info');
    if (type) el.classList.add(type);
    el.textContent = message || '';
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? '<i class="ph-bold ph-eye-slash"></i>' : '<i class="ph-bold ph-eye"></i>';
}

function handleTrainerPasswordInputFeedback() {
    const nextPass = document.getElementById('trainer-new-password')?.value || '';
    const confirmPass = document.getElementById('trainer-confirm-password')?.value || '';
    const hint = document.getElementById('trainer-password-hint');
    if (!hint) return;
    const hasLetter = /[A-Za-z]/.test(nextPass);
    const hasNumber = /\d/.test(nextPass);
    if (!nextPass) {
        hint.textContent = 'Use pelo menos 8 caracteres com letras e números.';
        return;
    }
    if (nextPass.length < 8 || !hasLetter || !hasNumber) {
        hint.textContent = 'Senha fraca: inclua letras, números e mínimo de 8 caracteres.';
        return;
    }
    if (confirmPass && nextPass !== confirmPass) {
        hint.textContent = 'A confirmação ainda não corresponde à nova senha.';
        return;
    }
    hint.textContent = 'Senha forte. Você pode confirmar a alteração.';
}

function initStudentConfigUXBindings() {
    if (document.documentElement.dataset.studentConfigUxBound === '1') return;
    const fields = [
        'student-billing-start-date',
        'student-billing-current-status',
        'student-billing-monthly-amount',
        'student-billing-current-paid-at',
        'student-billing-notes'
    ];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => {
            markStudentConfigDirty();
            if (id === 'student-billing-current-status' || id === 'student-billing-start-date') refreshStudentBillingSummaryUI();
        });
    });
    document.documentElement.dataset.studentConfigUxBound = '1';
}

function getStudentBillingData(student = {}) {
    return {
        billingStartDate: sanitizeUserInput(student?.billingStartDate || '', { maxLen: 10 }),
        billingMonthlyAmount: sanitizeUserInput(student?.billingMonthlyAmount || '', { maxLen: 14 }),
        billingCurrentStatus: normalizeBillingStatus(student?.billingCurrentStatus || 'pendente'),
        billingCurrentPaidAt: sanitizeUserInput(student?.billingCurrentPaidAt || '', { maxLen: 10 }),
        billingNotes: sanitizeUserInput(student?.billingNotes || '', { allowNewlines: true, maxLen: 400 }),
        billingHistory: Array.isArray(student?.billingHistory) ? student.billingHistory : []
    };
}

function getLegacyTrainerBillingFallback() {
    const settings = loadTrainerSettings();
    if (!settings) return null;
    const hasAnyLegacyField = !!(settings.billingStartDate || settings.billingMonthlyAmount || settings.billingCurrentPaidAt || settings.billingNotes
        || (Array.isArray(settings.billingHistory) && settings.billingHistory.length));
    if (!hasAnyLegacyField) return null;
    return {
        billingStartDate: settings.billingStartDate || '',
        billingMonthlyAmount: settings.billingMonthlyAmount || '',
        billingCurrentStatus: normalizeBillingStatus(settings.billingCurrentStatus || 'pendente'),
        billingCurrentPaidAt: settings.billingCurrentPaidAt || '',
        billingNotes: settings.billingNotes || '',
        billingHistory: Array.isArray(settings.billingHistory) ? settings.billingHistory : []
    };
}

function normalizeBillingHistoryItem(item = {}) {
    return {
        competence: sanitizeUserInput(item.competence || '', { maxLen: 7 }),
        status: normalizeBillingStatus(item.status || 'pendente'),
        paidAt: item.paidAt || '',
        updatedAt: item.updatedAt || ''
    };
}

function getStudentBillingSnapshot(student, refDate = new Date()) {
    const billing = getStudentBillingData(student);
    const startDate = parseISODateSafe(billing.billingStartDate);
    const monthIndex = getConsultoriaMonthIndex(startDate, refDate);
    const nextDue = getNextBillingDueDate(startDate, monthIndex);
    const status = normalizeBillingStatus(billing.billingCurrentStatus || 'pendente');
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    return {
        ...billing,
        startDate,
        monthIndex,
        monthLabel: monthIndex > 0 ? `${monthIndex}º mês` : 'Não iniciado',
        nextDue,
        nextDueLabel: nextDue ? formatPtDate(nextDue) : '-',
        status,
        statusLabel
    };
}

function getBillingBadgeClass(status) {
    if (status === 'pago') return 'success';
    if (status === 'atrasado') return 'danger';
    return 'warning';
}

function getBillingSummaryBadge(snapshot) {
    const month = snapshot?.monthIndex > 0 ? `${snapshot.monthIndex}º mês` : 'Sem início';
    const status = snapshot?.statusLabel || 'Pendente';
    return `${month} · ${status}`;
}

function renderBillingHistory(history) {
    const list = document.getElementById('student-billing-history-list');
    if (!list) return;
    const safeHistory = Array.isArray(history) ? history : [];
    if (safeHistory.length === 0) {
        list.innerHTML = '<div class="settings-history-row empty"><span>Nenhum evento de pagamento registrado.</span></div>';
        return;
    }
    const monthFilter = document.getElementById('student-billing-history-month')?.value || '';
    const yearFilter = document.getElementById('student-billing-history-year')?.value || '';
    const sorted = [...safeHistory]
        .map(normalizeBillingHistoryItem)
        .filter((item) => {
            const [year = '', month = ''] = String(item.competence || '').split('-');
            if (yearFilter && year !== yearFilter) return false;
            if (monthFilter && month !== monthFilter) return false;
            return true;
        })
        .sort((a, b) => String(b?.competence || '').localeCompare(String(a?.competence || '')));
    if (sorted.length === 0) {
        list.innerHTML = '<div class="settings-history-row empty"><span>Nenhum registro encontrado com os filtros atuais.</span></div>';
        return;
    }
    list.innerHTML = sorted.slice(0, 12).map((item) => {
        const status = normalizeBillingStatus(item?.status);
        const paidAt = item?.paidAt ? formatPtDate(new Date(item.paidAt)) : '-';
        return `
            <div class="settings-history-row">
                <span>${escapeHTML(item?.competence || '-')}</span>
                <span>${paidAt}</span>
                <span class="status ${status}">${status}</span>
            </div>
        `;
    }).join('');
}

function refreshBillingSummaryUI() {
    refreshStudentBillingSummaryUI();
}

function refreshStudentBillingSummaryUI() {
    const startValue = document.getElementById('student-billing-start-date')?.value || '';
    const statusValue = normalizeBillingStatus(document.getElementById('student-billing-current-status')?.value || 'pendente');
    const monthLabel = document.getElementById('student-billing-month-label');
    const statusLabel = document.getElementById('student-billing-status-label');
    const dueLabel = document.getElementById('student-billing-next-due-label');
    const summaryCard = document.getElementById('student-billing-summary-card');
    const startDate = parseISODateSafe(startValue);
    const monthIndex = getConsultoriaMonthIndex(startDate);
    if (monthLabel) monthLabel.textContent = monthIndex > 0 ? `${monthIndex}º mês` : 'Não iniciado';
    if (statusLabel) statusLabel.textContent = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
    if (summaryCard) summaryCard.dataset.state = statusValue;

    const nextDue = getNextBillingDueDate(startDate, monthIndex);
    if (dueLabel) dueLabel.textContent = nextDue ? formatPtDate(nextDue) : '-';
}

function markCurrentBillingCyclePaid() {
    markCurrentStudentBillingCyclePaid();
}

function markCurrentStudentBillingCyclePaid() {
    if (currentStudentIdx === null) return;
    const payBtn = document.getElementById('student-billing-pay-btn');
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="ph-bold ph-spinner-gap"></i> Marcando...';
    }
    setStudentBillingInlineFeedback('Atualizando status do ciclo...', 'info');
    try {
        const startValue = document.getElementById('student-billing-start-date')?.value || '';
        const startDate = parseISODateSafe(startValue);
        if (!startDate) {
            setStudentBillingInlineFeedback('Defina a data de início da consultoria para continuar.', 'error');
            return;
        }
        const monthIndex = getConsultoriaMonthIndex(startDate);
        if (monthIndex <= 0) {
            setStudentBillingInlineFeedback('A data de início ainda não permite registrar o ciclo atual.', 'error');
            return;
        }

        const today = new Date();
        const competenceDate = new Date(startDate);
        competenceDate.setMonth(competenceDate.getMonth() + (monthIndex - 1));
        const competence = formatCompetence(competenceDate);

        const students = readStorageJSON('trainerStudents', []);
        const student = students[currentStudentIdx];
        if (!student) return;
        const current = getStudentBillingData(student);
        const history = Array.isArray(current.billingHistory) ? [...current.billingHistory] : [];
        const existingIdx = history.findIndex((item) => item?.competence === competence);
        const entry = {
            competence,
            status: 'pago',
            paidAt: today.toISOString(),
            updatedAt: today.toISOString()
        };
        if (existingIdx >= 0) {
            history[existingIdx] = { ...history[existingIdx], ...entry };
        } else {
            history.push(entry);
        }

        const paidDateInput = document.getElementById('student-billing-current-paid-at');
        if (paidDateInput && !paidDateInput.value) {
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            paidDateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        student.billingCurrentStatus = 'pago';
        student.billingCurrentPaidAt = paidDateInput?.value || '';
        student.billingHistory = history;
        students[currentStudentIdx] = student;
        saveStudentData(students);
        loadStudentBillingConfigTab(student);
        setStudentBillingInlineFeedback('Ciclo atualizado como pago com sucesso.', 'success');
        updateTrainerStats(document.getElementById('alunos-search')?.value || document.getElementById('global-search')?.value || '');
    } catch (error) {
        console.error('Failed to mark billing cycle paid', error);
        setStudentBillingInlineFeedback('Erro ao atualizar ciclo. Tente novamente.', 'error');
    } finally {
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = 'Marcar ciclo como pago';
        }
    }
}

function populateStudentBillingYearFilter(history = []) {
    const select = document.getElementById('student-billing-history-year');
    if (!select) return;
    const currentValue = select.value || '';
    const years = Array.from(new Set((history || [])
        .map((item) => String(item?.competence || '').split('-')[0])
        .filter((year) => /^\d{4}$/.test(year))))
        .sort((a, b) => Number(b) - Number(a));
    select.innerHTML = `<option value="">Todos os anos</option>${years.map((year) => `<option value="${year}">${year}</option>`).join('')}`;
    if (currentValue && years.includes(currentValue)) select.value = currentValue;
}

function clearStudentBillingHistoryFilters() {
    const month = document.getElementById('student-billing-history-month');
    const year = document.getElementById('student-billing-history-year');
    if (month) month.value = '';
    if (year) year.value = '';
    applyStudentBillingHistoryFilters();
}

function applyStudentBillingHistoryFilters() {
    if (currentStudentIdx === null) return;
    const students = readStorageJSON('trainerStudents', []);
    const student = students[currentStudentIdx];
    if (!student) return;
    const billing = getStudentBillingData(student);
    renderBillingHistory(billing.billingHistory);
}

function loadStudentBillingConfigTab(student = {}) {
    let billing = getStudentBillingData(student);
    const hasStudentBilling = !!(billing.billingStartDate || billing.billingMonthlyAmount || billing.billingCurrentPaidAt || billing.billingNotes || (billing.billingHistory || []).length);
    if (!hasStudentBilling) {
        const legacy = getLegacyTrainerBillingFallback();
        if (legacy) billing = { ...billing, ...legacy };
    }
    const start = document.getElementById('student-billing-start-date');
    if (start) start.value = billing.billingStartDate || '';
    const status = document.getElementById('student-billing-current-status');
    if (status) status.value = normalizeBillingStatus(billing.billingCurrentStatus);
    const amount = document.getElementById('student-billing-monthly-amount');
    if (amount) amount.value = billing.billingMonthlyAmount || '';
    const paidAt = document.getElementById('student-billing-current-paid-at');
    if (paidAt) paidAt.value = billing.billingCurrentPaidAt || '';
    const notes = document.getElementById('student-billing-notes');
    if (notes) notes.value = billing.billingNotes || '';
    populateStudentBillingYearFilter(billing.billingHistory);
    renderBillingHistory(billing.billingHistory);
    refreshStudentBillingSummaryUI();
    setStudentBillingInlineFeedback('');
    clearStudentConfigDirty();
    initStudentConfigUXBindings();
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
    setTrainerPasswordFeedback('');
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
    loadTrainerSettingsToUI();
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

function openMobileDashboardSearch() {
    const query = prompt('Buscar aluno, objetivo ou treino:');
    if (!query || !query.trim()) return;
    switchDashView('alunos');
    const searchInput = document.getElementById('alunos-search');
    if (searchInput) {
        searchInput.value = query.trim();
    }
    filterStudents(query.trim());
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
    const mobileNav = {
        dashboard: document.getElementById('m-nav-dashboard'),
        alunos: document.getElementById('m-nav-alunos'),
        duvidas: document.getElementById('m-nav-duvidas'),
        profile: document.getElementById('m-nav-profile')
    };
    const dashboardPrimaryAction = document.getElementById('dashboard-primary-action');
    const dashboardHeaderSub = document.querySelector('.dashboard-header-sub');
    const animateIn = (target, direction = 'right') => {
        if (!target) return;
        target.classList.remove('dashboard-view-enter-left', 'dashboard-view-enter-right', 'dashboard-view-enter-active');
        target.classList.add(direction === 'left' ? 'dashboard-view-enter-left' : 'dashboard-view-enter-right');
        requestAnimationFrame(() => target.classList.add('dashboard-view-enter-active'));
        setTimeout(() => {
            target.classList.remove('dashboard-view-enter-left', 'dashboard-view-enter-right', 'dashboard-view-enter-active');
        }, 260);
    };

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
        if (dashboardPrimaryAction) dashboardPrimaryAction.style.display = 'none';
        if (dashboardHeaderSub) dashboardHeaderSub.textContent = 'Gerencie solicitações e acompanhe a evolução individual.';
        animateIn(viewAlunos, 'right');
    } else if (view === 'duvidas') {
        lastMainTrainerView = 'duvidas';
        if (viewDuvidas) viewDuvidas.style.display = '';
        if (navDuvidas) navDuvidas.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Duvidas dos Alunos';
        if (dashboardPrimaryAction) dashboardPrimaryAction.style.display = 'none';
        if (dashboardHeaderSub) dashboardHeaderSub.textContent = 'Central de mensagens para responder rapidamente.';
        animateIn(viewDuvidas, 'right');

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
        if (dashboardPrimaryAction) dashboardPrimaryAction.style.display = 'none';
        if (dashboardHeaderSub) dashboardHeaderSub.textContent = 'Ajustes operacionais e preferências da consultoria.';
        loadTrainerSettingsToUI();
        animateIn(viewConfig, 'right');
    } else {
        lastMainTrainerView = 'dashboard';
        if (viewDash) viewDash.style.display = '';
        if (navDash) navDash.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Painel de Controle';
        if (dashboardPrimaryAction) dashboardPrimaryAction.style.display = 'inline-flex';
        if (dashboardHeaderSub) dashboardHeaderSub.textContent = 'Visão rápida do engajamento e progresso dos alunos.';
        animateIn(viewDash, 'left');

        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => filterStudents(e.target.value);
            globalSearch.placeholder = "Buscar aluno ou treino...";
            globalSearch.value = "";
        }
    }

    Object.values(mobileNav).forEach((btn) => btn && btn.classList.remove('active'));
    if (lastMainTrainerView === 'alunos' && mobileNav.alunos) mobileNav.alunos.classList.add('active');
    else if (lastMainTrainerView === 'duvidas' && mobileNav.duvidas) mobileNav.duvidas.classList.add('active');
    else if (lastMainTrainerView === 'config' && mobileNav.profile) mobileNav.profile.classList.add('active');
    else if (mobileNav.dashboard) mobileNav.dashboard.classList.add('active');

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
    const billingSnapshot = getStudentBillingSnapshot(s);
    const billingClass = getBillingBadgeClass(billingSnapshot.status);
    const billingText = getBillingSummaryBadge(billingSnapshot);
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
        <div class="student-list-item recent-student-card student-entry-card"
             style="padding: 1.25rem;"
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
                <p><strong>Financeiro:</strong> <span class="billing-pill ${billingClass}">${billingText}</span></p>
                <p class="recent-last-workout">${lastWorkoutText}</p>
            </div>
            <div class="student-quick-actions compact">
                <button class="btn-primary btn-sm student-enter-btn" title="Entrar no aluno" onclick="openStudentTrainingEditor(${idx}, event)">
                    Entrar no Aluno
                </button>
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
        <div class="student-list-item grid-layout student-entry-card"
             style="padding: 1.25rem;"
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
        <div class="sli-col" data-label="Financeiro"><span class="billing-pill ${billingClass}">${billingText}</span></div>
        <div class="sli-col actions" data-label="Acoes">
            <div class="student-quick-actions">
                <button class="btn-primary btn-sm student-enter-btn" title="Entrar no aluno" onclick="openStudentTrainingEditor(${idx}, event)">
                    Entrar no Aluno
                </button>
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
        saveStudentData(students);
        setStudentSyncState('pending', 'Sincronização pendente');
        syncWorkoutArchiveToEntities(students[sIdx], workoutArchive, workoutState?.sessionId || '')
            .then(() => setStudentSyncState('synced', 'Sincronizado'))
            .catch((err) => {
                console.warn('[entity-sync] Falha ao persistir treino', err);
                setStudentSyncState('error', 'Falha ao salvar sessão de treino');
            });
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
            <button class="btn-accept" onclick="acceptStudentById('${s.id}')">
                <i class="ph-bold ph-check"></i> Aceitar
            </button>
            <button class="btn-reject" onclick="rejectStudentById('${s.id}')">
                <i class="ph-bold ph-x"></i> Recusar
            </button>
        </div>
    </div>`;
}

function renderStudents(filterText) {
    updateTrainerStats(filterText);
}

function renderPendingRequests() {
    updateTrainerStats();
}

// â”€â”€ Main stats + list renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateTrainerStats(filterText) {
    let students = readStorageJSON('trainerStudents', []);
    const currentTrainerCode = sanitizeCodeInput(
        memoryGetItem('currentTrainerCode') || memoryGetItem('trainerCodeDefault') || '',
        5
    );
    const trainerScopedStudents = currentTrainerCode
        ? students.filter((student) => getStudentTrainerCodeValue(student) === currentTrainerCode)
        : students;
    const activeStudents = trainerScopedStudents.filter(s => s.active && !s.pending);
    const pendingStudents = trainerScopedStudents.filter(s => s.pending);
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
    const financialPendingCount = activeStudents.filter((s) => getStudentBillingSnapshot(s).status === 'pendente').length;
    const financialLateCount = activeStudents.filter((s) => getStudentBillingSnapshot(s).status === 'atrasado').length;
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
    const elFinancePending = document.getElementById('stat-fin-pendente');
    if (elFinancePending) elFinancePending.innerText = financialPendingCount;
    const elFinanceLate = document.getElementById('stat-fin-atrasado');
    if (elFinanceLate) elFinanceLate.innerText = financialLateCount;

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

    syncTrainerDashboardTutorialVisibility();
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
                sName = d.title.replace('?? Dúvida de ', '');
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
        const fallbackName = fallbackNotif?.studentName || (fallbackNotif?.title ? String(fallbackNotif.title).replace('?? Dúvida de ', '') : 'Aluno');

        notifs.unshift({
            type: 'duvida',
            studentId: activeChatStudentId === 'unknown' ? null : activeChatStudentId,
            studentName: matchedStudent?.name || fallbackName,
            title: `?? Dúvida de ${matchedStudent?.name || fallbackName}`,
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
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => String(s?.id || '') === String(activeChatStudentId));
    const studentName = student?.name || 'Aluno';
    const mergedMessages = loadStudentChatMessages(activeChatStudentId, studentName);
    saveStudentChatMessages(activeChatStudentId, mergedMessages);

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
        alert('? Resposta enviada ao aluno!');
    }
}

// â”€â”€ Accept a pending student â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function acceptStudent(idx) {
    let students = readStorageJSON('trainerStudents', []);
    if (!students[idx]) return;
    students[idx].pending = false;
    students[idx].active = true;
    students[idx].acceptedAt = new Date().toISOString();
    const studentUserId = getStudentUserIdValue(students[idx]);
    const trainerCode = getStudentTrainerCodeValue(students[idx]);
    saveStudentData(students);
    if (studentUserId && trainerCode) {
        syncStudentConnectionEntity(studentUserId, trainerCode, 'approved');
    }

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

function acceptStudentById(studentId) {
    const students = readStorageJSON('trainerStudents', []);
    const idx = students.findIndex(s => String(s.id) === String(studentId));
    if (idx < 0) return;
    acceptStudent(idx);
    updateTrainerStats();
}

// â”€â”€ Reject / remove a pending student â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function rejectStudent(idx) {
    if (!confirm('Tem certeza que deseja recusar esta solicitação?')) return;
    let students = readStorageJSON('trainerStudents', []);
    const target = students[idx] || null;
    students.splice(idx, 1);
    saveStudentData(students);
    const studentUserId = getStudentUserIdValue(target);
    const trainerCode = getStudentTrainerCodeValue(target);
    if (studentUserId && trainerCode) {
        syncStudentConnectionEntity(studentUserId, trainerCode, 'rejected');
    }

    // Broadcast change
    syncChannel.postMessage({ type: 'STUDENT_REJECTED' });
    updateTrainerStats();
}

function rejectStudentById(studentId) {
    if (!confirm('Tem certeza que deseja recusar esta solicitação?')) return;
    let students = readStorageJSON('trainerStudents', []);
    const idx = students.findIndex(s => String(s.id) === String(studentId));
    if (idx < 0) return;
    const target = students[idx] || null;
    students.splice(idx, 1);
    saveStudentData(students);
    const studentUserId = getStudentUserIdValue(target);
    const trainerCode = getStudentTrainerCodeValue(target);
    if (studentUserId && trainerCode) {
        syncStudentConnectionEntity(studentUserId, trainerCode, 'rejected');
    }
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
let studentConfigDirty = false;
let studentConfigSaveState = 'clean';
let pendingBlockIdx = null;    // which block an exercise is being added to
let pendingMealIdx = null;    // which meal an item is being added to
let workoutPlanAutosaveTimer = null;

let activeExerciseFilter = 'todos';
let activeEquipmentFilter = 'todos';
let selectedExerciseCatalogItem = null;
let activeFilterPicker = null;
let exerciseSearchMatches = [];
let exerciseSearchActiveIndex = -1;
let workoutBlockDragState = null;
let workoutExerciseDragState = null;

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
    loadStudentBillingConfigTab(s);
    clearStudentConfigDirty();
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

function openStudentTrainingEditor(studentIndex, event) {
    if (event) event.stopPropagation();
    openStudentProfileTab(studentIndex, 'treino');
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
    const tab = document.getElementById(`p-tab-${tabName}`);
    const nav = document.getElementById(`p-nav-${tabName}`);
    if (!tab || !nav) return;
    tab.classList.add('active');
    nav.classList.add('active');
    if (tabName === 'config' && currentStudentIdx !== null) {
        const students = readStorageJSON('trainerStudents', []);
        const student = students[currentStudentIdx];
        if (student && !studentConfigDirty) loadStudentBillingConfigTab(student);
    }
}

// â”€â”€â”€ Workout Blocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderWorkoutBlocks() {
    const container = document.getElementById('workout-blocks-container');
    if (!container) return;
    if (!container.dataset.autosaveBound) {
        const autoSaveHandler = () => {
            queueWorkoutPlanAutosave();
            signalStudentPlanDirty();
        };
        container.addEventListener('input', autoSaveHandler);
        container.addEventListener('change', autoSaveHandler);
        container.dataset.autosaveBound = '1';
    }

    workoutBlocks.forEach(block => {
        block.exercises.forEach((ex, exIdx) => {
            if (!Array.isArray(ex.substitutes)) ex.substitutes = ['', ''];
            if (typeof ex.supersetWithNext !== 'boolean') ex.supersetWithNext = false;
            if (exIdx === block.exercises.length - 1 && ex.supersetWithNext) {
                ex.supersetWithNext = false;
            }
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
    <div class="workout-block" id="wb-${bIdx}" draggable="true"
        ondragstart="handleBlockDragStart(event, ${bIdx})"
        ondragover="handleBlockDragOver(event, ${bIdx})"
        ondrop="handleBlockDrop(event, ${bIdx})"
        ondragend="handleBlockDragEnd(event)">
        <div class="wb-header">
            <div class="wb-header-left">
                <span class="wb-grab" title="Arraste para reordenar blocos">
                    <i class="ph-bold ph-dots-six-vertical"></i>
                </span>
                <i class="ph-fill ph-calendar-blank" style="color:var(--primary-color)"></i>
                <input class="wb-name-input" value="${escHtml(block.name)}" placeholder="Ex: Treino A: Peito e Tríceps"
                    oninput="workoutBlocks[${bIdx}].name = this.value">
            </div>
            <div class="wb-header-right">
                <button class="btn-block-order" ${bIdx === 0 ? 'disabled' : ''} onclick="moveWorkoutBlock(${bIdx}, -1)" title="Mover bloco para cima">
                    <i class="ph-bold ph-arrow-up"></i>
                </button>
                <button class="btn-block-order" ${bIdx === workoutBlocks.length - 1 ? 'disabled' : ''} onclick="moveWorkoutBlock(${bIdx}, 1)" title="Mover bloco para baixo">
                    <i class="ph-bold ph-arrow-down"></i>
                </button>
                <button class="btn-add-ex" onclick="openExModal(${bIdx})">
                    <i class="ph-bold ph-plus"></i> Adicionar Exercício
                </button>
                <button class="btn-icon-minimal" onclick="deleteWorkoutBlock(${bIdx})" title="Remover bloco">
                    <i class="ph-bold ph-trash" style="color:#ef4444"></i>
                </button>
            </div>
        </div>
        ${block.exercises.length ? `
        <div class="ex-table-head">
            <span class="col-ex-name">Exercício</span>
            <span>Séries</span>
            <span>Reps</span>
            <span>Carga</span>
            <span>Descanso</span>
            <span class="col-ex-actions">Ações</span>
        </div>` : ''}

        ${block.exercises.length === 0
            ? `<div class="ex-empty-block">Nenhum exercício ainda. Clique em "Adicionar Exercício".</div>`
            : block.exercises.map((ex, eIdx) => `
        <div class="ex-row ${ex.supersetWithNext ? 'is-superset' : ''}" id="ex-${bIdx}-${eIdx}" draggable="true"
            ondragstart="handleExerciseDragStart(event, ${bIdx}, ${eIdx})"
            ondragover="handleExerciseDragOver(event, ${bIdx}, ${eIdx})"
            ondrop="handleExerciseDrop(event, ${bIdx}, ${eIdx})"
            ondragend="handleExerciseDragEnd(event)">
            <span class="ex-grab" title="Arraste para reordenar exercício">
                <i class="ph-bold ph-dots-six-vertical"></i>
            </span>
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
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].reps=this.value;updateSummaryBar()" placeholder="10-12">
                </div>
                <div class="ex-stat">
                    <span class="ex-stat-label">CARGA</span>
                    <input type="text" class="ex-stat-input" value="${escHtml(ex.carga || '')}"
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].carga=this.value;updateSummaryBar()" placeholder="30kg">
                </div>
                <div class="ex-stat">
                    <span class="ex-stat-label">DESCANSO</span>
                    <input type="text" class="ex-stat-input" value="${escHtml(ex.descanso || '')}"
                        oninput="workoutBlocks[${bIdx}].exercises[${eIdx}].descanso=this.value;updateSummaryBar()" placeholder="60s">
                </div>
            </div>
            <div class="ex-actions">
                <div class="ex-move-buttons">
                    <button class="btn-icon-minimal" ${eIdx === 0 ? 'disabled' : ''} onclick="moveExercise(${bIdx},${eIdx},-1)" title="Mover para cima">
                        <i class="ph-bold ph-arrow-up"></i>
                    </button>
                    <button class="btn-icon-minimal" ${eIdx === block.exercises.length - 1 ? 'disabled' : ''} onclick="moveExercise(${bIdx},${eIdx},1)" title="Mover para baixo">
                        <i class="ph-bold ph-arrow-down"></i>
                    </button>
                </div>
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
        saveStudentData(students);
    }, 350);
}

function addWorkoutBlock() {
    const letter = String.fromCharCode(65 + workoutBlocks.length); // A, B, C ...
    workoutBlocks.push({ name: `Treino ${letter}`, exercises: [] });
    renderWorkoutBlocks();
    signalStudentPlanDirty();
}

function deleteWorkoutBlock(bIdx) {
    if (!confirm('Remover este bloco de treino?')) return;
    const blockEl = document.getElementById(`wb-${bIdx}`);
    const removeBlock = () => {
        workoutBlocks.splice(bIdx, 1);
        renderWorkoutBlocks();
        signalStudentPlanDirty();
        queueWorkoutPlanAutosave();
    };
    if (!blockEl) {
        removeBlock();
        return;
    }
    blockEl.classList.add('is-removing');
    setTimeout(removeBlock, 180);
}

function deleteExercise(bIdx, eIdx) {
    const rowEl = document.getElementById(`ex-${bIdx}-${eIdx}`);
    const removeExercise = () => {
        workoutBlocks[bIdx].exercises.splice(eIdx, 1);
        renderWorkoutBlocks();
        signalStudentPlanDirty();
        queueWorkoutPlanAutosave();
    };
    if (!rowEl) {
        removeExercise();
        return;
    }
    rowEl.classList.add('is-removing');
    setTimeout(removeExercise, 180);
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
    signalStudentPlanDirty();
    queueWorkoutPlanAutosave();
}

function updateSummaryBar() {
    let totalSeries = 0;
    let totalExercises = 0;
    let totalReps = 0;
    let totalWorkSeconds = 0;
    let totalRestSeconds = 0;
    let totalVolumeKg = 0;
    workoutBlocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
            const series = Math.max(0, parseInt(exercise.series, 10) || 0);
            const restPerSet = parseRestToSeconds(exercise.descanso);
            const avgReps = parseRepsAverage(exercise.reps);
            const cargaKg = parseCargaToKg(exercise.carga);
            totalSeries += series;
            totalExercises += 1;
            totalReps += series * avgReps;
            totalWorkSeconds += series * 40;
            totalRestSeconds += series * restPerSet;
            totalVolumeKg += series * avgReps * cargaKg;
        });
    });
    const transitionSeconds = totalExercises * 20 + workoutBlocks.length * 90;
    const totalSeconds = totalWorkSeconds + totalRestSeconds + transitionSeconds;
    const minutes = Math.max(0, Math.round(totalSeconds / 60));
    const kcalBurned = Math.max(0, Math.round(totalSeries * 6.5 + (totalSeconds / 60) * 2.8 + (totalVolumeKg / 260)));
    const avgRest = totalSeries > 0 ? (totalRestSeconds / totalSeries) : 0;
    let intensity = '--';
    if (totalSeries > 0) {
        if (totalSeries <= 10 || avgRest >= 100) intensity = 'Leve';
        else if (totalSeries <= 20 || totalVolumeKg <= 2500) intensity = 'Moderado';
        else if (totalSeries <= 30 || avgRest >= 70 || totalVolumeKg <= 5200) intensity = 'Moderado-Alto';
        else intensity = 'Alto';
    }
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('summary-tempo', formatDurationLabel(minutes));
    el('summary-kcal', `~${kcalBurned} kcal`);
    el('summary-intensidade', intensity);
    const intensityEl = document.getElementById('summary-intensidade');
    if (intensityEl) {
        intensityEl.dataset.intensity = normalizeText(intensity || '');
        intensityEl.title = `Volume estimado: ${Math.round(totalVolumeKg)}kg · Repetições estimadas: ${Math.round(totalReps)}`;
    }
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

function parseRestToSeconds(restValue) {
    const raw = String(restValue || '').trim().toLowerCase();
    if (!raw) return 60;
    const normalized = raw.replace(',', '.');
    if (/^\d{1,2}:\d{1,2}$/.test(normalized)) {
        const [mm, ss] = normalized.split(':').map((part) => parseInt(part, 10) || 0);
        return Math.max(5, (mm * 60) + ss);
    }
    const minMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(min|m)\b/);
    const secMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(seg|s)\b/);
    if (minMatch || secMatch) {
        const minutes = minMatch ? parseFloat(minMatch[1]) : 0;
        const seconds = secMatch ? parseFloat(secMatch[1]) : 0;
        const total = (Number.isFinite(minutes) ? minutes * 60 : 0) + (Number.isFinite(seconds) ? seconds : 0);
        return Math.max(5, Math.round(total || 60));
    }
    const value = parseFloat(normalized);
    if (!Number.isFinite(value) || value <= 0) return 60;
    if (normalized.includes('min') || normalized.endsWith('m')) return Math.max(5, Math.round(value * 60));
    return Math.max(5, Math.round(value));
}

function parseRepsAverage(repsValue) {
    const raw = String(repsValue || '').trim().toLowerCase();
    if (!raw) return 10;
    const nums = raw.match(/\d+(?:[.,]\d+)?/g);
    if (!nums || !nums.length) return 10;
    const values = nums.map((n) => parseFloat(n.replace(',', '.'))).filter((n) => Number.isFinite(n) && n > 0);
    if (!values.length) return 10;
    if (values.length === 1) return values[0];
    return (Math.min(...values) + Math.max(...values)) / 2;
}

function parseCargaToKg(cargaValue) {
    const raw = String(cargaValue || '').trim().toLowerCase();
    if (!raw) return 0;
    const match = raw.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return 0;
    const value = parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
}

function formatDurationLabel(totalMinutes) {
    const safeMinutes = Math.max(0, Math.round(totalMinutes || 0));
    if (safeMinutes < 60) return `${safeMinutes} min`;
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    if (!minutes) return `${hours}h`;
    return `${hours}h ${minutes}min`;
}

function searchExerciseLibrary(query) {
    const searchInput = document.getElementById('ex-nome');
    const results = document.getElementById('ex-library-results');
    if (!searchInput || !results) return;

    const q = normalizeText(query);
    const typedValue = String(query || '').trim();
    if (selectedExerciseCatalogItem && typedValue && normalizeText(typedValue) !== normalizeText(selectedExerciseCatalogItem)) {
        selectedExerciseCatalogItem = null;
    }
    const filtered = getExerciseCatalogData().filter(ex => {
        const passMuscle = activeExerciseFilter === 'todos' || ex.group === activeExerciseFilter;
        const passEquipment = activeEquipmentFilter === 'todos' || ex.equipment === activeEquipmentFilter;
        const passSearch = !q || normalizeText(ex.name).includes(q) || normalizeText(GROUP_DISPLAY[ex.group] || ex.group).includes(q);
        return passMuscle && passEquipment && passSearch;
    });
    exerciseSearchMatches = filtered.map((item) => item.name);
    if (exerciseSearchActiveIndex >= exerciseSearchMatches.length) exerciseSearchActiveIndex = -1;

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
        const safeNameArg = JSON.stringify(String(ex.name || ''));
        return `
        <button type="button" class="ex-hevy-item ${active}" onclick='selectExerciseFromLibrary(${safeNameArg})'>
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
    exerciseSearchActiveIndex = exerciseSearchMatches.indexOf(name);
    const nameInput = document.getElementById('ex-nome');
    if (nameInput) nameInput.value = name;
    searchExerciseLibrary(name);
}

function handleExerciseSearchKeydown(event) {
    if (!Array.isArray(exerciseSearchMatches) || !exerciseSearchMatches.length) return;
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        exerciseSearchActiveIndex = Math.min(exerciseSearchMatches.length - 1, exerciseSearchActiveIndex + 1);
        selectedExerciseCatalogItem = exerciseSearchMatches[exerciseSearchActiveIndex];
        if (event.currentTarget) event.currentTarget.value = selectedExerciseCatalogItem || '';
        searchExerciseLibrary(event.currentTarget?.value || '');
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        exerciseSearchActiveIndex = Math.max(0, exerciseSearchActiveIndex - 1);
        selectedExerciseCatalogItem = exerciseSearchMatches[exerciseSearchActiveIndex];
        if (event.currentTarget) event.currentTarget.value = selectedExerciseCatalogItem || '';
        searchExerciseLibrary(event.currentTarget?.value || '');
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        const preferred = selectedExerciseCatalogItem || exerciseSearchMatches[Math.max(0, exerciseSearchActiveIndex)];
        if (preferred) selectExerciseFromLibrary(preferred);
    }
}

function moveWorkoutBlock(blockIdx, direction) {
    const targetIdx = blockIdx + direction;
    if (targetIdx < 0 || targetIdx >= workoutBlocks.length) return;
    const [moved] = workoutBlocks.splice(blockIdx, 1);
    workoutBlocks.splice(targetIdx, 0, moved);
    renderWorkoutBlocks();
    signalStudentPlanDirty();
    queueWorkoutPlanAutosave();
}

function moveExercise(blockIdx, exerciseIdx, direction) {
    const exercises = workoutBlocks?.[blockIdx]?.exercises;
    if (!Array.isArray(exercises)) return;
    const targetIdx = exerciseIdx + direction;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;
    const [moved] = exercises.splice(exerciseIdx, 1);
    exercises.splice(targetIdx, 0, moved);
    renderWorkoutBlocks();
    signalStudentPlanDirty();
    queueWorkoutPlanAutosave();
}

function clearDragVisuals() {
    document.querySelectorAll('.workout-block.is-dragging, .workout-block.is-drop-target, .workout-block.is-drop-before, .workout-block.is-drop-after, .ex-row.is-dragging, .ex-row.is-drop-target, .ex-row.is-drop-before, .ex-row.is-drop-after')
        .forEach((node) => {
            node.classList.remove('is-dragging', 'is-drop-target', 'is-drop-before', 'is-drop-after');
            if (node.dataset) delete node.dataset.dropPosition;
        });
}

function handleBlockDragStart(event, blockIdx) {
    if (!event.target.closest('.wb-grab')) {
        event.preventDefault();
        return;
    }
    workoutBlockDragState = { fromIdx: blockIdx };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `block:${blockIdx}`);
    event.currentTarget.classList.add('is-dragging');
}

function handleBlockDragOver(event, blockIdx) {
    if (!workoutBlockDragState || workoutBlockDragState.fromIdx === blockIdx) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.workout-block.is-drop-target, .workout-block.is-drop-before, .workout-block.is-drop-after')
        .forEach((node) => {
            node.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
            if (node.dataset) delete node.dataset.dropPosition;
        });
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + (rect.height / 2);
    event.currentTarget.dataset.dropPosition = before ? 'before' : 'after';
    event.currentTarget.classList.add('is-drop-target', before ? 'is-drop-before' : 'is-drop-after');
}

function handleBlockDrop(event, blockIdx) {
    if (!workoutBlockDragState) return;
    event.preventDefault();
    const fromIdx = workoutBlockDragState.fromIdx;
    if (fromIdx === blockIdx) {
        clearDragVisuals();
        workoutBlockDragState = null;
        return;
    }
    const dropPosition = event.currentTarget?.dataset?.dropPosition === 'before' ? 'before' : 'after';
    const [movedBlock] = workoutBlocks.splice(fromIdx, 1);
    const adjustedTarget = fromIdx < blockIdx ? blockIdx - 1 : blockIdx;
    const insertIdxRaw = dropPosition === 'before' ? adjustedTarget : adjustedTarget + 1;
    const insertIdx = Math.max(0, Math.min(workoutBlocks.length, insertIdxRaw));
    workoutBlocks.splice(insertIdx, 0, movedBlock);
    workoutBlockDragState = null;
    clearDragVisuals();
    renderWorkoutBlocks();
    signalStudentPlanDirty();
    queueWorkoutPlanAutosave();
}

function handleBlockDragEnd() {
    workoutBlockDragState = null;
    clearDragVisuals();
}

function handleExerciseDragStart(event, blockIdx, exerciseIdx) {
    if (!event.target.closest('.ex-grab')) {
        event.preventDefault();
        return;
    }
    event.stopPropagation();
    workoutExerciseDragState = { blockIdx, fromIdx: exerciseIdx };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `exercise:${blockIdx}:${exerciseIdx}`);
    event.currentTarget.classList.add('is-dragging');
}

function handleExerciseDragOver(event, blockIdx, exerciseIdx) {
    if (!workoutExerciseDragState) return;
    if (workoutExerciseDragState.blockIdx !== blockIdx || workoutExerciseDragState.fromIdx === exerciseIdx) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.ex-row.is-drop-target, .ex-row.is-drop-before, .ex-row.is-drop-after')
        .forEach((node) => {
            node.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
            if (node.dataset) delete node.dataset.dropPosition;
        });
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + (rect.height / 2);
    event.currentTarget.dataset.dropPosition = before ? 'before' : 'after';
    event.currentTarget.classList.add('is-drop-target', before ? 'is-drop-before' : 'is-drop-after');
}

function handleExerciseDrop(event, blockIdx, exerciseIdx) {
    if (!workoutExerciseDragState) return;
    event.preventDefault();
    const { blockIdx: originBlockIdx, fromIdx } = workoutExerciseDragState;
    if (originBlockIdx !== blockIdx || fromIdx === exerciseIdx) {
        workoutExerciseDragState = null;
        clearDragVisuals();
        return;
    }
    const dropPosition = event.currentTarget?.dataset?.dropPosition === 'before' ? 'before' : 'after';
    const exercises = workoutBlocks[blockIdx]?.exercises || [];
    const [movedExercise] = exercises.splice(fromIdx, 1);
    const adjustedTarget = fromIdx < exerciseIdx ? exerciseIdx - 1 : exerciseIdx;
    const insertIdxRaw = dropPosition === 'before' ? adjustedTarget : adjustedTarget + 1;
    const insertIdx = Math.max(0, Math.min(exercises.length, insertIdxRaw));
    exercises.splice(insertIdx, 0, movedExercise);
    workoutExerciseDragState = null;
    clearDragVisuals();
    renderWorkoutBlocks();
    signalStudentPlanDirty();
    queueWorkoutPlanAutosave();
}

function handleExerciseDragEnd() {
    workoutExerciseDragState = null;
    clearDragVisuals();
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
    const typedName = (document.getElementById('ex-nome').value || '').trim();
    const nome = (typedName || selectedExerciseCatalogItem || '').trim();
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
    signalStudentPlanDirty();
    queueWorkoutPlanAutosave();
}

// â”€â”€â”€ Diet / Meals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderMeals() {
    const container = document.getElementById('meal-blocks-container');
    if (!container) return;

    const summary = getDietPlannerSummary();
    const students = readStorageJSON('trainerStudents', []);
    const currentStudent = currentStudentIdx !== null ? students[currentStudentIdx] : null;
    const completion = currentStudent ? getDietDailyCompletion(currentStudent, getTodayDateKey()) : null;
    const summaryHtml = `
        <div class="diet-planner-overview" id="diet-planner-overview">
            <div class="diet-planner-kcal">
                <span>Resumo do dia</span>
                <strong id="diet-kcal-main">${summary.dayKcal} kcal</strong>
                <div class="diet-progress-track">
                    <div class="diet-progress-fill" id="diet-kcal-progress-fill" style="width:${Math.min(100, Math.max(0, (summary.dayKcal / Math.max(1, summary.targetKcal)) * 100)).toFixed(1)}%"></div>
                </div>
                <small id="diet-kcal-meta-text">Meta ${summary.targetKcal} kcal · Restante ${summary.remainingDayKcal} kcal</small>
                ${completion ? `<small id="diet-adherence-text">Aderência do aluno hoje: ${completion.done}/${completion.total} (${completion.percent}%)</small>` : '<small id="diet-adherence-text">Sem dados de aderência para hoje.</small>'}
            </div>
            <div class="diet-planner-macros diet-planner-meters">
                <div class="diet-macro-meter protein">
                    <div class="diet-macro-meter-head"><span>Proteína</span><strong id="diet-protein-text">${summary.dayProt}g / ${summary.targetProtein}g</strong></div>
                    <div class="diet-macro-track"><div class="diet-macro-fill" id="diet-protein-fill" style="width:${Math.min(100, Math.max(0, (summary.dayProt / Math.max(1, summary.targetProtein)) * 100)).toFixed(1)}%"></div></div>
                </div>
                <div class="diet-macro-meter carb">
                    <div class="diet-macro-meter-head"><span>Carboidrato</span><strong id="diet-carb-text">${summary.dayCarb}g / ${summary.targetCarb}g</strong></div>
                    <div class="diet-macro-track"><div class="diet-macro-fill" id="diet-carb-fill" style="width:${Math.min(100, Math.max(0, (summary.dayCarb / Math.max(1, summary.targetCarb)) * 100)).toFixed(1)}%"></div></div>
                </div>
                <div class="diet-macro-meter fat">
                    <div class="diet-macro-meter-head"><span>Gordura</span><strong id="diet-fat-text">${summary.dayFat}g / ${summary.targetFat}g</strong></div>
                    <div class="diet-macro-track"><div class="diet-macro-fill" id="diet-fat-fill" style="width:${Math.min(100, Math.max(0, (summary.dayFat / Math.max(1, summary.targetFat)) * 100)).toFixed(1)}%"></div></div>
                </div>
            </div>
        </div>
    `;

    if (mealBlocks.length === 0) {
        container.innerHTML = `${summaryHtml}<div class="workout-empty"><p>Nenhuma refeição configurada.</p><button class="btn-add-block" onclick="addMeal()"><i class="ph-bold ph-plus"></i> Criar Primeira Refeição</button></div>`;
        return;
    }

    container.innerHTML = summaryHtml + mealBlocks.map((meal, mIdx) => `
    <div class="workout-block" id="mb-${mIdx}">
        <div class="wb-header">
            <div class="wb-header-left">
                <i class="ph-fill ph-fork-knife" style="color:var(--primary-color)"></i>
                <div class="wb-meal-title-wrap">
                    <input class="wb-name-input" value="${escHtml(meal.name)}" placeholder="Ex: Café da manhã"
                        oninput="mealBlocks[${mIdx}].name = this.value; updateDietPlannerSummary()">
                    <span class="wb-meal-target tone-${getKcalBalanceMeta(summary.mealKcals[mIdx] || 0, summary.mealTargets[mIdx] || 0).tone}" data-meal-idx="${mIdx}">Meta ${summary.mealTargets[mIdx] || 0} kcal · Atual ${summary.mealKcals[mIdx] || 0} kcal · ${getKcalBalanceMeta(summary.mealKcals[mIdx] || 0, summary.mealTargets[mIdx] || 0).text}</span>
                    <div class="wb-meal-progress">
                        <div class="wb-meal-progress-track">
                            <div class="wb-meal-progress-fill" data-meal-progress-idx="${mIdx}" style="width:${Math.min(100, Math.max(0, ((summary.mealKcals[mIdx] || 0) / Math.max(1, (summary.mealTargets[mIdx] || 1))) * 100)).toFixed(1)}%"></div>
                        </div>
                    </div>
                </div>
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
                    <button type="button" class="diet-food-detail-trigger trainer" onclick="openFoodDetailsFromTrainerItem(${mIdx}, ${iIdx})" title="Clique para ver detalhes nutricionais">
                        ${escHtml(item.nome)}
                    </button>
                    <input type="text" class="food-input food-qty-input" value="${escHtml(item.qtd || '')}" placeholder="150g"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'qtd', this.value)">
                    <input type="number" class="food-input" value="${item.kcal ?? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'kcal', this.value)">
                    <input type="number" class="food-input" value="${item.prot ?? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'prot', this.value)">
                    <input type="number" class="food-input" value="${item.carb ?? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'carb', this.value)">
                    <input type="number" class="food-input" value="${item.gord ?? ''}" placeholder="0"
                        oninput="updateMealItemField(${mIdx}, ${iIdx}, 'gord', this.value)">
                    <span class="food-row-actions">
                        <button class="btn-icon-minimal" onclick="openTrainerFoodReplacePicker(${mIdx},${iIdx})" title="Substituir no catálogo">
                            <i class="ph-bold ph-arrows-clockwise" style="color:var(--primary-color);font-size:0.85rem;"></i>
                        </button>
                        <button class="btn-icon-minimal" onclick="deleteFoodItem(${mIdx},${iIdx})" title="Remover">
                            <i class="ph-bold ph-trash" style="color:#ef4444;font-size:0.85rem;"></i>
                        </button>
                    </span>
                </div>`).join('')}
            </div>`
        }
    </div>`).join('');
}

function addMeal() {
    const suggestedNames = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'];
    const desiredName = arguments.length > 0 && arguments[0] ? String(arguments[0]).trim() : (suggestedNames[mealBlocks.length] || `Refeição ${mealBlocks.length + 1}`);
    const existingCount = mealBlocks.filter((m) => normalizeText(m?.name) === normalizeText(desiredName)).length;
    const finalName = existingCount > 0 ? `${desiredName} ${existingCount + 1}` : desiredName;
    mealBlocks.push({ name: finalName, items: [] });
    renderMeals();
    signalStudentPlanDirty();
    switchProfileTab('nutricao');
}

function deleteMeal(mIdx) {
    if (!confirm('Remover esta refeição?')) return;
    mealBlocks.splice(mIdx, 1);
    renderMeals();
    updateDietPlannerSummary();
    signalStudentPlanDirty();
}

function deleteFoodItem(mIdx, iIdx) {
    mealBlocks[mIdx].items.splice(iIdx, 1);
    renderMeals();
    updateDietPlannerSummary();
    signalStudentPlanDirty();
}

function updateMealItemField(mIdx, iIdx, field, value) {
    const meal = mealBlocks?.[mIdx];
    const item = meal?.items?.[iIdx];
    if (!item) return;

    let normalized = value;
    if (['kcal', 'prot', 'carb', 'gord'].includes(field)) {
        normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
        const num = parseFloat(normalized);
        normalized = Number.isFinite(num) ? num : '';
    } else if (field === 'qtd') {
        normalized = String(value || '');
        const parsedQty = parseAmountAndUnit(normalized, item.unitKey || item.baseUnit || item.base_unit || 'g');
        item.amount = Math.max(0.1, parsedQty.amount || item.amount || 1);
        item.unitKey = normalizeFoodUnitKey(parsedQty.unit || item.unitKey || item.baseUnit || 'g');
    }

    item[field] = normalized;
    updateDietPlannerSummary();
    signalStudentPlanDirty();
}

function getDietTargetsFromInputs() {
    const kcal = parseIntegerSafe(document.getElementById('diet-kcal-meta')?.value) || 2400;
    const protein = parseDecimalSafe(document.getElementById('diet-protein-meta')?.value) || 160;
    const carb = parseDecimalSafe(document.getElementById('diet-carb-meta')?.value) || 280;
    const fat = parseDecimalSafe(document.getElementById('diet-fat-meta')?.value) || 80;
    return { kcal, protein, carb, fat };
}

function getMealCalorieWeight(mealName) {
    const name = normalizeText(mealName);
    if (name.includes('cafe')) return 0.23;
    if (name.includes('almoco')) return 0.32;
    if (name.includes('jantar')) return 0.28;
    if (name.includes('ceia')) return 0.07;
    if (name.includes('lanche')) return 0.10;
    return 0.12;
}

function getDietPlannerSummary() {
    const targets = getDietTargetsFromInputs();
    const day = { kcal: 0, prot: 0, carb: 0, fat: 0 };
    const mealKcals = mealBlocks.map((meal) => {
        let mealKcal = 0;
        (meal.items || []).forEach((item) => {
            const itemKcal = parseDecimalSafe(item.kcal) || ((parseDecimalSafe(item.prot) * 4) + (parseDecimalSafe(item.carb) * 4) + (parseDecimalSafe(item.gord) * 9));
            mealKcal += itemKcal;
            day.kcal += itemKcal;
            day.prot += parseDecimalSafe(item.prot);
            day.carb += parseDecimalSafe(item.carb);
            day.fat += parseDecimalSafe(item.gord);
        });
        return Math.round(mealKcal);
    });

    const weights = mealBlocks.map((meal) => getMealCalorieWeight(meal.name));
    const weightTotal = weights.reduce((acc, value) => acc + value, 0) || 1;
    const mealTargets = mealBlocks.map((_, idx) => Math.max(80, Math.round((targets.kcal * weights[idx]) / weightTotal)));

    return {
        targetKcal: Math.round(targets.kcal),
        targetProtein: Math.round(targets.protein),
        targetCarb: Math.round(targets.carb),
        targetFat: Math.round(targets.fat),
        dayKcal: Math.round(day.kcal),
        dayProt: Math.round(day.prot),
        dayCarb: Math.round(day.carb),
        dayFat: Math.round(day.fat),
        remainingDayKcal: Math.round(targets.kcal - day.kcal),
        mealTargets,
        mealKcals
    };
}

function updateDietPlannerSummary() {
    const card = document.querySelector('.diet-planner-overview');
    if (!card) return;
    const summary = getDietPlannerSummary();
    const clampPercent = (value, target) => Math.min(100, Math.max(0, ((value || 0) / Math.max(1, target || 1)) * 100)).toFixed(1);
    const kcalMain = document.getElementById('diet-kcal-main');
    if (kcalMain) kcalMain.textContent = `${summary.dayKcal} kcal`;
    const kcalMeta = document.getElementById('diet-kcal-meta-text');
    const dayMeta = getKcalBalanceMeta(summary.dayKcal, summary.targetKcal);
    if (kcalMeta) kcalMeta.textContent = `Meta ${summary.targetKcal} kcal · ${dayMeta.text}`;
    const kcalFill = document.getElementById('diet-kcal-progress-fill');
    if (kcalFill) kcalFill.style.width = `${clampPercent(summary.dayKcal, summary.targetKcal)}%`;
    card.classList.remove('tone-over', 'tone-under', 'tone-ontrack');
    card.classList.add(`tone-${dayMeta.tone}`);

    const proteinText = document.getElementById('diet-protein-text');
    if (proteinText) proteinText.textContent = `${summary.dayProt}g / ${summary.targetProtein}g`;
    const carbText = document.getElementById('diet-carb-text');
    if (carbText) carbText.textContent = `${summary.dayCarb}g / ${summary.targetCarb}g`;
    const fatText = document.getElementById('diet-fat-text');
    if (fatText) fatText.textContent = `${summary.dayFat}g / ${summary.targetFat}g`;

    const proteinFill = document.getElementById('diet-protein-fill');
    if (proteinFill) proteinFill.style.width = `${clampPercent(summary.dayProt, summary.targetProtein)}%`;
    const carbFill = document.getElementById('diet-carb-fill');
    if (carbFill) carbFill.style.width = `${clampPercent(summary.dayCarb, summary.targetCarb)}%`;
    const fatFill = document.getElementById('diet-fat-fill');
    if (fatFill) fatFill.style.width = `${clampPercent(summary.dayFat, summary.targetFat)}%`;

    document.querySelectorAll('.wb-meal-target[data-meal-idx]').forEach((el) => {
        const idx = Number(el.getAttribute('data-meal-idx'));
        if (!Number.isFinite(idx)) return;
        const mealMeta = getKcalBalanceMeta(summary.mealKcals[idx] || 0, summary.mealTargets[idx] || 0);
        el.textContent = `Meta ${summary.mealTargets[idx] || 0} kcal · Atual ${summary.mealKcals[idx] || 0} kcal · ${mealMeta.text}`;
        el.classList.remove('tone-over', 'tone-under', 'tone-ontrack');
        el.classList.add(`tone-${mealMeta.tone}`);
    });
    document.querySelectorAll('.wb-meal-progress-fill[data-meal-progress-idx]').forEach((el) => {
        const idx = Number(el.getAttribute('data-meal-progress-idx'));
        if (!Number.isFinite(idx)) return;
        const pct = clampPercent(summary.mealKcals[idx] || 0, summary.mealTargets[idx] || 1);
        el.style.width = `${pct}%`;
    });
}

function openFoodModal(mealIdx) {
    pendingMealIdx = mealIdx;
    ['food-nome', 'food-qtd', 'food-kcal', 'food-prot', 'food-carb', 'food-gord'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    selectedFoodReference = null;
    currentFoodQuantityAmount = 150;
    currentFoodQuantityUnit = 'g';
    updateFoodTargetHint();

    // Clear search results
    const results = document.getElementById('food-library-results');
    if (results) {
        results.innerHTML = '';
        results.classList.remove('active');
    }
    foodModalSearchResults = [];
    foodModalSearchBaseResults = [];
    foodModalSearchActiveIndex = -1;
    foodModalFilters = {
        macro: 'all',
        kcal: 'all',
        type: 'all',
        meal: 'all',
        favoritesOnly: false,
        recentOnly: false
    };
    foodManualMacrosOpen = false;
    const manualPanel = document.getElementById('food-manual-macros');
    if (manualPanel) manualPanel.classList.remove('open');
    const toggleBtn = document.getElementById('food-toggle-manual-btn');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="ph-bold ph-sliders-horizontal"></i> Editar macros manualmente';
    updateFoodMacroFilterUI();
    setFoodQuantityControls(150, 'g');
    updateFoodModalProgressiveState();
    updateFoodSelectionPreview();

    document.getElementById('food-modal-overlay').classList.add('active');
    document.getElementById('food-modal').classList.add('active');
    document.getElementById('food-nome').focus();
    if (isSupabaseReady() && (!Array.isArray(foodCatalogCache) || foodCatalogCache.length === 0)) {
        scheduleFoodsCatalogSync(10);
    }
    renderSimpleFoodLibrary('');
}

let foodSearchTimeout = null;
let selectedFoodReference = null;
let foodModalSearchResults = [];
let foodModalSearchBaseResults = [];
let foodModalSearchLabel = 'Banco de Alimentos';
let foodModalSearchActiveIndex = -1;
let foodManualMacrosOpen = false;
let foodModalFilters = {
    macro: 'all',
    kcal: 'all',
    type: 'all',
    meal: 'all',
    favoritesOnly: false,
    recentOnly: false
};
let currentFoodQuantityAmount = 150;
let currentFoodQuantityUnit = 'g';

function syncFoodQuantityInputText() {
    const qtd = document.getElementById('food-qtd');
    if (qtd) qtd.value = formatFoodQuantity(Math.max(1, Math.round(currentFoodQuantityAmount || 1)), currentFoodQuantityUnit || 'g');
}

function setFoodQuantityControls(amount = 150, unit = 'g') {
    currentFoodQuantityAmount = Math.max(1, Math.round(parseDecimalSafe(amount) || 1));
    currentFoodQuantityUnit = normalizeFoodUnitKey(unit || 'g');
    const slider = document.getElementById('food-qty-slider');
    const number = document.getElementById('food-qty-number');
    const unitEl = document.getElementById('food-qty-unit');
    if (slider) slider.value = String(currentFoodQuantityAmount);
    if (number) number.value = String(currentFoodQuantityAmount);
    if (unitEl) unitEl.textContent = getFoodUnitShort(currentFoodQuantityUnit);
    syncFoodQuantityInputText();
}

function syncFoodQuantityFromSlider(value) {
    setFoodQuantityControls(value, currentFoodQuantityUnit);
    recalculateFoodFromQuantity();
}

function syncFoodQuantityFromNumber(value) {
    setFoodQuantityControls(value, currentFoodQuantityUnit);
    recalculateFoodFromQuantity();
}

function updateFoodModalProgressiveState() {
    const hasSelected = !!selectedFoodReference;
    const configZone = document.getElementById('food-config-zone');
    if (configZone) configZone.classList.toggle('is-disabled', !hasSelected);
    const toDisable = [
        'food-qty-slider',
        'food-qty-number',
        'food-toggle-manual-btn',
        'food-apply-remaining-btn',
        'food-confirm-btn'
    ];
    toDisable.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = !hasSelected;
    });
    const magicBtn = document.getElementById('food-apply-remaining-btn');
    if (magicBtn) magicBtn.style.display = hasSelected ? 'inline-flex' : 'none';
    if (!hasSelected) {
        foodManualMacrosOpen = false;
        const manualPanel = document.getElementById('food-manual-macros');
        if (manualPanel) manualPanel.classList.remove('open');
    }
}

function copyFoodPreviewValue(metricLabel, value) {
    const text = `${metricLabel}: ${value}`;
    const success = () => showDietRuntimeMessage(`${metricLabel} copiado.`, 'success');
    const fallbackCopy = () => {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        success();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(success).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
}

function foodTypeIconMarkup(type = 'vegetal') {
    if (type === 'animal') {
        return '<span class="food-type-icon animal"><i class="ph-bold ph-drumstick"></i></span>';
    }
    return '<span class="food-type-icon vegetal"><i class="ph-bold ph-leaf"></i></span>';
}

function updateFoodSelectionPreview() {
    const preview = document.getElementById('food-selection-preview');
    if (!preview) return;
    if (!selectedFoodReference) {
        preview.textContent = 'Selecione um alimento para ver a prévia de macros.';
        return;
    }
    const qtyText = document.getElementById('food-qtd')?.value || formatFoodQuantity(selectedFoodReference.base_qty, selectedFoodReference.base_unit);
    const parsed = parseAmountAndUnit(qtyText, selectedFoodReference.base_unit || 'g');
    const safeAmount = parsed.amount > 0 ? parsed.amount : (selectedFoodReference.base_qty || 100);
    const unit = parsed.unit || selectedFoodReference.base_unit || 'g';
    const calc = computeMacrosByAmount({
        name: selectedFoodReference.nome,
        base_qty: selectedFoodReference.base_qty,
        base_unit: selectedFoodReference.base_unit,
        kcal: selectedFoodReference.kcalBase,
        protein: selectedFoodReference.protBase,
        carb: selectedFoodReference.carbBase,
        fat: selectedFoodReference.fatBase
    }, safeAmount, unit);
    preview.innerHTML = `
        <div class="food-quick-preview-title">${escHtml(selectedFoodReference.nome)} · ${escHtml(formatFoodQuantity(safeAmount, unit))}</div>
        <div class="food-quick-preview-kcal" onclick="copyFoodPreviewValue('Kcal', '${Math.round(calc.kcal)} kcal')">${Math.round(calc.kcal)} <small>kcal</small></div>
        <div class="food-quick-preview-macros">
            <button type="button" onclick="copyFoodPreviewValue('Proteína', 'P ${calc.protein}g')">P ${calc.protein}g</button>
            <button type="button" onclick="copyFoodPreviewValue('Carbo', 'C ${calc.carb}g')">C ${calc.carb}g</button>
            <button type="button" onclick="copyFoodPreviewValue('Gordura', 'G ${calc.fat}g')">G ${calc.fat}g</button>
        </div>
    `;
}

function getFoodPrefsStorageKey() {
    const code = memoryGetItem('currentTrainerCode') || memoryGetItem('connectedTrainerCode') || '00001';
    return `food_modal_prefs_${String(code)}`;
}

function readFoodModalPrefs() {
    return readStorageJSON(getFoodPrefsStorageKey(), { favorites: [], recents: [] });
}

function saveFoodModalPrefs(prefs) {
    memorySetItem(getFoodPrefsStorageKey(), JSON.stringify({
        favorites: Array.isArray(prefs?.favorites) ? prefs.favorites.slice(0, 200) : [],
        recents: Array.isArray(prefs?.recents) ? prefs.recents.slice(0, 60) : []
    }));
}

function getFoodItemKey(item) {
    const id = String(item?.foodId || item?.id || '').trim();
    if (id) return `id:${id}`;
    const name = normalizeText(item?.nome || item?.name || '');
    return `name:${name}`;
}

function inferFoodType(item) {
    const text = normalizeText(`${item?.nome || item?.name || ''} ${item?.brand || ''}`);
    const animalTerms = ['frango', 'carne', 'peixe', 'tilapia', 'atum', 'sardinha', 'salmao', 'ovo', 'leite', 'queijo', 'iogurte', 'whey', 'peru', 'bacalhau', 'camarao', 'porco'];
    if (animalTerms.some((term) => text.includes(term))) return 'animal';
    return 'vegetal';
}

function inferFoodMeal(item) {
    const text = normalizeText(item?.nome || item?.name || '');
    if (text.includes('cafe') || text.includes('banana') || text.includes('aveia') || text.includes('pao') || text.includes('ovo') || text.includes('iogurte')) return 'cafe';
    if (text.includes('almoco') || text.includes('arroz') || text.includes('feij') || text.includes('frango') || text.includes('carne')) return 'almoco';
    if (text.includes('jantar') || text.includes('sopa') || text.includes('salada') || text.includes('peixe')) return 'jantar';
    if (text.includes('lanche') || text.includes('barra') || text.includes('castanha') || text.includes('fruta')) return 'lanche';
    if (text.includes('ceia') || text.includes('caseina') || text.includes('cottage')) return 'ceia';
    return 'all';
}

function applyFoodFilters(items, filters, prefs = null) {
    const list = Array.isArray(items) ? items : [];
    const sourceFilters = (filters && typeof filters === 'object') ? filters : (foodModalFilters || {});
    const activeFilters = {
        macro: 'all',
        kcal: 'all',
        type: 'all',
        meal: 'all',
        favoritesOnly: false,
        recentOnly: false,
        ...sourceFilters
    };
    const currentPrefs = prefs || readFoodModalPrefs();
    const favoritesSet = new Set(currentPrefs.favorites || []);
    const recentsSet = new Set(currentPrefs.recents || []);
    return list.filter((item) => {
        const prot = parseDecimalSafe(item.prot ?? item.protein);
        const carb = parseDecimalSafe(item.carb);
        const fat = parseDecimalSafe(item.fat ?? item.gord);
        const kcal = parseDecimalSafe(item.kcal);
        const key = getFoodItemKey(item);
        const type = inferFoodType(item);
        const meal = inferFoodMeal(item);

        if (activeFilters.macro === 'high-protein' && prot < 10) return false;
        if (activeFilters.macro === 'high-carb' && carb < 15) return false;
        if (activeFilters.macro === 'high-fat' && fat < 8) return false;
        if (activeFilters.kcal === 'low' && !(kcal < 120)) return false;
        if (activeFilters.kcal === 'medium' && !(kcal >= 120 && kcal <= 240)) return false;
        if (activeFilters.kcal === 'high' && !(kcal > 240)) return false;
        if (activeFilters.type !== 'all' && type !== activeFilters.type) return false;
        if (activeFilters.meal !== 'all' && meal !== activeFilters.meal) return false;
        if (activeFilters.favoritesOnly && !favoritesSet.has(key)) return false;
        if (activeFilters.recentOnly && !recentsSet.has(key)) return false;
        return true;
    });
}

function updateFoodMacroFilterUI() {
    document.querySelectorAll('#food-macro-filters .food-macro-chip').forEach((chip) => {
        const group = chip.getAttribute('data-group') || '';
        const value = chip.getAttribute('data-value') || '';
        let active = false;
        if (group === 'macro') active = foodModalFilters.macro === value;
        if (group === 'kcal') active = foodModalFilters.kcal === value;
        if (group === 'type') active = foodModalFilters.type === value;
        if (group === 'meal') active = foodModalFilters.meal === value;
        if (group === 'flags' && value === 'favorites') active = !!foodModalFilters.favoritesOnly;
        if (group === 'flags' && value === 'recent') active = !!foodModalFilters.recentOnly;
        if (!group && chip.classList.contains('ghost')) active = false;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function applyFoodModalFiltersAndRender() {
    foodModalSearchResults = applyFoodFilters(foodModalSearchBaseResults, foodModalFilters);
    foodModalSearchActiveIndex = foodModalSearchResults.length ? 0 : -1;
    renderFoodSearchResults();
}

function setFoodModalFilter(group, value) {
    if (group === 'macro') foodModalFilters.macro = value;
    if (group === 'kcal') foodModalFilters.kcal = value;
    if (group === 'type') foodModalFilters.type = value;
    if (group === 'meal') foodModalFilters.meal = value;
    updateFoodMacroFilterUI();
    applyFoodModalFiltersAndRender();
}

function toggleFoodModalFlagFilter(flag) {
    if (flag === 'favorites') foodModalFilters.favoritesOnly = !foodModalFilters.favoritesOnly;
    if (flag === 'recent') foodModalFilters.recentOnly = !foodModalFilters.recentOnly;
    updateFoodMacroFilterUI();
    applyFoodModalFiltersAndRender();
}

function clearFoodModalFilters() {
    foodModalFilters = {
        macro: 'all',
        kcal: 'all',
        type: 'all',
        meal: 'all',
        favoritesOnly: false,
        recentOnly: false
    };
    updateFoodMacroFilterUI();
    applyFoodModalFiltersAndRender();
}

function renderFoodSearchResults() {
    const results = document.getElementById('food-library-results');
    if (!results) return;
    if (!Array.isArray(foodModalSearchResults) || !foodModalSearchResults.length) {
        results.innerHTML = '<div class="food-quick-empty">Nenhum alimento encontrado.</div>';
        results.classList.add('active');
        return;
    }
    const prefs = readFoodModalPrefs();
    const favoritesSet = new Set(prefs.favorites || []);
    results.innerHTML = `
        <div class="lib-category">Resultados (${escHtml(foodModalSearchLabel)})</div>
        ${foodModalSearchResults.map((item, idx) => {
            const key = getFoodItemKey(item);
            const isFav = favoritesSet.has(key);
            return `
            <div class="food-quick-item-wrap ${foodModalSearchActiveIndex === idx ? 'active' : ''}" onclick="selectFoodFromSearchIndex(${idx})">
                <button type="button" class="food-quick-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFoodFavoriteFromSearch(${idx})" aria-label="Favoritar alimento">
                    <i class="ph-${isFav ? 'fill' : 'bold'} ph-star"></i>
                </button>
                <div class="food-quick-item-content">
                    <div class="food-quick-item-head">${foodTypeIconMarkup(inferFoodType(item))}${escHtml(item.nome)}${item.brand ? ` - ${escHtml(item.brand)}` : ''}</div>
                    <small>${Math.round(item.kcal)}kcal · P ${item.prot}g · C ${item.carb}g · G ${item.fat}g · ${formatFoodQuantity(item.base_qty, item.base_unit)}</small>
                </div>
            </div>`;
        }).join('')}
    `;
    results.classList.add('active');
}

function renderSimpleFoodLibrary(query = '') {
    const q = normalizeText(query);
    const sourceList = getEffectiveFoodCatalog();
    const prefs = readFoodModalPrefs();
    const recentKeys = Array.isArray(prefs.recents) ? prefs.recents : [];
    const recentItems = q
        ? []
        : recentKeys
            .map((key) => sourceList.find((item) => getFoodItemKey({ name: item.name, id: item.id }) === key))
            .filter(Boolean);
    const filteredItems = sourceList.filter((item) => !q || normalizeText(item.name).includes(q));
    const dedupe = new Set();
    const merged = [...recentItems, ...filteredItems].filter((item) => {
        const key = getFoodItemKey({ name: item.name, id: item.id });
        if (dedupe.has(key)) return false;
        dedupe.add(key);
        return true;
    });
    const baseList = merged.slice(0, 24);
    foodModalSearchLabel = 'Banco de Alimentos';
    foodModalSearchBaseResults = baseList.map((item) => ({
        nome: item.name,
        brand: item.brand || '',
        kcal: item.kcal,
        prot: item.protein,
        carb: item.carb,
        fat: item.fat,
        base_qty: item.base_qty,
        base_unit: item.base_unit,
        foodId: item.id,
        source: item.source || 'catalog',
        portions: getFoodPortions(item)
    }));
    applyFoodModalFiltersAndRender();
}

function selectFoodFromSearchIndex(index) {
    const data = foodModalSearchResults[index];
    if (!data) return;
    foodModalSearchActiveIndex = index;
    renderFoodSearchResults();
    selectFoodFromAPI(data);
}

function toggleFoodFavoriteFromSearch(index) {
    const item = foodModalSearchResults[index];
    if (!item) return;
    const key = getFoodItemKey(item);
    const prefs = readFoodModalPrefs();
    const current = new Set(prefs.favorites || []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    saveFoodModalPrefs({ ...prefs, favorites: Array.from(current) });
    renderFoodSearchResults();
}

function registerRecentFood(item) {
    if (!item) return;
    const key = getFoodItemKey(item);
    const prefs = readFoodModalPrefs();
    const old = Array.isArray(prefs.recents) ? prefs.recents : [];
    const next = [key, ...old.filter((x) => x !== key)].slice(0, 40);
    saveFoodModalPrefs({ ...prefs, recents: next });
}

function handleFoodModalSearchKeydown(event) {
    const modal = document.getElementById('food-modal');
    if (!modal || !modal.classList.contains('active')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeFoodModal();
        return;
    }
    if (!Array.isArray(foodModalSearchResults) || !foodModalSearchResults.length) return;
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        foodModalSearchActiveIndex = Math.min(foodModalSearchResults.length - 1, foodModalSearchActiveIndex + 1);
        renderFoodSearchResults();
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        foodModalSearchActiveIndex = Math.max(0, foodModalSearchActiveIndex - 1);
        renderFoodSearchResults();
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        const targetIndex = foodModalSearchActiveIndex >= 0 ? foodModalSearchActiveIndex : 0;
        selectFoodFromSearchIndex(targetIndex);
    }
}

function searchFoodAPI(query) {
    const results = document.getElementById('food-library-results');
    if (!results) return;

    if (!query || query.length < 2) {
        renderSimpleFoodLibrary(query || '');
        return;
    }

    clearTimeout(foodSearchTimeout);
    foodSearchTimeout = setTimeout(async () => {
        results.innerHTML = '<div class="food-quick-empty">Buscando alimentos...</div>';
        results.classList.add('active');

        try {
            const catalogResults = await searchFoodsCatalog(query, 12);
            if (catalogResults.length > 0) {
                foodModalSearchLabel = 'Banco de Alimentos';
                foodModalSearchBaseResults = catalogResults.map((item) => ({
                    nome: item.name,
                    brand: item.brand || '',
                    kcal: item.kcal,
                    prot: item.protein,
                    carb: item.carb,
                    fat: item.fat,
                    base_qty: item.base_qty,
                    base_unit: item.base_unit,
                    foodId: item.id,
                    source: item.source || 'catalog',
                    portions: getFoodPortions(item)
                }));
                applyFoodModalFiltersAndRender();
                return;
            }

            if (catalogResults.length === 0) {
                const url = `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
                const resp = await fetch(url, { headers: { 'User-Agent': 'AplicativoConsultoria - Browser - v1.0' } });
                const data = await resp.json();
                if (data.products && data.products.length > 0) {
                    foodModalSearchLabel = 'Open Food Facts';
                    foodModalSearchBaseResults = data.products.map((p) => {
                        const name = p.product_name || 'Desconhecido';
                        return {
                            nome: name,
                            brand: p.brands || '',
                            kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
                            prot: p.nutriments?.proteins_100g || 0,
                            carb: p.nutriments?.carbohydrates_100g || 0,
                            fat: p.nutriments?.fat_100g || 0,
                            base_qty: 100,
                            base_unit: 'g',
                            source: 'openfoodfacts',
                            portions: getFallbackFoodPortions({ id: '', name, base_unit: 'g' })
                        };
                    });
                    applyFoodModalFiltersAndRender();
                    return;
                }
            }

            foodModalSearchBaseResults = [];
            foodModalSearchResults = [];
            foodModalSearchActiveIndex = -1;
            renderFoodSearchResults();
        } catch (err) {
            console.error(err);
            results.innerHTML = '<div class="food-quick-empty" style="color:#ef4444;">Erro ao buscar alimentos.</div>';
        }
    }, 500);
}

function selectFoodFromAPI(data) {
    const baseQty = Math.max(0.1, parseDecimalSafe(data.base_qty) || 100);
    const baseUnit = normalizeFoodUnitKey(data.base_unit || 'g');
    const portions = getFoodPortions({ ...data, base_unit: baseUnit, base_qty: baseQty });
    const defaultPortion = portions.find((portion) => portion.is_default) || portions[0] || null;
    selectedFoodReference = {
        nome: data.nome,
        brand: data.brand || '',
        foodId: data.foodId || '',
        source: data.source || 'manual',
        base_qty: baseQty,
        base_unit: baseUnit,
        kcalBase: parseDecimalSafe(data.kcal),
        protBase: parseDecimalSafe(data.prot),
        carbBase: parseDecimalSafe(data.carb),
        fatBase: parseDecimalSafe(data.fat),
        portions,
        selectedPortionId: String(defaultPortion?.id || '')
    };

    const summary = getDietPlannerSummary();
    const mealTarget = summary.mealTargets[pendingMealIdx] || 250;
    const mealCurrent = summary.mealKcals[pendingMealIdx] || 0;
    const mealRemaining = Math.max(80, mealTarget - mealCurrent);
    const suggestionAmount = selectedFoodReference.kcalBase > 0
        ? Math.max(1, Math.round((mealRemaining / selectedFoodReference.kcalBase) * selectedFoodReference.base_qty))
        : selectedFoodReference.base_qty;

    document.getElementById('food-nome').value = data.nome;
    setFoodQuantityControls(suggestionAmount, selectedFoodReference.base_unit);
    recalculateFoodFromQuantity();
    updateFoodTargetHint();
    updateFoodModalProgressiveState();
    updateFoodSelectionPreview();
    registerRecentFood({
        id: data.foodId || '',
        name: data.nome
    });
}

function recalculateFoodFromQuantity() {
    if (!selectedFoodReference) return;
    const qtyText = document.getElementById('food-qtd')?.value || formatFoodQuantity(selectedFoodReference.base_qty, selectedFoodReference.base_unit);
    const parsed = parseAmountAndUnit(qtyText, selectedFoodReference.base_unit);
    const amount = parsed.amount > 0 ? parsed.amount : selectedFoodReference.base_qty;
    const calc = computeMacrosByAmount({
        name: selectedFoodReference.nome,
        base_qty: selectedFoodReference.base_qty,
        base_unit: selectedFoodReference.base_unit,
        kcal: selectedFoodReference.kcalBase,
        protein: selectedFoodReference.protBase,
        carb: selectedFoodReference.carbBase,
        fat: selectedFoodReference.fatBase,
        portions: selectedFoodReference.portions || []
    }, amount, parsed.unit, selectedFoodReference.selectedPortionId || '');
    const kcal = calc.kcal;
    const prot = calc.protein;
    const carb = calc.carb;
    const fat = calc.fat;
    const parsedRoundedAmount = parsed.amount > 0 ? parsed.amount : amount;
    setFoodQuantityControls(parsedRoundedAmount, calc.unit_key || parsed.unit || selectedFoodReference.base_unit);
    selectedFoodReference.selectedPortionId = String(calc.portion_id || selectedFoodReference.selectedPortionId || '');
    document.getElementById('food-kcal').value = String(kcal);
    document.getElementById('food-prot').value = String(prot);
    document.getElementById('food-carb').value = String(carb);
    document.getElementById('food-gord').value = String(fat);
    updateFoodSelectionPreview();
}

async function saveCurrentFoodToCatalog() {
    const nome = sanitizeUserInput(document.getElementById('food-nome')?.value, { maxLen: 140 });
    if (!nome) return;
    const qtyRaw = document.getElementById('food-qtd')?.value || '100g';
    const parsed = parseAmountAndUnit(qtyRaw, 'g');
    const inserted = await insertFoodIntoCatalog({
        name: nome,
        brand: selectedFoodReference?.brand || '',
        base_qty: parsed.amount > 0 ? parsed.amount : 100,
        base_unit: parsed.unit || 'g',
        kcal: parseDecimalSafe(document.getElementById('food-kcal')?.value),
        protein: parseDecimalSafe(document.getElementById('food-prot')?.value),
        carb: parseDecimalSafe(document.getElementById('food-carb')?.value),
        fat: parseDecimalSafe(document.getElementById('food-gord')?.value),
        source: selectedFoodReference?.source || 'manual',
        created_by: getCurrentFoodCreatorId()
    });
    if (inserted) {
        selectedFoodReference = {
            nome: inserted.name,
            brand: inserted.brand || '',
            foodId: inserted.id,
            source: inserted.source || 'manual',
            base_qty: inserted.base_qty,
            base_unit: inserted.base_unit,
            kcalBase: inserted.kcal,
            protBase: inserted.protein,
            carbBase: inserted.carb,
            fatBase: inserted.fat,
            portions: getFoodPortions(inserted),
            selectedPortionId: ''
        };
        const hintEl = document.getElementById('food-target-hint');
        if (hintEl) hintEl.textContent = `${inserted.name} salvo no banco global.`;
        scheduleFoodsCatalogSync(30);
        updateFoodSelectionPreview();
    }
}

function updateFoodTargetHint() {
    const hintEl = document.getElementById('food-target-hint');
    if (!hintEl || pendingMealIdx === null) return;
    const summary = getDietPlannerSummary();
    const mealName = mealBlocks[pendingMealIdx]?.name || 'Refeição';
    const mealTarget = summary.mealTargets[pendingMealIdx] || 0;
    const mealCurrent = summary.mealKcals[pendingMealIdx] || 0;
    const mealRemaining = mealTarget - mealCurrent;
    hintEl.textContent = `${mealName}: ${mealCurrent}/${mealTarget} kcal · Dia restante: ${summary.remainingDayKcal} kcal · Foco desta refeição: ${mealRemaining > 0 ? `${mealRemaining} kcal` : 'meta atingida'}`;
}

function applyRemainingCaloriesToCurrentFood() {
    if (pendingMealIdx === null) return;
    const summary = getDietPlannerSummary();
    const mealTarget = summary.mealTargets[pendingMealIdx] || 250;
    const mealCurrent = summary.mealKcals[pendingMealIdx] || 0;
    const remainingMealKcal = Math.max(80, mealTarget - mealCurrent);

    const targets = getDietTargetsFromInputs();
    const proteinKcal = Math.max(0, targets.protein * 4);
    const carbKcal = Math.max(0, targets.carb * 4);
    const fatKcal = Math.max(0, targets.fat * 9);
    const totalMacroKcal = proteinKcal + carbKcal + fatKcal;
    const pRatio = totalMacroKcal > 0 ? (proteinKcal / totalMacroKcal) : 0.35;
    const cRatio = totalMacroKcal > 0 ? (carbKcal / totalMacroKcal) : 0.45;
    const fRatio = totalMacroKcal > 0 ? (fatKcal / totalMacroKcal) : 0.20;

    document.getElementById('food-kcal').value = String(Math.round(remainingMealKcal));
    document.getElementById('food-prot').value = String(Math.round(((remainingMealKcal * pRatio) / 4) * 10) / 10);
    document.getElementById('food-carb').value = String(Math.round(((remainingMealKcal * cRatio) / 4) * 10) / 10);
    document.getElementById('food-gord').value = String(Math.round(((remainingMealKcal * fRatio) / 9) * 10) / 10);
    if (!document.getElementById('food-qtd').value) {
        document.getElementById('food-qtd').value = 'Porção ajustada';
    }
    updateFoodSelectionPreview();
}

function closeFoodModal() {
    document.getElementById('food-modal-overlay').classList.remove('active');
    document.getElementById('food-modal').classList.remove('active');
    selectedFoodReference = null;
    pendingMealIdx = null;
    foodModalSearchBaseResults = [];
    foodModalSearchResults = [];
    foodModalSearchActiveIndex = -1;
    updateFoodModalProgressiveState();
}

function buildFoodModalItemPayload() {
    const nome = document.getElementById('food-nome').value;
    const qtd = document.getElementById('food-qtd').value;
    const kcalInput = parseDecimalSafe(document.getElementById('food-kcal').value);
    const prot = parseFloat(document.getElementById('food-prot').value) || 0;
    const carb = parseFloat(document.getElementById('food-carb').value) || 0;
    const gord = parseFloat(document.getElementById('food-gord').value) || 0;
    const kcal = kcalInput > 0 ? kcalInput : Math.round((prot * 4) + (carb * 4) + (gord * 9));

    if (!nome.trim()) return null;
    const parsedQty = parseAmountAndUnit(qtd || `${selectedFoodReference?.base_qty || 100}${selectedFoodReference?.base_unit || 'g'}`, selectedFoodReference?.base_unit || 'g');
    const amount = Math.max(0.1, parseDecimalSafe(parsedQty.amount) || parseDecimalSafe(currentFoodQuantityAmount) || 1);
    const unitKey = normalizeFoodUnitKey(parsedQty.unit || currentFoodQuantityUnit || selectedFoodReference?.base_unit || 'g');
    const qtyFormatted = formatFoodQuantity(amount, unitKey);
    return {
        nome: nome.trim(),
        qtd: qtyFormatted,
        kcal,
        prot,
        carb,
        gord,
        foodId: selectedFoodReference?.foodId || '',
        baseQty: selectedFoodReference?.base_qty || amount || 100,
        baseUnit: normalizeFoodUnitKey(selectedFoodReference?.base_unit || unitKey || 'g'),
        source: selectedFoodReference?.source || 'manual',
        amount,
        unitKey,
        portionId: String(selectedFoodReference?.selectedPortionId || ''),
        portionLabel: selectedFoodReference?.portions?.find((portion) => String(portion.id || '') === String(selectedFoodReference?.selectedPortionId || ''))?.label
            || getFoodUnitLabel(unitKey, amount)
    };
}

function getKcalBalanceMeta(current, target) {
    const diff = Math.round((target || 0) - (current || 0));
    if (diff < -80) return { tone: 'over', text: `Excesso ${Math.abs(diff)} kcal` };
    if (diff > 80) return { tone: 'under', text: `Faltam ${diff} kcal` };
    return { tone: 'ontrack', text: 'No alvo' };
}

function addCurrentFoodToMeal(options = {}) {
    const keepOpen = !!options.keepOpen;
    const payload = buildFoodModalItemPayload();
    if (!payload || pendingMealIdx === null || !mealBlocks[pendingMealIdx]) return false;
    mealBlocks[pendingMealIdx].items.push(payload);
    renderMeals();
    updateDietPlannerSummary();
    signalStudentPlanDirty();
    registerRecentFood({ id: payload.foodId || '', name: payload.nome });
    if (keepOpen) {
        updateFoodTargetHint();
        return true;
    }
    closeFoodModal();
    return true;
}

function confirmAddFood() {
    addCurrentFoodToMeal({ keepOpen: false });
}

function confirmAddFoodAndContinue() {
    const added = addCurrentFoodToMeal({ keepOpen: true });
    if (!added) return;
    const qtyField = document.getElementById('food-qtd');
    if (qtyField) qtyField.focus();
}

function adjustFoodQuantityBy(delta = 0) {
    const qtyField = document.getElementById('food-qtd');
    if (!qtyField) return;
    const parsed = parseAmountAndUnit(qtyField.value || `${selectedFoodReference?.base_qty || 100}g`, selectedFoodReference?.base_unit || 'g');
    const nextAmount = Math.max(1, Math.round((parsed.amount || 0) + Number(delta || 0)));
    const unit = normalizeFoodUnitKey(parsed.unit || selectedFoodReference?.base_unit || 'g');
    qtyField.value = formatFoodQuantity(nextAmount, unit);
    recalculateFoodFromQuantity();
}

function duplicateLastMealFood() {
    if (pendingMealIdx === null || !mealBlocks?.[pendingMealIdx]?.items?.length) return;
    const last = mealBlocks[pendingMealIdx].items[mealBlocks[pendingMealIdx].items.length - 1];
    if (!last) return;
    mealBlocks[pendingMealIdx].items.push({ ...last });
    renderMeals();
    updateDietPlannerSummary();
    signalStudentPlanDirty();
    updateFoodTargetHint();
}

function updateDietSummary() {
    updateDietPlannerSummary();
    updateFoodTargetHint();
    signalStudentPlanDirty();
}

function toggleFoodManualMacros() {
    foodManualMacrosOpen = !foodManualMacrosOpen;
    const panel = document.getElementById('food-manual-macros');
    const btn = document.getElementById('food-toggle-manual-btn');
    if (panel) panel.classList.toggle('open', foodManualMacrosOpen);
    if (btn) {
        btn.innerHTML = foodManualMacrosOpen
            ? '<i class="ph-bold ph-eye-slash"></i> Ocultar edição manual'
            : '<i class="ph-bold ph-sliders-horizontal"></i> Editar macros manualmente';
    }
}

// â”€â”€â”€ Save plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function saveStudentPlan() {
    if (currentStudentIdx === null) return;
    const activeDietTab = document.getElementById('p-tab-nutricao')?.classList.contains('active')
        || document.getElementById('p-tab-config')?.classList.contains('active');
    if (activeDietTab && !ensureDietWriteAllowed('planner')) return;
    setSettingsSavebarState('saving');
    try {
        let students = readStorageJSON('trainerStudents', []);
        const diet = students[currentStudentIdx].dietMeta || {};
        diet.kcal = document.getElementById('diet-kcal-meta')?.value || '';
        diet.protein = document.getElementById('diet-protein-meta')?.value || '';
        diet.carb = document.getElementById('diet-carb-meta')?.value || '';
        diet.fat = document.getElementById('diet-fat-meta')?.value || '';
        const currentStudent = students[currentStudentIdx] || {};
        const currentBilling = getStudentBillingData(currentStudent);
        const billingStartDate = sanitizeUserInput(document.getElementById('student-billing-start-date')?.value || '', { maxLen: 10 });
        const billingCurrentStatus = normalizeBillingStatus(document.getElementById('student-billing-current-status')?.value || 'pendente');
        const billingMonthlyAmount = sanitizeUserInput(document.getElementById('student-billing-monthly-amount')?.value || '', { maxLen: 14 });
        const billingCurrentPaidAt = sanitizeUserInput(document.getElementById('student-billing-current-paid-at')?.value || '', { maxLen: 10 });
        const billingNotes = sanitizeUserInput(document.getElementById('student-billing-notes')?.value || '', { allowNewlines: true, maxLen: 400 });
        const billingHistory = Array.isArray(currentBilling.billingHistory) ? [...currentBilling.billingHistory] : [];

        const parsedStart = parseISODateSafe(billingStartDate);
        const monthIndex = getConsultoriaMonthIndex(parsedStart);
        if (monthIndex > 0 && billingCurrentStatus === 'pago') {
            const competenceDate = new Date(parsedStart);
            competenceDate.setMonth(competenceDate.getMonth() + (monthIndex - 1));
            const competence = formatCompetence(competenceDate);
            const paidAt = parseISODateSafe(billingCurrentPaidAt) || new Date();
            const entry = normalizeBillingHistoryItem({
                competence,
                status: 'pago',
                paidAt: paidAt.toISOString(),
                updatedAt: new Date().toISOString()
            });
            const existingIdx = billingHistory.findIndex((item) => item?.competence === competence);
            if (existingIdx >= 0) billingHistory[existingIdx] = { ...billingHistory[existingIdx], ...entry };
            else billingHistory.push(entry);
        }

        students[currentStudentIdx].workoutBlocks = workoutBlocks;
        students[currentStudentIdx].mealBlocks = mealBlocks;
        students[currentStudentIdx].dietMeta = diet;
        students[currentStudentIdx].billingStartDate = billingStartDate;
        students[currentStudentIdx].billingCurrentStatus = billingCurrentStatus;
        students[currentStudentIdx].billingMonthlyAmount = billingMonthlyAmount;
        students[currentStudentIdx].billingCurrentPaidAt = billingCurrentPaidAt;
        students[currentStudentIdx].billingNotes = billingNotes;
        students[currentStudentIdx].billingHistory = billingHistory;
        students[currentStudentIdx].active = true; // Mark protocol as active when saved
        saveStudentData(students);
        loadStudentBillingConfigTab(students[currentStudentIdx]);
        updateTrainerStats(document.getElementById('alunos-search')?.value || document.getElementById('global-search')?.value || '');
        clearStudentConfigDirty();
        setSettingsSavebarState('saved');
        setTimeout(() => {
            if (!studentConfigDirty) setSettingsSavebarState('clean');
        }, 1800);
    } catch (error) {
        console.error('Failed to save student plan', error);
        setSettingsSavebarState('error');
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
    saveStudentData(students);

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
    renderWorkoutLogWithStatePreserved();
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

function normalizeSetType(type) {
    return String(type || 'normal').trim().toLowerCase();
}

function getPreviousSessionSets(studentId, exerciseName) {
    const history = readStorageJSON('workoutHistory', []);
    const lastSession = [...history].reverse().find(h =>
        h.ID_Usuario === studentId && (h.Exercicios || h.exercises).some(ex => ex.nome === exerciseName)
    );

    if (!lastSession) return null;
    const exs = lastSession.Exercicios || lastSession.exercises;
    const ex = exs.find(e => e.nome === exerciseName);
    if (!ex || !Array.isArray(ex.sets) || ex.sets.length === 0) return null;

    const dateRaw = lastSession.Data_Treino || lastSession.date || lastSession.data || '';
    const dateLabel = dateRaw ? `Sessão ${formatDate(dateRaw)}` : 'Sessão anterior';
    const sets = ex.sets.map((set, idx) => ({
        weight: set.peso ?? set.weight ?? 0,
        reps: set.reps ?? 0,
        type: set.type || set.setType || 'normal',
        index: idx,
        sessionLabel: dateLabel
    }));

    return { sets, sessionLabel: dateLabel };
}

function pickPreviousSet(prevSets, setIdx, setType) {
    if (!Array.isArray(prevSets) || prevSets.length === 0) return null;
    let candidate = prevSets[setIdx] || null;
    const normalizedType = normalizeSetType(setType);
    if (candidate && normalizedType && normalizeSetType(candidate.type) !== normalizedType) {
        const sameType = prevSets.filter(s => normalizeSetType(s.type) === normalizedType);
        if (sameType.length > 0) {
            candidate = sameType.reduce((best, s) => {
                if (!best) return s;
                return Math.abs(s.index - setIdx) < Math.abs(best.index - setIdx) ? s : best;
            }, sameType[0]);
        }
    }
    if (!candidate) candidate = prevSets[prevSets.length - 1];
    if (!candidate) return null;

    return {
        weight: candidate.weight ?? 0,
        reps: candidate.reps ?? 0,
        type: candidate.type || 'normal',
        index: Number.isFinite(candidate.index) ? candidate.index : null,
        sessionLabel: candidate.sessionLabel || 'Sessão anterior'
    };
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
    if (prevText && typeof prevText === 'object') {
        const weight = parseFloat(String(prevText.weight ?? '').replace(',', '.'));
        const reps = parseInt(prevText.reps, 10);
        return {
            weight: Number.isFinite(weight) ? weight : null,
            reps: Number.isFinite(reps) ? reps : null,
            type: prevText.type || '',
            index: Number.isFinite(prevText.index) ? prevText.index : null,
            sessionLabel: prevText.sessionLabel || ''
        };
    }

    const raw = String(prevText || '').trim().toLowerCase();
    if (!raw || raw === '-' || raw === '--') {
        return { weight: null, reps: null, type: '', index: null, sessionLabel: '' };
    }

    const match = raw.match(/([\d.,]+)\s*kg\s*x\s*(\d+)/i);
    if (!match) return { weight: null, reps: null, type: '', index: null, sessionLabel: '' };

    const weight = parseFloat(String(match[1] || '').replace(',', '.'));
    const reps = parseInt(match[2], 10);

    return {
        weight: Number.isFinite(weight) ? weight : null,
        reps: Number.isFinite(reps) ? reps : null,
        type: '',
        index: null,
        sessionLabel: ''
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
            const prevInfo = getPreviousSessionSets(studentId, ex.nome);
            const prevSets = prevInfo?.sets || null;
            const sets = templateSets
                ? templateSets.map((tpl, sIdx) => {
                    const setType = tpl.type || 'normal';
                    return {
                        id: `set-${idx}-${sIdx}`,
                        weight: tpl.weight ?? ex.carga ?? '',
                        reps: tpl.reps ?? ex.reps ?? '',
                        type: setType,
                        intensityLevel: 0,
                        rpe: '',
                        rir: '',
                        execucao: 0,
                        logged: false,
                        completed: false,
                        brokenPRs: { weight: false, volume: false, oneRM: false },
                        prev: pickPreviousSet(prevSets, sIdx, setType)
                    };
                })
                : Array.from({ length: parseInt(ex.series) || 3 }, (_, sIdx) => {
                    const setType = 'normal';
                    return {
                        id: `set-${idx}-${sIdx}`,
                        weight: ex.carga || '',
                        reps: ex.reps || '',
                        type: setType,
                        intensityLevel: 0,
                        rpe: '',
                        rir: '',
                        execucao: 0,
                        logged: false,
                        completed: false,
                        brokenPRs: { weight: false, volume: false, oneRM: false },
                        prev: pickPreviousSet(prevSets, sIdx, setType)
                    };
                });

            return {
                id: `ex-${idx}`,
                nome: ex.nome,
                baseNome: ex.nome,
                substitutes: Array.isArray(ex.substitutes) ? ex.substitutes.filter(Boolean) : [],
                showSubstitutes: false,
                supersetGroup: supersetGroups[idx] || 0,
                notes: '',
                prevMeta: getPreviousExerciseMeta(studentId, ex.nome),
                prevSets,
                best: personalRecords[ex.nome] || { maxWeight: 0, maxVolume: 0, maxOneRM: 0 },
                sets
            };
        })
    };

    saveWorkoutBackup();
    switchStudentView('log-workout');

    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);

    renderWorkoutLogWithStatePreserved();
}

function updateWorkoutTimer() {
    if (!workoutState) return;
    const elapsed = Math.floor((Date.now() - workoutState.startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('log-workout-timer');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;
}

function captureWorkoutRenderState() {
    const scroller = document.getElementById('view-student-log-workout');
    const activeEl = document.activeElement;
    const focusKey = activeEl?.getAttribute?.('data-workout-focus') || '';
    return {
        scrollTop: scroller ? scroller.scrollTop : window.scrollY,
        focusKey,
        selectionStart: typeof activeEl?.selectionStart === 'number' ? activeEl.selectionStart : null,
        selectionEnd: typeof activeEl?.selectionEnd === 'number' ? activeEl.selectionEnd : null
    };
}

function restoreWorkoutRenderState(state) {
    if (!state) return;
    const scroller = document.getElementById('view-student-log-workout');
    if (scroller) {
        scroller.scrollTop = Number(state.scrollTop || 0);
    } else {
        window.scrollTo(0, Number(state.scrollTop || 0));
    }
    if (!state.focusKey) return;
    const nextFocus = document.querySelector(`[data-workout-focus="${state.focusKey}"]`);
    if (nextFocus && typeof nextFocus.focus === 'function') {
        nextFocus.focus({ preventScroll: true });
        if (
            typeof state.selectionStart === 'number'
            && typeof state.selectionEnd === 'number'
            && typeof nextFocus.setSelectionRange === 'function'
        ) {
            nextFocus.setSelectionRange(state.selectionStart, state.selectionEnd);
        }
    }
}

function renderWorkoutLogWithStatePreserved() {
    const renderState = captureWorkoutRenderState();
    renderWorkoutLog();
    restoreWorkoutRenderState(renderState);
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
            const hasPR = set.completed && set.brokenPRs && (set.brokenPRs.weight || set.brokenPRs.volume || set.brokenPRs.oneRM);
            const prTooltip = hasPR ? getSetPRTooltip(set) : '';
            const prTypes = hasPR ? getSetPRTypes(set) : [];
            const prLabel = prTypes.length ? prTypes.join(' + ') : '';
            const prBadgeText = prLabel ? `Recorde! ${prLabel}` : 'Recorde!';
            const setType = set.type || 'normal';
            const typeOption = SET_TYPE_OPTIONS.find(t => t.value === setType) || SET_TYPE_OPTIONS[0];
            const typeShort = typeOption.short || '';
            const setTitle = hasPR ? prTooltip : `Série ${setIdx + 1} · ${typeOption.label}`;
            const setNumberHtml = hasPR
                ? `<span class="set-pr-icon" title="${prTooltip}">${uiSvgIcon('trophy')}</span>`
                : `${typeShort || (setIdx + 1)}`;
            const prevTypeValue = prevMetrics.type || set.type || 'normal';
            const prevTypeOption = SET_TYPE_OPTIONS.find(t => t.value === prevTypeValue) || null;
            const prevTypeLabel = prevTypeOption ? prevTypeOption.label : '';
            const prevIndex = Number.isFinite(prevMetrics.index) ? prevMetrics.index + 1 : setIdx + 1;
            const prevSessionLabel = prevMetrics.sessionLabel || 'Sessão anterior';
            const prevWeightLabel = prevMetrics.weight === null ? '--' : `${formatMetricNumber(prevMetrics.weight)}kg`;
            const prevRepsLabel = prevMetrics.reps === null ? '--' : `${prevMetrics.reps} reps`;
            const hasPrev = prevMetrics.weight !== null || prevMetrics.reps !== null;
            const prevLine = hasPrev
                ? `${prevSessionLabel} · Série ${prevIndex}${prevTypeLabel ? ` · ${prevTypeLabel}` : ''}: ${prevWeightLabel} x ${prevRepsLabel}`
                : 'Sem histórico de série';

            return `
                    <div class="log-set-row ${set.completed ? 'completed' : ''} ${hasPR ? 'pr-hit' : ''}" id="row-${exIdx}-${setIdx}">
                        <div class="set-number ${hasPR ? 'has-pr' : ''} type-${setType}" title="${setTitle}" role="button" onclick="openSetTypePopover(event, ${exIdx}, ${setIdx})">${setNumberHtml}</div>

                        <div class="set-value-stack">
                            <div class="set-input-row">
                                <input type="number" inputmode="decimal" pattern="[0-9]*" min="0" step="0.5" class="set-input log-input-tactile compact-value" value="${set.weight}" 
                                    data-workout-focus="weight-${exIdx}-${setIdx}"
                                    placeholder="KG" oninput="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)"
                                    ${set.completed ? 'disabled' : ''}>
                                <span class="set-progress-flag ${weightUp ? 'up' : ''}" aria-hidden="true">
                                    ${weightUp ? uiSvgIcon('lightning') : ''}
                                </span>
                            </div>
                        </div>

                        <div class="set-value-stack">
                            <div class="set-input-row">
                                <input type="number" inputmode="decimal" pattern="[0-9]*" min="0" step="1" class="set-input log-input-tactile compact-value" value="${set.reps}" 
                                    data-workout-focus="reps-${exIdx}-${setIdx}"
                                    placeholder="REPS" oninput="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)"
                                    ${set.completed ? 'disabled' : ''}>
                                <span class="set-progress-flag ${repsUp ? 'up' : ''}" aria-hidden="true">
                                    ${repsUp ? uiSvgIcon('arrow-up-right') : ''}
                                </span>
                            </div>
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
                        ${hasPR ? `<div class="set-pr-banner">${uiSvgIcon('trophy')} <span>${escHtml(prBadgeText)}</span></div>` : ''}
                    </div>
                    <div class="log-set-history ${hasPR ? 'pr-hit' : ''}">
                        <div class="set-history-line">${escHtml(prevLine)}</div>
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
    const raw = (set?.peso ?? set?.weight ?? 0);
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
    const row = document.getElementById(`row-${exIdx}-${setIdx}`);
    if (row) {
        row.classList.add('pr-just-hit');
        setTimeout(() => row.classList.remove('pr-just-hit'), 900);
    }
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
                rpe: set.rpe || null,
                rir: set.rir || null,
                execucao: set.execucao || null,
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
    renderWorkoutLogWithStatePreserved();
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
    const prevSets = workoutState.exercises?.[exIdx]?.prevSets || null;
    set.prev = pickPreviousSet(prevSets, setIdx, set.type);
    saveWorkoutBackup();
    renderWorkoutLogWithStatePreserved();
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
    const nextIdx = ex.sets.length;
    const nextType = lastSet?.type || 'normal';
    const prevSets = ex.prevSets || null;
    ex.sets.push({
        id: `set-${exIdx}-${nextIdx}`,
        weight: lastSet ? lastSet.weight : '',
        reps: lastSet ? lastSet.reps : '',
        type: nextType,
        intensityLevel: 0,
        rpe: '',
        rir: '',
        execucao: 0,
        logged: false,
        completed: false,
        brokenPRs: { weight: false, volume: false, oneRM: false },
        prev: pickPreviousSet(prevSets, nextIdx, nextType)
    });
    saveWorkoutBackup();
    renderWorkoutLogWithStatePreserved();
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
    renderWorkoutLogWithStatePreserved();
}

function removeSetFromPopover(exIdx, setIdx) {
    removeSetFromExercise(exIdx, setIdx);
    closeSetTypePopover();
}

function removeExerciseFromLog(exIdx) {
    if (!workoutState || !confirm('Remover exercício do log?')) return;
    workoutState.exercises.splice(exIdx, 1);
    saveWorkoutBackup();
    renderWorkoutLogWithStatePreserved();
}

function toggleLogSubstitutes(exIdx) {
    if (!workoutState) return;
    const ex = workoutState.exercises?.[exIdx];
    if (!ex) return;
    ex.showSubstitutes = !ex.showSubstitutes;
    renderWorkoutLogWithStatePreserved();
}

function applyExerciseSubstitute(exIdx, substituteName) {
    if (!workoutState) return;
    const ex = workoutState.exercises?.[exIdx];
    if (!ex) return;
    ex.nome = substituteName;
    ex.showSubstitutes = false;
    saveWorkoutBackup();
    renderWorkoutLogWithStatePreserved();
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
    appendStudentWorkoutHistory(studentId, workoutArchive);

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

        saveStudentData(students);
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
    const prBadge = prCount > 0 ? `<span class="summary-stat-badge">+${prCount} PR</span>` : '';
    statsGrid.innerHTML = `
        <div class="summary-stat-card">
            <div class="summary-stat-top">
                <i class="ph-bold ph-timer"></i>
            </div>
            <span class="summary-stat-value">${durStr}</span>
            <span class="summary-stat-label">Duração</span>
        </div>
        <div class="summary-stat-card">
            <div class="summary-stat-top">
                <i class="ph-bold ph-lightning"></i>
                ${prBadge}
            </div>
            <span class="summary-stat-value">${archive.Volume_Total} kg</span>
            <span class="summary-stat-label">Volume Total</span>
        </div>
        <div class="summary-stat-card ${prCount > 0 ? 'is-pr' : ''}">
            <div class="summary-stat-top">
                <i class="ph-bold ph-trophy"></i>
            </div>
            <span class="summary-stat-value">${prCount}</span>
            <span class="summary-stat-label">Novos PRs</span>
        </div>
        <div class="summary-stat-card">
            <div class="summary-stat-top">
                <i class="ph-bold ph-smiley"></i>
            </div>
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
                            ${hasPR ? '<i class="ph-fill ph-trophy summary-set-trophy"></i>' : ''}
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

        const templates = past.sets.map((s) => {
            const weight = Number.isFinite(s.peso)
                ? s.peso
                : (Number.isFinite(s.weight) ? s.weight : (ex.carga || ''));
            const reps = Number.isFinite(s.reps)
                ? s.reps
                : (Number.isFinite(s.rep) ? s.rep : (ex.reps || ''));
            return {
                weight,
                reps,
                type: s.type || s.setType || 'normal'
            };
        });

        ex.setTemplates = templates;
        ex.series = String(templates.length);
        ex.carga = templates[0]?.weight ?? '';
        ex.reps = templates[0]?.reps ?? '';
    });

    students[sIdx].workoutBlocks = blocks;
    saveStudentData(students);
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
    renderWorkoutLogWithStatePreserved();
}

function setSetExecution(exIdx, setIdx, execValue) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set) return;
    const normalized = Math.min(5, Math.max(1, Number(execValue) || 0));
    set.execucao = normalized || 0;
    saveWorkoutBackup();
    renderWorkoutLogWithStatePreserved();
}










