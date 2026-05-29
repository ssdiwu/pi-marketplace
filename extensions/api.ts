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

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchPackages(
  query: string,
  options?: { limit?: number },
): Promise<NpmSearchResult[]> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const url = new URL(SEARCH_URL);
  // Always require pi-package keyword to filter to pi packages only
  const searchText = [`keywords:pi-package`, query.trim()].filter(Boolean).join(" ");
  url.searchParams.set("text", searchText);
  url.searchParams.set("size", String(Math.min(limit, 250)));

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`npm registry search failed: HTTP ${res.status}`);

  const data = (await res.json()) as {
    objects: Array<{ package: NpmSearchResult & Record<string, unknown>; score: { final: number } }>;
  };

  return (data.objects ?? []).map((obj) => ({
    name: obj.package.name,
    version: obj.package.version,
    description: obj.package.description ?? "",
    keywords: (Array.isArray(obj.package.keywords) ? obj.package.keywords : []) as string[],
    links: obj.package.links ?? {},
    publisher: obj.package.publisher ?? { username: "unknown" },
    date: obj.package.date ?? "",
    downloads: obj.package.downloads ?? { monthly: 0, weekly: 0 },
    score: obj.score ?? { final: 0 },
  }));
}

// ---------------------------------------------------------------------------
// Package Detail
// ---------------------------------------------------------------------------

export async function getPackageDetail(name: string): Promise<PackageDetail> {
  const res = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`npm registry detail failed for ${name}: HTTP ${res.status}`);

  const data = await res.json() as Record<string, unknown>;

  // Get latest version
  {
    const verMap = data.versions as Record<string, Record<string, unknown>> | undefined;
    const versionKeys = verMap ? Object.keys(verMap) : [];
    const latestVersion = versionKeys.length > 0 ? verMap![versionKeys[versionKeys.length - 1]!] : data as Record<string, unknown>;

    return {
      name: (latestVersion.name as string) ?? name,
      version: (latestVersion.version as string) ?? "0.0.0",
      description: (latestVersion.description as string) ?? "",
      keywords: (Array.isArray(latestVersion.keywords) ? latestVersion.keywords : []) as string[],
      links: (latestVersion.links as PackageDetail["links"]) ?? {},
      publisher: (latestVersion.publisher as PackageDetail["publisher"]) ?? { username: "unknown" },
      date: (latestVersion.date as string) ?? "",
      downloads: { monthly: 0, weekly: 0 },
      score: { final: 0 },
      license: (latestVersion.license as string | Record<string, unknown>) ?? "UNKNOWN",
      author: latestVersion.author as string | Record<string, unknown> | undefined,
      maintainers: (Array.isArray(latestVersion.maintainers) ? latestVersion.maintainers : []) as PackageDetail["maintainers"],
      dependencies: latestVersion.dependencies as Record<string, string> | undefined,
      peerDependencies: latestVersion.peerDependencies as Record<string, string> | undefined,
      devDependencies: latestVersion.devDependencies as Record<string, string> | undefined,
      piManifest: ((latestVersion.pi as PiManifest | undefined) ?? {}) as PiManifest,
      dist: {
        tarball: ((latestVersion.dist as Record<string, unknown> | undefined)?.tarball as string) ?? "",
        shasum: ((latestVersion.dist as Record<string, unknown> | undefined)?.shasum as string) ?? "",
        integrity: ((latestVersion.dist as Record<string, unknown> | undefined)?.integrity as string) ?? "",
        fileCount: Number((latestVersion.dist as Record<string, unknown> | undefined)?.fileCount ?? 0),
        unpackedSize: Number((latestVersion.dist as Record<string, unknown> | undefined)?.unpackedSize ?? 0),
      },
      flags: latestVersion.flags as { insecure: number } | undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Quick pi manifest lookup (no full detail needed)
// ---------------------------------------------------------------------------

export async function getPkgPiManifest(name: string): Promise<PiManifest> {
  try {
    const res = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return {};
    const data = await res.json() as Record<string, unknown>;
    const versions = data.versions as Record<string, Record<string, unknown>> | undefined;
    const versionKeys = versions ? Object.keys(versions) : [];
    if (versionKeys.length === 0) return {};
    const latest = versions![versionKeys[versionKeys.length - 1]!]!;
    return ((latest.pi as PiManifest | undefined) ?? {}) as PiManifest;
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
