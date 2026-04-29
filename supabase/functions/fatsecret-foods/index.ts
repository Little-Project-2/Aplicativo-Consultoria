const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FatSecretTokenCache = {
  token: string;
  expiresAt: number;
};

type NormalizedPortion = {
  id: string;
  label: string;
  amount: number;
  unit_key: string;
  base_qty_equivalent: number;
  is_default: boolean;
  sort_order: number;
  provider_serving_id: string;
};

type NormalizedFood = {
  id: string;
  name: string;
  brand: string;
  source: string;
  provider: "fatsecret";
  provider_food_id: string;
  verified_at: string;
  base_qty: number;
  base_unit: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  portions: NormalizedPortion[];
};

let tokenCache: FatSecretTokenCache | null = null;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parseNumber(value: unknown, fallback = 0) {
  const safe = Number.parseFloat(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(safe)) return fallback;
  return safe;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return [value as T];
  return [];
}

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function detectUnitKey(metricUnitRaw: string, descriptionRaw: string) {
  const metricUnit = normalizeText(metricUnitRaw);
  const description = normalizeText(descriptionRaw);
  const merged = `${metricUnit} ${description}`;

  if (/\b(ml|mililitro|mililiter)\b/.test(merged)) return "ml";
  if (/\b(l|litro|liter)\b/.test(merged)) return "l";
  if (/\b(gram|grams|grama|gramas|g)\b/.test(merged)) return "g";
  if (/\b(tbsp|tablespoon|colher de sopa)\b/.test(merged)) return "tbsp";
  if (/\b(tsp|teaspoon|colher de cha|colher de cha)\b/.test(merged)) return "tsp";
  if (/\b(cup|xicara)\b/.test(merged)) return "cup";
  if (/\b(slice|fatia)\b/.test(merged)) return "slice";
  if (/\b(glass|copo)\b/.test(merged)) return "glass";
  if (/\b(ladle|concha)\b/.test(merged)) return "ladle";
  if (/\b(piece|unit|unidade|serving|porcao)\b/.test(merged)) return "un";
  return "g";
}

function normalizeServingLabel(serving: Record<string, unknown>) {
  const servingDescription = String(serving.serving_description || "").trim();
  const measurementDescription = String(serving.measurement_description || "").trim();
  if (servingDescription) return servingDescription;
  if (measurementDescription) return measurementDescription;
  return "Porcao";
}

function getServingBaseEquivalent(serving: Record<string, unknown>, unitKey: string) {
  const metricAmount = Math.max(0, parseNumber(serving.metric_serving_amount, 0));
  const metricUnit = normalizeText(String(serving.metric_serving_unit || ""));
  if (metricAmount > 0) {
    if (metricUnit === "g" || metricUnit.includes("gram")) return metricAmount;
    if (metricUnit === "ml" || metricUnit.includes("milliliter")) return metricAmount;
    if (metricUnit === "l" || metricUnit.includes("liter")) return metricAmount * 1000;
  }

  if (unitKey === "ml") return Math.max(1, parseNumber(serving.number_of_units, 1));
  if (unitKey === "l") return Math.max(1, parseNumber(serving.number_of_units, 1)) * 1000;
  return Math.max(1, parseNumber(serving.number_of_units, 1));
}

