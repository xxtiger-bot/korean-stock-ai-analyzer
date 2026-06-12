import "server-only";

type ExternalReferenceSource = "Finnhub" | "none";
type ExternalReferenceStatus = "disabled" | "missing_key" | "success" | "no_data" | "error";

export type ExternalReferenceQuoteDiagnostic = {
  enabled: boolean;
  status: ExternalReferenceStatus;
  source: ExternalReferenceSource;
  attemptedSymbols: string[];
  rawResponse: unknown | null;
  price: number | null;
  updatedAt: string | null;
  errorMessage: string | null;
};

function isEnabled() {
  return process.env.ENABLE_EXTERNAL_REFERENCE_PRICE === "true";
}

function getFinnhubApiKey() {
  const key = process.env.FINNHUB_API_KEY?.trim();
  return key ? key : null;
}

function getExternalSymbols(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return [];
  return [`${normalized}.KS`];
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toUpdatedAt(timestamp: unknown) {
  const seconds = toNumber(timestamp);
  if (!seconds || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

async function fetchFinnhubQuote(symbol: string, apiKey: string) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    next: { revalidate: 0 }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `Finnhub quote request failed (${response.status}).`
    );
  }

  return payload;
}

export async function diagnoseExternalReferenceQuote(
  symbol: string
): Promise<ExternalReferenceQuoteDiagnostic> {
  const attemptedSymbols = getExternalSymbols(symbol);

  if (!isEnabled()) {
    return {
      enabled: false,
      status: "disabled",
      source: "none",
      attemptedSymbols,
      rawResponse: null,
      price: null,
      updatedAt: null,
      errorMessage: null
    };
  }

  const apiKey = getFinnhubApiKey();
  if (!apiKey) {
    return {
      enabled: true,
      status: "missing_key",
      source: "none",
      attemptedSymbols,
      rawResponse: null,
      price: null,
      updatedAt: null,
      errorMessage: "FINNHUB_API_KEY is not configured."
    };
  }

  let lastPayload: unknown = null;
  let lastError: string | null = null;

  for (const attempt of attemptedSymbols) {
    try {
      const payload = await fetchFinnhubQuote(attempt, apiKey);
      lastPayload = payload;
      const price = toNumber(payload?.c);

      if (price && price > 0) {
        return {
          enabled: true,
          status: "success",
          source: "Finnhub",
          attemptedSymbols,
          rawResponse: payload,
          price,
          updatedAt: toUpdatedAt(payload?.t),
          errorMessage: null
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "External reference request failed.";
    }
  }

  return {
    enabled: true,
    status: lastError ? "error" : "no_data",
    source: "none",
    attemptedSymbols,
    rawResponse: lastPayload,
    price: null,
    updatedAt: null,
    errorMessage: lastError
  };
}
