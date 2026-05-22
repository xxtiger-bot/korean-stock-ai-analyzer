export type DebugStockTarget = {
  code: string;
  name: string;
};

export type FailureCategory =
  | "네트워크 연결 실패"
  | "API 응답 실패"
  | "API key 누락"
  | "권한/포트 차단 가능성"
  | "알 수 없는 오류";

export type SourceCheckResult = {
  success: boolean;
  price: number | null;
  status: number | null;
  updatedAt: string | null;
  referenceDate: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
  rtCd: string | null;
  msgCd: string | null;
  msg1: string | null;
  diagnosisCategory: FailureCategory | null;
  diagnosisDescription: string | null;
  showFetchHint: boolean;
};

export type KisEndpointStep = {
  success: boolean;
  status: number | null;
  rtCd: string | null;
  msgCd: string | null;
  msg1: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
  diagnosisCategory: FailureCategory | null;
  diagnosisDescription: string | null;
};

export type MarketDataResult = {
  code: string;
  name: string;
  kis: SourceCheckResult;
  dataGo: SourceCheckResult;
  finalSourceText: string;
  userDisplayMessage: string;
  gapRate: number | null;
  gapStatusText: string | null;
};

export type MarketDataDebugSnapshot = {
  generatedAt: string;
  pageStatusText: "정상";
  requestStatusText: "정상" | "일부 실패" | "전체 실패";
  pageStatusDescription: string;
  envStatus: {
    realtimeProvider: string;
    stockDataProvider: string;
    kisAppKeyExists: boolean;
    kisAppSecretExists: boolean;
    kisBaseUrl: string;
    dataGoApiKeyExists: boolean;
  };
  kisEndpointDiagnosis: {
    baseUrl: string;
    isMockEndpoint: boolean;
    endpointTypeLabel: "모의 endpoint" | "실전 endpoint" | "사용자 지정 endpoint";
    token: KisEndpointStep;
    quoteProbe: KisEndpointStep;
    endpointWarning: string | null;
  };
  stocks: MarketDataResult[];
  footerNote: string;
};

type FetchJsonResult = {
  status: number | null;
  json: unknown | null;
  text: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
};

type KisTokenResult = {
  step: KisEndpointStep;
  accessToken: string | null;
};

const DATA_GO_ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";

const DEFAULT_TARGET_STOCKS: DebugStockTarget[] = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "035420", name: "NAVER" }
];

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

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeErrorMessage(message: string | null) {
  return (message ?? "").trim();
}

function buildFetchErrorDetail(error: unknown) {
  if (!(error instanceof Error)) return "fetch failed";
  const fallback = error.message || "fetch failed";
  const maybeWithCause = error as Error & { cause?: unknown };
  const cause = maybeWithCause.cause;
  if (!cause || typeof cause !== "object") return fallback;

  const causeObj = cause as {
    code?: string;
    errno?: number | string;
    syscall?: string;
    address?: string;
    port?: number | string;
  };

  const parts: string[] = [fallback];
  if (typeof causeObj.code === "string" && causeObj.code) parts.push(`code=${causeObj.code}`);
  if (typeof causeObj.errno !== "undefined") parts.push(`errno=${String(causeObj.errno)}`);
  if (typeof causeObj.syscall === "string" && causeObj.syscall) parts.push(`syscall=${causeObj.syscall}`);
  if (typeof causeObj.address === "string" && causeObj.address) parts.push(`address=${causeObj.address}`);
  if (typeof causeObj.port !== "undefined") parts.push(`port=${String(causeObj.port)}`);
  return parts.join(" | ");
}

async function fetchJson(url: string, init?: RequestInit): Promise<FetchJsonResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const status = response.status;
    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return { status, json, text: null, errorMessage: null, errorDetail: null };
    } catch {
      return {
        status,
        json: null,
        text: text.slice(0, 300),
        errorMessage: "JSON parse failed",
        errorDetail: text.slice(0, 300)
      };
    }
  } catch (error) {
    const detail = buildFetchErrorDetail(error);
    return {
      status: null,
      json: null,
      text: null,
      errorMessage: error instanceof Error ? error.message : "fetch failed",
      errorDetail: detail
    };
  } finally {
    clearTimeout(timeout);
  }
}

