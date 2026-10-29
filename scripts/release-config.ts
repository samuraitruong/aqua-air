import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { resolve } from "node:path";
import { isIP } from "node:net";
export interface StoreMetadata {
  publisher: string;
  privacyPolicyUrl: string;
  supportUrl: string;
}
export function readStoreMetadata(): StoreMetadata {
  return JSON.parse(
    readFileSync(resolve(__dirname, "../release/store.json"), "utf8"),
  );
}
export function isPublicHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value),
      host = u.hostname.toLowerCase();
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !isIP(host) &&
      !host.startsWith("[") &&
      host.includes(".") &&
      !/(^|\.)(localhost|local|internal|test|invalid|example)(\.|$)/.test(
        host,
      ) &&
      !/(^|\.)example\.(com|org|net)$/.test(host)
    );
  } catch {
    return false;
  }
}
export function validateStoreMetadata(
  value: unknown,
): asserts value is StoreMetadata {
  const d = value as StoreMetadata;
  if (
    !d ||
    typeof d.publisher !== "string" ||
    !d.publisher.trim() ||
    /^(todo|placeholder|your .*|publisher)$/i.test(d.publisher.trim()) ||
    !isPublicHttpsUrl(d.privacyPolicyUrl) ||
    !isPublicHttpsUrl(d.supportUrl)
  )
    throw new Error(
      "Complete release/store.json: actual publisher, public HTTPS privacyPolicyUrl and supportUrl (no placeholders or private hosts).",
    );
}
export function validateBuildNumber(value: string): number {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2100000000)
    throw new Error(
      "AQUAAIR_BUILD_NUMBER must be a positive integer <= 2100000000; increase it for each store upload.",
    );
  return Number(value);
}

export function assertReleaseDiskSpace(bytes: number) {
  if (bytes < 8 * 1024 ** 3)
    throw new Error(
      "Insufficient disk space for native release build: at least 8 GiB free is required; 15–20 GiB is recommended.",
    );
}
export function assertUploadCertificate(subject: string) {
  if (/CN\s*=\s*Android Debug(?:\n|,|$)/i.test(subject))
    throw new Error(
      "An Android debug certificate cannot be used for a store release.",
    );
}
