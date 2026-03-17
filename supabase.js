// supabase.js

// Substitua com a URL real e a chave Anon do seu projeto no Supabase
const supabaseUrl = 'https://wkqqrxfnayaclznafywg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcXFyeGZuYXlhY2x6bmFmeXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjYwODksImV4cCI6MjA4OTI0MjA4OX0.8s54bKxEAHVuHCyEXvJfZy-ezaBkEtqw0_L5MJWZ-Eo';

// Supabase.createClient é injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Torna o cliente acessível em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('✅ Supabase inicializado com sucesso!', window.supabase);
