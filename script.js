function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById('app').classList.remove('wide');
}

function goToHome() {
    hideAllScreens();
    document.getElementById('home-screen').classList.add('active');
}

function goToStudentArea() {
    hideAllScreens();
    document.getElementById('student-screen').classList.add('active');
}

let pendingTrainerCode = '';

function connectStudent() {
    const code = document.getElementById('trainer-code').value;
    if (code.trim() === '') {
        alert('Por favor, insira o código do treinador.');
        return;
    }

    // Store code and show confirmation screen
    pendingTrainerCode = code;
    // Simulate finding the trainer name
    const coachName = `Coach ${code.substring(code.length - 4) || '1234'}`;
    const consultoriaName = `Team ${code.substring(code.length - 4) || '1234'}`;

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
    const age = document.getElementById('q_idade')?.value || '25';
    const gender = document.getElementById('q_genero')?.value || 'M';
    const weight = document.getElementById('q_peso')?.value || '70';
    const height = document.getElementById('q_altura')?.value || '175';
    const goal = document.getElementById('q_objetivo')?.value || 'Hipertrofia';

    const newStudent = {
        id: Math.floor(1000 + Math.random() * 9000).toString(),
        name: 'Aluno Novo',
        age: age,
        gender: gender,
        weight: weight,
        height: height,
        goal: goal,
        active: true,
        joinedAt: new Date().toISOString()
    };

    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    students.push(newStudent);
    localStorage.setItem('trainerStudents', JSON.stringify(students));

    // Save active counter (fallback)
    localStorage.setItem('activeStudents', students.filter(s => s.active).length);

    let notifs = JSON.parse(localStorage.getItem('trainerNotifications') || '[]');
    notifs.unshift({
        type: 'questionnaire',
        title: 'Questionário Respondido!',
        desc: `Um novo aluno acabou de enviar o questionário inicial.`,
        time: 'Agora mesmo',
        unread: true
    });
    localStorage.setItem('trainerNotifications', JSON.stringify(notifs));

    document.getElementById('dash-student-trainer').innerText = pendingTrainerCode;
    hideAllScreens();
    document.getElementById('app').classList.add('wide');
    document.getElementById('student-dashboard-screen').classList.add('active');

    // Default is pending
    setProtocolStatus(false);
}

