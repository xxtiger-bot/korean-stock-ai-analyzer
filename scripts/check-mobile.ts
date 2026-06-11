import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";

type Viewport = {
  width: number;
  height: number;
};

type RouteSpec = {
  route: string;
  slug: string;
};

type MobileFailure = {
  viewport: string;
  route: string;
  reason: string;
};

type BrowserProbeResult = {
  ok: boolean;
  wsUrl?: string;
  reason?: string;
};

type FallbackRouteResult = {
  route: string;
  status: number | null;
  html: string;
  ok: boolean;
};

type CheckMode = "cdp" | "fallback";

type MobileCheckReport = {
  timestamp: string;
  mode: CheckMode;
  passed: boolean;
  cdpAvailable: boolean;
  cdpUnavailableReason?: string;
  baseUrl: string;
  failures: MobileFailure[];
  fallbackRoutes?: FallbackRouteResult[];
  notes: string[];
};

const VIEWPORTS: Viewport[] = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 }
];

const ROUTES: RouteSpec[] = [
  { route: "/", slug: "home" },
  { route: "/stocks/005930", slug: "stock" },
  { route: "/portfolio", slug: "portfolio" },
  { route: "/pricing", slug: "pricing" },
  { route: "/beta", slug: "beta" },
  { route: "/pwa", slug: "pwa" },
  { route: "/mypage", slug: "mypage" },
  { route: "/admin", slug: "admin" },
  { route: "/admin/store-assets", slug: "admin-store-assets" },
  { route: "/admin/beta-kit", slug: "admin-beta-kit" },
  { route: "/debug/market-data", slug: "debug-market-data" },
  { route: "/admin/checklist", slug: "admin-checklist" }
];

const ERROR_SIGNATURES = [
  "Application error",
  "Cannot read properties of undefined",
  "undefined is not an object",
  "NEXT_REDIRECT error"
];

const REQUIRED_GLOBAL_KEYWORDS = [
  "KRX Insight",
  "투자 참고",
  "매수/매도 추천이 아닙니다"
];

const REQUIRED_ROUTE_KEYWORDS: Record<string, string[]> = {
  "/": ["오늘의 AI 주식 브리핑", "내 리스크 요약", "오늘 우선 확인할 종목"],
  "/stocks/005930": ["요약", "차트", "AI", "지표", "리스크"],
  "/portfolio": [
    "관심/보유 종목 리스크 레이더",
    "관심종목과 우선 확인 데이터를 기준",
    "현재 이 레이더는 관심종목 및 우선 확인 데이터를 기준으로 제공됩니다"
  ]
};

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "mobile-check");
const REPORT_JSON = join(ARTIFACT_DIR, "report.json");
const REPORT_TXT = join(ARTIFACT_DIR, "report.txt");

