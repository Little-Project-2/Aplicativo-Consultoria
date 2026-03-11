const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const replacement = `        <!-- SPA Containers -->
        <div data-page="pages/home.html"></div>
        <div data-page="pages/login.html"></div>
        <div data-page="pages/profile-create.html"></div>
        <div data-page="pages/student-login.html"></div>
        <div data-page="pages/student-confirm.html"></div>
        <div data-page="pages/student-questionnaire.html"></div>
        <div data-page="pages/student-dashboard.html"></div>
        <div data-page="pages/student-workout.html"></div>
        <div data-page="pages/student-diet.html"></div>`;

html = html.replace(/<!-- Trainer forms removed[\s\S]*?<div id="student-diet-screen" class="screen">[\s\S]*?<\/div>\s*<\/div>/, replacement);
fs.writeFileSync('index.html', html);
console.log('Replaced successfully');
