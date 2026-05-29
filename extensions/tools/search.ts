// ---------------------------------------------------------------------------
// marketplace_search — Search pi packages from npm registry
// ---------------------------------------------------------------------------

import { Type, Static, StringEnum } from "@earendil-works/pi-ai";
import { searchPackages, getPkgPiManifest, inferPackageTypes } from "../api.js";
import { formatSearchResults } from "../format.js";
import type { NpmSearchResult, PackageType } from "../api.js";

const Params = Type.Object({
  query: Type.String({ description: "Search query (e.g., 'mcp', 'subagents', 'theme')" }),
  type: Type.Optional(StringEnum(["extension", "skill", "prompt", "theme"] as const)),
  limit: Type.Optional(Type.Number({ description: "Max results (default 20, max 250)" })),
});

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

      // Enrich with pi manifest types
      let enriched: Array<NpmSearchResult & { types: PackageType[]; piDevUrl: string }> = [];

      if (params.type) {
        // Batch fetch pi manifests for type filtering
        const manifestPromises = results.map((pkg) =>
          getPkgPiManifest(pkg.name).catch(() => ({})),
        );
        const manifests = await Promise.all(manifestPromises);

        enriched = results
          .map((pkg, i) => ({
            ...pkg,
            types: inferPackageTypes(manifests[i]!),
            piDevUrl: `https://pi.dev/packages/${encodeURIComponent(pkg.name)}`,
          }))
          .filter((pkg) =>
            params.type ? pkg.types.includes(params.type!) : true,
          );

        if (enriched.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No ${params.type}-type pi packages found for "${params.query}". Try without type filter or different keywords.`,
            }],
            details: { resultCount: 0 },
          };
        }
      } else {
        enriched = results.map((pkg) => ({
          ...pkg,
          types: [] as PackageType[],
          piDevUrl: `https://pi.dev/packages/${encodeURIComponent(pkg.name)}`,
        }));
      }

      const output = formatSearchResults(enriched);
      return {
        content: [{ type: "text" as const, text: output }],
        details: { resultCount: enriched.length, query: params.query, typeFilter: params.type ?? null },
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
