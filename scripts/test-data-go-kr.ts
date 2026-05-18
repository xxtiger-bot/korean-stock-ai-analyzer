import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const endpoint =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";

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

function encodeServiceKey(apiKey: string) {
  return apiKey.includes("%") ? apiKey : encodeURIComponent(apiKey);
}

function firstText(text: string) {
  return text.slice(0, 500);
}

function normalizeItems(items: unknown) {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function classifyResult(text: string, parsed?: any) {
  if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
    return "SERVICE_KEY_IS_NOT_REGISTERED_ERROR";
  }

  if (text.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR")) {
    return "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR";
  }

  const resultCode = parsed?.response?.header?.resultCode;
  const resultMsg = parsed?.response?.header?.resultMsg;
  const totalCount = Number(parsed?.response?.body?.totalCount ?? 0);
  const items = normalizeItems(parsed?.response?.body?.items?.item);

  if (resultCode && resultCode !== "00") {
    return resultMsg || `ERROR_${resultCode}`;
  }

  if (totalCount === 0 || items.length === 0) {
    return "NO_DATA";
  }

  return "정상 응답";
}

async function main() {
  loadEnvLocal();

  const apiKey = process.env.DATA_GO_KR_API_KEY;
  console.log("DATA_GO_KR_API_KEY exists:", Boolean(apiKey));

  if (!apiKey || apiKey === "PASTE_YOUR_DATA_GO_KR_KEY_HERE") {
    console.log("Result:", "SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
    console.log("No usable DATA_GO_KR_API_KEY found. Real API call skipped.");
    return;
  }

  const params = new URLSearchParams({
    beginBasDt: "20240101",
    endBasDt: "20261231",
    likeSrtnCd: "005930",
    numOfRows: "30",
    pageNo: "1",
    resultType: "json"
  });
  const url = `${endpoint}?serviceKey=${encodeServiceKey(apiKey)}&${params.toString()}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log("HTTP status:", response.status);
    console.log("Response text first 500 chars:");
    console.log(firstText(text));

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.log("Result:", "JSON parse error");
      console.log("Raw text first 500 chars:");
      console.log(firstText(text));
      return;
    }

    const result = classifyResult(text, parsed);
    console.log("Result:", result);

    const firstItem = normalizeItems(parsed?.response?.body?.items?.item)[0];
    if (firstItem && typeof firstItem === "object") {
      console.log("First item field names:");
      console.log(Object.keys(firstItem).join(", "));
    }
  } catch (error) {
    console.log("Result:", "fetch failed");
    console.log("Error:", error instanceof Error ? error.message : String(error));
  }
}

main().catch((error) => {
  console.log("Result:", "fetch failed");
  console.log("Error:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