function classifyFailure(
  result: Pick<SourceCheckResult, "success" | "status" | "errorMessage" | "errorDetail">,
  options?: { isKisVts?: boolean }
) {
  if (result.success) {
    return {
      category: null,
      description: null,
      showFetchHint: false
    };
  }

  const rawMessage = normalizeErrorMessage(result.errorMessage);
  const detail = normalizeErrorMessage(result.errorDetail);
  const merged = `${rawMessage} ${detail}`.trim().toLowerCase();
  const status = result.status;

  if (
    merged.includes("미설정") ||
    merged.includes("api key") ||
    merged.includes("app key") ||
    merged.includes("appsecret") ||
    merged.includes("환경변수")
  ) {
    return {
      category: "API key 누락" as const,
      description: rawMessage || "필수 API Key 또는 환경변수가 없습니다.",
      showFetchHint: false
    };
  }

  if (status === 401 || status === 403) {
    return {
      category: "API 응답 실패" as const,
      description: "KIS App Key / Secret 또는 API 신청 권한을 확인해주세요.",
      showFetchHint: false
    };
  }

  if (status === 500) {
    return {
      category: "API 응답 실패" as const,
      description: "KIS 서버 응답 오류 또는 해당 종목/endpoint 미지원 가능성이 있습니다.",
      showFetchHint: false
    };
  }

  if (
    merged.includes("eacces") ||
    merged.includes("permission") ||
    merged.includes("권한") ||
    merged.includes("port")
  ) {
    return {
      category: "권한/포트 차단 가능성" as const,
      description: rawMessage || detail || "접근 권한 또는 포트 정책으로 요청이 제한될 수 있습니다.",
      showFetchHint: merged.includes("fetch failed")
    };
  }

  if (
    merged.includes("fetch failed") ||
    merged.includes("enotfound") ||
    merged.includes("econnrefused") ||
    merged.includes("econnreset") ||
    merged.includes("etimedout") ||
    merged.includes("timeout") ||
    merged.includes("aborted") ||
    merged.includes("network")
  ) {
    return {
      category: "네트워크 연결 실패" as const,
      description: rawMessage || detail || "외부 API 네트워크 연결에 실패했습니다.",
      showFetchHint: true
    };
  }

  if (typeof status === "number" && status >= 400) {
    return {
      category: "API 응답 실패" as const,
      description: rawMessage || detail || `HTTP ${status} 응답 오류`,
      showFetchHint: false
    };
  }

  if (options?.isKisVts) {
    return {
      category: "권한/포트 차단 가능성" as const,
      description: rawMessage || detail || "모의 endpoint 접속 제한 가능성이 있습니다.",
      showFetchHint: false
    };
  }

  return {
    category: "알 수 없는 오류" as const,
    description: rawMessage || detail || "원인을 확인할 수 없는 오류가 발생했습니다.",
    showFetchHint: false
  };
}

function parseKisMeta(json: unknown) {
  const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  return {
    rtCd: asString(obj?.rt_cd) ?? asString(obj?.rtCd),
    msgCd: asString(obj?.msg_cd) ?? asString(obj?.msgCd) ?? asString(obj?.error_code),
    msg1: asString(obj?.msg1) ?? asString(obj?.message) ?? asString(obj?.error_description)
  };
}

