// supabase.js

// URL e chave Anon do Supabase via config externa (public/app-config.js)
const appConfig = window.__APP_CONFIG__ || {};
const supabaseUrl = String(appConfig.supabaseUrl || '').trim();
const supabaseKey = String(appConfig.supabaseAnonKey || '').trim();

const supabaseStatus = {
    ready: false,
    reason: 'unknown',
    message: '',
    details: {
        hasConfigObject: !!window.__APP_CONFIG__,
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseKey
    }
};

function setSupabaseStatus(reason, message) {
    supabaseStatus.ready = reason === 'ok';
    supabaseStatus.reason = reason;
    supabaseStatus.message = message;
    window.__SUPABASE_STATUS__ = supabaseStatus;
}

function isLikelyValidSupabaseUrl(value) {
    if (!value) return false;
    try {
        const parsed = new URL(value);
        return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && !!parsed.hostname;
    } catch (err) {
        return false;
    }
}

// Supabase.createClient e injetado globalmente pela CDN
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

const supabaseFactory = window.supabase;
let supabaseClient = null;

if (!window.__APP_CONFIG__) {
    const message = 'Supabase indisponivel: arquivo de configuracao ausente (public/app-config.js).';
    console.warn(message);
    setSupabaseStatus('missing_config', message);
} else if (!supabaseUrl) {
    const message = 'Supabase indisponivel: supabaseUrl nao foi configurada em window.__APP_CONFIG__.';
    console.warn(message);
    setSupabaseStatus('missing_url', message);
} else if (!isLikelyValidSupabaseUrl(supabaseUrl)) {
    const message = 'Supabase indisponivel: supabaseUrl invalida. Use uma URL completa (https://...).';
    console.warn(message);
    setSupabaseStatus('invalid_url', message);
} else if (!supabaseKey) {
    const message = 'Supabase indisponivel: supabaseAnonKey nao foi configurada em window.__APP_CONFIG__.';
    console.warn(message);
    setSupabaseStatus('missing_anon_key', message);
} else if (!supabaseFactory || typeof supabaseFactory.createClient !== 'function') {
    const message = 'Supabase indisponivel: SDK do Supabase nao foi carregado antes da inicializacao.';
    console.warn(message);
    setSupabaseStatus('sdk_missing', message);
} else if (supabaseFactory && typeof supabaseFactory.createClient === 'function') {
    try {
        supabaseClient = supabaseFactory.createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: supabaseStorage
            }
        });
    } catch (error) {
        const message = `Supabase indisponivel: falha ao criar cliente (${error?.message || 'erro desconhecido'}).`;
        console.warn(message);
        setSupabaseStatus('init_failed', message);
    }
} else if (window.supabase && typeof window.supabase.from === 'function') {
    // Ja existe uma instancia ativa (carregamento duplicado).
    supabaseClient = window.supabase;
}

window.supabase = supabaseClient;

if (!supabaseClient) {
    if (supabaseStatus.reason === 'unknown') {
        const message = 'Supabase indisponivel: cliente nao inicializado.';
        console.warn(message);
        setSupabaseStatus('client_not_initialized', message);
    }
} else {
    setSupabaseStatus('ok', 'Supabase inicializado com sucesso.');
    console.log('Supabase inicializado com sucesso!', window.supabase);
}
