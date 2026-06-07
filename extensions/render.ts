// ---------------------------------------------------------------------------
// renderResult — collapsible markdown rendering for tool output
// ---------------------------------------------------------------------------
//
// Inspired by pi-tinyfish:
//   https://github.com/ssdiwu/pi-tinyfish/blob/main/extensions/render.ts
//
// Default `renderResult` body for the 4 pi-marketplace tools.
//
// - isPartial → "⏳ Running..." placeholder (avoids re-rendering big markdown
//   on every event).
// - !expanded → one-line summary + "ctrl+o to expand" hint. Summary is the
//   pre-formatted string the caller passes (it should already include the
//   relevant count / status from `details`).
// - expanded → full markdown from `content`. The `Markdown` component handles
//   wrapping and theme colors.
//
// Tools that need fully custom rendering should write their own
// `renderResult` and skip this helper.
// ---------------------------------------------------------------------------

import { Text, Markdown, type Component } from "@earendil-works/pi-tui";
import { keyHint, getMarkdownTheme } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Types — match the shape pi passes to renderResult
// ---------------------------------------------------------------------------

export interface ToolResultLike {
  content: Array<{ type: string; text?: string }>;
  details?: Record<string, unknown>;
}

export interface RenderOptions {
  expanded: boolean;
  isPartial: boolean;
}

// ---------------------------------------------------------------------------
// Shared collapsible markdown renderer
// ---------------------------------------------------------------------------

export function renderCollapsibleMarkdown(
  result: ToolResultLike,
  options: RenderOptions,
  theme: { fg: (color: string, text: string) => string },
  summary: string,
): Component {
  if (options.isPartial) {
    return new Text(theme.fg("warning", "⏳ Running..."), 0, 0);
  }

  if (!options.expanded) {
    const hint = keyHint("app.tools.expand", "to expand");
    return new Text(
      `${theme.fg("success", summary)}  ${theme.fg("dim", `(${hint})`)}`,
      0,
      0,
    );
  }

  const text = result.content
    .filter(
      (c): c is { type: "text"; text: string } =>
        c.type === "text" && typeof c.text === "string",
    )
    .map((c) => c.text)
    .join("\n");

  return new Markdown(text, 0, 0, getMarkdownTheme());
}

// ---------------------------------------------------------------------------
// Risk badge helper — shared by audit and install summaries
// ---------------------------------------------------------------------------

const RISK_EMOJI: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
  info: "⚪",
};

export function formatRiskBadge(risk: string): string {
  const emoji = RISK_EMOJI[risk] ?? "⚪";
  return `${emoji} ${risk.toUpperCase()}`;
}
