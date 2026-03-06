function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    const app = document.getElementById('app');
    if (app) app.classList.remove('wide');
}

const ADMIN_STUDENT_CODE = '12345';
const ADMIN_STUDENT_NAME = 'Nicolas';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function ensureAdminStudent() {
    const students = readStorageJSON('trainerStudents', []);
    const nowIso = new Date().toISOString();
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
        metricHistory: [baselineMetric],
        progressLogs: [{ date: new Date().toISOString().slice(0, 10), weight: 78, notes: 'Perfil demo Beta inicial.' }],
        personalRecords: {}
    };

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
            workoutBlocks: Array.isArray(current.workoutBlocks) && current.workoutBlocks.length > 0 ? current.workoutBlocks : DEMO_WORKOUT_BLOCKS,
            mealBlocks: Array.isArray(current.mealBlocks) && current.mealBlocks.length > 0 ? current.mealBlocks : DEMO_MEAL_BLOCKS,
            metricHistory: Array.isArray(current.metricHistory) && current.metricHistory.length > 0 ? current.metricHistory : [baselineMetric]
        };
    }

    localStorage.setItem('trainerStudents', JSON.stringify(students));
}

function goToHome() {
    // Clear student session if they go back to selection (optional, but safer for logout)
    localStorage.removeItem('currentStudentId');
    localStorage.removeItem('connectedTrainerCode');
    hideAllScreens();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('active');
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('currentStudentId');
        localStorage.removeItem('connectedTrainerCode');
        localStorage.removeItem('studentName');
        location.reload(); // Hard refresh to clear state
    }
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

