// supabase.js
// Projeto Supabase via config externa (public/app-config.js)
const appConfig = window.__APP_CONFIG__ || {};
const supabaseUrl = String(appConfig.supabaseUrl || '').trim();
const supabaseAnonKey = String(appConfig.supabaseAnonKey || '').trim();

const supabaseStatus = {
    ready: false,
    reason: '',
    supabaseUrl: supabaseUrl || '',
    hasAnonKey: !!supabaseAnonKey
};

const supabaseStorage = (() => {
    const memoryStore = new Map();
    const safeMemory = {
        getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
        setItem: (key, value) => memoryStore.set(String(key), String(value)),
        removeItem: (key) => memoryStore.delete(String(key))
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

const supabaseFactory = window.supabase;
let supabaseClient = null;

if (!supabaseUrl && !supabaseAnonKey) {
    supabaseStatus.reason = 'missing_config';
    console.warn('Supabase indisponivel: configure window.__APP_CONFIG__.supabaseUrl e supabaseAnonKey.');
} else if (!supabaseUrl) {
    supabaseStatus.reason = 'missing_url';
    console.warn('Supabase indisponivel: configure window.__APP_CONFIG__.supabaseUrl.');
} else if (!supabaseAnonKey) {
    supabaseStatus.reason = 'missing_anon_key';
    console.warn('Supabase indisponivel: configure window.__APP_CONFIG__.supabaseAnonKey.');
} else {
    try {
        new URL(supabaseUrl);
    } catch (err) {
        supabaseStatus.reason = 'invalid_url';
        console.warn('Supabase indisponivel: supabaseUrl invalida.');
    }
}

if (!supabaseStatus.reason) {
    if (supabaseFactory && typeof supabaseFactory.createClient === 'function') {
        supabaseClient = supabaseFactory.createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: supabaseStorage
            }
        });
    } else if (window.supabase && typeof window.supabase.from === 'function') {
        // Ja existe uma instancia ativa (carregamento duplicado).
        supabaseClient = window.supabase;
    } else {
        supabaseStatus.reason = 'sdk_missing';
    }
}

window.supabase = supabaseClient;

if (!supabaseClient) {
    if (!supabaseStatus.reason) supabaseStatus.reason = 'client_init_failed';
    console.warn('Supabase indisponivel: cliente nao inicializado.');
} else {
    supabaseStatus.ready = true;
    supabaseStatus.reason = '';
    console.log('Supabase inicializado com sucesso!', window.supabase);
}

window.__SUPABASE_STATUS__ = supabaseStatus;
