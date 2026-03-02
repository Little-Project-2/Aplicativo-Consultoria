function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById('app').classList.remove('wide');
}

function goToHome() {
    // Clear student session if they go back to selection (optional, but safer for logout)
    localStorage.removeItem('currentStudentId');
    localStorage.removeItem('connectedTrainerCode');
    hideAllScreens();
    document.getElementById('home-screen').classList.add('active');
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('currentStudentId');
        localStorage.removeItem('connectedTrainerCode');
        localStorage.removeItem('studentName');
        location.reload(); // Hard refresh to clear state
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if student is already "logged in"
    const studentId = localStorage.getItem('currentStudentId');
    if (studentId) {
        hideAllScreens();
        document.getElementById('app').classList.add('wide');
        document.getElementById('student-dashboard-screen').classList.add('active');
        initStudentDashboard();
    }
});

// ─── Real-Time Sync (Cross-Tab) ──────────────────────────────────────────
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
                const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
        if (studentId && document.getElementById('student-dashboard-screen').classList.contains('active')) {
            initStudentDashboard();

            // If detail views are open, they will be refreshed next time they open, 
            // but we can also trigger a refresh if they are currently visible
            if (document.getElementById('student-workout-screen').classList.contains('active')) openStudentWorkout();
            if (document.getElementById('student-diet-screen').classList.contains('active')) openStudentDiet();
        }
    }
});

function copyAccessCode(elementId, btnId) {
    const code = document.getElementById(elementId)?.innerText;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-check" style="color:#22c55e"></i>';
            setTimeout(() => {
                btn.innerHTML = originalIcon;
            }, 2000);
        }
    });
}

// Alias for trainer dashboard
function copyTrainerCode() {
    copyAccessCode('dash-trainer-code', 'btn-copy-code');
}

function goToStudentArea() {
    hideAllScreens();
    document.getElementById('student-screen').classList.add('active');
}

function goToGlobalLogin() {
    hideAllScreens();
    document.getElementById('global-login-screen').classList.add('active');
}

function goToProfileCreate() {
    hideAllScreens();
    document.getElementById('profile-create-screen').classList.add('active');
}

function toggleElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ─── Authentication Logic ──────────────────────────────────────────────────

function handleEmailLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const user = users.find(u => u.email === email && u.password === pass);

    if (user) {
        processLogin(user);
    } else {
        alert('E-mail ou senha incorretos.');
    }
}

function handleProfileCreation() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const role = document.querySelector('input[name="reg-role"]:checked').value;

    if (!name || !email || !pass) return;

    let users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    if (users.some(u => u.email === email)) {
        alert('Este e-mail já está cadastrado.');
        return;
    }

    const newUser = { name, email, password: pass, role, joinedAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    alert('Conta criada com sucesso! Agora você pode entrar.');
    goToGlobalLogin();
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
    if (user.role === 'trainer') {
        // Find or create a trainer code for this user
        let trainerCode = localStorage.getItem('currentTrainerCode') || '00001';
        localStorage.setItem('trainerName', user.name.split(' ')[0]);
        localStorage.setItem('currentTrainerCode', trainerCode);
        window.location.href = 'trainer.html';
    } else {
        localStorage.setItem('studentName', user.name);
        // Find if this user already has an ID, or generate one
        let studentId = localStorage.getItem('currentStudentId') || Math.floor(1000 + Math.random() * 9000).toString();
        localStorage.setItem('currentStudentId', studentId);

        hideAllScreens();
        document.getElementById('app').classList.add('wide');
        document.getElementById('student-dashboard-screen').classList.add('active');
        initStudentDashboard();
        switchStudentView('home'); // Land on Menu/Dashboard
    }
}

let currentWorkoutTab = 0;

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
        currentWorkoutTab = 0; // Reset tab when entering the view
        renderStudentWorkoutMain();
    }
    if (view === 'dieta') renderStudentDietMain();
}