const ROUTE_DELAY_MS = 1500;
const VIEWPORT_DELAY_MS = 2500;
const FETCH_TIMEOUT_MS = 12_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function runCommand(command: string, args: string[], cwd: string, label: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32"
    });

    child.on("error", (error) => {
      reject(new Error(`${label} 실행 실패: ${error.message}`));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} 실패 (exit code: ${code ?? "unknown"})`));
      }
    });
  });
}

async function findAvailablePort(startPort = 3200, maxAttempts = 80) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    const available = await new Promise<boolean>((resolve) => {
      const tester = createServer();
      tester.unref();
      tester.on("error", () => resolve(false));
      tester.listen(port, "127.0.0.1", () => {
        tester.close(() => resolve(true));
      });
    });
    if (available) return port;
  }
  throw new Error("사용 가능한 포트를 찾지 못했습니다.");
}

function startNextServer(cwd: string, port: number) {
  const nextBin = require.resolve("next/dist/bin/next");
  const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const logs: string[] = [];
  const pushLog = (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    if (!text) return;
    logs.push(text);
    if (logs.length > 400) logs.splice(0, logs.length - 400);
  };

  server.stdout?.on("data", (chunk: Buffer) => pushLog(chunk));
  server.stderr?.on("data", (chunk: Buffer) => pushLog(chunk));

  return { server, logs };
}

async function stopProcess(server: ChildProcess) {
  if (server.killed || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await sleep(800);
  if (server.exitCode !== null) return;
  if (server.pid && process.platform === "win32") {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGKILL");
  }
}

async function waitForServerReady(baseUrl: string, timeoutMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl, {
        method: "GET",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // retry
    }
    await sleep(700);
  }
  throw new Error("Next 서비스 시작 대기 시간이 초과되었습니다.");
}

function resolveBrowserExecutable() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        ]
      : [
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/usr/bin/google-chrome",
          "/usr/bin/chromium"
        ];

  for (const path of candidates) {
    try {
      // eslint-disable-next-line no-sync
      require("node:fs").accessSync(path);
      return path;
    } catch {
      // keep probing
    }
  }
  return null;
}

class CdpSession {
  private ws: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
  private listeners = new Map<string, Array<(params: unknown) => void>>();

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as {
          id?: number;
          method?: string;
          params?: unknown;
          result?: unknown;
          error?: { message?: string };
        };
        if (typeof payload.id === "number") {
          const resolver = this.pending.get(payload.id);
          if (!resolver) return;
          this.pending.delete(payload.id);
          if (payload.error) {
            resolver.reject(new Error(payload.error.message || "CDP 요청 실패"));
          } else {
            resolver.resolve(payload.result);
          }
          return;
        }

        if (payload.method) {
          const handlers = this.listeners.get(payload.method) ?? [];
          handlers.forEach((handler) => {
            try {
              handler(payload.params);
            } catch {
              // ignore
            }
          });
        }
      } catch {
        // ignore
      }
    });
  }

  async send<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 10_000) {
    const messageId = ++this.id;
    const payload = JSON.stringify({ id: messageId, method, params });

    const response = await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`CDP 응답 시간 초과: ${method}`));
      }, timeoutMs);

      this.pending.set(messageId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as T);
        },
        reject: (reason) => {
          clearTimeout(timer);
          reject(reason);
        }
      });

      this.ws.send(payload);
    });
    return response;
  }

  on(method: string, handler: (params: unknown) => void) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
    return () => {
      const next = (this.listeners.get(method) ?? []).filter((item) => item !== handler);
      this.listeners.set(method, next);
    };
  }

  waitFor(method: string, timeoutMs = 12_000) {
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`${method} 이벤트 대기 시간 초과`));
      }, timeoutMs);

      const unsubscribe = this.on(method, (params) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(params);
      });
    });
  }

  close() {
    this.ws.close();
  }
}

async function probeBrowserCdp(debugPort: number): Promise<BrowserProbeResult> {
  try {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!response.ok) return { ok: false, reason: `CDP HTTP ${response.status}` };

    const pages = (await response.json()) as Array<{ webSocketDebuggerUrl?: string; type?: string }>;
    const safePages = Array.isArray(pages) ? pages : [];
    const pageTarget = safePages.find(
      (item) => item.type === "page" && typeof item.webSocketDebuggerUrl === "string"
    );
    if (pageTarget?.webSocketDebuggerUrl) return { ok: true, wsUrl: pageTarget.webSocketDebuggerUrl };

    const anyTarget = safePages.find((item) => typeof item.webSocketDebuggerUrl === "string");
    if (anyTarget?.webSocketDebuggerUrl) return { ok: true, wsUrl: anyTarget.webSocketDebuggerUrl };

    return { ok: false, reason: "webSocketDebuggerUrl 없음" };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "CDP endpoint 연결 실패" };
  }
}

async function createCdpSession(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("브라우저 WebSocket 연결 시간 초과")), 10_000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("브라우저 WebSocket 연결 실패"));
    });
  });
  return new CdpSession(ws);
}

async function httpFetch(baseUrl: string, route: string) {
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    const html = await response.text();
    return { status: response.status, html };
  } catch (error) {
    return {
      status: null as number | null,
      html: "",
      error: error instanceof Error ? error.message : "요청 실패"
    };
  }
}

async function evaluateJson<T>(cdp: CdpSession, expression: string): Promise<T> {
  const result = await cdp.send<{ result?: { value?: T } }>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return (result.result?.value ?? null) as T;
}

async function navigate(cdp: CdpSession, url: string) {
  const loadEventPromise = cdp.waitFor("Page.loadEventFired", 15_000).catch(() => null);
  await cdp.send("Page.navigate", { url });
  await loadEventPromise;
  await sleep(900);
}

async function captureScreenshot(cdp: CdpSession, outputPath: string) {
  const result = await cdp.send<{ data?: string }>("Page.captureScreenshot", {
    format: "png",
    fromSurface: true
  });
  const base64 = typeof result.data === "string" ? result.data : "";
  if (!base64) throw new Error("스크린샷 데이터가 비어 있습니다.");
  await writeFile(outputPath, Buffer.from(base64, "base64"));
}

async function checkGeneralPageState(cdp: CdpSession) {
  return evaluateJson<{
    bodyText: string;
    hasHorizontalOverflow: boolean;
    viewportWidth: number;
    scrollWidth: number;
  }>(
    cdp,
    `(() => {
      const bodyText = document.body?.innerText ?? "";
      const viewportWidth = window.innerWidth || 0;
      const scrollWidth = Math.max(
        document.body?.scrollWidth || 0,
        document.documentElement?.scrollWidth || 0
      );
      return {
        bodyText,
        hasHorizontalOverflow: scrollWidth > viewportWidth + 4,
        viewportWidth,
        scrollWidth
      };
    })()`
  );
}

async function isTextVisible(cdp: CdpSession, text: string) {
  return evaluateJson<boolean>(
    cdp,
    `(() => {
      const target = ${JSON.stringify(text)};
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const elements = Array.from(document.querySelectorAll("body *"));
      return elements.some((el) => {
        const textValue = (el.textContent || "").trim();
        return textValue.includes(target) && isVisible(el);
      });
    })()`
  );
}

async function clickButtonByText(cdp: CdpSession, label: string) {
  return evaluateJson<boolean>(
    cdp,
    `(() => {
      const target = ${JSON.stringify(label)};
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const button = Array.from(document.querySelectorAll("button"))
        .find((el) => (el.textContent || "").trim().includes(target) && isVisible(el));
      if (!button) return false;
      button.click();
      return true;
    })()`
  );
}

async function checkGuideModal(cdp: CdpSession) {
  return evaluateJson<{
    visible: boolean;
    withinViewport: boolean;
    closeButtonVisible: boolean;
    scrollableContent: boolean;
  }>(
    cdp,
    `(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const titleEl = Array.from(document.querySelectorAll("h3"))
        .find((el) => (el.textContent || "").includes("처음 사용 가이드") && isVisible(el));
      if (!titleEl) {
        return { visible: false, withinViewport: true, closeButtonVisible: true, scrollableContent: true };
      }

      const modalRoot = titleEl.closest("div.max-h-\\[85vh\\]") || titleEl.closest("div");
      const rect = modalRoot ? modalRoot.getBoundingClientRect() : { top: 0, bottom: 0, height: 0 };
      const withinViewport = rect.height <= window.innerHeight * 0.9 + 8 && rect.top >= -8 && rect.bottom <= window.innerHeight + 8;
      const closeButtonVisible = Array.from(document.querySelectorAll("button")).some((el) => {
        const text = (el.textContent || "").trim();
        return text === "닫기" && isVisible(el);
      });
      const scrollableArea = modalRoot ? modalRoot.querySelector("div.overflow-y-auto") : null;
      const scrollableContent = Boolean(
        scrollableArea &&
        scrollableArea.scrollHeight >= scrollableArea.clientHeight
      );

      return { visible: true, withinViewport, closeButtonVisible, scrollableContent };
    })()`
  );
}

async function checkHomePage(cdp: CdpSession, failures: MobileFailure[], viewportLabel: string) {
  const navVisible = await isTextVisible(cdp, "홈");
  const briefingVisible = await isTextVisible(cdp, "오늘의 AI 주식 브리핑");
  const riskSummaryVisible = await isTextVisible(cdp, "내 리스크 요약");
  const priorityVisible = await isTextVisible(cdp, "오늘 우선 확인할 종목");

  if (!navVisible) failures.push({ viewport: viewportLabel, route: "/", reason: "모바일 하단 내비게이션이 보이지 않습니다." });
  if (!briefingVisible) failures.push({ viewport: viewportLabel, route: "/", reason: "오늘의 AI 주식 브리핑이 보이지 않습니다." });
  if (!riskSummaryVisible) failures.push({ viewport: viewportLabel, route: "/", reason: "내 리스크 요약이 보이지 않습니다." });
  if (!priorityVisible) failures.push({ viewport: viewportLabel, route: "/", reason: "오늘 우선 확인할 종목이 보이지 않습니다." });

  const guide = await checkGuideModal(cdp);
  if (!guide.visible) return;
  if (!guide.withinViewport) failures.push({ viewport: viewportLabel, route: "/", reason: "사용 가이드가 화면 높이를 초과합니다." });
  if (!guide.closeButtonVisible) failures.push({ viewport: viewportLabel, route: "/", reason: "사용 가이드 닫기 버튼이 보이지 않습니다." });
  if (!guide.scrollableContent) failures.push({ viewport: viewportLabel, route: "/", reason: "사용 가이드 본문이 스크롤되지 않습니다." });

  const closed = await clickButtonByText(cdp, "닫기");
  if (closed) await sleep(350);
}

async function checkStockPage(cdp: CdpSession, failures: MobileFailure[], viewportLabel: string) {
  const requiredTabs = ["요약", "차트", "AI", "지표", "리스크"];
  for (const tab of requiredTabs) {
    if (!(await isTextVisible(cdp, tab))) {
      failures.push({ viewport: viewportLabel, route: "/stocks/005930", reason: `모바일 탭 '${tab}' 이 보이지 않습니다.` });
    }
  }

  const tabExpectations: Array<{ tab: string; show: string; hide: string }> = [
    { tab: "요약", show: "현재가 요약", hide: "K선 차트" },
    { tab: "차트", show: "K선 차트", hide: "현재가 요약" },
    { tab: "AI", show: "AI 분석 요약", hide: "기술 지표" },
    { tab: "지표", show: "기술 지표", hide: "AI 분석 요약" },
    { tab: "리스크", show: "리스크 및 면책", hide: "AI 분석 요약" }
  ];

  for (const rule of tabExpectations) {
    const clicked = await clickButtonByText(cdp, rule.tab);
    if (!clicked) {
      failures.push({ viewport: viewportLabel, route: "/stocks/005930", reason: `'${rule.tab}' 탭 클릭 실패` });
      continue;
    }
    await sleep(350);
    const showVisible = await isTextVisible(cdp, rule.show);
    const hideVisible = await isTextVisible(cdp, rule.hide);
    if (!showVisible) failures.push({ viewport: viewportLabel, route: "/stocks/005930", reason: `'${rule.tab}' 탭 활성 시 '${rule.show}' 가 보이지 않습니다.` });
    if (rule.tab !== "요약" && hideVisible) {
      failures.push({ viewport: viewportLabel, route: "/stocks/005930", reason: `'${rule.tab}' 탭에서 비활성 콘텐츠('${rule.hide}')가 동시에 보입니다.` });
    }
  }

  const metricCheck = await evaluateJson<{ financeZeroIssue: boolean; foreignZeroIssue: boolean }>(
    cdp,
    `(() => {
      const blocks = Array.from(document.querySelectorAll("article, section, div"));
      const perCard = blocks.find((el) => (el.textContent || "").includes("PER / EPS"));
      const foreignCard = blocks.find((el) => (el.textContent || "").includes("외국인 보유율 / 소진율"));
      let financeZeroIssue = false;
      if (perCard) {
        const text = perCard.textContent || "";
        if (text.includes("재무 지표는 아직 제공되지 않습니다.")) {
          financeZeroIssue = text.includes("0.0x") || text.includes("₩0");
        }
      }
      let foreignZeroIssue = false;
      if (foreignCard) {
        const text = foreignCard.textContent || "";
        if (text.includes("KIS 외국인 보유 데이터가 제공되지 않았습니다.")) {
          foreignZeroIssue = text.includes("0.00%");
        }
      }
      return { financeZeroIssue, foreignZeroIssue };
    })()`
  );

  if (metricCheck.financeZeroIssue) {
    failures.push({ viewport: viewportLabel, route: "/stocks/005930", reason: "PER/EPS 무데이터 상태에서 0 값이 노출됩니다." });
  }
  if (metricCheck.foreignZeroIssue) {
    failures.push({ viewport: viewportLabel, route: "/stocks/005930", reason: "외국인 무데이터 상태에서 0.00%가 노출됩니다." });
  }
}

async function checkPortfolioPage(cdp: CdpSession, failures: MobileFailure[], viewportLabel: string) {
  const requiredTexts = [
    "관심/보유 종목 리스크 레이더",
    "관심종목과 우선 확인 데이터를 기준",
    "현재 이 레이더는 관심종목 및 우선 확인 데이터를 기준으로 제공됩니다"
  ];
  for (const text of requiredTexts) {
    if (!(await isTextVisible(cdp, text))) {
      failures.push({ viewport: viewportLabel, route: "/portfolio", reason: `필수 문구 '${text}' 이 보이지 않습니다.` });
    }
  }

  const addButtonVisible =
    (await isTextVisible(cdp, "관심종목 추가하기")) || (await isTextVisible(cdp, "종목 검색하기"));
  if (!addButtonVisible) {
    failures.push({ viewport: viewportLabel, route: "/portfolio", reason: "리스크 레이더 빈 상태 CTA가 보이지 않습니다." });
    return;
  }

  const overlapCheck = await evaluateJson<boolean>(
    cdp,
    `(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const nav = document.querySelector('nav[aria-label="모바일 하단 내비게이션"]');
      const button = Array.from(document.querySelectorAll("button"))
        .find((el) => (el.textContent || "").includes("보유종목 추가") && isVisible(el));
      if (!nav || !button) return true;
      button.scrollIntoView({ block: "center" });
      const navRect = nav.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      return buttonRect.bottom <= navRect.top + 2;
    })()`
  );
  if (!overlapCheck) {
    failures.push({ viewport: viewportLabel, route: "/portfolio", reason: "하단 내비게이션이 주요 버튼을 가립니다." });
  }
}

async function checkRouteWithCdp(
  cdp: CdpSession,
  baseUrl: string,
  viewport: Viewport,
  routeSpec: RouteSpec,
  failures: MobileFailure[]
) {
  const viewportLabel = `${viewport.width}x${viewport.height}`;
  const { status } = await httpFetch(baseUrl, routeSpec.route);
  if (status !== 200) {
    failures.push({ viewport: viewportLabel, route: routeSpec.route, reason: `HTTP 상태 코드 ${status ?? "N/A"}` });
    return;
  }

  await navigate(cdp, `${baseUrl}${routeSpec.route}`);
  const general = await checkGeneralPageState(cdp);
  for (const signature of ERROR_SIGNATURES) {
    if (general.bodyText.includes(signature)) {
      failures.push({ viewport: viewportLabel, route: routeSpec.route, reason: `오류 문구 감지: ${signature}` });
    }
  }
  if (general.hasHorizontalOverflow) {
    failures.push({
      viewport: viewportLabel,
      route: routeSpec.route,
      reason: `가로 스크롤 감지 (scrollWidth ${general.scrollWidth}, viewport ${general.viewportWidth})`
    });
  }

  if (routeSpec.route === "/") await checkHomePage(cdp, failures, viewportLabel);
  if (routeSpec.route === "/stocks/005930") await checkStockPage(cdp, failures, viewportLabel);
  if (routeSpec.route === "/portfolio") await checkPortfolioPage(cdp, failures, viewportLabel);

  const outputPath = join(ARTIFACT_DIR, `${routeSpec.slug}-${viewport.width}.png`);
  await captureScreenshot(cdp, outputPath);
}

async function runCdpChecks(
  browserPath: string,
  baseUrl: string,
  failures: MobileFailure[]
) {
  for (const viewport of VIEWPORTS) {
    const viewportLabel = `${viewport.width}x${viewport.height}`;
    console.log(`   - ${viewportLabel} 점검 중...`);

    const debugPort = await findAvailablePort(9300, 120);
    const userDataDir = await mkdtemp(join(tmpdir(), "krx-mobile-check-"));
    const browser = spawn(
      browserPath,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${userDataDir}`,
        "about:blank"
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );

    let cdp: CdpSession | null = null;
    try {
      const probe = await probeBrowserCdp(debugPort);
      if (!probe.ok || !probe.wsUrl) {
        failures.push({ viewport: viewportLabel, route: "(browser)", reason: `CDP 연결 불가: ${probe.reason ?? "원인 미상"}` });
        return;
      }

      cdp = await createCdpSession(probe.wsUrl);
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("Network.enable");
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 3,
        mobile: true
      });
      await cdp.send("Emulation.setUserAgentOverride", {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      });

      for (const routeSpec of ROUTES) {
        await checkRouteWithCdp(cdp, baseUrl, viewport, routeSpec, failures);
        await sleep(ROUTE_DELAY_MS);
      }
    } catch (error) {
      failures.push({
        viewport: viewportLabel,
        route: "(browser)",
        reason: error instanceof Error ? error.message : "브라우저 점검 실패"
      });
    } finally {
      try {
        cdp?.close();
      } catch {
        // ignore
      }
      await stopProcess(browser);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    }

    await sleep(VIEWPORT_DELAY_MS);
  }
}

