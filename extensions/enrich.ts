// ---------------------------------------------------------------------------
// pi.dev enrichment — fetch package cards and merge metadata
// ---------------------------------------------------------------------------

import type { NpmSearchResult, PackageType } from "./api.js";

export interface PiDevPackage {
  name: string;
  description: string;
  author: string;
  downloads: string;
  timeAgo: string;
  types: PackageType[];
  installCmd: string;
  piDevUrl: string;
}

export interface EnrichedResult extends NpmSearchResult {
  types: PackageType[];
  piDevAuthor?: string;
  piDevDownloads?: string;
  piDevTimeAgo?: string;
  piDevInstallCmd?: string;
  piDevUrl: string;
}

export async function fetchPiDevPackages(query: string): Promise<PiDevPackage[]> {
  const res = await fetch(buildPiDevSearchUrl(query), {
    headers: { Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`pi.dev fetch failed: HTTP ${res.status}`);
  return parsePiDevHtml(await res.text());
}

export function buildPiDevSearchUrl(query: string): string {
  const params = new URLSearchParams();
  params.set("name", query);
  return `https://pi.dev/packages?${params.toString()}`;
}

export function buildPiDevPackageUrl(packageName: string): string {
  return `https://pi.dev/packages/${encodeURIComponent(packageName)}`;
}

export function parsePiDevHtml(html: string): PiDevPackage[] {
  const packages: PiDevPackage[] = [];
  const articleRegex = /<article\b([^>]*)data-package-card="true"([^>]*)>([\s\S]*?)<\/article>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html)) !== null) {
    const attrs = `${match[1] ?? ""} ${match[2] ?? ""}`;
    const body = match[3] ?? "";
    const parsed = parsePackageCard(attrs, body);
    if (parsed) packages.push(parsed);
  }

  return packages;
}

export function enrichResults(
  npmResults: Array<NpmSearchResult & { types?: PackageType[]; piDevUrl?: string }>,
  piDevResults: PiDevPackage[],
): Array<EnrichedResult> {
  const piDevMap = new Map(piDevResults.map((pkg) => [pkg.name.toLowerCase(), pkg]));

  return npmResults.map((npmPkg) => {
    const devPkg = piDevMap.get(npmPkg.name.toLowerCase());
    const existingTypes = npmPkg.types ?? [];

    return {
      ...npmPkg,
      types: existingTypes.length > 0 ? existingTypes : (devPkg?.types ?? []),
      piDevAuthor: devPkg?.author,
      piDevDownloads: devPkg?.downloads,
      piDevTimeAgo: devPkg?.timeAgo,
      piDevInstallCmd: devPkg?.installCmd,
      piDevUrl: npmPkg.piDevUrl ?? devPkg?.piDevUrl ?? buildPiDevPackageUrl(npmPkg.name),
    };
  });
}

function parsePackageCard(attrs: string, body: string): PiDevPackage | null {
  const name = decodeHtml(getAttr(attrs, "data-package-name") ?? "").trim();
  if (!name) return null;

  const description = extractText(body, /<p class="packages-desc">([\s\S]*?)<\/p>/);
  const metaBlock = extractRaw(body, /<div class="packages-meta">([\s\S]*?)<\/div>/);
  const metaItems = metaBlock
    ? Array.from(metaBlock.matchAll(/<span>([\s\S]*?)<\/span>/g)).map((item) => cleanText(item[1] ?? ""))
    : [];

  const attrTypes = parseTypes(getAttr(attrs, "data-package-types") ?? "");
  const badgeTypes = parseTypes(
    Array.from(body.matchAll(/<span class="meta-chip packages-badge"[^>]*data-type="([^"]+)"/g))
      .map((item) => item[1] ?? "")
      .join(","),
  );

  const installCmd = decodeHtml(
    getAttr(body, "data-copy-text") ??
    extractText(body, /<code>([\s\S]*?)<\/code>/),
  ).replace(/^\$\s*/, "").trim();

  return {
    name,
    description,
    author: metaItems[0] ?? "",
    downloads: metaItems[1] ?? formatDownloads(Number(getAttr(attrs, "data-package-downloads") ?? 0)),
    timeAgo: metaItems[2] ?? formatTimeAgo(Number(getAttr(attrs, "data-package-date") ?? 0)),
    types: dedupeTypes([...attrTypes, ...badgeTypes]),
    installCmd: installCmd || `pi install npm:${name}`,
    piDevUrl: buildPiDevPackageUrl(name),
  };
}

function parseTypes(value: string): PackageType[] {
  const types = value
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return dedupeTypes(types.filter(isPackageType));
}

function dedupeTypes(types: PackageType[]): PackageType[] {
  return Array.from(new Set(types));
}

function isPackageType(value: string): value is PackageType {
  return value === "extension" || value === "skill" || value === "prompt" || value === "theme";
}

function getAttr(source: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}="([^"]*)"`))?.[1];
}

function extractRaw(source: string, regex: RegExp): string | undefined {
  return source.match(regex)?.[1];
}

function extractText(source: string, regex: RegExp): string {
  return cleanText(extractRaw(source, regex) ?? "");
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function formatDownloads(downloads: number): string {
  if (!downloads || Number.isNaN(downloads)) return "";
  if (downloads >= 1_000_000) return `${(downloads / 1_000_000).toFixed(1)}M/mo`;
  if (downloads >= 1_000) return `${(downloads / 1_000).toFixed(1)}K/mo`;
  return `${downloads}/mo`;
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp || Number.isNaN(timestamp)) return "";
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
