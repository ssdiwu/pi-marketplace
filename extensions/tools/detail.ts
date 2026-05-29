// ---------------------------------------------------------------------------
// marketplace_detail — View package details + pi manifest
// ---------------------------------------------------------------------------

import { Type, Static } from "@earendil-works/pi-ai";
import { getPackageDetail } from "../api.js";
import { formatPackageDetail } from "../format.js";

const Params = Type.Object({
  name: Type.String({ description: "Package name (e.g., 'pi-mcp-adapter', '@scope/pkg-name')" }),
});

type ParamsType = Static<typeof Params>;

export const marketplace_detail = {
  name: "marketplace_detail",
  label: "Package Detail",
  description:
    "Show detailed information about a pi package: version, description, author, license, pi manifest, dependencies, size, and links.",
  promptSnippet:
    "View full details of a pi package including pi manifest and dependencies",
  promptGuidelines: [
    "Use marketplace_detail when users want to see detailed info about a specific pi package.",
    "Call this after marketplace_search to inspect a package before recommending or installing it.",
    "The result includes the pi manifest which reveals what resources (extensions/skills/prompts/themes) the package provides.",
  ],
  parameters: Params,

  async execute(_id: string, params: ParamsType) {
    try {
      const detail = await getPackageDetail(params.name);
      const output = formatPackageDetail(detail);

      return {
        content: [{ type: "text" as const, text: output }],
        details: {
          name: detail.name,
          version: detail.version,
          types: Object.keys(detail.piManifest).filter(k =>
            ["extensions", "skills", "prompts", "themes"].includes(k) &&
            Array.isArray((detail.piManifest as Record<string, unknown>)[k]) &&
            ((detail.piManifest as Record<string, unknown>)[k] as string[]).length > 0,
          ),
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Failed to get details for "${params.name}": ${msg}` }],
        details: { name: params.name, version: "", types: [], error: msg },
      };
    }
  },
};