function renderStudentWorkoutMain() {
    const studentId = localStorage.getItem('currentStudentId');
    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    const student = students.find(s => s.id === studentId);

    const tabsNav = document.getElementById('workout-tabs-nav');
    const mainContent = document.getElementById('student-workout-content-main');
    if (!tabsNav || !mainContent) return;

    if (!student || !student.active || !student.workoutBlocks || student.workoutBlocks.length === 0) {
        tabsNav.innerHTML = '';
        mainContent.innerHTML = `<div class="empty-state-card" style="margin-top:2rem;">
            <i class="ph-fill ph-hourglass-high"></i>
            <div class="empty-info">
                <h3>Treino em análise</h3>
                <p>Seu treinador ainda não liberou sua ficha de treinos.</p>
            </div>
        </div>`;
        return;
    }

    // ── Render Tabs ──
    tabsNav.innerHTML = student.workoutBlocks.map((block, idx) => `
        <button class="tab-btn ${idx === currentWorkoutTab ? 'active' : ''}" 
            onclick="switchWorkoutTab(${idx})">
            ${block.title.split(' ')[0]} ${block.title.split(' ')[1] || (idx + 1)}
        </button>
    `).join('');

    // ── Render Active Routine Card ──
    const block = student.workoutBlocks[currentWorkoutTab];
    const muscleGroups = getMuscleGroups(block.exercises);

    mainContent.innerHTML = `
        <div class="routine-card">
            <div class="routine-header">
                <div class="routine-title-box">
                    <h2>${escHtml(block.title)}</h2>
                    <div class="routine-meta">
                        <span><i class="ph-bold ph-barbell"></i> ${block.exercises.length} Exercícios</span>
                        <span><i class="ph-bold ph-clock"></i> ~60 min</span>
                    </div>
                </div>
            </div>

            <div class="muscle-tags">
                ${muscleGroups.map(m => `<span class="tag-muscle">${m}</span>`).join('')}
            </div>

            <div class="routine-exercise-list">
                ${block.exercises.map(ex => `
                    <div class="routine-ex-item">
                        <div class="ex-name-box">
                            <span>${escHtml(ex.nome)}</span>
                            <div class="ex-sets-mini">${ex.series} séries • ${ex.reps} reps</div>
                        </div>
                        <i class="ph-bold ph-caret-right" style="color: rgba(255,255,255,0.1)"></i>
                    </div>
                `).join('')}
            </div>

            <div class="routine-footer">
                <button class="btn-primary" onclick="startWorkoutSession(${currentWorkoutTab})" 
                        style="width: 100%; padding: 1.2rem; font-size: 1.1rem; font-weight: 800;">
                    <i class="ph-fill ph-play"></i> INICIAR TREINO
                </button>
            </div>
        </div>
    `;
}

