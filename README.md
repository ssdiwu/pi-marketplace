# 🛒 pi-marketplace

[![npm version](https://img.shields.io/npm/v/pi-marketplace.svg)](https://www.npmjs.com/package/pi-marketplace)
[![license](https://img.shields.io/npm/l/pi-marketplace.svg)](https://github.com/ssdiwu/pi-marketplace/blob/main/LICENSE)
[![install size](https://packagephobia.now.sh/badge?p=pi-marketplace)](https://packagephobia.now.sh/result?p=pi-marketplace)

Pi extension for **searching, auditing, and installing** pi packages from npm — with built-in security review and pi.dev gallery links.

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
2. **Type filtering**: Fetches each result's `pi` manifest to determine resource type locally
3. **Gallery links**: Adds a pi.dev package page link to each result for quick browsing
4. **Security audit**:
   - **Layer 1 — Metadata** (zero cost): Resource types, dependency count, file count, package size, insecure flag
   - **Layer 2 — Source scan** (downloads tarball): Scans published `.ts/.js/.mjs/.cjs` files for dangerous patterns:
     - 🔴 Critical: `rm -rf`, `rimraf`, `fs.unlink`, `fs.rmdir`
     - 🟠 High: `eval()`, `Function()`, `execSync()`, `spawn()`
     - 🟡 Medium: `process.env`, `child_process`, HTTP requests
     - 🟢 Low: `chmod`, `chown`
5. **Install**: Shows audit report → requires explicit user confirmation → runs `pi install`

## Design Principles

- **Registry-first**: Search, detail, type filtering, and audit rely on npm registry metadata; results also include pi.dev gallery links for browsing.
- **Never auto-installs**: Always requires user confirmation after audit.
- **Static scan disclaimer**: Clearly states that keyword scanning cannot detect obfuscated code.
- **Zero dependencies**: Pure TypeScript, no runtime npm dependencies.

## Development

```bash
git clone https://github.com/507/pi-marketplace.git
cd pi-marketplace
npm install          # peer deps
pi --no-extensions -e .   # load only this extension for testing
```

### Test

```bash
npm test
```

### Type Check

```bash
npm run typecheck
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