document.addEventListener('DOMContentLoaded', () => {
    setupClientSideFormProtection();
    ensureAdminStudent();

    // Prevent # anchors from jumping the page in app navigation
    document.querySelectorAll('.sidebar-nav .nav-item[href="#"]').forEach((link) => {
        if (link.dataset.preventInit === '1') return;
        link.addEventListener('click', (evt) => evt.preventDefault());
        link.dataset.preventInit = '1';
    });

    // Check if student is already "logged in"
    const studentId = localStorage.getItem('currentStudentId');
    const studentDashboardScreen = document.getElementById('student-dashboard-screen');
    if (studentId && studentDashboardScreen) {
        hideAllScreens();
        const app = document.getElementById('app');
        if (app) app.classList.add('wide');
        studentDashboardScreen.classList.add('active');
        initStudentDashboard();
        return;
    }

    const home = document.getElementById('home-screen');
    if (home && !studentId) {
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

function goToStudentArea() {
    hideAllScreens();
    const studentScreen = document.getElementById('student-screen');
    if (studentScreen) studentScreen.classList.add('active');
}

function goToGlobalLogin() {
    hideAllScreens();
    const globalLoginScreen = document.getElementById('global-login-screen');
    if (globalLoginScreen) globalLoginScreen.classList.add('active');
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
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" width="48" style="margin-bottom:1rem;">
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
        if (studentId === ADMIN_STUDENT_CODE) {
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
});

function switchStudentView(view) {
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
        switchTreinoSubview('landing');
    }
    if (view === 'dieta') renderStudentDietMain();
    if (view === 'perfil') renderStudentPerfil();
}

function renderStudentWorkoutMain() {
    const studentId = localStorage.getItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    const tabsNav = document.getElementById('workout-tabs-nav');
    const mainContent = document.getElementById('student-workout-content-main');
    if (!tabsNav || !mainContent) return;

    if (!student || !student.active || !student.workoutBlocks || student.workoutBlocks.length === 0) {
        tabsNav.innerHTML = '';
        mainContent.innerHTML = `<div class="empty-state-card" style="margin-top:2rem;">
            <i class="ph-fill ph-hourglass-high"></i>
            <div class="empty-info">
                <h3>Treino em analise</h3>
                <p>Seu treinador ainda nao liberou sua ficha de treinos.</p>
            </div>
        </div>`;
        return;
    }

    if (currentWorkoutTab >= student.workoutBlocks.length) {
        currentWorkoutTab = 0;
    }

    tabsNav.innerHTML = student.workoutBlocks.map((block, idx) => `
        <button class="tab-btn ${idx === currentWorkoutTab ? 'active' : ''}" onclick="switchWorkoutTab(${idx})">
            ${escHtml((block.title || `Treino ${idx + 1}`).split(' ').slice(0, 2).join(' '))}
        </button>
    `).join('');

    const block = student.workoutBlocks[currentWorkoutTab];
    const exercises = Array.isArray(block.exercises) ? block.exercises : [];
    const muscleGroups = getMuscleGroups(exercises);
    const totalSets = exercises.reduce((acc, ex) => acc + Number(ex.series || 0), 0);
    const estDuration = Math.max(25, Math.round(totalSets * 2.2));
    const lastPerformed = getLatestPerformanceDate(student.id, block.title);
    const exercisesWithObs = exercises.filter(ex => ex.observacao && ex.observacao.trim().length > 0).length;
    const totalSupersets = exercises.filter(ex => ex.supersetWithNext).length;
    const totalWithSubs = exercises.filter(ex => Array.isArray(ex.substitutes) && ex.substitutes.filter(Boolean).length > 0).length;

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
                            <h2>${escHtml(block.title || `Treino ${currentWorkoutTab + 1}`)}</h2>
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
                        ${exercises.map((ex, idx) => {
                            const substitutes = Array.isArray(ex.substitutes) ? ex.substitutes.filter(Boolean) : [];
                            return `
                            <div class="routine-ex-item exercise-clarity-card ${ex.supersetWithNext ? 'has-superset' : ''}">
                                <div class="exercise-order-badge">${idx + 1}</div>
                                <div class="ex-name-box">
                                    <span>${escHtml(ex.nome)}</span>
                                    <div class="ex-sets-mini">${ex.series} series • ${ex.reps} reps ${ex.descanso ? `• ${escHtml(ex.descanso)} descanso` : ''}</div>
                                    ${ex.observacao ? `<p class="exercise-note"><i class="ph-bold ph-info"></i> ${escHtml(ex.observacao)}</p>` : ''}
                                    ${substitutes.length ? `<div class="analysis-substitute-chips">${substitutes.map(s => `<span>${escHtml(s)}</span>`).join('')}</div>` : ''}
                                    ${ex.supersetWithNext ? `<p class="exercise-note"><i class="ph-bold ph-lightning"></i> Super serie com o proximo exercicio</p>` : ''}
                                </div>
                                <button class="btn-icon-tiny analysis-chart-btn" onclick="openExerciseProgressModalEncoded('${encodeURIComponent(ex.nome)}')" title="Ver historico de carga">
                                    <i class="ph-bold ph-chart-line-up"></i>
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <aside class="analysis-side">
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
    renderStudentWorkoutMain();
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
        renderStudentWorkoutMain();
    }
    if (view === 'historico') {
        renderWorkoutHistory();
    }
}

let studentChatUploadTimer = null;

function getStudentChatStorageKey(studentId) {
    return `student_chat_beta_${studentId || 'anon'}`;
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
            mapped.push({
                id: `n-${baseId}-q`,
                sender: 'student',
                type: 'text',
                text: item.desc,
                time: item.time || new Date().toISOString()
            });
        }
        if (item.reply) {
            mapped.push({
                id: `n-${baseId}-r`,
                sender: 'trainer',
                type: item.replyMedia?.type === 'video' ? 'video' : item.replyMedia?.type === 'audio' ? 'audio' : 'text',
                text: item.reply,
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

    if (msg.type === 'audio') {
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
    messages.push({
        id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        sender: 'student',
        type: 'text',
        text,
        time: new Date().toISOString()
    });
    saveStudentChatMessages(studentId, messages);
    input.value = '';
    renderStudentDuvidas();
}

function simulateStudentMediaUpload(kind = 'audio') {
    const studentId = localStorage.getItem('currentStudentId');
    const studentName = localStorage.getItem('studentName') || 'Aluno';
    if (!studentId) return;

    const uploadBox = document.getElementById('student-chat-upload');
    const bar = document.getElementById('student-chat-upload-bar');
    const label = document.getElementById('student-chat-upload-label');
    if (!uploadBox || !bar || !label) return;

    const mediaLabel = kind === 'video' ? 'vídeo' : 'áudio';
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
            messages.push({
                id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                sender: 'student',
                type: kind === 'video' ? 'video' : 'audio',
                text: kind === 'video' ? '[Video simulado enviado]' : '[Audio simulado enviado]',
                time: new Date().toISOString()
            });
            saveStudentChatMessages(studentId, messages);

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
                <div class="student-chat-actions">
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

    const thread = document.getElementById('student-chat-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
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
        const hasPRs = (w.Exercicios || []).some(ex => ex.sets.some(s => s.brokenPRs && s.brokenPRs.length > 0));
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

function openHistoryDetail(originalIdx) {
    const studentId = localStorage.getItem('currentStudentId');
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
        </div>

        <div class="history-detail-exercises">
            ${(workout.Exercicios || []).map(ex => `
                <div class="hd-exercise">
                    <h4>${escHtml(ex.nome)}</h4>
                    <div class="hd-sets">
                        ${ex.sets.map((s, si) => `
                            <div class="hd-set-row ${s.brokenPRs && s.brokenPRs.length > 0 ? 'has-pr' : ''}">
                                <span class="hd-set-num">${si + 1}</span>
                                <span>${s.peso || 0} kg</span>
                                <span>×</span>
                                <span>${s.reps || 0} reps</span>
                                ${s.brokenPRs && s.brokenPRs.length > 0 ? '<i class="ph-fill ph-trophy" style="color:#facc15;font-size:0.85rem;"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
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

    const studentId = localStorage.getItem('currentStudentId');
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
        const latest = points[points.length - 1];
        const best = points.reduce((acc, p) => p.kg > acc.kg ? p : acc, points[0]);

        body.innerHTML = `
            <div class="exercise-progress-head">
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
            </div>
            <svg viewBox="0 0 ${width} ${height}" class="exercise-progress-svg" aria-label="grafico de carga">
                <polyline class="ep-line" points="${plot}" />
                ${points.map((p, i) => `<circle class="ep-dot" cx="${20 + i * step}" cy="${yScale(p.kg)}" r="3.5"><title>${p.date}: ${p.kg} kg</title></circle>`).join('')}
            </svg>
            <div class="exercise-progress-xlabels">
                ${points.map(p => `<span>${p.shortDate}</span>`).join('')}
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
    localStorage.setItem('workoutHistory', JSON.stringify(history));
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
    const studentId = localStorage.getItem('currentStudentId');
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

        localStorage.setItem('trainerStudents', JSON.stringify(students));
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

    const studentName = localStorage.getItem('studentName') || 'Aluno';
    const assuntoLabels = {
        'exercicio': 'Dúvida sobre exercício',
        'execucao': 'Dúvida sobre execução',
        'substituicao': 'Substituição de exercício',
        'carga': 'Dúvida sobre carga',
        'outro': 'Outro'
    };

    const studentId = localStorage.getItem('currentStudentId');

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
    localStorage.setItem('trainerNotifications', JSON.stringify(notifs));

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

function renderStudentDietMain() {
    const studentId = localStorage.getItem('currentStudentId');
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

    container.innerHTML = student.mealBlocks.map(meal => `
        <div class="meal-block">
            <div class="block-header"><h3>${escHtml(meal.name)}</h3></div>
            <div class="meal-items-list">
                ${meal.items.map(item => `
                    <div class="meal-item-row">
                        <div style="flex:1;"><strong>${escHtml(item.nome)}</strong><span class="text-sub">${escHtml(item.qtd)}</span></div>
                        <div class="meal-macros-mini">
                            <span>${item.kcal}kcal</span><span>${item.prot}g P</span><span>${item.carb}g C</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
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
        localStorage.setItem('currentStudentId', ADMIN_STUDENT_CODE);
        localStorage.setItem('studentName', adminStudent?.name || ADMIN_STUDENT_NAME);
        localStorage.setItem('connectedTrainerCode', adminStudent?.trainerCode || '00001');

        hideAllScreens();
        document.getElementById('app').classList.add('wide');
        document.getElementById('student-dashboard-screen').classList.add('active');
        initStudentDashboard();
        return;
    }

    // 2. Check Trainer (Admin or allTrainers)
    const trainers = readStorageJSON('allTrainers', []);
    const isTrainer = trainers.some(t => t.code === code) || code === '00001';

    if (isTrainer) {
        // Redirect to trainer dashboard
        // Note: For simplicity, we could store 'trainerSessionCode' to auto-login in trainer.html
        localStorage.setItem('trainerSessionCode', code);
        window.location.href = 'trainer.html';
        return;
    }

    // 3. Check Student
    const allStudents = readStorageJSON('trainerStudents', []);
    const student = allStudents.find(s => s.id === code);

    if (student) {
        localStorage.setItem('currentStudentId', student.id);
        localStorage.setItem('studentName', student.name);
        // We might not have the trainer code easily if it's a re-login, 
        // but we can store it in the student object during registration
        localStorage.setItem('connectedTrainerCode', student.trainerCode || 'Consultoria');

        hideAllScreens();
        document.getElementById('app').classList.add('wide');
        document.getElementById('student-dashboard-screen').classList.add('active');
        initStudentDashboard();
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
        localStorage.setItem('currentStudentId', ADMIN_STUDENT_CODE);
        localStorage.setItem('studentName', adminStudent?.name || ADMIN_STUDENT_NAME);
        localStorage.setItem('connectedTrainerCode', adminStudent?.trainerCode || '00001');

        hideAllScreens();
        document.getElementById('app').classList.add('wide');
        document.getElementById('student-dashboard-screen').classList.add('active');
        initStudentDashboard();
        switchStudentView('home');
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
            consultoriaName = t.consultoriaName || `Consultoria de ${t.name.split(' ')[0]}`;
        } else {
            alert('Código de treinador não encontrado.');
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
    document.getElementById(`q-tab-${tabName}`).classList.add('active');
    document.getElementById(`btn-tab-${tabName}`).classList.add('active');
}

function submitQuestionnaire() {
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
        alert('Conexão com treinador inválida. Refaça o processo de conexão.');
        return;
    }

    let id = Math.floor(10000 + Math.random() * 90000).toString();
    const usedIds = new Set((readStorageJSON('trainerStudents', [])).map(s => String(s.id)));
    while (id === ADMIN_STUDENT_CODE || usedIds.has(id)) {
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
        trainerCode: pendingTrainerCode, // Store for re-login
        joinedAt: new Date().toISOString(),
        metricHistory: [{
            date: new Date().toISOString(),
            weight: parseFloat(weight),
            height: parseFloat(height),
            bodyFat: null
        }],
        personalRecords: {} // Initialize PRs
    };

    let students = readStorageJSON('trainerStudents', []);
    students.push(newStudent);
    localStorage.setItem('trainerStudents', JSON.stringify(students));

    let notifs = readStorageJSON('trainerNotifications', []);
    notifs.unshift({
        type: 'questionnaire',
        title: 'Questionário Respondido!',
        desc: `Um novo aluno acabou de enviar o questionário inicial.`,
        time: 'Agora mesmo',
        unread: true
    });
    localStorage.setItem('trainerNotifications', JSON.stringify(notifs));

    // Save current session info
    localStorage.setItem('currentStudentId', id);
    localStorage.setItem('studentName', nome);
    localStorage.setItem('connectedTrainerCode', pendingTrainerCode);

    hideAllScreens();
    document.getElementById('app').classList.add('wide');
    document.getElementById('student-dashboard-screen').classList.add('active');

    initStudentDashboard();
}

// â”€â”€â”€ Student Dashboard (Real Data) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function initStudentDashboard() {
    const studentId = localStorage.getItem('currentStudentId');
    const trainerCode = localStorage.getItem('connectedTrainerCode');
    const studentName = localStorage.getItem('studentName') || 'Aluno';

    document.getElementById('dash-student-name').innerText = `Olá, ${studentName.split(' ')[0]}`;
    document.getElementById('dash-student-trainer').innerText = trainerCode || 'Consultoria';

    // Sync sidebar name
    const sideName = document.getElementById('side-student-name');
    if (sideName) sideName.innerText = studentName.split(' ')[0];

    // Show student's own access code
    const scRef = document.getElementById('student-code-ref');
    if (scRef) scRef.innerText = studentId;

    if (!studentId) {
        setProtocolStatus(false);
        return;
    }

    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (student && student.active) {
        setProtocolStatus(true);
        renderWorkoutStartOptions(student);
    } else {
        setProtocolStatus(false);
    }

    // Attempt to restore active workout session
    restoreWorkoutBackup();
}

function renderWorkoutStartOptions(student) {
    const container = document.getElementById('student-workout-start-options');
    if (!container || !student.workoutBlocks) return;

    container.innerHTML = student.workoutBlocks.map((block, idx) => {
        const muscles = getMuscleGroups(block.exercises);
        const title = block.title || `Treino ${String.fromCharCode(65 + idx)}`;
        return `
        <button class="action-card highlight" onclick="startWorkoutSession(${idx})"
            style="background: rgba(163, 230, 53, 0.1); border-color: rgba(163, 230, 53, 0.3); padding: 1rem;">
            <i class="ph-fill ph-play-circle" style="color: var(--primary-color); font-size: 1.5rem;"></i>
            <div style="flex:1; text-align: left;">
                <span style="display: block; font-weight: 700; color: var(--text-main); font-size: 1rem;">${escHtml(title)}</span>
                <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: 500;">${muscles.join(' • ')}</span>
                <span style="display:block; font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">${block.exercises.length} exercícios • Registrar cargas</span>
            </div>
            <i class="ph-bold ph-caret-right" style="color: var(--primary-color); font-size: 1rem;"></i>
        </button>`;
    }).join('');
}

function setProtocolStatus(isReady) {
    const elWaiting = document.getElementById('student-actions-waiting');
    const elReady = document.getElementById('student-actions-ready');
    const statusTreino = document.getElementById('status-treino');
    const statusDieta = document.getElementById('status-dieta');

    if (isReady) {
        if (elWaiting) elWaiting.style.display = 'none';
        if (elReady) elReady.style.display = 'block';

        statusTreino.innerText = 'Ativo';
        statusTreino.className = 'text-success';

        statusDieta.innerText = 'Ativo';
        statusDieta.className = 'text-success';
    } else {
        if (elReady) elReady.style.display = 'none';
        if (elWaiting) elWaiting.style.display = 'flex';

        statusTreino.innerText = 'Pendente';
        statusTreino.className = 'text-warning';

        statusDieta.innerText = 'Pendente';
        statusDieta.className = 'text-warning';
    }
}

// Detail Views for Students
function openStudentWorkout() {
    const studentId = localStorage.getItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (!student || !student.workoutBlocks) return;

    const container = document.getElementById('student-workout-content');
    if (!container) return;

    container.innerHTML = student.workoutBlocks.map(block => `
        <div class="workout-day-block">
            <div class="block-header">
                <h3>${escHtml(block.title)}</h3>
            </div>
            <div class="ex-list">
                ${block.exercises.map(ex => `
                    <div class="ex-row">
                        <div class="ex-main-info">
                            <span class="ex-name">${escHtml(ex.nome)}</span>
                            ${ex.obs ? `<span class="ex-obs">${escHtml(ex.obs)}</span>` : ''}
                        </div>
                        <div class="ex-stats">
                            <div class="st-item"><span>Séries</span><strong>${ex.series}</strong></div>
                            <div class="st-item"><span>Reps</span><strong>${ex.reps}</strong></div>
                            <div class="st-item"><span>Carga</span><strong>${ex.carga}</strong></div>
                            <div class="st-item"><span>Desc.</span><strong>${ex.descanso}</strong></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('student-workout-screen').classList.add('active');
}

function closeStudentWorkout() {
    document.getElementById('student-workout-screen').classList.remove('active');
}

function openStudentDiet() {
    const studentId = localStorage.getItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (!student || !student.mealBlocks) return;

    const container = document.getElementById('student-diet-content');
    if (!container) return;

    container.innerHTML = student.mealBlocks.map(meal => `
        <div class="meal-block">
            <div class="block-header"><h3>${escHtml(meal.name)}</h3></div>
            <div class="meal-items-list">
                ${meal.items.map(item => `
                    <div class="meal-item-row">
                        <div style="flex:1;">
                            <strong>${escHtml(item.nome)}</strong>
                            <span class="text-sub">${escHtml(item.qtd)}</span>
                        </div>
                        <div class="meal-macros-mini">
                            <span>${item.kcal} kcal</span>
                            <span>P:${item.prot}g</span>
                            <span>C:${item.carb}g</span>
                            <span>G:${item.gord}g</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('student-diet-screen').classList.add('active');
}

function closeStudentDiet() {
    document.getElementById('student-diet-screen').classList.remove('active');
}

// â”€â”€â”€ Meu Perfil (Student Profile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _perfilModalField = '';

function getStudentData() {
    const studentId = localStorage.getItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    return { studentId, students, student: students.find(s => s.id === studentId) };
}

function saveStudentData(students) {
    localStorage.setItem('trainerStudents', JSON.stringify(students));
}

function calcIMC(weight, height) {
    if (!weight || !height) return 0;
    const h = parseFloat(height) / 100;
    return (parseFloat(weight) / (h * h)).toFixed(1);
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
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
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
    if (nameEl) nameEl.textContent = student.name || 'Aluno';

    const avatarEl = document.getElementById('perfil-avatar');
    if (avatarEl) {
        const initials = (student.name || 'A').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.innerHTML = `<span>${initials}</span>`;
    }

    const membroEl = document.getElementById('perfil-membro-desde');
    if (membroEl) membroEl.textContent = `Membro desde ${formatDate(student.joinedAt)}`;

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
                ` : '<div class="metric-delta neutral">Primeiro registro</div>'}
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
                value: `${entry.bodyFat}%`,
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
                    <div class="history-changes">
                        ${changes.map(c => `
                            <div class="history-change-chip">
                                <i class="ph-bold ${c.icon}"></i>
                                <span>${c.label}: <strong>${c.value}</strong></span>
                                ${c.delta !== null ? `
                                    <span class="history-delta ${parseFloat(c.delta) > 0 ? 'up' : parseFloat(c.delta) < 0 ? 'down' : ''}">
                                        ${parseFloat(c.delta) > 0 ? '+' : ''}${c.delta}%
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
        if (nome) localStorage.setItem('studentName', nome);
        changed = true;
    }

    if (changed) {
        // Update the students array
        const idx = students.findIndex(s => s.id === studentId);
        if (idx !== -1) students[idx] = student;
        saveStudentData(students);

        closePerfilUpdateModal();
        renderStudentPerfil();

        // Also update dashboard name if changed
        const nameEl = document.getElementById('dash-student-name');
        if (nameEl) nameEl.innerText = `Olá, ${(student.name || 'Aluno').split(' ')[0]}`;
        const sideEl = document.getElementById('side-student-name');
        if (sideEl) sideEl.innerText = (student.name || 'Aluno').split(' ')[0];
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
        localStorage.setItem('trainerName', 'Admin');
        localStorage.setItem('currentTrainerCode', '00001');
    } else {
        const trainers = readStorageJSON('allTrainers', []);
        const t = trainers.find(x => x.code === code);
        if (t) {
            localStorage.setItem('trainerName', t.name.split(' ')[0]);
            localStorage.setItem('currentTrainerCode', t.code);
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
        consultoriaName: `Consultoria de ${firstName}`,
        services: services.value
    });
    localStorage.setItem('allTrainers', JSON.stringify(trainers));

    localStorage.setItem('trainerName', firstName);
    localStorage.setItem('currentTrainerCode', newCode);

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
    const sessionCode = localStorage.getItem('trainerSessionCode');
    if (sessionCode) {
        if (sessionCode === '00001') {
            localStorage.setItem('trainerName', 'Admin');
            localStorage.setItem('currentTrainerCode', '00001');
        } else {
            const trainers = readStorageJSON('allTrainers', []);
            const t = trainers.find(x => x.code === sessionCode);
            if (t) {
                localStorage.setItem('trainerName', t.name.split(' ')[0]);
                localStorage.setItem('currentTrainerCode', t.code);
            }
        }
        localStorage.removeItem('trainerSessionCode'); // Consume it
    }

    const trainerName = localStorage.getItem('trainerName') || 'Treinador';
    const trainerCode = localStorage.getItem('currentTrainerCode') || '00000';
    const canAutoEnterDashboard = !!sessionCode || (!!trainerCode && trainerCode !== '00000');

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

    updateTrainerStats();
}

// â”€â”€ View switching (Dashboard / Alunos / Duvidas / Exercicios) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchDashView(view) {
    const viewDash = document.getElementById('view-dashboard');
    const viewAlunos = document.getElementById('view-alunos');
    const viewDuvidas = document.getElementById('view-duvidas');
    const viewExercicios = document.getElementById('view-exercicios');
    const navDash = document.getElementById('nav-dashboard');
    const navAlunos = document.getElementById('nav-alunos');
    const navDuvidas = document.getElementById('nav-duvidas');
    const navExercicios = document.getElementById('nav-exercicios');
    const pageTitle = document.getElementById('main-page-title');

    // Reset visibility
    if (viewDash) viewDash.style.display = 'none';
    if (viewAlunos) viewAlunos.style.display = 'none';
    if (viewDuvidas) viewDuvidas.style.display = 'none';
    if (viewExercicios) viewExercicios.style.display = 'none';

    // Reset active states
    if (navDash) navDash.classList.remove('active');
    if (navAlunos) navAlunos.classList.remove('active');
    if (navDuvidas) navDuvidas.classList.remove('active');
    if (navExercicios) navExercicios.classList.remove('active');

    if (view === 'alunos') {
        if (viewAlunos) viewAlunos.style.display = '';
        if (navAlunos) navAlunos.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Gerenciar Alunos';
    } else if (view === 'duvidas') {
        if (viewDuvidas) viewDuvidas.style.display = '';
        if (navDuvidas) navDuvidas.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Dúvidas dos Alunos';

        // Contextual search
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => filterChats(e.target.value);
            globalSearch.placeholder = "Buscar conversas...";
            globalSearch.value = "";
        }
        renderDuvidas();
    } else if (view === 'exercicios') {
        if (viewExercicios) viewExercicios.style.display = '';
        if (navExercicios) navExercicios.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Catálogo de Exercícios';

        // Contextual search
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => searchExercises(e.target.value);
            globalSearch.placeholder = "Pesquisar exercício...";
            globalSearch.value = "";
        }
        renderExerciseCatalog();
    } else {
        if (viewDash) viewDash.style.display = '';
        if (navDash) navDash.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Painel de Controle';

        // Reset search to student filtering
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.oninput = (e) => filterStudents(e.target.value);
            globalSearch.placeholder = "Buscar aluno ou treino...";
            globalSearch.value = "";
        }
    }
}


// â”€â”€ Helper: build a student row HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildStudentRow(s, idx, options = {}) {
    const recentCompact = !!options.recentCompact;
    const safeName = escHtml(s?.name || ('Aluno ' + (s?.id || '')));
    const safeGoalText = escHtml(s?.goal || 'Sem objetivo definido');
    const safeWeight = escHtml(s?.weight || '--');
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
        <div class="student-list-item recent-student-card" onclick="openStudentProfile(${idx})">
            <div class="recent-student-top">
                <h4>${safeName}</h4>
                <span class="recent-status active">Ativo</span>
            </div>
            <div class="recent-meta-lines">
                <div class="recent-meta-row">
                    <p><strong>Objetivo:</strong> ${safeGoalText}</p>
                    <p><strong>Peso:</strong> ${safeWeight} kg</p>
                </div>
                <p><strong>Consumo:</strong> ${kcal} kcal/dia</p>
            </div>
        </div>`;
    }

    return `
    <div class="student-list-item grid-layout" onclick="openStudentProfile(${idx})">
        <div class="sli-col" data-label="Status">
            <span class="badge active"><div class="dot"></div> Ativo</span>
        </div>
        <div class="sli-col ident" data-label="Aluno">
            <div class="sli-avatar"><i class="ph-fill ph-user"></i></div>
            <div class="sli-info">
                <h4>${safeName}</h4>
                <span class="sli-sub">${timeDesc}</span>
            </div>
        </div>
        <div class="sli-col font-bold" data-label="Objetivo">${safeGoalText}</div>
        <div class="sli-col font-medium" data-label="Peso">${safeWeight} kg</div>
        <div class="sli-col text-primary" data-label="Consumo">${kcal} kcal/dia</div>
        <div class="sli-col actions" data-label="Acoes">
            <button class="btn-icon-minimal btn-whatsapp-quick" title="Enviar WhatsApp" onclick="openWhatsAppForStudent(${idx}, event)">
                <i class="ph-fill ph-whatsapp-logo"></i>
            </button>
            <button class="btn-icon-minimal" title="Mais ações" onclick="event.stopPropagation()"><i class="ph-bold ph-dots-three-vertical"></i></button>
        </div>
    </div>`;
}

function openWhatsAppForStudent(studentIdx, event) {
    if (event) event.stopPropagation();
    const students = readStorageJSON('trainerStudents', []);
    const s = students[studentIdx];
    if (!s) return;

    let phoneRaw = String(s.whatsapp || s.phone || s.telefone || '').trim();
    if (!phoneRaw) {
        phoneRaw = prompt(`Informe o WhatsApp de ${s.name || 'Aluno'} com DDI (ex: 5511999998888):`) || '';
        phoneRaw = sanitizeUserInput(phoneRaw, { maxLen: 20 });
        if (!phoneRaw) return;
        students[studentIdx].whatsapp = phoneRaw;
        localStorage.setItem('trainerStudents', JSON.stringify(students));
    }

    const phone = phoneRaw.replace(/\D/g, '');
    if (phone.length < 10) {
        alert('Número de WhatsApp inválido. Informe com DDD e, de preferência, com DDI.');
        return;
    }

    const coachName = localStorage.getItem('trainerName') || 'Treinador';
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

    // â”€â”€ Stats cards â”€â”€
    const elTotal = document.getElementById('stat-total');
    if (elTotal) elTotal.innerText = activeStudents.length;
    const elAtivos = document.getElementById('stat-ativos');
    if (elAtivos) elAtivos.innerText = activeStudents.length;
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
        const toShow = activeStudents
            .filter(matchesStudent)
            .slice(0, 5);
        recentList.innerHTML = toShow.length === 0
            ? `<p style="text-align:center;color:var(--text-muted);padding:3rem 0;">Nenhum aluno ativo ainda.</p>`
            : toShow.map((s) => buildStudentRow(s, getStudentIndex(s), { recentCompact: true })).join('');
        const paginInfo = document.getElementById('pagination-info');
        if (paginInfo) paginInfo.textContent = `Exibindo ${toShow.length} de ${activeStudents.length} alunos`;
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
        const toShow = activeStudents.filter((s) => {
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
        if (paginInfo) paginInfo.textContent = `Exibindo ${toShow.length} de ${activeStudents.length} alunos`;
    }

    // â”€â”€ Duvidas nav badge â”€â”€
    const notifications = readStorageJSON('trainerNotifications', []);
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
        localStorage.setItem('trainerNotifications', JSON.stringify(notifs));
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
    localStorage.setItem('trainerNotifications', JSON.stringify(notifs));
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
        return `<div class="chat-media-wrap ${sender}"><img src="${media.dataUrl}" alt="${escHtml(media.name || 'imagem')}" class="chat-media-image"></div>`;
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
            <img src="${trainerPendingAttachment.dataUrl}" class="chat-preview-image" alt="${escHtml(trainerPendingAttachment.name)}">
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
                resolve(canvas.toDataURL('image/jpeg', quality));
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

    localStorage.setItem('trainerNotifications', JSON.stringify(notifs));
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

let activeRoutineIdx = 0;

function switchTreinoSubview(subview) {
    const views = ['landing', 'analise', 'historico'];
    views.forEach(v => {
        const el = document.getElementById(`treino-${v}`);
        if (el) el.style.display = (v === subview) ? 'block' : 'none';
    });

    if (subview === 'analise') {
        activeRoutineIdx = 0;
        renderStudentWorkoutContentMain();
    } else if (subview === 'historico') {
        renderWorkoutHistoryTable();
    }
}

function renderStudentWorkoutContentMain() {
    const studentId = localStorage.getItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);
    if (!student || !student.workoutBlocks) return;

    const tabsNav = document.getElementById('workout-tabs-nav');
    const contentArea = document.getElementById('student-workout-content-main');
    if (!tabsNav || !contentArea) return;

    // 1. Render Tabs
    tabsNav.innerHTML = student.workoutBlocks.map((block, idx) => {
        const title = block.title || `Treino ${String.fromCharCode(65 + idx)}`;
        const isActive = idx === activeRoutineIdx;
        return `
            <button class="workout-tab ${isActive ? 'active' : ''}" onclick="selectRoutineTab(${idx})">
                <i class="ph-bold ph-barbell"></i>
                <span>${escHtml(title)}</span>
            </button>
        `;
    }).join('');

    // 2. Render Active Routine Card
    const block = student.workoutBlocks[activeRoutineIdx];
    if (!block) return;

    const muscles = getMuscleGroups(block.exercises);
    const lastPerformed = getLatestPerformanceDate(student.id, block.title);

    // Estimate time (simple: 8 min per exercise average)
    const estTime = block.exercises.length * 8;

    contentArea.innerHTML = `
        <div class="routine-card">
            <div class="routine-header">
                <div class="routine-title-row">
                    <h3>${escHtml(block.title || `Treino ${String.fromCharCode(65 + activeRoutineIdx)}`)}</h3>
                    ${lastPerformed ? `<span class="routine-last-performed">Última vez: ${lastPerformed}</span>` : ''}
                </div>
                <div class="routine-summary">
                    <span><i class="ph-bold ph-lightning"></i> ${escHtml(muscles.join(' • '))}</span>
                    <span><i class="ph-bold ph-list-numbers"></i> ${block.exercises.length} exercícios</span>
                    <span><i class="ph-bold ph-clock"></i> ~${estTime} min</span>
                </div>
            </div>

            <div class="routine-ex-list">
                ${block.exercises.map((ex, exIdx) => renderRoutineExItem(ex, exIdx)).join('')}
            </div>

            <button class="btn-start-routine" onclick="startWorkoutSession(${activeRoutineIdx})">
                <i class="ph-fill ph-play"></i> INICIAR ESTE TREINO
            </button>
        </div>
    `;
}

function selectRoutineTab(idx) {
    activeRoutineIdx = idx;
    renderStudentWorkoutContentMain();
}

function renderRoutineExItem(ex, idx) {
    return `
        <div class="routine-ex-item" id="routine-ex-${idx}">
            <button class="ex-top-trigger" onclick="toggleExDetails(${idx})">
                <div class="ex-name-box">
                    <strong>${escHtml(ex.nome)}</strong>
                    <span>${ex.series} séries · ${ex.descanso} descanso</span>
                </div>
                <i class="ph-bold ph-caret-down ex-chevron"></i>
            </button>
            <div class="ex-details-collapsible" id="ex-details-${idx}">
                <div class="ex-details-inner">
                    <div class="ex-detail-point">
                        <label>Séries</label>
                        <strong>${ex.series}</strong>
                    </div>
                    <div class="ex-detail-point">
                        <label>Repetições</label>
                        <strong>${ex.reps}</strong>
                    </div>
                    <div class="ex-detail-point">
                        <label>Carga</label>
                        <strong>${ex.carga}</strong>
                    </div>
                    <div class="ex-detail-point">
                        <label>Descanso</label>
                        <strong>${ex.descanso}</strong>
                    </div>
                    ${ex.obs ? `
                    <div class="ex-detail-point" style="grid-column: span 4; margin-top: 0.5rem;">
                        <label>Observações</label>
                        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">${escHtml(ex.obs)}</p>
                    </div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function toggleExDetails(idx) {
    const item = document.getElementById(`routine-ex-${idx}`);
    const details = document.getElementById(`ex-details-${idx}`);
    if (!item || !details) return;

    const isExpanded = item.classList.contains('expanded');

    // Close others
    document.querySelectorAll('.routine-ex-item.expanded').forEach(el => {
        if (el !== item) {
            el.classList.remove('expanded');
            el.querySelector('.ex-details-collapsible').style.maxHeight = '0px';
        }
    });

    if (isExpanded) {
        item.classList.remove('expanded');
        details.style.maxHeight = '0px';
    } else {
        item.classList.add('expanded');
        details.style.maxHeight = details.scrollHeight + 'px';
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

function getMuscleGroups(exercises) {
    // This is a simplified version. In a real app, this would be in the exercise database.
    const map = {
        'peito': ['supino', 'peitoral', 'chest'],
        'costas': ['puxada', 'remada', 'costas', 'back'],
        'pernas': ['agachamento', 'legpress', 'extensora', 'flexora', 'afundo', 'perna', 'legs'],
        'braços': ['bíceps', 'tríceps', 'rosca', 'pulley'],
        'ombros': ['desenvolvimento', 'lateral', 'frontal', 'ombro', 'shoulder']
    };

    const detected = new Set();
    exercises.forEach(ex => {
        const name = ex.nome.toLowerCase();
        for (const [group, keywords] of Object.entries(map)) {
            if (keywords.some(k => name.includes(k))) detected.add(group);
        }
    });

    return detected.size > 0 ? Array.from(detected) : ['Geral'];
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
        localStorage.setItem('trainerNotifications', JSON.stringify(notifs));

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
        localStorage.setItem('trainerNotifications', JSON.stringify(notifs));

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
    localStorage.setItem('trainerStudents', JSON.stringify(students));

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
    localStorage.setItem('trainerStudents', JSON.stringify(students));

    // Broadcast change
    syncChannel.postMessage({ type: 'STUDENT_REJECTED' });
    updateTrainerStats();
}

// â”€â”€ Filter helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function filterStudents(query) {
    updateTrainerStats(query);
}

function markNotifRead(index, btnElement) {
    let notifs = readStorageJSON('trainerNotifications', []);
    if (notifs[index]) {
        notifs[index].unread = false;
        localStorage.setItem('trainerNotifications', JSON.stringify(notifs));
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
let workoutBlocks = [];        // local state for workout blocks
let mealBlocks = [];           // local state for meal blocks
let pendingBlockIdx = null;    // which block an exercise is being added to
let pendingMealIdx = null;    // which meal an item is being added to

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

    // Load existing plan data
    workoutBlocks = s.workoutBlocks ? JSON.parse(JSON.stringify(s.workoutBlocks)) : [];
    mealBlocks = s.mealBlocks ? JSON.parse(JSON.stringify(s.mealBlocks)) : [];

    // Calculate TMB
    const w = parseFloat(s.weight) || 70;
    const h = parseFloat(s.height) || 175;
    const a = parseInt(s.age) || 25;
    let tmbCalc = 10 * w + 6.25 * h - 5 * a + (s.gender === 'M' ? 5 : -161);
    const kcalCalc = Math.round(tmbCalc * 1.55);

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
    document.getElementById('prof-tmb').innerText = `${Math.round(tmbCalc)} kcal`;
    document.getElementById('prof-gasto').innerText = `${kcalCalc} kcal`;
    document.getElementById('prof-atividade').innerText = 'Moderatamente Ativo';

    // Diet meta
    const diet = s.dietMeta || {};
    const dm = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    dm('diet-kcal-meta', diet.kcal);
    dm('diet-protein-meta', diet.protein);
    dm('diet-carb-meta', diet.carb);
    dm('diet-fat-meta', diet.fat);

    // Switch screens
    document.getElementById('trainer-dashboard-screen').classList.remove('active');
    document.getElementById('trainer-student-profile-screen').classList.add('active');

    // Render workout and open Treino tab
    renderWorkoutBlocks();
    renderMeals();
    switchProfileTab('treino');
}

function closeStudentProfile() {
    document.getElementById('trainer-student-profile-screen').classList.remove('active');
    document.getElementById('trainer-dashboard-screen').classList.add('active');
    currentStudentIdx = null;
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

    workoutBlocks.forEach(block => {
        block.exercises.forEach(ex => {
            if (!Array.isArray(ex.substitutes)) ex.substitutes = ['', ''];
            if (typeof ex.supersetWithNext !== 'boolean') ex.supersetWithNext = false;
        });
    });

    if (workoutBlocks.length === 0) {
        container.innerHTML = `
        <div class="workout-empty">
            <i class="ph-light ph-barbell" style="font-size:2.5rem;color:var(--text-muted)"></i>
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

function addWorkoutBlock() {
    const letter = String.fromCharCode(65 + workoutBlocks.length); // A, B, C ...
    workoutBlocks.push({ name: `Treino ${letter}`, exercises: [] });
    renderWorkoutBlocks();
}

function deleteWorkoutBlock(bIdx) {
    if (!confirm('Remover este bloco de treino?')) return;
    workoutBlocks.splice(bIdx, 1);
    renderWorkoutBlocks();
}

function deleteExercise(bIdx, eIdx) {
    workoutBlocks[bIdx].exercises.splice(eIdx, 1);
    renderWorkoutBlocks();
}

function updateExerciseSubstitute(bIdx, eIdx, subIdx, value) {
    const ex = workoutBlocks?.[bIdx]?.exercises?.[eIdx];
    if (!ex) return;
    if (!Array.isArray(ex.substitutes)) ex.substitutes = ['', ''];
    ex.substitutes[subIdx] = value;
}

function toggleSupersetWithNext(bIdx, eIdx, checked) {
    const ex = workoutBlocks?.[bIdx]?.exercises?.[eIdx];
    if (!ex) return;
    ex.supersetWithNext = !!checked;
    renderWorkoutBlocks();
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
    const filtered = EXERCISE_CATALOG_DATA.filter(ex => {
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
                    <span class="text-muted">${escHtml(item.qtd || '--')}</span>
                    <span class="text-primary">${item.kcal || 0} kcal</span>
                    <span>${item.prot || 0}g</span>
                    <span>${item.carb || 0}g</span>
                    <span>${item.gord || 0}g</span>
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
    localStorage.setItem('trainerStudents', JSON.stringify(students));

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
    localStorage.setItem('trainerStudents', JSON.stringify(students));

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
let workoutFeedbackRating = 0;
let workoutFeedbackIntensity = 'moderado';
let pendingSetCompletion = null;

function saveWorkoutBackup() {
    if (workoutState) {
        localStorage.setItem('active_workout_backup', JSON.stringify(workoutState));
    }
}

function clearWorkoutBackup() {
    localStorage.removeItem('active_workout_backup');
}

function restoreWorkoutBackup() {
    const backup = localStorage.getItem('active_workout_backup');
    if (backup) {
        try {
            workoutState = JSON.parse(backup);
            // Resume view
            switchStudentView('log-workout');
            // Resume Timer
            if (workoutTimerInterval) clearInterval(workoutTimerInterval);
            workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);
            renderWorkoutLog();
            return true;
        } catch (e) {
            console.error('Falha ao restaurar backup de treino', e);
            clearWorkoutBackup();
        }
    }
    return false;
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

function appendCompletedSetLog(entry) {
    if (!entry || !entry.id) return;
    const logs = readStorageJSON('completed_sets_log', []);
    if (logs.some(item => item.id === entry.id)) return;
    logs.push(entry);
    localStorage.setItem('completed_sets_log', JSON.stringify(logs));
}

function startWorkoutSession(blockIdx = 0) {
    const studentId = localStorage.getItem('currentStudentId');
    const students = readStorageJSON('trainerStudents', []);
    const student = students.find(s => s.id === studentId);

    if (!student || !student.workoutBlocks || !student.workoutBlocks[blockIdx]) {
        alert('Plano de treino não encontrado.');
        return;
    }

    const block = student.workoutBlocks[blockIdx];
    const personalRecords = student.personalRecords || {};
    const supersetGroups = computeSupersetGroups(block.exercises || []);

    workoutState = {
        sessionId: `${studentId}-${Date.now()}`,
        startTime: Date.now(),
        title: block.title || 'Meu Treino',
        exercises: block.exercises.map((ex, idx) => ({
            id: `ex-${idx}`,
            nome: ex.nome,
            baseNome: ex.nome,
            substitutes: Array.isArray(ex.substitutes) ? ex.substitutes.filter(Boolean) : [],
            showSubstitutes: false,
            supersetGroup: supersetGroups[idx] || 0,
            notes: '',
            best: personalRecords[ex.nome] || { maxWeight: 0, maxVolume: 0, maxReps: 0 },
            sets: Array.from({ length: parseInt(ex.series) || 3 }, (_, sIdx) => ({
                id: `set-${idx}-${sIdx}`,
                weight: ex.carga || '',
                reps: ex.reps || '',
                intensityLevel: 0,
                rpe: '',
                rir: '',
                logged: false,
                completed: false,
                brokenPRs: { weight: false, volume: false, reps: false },
                prev: getPreviousSessionData(studentId, ex.nome)
            }))
        }))
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
    if (titleEl) titleEl.innerText = workoutState.title;

    container.innerHTML = workoutState.exercises.map((ex, exIdx) => {
        const completed = ex.sets.filter(s => s.completed).length;
        const total = ex.sets.length;
        const nextEx = workoutState.exercises[exIdx + 1];
        const linkedToNext = ex.supersetGroup > 0 && nextEx && nextEx.supersetGroup === ex.supersetGroup;

        return `
        <div class="log-exercise-card ${ex.supersetGroup ? 'superset-card' : ''} ${linkedToNext ? 'superset-linked' : ''}">
            <div class="log-ex-header">
                <div class="log-ex-head-main">
                    <h3 class="clickable-ex-title" onclick="openExerciseProgressModalEncoded('${encodeURIComponent(ex.nome)}')">${escHtml(ex.nome)}</h3>
                    <div class="log-ex-meta">
                        <span class="meta-pill"><i class="ph-bold ph-check-circle"></i> ${completed}/${total} séries</span>
                        <span class="meta-pill muted"><i class="ph-bold ph-chart-line-up"></i> registrar carga</span>
                        ${ex.supersetGroup ? `<span class="meta-pill"><i class="ph-bold ph-lightning"></i> bi-set ${ex.supersetGroup}</span>` : ''}
                    </div>
                </div>
                <div class="log-ex-top-actions">
                    ${ex.substitutes && ex.substitutes.length > 0 ? `
                    <button class="btn-icon-tiny" onclick="toggleLogSubstitutes(${exIdx})" title="Trocar exercicio">
                        <i class="ph-bold ph-arrows-clockwise"></i>
                    </button>` : ''}
                <button class="btn-icon-tiny" onclick="removeExerciseFromLog(${exIdx})"><i class="ph-bold ph-trash"></i></button>
                </div>
            </div>

            ${ex.showSubstitutes ? `
                <div class="log-substitute-box">
                    <strong>Substitutos aprovados pelo coach:</strong>
                    <div class="log-substitute-list">
                        ${ex.substitutes.map(sub => `<button class="btn-substitute-ex" onclick="applyExerciseSubstituteEncoded(${exIdx}, '${encodeURIComponent(sub)}')">${escHtml(sub)}</button>`).join('')}
                        <button class="btn-substitute-ex muted" onclick="applyExerciseSubstituteEncoded(${exIdx}, '${encodeURIComponent(ex.baseNome)}')">Voltar original</button>
                    </div>
                </div>
            ` : ''}

            <input type="text" class="exercise-notes-input" 
                placeholder="Notas do exercício..." 
                value="${escHtml(ex.notes || '')}"
                oninput="updateExerciseNotes(${exIdx}, this.value)">
            
            <div class="log-set-table">
                <div class="log-set-header">
                    <span>Série</span>
                    <span class="col-prev">Último</span>
                    <span>Kg</span>
                    <span>Reps</span>
                    <span>Intensidade</span>
                    <span>OK</span>
                </div>
                ${ex.sets.map((set, setIdx) => `
                    <div class="log-set-row ${set.completed ? 'completed' : ''}" id="row-${exIdx}-${setIdx}">
                        <div class="set-number">${setIdx + 1}</div>
                        <button class="set-prev col-prev" onclick="fillFromPreviousSet(${exIdx}, ${setIdx})">${escHtml(set.prev)}</button>

                        <div class="set-input-wrap">
                            <input type="number" inputmode="decimal" min="0" step="0.5" class="set-input log-input-tactile" value="${set.weight}" 
                                placeholder="--" oninput="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)"
                                ${set.completed ? 'disabled' : ''}>
                            <button class="mini-adjust" onclick="adjustSetWeight(${exIdx}, ${setIdx}, 2.5)">+2.5</button>
                        </div>

                        <div class="set-input-wrap">
                            <input type="number" inputmode="numeric" min="0" step="1" class="set-input log-input-tactile" value="${set.reps}" 
                                placeholder="--" oninput="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)"
                                ${set.completed ? 'disabled' : ''}>
                            <button class="mini-adjust" onclick="adjustSetReps(${exIdx}, ${setIdx}, 1)">+1</button>
                        </div>

                        <div class="set-intensity-visual" title="${getIntensityLabel(set.intensityLevel)}">
                            ${renderIntensitySelector(exIdx, setIdx, set.intensityLevel)}
                        </div>

                        <div class="set-check-wrap">
                            <button class="btn-check-set ${set.completed ? 'active' : ''}" 
                                onclick="toggleSetCompletion(${exIdx}, ${setIdx})">
                                <i class="ph-bold ${set.completed ? 'ph-check' : 'ph-circle'}"></i>
                            </button>
                            ${renderPRTrophy(set)}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="log-ex-footer">
                <button class="btn-add-set" onclick="addSetToExercise(${exIdx})">
                    <i class="ph-bold ph-plus"></i> Adicionar Série
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function updateExerciseNotes(exIdx, notes) {
    if (!workoutState || !workoutState.exercises[exIdx]) return;
    workoutState.exercises[exIdx].notes = notes;
    saveWorkoutBackup();
}

function renderPRTrophy(set) {
    if (!set.brokenPRs || !set.completed) return '';
    const isBroken = set.brokenPRs.weight || set.brokenPRs.volume;
    if (!isBroken) return '';

    let tooltip = 'Recorde Batido: ';
    const types = [];
    if (set.brokenPRs.weight) types.push('Peso');
    if (set.brokenPRs.volume) types.push('Volume');
    tooltip += types.join(', ') + '!';

    return `
        <div class="pr-trophy-container">
            <i class="ph-fill ph-trophy pr-trophy" title="${tooltip}"></i>
        </div>
    `;
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


function fillFromPreviousSet(exIdx, setIdx) {
    if (!workoutState) return;
    const ex = workoutState.exercises[exIdx];
    if (!ex || !ex.sets[setIdx]) return;

    const prevSet = ex.sets[setIdx - 1];
    if (!prevSet) return;

    ex.sets[setIdx].weight = prevSet.weight || ex.sets[setIdx].weight;
    ex.sets[setIdx].reps = prevSet.reps || ex.sets[setIdx].reps;
    updateExercisePRs(exIdx);
    saveWorkoutBackup();
    renderWorkoutLog();
}

function adjustSetWeight(exIdx, setIdx, delta) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set || set.completed) return;

    const current = parseFloat(set.weight) || 0;
    const next = Math.max(0, current + delta);
    set.weight = Number.isInteger(next) ? String(next) : next.toFixed(1);

    updateExercisePRs(exIdx);
    saveWorkoutBackup();
    renderWorkoutLog();
}

function adjustSetReps(exIdx, setIdx, delta) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set || set.completed) return;

    const current = parseInt(set.reps) || 0;
    set.reps = String(Math.max(0, current + delta));

    updateExercisePRs(exIdx);
    saveWorkoutBackup();
    renderWorkoutLog();
}

function updateExercisePRs(exIdx) {
    const ex = workoutState.exercises[exIdx];
    const best = ex.best;

    // Reset all brokenPRs in this exercise
    ex.sets.forEach(set => {
        set.brokenPRs = { weight: false, reps: false, volume: false };
    });

    // We only care about COMPLETED sets for the trophy (as per previous requirement)
    // but the user wants to see it based on the values. 
    // Actually, "renderPRTrophy" already checks for !set.completed.
    // So we calculate PR status for all sets, and the UI handles the visibility.

    let maxWeightIdx = -1;
    let maxVolumeIdx = -1;

    let sessionMaxWeight = best.maxWeight;
    let sessionMaxVolume = best.maxVolume;

    ex.sets.forEach((set, idx) => {
        const w = parseFloat(set.weight) || 0;
        const r = parseInt(set.reps) || 0;
        const v = w * r;

        if (w > sessionMaxWeight) {
            sessionMaxWeight = w;
            maxWeightIdx = idx;
        }
        if (v > sessionMaxVolume) {
            sessionMaxVolume = v;
            maxVolumeIdx = idx;
        }
    });

    // Assign trophies only to the session champions
    if (maxWeightIdx !== -1) ex.sets[maxWeightIdx].brokenPRs.weight = true;
    if (maxVolumeIdx !== -1) ex.sets[maxVolumeIdx].brokenPRs.volume = true;
}

function checkPRs(exIdx, setIdx) {
    // Deprecated for updateExercisePRs
    updateExercisePRs(exIdx);
}

function toggleSetCompletion(exIdx, setIdx) {
    if (!workoutState) return;
    const exercise = workoutState.exercises[exIdx];
    const set = exercise.sets[setIdx];

    if (!set.completed && !set.intensityLevel) {
        pendingSetCompletion = { exIdx, setIdx };
        openSetEffortQuickModal();
        return;
    }

    set.completed = !set.completed;

    if (set.completed) {
        startRestTimer(60); // Default 60s
        if (!set.logged) {
            appendCompletedSetLog({
                id: `${workoutState.sessionId}-${exIdx}-${setIdx}`,
                sessionId: workoutState.sessionId,
                studentId: localStorage.getItem('currentStudentId'),
                workoutTitle: workoutState.title,
                exercise: exercise.nome,
                serie: setIdx + 1,
                peso: parseFloat(set.weight) || 0,
                reps: parseInt(set.reps) || 0,
                intensidade: set.intensityLevel || 0,
                rpe: set.rpe ?? null,
                rir: set.rir ?? null,
                completedAt: new Date().toISOString()
            });
            set.logged = true;
        }
    } else {
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

function openSetEffortQuickModal() {
    const modal = document.getElementById('set-effort-quick-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeSetEffortQuickModal() {
    const modal = document.getElementById('set-effort-quick-modal');
    if (!modal) return;
    pendingSetCompletion = null;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 180);
}

function chooseQuickSetEffort(level) {
    if (!pendingSetCompletion) return;
    const { exIdx, setIdx } = pendingSetCompletion;
    setSetIntensity(exIdx, setIdx, level);
    pendingSetCompletion = null;
    closeSetEffortQuickModal();
    toggleSetCompletion(exIdx, setIdx);
}
// â”€â”€â”€ REST TIMER LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startRestTimer(seconds) {
    restTimeLeft = seconds;
    totalRestTime = seconds;

    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.classList.remove('timer-ended');
    }

    updateRestTimerUI();

    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
        restTimeLeft--;
        if (restTimeLeft <= 0) {
            restTimeLeft = 0;
            updateRestTimerUI();
            clearInterval(restTimerInterval);
            onRestTimerEnd();
        } else {
            updateRestTimerUI();
        }
    }, 1000);
}

function updateRestTimerUI() {
    const mins = Math.floor(restTimeLeft / 60).toString().padStart(2, '0');
    const secs = (restTimeLeft % 60).toString().padStart(2, '0');
    const countdownEl = document.getElementById('rest-countdown');
    if (countdownEl) countdownEl.innerText = `${mins}:${secs}`;

    const progressFill = document.getElementById('rest-progress-fill');
    if (progressFill && totalRestTime > 0) {
        const percentage = (restTimeLeft / totalRestTime) * 100;
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
    hideRestTimer();
}

function adjustRestTimer(seconds) {
    restTimeLeft += seconds;
    totalRestTime += seconds;
    updateRestTimerUI();

    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay && overlay.classList.contains('timer-ended') && restTimeLeft > 0) {
        overlay.classList.remove('timer-ended');
        startRestTimer(restTimeLeft);
    }
}

function hideRestTimer() {
    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('timer-ended');
    }
    if (restTimerInterval) clearInterval(restTimerInterval);
}

function addSetToExercise(exIdx) {
    if (!workoutState) return;
    const ex = workoutState.exercises[exIdx];
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({
        id: `set-${exIdx}-${ex.sets.length}`,
        weight: lastSet ? lastSet.weight : '',
        reps: lastSet ? lastSet.reps : '',
        intensityLevel: 0,
        rpe: '',
        rir: '',
        logged: false,
        completed: false,
        brokenPRs: { weight: false, volume: false, reps: false },
        prev: '-'
    });
    saveWorkoutBackup();
    renderWorkoutLog();
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
    const studentId = localStorage.getItem('currentStudentId');

    // Calculate volume only for completed sets
    const totalVolume = workoutState.exercises.reduce((v, ex) =>
        v + ex.sets.reduce((sv, s) => sv + (s.completed ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0), 0), 0
    );

    const workoutArchive = {
        ID_Usuario: studentId,
        Data_Treino: new Date().toISOString(),
        Duracao: elapsed,
        Volume_Total: totalVolume,
        Exercicios: workoutState.exercises.map(ex => ({
            nome: ex.nome,
            sets: ex.sets
                .filter(s => s.completed)
                .map(s => ({
                    peso: parseFloat(s.weight) || 0,
                    reps: parseInt(s.reps) || 0,
                    intensidade: s.intensityLevel || null,
                    rpe: s.rpe ? parseFloat(s.rpe) : null,
                    rir: s.rir ? parseInt(s.rir) : null,
                    brokenPRs: s.brokenPRs // Keep this for summary visualization
                }))
        })).filter(ex => ex.sets.length > 0),
        Avaliacao_Geral: {
            qualidade: Number(feedback.quality) || 0,
            intensidade: feedback.intensity || 'moderado',
            comentario: feedback.notes || ''
        }
    };

    // SAVE TO HISTORY
    const history = readStorageJSON('workoutHistory', []);
    history.push(workoutArchive);
    localStorage.setItem('workoutHistory', JSON.stringify(history));

    // UPDATE PERSONAL RECORDS PERMANENTLY
    const students = readStorageJSON('trainerStudents', []);
    const sIdx = students.findIndex(s => s.id === studentId);

    if (sIdx !== -1) {
        if (!students[sIdx].personalRecords) students[sIdx].personalRecords = {};

        workoutState.exercises.forEach(ex => {
            const currentMelhores = students[sIdx].personalRecords[ex.nome] || { maxWeight: 0, maxVolume: 0, maxReps: 0 };

            ex.sets.forEach(set => {
                if (!set.completed) return;
                const w = parseFloat(set.weight) || 0;
                const r = parseInt(set.reps) || 0;
                const v = w * r;

                if (w > currentMelhores.maxWeight) currentMelhores.maxWeight = w;
                if (r > currentMelhores.maxReps) currentMelhores.maxReps = r;
                if (v > currentMelhores.maxVolume) currentMelhores.maxVolume = v;
            });

            students[sIdx].personalRecords[ex.nome] = currentMelhores;
        });

        localStorage.setItem('trainerStudents', JSON.stringify(students));
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

    // Calculate PR Count
    let prCount = 0;
    archive.Exercicios.forEach(ex => {
        ex.sets.forEach(s => {
            if (s.brokenPRs && (s.brokenPRs.weight || s.brokenPRs.volume)) prCount++;
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
        const hasPR = s.brokenPRs && (s.brokenPRs.weight || s.brokenPRs.volume);
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

function closeWorkoutSummary() {
    // Final clear of state and return home
    workoutState = null;
    workoutFeedbackRating = 0;
    workoutFeedbackIntensity = 'moderado';
    clearWorkoutBackup();
    switchStudentView('home');
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

    let filtered = EXERCISE_CATALOG_DATA;

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


function mapIntensityToMetrics(level) {
    const map = {
        1: { rpe: 6.0, rir: 4 },
        2: { rpe: 7.0, rir: 3 },
        3: { rpe: 8.0, rir: 2 },
        4: { rpe: 9.0, rir: 1 },
        5: { rpe: 10.0, rir: 0 }
    };
    return map[level] || { rpe: null, rir: null };
}

function getIntensityLabel(level) {
    const labels = {
        0: 'Sem intensidade',
        1: 'Leve',
        2: 'Confortavel',
        3: 'No ponto',
        4: 'Pesado',
        5: 'Falha total'
    };
    return labels[level] || labels[0];
}

function renderIntensitySelector(exIdx, setIdx, selectedLevel) {
    return Array.from({ length: 5 }, (_, idx) => {
        const level = idx + 1;
        const active = level <= (Number(selectedLevel) || 0) ? 'active' : '';
        return `<button type="button" class="set-intensity-dot ${active}" onclick="setSetIntensity(${exIdx}, ${setIdx}, ${level})"></button>`;
    }).join('');
}

function setSetIntensity(exIdx, setIdx, level) {
    if (!workoutState) return;
    const set = workoutState.exercises?.[exIdx]?.sets?.[setIdx];
    if (!set || set.completed) return;

    const l = Number(level) || 0;
    const mapped = mapIntensityToMetrics(l);

    set.intensityLevel = l;
    set.rpe = mapped.rpe;
    set.rir = mapped.rir;

    saveWorkoutBackup();
    renderWorkoutLog();
}






