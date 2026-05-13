type SupabaseStatusReason =
  | 'ok'
  | 'missing_config'
  | 'missing_url'
  | 'invalid_url'
  | 'missing_anon_key'
  | 'init_failed'
  | 'sdk_missing';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getSupabaseUnavailableMessage(mode: 'login' | 'signup' = 'login') {
  const status = (
    window as Window & {
      __SUPABASE_STATUS__?: {
        ready: boolean;
        reason: SupabaseStatusReason;
        message: string;
      };
    }
  ).__SUPABASE_STATUS__;
  const actionLabel = mode === 'signup' ? 'Cadastro' : 'Login';
  const reason = String(status?.reason || '').toLowerCase();

  if (reason === 'missing_config') {
    return `${actionLabel} indisponivel. Crie o arquivo public/app-config.js com supabaseUrl e supabaseAnonKey.`;
  }

  if (reason === 'missing_url') {
    return `${actionLabel} indisponivel. Defina supabaseUrl no arquivo public/app-config.js.`;
  }

  if (reason === 'invalid_url') {
    return `${actionLabel} indisponivel. A supabaseUrl esta invalida no public/app-config.js.`;
  }

  if (reason === 'missing_anon_key') {
    return `${actionLabel} indisponivel. Defina supabaseAnonKey no arquivo public/app-config.js.`;
  }

  return status?.message || `${actionLabel} indisponivel. Configure o Supabase primeiro.`;
}

export function getAuthErrorMessage(error: unknown, context: 'login' | 'resend' | 'generic' = 'generic') {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : String(error || '');
  const message = rawMessage.trim();
  const lowered = message.toLowerCase();
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 0;

  if (
    status === 429 ||
    lowered.includes('rate limit') ||
    lowered.includes('too many requests') ||
    lowered.includes('email rate limit exceeded')
  ) {
    return context === 'resend'
      ? 'Limite de reenvio atingido agora. Tente novamente em alguns minutos.'
      : 'Muitas tentativas agora. Aguarde alguns minutos e tente novamente.';
  }

  if (context === 'login' && lowered.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  if (context === 'login' && lowered.includes('email not confirmed')) {
    return 'Seu e-mail ainda nao foi verificado. Use "Reenviar verificacao de e-mail".';
  }

  return message || 'Nao foi possivel concluir a operacao agora.';
}
