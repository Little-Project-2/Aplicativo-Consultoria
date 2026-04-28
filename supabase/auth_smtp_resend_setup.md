# Auth SMTP + Rate Limits (Resend) para lançamento

Use este checklist no Supabase Dashboard para remover `email rate limit exceeded` sem abrir mão da verificação de e-mail.

## 1) SMTP custom obrigatório
1. Dashboard Supabase -> `Authentication` -> `Configuration` -> `Custom SMTP`.
2. Ative SMTP e configure com Resend:
   - Host: `smtp.resend.com`
   - Porta: `587` (TLS STARTTLS)
   - Usuário: `resend`
   - Senha: `re_...` (API key SMTP da Resend)
   - Sender: e-mail do seu domínio verificado.
3. Mantenha `mailer_autoconfirm = false` (verificação de e-mail continua obrigatória).

## 2) Rate limits para lançamento
1. Dashboard Supabase -> `Authentication` -> `Rate Limits`.
2. Aumente principalmente:
   - `rate_limit_email_sent`
   - `rate_limit_verify`
   - `rate_limit_otp` (se usar OTP)
3. Salve e teste criação de múltiplas contas em sequência.

## 3) Verificações rápidas
1. Criar 3-5 contas seguidas.
2. Confirmar que o e-mail chega para contas fora do time interno.
3. Confirmar que login sem verificação continua bloqueado.

## 4) API (opcional)
Também pode configurar via Management API (token de conta Supabase):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/<PROJECT_REF>/config/auth" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "mailer_autoconfirm": false,
    "smtp_admin_email": "no-reply@seu-dominio.com",
    "smtp_host": "smtp.resend.com",
    "smtp_port": 587,
    "smtp_user": "resend",
    "smtp_pass": "re_xxx",
    "smtp_sender_name": "Aplicativo-Consultoria",
    "rate_limit_email_sent": 120,
    "rate_limit_verify": 300,
    "rate_limit_otp": 120
  }'
```

Referências oficiais:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits
