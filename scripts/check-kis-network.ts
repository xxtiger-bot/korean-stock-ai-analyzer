import { loadEnvConfig } from "@next/env";

import {
  diagnoseKisTokenEndpoint,
  diagnoseKisTokenEndpointViaHttps,
  getKisEnvironmentDiagnostic
} from "../lib/providers/kis";

loadEnvConfig(process.cwd());

function safeText(value: string | null | undefined) {
  if (typeof value !== "string") return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
}

function maskValue(value: string | undefined) {
  if (!value) return "N/A";
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

function hasWhitespaceInside(value: string | undefined) {
  if (!value) return false;
  return /\s/.test(value);
}

function hasQuotes(value: string | undefined) {
  if (!value) return false;
  return /['"]/.test(value);
}

function hasNewline(value: string | undefined) {
  if (!value) return false;
  return /[\r\n]/.test(value);
}

async function run() {
  const env = getKisEnvironmentDiagnostic();
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  console.log(
    [
      `envLoaded=.env.local via @next/env`,
      `nodeEnv=${env.nodeEnv}`,
      `vercel=${env.vercel ? "yes" : "no"}`,
      `vercelEnv=${safeText(env.vercelEnv)}`,
      `kisBaseUrlConfigured=${env.baseUrlConfigured ? "yes" : "no"}`,
      `kisBaseUrl=${env.baseUrl}`,
      `kisAppKeyExists=${appKey ? "yes" : "no"}`,
      `kisAppKeyLength=${appKey?.length ?? 0}`,
      `kisAppKeyMasked=${maskValue(appKey)}`,
      `kisAppKeyHasSpaces=${hasWhitespaceInside(appKey) ? "yes" : "no"}`,
      `kisAppKeyHasQuotes=${hasQuotes(appKey) ? "yes" : "no"}`,
      `kisAppKeyHasNewline=${hasNewline(appKey) ? "yes" : "no"}`,
      `kisAppSecretExists=${appSecret ? "yes" : "no"}`,
      `kisAppSecretLength=${appSecret?.length ?? 0}`,
      `kisAppSecretMasked=${maskValue(appSecret)}`,
      `kisAppSecretHasSpaces=${hasWhitespaceInside(appSecret) ? "yes" : "no"}`,
      `kisAppSecretHasQuotes=${hasQuotes(appSecret) ? "yes" : "no"}`,
      `kisAppSecretHasNewline=${hasNewline(appSecret) ? "yes" : "no"}`
    ].join(" | ")
  );

  const endpoints = [env.baseUrl, "https://openapivts.koreainvestment.com:29443", "https://openapi.koreainvestment.com:9443"];

  for (const endpoint of endpoints) {
    const [fetchResult, httpsResult, legacyResult] = await Promise.all([
      diagnoseKisTokenEndpoint(endpoint),
      diagnoseKisTokenEndpointViaHttps(endpoint, "normal_https_request"),
      diagnoseKisTokenEndpointViaHttps(endpoint, "legacy_tls_https_request")
    ]);

    for (const result of [fetchResult, httpsResult, legacyResult]) {
      console.log(
        [
          `baseUrl=${result.baseUrl}`,
          `method=${result.requestMethod}`,
          `tokenEndpoint=${result.tokenEndpoint}`,
          `status=${result.status}`,
          `httpStatus=${result.httpStatus ?? "N/A"}`,
          `elapsedMs=${typeof result.elapsedMs === "number" ? result.elapsedMs : "N/A"}`,
          `hasAccessToken=${result.hasAccessToken ? "yes" : "no"}`,
          `tlsSocketProtocol=${safeText(result.tlsSocketProtocol)}`,
          `errorCode=${safeText(result.errorCode)}`,
          `errorType=${safeText(result.errorType)}`,
          `errorName=${safeText(result.errorName)}`,
          `errorMessage=${safeText(result.errorMessage)}`,
          `errorCause=${safeText(result.errorCause)}`,
          `responseKeys=${result.responseKeys.length > 0 ? result.responseKeys.join(",") : "N/A"}`
        ].join(" | ")
      );
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "KIS network diagnostic failed.");
  process.exit(1);
});