function buildPortions(servings: Record<string, unknown>[]) {
  if (!servings.length) {
    return [{
      id: "",
      label: "grama (g)",
      amount: 1,
      unit_key: "g",
      base_qty_equivalent: 1,
      is_default: true,
      sort_order: 0,
      provider_serving_id: "",
    }];
  }

  const portions = servings.map((serving, index) => {
    const label = normalizeServingLabel(serving);
    const numberOfUnits = clampValue(parseNumber(serving.number_of_units, 1), 0.1, 10000);
    const unitKey = detectUnitKey(
      String(serving.metric_serving_unit || ""),
      `${label} ${String(serving.measurement_description || "")}`,
    );
    const baseEquivalent = clampValue(getServingBaseEquivalent(serving, unitKey), 0.1, 100000);
    const servingId = String(serving.serving_id || "").trim();
    return {
      id: `fatsecret-serving:${servingId || index}`,
      label,
      amount: numberOfUnits,
      unit_key: unitKey,
      base_qty_equivalent: baseEquivalent,
      is_default: index === 0,
      sort_order: index * 10,
      provider_serving_id: servingId,
    };
  });

  const hasGram = portions.some((portion) => portion.unit_key === "g" && portion.amount === 1);
  const hasMl = portions.some((portion) => portion.unit_key === "ml" && portion.amount === 1);
  if (!hasGram) {
    portions.unshift({
      id: "fatsecret-serving:gram",
      label: "grama (g)",
      amount: 1,
      unit_key: "g",
      base_qty_equivalent: 1,
      is_default: false,
      sort_order: -10,
      provider_serving_id: "",
    });
  }
  if (!hasMl) {
    portions.push({
      id: "fatsecret-serving:ml",
      label: "mililitro (ml)",
      amount: 1,
      unit_key: "ml",
      base_qty_equivalent: 1,
      is_default: false,
      sort_order: 999,
      provider_serving_id: "",
    });
  }

  return portions;
}

function pickBaseServing(servings: Record<string, unknown>[]) {
  if (!servings.length) {
    return {
      baseQty: 100,
      baseUnit: "g",
      kcal: 0,
      protein: 0,
      carb: 0,
      fat: 0,
    };
  }

  const gramServing = servings.find((serving) =>
    normalizeText(String(serving.metric_serving_unit || "")).includes("g")
  );
  const serving = gramServing || servings[0];
  const metricAmount = Math.max(0.1, parseNumber(serving.metric_serving_amount, 100));
  const metricUnit = normalizeText(String(serving.metric_serving_unit || ""));
  const baseUnit = metricUnit.includes("ml")
    ? "ml"
    : metricUnit.includes("l")
      ? "l"
      : "g";
  return {
    baseQty: metricAmount,
    baseUnit,
    kcal: Math.max(0, parseNumber(serving.calories, 0)),
    protein: Math.max(0, parseNumber(serving.protein, 0)),
    carb: Math.max(0, parseNumber(serving.carbohydrate, 0)),
    fat: Math.max(0, parseNumber(serving.fat, 0)),
  };
}

function normalizeFoodPayload(foodRaw: Record<string, unknown>) {
  const foodId = String(foodRaw.food_id || "").trim();
  const name = String(foodRaw.food_name || "").trim();
  if (!foodId || !name) return null;
  const servingsRoot = foodRaw.servings as Record<string, unknown> | undefined;
  const servings = toArray<Record<string, unknown>>(servingsRoot?.serving);
  const baseServing = pickBaseServing(servings);
  const portions = buildPortions(servings);

  return {
    id: `fatsecret:${foodId}`,
    name,
    brand: String(foodRaw.brand_name || "").trim(),
    source: `fatsecret:${foodId}`,
    provider: "fatsecret",
    provider_food_id: foodId,
    verified_at: new Date().toISOString(),
    base_qty: baseServing.baseQty,
    base_unit: baseServing.baseUnit,
    kcal: Math.round(baseServing.kcal),
    protein: Math.round(baseServing.protein * 10) / 10,
    carb: Math.round(baseServing.carb * 10) / 10,
    fat: Math.round(baseServing.fat * 10) / 10,
    portions,
  } satisfies NormalizedFood;
}

