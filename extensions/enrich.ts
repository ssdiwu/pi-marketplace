// ---------------------------------------------------------------------------
// pi.dev Enrichment — HTML parsing + web fetch tool detection
// ---------------------------------------------------------------------------

import type { NpmSearchResult, PackageType } from "./api.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PiDevPackage {
  name: string;
  description: string;
  author: string;
  downloads: string; // e.g. "94.6K/mo"
  timeAgo: string;   // e.g. "3d ago"
  types: PackageType[];
  installCmd: string;
}

// ---------------------------------------------------------------------------
// Web Fetch Tool Detection
// ---------------------------------------------------------------------------

/**
 * Detect available web fetch tools from pi's registered tools.
 * Returns the name of a suitable tool, or null if none found.
 *
 * We look for tools that can render/fetch web pages:
 * - tinyfish_fetch
 * - web_fetch
 * - fetch
 * - Any tool with "fetch" in name or description
 */
export function detectWebFetchTool(
  allTools: Array<{ name: string; description?: string }>,
): string | null {
  // Priority order: known reliable tools first
  const knownPatterns = [
    /^tinyfish_fetch$/,
    /^web_fetch$/,
    /^fetch$/,
  ];

  // Check exact matches first
  for (const tool of allTools) {
    if (knownPatterns.some((p) => p.test(tool.name))) return tool.name;
  }

  // Fallback: any tool with "fetch" in name
  const fetchTool = allTools.find((t) =>
    /fetch/i.test(t.name) || /fetch/i.test(t.description ?? ""),
  );
  return fetchTool?.name ?? null;
}

// ---------------------------------------------------------------------------
// pi.dev URL Builder
// ---------------------------------------------------------------------------

export function buildPiDevUrl(query: string, type?: PackageType): string {
  const params = new URLSearchParams();
  params.set("name", query);
  if (type) params.set("type", type);
  return `https://pi.dev/packages?${params.toString()}`;
}

export function buildPiDevPackageUrl(packageName: string): string {
  return `https://pi.dev/packages/${encodeURIComponent(packageName)}`;
}

// ---------------------------------------------------------------------------
// pi.dev HTML Parser
// ---------------------------------------------------------------------------

/**
 * Parse pi.dev/packages search results page HTML.
 * Extracts <article> elements containing package info.
 */
export function parsePiDevHtml(html: string): PiDevPackage[] {
  const packages: PiDevPackage[] = [];

  // Extract <article> blocks
  const articleRegex = /<article>([\s\S]*?)<\/article>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html)) !== null) {
    const article = match[1];
    const pkg = parseArticle(article);
    if (pkg) packages.push(pkg);
  }

  return packages;
}

function parseArticle(html: string): PiDevPackage | null {
  // <h3>package-name</h3>
  const h3Match = html.match(/<h3>([\s\S]*?)<\/h3>/);
  const name = h3Match ? stripTags(h3Match[1]).trim() : "";
  if (!name) return null;

  // First <p> is description
  const pMatches = html.matchAll(/<p>([\s\S]*?)<\/p>/g);
  const paragraphs = Array.from(pMatches).map((m) => stripTags(m[1]).trim());
  const description = paragraphs[0] ?? "";

  // Second <p> contains: author downloads/mo time ago
  const metaLine = paragraphs[1] ?? "";
  const { author, downloads, timeAgo } = parseMetaLine(metaLine);

  // Third <p> contains type tags
  const typeStr = paragraphs[2] ?? "";
  const types = parseTypeTags(typeStr);

  // Install command in <code>
  const codeMatch = html.match(/<code>\s*\$?\s*(pi install [\s\S]*?)\s*<\/code>/);
  const installCmd = codeMatch ? stripTags(codeMatch[1]).trim() : `pi install npm:${name}`;

  return { name, description, author, downloads, timeAgo, types, installCmd };
}

function parseMetaLine(line: string): { author: string; downloads: string; timeAgo: string } {
  // Format: "authorName 94.6K/mo 3d ago"
  const parts = line.split(/\s+/).filter(Boolean);
  let author = "";
  let downloads = "";
  let timeAgo = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (/\/mo$/.test(part)) {
      downloads = part;
      if (i > 0) author = parts[i - 1]!;
      if (i + 1 < parts.length && /\d+[dwmh] ago/.test(parts[i + 1]!)) {
        timeAgo = parts[i + 1]!;
      }
      break;
    }
  }

  // Fallback: if no downloads pattern found, treat entire line as author+time
  if (!downloads) {
    author = parts[0] ?? "";
    timeAgo = parts[parts.length - 1] ?? "";
  }

  return { author, downloads, timeAgo };
}

function parseTypeTags(str: string): PackageType[] {
  const types: PackageType[] = [];
  const validTypes: PackageType[] = ["extension", "skill", "prompt", "theme"];
  for (const t of validTypes) {
    if (str.toLowerCase().includes(t)) types.push(t);
  }
  return types;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// ---------------------------------------------------------------------------
// Merge npm results with pi.dev enrichment
// ---------------------------------------------------------------------------

export interface EnrichedResult extends NpmSearchResult {
  types: PackageType[];
  piDevAuthor?: string;
  piDevDownloads?: string;
  piDevTimeAgo?: string;
  piDevUrl: string;
}

/**
 * Merge npm registry search results with pi.dev enrichment data.
 * Matches by package name (case-insensitive).
 */
export function enrichResults(
  npmResults: NpmSearchResult[],
  piDevResults: PiDevPackage[],
): Array<EnrichedResult> {
  const piDevMap = new Map<string, PiDevPackage>();
  for (const pkg of piDevResults) {
    piDevMap.set(pkg.name.toLowerCase(), pkg);
  }

  return npmResults.map((npmPkg) => {
    const devPkg = piDevMap.get(npmPkg.name.toLowerCase());
    return {
      ...npmPkg,
      types: devPkg?.types ?? [],
      piDevAuthor: devPkg?.author,
      piDevDownloads: devPkg?.downloads,
      piDevTimeAgo: devPkg?.timeAgo,
      piDevUrl: buildPiDevPackageUrl(npmPkg.name),
    };
  });
}
