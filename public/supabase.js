// supabase.js

// Projeto Supabase (publico)
const supabaseUrl = 'https://kvesydpaggznsvownbgu.supabase.co';
const supabasePublishableKey = 'sb_publishable_svprWwGQO3L5DRka80VP5w_7wc2lQc2';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZXN5ZHBhZ2d6bnN2b3duYmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTMwNjAsImV4cCI6MjA5MDQ4OTA2MH0.uuzcWMBn_QzetdN7PsHRduoWU-t4KMyy6qlT_oHEMYg';

const supabaseMemoryStorage = (() => {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key)
    };
})();

// Supabase.createClient e injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: supabaseMemoryStorage
    }
});

// Torna o cliente acessivel em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('Supabase inicializado com sucesso!', window.supabase);
