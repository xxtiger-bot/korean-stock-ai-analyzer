import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_BASE_URL = "https://openapivts.koreainvestment.com:29443";
const DEFAULT_TR_ID = "FHKST01010100";
const TEST_CODE = "005930";

type KisTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  [key: string]: unknown;
};

type KisQuoteResponse = {
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
  output?: Record<string, unknown>;
  output1?: Record<string, unknown>;
  [key: string]: unknown;
};

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function firstText(text: string, length = 1000) {
  return text.slice(0, length);
}

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim());
}

function classifyTokenFailure(status: number, text: string) {
  const lower = text.toLowerCase();

  if (status === 404) return "endpoint 오류";
  if (status === 401 || status === 403) return "권한 부족";
  if (lower.includes("appkey") || lower.includes("appsecret")) return "app key/secret 오류";
  if (lower.includes("not found")) return "endpoint 오류";
  return "token 획득 실패";
}

function classifyQuoteFailure(status: number, text: string, parsed?: KisQuoteResponse) {
  const lower = text.toLowerCase();
  const message = String(parsed?.msg1 ?? "").toLowerCase();
  const code = String(parsed?.msg_cd ?? "").toUpperCase();

  if (status === 404) return "endpoint 오류";
  if (status === 401 || status === 403) return "권한 부족";
  if (message.includes("tr_id") || code.includes("TR")) return "TR_ID 오류";
  if (
    message.includes("모의") ||
    message.includes("simulation") ||
    message.includes("지원하지") ||
    message.includes("not supported")
  ) {
    return "모의환경 미지원";
  }
  if (message.includes("권한") || message.includes("unauthorized") || message.includes("forbidden")) {
    return "권한 부족";
  }
  if (lower.includes("not found")) return "endpoint 오류";
  return "현재가 조회 실패";
}

function printEnvSummary() {
  const provider = process.env.REALTIME_STOCK_PROVIDER;
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  const baseUrl = process.env.KIS_BASE_URL || DEFAULT_BASE_URL;

  console.log("REALTIME_STOCK_PROVIDER:", provider || "(empty)");
  console.log("KIS_APP_KEY exists:", hasValue(appKey));
  console.log("KIS_APP_SECRET exists:", hasValue(appSecret));
  console.log("KIS_BASE_URL:", baseUrl);

  return {
    provider,
    appKey,
    appSecret,
    baseUrl
  };
}

async function requestToken(baseUrl: string, appKey: string, appSecret: string) {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/oauth2/tokenP`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret
    }),
    cache: "no-store"
  });

  const text = await response.text();
  let parsed: KisTokenResponse | undefined;
  try {
    parsed = JSON.parse(text) as KisTokenResponse;
  } catch {
    parsed = undefined;
  }

  console.log("\n[1] Access Token 요청");
  console.log("Endpoint:", endpoint);
  console.log("HTTP status:", response.status);
  console.log("Response text (first 1000 chars):");
  console.log(firstText(text, 1000));

  if (!response.ok) {
    return {
      ok: false as const,
      reason: classifyTokenFailure(response.status, text)
    };
  }

  const token = typeof parsed?.access_token === "string" ? parsed.access_token : "";
  if (!token) {
    return {
      ok: false as const,
      reason: "token 획득 실패"
    };
  }

  return {
    ok: true as const,
    token
  };
}

async function requestQuote(baseUrl: string, appKey: string, appSecret: string, token: string) {
  const trId = process.env.KIS_QUOTE_TR_ID?.trim() || DEFAULT_TR_ID;
  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: "J",
    fid_input_iscd: TEST_CODE
  });
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/uapi/domestic-stock/v1/quotations/inquire-price`;
  const requestUrl = `${endpoint}?${params.toString()}`;

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId
    },
    cache: "no-store"
  });

  const text = await response.text();
  let parsed: KisQuoteResponse | undefined;
  try {
    parsed = JSON.parse(text) as KisQuoteResponse;
  } catch {
    parsed = undefined;
  }

  console.log("\n[2] 현재가 요청 (005930)");
  console.log("Endpoint:", endpoint);
  console.log("Query params:", params.toString());
  console.log("TR_ID:", trId);
  console.log("HTTP status:", response.status);
  console.log("KIS code/msg:", parsed?.msg_cd ?? "(none)", "/", parsed?.msg1 ?? "(none)");
  console.log("Response text (first 1000 chars):");
  console.log(firstText(text, 1000));

  if (!response.ok) {
    return {
      ok: false as const,
      reason: classifyQuoteFailure(response.status, text, parsed)
    };
  }

  if (parsed?.rt_cd !== "0") {
    return {
      ok: false as const,
      reason: classifyQuoteFailure(response.status, text, parsed)
    };
  }

  const output =
    parsed.output && typeof parsed.output === "object"
      ? parsed.output
      : parsed.output1 && typeof parsed.output1 === "object"
        ? parsed.output1
        : null;

  if (!output) {
    return {
      ok: false as const,
      reason: "현재가 조회 실패"
    };
  }

  const currentPrice = output.stck_prpr;
  const priceDiff = output.prdy_vrss;
  const changeRate = output.prdy_ctrt;
  const volume = output.acml_vol;

  console.log("\n현재가 주요 필드");
  console.log("field names:", Object.keys(output).join(", "));
  console.log("stck_prpr:", currentPrice ?? "(missing)");
  console.log("prdy_vrss:", priceDiff ?? "(missing)");
  console.log("prdy_ctrt:", changeRate ?? "(missing)");
  console.log("acml_vol:", volume ?? "(missing)");

  return {
    ok: true as const
  };
}

async function main() {
  loadEnvLocal();

  const { provider, appKey, appSecret, baseUrl } = printEnvSummary();

  if (!hasValue(appKey) || !hasValue(appSecret)) {
    console.log("\nResult:", "app key/secret 缺失");
    return;
  }

  if (provider && provider !== "kis") {
    console.log(
      "\nNotice: REALTIME_STOCK_PROVIDER is not 'kis'. Script will still test KIS endpoint directly."
    );
  }

  let tokenResult: Awaited<ReturnType<typeof requestToken>>;
  try {
    tokenResult = await requestToken(baseUrl, appKey!, appSecret!);
  } catch (error) {
    console.log("\nResult:", "token 获取失败");
    console.log("Error:", error instanceof Error ? error.message : String(error));
    return;
  }

  if (!tokenResult.ok) {
    console.log("\nResult:", tokenResult.reason);
    return;
  }

  let quoteResult: Awaited<ReturnType<typeof requestQuote>>;
  try {
    quoteResult = await requestQuote(baseUrl, appKey!, appSecret!, tokenResult.token);
  } catch (error) {
    console.log("\nResult:", "현재가 조회 실패");
    console.log("Error:", error instanceof Error ? error.message : String(error));
    return;
  }

  console.log("\nResult:", quoteResult.ok ? "정상 응답" : quoteResult.reason);
}

main().catch((error) => {
  console.log("\nResult:", "테스트 실행 실패");
  console.log("Error:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
