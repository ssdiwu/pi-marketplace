// ---------------------------------------------------------------------------
// Security Audit — metadata check + source code keyword scanning
// ---------------------------------------------------------------------------

import type { PackageDetail } from "./api.js";
import { execFile } from "node:child_process";
import { mkdir, rm, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  severity: RiskLevel;
  pattern: string;
  file: string;
  line?: number;
  context?: string;
}

export interface MetadataCheck {
  types: Array<"extension" | "skill" | "prompt" | "theme">;
  dependencyCount: number;
  peerDependencyCount: number;
  fileCount: number;
  unpackedSize: number;
  isInsecure: boolean;
  publishedAt: string;
}

export interface AuditReport {
  packageName: string;
  version: string;
  overallRisk: RiskLevel;
  metadata: MetadataCheck;
  findings: Finding[];
  summary: string;
  deepScanned: boolean;
}

// ---------------------------------------------------------------------------
// Danger Patterns
// ---------------------------------------------------------------------------

interface DangerPattern {
  pattern: RegExp;
  severity: RiskLevel;
  description: string;
}

const DANGER_PATTERNS: DangerPattern[] = [
  { pattern: /\brm\s+(-rf|--recursive)\s+/g, severity: "critical", description: "Recursive file deletion" },
  { pattern: /rimraf\s*\(/g, severity: "critical", description: "rimraf (recursive delete)" },
  { pattern: /fs\.unlink/g, severity: "critical", description: "File unlink/delete" },
  { pattern: /fs\.rmdir/g, severity: "critical", description: "Directory removal" },
  { pattern: /fs\.rm/g, severity: "critical", description: "fs.rm recursive delete" },
  { pattern: /eval\s*\(/g, severity: "high", description: "eval() dynamic code execution" },
  { pattern: /new\s+Function\s*\(/g, severity: "high", description: "Function() constructor" },
  { pattern: /execSync\s*\(/g, severity: "high", description: "Synchronous command execution" },
  { pattern: /exec\(\s*`/g, severity: "high", description: "Template literal in exec()" },
  { pattern: /spawn\s*\(/g, severity: "high", description: "Child process spawn" },
  { pattern: /process\.env/g, severity: "medium", description: "Environment variable access" },
  { pattern: /child_process/g, severity: "medium", description: "Child process module" },
  { pattern: /fetch\s*\(\s*http/gi, severity: "medium", description: "External HTTP request" },
  { pattern: /https?(?:Request|Agent)/gi, severity: "medium", description: "HTTP client usage" },
  { pattern: /chmod\s*\(/g, severity: "low", description: "File permission change" },
  { pattern: /chown\s*\(/g, severity: "low", description: "File ownership change" },
];

const IGNORED_DIRECTORIES = ["node_modules", ".git", ".cache", "coverage"];
const SOURCE_EXTENSIONS = [".ts", ".js", ".mjs", ".cjs"];

// ---------------------------------------------------------------------------
// Layer 1: Metadata Check (zero-cost)
// ---------------------------------------------------------------------------

export function metadataCheck(detail: PackageDetail): MetadataCheck {
  const deps = detail.dependencies ?? {};
  const peerDeps = detail.peerDependencies ?? {};
  const types: Array<"extension" | "skill" | "prompt" | "theme"> = [];
  if (detail.piManifest.extensions?.length) types.push("extension");
  if (detail.piManifest.skills?.length) types.push("skill");
  if (detail.piManifest.prompts?.length) types.push("prompt");
  if (detail.piManifest.themes?.length) types.push("theme");
  return {
    types,
    dependencyCount: Object.keys(deps).length,
    peerDependencyCount: Object.keys(peerDeps).length,
    fileCount: detail.dist.fileCount,
    unpackedSize: detail.dist.unpackedSize,
    isInsecure: (detail.flags?.insecure ?? 0) > 0,
    publishedAt: detail.date,
  };
}

export async function quickAudit(name: string): Promise<AuditReport> {
  const { getPackageDetail } = await import("./api.js");
  const detail = await getPackageDetail(name);
  return buildReport(name, detail.version, metadataCheck(detail), [], false);
}

// ---------------------------------------------------------------------------
// Layer 2: Source Code Scan (tarball download + keyword scan)
// ---------------------------------------------------------------------------

export async function sourceScan(name: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const tmpDir = join(tmpdir(), `pi-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  try {
    await mkdir(tmpDir, { recursive: true });
    await runCommand("npm", ["pack", name, `--pack-destination=${tmpDir}`], 30_000, "npm pack");

    const files = await readdir(tmpDir);
    const tgzFile = files.find((f) => f.endsWith(".tgz"));
    if (!tgzFile) throw new Error("No tarball found after npm pack");

    await runCommand("tar", ["xzf", join(tmpDir, tgzFile), "-C", tmpDir], 15_000, "tar extract");

    let scanDir = tmpDir;
    try {
      await readdir(join(tmpDir, "package"));
      scanDir = join(tmpDir, "package");
    } catch {
      // Use extracted root when tarball does not contain package/
    }

    await walkAndScan(scanDir, scanDir, findings);
  } finally {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  return findings;
}

async function walkAndScan(dir: string, rootDir: string, findings: Finding[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (IGNORED_DIRECTORIES.includes(entry.name)) continue;

    if (entry.isDirectory()) {
      await walkAndScan(fullPath, rootDir, findings);
      continue;
    }

    const ext = entry.name.includes(".") ? `.${entry.name.split(".").pop()}` : "";
    if (SOURCE_EXTENSIONS.includes(ext)) {
      await scanFile(fullPath, rootDir, findings);
    }
  }
}

async function scanFile(filePath: string, rootDir: string, findings: Finding[]): Promise<void> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    return;
  }

  const relPath = relative(rootDir, filePath) || filePath;
  const lines = content.split("\n");

  for (const danger of DANGER_PATTERNS) {
    const regex = new RegExp(danger.pattern.source, danger.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      let lineNum = 1;
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i]!.length + 1;
        if (charCount > match.index) {
          lineNum = i + 1;
          break;
        }
      }
      findings.push({
        severity: danger.severity,
        pattern: danger.description,
        file: relPath,
        line: lineNum,
        context: truncate(lines[lineNum - 1]?.trim() ?? "", 100),
      });
    }
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// ---------------------------------------------------------------------------
// Full Audit
// ---------------------------------------------------------------------------

export async function fullAudit(name: string, deepScan = true): Promise<AuditReport> {
  const { getPackageDetail } = await import("./api.js");
  const detail = await getPackageDetail(name);
  const meta = metadataCheck(detail);

  let findings: Finding[] = [];
  if (deepScan) {
    try {
      findings = await sourceScan(name);
    } catch (err) {
      findings = [{
        severity: "info",
        pattern: "Source scan unavailable",
        file: "",
        context: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }];
    }
  }
  return buildReport(name, detail.version, meta, findings, deepScan);
}

// ---------------------------------------------------------------------------
// Report Builder
// ---------------------------------------------------------------------------

function buildReport(
  name: string,
  version: string,
  meta: MetadataCheck,
  findings: Finding[],
  deepScanned: boolean,
): AuditReport {
  const crit = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const med = findings.filter((f) => f.severity === "medium").length;

  const overallRisk: RiskLevel =
    crit > 0 ? "critical" : high > 0 ? "high" : med > 2 ? "medium" : med > 0 ? "low" : "info";

  const hasExtensions = meta.types.includes("extension");
  const parts: string[] = [];

  if (hasExtensions && crit > 0) {
    parts.push(`⚠️ This extension contains ${crit} critical-risk patterns (file deletion, code execution). Review source before installing.`);
  } else if (hasExtensions && high > 0) {
    parts.push(`This extension contains ${high} high-risk patterns. Review recommended.`);
  } else if (findings.length === 0 && deepScanned) {
    parts.push("No dangerous patterns found in published source code. Package appears safe based on static analysis.");
  } else if (!deepScanned) {
    parts.push("Metadata-only audit (no source scan). Run with deepScan=true for full analysis.");
  } else {
    parts.push(`${findings.length} finding(s) found, all low/info severity.`);
  }

  return {
    packageName: name,
    version,
    overallRisk,
    metadata: meta,
    findings,
    summary: parts.join(" "),
    deepScanned,
  };
}

async function runCommand(
  command: string,
  args: string[],
  timeout: number,
  label: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    execFile(command, args, { timeout }, (err, _stdout, stderr) => {
      if (err) {
        reject(new Error(`${label} failed: ${err.message}${stderr ? `\n${stderr}` : ""}`));
        return;
      }
      resolve();
    });
  });
}