// Function to simulate the trainer releasing the protocol
function setProtocolStatus(isReady) {
    const elWaiting = document.getElementById('student-actions-waiting');
    const elReady = document.getElementById('student-actions-ready');
    const statusTreino = document.getElementById('status-treino');
    const statusDieta = document.getElementById('status-dieta');

    if (isReady) {
        elWaiting.classList.remove('active');
        elReady.style.display = 'block';

        statusTreino.innerText = 'Ativo';
        statusTreino.className = 'text-success';

        statusDieta.innerText = 'Ativo';
        statusDieta.className = 'text-success';
    } else {
        elReady.style.display = 'none';
        elWaiting.classList.add('active');

        statusTreino.innerText = 'Pendente';
        statusTreino.className = 'text-warning';

        statusDieta.innerText = 'Pendente';
        statusDieta.className = 'text-warning';
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
    const code = document.getElementById('trainer-login-code').value;
    if (code.trim() === '') {
        alert('Por favor, insira o código do treinador.');
        return;
    }
    // Simulate login and go to dashboard
    hideAllScreens();
    document.getElementById('app').classList.add('wide');
    document.getElementById('trainer-dashboard-screen').classList.add('active');
}

function createConsultoria() {
    const name = document.getElementById('trainer-name').value;
    const services = document.querySelector('input[name="services"]:checked');

    if (!name.trim() || !services) {
        alert('Preencha todos os dados corretamente.');
        return;
    }

    // Set dashboard info
    const firstName = name.split(' ')[0];
    localStorage.setItem('trainerName', firstName);
    document.getElementById('dash-trainer-name').innerText = `Olá, ${firstName}`;
    document.getElementById('dash-trainer-code').innerText = `TR-${Math.floor(10000 + Math.random() * 90000)}`;

    // Go to dashboard
    hideAllScreens();
    document.getElementById('trainer-dashboard-screen').classList.add('active');
}

// TRAINER DASHBOARD LOGIC (Runs on trainer.html)
function initTrainerDashboard() {
    // Update stats right away if we are on trainer HTML
    const trainerName = localStorage.getItem('trainerName') || 'Treinador';
    const elDashName = document.getElementById('dash-trainer-name');
    if (elDashName) elDashName.innerText = `Olá, ${trainerName}`;

    updateTrainerStats();
}

function updateTrainerStats() {
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    const activeCount = students.filter(s => s.active).length;
    const inactiveCount = students.length - activeCount;

    // Update Top Stats
    const elTotal = document.getElementById('stat-total');
    if (elTotal) elTotal.innerText = students.length;

    const elAtivos = document.getElementById('stat-ativos');
    if (elAtivos) elAtivos.innerText = activeCount;

    const elInativos = document.getElementById('stat-inativos');
    if (elInativos) elInativos.innerText = inactiveCount;

    // Update Student List
    const listContainer = document.getElementById('trainer-student-list');
    if (listContainer) {
        if (students.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 3rem 0;">Nenhum aluno cadastrado.</p>`;
        } else {
            listContainer.innerHTML = students.map((s, idx) => {
                // Determine icon based on goal
                let gIcon = 'ph-barbell'; let gColor = 'text-warning';
                if (s.goal.toLowerCase().includes('perder') || s.goal.toLowerCase().includes('emagrec')) { gIcon = 'ph-fire'; gColor = 'text-danger'; }

                // Estimate kcal based on male/female rough TMB calculation
                const w = parseFloat(s.weight) || 70; const h = parseFloat(s.height) || 175; const a = parseInt(s.age) || 25;
                let tmb = 10 * w + 6.25 * h - 5 * a;
                tmb += (s.gender === 'M') ? 5 : -161;
                const kcal = Math.round(tmb * 1.55); // Moderate activity

                // Calculate time since joined
                const joinedAt = new Date(s.joinedAt || new Date());
                const diffDays = Math.floor((new Date() - joinedAt) / (1000 * 60 * 60 * 24));
                let timeDesc = 'Entrou recentemente';
                if (diffDays > 30) timeDesc = `Entrou há ${Math.floor(diffDays / 30)} meses`;
                else if (diffDays > 0) timeDesc = `Entrou há ${diffDays} dias`;

                return `
                <div class="student-list-item grid-layout" onclick="openStudentProfile(${idx})">
                    <div class="sli-col">
                        <span class="badge ${s.active ? 'active' : 'inactive'}">
                            ${s.active ? '<div class="dot"></div> Ativo' : 'Inativo'}
                        </span>
                    </div>
                    <div class="sli-col ident">
                        <div class="sli-avatar"><i class="ph-fill ph-user"></i></div>
                        <div class="sli-info">
                            <h4>Student ${s.id}</h4>
                            <span class="sli-sub">${timeDesc}</span>
                        </div>
                    </div>
                    <div class="sli-col font-bold">${s.goal}</div>
                    <div class="sli-col font-medium">${s.weight} kg</div>
                    <div class="sli-col text-primary">${kcal} kcal/dia</div>
                    <div class="sli-col actions">
                        <button class="btn-icon-minimal">
                            <i class="ph-bold ph-dots-three-vertical"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    const notifList = document.getElementById('trainer-notifications-list');
    if (notifList) {
        let notifs = JSON.parse(localStorage.getItem('trainerNotifications') || '[]');
        if (notifs.length === 0) {
            notifList.innerHTML = `<p style="text-align:center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem 0;">Sem notificações no momento.</p>`;
            document.getElementById('notif-badge-count').style.display = 'none';
        } else {
            notifList.innerHTML = notifs.map((n, i) => `
                <div class="notification-item ${n.unread ? 'unread' : ''}">
                    <div class="notif-icon trainer-alert">
                        <i class="ph-bold ph-file-text"></i>
                    </div>
                    <div class="notif-content">
                        <p class="notif-title">${n.title}</p>
                        <p class="notif-desc">${n.desc}</p>
                        <span class="notif-time">${n.time}</span>
                    </div>
                    ${n.unread ? `<div class="notif-action"><button class="btn-small" onclick="markNotifRead(${i}, this)">Ver</button></div>` : ''}
                </div>
            `).join('');

            const badge = document.getElementById('notif-badge-count');
            if (badge) {
                const unreadCount = notifs.filter(n => n.unread).length;
                badge.innerText = unreadCount;
                badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }
        }
    }
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

function openStudentProfile(studentIndex) {
    let students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
    const s = students[studentIndex];
    if (!s) return;

    // Calculate TMB & Kcal Data
    const w = parseFloat(s.weight) || 70; const h = parseFloat(s.height) || 175; const a = parseInt(s.age) || 25;
    let tmbCalc = 10 * w + 6.25 * h - 5 * a;
    tmbCalc += (s.gender === 'M') ? 5 : -161;
    const kcalCalc = Math.round(tmbCalc * 1.55);

    // Populate header
    document.getElementById('prof-id-name').innerHTML = `${s.id} <span class="badge ${s.active ? '' : 'inactive'}" id="prof-status">${s.active ? 'Ativo' : 'Inativo'}</span>`;

    let gIcon = 'ph-barbell'; let gColor = 'text-warning';
    if (s.goal.toLowerCase().includes('perder') || s.goal.toLowerCase().includes('emagrec')) { gIcon = 'ph-fire'; gColor = '#ef4444'; }
    document.getElementById('prof-goal').innerHTML = `<i class="ph-fill ${gIcon}" style="color: ${gColor}"></i> ${s.goal}`;

    // Populate Info Grid
    document.getElementById('prof-idade').innerText = `${s.age} anos`;
    document.getElementById('prof-peso').innerText = `${s.weight} kg`;
    document.getElementById('prof-altura').innerText = `${s.height} cm`;
    document.getElementById('prof-genero').innerText = s.gender === 'M' ? 'Masculino' : (s.gender === 'F' ? 'Feminino' : 'Não Informado');
    document.getElementById('prof-tmb').innerText = `${Math.round(tmbCalc)} kcal`;
    document.getElementById('prof-gasto').innerText = `${kcalCalc} kcal`;
    document.getElementById('prof-atividade').innerText = `Moderatamente Ativo`;

    // Nutri goal fallback
    const nutriMeta = document.getElementById('nutri-meta');
    if (nutriMeta) nutriMeta.innerText = `Meta diária: ${kcalCalc} kcal`;

    // Switch screens
    document.getElementById('trainer-dashboard-screen').classList.remove('active');
    document.getElementById('trainer-student-profile-screen').classList.add('active');

    // Default to 'perfil' tab
    switchProfileTab('perfil');
}

function closeStudentProfile() {
    document.getElementById('trainer-student-profile-screen').classList.remove('active');
    document.getElementById('trainer-dashboard-screen').classList.add('active');
}

function switchProfileTab(tabName) {
    const tabs = document.querySelectorAll('.p-tab-content');
    tabs.forEach(t => t.classList.remove('active'));

    const btns = document.querySelectorAll('.p-nav-tab');
    btns.forEach(b => b.classList.remove('active'));

    document.getElementById(`p-tab-${tabName}`).classList.add('active');
    document.getElementById(`p-nav-${tabName}`).classList.add('active');
}
