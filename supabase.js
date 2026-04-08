// supabase.js

// Projeto Supabase (publico)
const supabaseUrl = 'https://kvesydpaggznsvownbgu.supabase.co';
const supabasePublishableKey = 'sb_publishable_svprWwGQO3L5DRka80VP5w_7wc2lQc2';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZXN5ZHBhZ2d6bnN2b3duYmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTMwNjAsImV4cCI6MjA5MDQ4OTA2MH0.uuzcWMBn_QzetdN7PsHRduoWU-t4KMyy6qlT_oHEMYg';

const supabaseStorage = (() => {
    const memoryStore = new Map();
    const safeMemory = {
        getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
        setItem: (key, value) => memoryStore.set(String(key), String(value)),
        removeItem: (key) => memoryStore.delete(key)
    };

    const hasLocalStorage = (() => {
        try {
            const testKey = '__consultoria_supabase__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (err) {
            return false;
        }
    })();

    let activeBackend = hasLocalStorage ? window.localStorage : safeMemory;

    return {
        getItem: (key) => activeBackend.getItem(String(key)),
        setItem: (key, value) => {
            try {
                activeBackend.setItem(String(key), String(value));
            } catch (err) {
                if (activeBackend !== safeMemory) {
                    activeBackend = safeMemory;
                    activeBackend.setItem(String(key), String(value));
                }
            }
        },
        removeItem: (key) => activeBackend.removeItem(String(key))
    };
})();

// Supabase.createClient e injetado globalmente pela CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: supabaseStorage
    }
});

// Torna o cliente acessivel em qualquer outro arquivo (ex: script.js)
window.supabase = supabaseClient;

console.log('Supabase inicializado com sucesso!', window.supabase);
