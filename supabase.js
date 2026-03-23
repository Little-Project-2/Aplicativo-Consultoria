// supabase.js

// URL e chave Anon do Supabase
const supabaseUrl = 'https://lqxvordilkcqgzmkmlsb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeHZvcmRpbGtjcWd6bWttbHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDQ1MDIsImV4cCI6MjA4OTQyMDUwMn0.Jy3Y1v62l3ElN9Jgv7Q6n--8nN8SSl1dsGkzp37Svos';

// Supabase.createClient e injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Torna o cliente acessivel em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('Supabase inicializado com sucesso!', window.supabase);
