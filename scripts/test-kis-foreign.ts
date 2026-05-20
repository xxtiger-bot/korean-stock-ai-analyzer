import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const quotePath = "/uapi/domestic-stock/v1/quotations/inquire-price";

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

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function firstText(text: string) {
  return text.slice(0, 1000);
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickOutput(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const output = payload.output;
  const output1 = payload.output1;
  if (output && typeof output === "object" && !Array.isArray(output)) {
    return output as Record<string, unknown>;
  }
  if (output1 && typeof output1 === "object" && !Array.isArray(output1)) {
    return output1 as Record<string, unknown>;
  }
  return null;
}

function findValueByKeys(source: Record<string, unknown>, keys: string[]) {
  const entries = Object.entries(source);
  for (const key of keys) {
    if (key in source) return source[key];
    const found = entries.find(([entryKey]) => entryKey.toLowerCase() === key.toLowerCase());
    if (found) return found[1];
  }
  return undefined;
}

function classifyFailure(status: number, payload: Record<string, unknown> | null, text: string) {
  if (status === 401 || status === 403) return "권한 부족 또는 앱키/시크릿 오류";
  if (status === 404) return "endpoint 오류";

  const rtCode = typeof payload?.rt_cd === "string" ? payload.rt_cd : "";
  const msg = typeof payload?.msg1 === "string" ? payload.msg1 : "";
  const allText = `${msg}\n${text}`.toLowerCase();

  if (rtCode && rtCode !== "0") {
    if (allText.includes("tr_id")) return "TR_ID 오류";
    if (allText.includes("모의") || allText.includes("virtual") || allText.includes("vts")) {
      return "모의환경 미지원 가능성";
    }
    if (allText.includes("권한") || allText.includes("permission")) {
      return "권한 부족";
    }
    return `요청 실패(rt_cd=${rtCode})`;
  }

  return "정상 응답";
}

async function requestToken(baseUrl: string, appKey: string, appSecret: string) {
  const response = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret
    })
  });

  const text = await response.text();
  const payload = safeJsonParse(text);
  const token = typeof payload?.access_token === "string" ? payload.access_token : "";
  return {
    ok: response.ok && Boolean(token),
    status: response.status,
    token,
    text,
    payload
  };
}

async function main() {
  loadEnvLocal();

  const realtimeProvider = process.env.REALTIME_STOCK_PROVIDER?.trim() || "";
  const appKey = process.env.KIS_APP_KEY?.trim() || "";
  const appSecret = process.env.KIS_APP_SECRET?.trim() || "";
  const baseUrlRaw = process.env.KIS_BASE_URL?.trim() || "";
  const baseUrl = baseUrlRaw ? normalizeBaseUrl(baseUrlRaw) : "";
  const trId = process.env.KIS_QUOTE_TR_ID?.trim() || "FHKST01010100";

  console.log("REALTIME_STOCK_PROVIDER:", realtimeProvider || "(empty)");
  console.log("KIS_APP_KEY exists:", Boolean(appKey));
  console.log("KIS_APP_SECRET exists:", Boolean(appSecret));
  console.log("KIS_BASE_URL:", baseUrl || "(empty)");
  console.log("Test symbol: 005930");

  if (!appKey || !appSecret || !baseUrl) {
    console.log("Result: app key/secret/base url missing");
    return;
  }

  const tokenResult = await requestToken(baseUrl, appKey, appSecret);
  console.log("Token HTTP status:", tokenResult.status);
  console.log("Token response first 1000 chars:");
  console.log(firstText(tokenResult.text));

  if (!tokenResult.ok) {
    console.log("Result: token获取失败");
    return;
  }

  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: "J",
    fid_input_iscd: "005930"
  });
  const quoteUrl = `${baseUrl}${quotePath}?${params.toString()}`;
  console.log("Quote endpoint:", `${baseUrl}${quotePath}`);
  console.log("Query params:", params.toString());
  console.log("TR_ID:", trId);

  const quoteResponse = await fetch(quoteUrl, {
    method: "GET",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${tokenResult.token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId
    }
  });

  const quoteText = await quoteResponse.text();
  const quotePayload = safeJsonParse(quoteText);

  console.log("Quote HTTP status:", quoteResponse.status);
  console.log("Quote response first 1000 chars:");
  console.log(firstText(quoteText));

  if (quotePayload) {
    console.log("Top-level keys:", Object.keys(quotePayload).join(", "));
  } else {
    console.log("JSON parse error");
  }

  const output = pickOutput(quotePayload);
  if (output) {
    const outputKeys = Object.keys(output);
    console.log("Output keys:", outputKeys.join(", "));

    const foreignOwnershipRatio = findValueByKeys(output, [
      "frgn_hldn_rt",
      "frgn_hldn_rate"
    ]);
    const foreignHoldingQty = findValueByKeys(output, [
      "frgn_hldn_qty",
      "frgn_hldn_qnty"
    ]);
    const foreignLimitQty = findValueByKeys(output, [
      "frgn_lmtl_qty",
      "frgn_lmtt_qty",
      "frgn_lmt_qty"
    ]);
    const foreignExhaustionRate = findValueByKeys(output, [
      "hts_frgn_ehrt",
      "frgn_ehrt",
      "frgn_exh_rt"
    ]);

    console.log("Foreign fields:");
    console.log("foreignOwnershipRatio:", foreignOwnershipRatio ?? "(not found)");
    console.log("foreignHoldingQty:", foreignHoldingQty ?? "(not found)");
    console.log("foreignLimitQty:", foreignLimitQty ?? "(not found)");
    console.log("foreignExhaustionRate:", foreignExhaustionRate ?? "(not found)");
  } else {
    console.log("No output object found in response.");
  }

  console.log("Result:", classifyFailure(quoteResponse.status, quotePayload, quoteText));
}

main().catch((error) => {
  console.log("Result: fetch failed");
  if (error instanceof Error) {
    console.log("Error:", error.message);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause && typeof cause === "object" && cause !== null) {
      const causeRecord = cause as Record<string, unknown>;
      const code = typeof causeRecord.code === "string" ? causeRecord.code : "";
      const address = typeof causeRecord.address === "string" ? causeRecord.address : "";
      const port = typeof causeRecord.port === "number" ? causeRecord.port : "";
      if (code) console.log("Cause code:", code);
      if (address) console.log("Cause address:", address);
      if (port) console.log("Cause port:", port);
    }
  } else {
    console.log("Error:", String(error));
  }
  process.exitCode = 1;
});
