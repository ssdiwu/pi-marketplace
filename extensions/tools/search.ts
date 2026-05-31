// ---------------------------------------------------------------------------
// marketplace_search — Search pi packages from npm registry
// ---------------------------------------------------------------------------

import { Type, Static, StringEnum } from "@earendil-works/pi-ai";
import { searchPackages, getPkgPiManifest, inferPackageTypes } from "../api.js";
import { formatSearchResults } from "../format.js";
import { enrichResults, fetchPiDevPackages } from "../enrich.js";
import type { NpmSearchResult, PackageType, PiManifest } from "../api.js";

const Params = Type.Object({
  query: Type.String({ description: "Search query (e.g., 'mcp', 'subagents', 'theme')" }),
  type: Type.Optional(StringEnum(["extension", "skill", "prompt", "theme"] as const)),
  limit: Type.Optional(Type.Number({ description: "Max results (default 20, max 250)" })),
});

const MANIFEST_CONCURRENCY = 8;

type ParamsType = Static<typeof Params>;

export const marketplace_search = {
  name: "marketplace_search",
  label: "Search Pi Packages",
  description:
    "Search for installable pi packages from npm registry. Returns package name, version, description, downloads, and install command. Supports type filtering (extension/skill/prompt/theme).",
  promptSnippet:
    "Search and discover pi packages by keyword, filter by type (extension/skill/prompt/theme)",
  promptGuidelines: [
    "Use marketplace_search when users want to find pi packages for a specific capability or browse available packages.",
    "Use the type parameter to narrow results: extension for code extensions, skill for skills, theme for themes, prompt for templates.",
    "Prefer marketplace_search over raw npm commands when looking for pi packages.",
  ],
  parameters: Params,

  async execute(_id: string, params: ParamsType) {
    try {
      const results = await searchPackages(params.query, {
        limit: params.limit ?? 20,
      });

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No pi packages found for "${params.query}". Try different keywords.` }],
          details: { resultCount: 0 },
        };
      }

      const piDevResults = await fetchPiDevPackages(params.query).catch(() => []);
      const searched = params.type
        ? await withTypeFilter(results, params.type)
        : withGalleryLinks(results);
      const enriched = enrichResults(searched, piDevResults);

      if (enriched.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `No ${params.type}-type pi packages found for "${params.query}". Try without type filter or different keywords.`,
          }],
          details: { resultCount: 0 },
        };
      }

      return {
        content: [{ type: "text" as const, text: formatSearchResults(enriched) }],
        details: {
          resultCount: enriched.length,
          query: params.query,
          typeFilter: params.type ?? null,
          piDevEnrichedCount: enriched.filter((pkg) => pkg.piDevAuthor || pkg.piDevDownloads || pkg.piDevTimeAgo).length,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Search failed: ${msg}` }],
        details: { resultCount: 0, error: msg },
      };
    }
  },
};

async function withTypeFilter(
  results: NpmSearchResult[],
  type: PackageType,
): Promise<Array<NpmSearchResult & { types: PackageType[]; piDevUrl: string }>> {
  const manifests = await mapWithConcurrency(
    results,
    MANIFEST_CONCURRENCY,
    async (pkg) => getPkgPiManifest(pkg.name).catch(() => ({} as PiManifest)),
  );

  return results
    .map((pkg, i) => ({
      ...pkg,
      types: inferPackageTypes(manifests[i] ?? {}),
      piDevUrl: `https://pi.dev/packages/${encodeURIComponent(pkg.name)}`,
    }))
    .filter((pkg) => pkg.types.includes(type));
}

function withGalleryLinks(
  results: NpmSearchResult[],
): Array<NpmSearchResult & { types: PackageType[]; piDevUrl: string }> {
  return results.map((pkg) => ({
    ...pkg,
    types: [],
    piDevUrl: `https://pi.dev/packages/${encodeURIComponent(pkg.name)}`,
  }));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]!, currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
