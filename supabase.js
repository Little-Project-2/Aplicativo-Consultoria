// supabase.js

// Substitua com a URL real e a chave Anon do seu projeto no Supabase
const supabaseUrl = 'SUA_URL_DO_SUPABASE_AQUI';
const supabaseKey = 'SUA_CHAVE_ANON_DO_SUPABASE_AQUI';

// Supabase.createClient é injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Torna o cliente acessível em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('✅ Supabase inicializado com sucesso!', window.supabase);