async function runFallbackChecks(baseUrl: string, failures: MobileFailure[]) {
  const routeResults: FallbackRouteResult[] = [];

  for (const routeSpec of ROUTES) {
    const response = await httpFetch(baseUrl, routeSpec.route);
    const status = response.status;
    const html = response.html ?? "";
    const ok = status === 200;
    routeResults.push({ route: routeSpec.route, status, html, ok });
    if (!ok) {
      failures.push({
        viewport: "fallback",
        route: routeSpec.route,
        reason: `HTTP 상태 코드 ${status ?? "N/A"}${response.error ? ` (${response.error})` : ""}`
      });
    }
  }

  const routeMap = new Map(routeResults.map((item) => [item.route, item]));

  for (const [route, keywords] of Object.entries(REQUIRED_ROUTE_KEYWORDS)) {
    const html = routeMap.get(route)?.html ?? "";
    for (const keyword of keywords) {
      if (!html.includes(keyword)) {
        failures.push({
          viewport: "fallback",
          route,
          reason: `필수 문구 누락: ${keyword}`
        });
      }
    }
  }

  const mergedHtml = routeResults.map((item) => item.html).join("\n");
  for (const keyword of REQUIRED_GLOBAL_KEYWORDS) {
    if (!mergedHtml.includes(keyword)) {
      failures.push({
        viewport: "fallback",
        route: "(global)",
        reason: `공통 문구 누락: ${keyword}`
      });
    }
  }

  for (const result of routeResults) {
    for (const signature of ERROR_SIGNATURES) {
      if (result.html.includes(signature)) {
        failures.push({
          viewport: "fallback",
          route: result.route,
          reason: `오류 문구 감지: ${signature}`
        });
      }
    }
  }

  return routeResults;
}

