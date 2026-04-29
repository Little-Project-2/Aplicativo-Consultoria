# fatsecret-foods (Supabase Edge Function)

Proxy seguro para o FatSecret (OAuth2 + busca/detalhes), com resposta já normalizada para o frontend.

## Endpoints

- `POST /fatsecret-foods/search`
- `POST /fatsecret-foods/get`

Também aceita `POST /fatsecret-foods` com body `{ "action": "search" | "get", ... }`.

## Variáveis de ambiente

- `FATSECRET_CLIENT_ID` (obrigatória)
- `FATSECRET_CLIENT_SECRET` (obrigatória)
- `FATSECRET_SCOPE` (opcional, default: `premier`)
- `FATSECRET_TOKEN_URL` (opcional, default oficial OAuth2)
- `FATSECRET_API_URL` (opcional, default oficial API)

## Exemplos

Busca:

```json
{
  "action": "search",
  "query": "frango grelhado",
  "limit": 12
}
```

Detalhe:

```json
{
  "action": "get",
  "foodId": "33691"
}
```
