import type { Metadata } from "next";

import { formatKRW } from "@/lib/format";
import { resolveStockDisplayPrice } from "@/lib/market/price-resolver";
import { getStockDetailFromDataGoKr } from "@/lib/providers/data-go-kr";
import { diagnoseExternalReferenceQuote } from "@/lib/providers/external-reference";
import {
  diagnoseKisCurrentQuote,
  getKisEnvironmentDiagnostic
} from "@/lib/providers/kis";
import {
  getKoreaStockApiSource,
  getStockDataProviderMode
} from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "INTERNAL DEBUG PAGE | KRX Insight",
  description: "KRX Insight current price source diagnostics for KIS, external references, and data.go.kr.",
  robots: {
    index: false,
    follow: false
  }
};

const DEBUG_PAGE_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.ENABLE_DEBUG_PAGE === "true" ||
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_PAGE === "true";

const DIAGNOSTIC_STOCKS = [
  { symbol: "005930", stockName: "삼성전자", market: "KOSPI" },
  { symbol: "000660", stockName: "SK하이닉스", market: "KOSPI" },
  { symbol: "035420", stockName: "NAVER", market: "KOSPI" }
] as const;

function formatDateTime(value: string | null | undefined) {
  if (!value) return "정보 없음";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(parsed);
}

function safeCurrency(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? formatKRW(value as number) : "정보 없음";
}

function safeText(value: string | null | undefined) {
  if (typeof value !== "string") return "정보 없음";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "정보 없음";
}

function booleanLabel(value: boolean) {
  return value ? "예" : "아니오";
}