async function getAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && tokenCache && now < tokenCache.expiresAt - 45_000) {
    return tokenCache.token;
  }

  const clientId = String(Deno.env.get("FATSECRET_CLIENT_ID") || "").trim();
  const clientSecret = String(Deno.env.get("FATSECRET_CLIENT_SECRET") || "").trim();
  const scope = String(Deno.env.get("FATSECRET_SCOPE") || "premier").trim() || "premier";

  if (!clientId || !clientSecret) {
    throw new Error("FATSECRET_CLIENT_ID/FATSECRET_CLIENT_SECRET nao configurados.");
  }

  const tokenUrl = String(Deno.env.get("FATSECRET_TOKEN_URL") || "https://oauth.fatsecret.com/connect/token");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope,
  });
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha no OAuth FatSecret (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const accessToken = String(payload?.access_token || "").trim();
  const expiresIn = clampValue(parseInt(String(payload?.expires_in || "0"), 10) || 0, 60, 86400);
  if (!accessToken) {
    throw new Error("OAuth FatSecret retornou token vazio.");
  }
  tokenCache = {
    token: accessToken,
    expiresAt: now + expiresIn * 1000,
  };
  return accessToken;
}

async function requestFatSecretApi(
  formPayload: Record<string, string | number>,
  forceRefresh = false,
) {
  const apiUrl = String(Deno.env.get("FATSECRET_API_URL") || "https://platform.fatsecret.com/rest/server.api");
  const accessToken = await getAccessToken(forceRefresh);
  const body = new URLSearchParams();
  Object.entries(formPayload).forEach(([key, value]) => body.set(key, String(value)));
  body.set("format", "json");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });

  if (response.status === 401 && !forceRefresh) {
    tokenCache = null;
    return requestFatSecretApi(formPayload, true);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FatSecret API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function handleSearch(requestBody: Record<string, unknown>) {
  const query = String(requestBody.query || requestBody.q || "").trim();
  const limit = clampValue(parseInt(String(requestBody.limit || "12"), 10) || 12, 1, 30);
  const pageNumber = Math.max(0, parseInt(String(requestBody.page || "0"), 10) || 0);
  if (query.length < 2) {
    return { items: [] as NormalizedFood[], source: "fatsecret", count: 0 };
  }

  const payload = await requestFatSecretApi({
    method: "foods.search",
    search_expression: query,
    max_results: limit,
    page_number: pageNumber,
  });

  const foodsNode = payload?.foods as Record<string, unknown> | undefined;
  const foodRows = toArray<Record<string, unknown>>(foodsNode?.food);
  const normalized = foodRows
    .map(normalizeFoodPayload)
    .filter((item): item is NormalizedFood => !!item);

  return {
    items: normalized,
    source: "fatsecret",
    count: normalized.length,
    page: pageNumber,
  };
}

async function handleGet(requestBody: Record<string, unknown>) {
  const idRaw = String(requestBody.foodId || requestBody.id || requestBody.provider_food_id || "").trim();
  const foodId = idRaw.replace(/^fatsecret:/i, "");
  if (!foodId) {
    throw new Error("foodId e obrigatorio.");
  }

  const payload = await requestFatSecretApi({
    method: "food.get",
    food_id: foodId,
  });
  const foodNode = payload?.food as Record<string, unknown> | undefined;
  const normalized = foodNode ? normalizeFoodPayload(foodNode) : null;
  return {
    item: normalized,
    source: "fatsecret",
    found: !!normalized,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo nao suportado." }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const safeBody = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const url = new URL(request.url);
    const path = url.pathname.split("/").filter(Boolean).pop() || "";
    const actionRaw = String(safeBody.action || "").toLowerCase().trim();
    const action = actionRaw || (path === "search" || path === "get" ? path : "");

    if (action === "search") {
      const result = await handleSearch(safeBody);
      return jsonResponse(result, 200);
    }
    if (action === "get") {
      const result = await handleGet(safeBody);
      return jsonResponse(result, 200);
    }

    return jsonResponse({
      error: "Acao invalida. Use action=search ou action=get.",
    }, 400);
  } catch (error) {
    console.error("fatsecret-foods error", error);
    return jsonResponse({
      error: "Falha ao consultar FatSecret.",
      message: String((error as Error)?.message || error || "erro desconhecido"),
    }, 500);
  }
});

