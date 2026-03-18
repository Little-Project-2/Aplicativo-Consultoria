// supabase.js

// Substitua com a URL real e a chave Anon do seu projeto no Supabase
const supabaseUrl = 'https://lqxvordilkcqgzmkmlsb.supabase.co';
const supabaseKey = 'sb_publishable_P0CEsu1NHQOUV16N3oTuHQ_8fNJ36qI';

// Supabase.createClient é injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Torna o cliente acessível em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('✅ Supabase inicializado com sucesso!', window.supabase);
