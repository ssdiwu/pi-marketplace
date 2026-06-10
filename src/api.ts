// ---------------------------------------------------------------------------
// npm registry API — search, detail, pi manifest
// ---------------------------------------------------------------------------

const NPM_REGISTRY = "https://registry.npmjs.org";
const SEARCH_URL = `${NPM_REGISTRY}/-/v1/search`;
const DEFAULT_LIMIT = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NpmSearchResult {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  links: {
    npm?: string;
    homepage?: string;
    repository?: string;
  };
  publisher: { username: string; email?: string };
  date: string;
  downloads: { monthly: number; weekly: number };
  score: { final: number };
}

export interface PiManifest {
  extensions?: string[];
  skills?: string[];
  prompts?: string[];
  themes?: string[];
  video?: string;
  image?: string;
}

export interface PackageDetail extends NpmSearchResult {
  license: string | Record<string, unknown>;
  author?: string | Record<string, unknown>;
  maintainers: Array<{ username: string; email?: string }>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  piManifest: PiManifest;
  dist: {
    tarball: string;
    shasum: string;
    integrity: string;
    fileCount: number;
    unpackedSize: number;
  };
  flags?: { insecure: number };
}

export type PackageType = "extension" | "skill" | "prompt" | "theme";

type RegistryVersion = Record<string, unknown>;
type RegistryDoc = Record<string, unknown> & {
  versions?: Record<string, RegistryVersion>;
  time?: Record<string, string>;
  "dist-tags"?: { latest?: string };
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchPackages(
  query: string,
  options?: { limit?: number },
): Promise<NpmSearchResult[]> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const url = new URL(SEARCH_URL);
  const searchText = ["keywords:pi-package", query.trim()].filter(Boolean).join(" ");
  url.searchParams.set("text", searchText);
  url.searchParams.set("size", String(Math.min(limit, 250)));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`npm registry search failed: HTTP ${res.status}`);

  const data = (await res.json()) as {
    objects?: Array<{
      package: Record<string, unknown>;
      downloads?: { monthly?: number; weekly?: number };
      score?: { final?: number };
    }>;
  };

  return (data.objects ?? []).map((obj) => ({
    name: String(obj.package.name ?? ""),
    version: String(obj.package.version ?? "0.0.0"),
    description: String(obj.package.description ?? ""),
    keywords: Array.isArray(obj.package.keywords) ? obj.package.keywords as string[] : [],
    links: normalizeLinks(String(obj.package.name ?? ""), obj.package),
    publisher: normalizePublisher(obj.package.publisher),
    date: String(obj.package.date ?? ""),
    downloads: {
      monthly: Number(obj.downloads?.monthly ?? 0),
      weekly: Number(obj.downloads?.weekly ?? 0),
    },
    score: { final: Number(obj.score?.final ?? 0) },
  }));
}

// ---------------------------------------------------------------------------
// Package Detail
// ---------------------------------------------------------------------------

export async function getPackageDetail(name: string): Promise<PackageDetail> {
  const data = await fetchRegistryDoc(name);
  const latestName = getLatestVersionName(data);
  const latestVersion = latestName ? data.versions?.[latestName] : undefined;

  if (!latestVersion || !latestName) {
    throw new Error(`npm registry detail for ${name} did not contain a latest version`);
  }

  const maintainerSource = latestVersion.maintainers ?? data.maintainers;
  const date = data.time?.[latestName] ?? "";

  return {
    name: String(latestVersion.name ?? name),
    version: String(latestVersion.version ?? latestName),
    description: String(latestVersion.description ?? ""),
    keywords: Array.isArray(latestVersion.keywords) ? latestVersion.keywords as string[] : [],
    links: normalizeLinks(name, latestVersion, data),
    publisher: normalizePublisher(latestVersion._npmUser ?? data._npmUser ?? firstMaintainer(maintainerSource)),
    date,
    downloads: { monthly: 0, weekly: 0 },
    score: { final: 0 },
    license: (latestVersion.license as string | Record<string, unknown>) ?? "UNKNOWN",
    author: latestVersion.author as string | Record<string, unknown> | undefined,
    maintainers: normalizeMaintainers(maintainerSource),
    dependencies: latestVersion.dependencies as Record<string, string> | undefined,
    peerDependencies: latestVersion.peerDependencies as Record<string, string> | undefined,
    devDependencies: latestVersion.devDependencies as Record<string, string> | undefined,
    piManifest: (latestVersion.pi as PiManifest | undefined) ?? {},
    dist: {
      tarball: getString((latestVersion.dist as Record<string, unknown> | undefined)?.tarball) ?? "",
      shasum: getString((latestVersion.dist as Record<string, unknown> | undefined)?.shasum) ?? "",
      integrity: getString((latestVersion.dist as Record<string, unknown> | undefined)?.integrity) ?? "",
      fileCount: Number((latestVersion.dist as Record<string, unknown> | undefined)?.fileCount ?? 0),
      unpackedSize: Number((latestVersion.dist as Record<string, unknown> | undefined)?.unpackedSize ?? 0),
    },
    flags: (data.flags as { insecure: number } | undefined) ?? (latestVersion.flags as { insecure: number } | undefined),
  };
}

