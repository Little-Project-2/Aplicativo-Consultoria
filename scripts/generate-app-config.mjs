import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'public', 'app-config.js');
const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
).trim();

const runningOnVercel = !!process.env.VERCEL;
const missing = [];
if (!supabaseUrl) missing.push('SUPABASE_URL');
if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');

if (missing.length > 0) {
    const errorMessage = `Nao foi possivel gerar public/app-config.js. Defina: ${missing.join(', ')}.`;
    if (runningOnVercel) {
        console.error(errorMessage);
        process.exit(1);
    }

    console.warn(`${errorMessage} Gerando placeholder local para facilitar configuracao manual.`);
}

const finalUrl = supabaseUrl || 'https://SEU-PROJETO.supabase.co';
const finalAnon = supabaseAnonKey || 'SUA_CHAVE_ANON_PUBLICA';

const fileContent = `window.__APP_CONFIG__ = {
    supabaseUrl: "${finalUrl}",
    supabaseAnonKey: "${finalAnon}"
};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log(`app-config gerado em: ${outputPath}`);
