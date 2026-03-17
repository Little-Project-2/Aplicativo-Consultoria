// supabase.js

// Substitua com a URL real e a chave Anon (ou Publishable Key) do seu projeto no Supabase
const supabaseUrl = 'https://wkqqrxfnayaclznafywg.supabase.co';
const supabaseKey = 'sb_publishable_cd4PbJwhZcv54BLF7atg3g__m9NSoFM';

// Supabase.createClient é injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Torna o cliente acessível em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('✅ Supabase inicializado com sucesso!', window.supabase);