function switchWorkoutTab(idx) {
    currentWorkoutTab = idx;
    renderStudentWorkoutMain();
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
    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
    const code = document.getElementById('global-code').value;
    if (code.length !== 5) {
        alert('Digite o código de 5 dígitos.');
        return;
    }

    // 1. Check Trainer (Admin or allTrainers)
    const trainers = JSON.parse(localStorage.getItem('allTrainers') || '[]');
    const isTrainer = trainers.some(t => t.code === code) || code === '00001';

    if (isTrainer) {
        // Redirect to trainer dashboard
        // Note: For simplicity, we could store 'trainerSessionCode' to auto-login in trainer.html
        localStorage.setItem('trainerSessionCode', code);
        window.location.href = 'trainer.html';
        return;
    }

    // 2. Check Student
    const allStudents = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
    const code = document.getElementById('trainer-code').value;
    if (code.length !== 5) {
        alert('O código deve ter exatamente 5 dígitos.');
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
        const trainers = JSON.parse(localStorage.getItem('allTrainers') || '[]');
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
    const nome = document.getElementById('q_nome')?.value.trim() || 'Aluno';
    const age = document.getElementById('q_idade')?.value || '25';
    const gender = document.getElementById('q_genero')?.value || 'M';
    const weight = document.getElementById('q_peso')?.value || '70';
    const height = document.getElementById('q_altura')?.value || '175';
    const goal = document.getElementById('q_objetivo')?.value || 'Hipertrofia';

    const id = Math.floor(1000 + Math.random() * 9000).toString();
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
        personalRecords: {} // Initialize PRs
    };

    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    students.push(newStudent);
    localStorage.setItem('trainerStudents', JSON.stringify(students));

    let notifs = JSON.parse(localStorage.getItem('trainerNotifications') || '[]');
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

// ─── Student Dashboard (Real Data) ──────────────────────────────────────────

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

    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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

    container.innerHTML = student.workoutBlocks.map((block, idx) => `
        <button class="action-card highlight" onclick="startWorkoutSession(${idx})"
            style="background: rgba(163, 230, 53, 0.1); border-color: rgba(163, 230, 53, 0.3); padding: 1rem;">
            <i class="ph-fill ph-play-circle" style="color: var(--primary-color); font-size: 1.5rem;"></i>
            <div style="flex:1; text-align: left;">
                <span style="display: block; font-weight: 700; color: var(--text-main);">${escHtml(block.title)}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${block.exercises.length} exercícios • Registrar cargas</span>
            </div>
            <i class="ph-bold ph-caret-right" style="color: var(--primary-color); font-size: 1rem;"></i>
        </button>
    `).join('');
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
    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
    const code = document.getElementById('trainer-login-code').value;
    if (code.length !== 5) {
        alert('O código deve ter exatamente 5 dígitos.');
        return;
    }

    if (code === '00001') {
        localStorage.setItem('trainerName', 'Admin');
        localStorage.setItem('currentTrainerCode', '00001');
    } else {
        const trainers = JSON.parse(localStorage.getItem('allTrainers') || '[]');
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
    const name = document.getElementById('trainer-name').value;
    const services = document.querySelector('input[name="services"]:checked');

    if (!name.trim() || !services) {
        alert('Preencha todos os dados corretamente.');
        return;
    }

    const firstName = name.split(' ')[0];
    const newCode = Math.floor(10000 + Math.random() * 89999).toString();

    // Save trainer to "global" list
    const trainers = JSON.parse(localStorage.getItem('allTrainers') || '[]');
    trainers.push({
        name: name,
        code: newCode,
        consultoriaName: `Consultoria de ${firstName}`,
        services: services.value
    });
    localStorage.setItem('allTrainers', JSON.stringify(trainers));

    localStorage.setItem('trainerName', firstName);
    localStorage.setItem('currentTrainerCode', newCode);

    document.getElementById('dash-trainer-name').innerText = `Olá, ${firstName}`;
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
            const trainers = JSON.parse(localStorage.getItem('allTrainers') || '[]');
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

    const elDashName = document.getElementById('dash-trainer-name');
    if (elDashName) elDashName.innerText = `Olá, ${trainerName}`;

    const elDashCode = document.getElementById('dash-trainer-code');
    if (elDashCode) elDashCode.innerText = trainerCode;

    updateTrainerStats();
}

// ── View switching (Dashboard / Alunos) ──────────────────────────────────────
function switchDashView(view) {
    const viewDash = document.getElementById('view-dashboard');
    const viewAlunos = document.getElementById('view-alunos');
    const navDash = document.getElementById('nav-dashboard');
    const navAlunos = document.getElementById('nav-alunos');
    const pageTitle = document.getElementById('main-page-title');

    if (view === 'alunos') {
        viewDash.style.display = 'none';
        viewAlunos.style.display = '';
        navDash.classList.remove('active');
        navAlunos.classList.add('active');
        if (pageTitle) pageTitle.textContent = 'Gerenciar Alunos';
    } else {
        viewDash.style.display = '';
        viewAlunos.style.display = 'none';
        navDash.classList.add('active');
        navAlunos.classList.remove('active');
        if (pageTitle) pageTitle.textContent = 'Painel de Controle';
    }
}

// ── Helper: build a student row HTML ────────────────────────────────────────
function buildStudentRow(s, idx) {
    const w = parseFloat(s.weight) || 70;
    const h = parseFloat(s.height) || 175;
    const a = parseInt(s.age) || 25;
    let tmb = 10 * w + 6.25 * h - 5 * a + ((s.gender === 'M') ? 5 : -161);
    const kcal = Math.round(tmb * 1.55);

    const joinedAt = new Date(s.joinedAt || new Date());
    const diffDays = Math.floor((new Date() - joinedAt) / (1000 * 60 * 60 * 24));
    let timeDesc = 'Entrou recentemente';
    if (diffDays > 30) timeDesc = `Entrou há ${Math.floor(diffDays / 30)} meses`;
    else if (diffDays > 0) timeDesc = `Entrou há ${diffDays} dias`;

    return `
    <div class="student-list-item grid-layout" onclick="openStudentProfile(${idx})">
        <div class="sli-col">
            <span class="badge active"><div class="dot"></div> Ativo</span>
        </div>
        <div class="sli-col ident">
            <div class="sli-avatar"><i class="ph-fill ph-user"></i></div>
            <div class="sli-info">
                <h4>${s.name || 'Aluno ' + s.id}</h4>
                <span class="sli-sub">${timeDesc}</span>
            </div>
        </div>
        <div class="sli-col font-bold">${s.goal}</div>
        <div class="sli-col font-medium">${s.weight} kg</div>
        <div class="sli-col text-primary">${kcal} kcal/dia</div>
        <div class="sli-col actions">
            <button class="btn-icon-minimal" onclick="event.stopPropagation()"><i class="ph-bold ph-dots-three-vertical"></i></button>
        </div>
    </div>`;
}

// ── Helper: build a pending card HTML ───────────────────────────────────────
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

// ── Main stats + list renderer ───────────────────────────────────────────────
function updateTrainerStats(filterText) {
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    const activeStudents = students.filter(s => s.active && !s.pending);
    const pendingStudents = students.filter(s => s.pending);
    const pendingCount = pendingStudents.length;

    // ── Stats cards ──
    const elTotal = document.getElementById('stat-total');
    if (elTotal) elTotal.innerText = activeStudents.length;
    const elAtivos = document.getElementById('stat-ativos');
    if (elAtivos) elAtivos.innerText = activeStudents.length;
    const elPendentes = document.getElementById('stat-pendentes');
    if (elPendentes) elPendentes.innerText = pendingCount;

    // ── Pending nav badge ──
    const navBadge = document.getElementById('pending-nav-badge');
    if (navBadge) {
        navBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
        navBadge.textContent = pendingCount;
    }

    // ── Pending banner (dashboard view) ──
    const banner = document.getElementById('pending-banner');
    if (banner) {
        banner.style.display = pendingCount > 0 ? 'flex' : 'none';
        const bannerTitle = document.getElementById('pending-banner-title');
        if (bannerTitle) bannerTitle.textContent = `${pendingCount} nova${pendingCount > 1 ? 's' : ''} solicitaç${pendingCount > 1 ? 'ões' : 'ão'}`;
    }

    // ── Dashboard recent list (view-dashboard) ──
    const recentList = document.getElementById('trainer-student-list');
    if (recentList) {
        const query = (filterText || '').toLowerCase();
        const toShow = activeStudents
            .filter(s => !query || s.id.includes(query) || s.goal.toLowerCase().includes(query))
            .slice(0, 5);
        recentList.innerHTML = toShow.length === 0
            ? `<p style="text-align:center;color:var(--text-muted);padding:3rem 0;">Nenhum aluno ativo ainda.</p>`
            : toShow.map((s) => buildStudentRow(s, students.indexOf(s))).join('');
        const paginInfo = document.getElementById('pagination-info');
        if (paginInfo) paginInfo.textContent = `Exibindo ${toShow.length} de ${activeStudents.length} alunos`;
    }

    // ── Pending requests list (view-alunos) ──
    const pendingList = document.getElementById('pending-student-list');
    if (pendingList) {
        const badge = document.getElementById('pending-count-badge');
        if (badge) badge.textContent = pendingCount;
        pendingList.innerHTML = pendingCount === 0
            ? `<p class="empty-pending-msg"><i class="ph-fill ph-check-circle" style="color:var(--text-success,#22c55e)"></i> Nenhuma solicitação pendente.</p>`
            : pendingStudents.map((s) => buildPendingCard(s, students.indexOf(s))).join('');
    }

    // ── Active list (view-alunos) ──
    const activeList = document.getElementById('alunos-active-list');
    if (activeList) {
        const query = (filterText || '').toLowerCase();
        const toShow = activeStudents.filter(s => !query || s.id.includes(query) || s.goal.toLowerCase().includes(query));
        activeList.innerHTML = toShow.length === 0
            ? `<p style="text-align:center;color:var(--text-muted);padding:3rem 0;">Nenhum aluno ativo ainda.</p>`
            : toShow.map((s) => buildStudentRow(s, students.indexOf(s))).join('');
        const paginInfo = document.getElementById('alunos-pagination-info');
        if (paginInfo) paginInfo.textContent = `Exibindo ${toShow.length} de ${activeStudents.length} alunos`;
    }

}

// ── Accept a pending student ─────────────────────────────────────────────────
function acceptStudent(idx) {
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    if (!students[idx]) return;
    students[idx].pending = false;
    students[idx].active = true;
    students[idx].acceptedAt = new Date().toISOString();
    localStorage.setItem('trainerStudents', JSON.stringify(students));

    // Animate out
    const card = document.getElementById(`pending-card-${idx}`);
    if (card) {
        card.classList.add('card-exit');
        setTimeout(() => updateTrainerStats(), 350);
    } else {
        updateTrainerStats();
    }
}

// ── Reject / remove a pending student ───────────────────────────────────────
function rejectStudent(idx) {
    if (!confirm('Tem certeza que deseja recusar esta solicitação?')) return;
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    students.splice(idx, 1);
    localStorage.setItem('trainerStudents', JSON.stringify(students));
    updateTrainerStats();
}

// ── Filter helper ────────────────────────────────────────────────────────────
function filterStudents(query) {
    updateTrainerStats(query);
}

function markNotifRead(index, btnElement) {
    let notifs = JSON.parse(localStorage.getItem('trainerNotifications') || '[]');
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

// ─── Profile open / close / tab switch ──────────────────────────────────────
let currentStudentIdx = null; // tracks which student is being edited
let workoutBlocks = [];        // local state for workout blocks
let mealBlocks = [];           // local state for meal blocks
let pendingBlockIdx = null;    // which block an exercise is being added to
let pendingMealIdx = null;    // which meal an item is being added to

function openStudentProfile(studentIndex) {
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
    if (s.goal.toLowerCase().includes('perder') || s.goal.toLowerCase().includes('emagrec')) { gIcon = 'ph-fire'; gColor = '#ef4444'; }
    document.getElementById('prof-goal').innerHTML = `<i class="ph-fill ${gIcon}" style="color:${gColor}"></i> ${s.goal}`;

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

// ─── Workout Blocks ──────────────────────────────────────────────────────────

function renderWorkoutBlocks() {
    const container = document.getElementById('workout-blocks-container');
    if (!container) return;

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

// ─── Exercise Modal ───────────────────────────────────────────────────────────

function openExModal(blockIdx) {
    pendingBlockIdx = blockIdx;
    ['ex-nome', 'ex-obs', 'ex-series', 'ex-reps', 'ex-carga', 'ex-descanso'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });

    // Clear library results
    const results = document.getElementById('ex-library-results');
    if (results) results.innerHTML = '';

    document.getElementById('ex-modal-overlay').classList.add('active');
    document.getElementById('ex-modal').classList.add('active');
    document.getElementById('ex-nome').focus();
}

function searchExerciseLibrary(query) {
    const results = document.getElementById('ex-library-results');
    if (!results) return;

    if (!query || query.length < 2) {
        results.innerHTML = '';
        results.classList.remove('active');
        return;
    }

    const q = query.toLowerCase();
    let html = '';

    for (const category in EXERCISE_LIBRARY) {
        const matches = EXERCISE_LIBRARY[category].filter(ex => ex.toLowerCase().includes(q));
        if (matches.length > 0) {
            html += `<div class="lib-category">${category}</div>`;
            matches.forEach(ex => {
                html += `<div class="lib-item" onclick="selectExerciseFromLibrary('${ex.replace(/'/g, "\\'")}')">
                    <i class="ph-bold ph-plus-circle"></i> ${ex}
                </div>`;
            });
        }
    }

    results.innerHTML = html;
    if (html) results.classList.add('active');
    else results.classList.remove('active');
}

function selectExerciseFromLibrary(name) {
    const input = document.getElementById('ex-nome');
    if (input) input.value = name;

    const results = document.getElementById('ex-library-results');
    if (results) {
        results.innerHTML = '';
        results.classList.remove('active');
    }
}

function closeExModal() {
    document.getElementById('ex-modal-overlay').classList.remove('active');
    document.getElementById('ex-modal').classList.remove('active');
    pendingBlockIdx = null;
}

function confirmAddExercise() {
    const nome = document.getElementById('ex-nome').value.trim();
    if (!nome) { document.getElementById('ex-nome').focus(); return; }
    const ex = {
        nome,
        obs: document.getElementById('ex-obs').value.trim(),
        series: document.getElementById('ex-series').value || '4',
        reps: document.getElementById('ex-reps').value || '10-12',
        carga: document.getElementById('ex-carga').value || '--',
        descanso: document.getElementById('ex-descanso').value || '60s',
    };
    if (pendingBlockIdx !== null) {
        workoutBlocks[pendingBlockIdx].exercises.push(ex);
    }
    closeExModal();
    renderWorkoutBlocks();
}

// ─── Diet / Meals ─────────────────────────────────────────────────────────────

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

// ─── Save plan ────────────────────────────────────────────────────────────────

function saveStudentPlan() {
    if (currentStudentIdx === null) return;
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    students.splice(currentStudentIdx, 1);
    localStorage.setItem('trainerStudents', JSON.stringify(students));

    closeRemoveModal();
    closeStudentProfile();
    updateTrainerStats();
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── HEVY STYLE WORKOUT LOG LOGIC ───────────────────────────────────────
let workoutState = null;
let workoutTimerInterval = null;
let restTimerInterval = null;
let restTimeLeft = 0;
let totalRestTime = 0;

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
    const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
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

function startWorkoutSession(blockIdx = 0) {
    const studentId = localStorage.getItem('currentStudentId');
    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    const student = students.find(s => s.id === studentId);

    if (!student || !student.workoutBlocks || !student.workoutBlocks[blockIdx]) {
        alert('Plano de treino não encontrado.');
        return;
    }

    const block = student.workoutBlocks[blockIdx];
    const personalRecords = student.personalRecords || {};

    workoutState = {
        startTime: Date.now(),
        title: block.title || 'Meu Treino',
        exercises: block.exercises.map((ex, idx) => ({
            id: `ex-${idx}`,
            nome: ex.nome,
            notes: '',
            best: personalRecords[ex.nome] || { maxWeight: 0, maxVolume: 0, maxReps: 0 },
            sets: Array.from({ length: parseInt(ex.series) || 3 }, (_, sIdx) => ({
                id: `set-${idx}-${sIdx}`,
                weight: ex.carga || '',
                reps: ex.reps || '',
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

    // Update Title
    const titleEl = document.getElementById('log-workout-title');
    if (titleEl) titleEl.innerText = workoutState.title;

    container.innerHTML = workoutState.exercises.map((ex, exIdx) => `
        <div class="log-exercise-card">
            <div class="log-ex-header" style="justify-content: space-between; align-items: flex-start; gap: 1rem;">
                <div style="flex: 1;">
                    <h3 style="margin-bottom: 4px;">${escHtml(ex.nome)}</h3>
                    <input type="text" class="exercise-notes-input" 
                        placeholder="Adicionar nota..." 
                        value="${escHtml(ex.notes || '')}"
                        oninput="updateExerciseNotes(${exIdx}, this.value)"
                        style="width: 100%; max-width: 400px; font-size: 0.8rem; color: var(--text-muted); background: transparent; border: none; padding: 0; outline: none;">
                </div>
                <button class="btn-icon-tiny" onclick="removeExerciseFromLog(${exIdx})"><i class="ph-bold ph-trash"></i></button>
            </div>
            
            <div class="log-set-table">
                <div class="log-set-header">
                    <span>Set</span>
                    <span class="col-prev">Anterior</span>
                    <span>Peso</span>
                    <span>Reps</span>
                    <span><i class="ph-bold ph-check"></i></span>
                </div>
                ${ex.sets.map((set, setIdx) => `
                    <div class="log-set-row ${set.completed ? 'completed' : ''}" id="row-${exIdx}-${setIdx}">
                        <div class="set-number">${setIdx + 1}</div>
                        <div class="set-prev col-prev">${escHtml(set.prev)}</div>
                        <div style="position: relative; display: flex; align-items: center;">
                            <input type="number" class="set-input log-input-tactile" value="${set.weight}" 
                                placeholder="--" oninput="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)"
                                ${set.completed ? 'disabled' : ''}>
                        </div>
                        <div style="position: relative; display: flex; align-items: center;">
                            <input type="number" class="set-input log-input-tactile" value="${set.reps}" 
                                placeholder="--" oninput="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)"
                                ${set.completed ? 'disabled' : ''}>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
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
    `).join('');
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
        workoutState.exercises[exIdx].sets[setIdx][field] = value;
        updateExercisePRs(exIdx);
        saveWorkoutBackup();
    }
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
    const set = workoutState.exercises[exIdx].sets[setIdx];
    set.completed = !set.completed;

    if (set.completed) {
        startRestTimer(60); // Default 60s
    } else {
        hideRestTimer();
    }

    saveWorkoutBackup();
    renderWorkoutLog();
}
// ─── REST TIMER LOGIC ──────────────────────────────────────────────────
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
    }
}

function onRestTimerEnd() {
    const overlay = document.getElementById('rest-timer-overlay');
    if (overlay) {
        overlay.classList.add('timer-ended');
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

function handleFinishWorkout() {
    if (!workoutState) return;

    const completedSets = workoutState.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);

    if (completedSets === 0) {
        if (!confirm('Nenhuma série foi marcada como concluída. Deseja realmente finalizar?')) return;
    }

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
                    brokenPRs: s.brokenPRs // Keep this for summary visualization
                }))
        })).filter(ex => ex.sets.length > 0)
    };

    // SAVE TO HISTORY
    const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
    history.push(workoutArchive);
    localStorage.setItem('workoutHistory', JSON.stringify(history));

    // UPDATE PERSONAL RECORDS PERMANENTLY
    const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
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