function stringifyRaw(value: unknown) {
  if (value === null || value === undefined) return "정보 없음";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getUsedFallbackReason(params: {
  kis: Awaited<ReturnType<typeof diagnoseKisCurrentQuote>>;
  resolvedPrice: ReturnType<typeof resolveStockDisplayPrice>;
  recentClose: Awaited<ReturnType<typeof getRecentCloseDiagnostic>>;
}) {
  const { kis, resolvedPrice, recentClose } = params;

  if (resolvedPrice.priceKind === "kis_current") {
    return "KIS 현재가가 정상적으로 사용되었습니다.";
  }

  if (resolvedPrice.priceKind === "external_reference") {
    return "KIS 현재가를 사용할 수 없어 외부 참고 현재가를 사용했습니다.";
  }

  if (resolvedPrice.priceKind === "recent_close") {
    if (kis.tokenStatus !== "success") {
      return `KIS token 단계가 ${kis.tokenStatus} 상태여서 data.go.kr 최근 종가로 fallback 되었습니다.`;
    }

    if (kis.quoteStatus !== "success") {
      const quoteReason = kis.errorMessage || kis.noDataReason || "quote unavailable";
      return `KIS quote 단계가 ${kis.quoteStatus} 상태여서 data.go.kr 최근 종가로 fallback 되었습니다. (${quoteReason})`;
    }

    return "KIS 현재가가 확인되지 않아 data.go.kr 최근 종가가 사용되었습니다.";
  }

  if (recentClose.status !== "success") {
    return "KIS 현재가와 data.go.kr 최근 종가를 모두 확인하지 못해 가격 데이터를 표시하지 않았습니다.";
  }

  return "가격 판단 사유를 확인 중입니다.";
}

async function getRecentCloseDiagnostic(symbol: string) {
  try {
    const detail = await getStockDetailFromDataGoKr(symbol);
    if (!detail || !Number.isFinite(detail.price) || detail.price <= 0) {
      return {
        status: "no_data" as const,
        recentClose: null,
        baseDate: detail?.date ?? null,
        source: "none" as const,
        onlyRecentClose: true as const,
        errorMessage: null
      };
    }

    return {
      status: "success" as const,
      recentClose: detail.price,
      baseDate: detail.date ?? null,
      source: "data.go.kr" as const,
      onlyRecentClose: true as const,
      errorMessage: null
    };
  } catch (error) {
    return {
      status: "error" as const,
      recentClose: null,
      baseDate: null,
      source: "none" as const,
      onlyRecentClose: true as const,
      errorMessage: error instanceof Error ? error.message : "Failed to fetch recent close."
    };
  }
}

export default async function MarketDataDebugPage() {
  if (!DEBUG_PAGE_ENABLED) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold uppercase tracking-normal text-amber-700 dark:text-amber-300">
            INTERNAL DEBUG PAGE
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white">
            진단 페이지가 비활성화되었습니다.
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            운영자 진단용 페이지입니다. 현재 공개 환경에서는 비활성화되어 있습니다.
          </p>
        </section>
      </main>
    );
  }

  const providerMode = getStockDataProviderMode();
  const apiSource = getKoreaStockApiSource();
  const kisEnvironment = getKisEnvironmentDiagnostic();

  const stocks = await Promise.all(
    DIAGNOSTIC_STOCKS.map(async ({ symbol, stockName, market }) => {
      const [kis, external, recentClose] = await Promise.all([
        diagnoseKisCurrentQuote(symbol),
        diagnoseExternalReferenceQuote(symbol),
        getRecentCloseDiagnostic(symbol)
      ]);

      const resolvedPrice = resolveStockDisplayPrice({
        symbol,
        market,
        kisQuote:
          kis.quoteStatus === "success" && Number.isFinite(kis.parsedPrice ?? NaN) && (kis.parsedPrice ?? 0) > 0
            ? {
                price: kis.parsedPrice,
                updatedAt: kis.updatedAt,
                asOf: kis.updatedAt
              }
            : null,
        kisQuoteSource: kis.source === "KIS" ? "KIS" : "none",
        dailyClose:
          recentClose.status === "success" &&
          Number.isFinite(recentClose.recentClose ?? NaN) &&
          (recentClose.recentClose ?? 0) > 0
            ? {
                price: recentClose.recentClose,
                baseDate: recentClose.baseDate,
                updatedAt: recentClose.baseDate,
                asOf: recentClose.baseDate
              }
            : null,
        dailyCloseSource: recentClose.status === "success" ? "data.go.kr" : "none",
        cachedPrice: recentClose.status === "success" ? recentClose.recentClose : null,
        cachedPriceSource: recentClose.status === "success" ? "cache" : "none"
      });

      return {
        symbol,
        stockName,
        kis,
        external,
        recentClose,
        resolvedPrice,
        usedFallbackReason: getUsedFallbackReason({ kis, resolvedPrice, recentClose })
      };
    })
  );

  const tokenIssuedAtValues = stocks
    .map((stock) => stock.kis.tokenCache.lastIssuedAtIso)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const sharedTokenReused =
    tokenIssuedAtValues.length === DIAGNOSTIC_STOCKS.length &&
    new Set(tokenIssuedAtValues).size === 1;
  const kisNetwork = stocks[0]?.kis ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-soft dark:border-amber-900/60 dark:bg-dark-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-normal text-amber-700 dark:text-amber-300">INTERNAL DEBUG PAGE</p>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            운영자 진단용 페이지입니다.
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white">Current Price Source Diagnostic</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          현재 사용자 페이지 가격 표시 규칙은 그대로 유지한 상태에서, KIS 현재가 / 외부 참고가 / data.go.kr 최근
          종가의 상태만 진단합니다.
        </p>
        <div className="mt-4 grid gap-2 text-sm font-semibold sm:grid-cols-2">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            STOCK_DATA_PROVIDER: {providerMode}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            KOREA_STOCK_API_SOURCE: {apiSource}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">KIS Network Diagnostics</p>
        <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">KIS endpoint / environment check</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
            <p className="text-xs font-bold uppercase tracking-normal text-brand">Environment</p>
            <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex justify-between gap-3">
                <dt>KIS_BASE_URL configured</dt>
                <dd>{booleanLabel(kisEnvironment.baseUrlConfigured)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>KIS_BASE_URL</dt>
                <dd className="text-right break-all">{kisEnvironment.baseUrl}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>KIS_APP_KEY</dt>
                <dd>{safeText(kisEnvironment.appKeyMasked)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>KIS_APP_SECRET</dt>
                <dd>{safeText(kisEnvironment.appSecretMasked)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>NODE_ENV</dt>
                <dd>{safeText(kisEnvironment.nodeEnv)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>VERCEL</dt>
                <dd>{booleanLabel(kisEnvironment.vercel)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>VERCEL_ENV</dt>
                <dd>{safeText(kisEnvironment.vercelEnv)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
            <p className="text-xs font-bold uppercase tracking-normal text-brand">Token endpoint</p>
            <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex justify-between gap-3">
                <dt>baseUrl</dt>
                <dd className="text-right break-all">{safeText(kisNetwork?.baseUrl)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>tokenEndpoint</dt>
                <dd className="text-right break-all">{safeText(kisNetwork?.tokenEndpoint)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>tokenStatus</dt>
                <dd>{safeText(kisNetwork?.tokenStatus)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>tokenSource</dt>
                <dd>{safeText(kisNetwork?.tokenSource)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>hasPersistentToken</dt>
                <dd>{booleanLabel(Boolean(kisNetwork?.hasPersistentToken))}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>persistentTokenExpiresAt</dt>
                <dd>{formatDateTime(kisNetwork?.persistentTokenExpiresAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>tokenRequestMethod</dt>
                <dd>{safeText(kisNetwork?.tokenRequestMethod)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>elapsedMs</dt>
                <dd>
                  {typeof kisNetwork?.tokenElapsedMs === "number" ? `${kisNetwork.tokenElapsedMs}ms` : "정보 없음"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>httpStatus</dt>
                <dd>{typeof kisNetwork?.tokenHttpStatus === "number" ? kisNetwork.tokenHttpStatus : "정보 없음"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>tokenErrorType</dt>
                <dd>{safeText(kisNetwork?.tokenErrorType)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>lastTokenRequestAt</dt>
                <dd>{formatDateTime(kisNetwork?.lastTokenRequestAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>nextAllowedTokenRequestAt</dt>
                <dd>{formatDateTime(kisNetwork?.nextAllowedTokenRequestAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>sharedTokenReused</dt>
                <dd>{booleanLabel(sharedTokenReused)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>errorMessage</dt>
                <dd className="text-right break-words">{safeText(kisNetwork?.tokenErrorMessage)}</dd>
              </div>
            </dl>
            <details className="mt-3 rounded-md border border-line bg-white/70 p-3 text-xs dark:border-dark-line dark:bg-slate-950/40">
              <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">
                response keys
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-500 dark:text-slate-400">
                {stringifyRaw(kisNetwork?.tokenResponseKeys ?? [])}
              </pre>
            </details>
          </section>
        </div>
      </section>

      <section className="mt-4 grid gap-4">
        {stocks.map(({ symbol, stockName, kis, external, recentClose, resolvedPrice, usedFallbackReason }) => (
          <article
            key={symbol}
            className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink dark:text-white">
                  {stockName} · {symbol}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  최종 resolver 결과는 현재 사용자 페이지와 동일한 주가격 규칙을 기준으로 계산됩니다.
                </p>
              </div>
              <div className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300">
                priceKind: {resolvedPrice.priceKind}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">KIS current quote</p>
                <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <dt>KIS App Key</dt>
                    <dd>{booleanLabel(kis.appKeyConfigured)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>KIS App Secret</dt>
                    <dd>{booleanLabel(kis.appSecretConfigured)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Base URL</dt>
                    <dd className="text-right break-all">{kis.baseUrl}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token status</dt>
                    <dd>{kis.tokenStatus}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token method</dt>
                    <dd>{kis.tokenRequestMethod}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token endpoint</dt>
                    <dd className="text-right break-all">{kis.tokenEndpoint}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token source</dt>
                    <dd>{kis.tokenSource}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>hasPersistentToken</dt>
                    <dd>{booleanLabel(kis.hasPersistentToken)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>persistentTokenExpiresAt</dt>
                    <dd>{formatDateTime(kis.persistentTokenExpiresAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token error type</dt>
                    <dd>{safeText(kis.tokenErrorType)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token expiresAt</dt>
                    <dd>{formatDateTime(kis.tokenExpiresAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>lastTokenRequestAt</dt>
                    <dd>{formatDateTime(kis.lastTokenRequestAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>nextAllowedTokenRequestAt</dt>
                    <dd>{formatDateTime(kis.nextAllowedTokenRequestAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>sharedTokenReused</dt>
                    <dd>{booleanLabel(sharedTokenReused)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token elapsedMs</dt>
                    <dd>{typeof kis.tokenElapsedMs === "number" ? `${kis.tokenElapsedMs}ms` : "정보 없음"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>token httpStatus</dt>
                    <dd>{typeof kis.tokenHttpStatus === "number" ? kis.tokenHttpStatus : "정보 없음"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>quote status</dt>
                    <dd>{kis.quoteStatus}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>request symbol</dt>
                    <dd>{safeText(kis.requestSymbol)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>requestUrlPath</dt>
                    <dd className="text-right break-all">{safeText(kis.requestUrlPath)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>has FID_COND_MRKT_DIV_CODE</dt>
                    <dd>{booleanLabel(kis.hasMarketDivCodeParam)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>has FID_INPUT_ISCD</dt>
                    <dd>{booleanLabel(kis.hasInputIscdParam)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>TR ID</dt>
                    <dd>{safeText(kis.trId)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>quote httpStatus</dt>
                    <dd>{typeof kis.quoteHttpStatus === "number" ? kis.quoteHttpStatus : "정보 없음"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>raw price</dt>
                    <dd>{safeText(kis.rawPrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>parsed price</dt>
                    <dd>{safeCurrency(kis.parsedPrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>source</dt>
                    <dd>{kis.source}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>updatedAt</dt>
                    <dd>{formatDateTime(kis.updatedAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>no data reason</dt>
                    <dd>{safeText(kis.noDataReason)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>rt_cd</dt>
                    <dd>{safeText(kis.rawRtCd)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>msg_cd</dt>
                    <dd>{safeText(kis.rawMsgCd)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>msg1</dt>
                    <dd className="text-right break-words">{safeText(kis.rawMsg1)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>error code</dt>
                    <dd>{safeText(kis.errorCode ?? kis.tokenErrorCode)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>error message</dt>
                    <dd className="text-right break-words">{safeText(kis.tokenErrorMessage ?? kis.errorMessage)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>quote error</dt>
                    <dd className="text-right break-words">{safeText(kis.errorMessage)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>cooldown issue</dt>
                    <dd>{booleanLabel(kis.quoteLikelyCooldownIssue || kis.tokenLikelyCooldownIssue)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>permission issue</dt>
                    <dd>{booleanLabel(kis.quoteLikelyPermissionIssue || kis.tokenLikelyPermissionIssue)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>endpoint issue</dt>
                    <dd>{booleanLabel(kis.quoteLikelyEndpointIssue || kis.tokenLikelyEndpointIssue)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>mock account issue</dt>
                    <dd>{booleanLabel(kis.quoteLikelyMockAccountIssue || kis.tokenLikelyMockAccountIssue)}</dd>
                  </div>
                </dl>
                <details className="mt-3 rounded-md border border-line bg-white/70 p-3 text-xs dark:border-dark-line dark:bg-slate-950/40">
                  <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">
                    raw response keys / price candidate fields
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-500 dark:text-slate-400">
                    {stringifyRaw({
                      rawResponseKeys: kis.rawResponseKeys,
                      rawPriceCandidateFields: kis.rawPriceCandidateFields,
                      tokenResponseKeys: kis.tokenResponseKeys,
                      tokenCache: kis.tokenCache,
                      quoteCache: kis.quoteCache
                    })}
                  </pre>
                </details>
              </section>

              <section className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">External reference quote</p>
                <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <dt>enabled</dt>
                    <dd>{booleanLabel(external.enabled)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>status</dt>
                    <dd>{external.status}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>source</dt>
                    <dd>{external.source}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>attempted symbols</dt>
                    <dd className="text-right break-all">
                      {external.attemptedSymbols.length > 0 ? external.attemptedSymbols.join(", ") : "정보 없음"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>parsed price</dt>
                    <dd>{safeCurrency(external.price)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>updatedAt</dt>
                    <dd>{formatDateTime(external.updatedAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>error</dt>
                    <dd className="text-right break-words">{safeText(external.errorMessage)}</dd>
                  </div>
                </dl>
                <details className="mt-3 rounded-md border border-line bg-white/70 p-3 text-xs dark:border-dark-line dark:bg-slate-950/40">
                  <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">
                    raw response
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-500 dark:text-slate-400">
                    {stringifyRaw(external.rawResponse)}
                  </pre>
                </details>
                <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  외부 참고가는 진단 전용이며, KIS 공식 현재가로 표시되지 않습니다.
                </p>
              </section>

              <section className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">data.go.kr recent close</p>
                <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <dt>status</dt>
                    <dd>{recentClose.status}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>recent close</dt>
                    <dd>{safeCurrency(recentClose.recentClose)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>baseDate</dt>
                    <dd>{safeText(recentClose.baseDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>source</dt>
                    <dd>{recentClose.source}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>only recent close</dt>
                    <dd>{booleanLabel(recentClose.onlyRecentClose)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>note</dt>
                    <dd className="text-right">최근 종가 전용이며 현재가로 사용하면 안 됩니다.</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>error</dt>
                    <dd className="text-right break-words">{safeText(recentClose.errorMessage)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">Final resolvedPrice result</p>
                <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <div className="flex justify-between gap-3">
                    <dt>priceKind</dt>
                    <dd>{resolvedPrice.priceKind}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>displayPrice</dt>
                    <dd>{safeCurrency(resolvedPrice.displayPrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>labelKo</dt>
                    <dd>{resolvedPrice.labelKo}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>basisKo</dt>
                    <dd>{resolvedPrice.basisKo}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>warningKo</dt>
                    <dd className="text-right break-words">{safeText(resolvedPrice.warningKo)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>aiConfidence</dt>
                    <dd>{resolvedPrice.aiConfidence}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>reason</dt>
                    <dd className="text-right break-words">{resolvedPrice.reason}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>usedFallbackReason</dt>
                    <dd className="text-right break-words">{usedFallbackReason}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