// ---------------------------------------------------------------------------
// Quick pi manifest lookup (no full detail needed)
// ---------------------------------------------------------------------------

export async function getPkgPiManifest(name: string): Promise<PiManifest> {
  try {
    const data = await fetchRegistryDoc(name);
    const latestName = getLatestVersionName(data);
    if (!latestName) return {};
    return (data.versions?.[latestName]?.pi as PiManifest | undefined) ?? {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Infer package type from pi manifest
// ---------------------------------------------------------------------------

export function inferPackageTypes(manifest: PiManifest): PackageType[] {
  const types: PackageType[] = [];
  if (manifest.extensions?.length) types.push("extension");
  if (manifest.skills?.length) types.push("skill");
  if (manifest.prompts?.length) types.push("prompt");
  if (manifest.themes?.length) types.push("theme");
  return types;
}

async function fetchRegistryDoc(name: string): Promise<RegistryDoc> {
  const res = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`npm registry detail failed for ${name}: HTTP ${res.status}`);
  return await res.json() as RegistryDoc;
}

function getLatestVersionName(data: RegistryDoc): string | null {
  const latest = data["dist-tags"]?.latest;
  if (latest && data.versions?.[latest]) return latest;
  const versionKeys = Object.keys(data.versions ?? {});
  return versionKeys.at(-1) ?? null;
}

function normalizeLinks(
  packageName: string,
  primary: Record<string, unknown>,
  fallback?: Record<string, unknown>,
): PackageDetail["links"] {
  const primaryLinks = getLinksRecord(primary);
  const fallbackLinks = getLinksRecord(fallback);
  const homepage =
    getLinkValue(primaryLinks?.homepage) ??
    getLinkValue(primary.homepage) ??
    getLinkValue(fallbackLinks?.homepage) ??
    getLinkValue(fallback?.homepage);
  const repository =
    getLinkValue(primaryLinks?.repository) ??
    getLinkValue(primary.repository) ??
    getLinkValue(fallbackLinks?.repository) ??
    getLinkValue(fallback?.repository);
  const npm =
    getLinkValue(primaryLinks?.npm) ??
    getLinkValue(fallbackLinks?.npm) ??
    `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;

  return {
    npm,
    ...(homepage ? { homepage } : {}),
    ...(repository ? { repository } : {}),
  };
}

function normalizePublisher(value: unknown): NpmSearchResult["publisher"] {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      username: getString(record.username) ?? getString(record.name) ?? "unknown",
      ...(getString(record.email) ? { email: getString(record.email) } : {}),
    };
  }
  return { username: "unknown" };
}

function normalizeMaintainers(value: unknown): PackageDetail["maintainers"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizePublisher(item))
    .filter((item) => item.username !== "unknown");
}

function firstMaintainer(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function getLinksRecord(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const links = value?.links;
  return links && typeof links === "object" ? links as Record<string, unknown> : undefined;
}

function getLinkValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return getString((value as Record<string, unknown>).url);
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