async function checkKisToken(env: {
  appKey: string | undefined;
  appSecret: string | undefined;
  baseUrl: string | undefined;
  isMockEndpoint: boolean;
}): Promise<KisTokenResult> {
  if (!isNonEmpty(env.appKey) || !isNonEmpty(env.appSecret) || !isNonEmpty(env.baseUrl)) {
    const base: SourceCheckResult = {
      success: false,
      price: null,
      status: null,
      updatedAt: null,
      referenceDate: null,
      errorMessage: "KIS 환경변수 미설정",
      errorDetail: null,
      rtCd: null,
      msgCd: null,
      msg1: null,
      diagnosisCategory: null,
      diagnosisDescription: null,
      showFetchHint: false
    };
    const diagnosed = classifyFailure(base, { isKisVts: env.isMockEndpoint });
    return {
      accessToken: null,
      step: {
        success: false,
        status: null,
        rtCd: null,
        msgCd: null,
        msg1: null,
        errorMessage: base.errorMessage,
        errorDetail: base.errorDetail,
        diagnosisCategory: diagnosed.category,
        diagnosisDescription: diagnosed.description
      }
    };
  }

  const baseUrl = env.baseUrl!.trim().replace(/\/+$/, "");
  const tokenPayload = JSON.stringify({
    grant_type: "client_credentials",
    appkey: env.appKey!.trim(),
    appsecret: env.appSecret!.trim()
  });

  const response = await fetchJson(`${baseUrl}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: tokenPayload
  });

  const meta = parseKisMeta(response.json);
  const responseObj =
    response.json && typeof response.json === "object" ? (response.json as Record<string, unknown>) : null;
  const accessToken = asString(responseObj?.access_token);

  const success = !!response.status && response.status < 400 && isNonEmpty(accessToken ?? undefined);
  const fallbackMessage =
    meta.msg1 ?? response.errorMessage ?? response.errorDetail ?? response.text ?? "token 발급 실패";

  const baseFailure: SourceCheckResult = {
    success,
    price: null,
    status: response.status,
    updatedAt: null,
    referenceDate: null,
    errorMessage: success ? null : fallbackMessage,
    errorDetail: success ? null : response.errorDetail,
    rtCd: meta.rtCd,
    msgCd: meta.msgCd,
    msg1: meta.msg1,
    diagnosisCategory: null,
    diagnosisDescription: null,
    showFetchHint: false
  };
  const diagnosed = classifyFailure(baseFailure, { isKisVts: env.isMockEndpoint });

  return {
    accessToken: success ? accessToken : null,
    step: {
      success,
      status: response.status,
      rtCd: meta.rtCd,
      msgCd: meta.msgCd,
      msg1: meta.msg1,
      errorMessage: success ? null : fallbackMessage,
      errorDetail: success ? null : response.errorDetail,
      diagnosisCategory: diagnosed.category,
      diagnosisDescription: diagnosed.description
    }
  };
}

async function checkKisQuote(
  code: string,
  env: {
    appKey: string | undefined;
    appSecret: string | undefined;
    baseUrl: string | undefined;
    isMockEndpoint: boolean;
  },
  accessToken: string | null
): Promise<SourceCheckResult> {
  if (!(typeof accessToken === "string" && isNonEmpty(accessToken))) {
    const baseFailure: SourceCheckResult = {
      success: false,
      price: null,
      status: null,
      updatedAt: null,
      referenceDate: null,
      errorMessage: "token 발급 실패로 현재가 조회를 진행하지 못했습니다.",
      errorDetail: null,
      rtCd: null,
      msgCd: null,
      msg1: null,
      diagnosisCategory: null,
      diagnosisDescription: null,
      showFetchHint: false
    };
    const diagnosed = classifyFailure(baseFailure, { isKisVts: env.isMockEndpoint });
    return {
      ...baseFailure,
      diagnosisCategory: diagnosed.category,
      diagnosisDescription: diagnosed.description,
      showFetchHint: diagnosed.showFetchHint
    };
  }

  if (!isNonEmpty(env.appKey) || !isNonEmpty(env.appSecret) || !isNonEmpty(env.baseUrl)) {
    const baseFailure: SourceCheckResult = {
      success: false,
      price: null,
      status: null,
      updatedAt: null,
      referenceDate: null,
      errorMessage: "KIS 환경변수 미설정",
      errorDetail: null,
      rtCd: null,
      msgCd: null,
      msg1: null,
      diagnosisCategory: null,
      diagnosisDescription: null,
      showFetchHint: false
    };
    const diagnosed = classifyFailure(baseFailure, { isKisVts: env.isMockEndpoint });
    return {
      ...baseFailure,
      diagnosisCategory: diagnosed.category,
      diagnosisDescription: diagnosed.description,
      showFetchHint: diagnosed.showFetchHint
    };
  }

  const baseUrl = env.baseUrl!.trim().replace(/\/+$/, "");
  const quoteUrl = `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${encodeURIComponent(
    code
  )}`;

  const response = await fetchJson(quoteUrl, {
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

  const meta = parseKisMeta(response.json);
  const responseObj =
    response.json && typeof response.json === "object" ? (response.json as Record<string, unknown>) : null;
  const output =
    responseObj && typeof responseObj.output === "object" && responseObj.output !== null
      ? (responseObj.output as Record<string, unknown>)
      : null;

  const price = toNumber(output?.stck_prpr);
  const updatedAt = formatCntgHour(output?.stck_cntg_hour);
  const referenceDate = formatBasDt(output?.stck_bsop_date);
  const success = !!response.status && response.status < 400 && Number.isFinite(price ?? NaN) && (price ?? 0) > 0;
  const fallbackMessage =
    meta.msg1 ?? response.errorMessage ?? response.errorDetail ?? response.text ?? "현재가 조회 실패";

  const baseResult: SourceCheckResult = {
    success,
    price: success ? price : null,
    status: response.status,
    updatedAt,
    referenceDate,
    errorMessage: success ? null : fallbackMessage,
    errorDetail: success ? null : response.errorDetail,
    rtCd: meta.rtCd,
    msgCd: meta.msgCd,
    msg1: meta.msg1,
    diagnosisCategory: null,
    diagnosisDescription: null,
    showFetchHint: false
  };
  const diagnosed = classifyFailure(baseResult, { isKisVts: env.isMockEndpoint });

  return {
    ...baseResult,
    diagnosisCategory: diagnosed.category,
    diagnosisDescription: diagnosed.description,
    showFetchHint: diagnosed.showFetchHint
  };
}

async function checkDataGoClose(code: string, apiKey: string | undefined): Promise<SourceCheckResult> {
  if (!apiKeyExists(apiKey)) {
    const baseResult: SourceCheckResult = {
      success: false,
      price: null,
      status: null,
      updatedAt: null,
      referenceDate: null,
      errorMessage: "DATA_GO_KR_API_KEY 미설정",
      errorDetail: null,
      rtCd: null,
      msgCd: null,
      msg1: null,
      diagnosisCategory: null,
      diagnosisDescription: null,
      showFetchHint: false
    };
    const diagnosed = classifyFailure(baseResult);
    return {
      ...baseResult,
      diagnosisCategory: diagnosed.category,
      diagnosisDescription: diagnosed.description,
      showFetchHint: diagnosed.showFetchHint
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
  const resultCode = asString(header?.resultCode);
  const resultMsg = asString(header?.resultMsg);

  if (!response.status || response.status >= 400) {
    const baseResult: SourceCheckResult = {
      success: false,
      price: null,
      status: response.status,
      updatedAt: null,
      referenceDate: null,
      errorMessage: response.errorMessage ?? response.text ?? "HTTP 오류",
      errorDetail: response.errorDetail,
      rtCd: resultCode,
      msgCd: null,
      msg1: resultMsg,
      diagnosisCategory: null,
      diagnosisDescription: null,
      showFetchHint: false
    };
    const diagnosed = classifyFailure(baseResult);
    return {
      ...baseResult,
      diagnosisCategory: diagnosed.category,
      diagnosisDescription: diagnosed.description,
      showFetchHint: diagnosed.showFetchHint
    };
  }

  if (resultCode && resultCode !== "00") {
    const baseResult: SourceCheckResult = {
      success: false,
      price: null,
      status: response.status,
      updatedAt: null,
      referenceDate: null,
      errorMessage: resultMsg || `resultCode=${resultCode}`,
      errorDetail: response.errorDetail,
      rtCd: resultCode,
      msgCd: null,
      msg1: resultMsg,
      diagnosisCategory: null,
      diagnosisDescription: null,
      showFetchHint: false
    };
    const diagnosed = classifyFailure(baseResult);
    return {
      ...baseResult,
      diagnosisCategory: diagnosed.category,
      diagnosisDescription: diagnosed.description,
      showFetchHint: diagnosed.showFetchHint
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
    .filter((row) => (asString(row.srtnCd) ?? "") === code)
    .sort((a, b) => {
      const left = asString(a.basDt) ?? "";
      const right = asString(b.basDt) ?? "";
      return right.localeCompare(left);
    });

  const latest = normalizedRows[0];
  const close = toNumber(latest?.clpr);
  const referenceDate = formatBasDt(latest?.basDt);
  const success = !!latest && Number.isFinite(close ?? NaN) && (close ?? 0) > 0;

  const baseResult: SourceCheckResult = {
    success,
    price: success ? close : null,
    status: response.status,
    updatedAt: null,
    referenceDate,
    errorMessage: success ? null : "최근 종가 데이터 없음",
    errorDetail: success ? null : response.errorDetail,
    rtCd: resultCode,
    msgCd: null,
    msg1: resultMsg,
    diagnosisCategory: null,
    diagnosisDescription: null,
    showFetchHint: false
  };
  const diagnosed = classifyFailure(baseResult);

  return {
    ...baseResult,
    diagnosisCategory: diagnosed.category,
    diagnosisDescription: diagnosed.description,
    showFetchHint: diagnosed.showFetchHint
  };
}

function evaluateFinalSource(kis: SourceCheckResult, dataGo: SourceCheckResult) {
  const kisPriceValid = Number.isFinite(kis.price ?? NaN) && (kis.price ?? 0) > 0;
  const closePriceValid = Number.isFinite(dataGo.price ?? NaN) && (dataGo.price ?? 0) > 0;
  if (kisPriceValid) return "현재가: KIS";
  if (closePriceValid) return "현재가 확인 불가 + 최근 종가: data.go.kr";
  return "데이터 없음";
}

function getUserDisplayMessage(kis: SourceCheckResult, dataGo: SourceCheckResult) {
  const kisValid = Number.isFinite(kis.price ?? NaN) && (kis.price ?? 0) > 0;
  const dataGoValid = Number.isFinite(dataGo.price ?? NaN) && (dataGo.price ?? 0) > 0;
  if (kisValid) return "현재가는 KIS 기준으로 표시됩니다.";
  if (dataGoValid) return "현재가 확인 불가 상태로, 최근 종가(data.go.kr 기준)를 참고 정보로 표시합니다.";
  return "현재 표시 가능한 시세 데이터가 없습니다. 하지만 페이지는 정상적으로 동작합니다.";
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
  if (gapRate > 0.5) return { gapRate, gapStatusText: "데이터 검증 필요" };
  if (gapRate > 0.3) return { gapRate, gapStatusText: "가격 확인 필요" };
  return { gapRate, gapStatusText: "정상 범위" };
}

function getEndpointTypeLabel(baseUrl: string) {
  if (baseUrl.includes("openapivts.koreainvestment.com:29443")) return "모의 endpoint" as const;
  if (baseUrl.includes("openapi.koreainvestment.com:9443")) return "실전 endpoint" as const;
  return "사용자 지정 endpoint" as const;
}

function buildEndpointWarning(baseUrl: string, token: KisEndpointStep, quoteProbe: KisEndpointStep) {
  const isVts = baseUrl.includes("openapivts.koreainvestment.com:29443");
  const hasFailure = !token.success || !quoteProbe.success;
  if (isVts && hasFailure) {
    return "KIS 모의투자 endpoint 또는 29443 포트 접근이 현재 환경에서 실패했습니다. 실전 endpoint 사용 가능 여부를 확인해주세요.";
  }
  if (token.status === 401 || token.status === 403 || quoteProbe.status === 401 || quoteProbe.status === 403) {
    return "KIS App Key / Secret 또는 API 신청 권한을 확인해주세요.";
  }
  if (token.status === 500 || quoteProbe.status === 500) {
    return "KIS 서버 응답 오류 또는 해당 종목/endpoint 미지원 가능성이 있습니다.";
  }
  return null;
}

export async function getMarketDataDebugSnapshot(
  targets: DebugStockTarget[] = DEFAULT_TARGET_STOCKS
): Promise<MarketDataDebugSnapshot> {
  const realtimeProvider = process.env.REALTIME_STOCK_PROVIDER?.trim() ?? "";
  const stockDataProvider = process.env.STOCK_DATA_PROVIDER?.trim() ?? "";
  const kisAppKey = process.env.KIS_APP_KEY;
  const kisAppSecret = process.env.KIS_APP_SECRET;
  const kisBaseUrl = process.env.KIS_BASE_URL?.trim() ?? "";
  const dataGoApiKey = process.env.DATA_GO_KR_API_KEY;
  const isMockEndpoint = kisBaseUrl.includes("openapivts.koreainvestment.com:29443");

  const tokenResult = await checkKisToken({
    appKey: kisAppKey,
    appSecret: kisAppSecret,
    baseUrl: kisBaseUrl,
    isMockEndpoint
  });

  const safeTargets = Array.isArray(targets) ? targets : [];
  const stocks = await Promise.all(
    safeTargets.map(async (stock) => {
      const kis = await checkKisQuote(
        stock.code,
        {
          appKey: kisAppKey,
          appSecret: kisAppSecret,
          baseUrl: kisBaseUrl,
          isMockEndpoint
        },
        tokenResult.accessToken
      );
      const dataGo = await checkDataGoClose(stock.code, dataGoApiKey);
      const gap = getGapInfo(kis, dataGo);
      return {
        code: stock.code,
        name: stock.name,
        kis,
        dataGo,
        finalSourceText: evaluateFinalSource(kis, dataGo),
        userDisplayMessage: getUserDisplayMessage(kis, dataGo),
        gapRate: gap.gapRate,
        gapStatusText: gap.gapStatusText
      } satisfies MarketDataResult;
    })
  );

  const quoteProbeTarget = safeTargets[0];
  const probeQuote = quoteProbeTarget
    ? stocks.find((item) => item.code === quoteProbeTarget.code)?.kis
    : null;

  const quoteProbe: KisEndpointStep = {
    success: probeQuote?.success ?? false,
    status: probeQuote?.status ?? null,
    rtCd: probeQuote?.rtCd ?? null,
    msgCd: probeQuote?.msgCd ?? null,
    msg1: probeQuote?.msg1 ?? null,
    errorMessage: probeQuote?.errorMessage ?? "quote 진단 데이터 없음",
    errorDetail: probeQuote?.errorDetail ?? null,
    diagnosisCategory: probeQuote?.diagnosisCategory ?? "알 수 없는 오류",
    diagnosisDescription: probeQuote?.diagnosisDescription ?? "quote 진단 데이터 없음"
  };

  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const totalRequests = safeStocks.length * 2;
  const failedRequests = safeStocks.reduce((count, item) => {
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

  const endpointWarning = buildEndpointWarning(kisBaseUrl, tokenResult.step, quoteProbe);

  return {
    generatedAt: new Date().toISOString(),
    pageStatusText: "정상",
    requestStatusText,
    pageStatusDescription,
    envStatus: {
      realtimeProvider,
      stockDataProvider,
      kisAppKeyExists: apiKeyExists(kisAppKey),
      kisAppSecretExists: apiKeyExists(kisAppSecret),
      kisBaseUrl: kisBaseUrl || "미설정",
      dataGoApiKeyExists: apiKeyExists(dataGoApiKey)
    },
    kisEndpointDiagnosis: {
      baseUrl: kisBaseUrl || "미설정",
      isMockEndpoint,
      endpointTypeLabel: getEndpointTypeLabel(kisBaseUrl),
      token: tokenResult.step,
      quoteProbe,
      endpointWarning
    },
    stocks: safeStocks,
    footerNote: "KIS는 현재가 기준이며, data.go.kr는 일별 종가 기준입니다."
  };
}
