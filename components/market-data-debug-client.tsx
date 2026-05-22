"use client";

import { useMemo, useState } from "react";

import { formatKRW, formatPercent } from "@/lib/format";
import type { MarketDataDebugSnapshot, SourceCheckResult } from "@/lib/market-data-debug";

type Props = {
  initialSnapshot: MarketDataDebugSnapshot;
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "확인 불가";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(parsed);
}

function safeValue(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? (value as number) : null;
}

function renderErrorInfo(result: SourceCheckResult) {
  if (result.success) {
    return <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">정상 응답</p>;
  }

  return (
    <div className="mt-1 space-y-1">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">
        {result.diagnosisCategory ?? "알 수 없는 오류"}
      </p>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {result.diagnosisDescription ?? result.errorMessage ?? "오류 메시지 없음"}
      </p>
      {result.errorDetail ? (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">상세: {result.errorDetail}</p>
      ) : null}
      {result.showFetchHint ? (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          로컬 개발 환경에서 외부 API 연결이 차단되었을 수 있습니다. Vercel 배포 환경에서 다시 확인해주세요.
        </p>
      ) : null}
    </div>
  );
}

export function MarketDataDebugClient({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState<MarketDataDebugSnapshot>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const safeStocks = useMemo(
    () => (Array.isArray(snapshot.stocks) ? snapshot.stocks : []),
    [snapshot.stocks]
  );

  const handleReload = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/debug/market-data", { method: "GET", cache: "no-store" });
      if (!response.ok) {
        const errorText = await response.text();
        setStatusMessage(`재검사 실패: ${errorText.slice(0, 180)}`);
        return;
      }

      const payload = (await response.json()) as MarketDataDebugSnapshot;
      if (!payload || !Array.isArray(payload.stocks)) {
        setStatusMessage("재검사 실패: 응답 형식을 확인할 수 없습니다.");
        return;
      }

      setSnapshot(payload);
      setStatusMessage("KIS 연결 재검사가 완료되었습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? `재검사 실패: ${error.message}` : "재검사 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDiagnosis = async () => {
    setStatusMessage(null);

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        setStatusMessage("진단 결과 복사에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      const lines: string[] = [];
      lines.push("[데이터 소스 상태 진단]");
      lines.push(`생성 시각: ${formatDateTime(snapshot.generatedAt)}`);
      lines.push(`페이지 상태: ${snapshot.pageStatusText}`);
      lines.push(`데이터 요청 상태: ${snapshot.requestStatusText}`);
      lines.push(`설명: ${snapshot.pageStatusDescription}`);
      lines.push("");
      lines.push("[환경 상태]");
      lines.push(`REALTIME_STOCK_PROVIDER: ${snapshot.envStatus.realtimeProvider || "미설정"}`);
      lines.push(`STOCK_DATA_PROVIDER: ${snapshot.envStatus.stockDataProvider || "미설정"}`);
      lines.push(`KIS_BASE_URL: ${snapshot.envStatus.kisBaseUrl}`);
      lines.push(`KIS_APP_KEY exists: ${snapshot.envStatus.kisAppKeyExists ? "true" : "false"}`);
      lines.push(`KIS_APP_SECRET exists: ${snapshot.envStatus.kisAppSecretExists ? "true" : "false"}`);
      lines.push(`DATA_GO_KR_API_KEY exists: ${snapshot.envStatus.dataGoApiKeyExists ? "true" : "false"}`);
      lines.push("");
      lines.push("[KIS Endpoint 진단]");
      lines.push(`endpoint 유형: ${snapshot.kisEndpointDiagnosis.endpointTypeLabel}`);
      lines.push(`모의 endpoint 여부: ${snapshot.kisEndpointDiagnosis.isMockEndpoint ? "예" : "아니오"}`);
      lines.push(
        `KIS token 상태: ${snapshot.kisEndpointDiagnosis.token.success ? "성공" : "실패"} (HTTP ${
          snapshot.kisEndpointDiagnosis.token.status ?? "N/A"
        })`
      );
      lines.push(
        `KIS token rt_cd/msg_cd/msg1: ${snapshot.kisEndpointDiagnosis.token.rtCd ?? "N/A"} / ${
          snapshot.kisEndpointDiagnosis.token.msgCd ?? "N/A"
        } / ${snapshot.kisEndpointDiagnosis.token.msg1 ?? "N/A"}`
      );
      lines.push(
        `KIS token 오류 분류: ${snapshot.kisEndpointDiagnosis.token.diagnosisCategory ?? "정상 응답"}`
      );
      lines.push(
        `KIS token 오류 내용: ${
          snapshot.kisEndpointDiagnosis.token.diagnosisDescription ??
          snapshot.kisEndpointDiagnosis.token.errorMessage ??
          "N/A"
        }`
      );
      if (snapshot.kisEndpointDiagnosis.token.errorDetail) {
        lines.push(`KIS token 오류 상세: ${snapshot.kisEndpointDiagnosis.token.errorDetail}`);
      }
      lines.push(
        `KIS quote 상태: ${snapshot.kisEndpointDiagnosis.quoteProbe.success ? "성공" : "실패"} (HTTP ${
          snapshot.kisEndpointDiagnosis.quoteProbe.status ?? "N/A"
        })`
      );
      lines.push(
        `KIS quote rt_cd/msg_cd/msg1: ${snapshot.kisEndpointDiagnosis.quoteProbe.rtCd ?? "N/A"} / ${
          snapshot.kisEndpointDiagnosis.quoteProbe.msgCd ?? "N/A"
        } / ${snapshot.kisEndpointDiagnosis.quoteProbe.msg1 ?? "N/A"}`
      );
      lines.push(
        `KIS quote 오류 분류: ${snapshot.kisEndpointDiagnosis.quoteProbe.diagnosisCategory ?? "정상 응답"}`
      );
      lines.push(
        `KIS quote 오류 내용: ${
          snapshot.kisEndpointDiagnosis.quoteProbe.diagnosisDescription ??
          snapshot.kisEndpointDiagnosis.quoteProbe.errorMessage ??
          "N/A"
        }`
      );
      if (snapshot.kisEndpointDiagnosis.quoteProbe.errorDetail) {
        lines.push(`KIS quote 오류 상세: ${snapshot.kisEndpointDiagnosis.quoteProbe.errorDetail}`);
      }
      if (snapshot.kisEndpointDiagnosis.endpointWarning) {
        lines.push(`KIS endpoint 경고: ${snapshot.kisEndpointDiagnosis.endpointWarning}`);
      }
      lines.push("");
      lines.push("[종목별 결과]");
      safeStocks.forEach((stock) => {
        const kisPrice = safeValue(stock.kis.price);
        const closePrice = safeValue(stock.dataGo.price);
        const gapRate = safeValue(stock.gapRate);

        lines.push(`- ${stock.name} (${stock.code})`);
        lines.push(
          `  KIS token 상태: ${snapshot.kisEndpointDiagnosis.token.success ? "성공" : "실패"} (HTTP ${
            snapshot.kisEndpointDiagnosis.token.status ?? "N/A"
          })`
        );
        lines.push(`  KIS quote 상태: ${stock.kis.success ? "성공" : "실패"} (HTTP ${stock.kis.status ?? "N/A"})`);
        lines.push(
          `  KIS 현재가: ${kisPrice !== null ? formatKRW(kisPrice) : "데이터 없음"} | updatedAt ${
            stock.kis.updatedAt ?? "확인 불가"
          }`
        );
        lines.push(
          `  KIS rt_cd/msg_cd/msg1: ${stock.kis.rtCd ?? "N/A"} / ${stock.kis.msgCd ?? "N/A"} / ${
            stock.kis.msg1 ?? "N/A"
          }`
        );
        lines.push(`  KIS 오류 분류: ${stock.kis.diagnosisCategory ?? "정상 응답"}`);
        if (stock.kis.diagnosisDescription) {
          lines.push(`  KIS 오류 내용: ${stock.kis.diagnosisDescription}`);
        }
        if (stock.kis.errorDetail) {
          lines.push(`  KIS 오류 상세: ${stock.kis.errorDetail}`);
        }
        lines.push(
          `  data.go.kr 상태: ${stock.dataGo.success ? "성공" : "실패"} (HTTP ${stock.dataGo.status ?? "N/A"})`
        );
        lines.push(
          `  최근 종가: ${closePrice !== null ? formatKRW(closePrice) : "데이터 없음"} | 기준일 ${
            stock.dataGo.referenceDate ?? "확인 불가"
          }`
        );
        lines.push(`  data.go 오류 분류: ${stock.dataGo.diagnosisCategory ?? "정상 응답"}`);
        if (stock.dataGo.diagnosisDescription) {
          lines.push(`  data.go 오류 내용: ${stock.dataGo.diagnosisDescription}`);
        }
        if (stock.dataGo.errorDetail) {
          lines.push(`  data.go 오류 상세: ${stock.dataGo.errorDetail}`);
        }
        lines.push(`  최종 페이지 사용 데이터: ${stock.finalSourceText}`);
        lines.push(`  사용자 표시 문구: ${stock.userDisplayMessage}`);
        lines.push(`  가격 차이율: ${gapRate !== null ? formatPercent(gapRate * 100) : "계산 불가"}`);
        lines.push(`  차이율 상태: ${stock.gapStatusText ?? "비교 불가"}`);
      });

      await navigator.clipboard.writeText(lines.join("\n"));
      setStatusMessage("진단 결과가 복사되었습니다.");
    } catch {
      setStatusMessage("진단 결과 복사에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-ink dark:text-white">데이터 소스 상태 진단</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDiagnosis}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-100"
            >
              진단 결과 복사
            </button>
            <button
              type="button"
              onClick={handleReload}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-100"
            >
              {loading ? "검사 중..." : "KIS 연결 다시 검사"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          KIS 현재가와 data.go.kr 일별 종가 데이터 연결 상태를 점검합니다.
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          마지막 검사 시각: {formatDateTime(snapshot.generatedAt)}
        </p>
        {statusMessage ? (
          <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{statusMessage}</p>
        ) : null}

        <div className="mt-4 grid gap-2 text-sm font-semibold sm:grid-cols-3">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-700 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200">
            페이지 상태: {snapshot.pageStatusText}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-700 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200">
            데이터 요청 상태: {snapshot.requestStatusText}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-700 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 sm:col-span-3">
            설명: {snapshot.pageStatusDescription}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-base font-bold text-ink dark:text-white">환경 상태</h2>
        <div className="mt-3 grid gap-2 text-sm font-semibold sm:grid-cols-2">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            REALTIME_STOCK_PROVIDER: {snapshot.envStatus.realtimeProvider || "미설정"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            STOCK_DATA_PROVIDER: {snapshot.envStatus.stockDataProvider || "미설정"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            KIS_APP_KEY exists: {snapshot.envStatus.kisAppKeyExists ? "true" : "false"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            KIS_APP_SECRET exists: {snapshot.envStatus.kisAppSecretExists ? "true" : "false"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50 sm:col-span-2">
            KIS_BASE_URL: {snapshot.envStatus.kisBaseUrl}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50 sm:col-span-2">
            DATA_GO_KR_API_KEY exists: {snapshot.envStatus.dataGoApiKeyExists ? "true" : "false"}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-base font-bold text-ink dark:text-white">KIS Endpoint 진단</h2>
        <div className="mt-3 grid gap-2 text-sm font-semibold sm:grid-cols-2">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50 sm:col-span-2">
            현재 KIS_BASE_URL: {snapshot.kisEndpointDiagnosis.baseUrl}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            endpoint 유형: {snapshot.kisEndpointDiagnosis.endpointTypeLabel}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
            모의 endpoint 여부: {snapshot.kisEndpointDiagnosis.isMockEndpoint ? "예" : "아니오"}
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50 sm:col-span-2">
            KIS_BASE_URL 예시: 모의 https://openapivts.koreainvestment.com:29443 / 실전
            https://openapi.koreainvestment.com:9443
          </p>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <p className="text-xs font-bold text-slate-400">Token 요청</p>
            <p className="mt-1 text-sm font-bold text-ink dark:text-white">
              {snapshot.kisEndpointDiagnosis.token.success ? "성공" : "실패"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              HTTP status: {snapshot.kisEndpointDiagnosis.token.status ?? "N/A"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              rt_cd: {snapshot.kisEndpointDiagnosis.token.rtCd ?? "N/A"} / msg_cd:{" "}
              {snapshot.kisEndpointDiagnosis.token.msgCd ?? "N/A"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              msg1: {snapshot.kisEndpointDiagnosis.token.msg1 ?? "N/A"}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-200">
              {snapshot.kisEndpointDiagnosis.token.diagnosisCategory ?? "정상 응답"}
            </p>
            {snapshot.kisEndpointDiagnosis.token.diagnosisDescription ? (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {snapshot.kisEndpointDiagnosis.token.diagnosisDescription}
              </p>
            ) : null}
            {snapshot.kisEndpointDiagnosis.token.errorDetail ? (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                상세: {snapshot.kisEndpointDiagnosis.token.errorDetail}
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <p className="text-xs font-bold text-slate-400">Quote 요청(005930 probe)</p>
            <p className="mt-1 text-sm font-bold text-ink dark:text-white">
              {snapshot.kisEndpointDiagnosis.quoteProbe.success ? "성공" : "실패"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              HTTP status: {snapshot.kisEndpointDiagnosis.quoteProbe.status ?? "N/A"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              rt_cd: {snapshot.kisEndpointDiagnosis.quoteProbe.rtCd ?? "N/A"} / msg_cd:{" "}
              {snapshot.kisEndpointDiagnosis.quoteProbe.msgCd ?? "N/A"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              msg1: {snapshot.kisEndpointDiagnosis.quoteProbe.msg1 ?? "N/A"}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-200">
              {snapshot.kisEndpointDiagnosis.quoteProbe.diagnosisCategory ?? "정상 응답"}
            </p>
            {snapshot.kisEndpointDiagnosis.quoteProbe.diagnosisDescription ? (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {snapshot.kisEndpointDiagnosis.quoteProbe.diagnosisDescription}
              </p>
            ) : null}
            {snapshot.kisEndpointDiagnosis.quoteProbe.errorDetail ? (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                상세: {snapshot.kisEndpointDiagnosis.quoteProbe.errorDetail}
              </p>
            ) : null}
          </div>
        </div>

        {snapshot.kisEndpointDiagnosis.endpointWarning ? (
          <p className="mt-3 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            {snapshot.kisEndpointDiagnosis.endpointWarning}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid gap-4">
        {safeStocks.map((result) => {
          const kisPrice = safeValue(result.kis.price);
          const closePrice = safeValue(result.dataGo.price);
          const gapRate = safeValue(result.gapRate);

          return (
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
                    현재가: {kisPrice !== null ? formatKRW(kisPrice) : "데이터 없음"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    updatedAt: {result.kis.updatedAt ?? "확인 불가"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    HTTP status: {result.kis.status ?? "N/A"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    rt_cd: {result.kis.rtCd ?? "N/A"} / msg_cd: {result.kis.msgCd ?? "N/A"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    msg1: {result.kis.msg1 ?? "N/A"}
                  </p>
                  {renderErrorInfo(result.kis)}
                </div>

                <div className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                  <p className="text-xs font-bold text-slate-400">data.go.kr 최근 종가 요청</p>
                  <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                    {result.dataGo.success ? "성공" : "실패"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    최근 종가: {closePrice !== null ? formatKRW(closePrice) : "데이터 없음"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    기준일: {result.dataGo.referenceDate ?? "확인 불가"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    HTTP status: {result.dataGo.status ?? "N/A"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    rt_cd: {result.dataGo.rtCd ?? "N/A"} / msg1: {result.dataGo.msg1 ?? "N/A"}
                  </p>
                  {renderErrorInfo(result.dataGo)}
                </div>
              </div>

              <div className="mt-3 rounded-md border border-line bg-white p-3 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                <p>KIS: {result.kis.success ? "성공" : "실패"}</p>
                <p className="mt-1">data.go.kr: {result.dataGo.success ? "성공" : "실패"}</p>
                <p className="mt-1">최종 사용 가능 데이터: {result.finalSourceText}</p>
                <p className="mt-1">사용자에게 표시될 문구: {result.userDisplayMessage}</p>
                <p className="mt-1">
                  가격 차이율: {gapRate !== null ? formatPercent(gapRate * 100) : "계산 불가"}
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
          );
        })}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 text-xs font-semibold leading-5 text-slate-500 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:text-slate-400">
        {snapshot.footerNote}
      </section>
    </main>
  );
}
