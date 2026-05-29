# 🛒 pi-marketplace

[![npm version](https://img.shields.io/npm/v/pi-marketplace.svg)](https://www.npmjs.com/package/pi-marketplace)
[![license](https://img.shields.io/npm/l/pi-marketplace.svg)](https://github.com/ssdiwu/pi-marketplace/blob/main/LICENSE)
[![install size](https://packagephobia.now.sh/badge?p=pi-marketplace)](https://packagephobia.now.sh/result?p=pi-marketplace)

Pi extension for **searching, auditing, and installing** pi packages from npm — with built-in security review and optional pi.dev enrichment.

## Features

| Tool | What it does |
|------|-------------|
| `marketplace_search` | Search pi packages by keyword, filter by type (extension/skill/prompt/theme) |
| `marketplace_detail` | Full package info: version, author, license, pi manifest, dependencies, size |
| `marketplace_audit` | Security audit: metadata check + source code keyword scanning |
| `marketplace_install` | Audit → user confirmation → install (never auto-installs) |

## Install

```bash
pi install npm:pi-marketplace
```

Reload if pi is already running:

```
/reload
```

## Usage

### Search packages

Ask pi to find packages:

> Find me a Pi package for MCP

> What theme packages are available?

> Search for subagent-related extensions

### View details

> Show me details of pi-mcp-adapter

### Security audit

> Audit the package @some-user/some-pkg before installing

### Install with review

> Install pi-mcp-adapter (will run audit first)

## How It Works

1. **Search**: Queries npm registry with `keywords:pi-package`, filters by your query
2. **Type filtering**: Fetches each result's `pi` manifest to determine resource type — done locally, not relying on pi.dev's buggy `type=` parameter
3. **Enrichment** (optional): If a web fetch tool is available (tinyfish, web-fetch, etc.), enriches results with pi.dev data
4. **Security audit**:
   - **Layer 1 — Metadata** (zero cost): Resource types, dependency count, file count, package size, insecure flag
   - **Layer 2 — Source scan** (downloads tarball): Scans `.ts/.js/.mjs` files for dangerous patterns:
     - 🔴 Critical: `rm -rf`, `rimraf`, `fs.unlink`, `fs.rmdir`
     - 🟠 High: `eval()`, `Function()`, `execSync()`, `spawn()`
     - 🟡 Medium: `process.env`, `child_process`, HTTP requests
     - 🟢 Low: `chmod`, `chown`
5. **Install**: Shows audit report → requires explicit user confirmation → runs `pi install`

## Design Principles

- **Tool-agnostic enrichment**: Detects available web fetch tools dynamically via `pi.getAllTools()`. No hard dependency on tinyfish or any specific tool.
- **Never auto-installs**: Always requires user confirmation after audit.
- **Static scan disclaimer**: Clearly states that keyword scanning cannot detect obfuscated code.
- **Zero dependencies**: Pure TypeScript, no runtime npm dependencies.

## Development

```bash
git clone https://github.com/507/pi-marketplace.git
cd pi-marketplace
npm install          # peer deps
pi -e .             # load extension for testing
```

### Type Check

```bash
npx tsc --noEmit --strict --moduleResolution bundler --module esnext --target es2022 --skipLibCheck extensions/*.ts extensions/tools/*.ts
```

## Configuration

No configuration needed. All tools accept parameters at call time:

| Parameter | Tool | Description |
|-----------|------|-------------|
| `query` | search | Search keyword |
| `type` | search | Filter: extension / skill / prompt / theme |
| `limit` | search | Max results (default 20) |
| `name` | detail / audit / install | Package name |
| `deepScan` | audit / install | Download and scan source (default true) |

## License

MIT
