import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

type RouteCheckResult = {
  route: string;
  status: number | null;
  ok: boolean;
  foundErrorSignatures: string[];
  html: string;
  error?: string;
};

const ROUTES_TO_CHECK = [
  "/",
  "/stocks/005930",
  "/portfolio",
  "/pricing",
  "/mypage",
  "/admin",
  "/about",
  "/privacy",
  "/disclaimer",
  "/beta?ref=test",
  "/debug/market-data",
  "/admin/checklist",
  "/sitemap.xml",
  "/robots.txt"
];

const REQUIRED_KEYWORDS = [
  "KRX Insight",
  "투자 참고",
  "매수/매도 추천이 아닙니다"
];

const ERROR_SIGNATURES = [
  "Application error",
  "NEXT_REDIRECT error",
  "undefined is not an object",
  "Cannot read properties of undefined"
];

const REQUEST_DELAY_MS = 700;

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
        return;
      }
      reject(new Error(`${label} 실패 (exit code: ${code ?? "unknown"})`));
    });
  });
}

async function findAvailablePort(startPort = 3200, maxAttempts = 50) {
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
  const logLimit = 200;
  const pushLog = (text: string) => {
    if (!text) return;
    logs.push(text);
    if (logs.length > logLimit) logs.splice(0, logs.length - logLimit);
  };

  server.stdout?.on("data", (chunk: Buffer) => {
    pushLog(chunk.toString("utf8"));
  });
  server.stderr?.on("data", (chunk: Buffer) => {
    pushLog(chunk.toString("utf8"));
  });

  return { server, logs };
}

async function stopProcess(server: ChildProcess) {
  if (server.killed || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await sleep(500);
  if (server.exitCode !== null) return;
  if (server.pid && process.platform === "win32") {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGKILL");
  }
}

async function waitForServerReady(baseUrl: string, timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { method: "GET" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // wait and retry
    }
    await sleep(700);
  }
  throw new Error("Next 서비스 시작 대기 시간이 초과되었습니다.");
}

function findMatchedSignatures(text: string) {
  const lower = text.toLowerCase();
  return ERROR_SIGNATURES.filter((signature) => lower.includes(signature.toLowerCase()));
}

async function checkRoute(baseUrl: string, route: string): Promise<RouteCheckResult> {
  const fullUrl = `${baseUrl}${route}`;
  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "cache-control": "no-cache"
      }
    });
    const html = await response.text();
    const foundErrorSignatures = findMatchedSignatures(html);
    return {
      route,
      status: response.status,
      ok: response.status === 200,
      foundErrorSignatures,
      html
    };
  } catch (error) {
    return {
      route,
      status: null,
      ok: false,
      foundErrorSignatures: [],
      html: "",
      error: error instanceof Error ? error.message : "요청 실패"
    };
  }
}

async function main() {
  const cwd = process.cwd();
  const summary: string[] = [];
  const failedItems: string[] = [];

  console.log("== KRX Insight MVP 자동 점검 시작 ==");
  console.log("1) 빌드 실행");
  await runCommand(npmCommand(), ["run", "build"], cwd, "build");

  console.log("2) 로컬 서버 실행");
  const port = await findAvailablePort(3200, 80);
  const baseUrl = `http://127.0.0.1:${port}`;
  const { server, logs } = startNextServer(cwd, port);

  try {
    await waitForServerReady(baseUrl, 45_000);
    console.log(`   - 서버 준비 완료: ${baseUrl}`);

    console.log("3) 라우트 상태 점검 (요청당 1회, 순차 검사)");
    const routeResults: RouteCheckResult[] = [];
    for (const route of ROUTES_TO_CHECK) {
      const result = await checkRoute(baseUrl, route);
      routeResults.push(result);
      const routeOk = result.ok && result.foundErrorSignatures.length === 0;
      summary.push(`${routeOk ? "✅" : "❌"} ${route} (${result.status ?? "N/A"})`);
      if (!routeOk) {
        const reason = result.error
          ? `요청 실패: ${result.error}`
          : result.foundErrorSignatures.length > 0
            ? `오류 문구 감지: ${result.foundErrorSignatures.join(", ")}`
            : `HTTP 상태 코드 ${result.status}`;
        failedItems.push(`${route} - ${reason}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    console.log("4) 필수 문구 점검");
    const htmlCollection = routeResults
      .filter((item) => item.status === 200)
      .map((item) => item.html)
      .join("\n");

    for (const keyword of REQUIRED_KEYWORDS) {
      const found = htmlCollection.includes(keyword);
      summary.push(`${found ? "✅" : "❌"} 키워드: ${keyword}`);
      if (!found) {
        failedItems.push(`필수 문구 누락: ${keyword}`);
      }
    }

    console.log("5) 에러 시그니처 점검");
    const serverLogText = logs.join("\n");
    const logMatches = findMatchedSignatures(serverLogText);
    if (logMatches.length > 0) {
      summary.push(`❌ 서버 로그 오류 시그니처: ${logMatches.join(", ")}`);
      failedItems.push(`서버 로그에서 오류 시그니처 감지: ${logMatches.join(", ")}`);
    } else {
      summary.push("✅ 서버 로그 오류 시그니처 없음");
    }

    console.log("\n=== MVP Check Report ===");
    for (const line of summary) {
      console.log(line);
    }

    if (failedItems.length === 0) {
      console.log("\n✅ passed");
      return;
    }

    console.log("\n❌ failed");
    for (const item of failedItems) {
      console.log(` - ${item}`);
    }
    process.exitCode = 1;
  } finally {
    await stopProcess(server);
  }
}

main().catch((error) => {
  console.error("\n❌ failed");
  console.error(error instanceof Error ? error.message : "알 수 없는 오류");
  process.exit(1);
});