async function writeReports(report: MobileCheckReport) {
  const lines: string[] = [];
  lines.push(`timestamp: ${report.timestamp}`);
  lines.push(`mode: ${report.mode}`);
  lines.push(`cdpAvailable: ${report.cdpAvailable}`);
  if (report.cdpUnavailableReason) {
    lines.push(`cdpUnavailableReason: ${report.cdpUnavailableReason}`);
  }
  lines.push(`baseUrl: ${report.baseUrl}`);
  lines.push(`passed: ${report.passed}`);
  lines.push("");

  if (report.notes.length > 0) {
    lines.push("notes:");
    for (const note of report.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  if (report.fallbackRoutes && report.fallbackRoutes.length > 0) {
    lines.push("fallbackRoutes:");
    for (const item of report.fallbackRoutes) {
      lines.push(`- ${item.route}: ${item.status ?? "N/A"} ${item.ok ? "OK" : "FAIL"}`);
    }
    lines.push("");
  }

  if (report.failures.length > 0) {
    lines.push("failures:");
    for (const failure of report.failures) {
      lines.push(`- [${failure.viewport}] ${failure.route}: ${failure.reason}`);
    }
  } else {
    lines.push("failures: none");
  }

  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(REPORT_TXT, lines.join("\n"), "utf8");
}

async function main() {
  const cwd = process.cwd();
  const failures: MobileFailure[] = [];
  const notes: string[] = [];
  let mode: CheckMode = "cdp";
  let cdpAvailable = true;
  let cdpUnavailableReason = "";
  let fallbackRoutes: FallbackRouteResult[] | undefined;

  await mkdir(ARTIFACT_DIR, { recursive: true });

  console.log("== KRX Insight 모바일 자동 점검 시작 ==");
  console.log("1) 빌드 실행");
  await runCommand(npmCommand(), ["run", "build"], cwd, "build");

  console.log("2) 로컬 서버 실행");
  const appPort = await findAvailablePort(3200, 80);
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const { server, logs } = startNextServer(cwd, appPort);

  try {
    await waitForServerReady(baseUrl, 45_000);
    console.log(`   - 서버 준비 완료: ${baseUrl}`);

    const browserPath = resolveBrowserExecutable();
    if (!browserPath) {
      cdpAvailable = false;
      cdpUnavailableReason = "브라우저 실행 파일을 찾지 못했습니다.";
    } else {
      const probePort = await findAvailablePort(9400, 120);
      const probeUserDataDir = await mkdtemp(join(tmpdir(), "krx-mobile-probe-"));
      const probeBrowser = spawn(
        browserPath,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          `--remote-debugging-port=${probePort}`,
          `--user-data-dir=${probeUserDataDir}`,
          "about:blank"
        ],
        { stdio: ["ignore", "ignore", "ignore"] }
      );

      try {
        const probe = await probeBrowserCdp(probePort);
        if (!probe.ok || !probe.wsUrl) {
          cdpAvailable = false;
          cdpUnavailableReason = probe.reason ?? "CDP endpoint 접근 실패";
        } else {
          console.log(`   - CDP 사용 가능 브라우저: ${browserPath}`);
        }
      } finally {
        await stopProcess(probeBrowser);
        await rm(probeUserDataDir, { recursive: true, force: true }).catch(() => {});
      }

      if (cdpAvailable) {
        console.log("3) 모바일 CDP 점검");
        await runCdpChecks(browserPath, baseUrl, failures);
        const hasCdpUnavailableFailure = failures.some(
          (failure) =>
            failure.route === "(browser)" &&
            (failure.reason.includes("CDP 연결 불가") || failure.reason.includes("CDP 응답 시간 초과"))
        );
        if (hasCdpUnavailableFailure) {
          cdpAvailable = false;
          cdpUnavailableReason = "CDP 세션 안정적으로 연결되지 않았습니다.";
        }
      }
    }

    if (!cdpAvailable) {
      mode = "fallback";
      notes.push("⚠️ CDP unavailable, fallback HTTP check used");
      console.log("⚠️ CDP unavailable, fallback HTTP check used");
      fallbackRoutes = await runFallbackChecks(baseUrl, failures);
    }

    const serverText = logs.join("\n");
    for (const signature of ERROR_SIGNATURES) {
      if (serverText.includes(signature)) {
        failures.push({
          viewport: "server",
          route: "(log)",
          reason: `서버 로그 오류 시그니처 감지: ${signature}`
        });
      }
    }

    const passed = failures.length === 0;
    if (mode === "fallback" && passed) {
      notes.push("✅ mobile fallback check passed");
      console.log("✅ mobile fallback check passed");
    }

    const report: MobileCheckReport = {
      timestamp: new Date().toISOString(),
      mode,
      passed,
      cdpAvailable,
      cdpUnavailableReason: cdpAvailable ? undefined : cdpUnavailableReason,
      baseUrl,
      failures,
      fallbackRoutes,
      notes
    };
    await writeReports(report);

    console.log("\n=== Mobile Check Report ===");
    if (passed) {
      console.log("✅ mobile check passed");
      console.log(`리포트: ${REPORT_JSON}`);
      console.log(`리포트: ${REPORT_TXT}`);
      if (mode === "cdp") {
        console.log(`스크린샷 저장 위치: ${ARTIFACT_DIR}`);
      }
      return;
    }

    console.log("❌ mobile check failed");
    for (const failure of failures) {
      console.log(` - [${failure.viewport}] ${failure.route}: ${failure.reason}`);
    }
    console.log(`리포트: ${REPORT_JSON}`);
    console.log(`리포트: ${REPORT_TXT}`);
    process.exitCode = 1;
  } finally {
    await stopProcess(server);
  }
}

main().catch(async (error) => {
  const report: MobileCheckReport = {
    timestamp: new Date().toISOString(),
    mode: "fallback",
    passed: false,
    cdpAvailable: false,
    cdpUnavailableReason: "스크립트 실행 중 예외",
    baseUrl: "http://127.0.0.1:unknown",
    failures: [
      {
        viewport: "script",
        route: "(main)",
        reason: error instanceof Error ? error.message : "알 수 없는 오류"
      }
    ],
    notes: []
  };

  try {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await writeReports(report);
  } catch {
    // ignore secondary errors
  }

  console.error("❌ mobile check failed");
  console.error(error instanceof Error ? error.message : "알 수 없는 오류");
  process.exit(1);
});
