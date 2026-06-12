import fs from "node:fs";
import path from "node:path";

import {
  diagnoseKisTokenEndpoint,
  getKisEnvironmentDiagnostic
} from "../lib/providers/kis";

function loadLocalEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function safeText(value: string | null | undefined) {
  if (typeof value !== "string") return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
}

async function run() {
  loadLocalEnvFile();

  const env = getKisEnvironmentDiagnostic();
  console.log(
    [
      `nodeEnv=${env.nodeEnv}`,
      `vercel=${env.vercel ? "yes" : "no"}`,
      `vercelEnv=${safeText(env.vercelEnv)}`,
      `kisBaseUrlConfigured=${env.baseUrlConfigured ? "yes" : "no"}`,
      `kisBaseUrl=${env.baseUrl}`,
      `kisAppKey=${safeText(env.appKeyMasked)}`,
      `kisAppSecret=${safeText(env.appSecretMasked)}`
    ].join(" | ")
  );

  const endpoints = [env.baseUrl, "https://openapivts.koreainvestment.com:29443", "https://openapi.koreainvestment.com:9443"];

  for (const endpoint of endpoints) {
    const result = await diagnoseKisTokenEndpoint(endpoint);
    console.log(
      [
        `baseUrl=${result.baseUrl}`,
        `tokenEndpoint=${result.tokenEndpoint}`,
        `status=${result.status}`,
        `httpStatus=${result.httpStatus ?? "N/A"}`,
        `elapsedMs=${typeof result.elapsedMs === "number" ? result.elapsedMs : "N/A"}`,
        `errorCode=${safeText(result.errorCode)}`,
        `errorMessage=${safeText(result.errorMessage)}`,
        `responseKeys=${result.responseKeys.length > 0 ? result.responseKeys.join(",") : "N/A"}`
      ].join(" | ")
    );
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "KIS network diagnostic failed.");
  process.exit(1);
});
