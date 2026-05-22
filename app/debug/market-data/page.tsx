import { formatKRW, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DebugStockTarget = {
  code: string;
  name: string;
};

type SourceCheckResult = {
  success: boolean;
  price: number | null;
  status: number | null;
  updatedAt: string | null;
  referenceDate: string | null;
  errorMessage: string | null;
};

type MarketDataResult = {
  code: string;
  name: string;
  kis: SourceCheckResult;
  dataGo: SourceCheckResult;
  finalSourceText: string;
  gapRate: number | null;
  gapStatusText: string | null;
};

type FailureDiagnosis = {
  category:
    | "네트워크 연결 실패"
    | "API 응답 실패"
    | "API key 누락"
    | "권한/포트 차단 가능성"
    | "알 수 없는 오류";
  description: string;
  showFetchHint: boolean;
};

const TARGET_STOCKS: DebugStockTarget[] = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "035420", name: "NAVER" }
];

const DATA_GO_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";

function isNonEmpty(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function apiKeyExists(value: string | undefined) {
  if (!isNonEmpty(value)) return false;
  if (value === "PASTE_YOUR_DATA_GO_KR_KEY_HERE") return false;
  return true;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatBasDt(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.trim();
  if (!/^\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function formatCntgHour(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.trim();
  if (!/^\d{6}$/.test(digits)) return null;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
}

function encodeServiceKey(apiKey: string) {
  return apiKey.includes("%") ? apiKey : encodeURIComponent(apiKey);
}

function normalizeErrorMessage(message: string | null) {
  return (message ?? "").trim();
}

function classifyFailure(result: SourceCheckResult): FailureDiagnosis | null {
  if (result.success) return null;

  const rawMessage = normalizeErrorMessage(result.errorMessage);
  const lowered = rawMessage.toLowerCase();
  const status = result.status;

  if (
    lowered.includes("미설정") ||
    lowered.includes("api key") ||
    lowered.includes("app key") ||
    lowered.includes("appsecret") ||
    lowered.includes("환경변수")
  ) {
    return {
      category: "API key 누락",
      description: rawMessage || "필수 API Key 또는 환경변수가 없습니다.",
      showFetchHint: false
    };
  }

  if (
    lowered.includes("eacces") ||
    lowered.includes("permission") ||
    lowered.includes("권한") ||
    lowered.includes("port")
  ) {
    return {
      category: "권한/포트 차단 가능성",
      description: rawMessage || "접근 권한 또는 포트 정책으로 요청이 제한될 수 있습니다.",
      showFetchHint: lowered.includes("fetch failed")
    };
  }

  if (
    lowered.includes("fetch failed") ||
    lowered.includes("enotfound") ||
    lowered.includes("econnrefused") ||
    lowered.includes("econnreset") ||
    lowered.includes("etimedout") ||
    lowered.includes("network")
  ) {
    return {
      category: "네트워크 연결 실패",
      description: rawMessage || "외부 API 네트워크 연결에 실패했습니다.",
      showFetchHint: true
    };
  }

  if (typeof status === "number" && status >= 400) {
    return {
      category: "API 응답 실패",
      description: rawMessage || `HTTP ${status} 응답 오류`,
      showFetchHint: false
    };
  }

  return {
    category: "알 수 없는 오류",
    description: rawMessage || "원인을 확인할 수 없는 오류가 발생했습니다.",
    showFetchHint: false
  };
}

function getUserDisplayMessage(result: MarketDataResult) {
  const kisValid = Number.isFinite(result.kis.price ?? NaN) && (result.kis.price ?? 0) > 0;
  const dataGoValid = Number.isFinite(result.dataGo.price ?? NaN) && (result.dataGo.price ?? 0) > 0;

  if (kisValid) {
    return "현재가는 KIS 기준으로 표시됩니다.";
  }
  if (dataGoValid) {
    return "현재가 확인 불가 상태로, 최근 종가(data.go.kr 기준)를 참고 정보로 표시합니다.";
  }

  return "현재 표시 가능한 시세 데이터가 없습니다. 하지만 페이지는 정상적으로 동작합니다.";
}

async function fetchJson(
  url: string,
  init?: RequestInit
): Promise<{ status: number | null; json: unknown | null; text: string | null; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const status = response.status;
    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return { status, json, text: null, error: null };
    } catch {
      return {
        status,
        json: null,
        text: text.slice(0, 300),
        error: "JSON parse failed"
      };
    }
  } catch (error) {
    return {
      status: null,
      json: null,
      text: null,
      error: error instanceof Error ? error.message : "fetch failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkKisQuote(
  code: string,
  env: {
    appKey: string | undefined;
    appSecret: string | undefined;
    baseUrl: string | undefined;
  }
): Promise<SourceCheckResult> {
  if (!isNonEmpty(env.appKey) || !isNonEmpty(env.appSecret) || !isNonEmpty(env.baseUrl)) {
    return {
      success: false,
      price: null,
      status: null,
      updatedAt: null,
      referenceDate: null,
      errorMessage: "KIS 환경변수 미설정"
    };
  }

  const baseUrl = env.baseUrl!.trim().replace(/\/+$/, "");
  const tokenPayload = JSON.stringify({
    grant_type: "client_credentials",
    appkey: env.appKey!.trim(),
    appsecret: env.appSecret!.trim()
  });
  const tokenResponse = await fetchJson(`${baseUrl}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: tokenPayload
  });

  const tokenJson = tokenResponse.json as Record<string, unknown> | null;
  const accessToken =
    tokenJson && typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";

  if (!tokenResponse.status || tokenResponse.status >= 400 || !isNonEmpty(accessToken)) {
    const tokenErrorMessage =
      (tokenJson && typeof tokenJson.msg1 === "string" && tokenJson.msg1) ||
      tokenResponse.error ||
      tokenResponse.text ||
      "token 발급 실패";
    return {
      success: false,
      price: null,
      status: tokenResponse.status,
      updatedAt: null,
      referenceDate: null,
      errorMessage: tokenErrorMessage
    };
  }

  const quoteUrl = `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${encodeURIComponent(
    code
  )}`;
  const quoteResponse = await fetchJson(quoteUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${accessToken}`,
      appkey: env.appKey!.trim(),
      appsecret: env.appSecret!.trim(),
      tr_id: "FHKST01010100",
      custtype: "P"
    }
  });

  const quoteJson = quoteResponse.json as Record<string, unknown> | null;
  const output =
    quoteJson && typeof quoteJson.output === "object" && quoteJson.output !== null
      ? (quoteJson.output as Record<string, unknown>)
      : null;
  const price = toNumber(output?.stck_prpr);
  const updatedAt = formatCntgHour(output?.stck_cntg_hour);
  const referenceDate = formatBasDt(output?.stck_bsop_date);
  const quoteMessage =
    (quoteJson && typeof quoteJson.msg1 === "string" && quoteJson.msg1) ||
    quoteResponse.error ||
    quoteResponse.text ||
    null;

  if (!quoteResponse.status || quoteResponse.status >= 400 || !Number.isFinite(price ?? NaN) || (price ?? 0) <= 0) {
    return {
      success: false,
      price: null,
      status: quoteResponse.status,
      updatedAt,
      referenceDate,
      errorMessage: quoteMessage ?? "현재가 조회 실패"
    };
  }

  return {
    success: true,
    price,
    status: quoteResponse.status,
    updatedAt,
    referenceDate,
    errorMessage: null
  };
}

async function checkDataGoClose(
  code: string,
  apiKey: string | undefined
): Promise<SourceCheckResult> {
  if (!apiKeyExists(apiKey)) {
    return {
      success: false,
      price: null,
      status: null,
      updatedAt: null,
      referenceDate: null,
      errorMessage: "DATA_GO_KR_API_KEY 미설정"
    };
  }

  const params = new URLSearchParams({
    beginBasDt: "20240101",
    endBasDt: "20261231",
    likeSrtnCd: code,
    numOfRows: "30",
    pageNo: "1",
    resultType: "json"
  });

  const url = `${DATA_GO_ENDPOINT}?serviceKey=${encodeServiceKey(apiKey!.trim())}&${params.toString()}`;
  const response = await fetchJson(url, { method: "GET" });
  const payload = response.json as Record<string, unknown> | null;
  const rootResponse =
    payload && typeof payload.response === "object" && payload.response !== null
      ? (payload.response as Record<string, unknown>)
      : null;
  const header =
    rootResponse && typeof rootResponse.header === "object" && rootResponse.header !== null
      ? (rootResponse.header as Record<string, unknown>)
      : null;
  const resultCode = typeof header?.resultCode === "string" ? header.resultCode : "";
  const resultMsg = typeof header?.resultMsg === "string" ? header.resultMsg : "";

  if (!response.status || response.status >= 400) {
    return {
      success: false,
      price: null,
      status: response.status,
      updatedAt: null,
      referenceDate: null,
      errorMessage: response.error ?? response.text ?? "HTTP 오류"
    };
  }

  if (resultCode && resultCode !== "00") {
    return {
      success: false,
      price: null,
      status: response.status,
      updatedAt: null,
      referenceDate: null,
      errorMessage: resultMsg || `resultCode=${resultCode}`
    };
  }

  const body =
    rootResponse && typeof rootResponse.body === "object" && rootResponse.body !== null
      ? (rootResponse.body as Record<string, unknown>)
      : null;
  const itemsContainer =
    body && typeof body.items === "object" && body.items !== null
      ? (body.items as Record<string, unknown>)
      : null;
  const itemValue = itemsContainer?.item;
  const rows = Array.isArray(itemValue) ? itemValue : itemValue ? [itemValue] : [];
  const normalizedRows = rows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .filter((row) => (typeof row.srtnCd === "string" ? row.srtnCd.trim() : "") === code)
    .sort((a, b) => {
      const left = typeof a.basDt === "string" ? a.basDt : "";
      const right = typeof b.basDt === "string" ? b.basDt : "";
      return right.localeCompare(left);
    });

  const latest = normalizedRows[0];
  const close = toNumber(latest?.clpr);
  const referenceDate = formatBasDt(latest?.basDt);

  if (!latest || !Number.isFinite(close ?? NaN) || (close ?? 0) <= 0) {
    return {
      success: false,
      price: null,
      status: response.status,
      updatedAt: null,
      referenceDate,
      errorMessage: "최근 종가 데이터 없음"
    };
  }

  return {
    success: true,
    price: close,
    status: response.status,
    updatedAt: null,
    referenceDate,
    errorMessage: null
  };
}

function evaluateFinalSource(kis: SourceCheckResult, dataGo: SourceCheckResult) {
  const kisPriceValid = Number.isFinite(kis.price ?? NaN) && (kis.price ?? 0) > 0;
  const closePriceValid = Number.isFinite(dataGo.price ?? NaN) && (dataGo.price ?? 0) > 0;

  if (kisPriceValid) return "현재가: KIS";
  if (closePriceValid) return "현재가 확인 불가 + 최근 종가: data.go.kr";
  return "데이터 없음";
}

function getGapInfo(kis: SourceCheckResult, dataGo: SourceCheckResult) {
  const kisPriceValid = Number.isFinite(kis.price ?? NaN) && (kis.price ?? 0) > 0;
  const closePriceValid = Number.isFinite(dataGo.price ?? NaN) && (dataGo.price ?? 0) > 0;

  if (!kisPriceValid || !closePriceValid) {
    return { gapRate: null, gapStatusText: null };
  }

  const gapRate = Math.abs((kis.price ?? 0) - (dataGo.price ?? 0)) / (dataGo.price ?? 1);
  if (!Number.isFinite(gapRate)) {
    return { gapRate: null, gapStatusText: null };
  }

  if (gapRate > 0.5) {
    return { gapRate, gapStatusText: "데이터 검증 필요" };
  }
  if (gapRate > 0.3) {
    return { gapRate, gapStatusText: "가격 확인 필요" };
  }
  return { gapRate, gapStatusText: "정상 범위" };
}

async function buildStockResult(
  stock: DebugStockTarget,
  env: {
    kisAppKey: string | undefined;
    kisAppSecret: string | undefined;
    kisBaseUrl: string | undefined;
    dataGoApiKey: string | undefined;
  }
): Promise<MarketDataResult> {
  const [kis, dataGo] = await Promise.all([
    checkKisQuote(stock.code, {
      appKey: env.kisAppKey,
      appSecret: env.kisAppSecret,
      baseUrl: env.kisBaseUrl
    }),
    checkDataGoClose(stock.code, env.dataGoApiKey)
  ]);

  const gap = getGapInfo(kis, dataGo);

  return {
    code: stock.code,
    name: stock.name,
    kis,
    dataGo,
    finalSourceText: evaluateFinalSource(kis, dataGo),
    gapRate: gap.gapRate,
    gapStatusText: gap.gapStatusText
  };
}

export default async function MarketDataDebugPage() {
  const realtimeProvider = process.env.REALTIME_STOCK_PROVIDER?.trim() ?? "";
  const stockDataProvider = process.env.STOCK_DATA_PROVIDER?.trim() ?? "";
  const kisAppKey = process.env.KIS_APP_KEY;
  const kisAppSecret = process.env.KIS_APP_SECRET;
  const kisBaseUrl = process.env.KIS_BASE_URL?.trim();
  const dataGoApiKey = process.env.DATA_GO_KR_API_KEY;

  const results = await Promise.all(
    TARGET_STOCKS.map((target) =>
      buildStockResult(target, {
        kisAppKey,
        kisAppSecret,
        kisBaseUrl,
        dataGoApiKey
      })
    )
  );

  const safeResults = Array.isArray(results) ? results : [];
  const totalRequests = safeResults.length * 2;
  const failedRequests = safeResults.reduce((count, item) => {
    const kisFailed = item.kis.success ? 0 : 1;
    const dataGoFailed = item.dataGo.success ? 0 : 1;
    return count + kisFailed + dataGoFailed;
  }, 0);

  const requestStatusText =
    failedRequests === 0
      ? "정상"
      : failedRequests >= totalRequests && totalRequests > 0
        ? "전체 실패"
        : "일부 실패";

  const pageStatusDescription =
    failedRequests === 0
      ? "현재 페이지와 외부 데이터 요청이 모두 정상입니다."
      : "현재 페이지는 정상이며, 외부 데이터 요청만 실패했습니다.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h1 className="text-xl font-bold text-ink dark:text-white">데이터 소스 상태 진단</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          KIS 현재가와 data.go.kr 일별 종가 데이터 연결 상태를 점검합니다.
        </p>
        <div className="mt-4 grid gap-2 text-sm font-semibold sm:grid-cols-3">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-700 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200">
            페이지 상태: 정상
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-700 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200">
            데이터 요청 상태: {requestStatusText}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-700 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 sm:col-span-3">
            설명: {pageStatusDescription}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-base font-bold text-ink dark:text-white">환경 상태</h2>
        <div className="mt-3 grid gap-2 text-sm font-semibold sm:grid-cols-2">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            REALTIME_STOCK_PROVIDER: {realtimeProvider || "미설정"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            STOCK_DATA_PROVIDER: {stockDataProvider || "미설정"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            KIS_APP_KEY exists: {apiKeyExists(kisAppKey) ? "true" : "false"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            KIS_APP_SECRET exists: {apiKeyExists(kisAppSecret) ? "true" : "false"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50 sm:col-span-2">
            KIS_BASE_URL: {kisBaseUrl || "미설정"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50 sm:col-span-2">
            DATA_GO_KR_API_KEY exists: {apiKeyExists(dataGoApiKey) ? "true" : "false"}
          </p>
        </div>
      </section>

      <section className="mt-4 grid gap-4">
        {safeResults.map((result) => (
          <article
            key={result.code}
            className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel"
          >
            <h3 className="text-base font-bold text-ink dark:text-white">
              {result.name} · {result.code}
            </h3>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold text-slate-400">KIS 현재가 요청</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                  {result.kis.success ? "성공" : "실패"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  현재가:{" "}
                  {Number.isFinite(result.kis.price ?? NaN)
                    ? formatKRW(result.kis.price ?? 0)
                    : "데이터 없음"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  updatedAt: {result.kis.updatedAt ?? "확인 불가"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  HTTP status: {result.kis.status ?? "N/A"}
                </p>
                {(() => {
                  const diagnosis = classifyFailure(result.kis);
                  if (!diagnosis) {
                    return (
                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        정상 응답
                      </p>
                    );
                  }
                  return (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">
                        {diagnosis.category}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {diagnosis.description}
                      </p>
                      {diagnosis.showFetchHint ? (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          로컬 개발 환경에서 외부 API 연결이 차단되었을 수 있습니다. Vercel 배포 환경에서 다시
                          확인해주세요.
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold text-slate-400">data.go.kr 최근 종가 요청</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                  {result.dataGo.success ? "성공" : "실패"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  최근 종가:{" "}
                  {Number.isFinite(result.dataGo.price ?? NaN)
                    ? formatKRW(result.dataGo.price ?? 0)
                    : "데이터 없음"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  기준일: {result.dataGo.referenceDate ?? "확인 불가"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  HTTP status: {result.dataGo.status ?? "N/A"}
                </p>
                {(() => {
                  const diagnosis = classifyFailure(result.dataGo);
                  if (!diagnosis) {
                    return (
                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        정상 응답
                      </p>
                    );
                  }
                  return (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">
                        {diagnosis.category}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {diagnosis.description}
                      </p>
                      {diagnosis.showFetchHint ? (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          로컬 개발 환경에서 외부 API 연결이 차단되었을 수 있습니다. Vercel 배포 환경에서 다시
                          확인해주세요.
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-3 rounded-md border border-line bg-white p-3 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
              <p>KIS: {result.kis.success ? "성공" : "실패"}</p>
              <p className="mt-1">data.go.kr: {result.dataGo.success ? "성공" : "실패"}</p>
              <p className="mt-1">최종 사용 가능 데이터: {result.finalSourceText}</p>
              <p className="mt-1">사용자에게 표시될 문구: {getUserDisplayMessage(result)}</p>
              <p className="mt-1">
                가격 차이율:{" "}
                {Number.isFinite(result.gapRate ?? NaN)
                  ? formatPercent((result.gapRate ?? 0) * 100)
                  : "계산 불가"}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-200">
                {result.gapStatusText ?? "비교 불가"}
              </p>
              {!result.kis.success && !result.dataGo.success ? (
                <p className="mt-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  현재 표시 가능한 시세 데이터가 없습니다. 하지만 페이지는 정상적으로 동작합니다.
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 text-xs font-semibold leading-5 text-slate-500 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:text-slate-400">
        KIS는 현재가 기준이며, data.go.kr는 일별 종가 기준입니다.
      </section>
    </main>
  );
}
