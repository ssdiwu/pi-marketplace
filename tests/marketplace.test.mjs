import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const buildDir = resolve('.tmp/test-build');
const fixtureDir = join(tmpdir(), `pi-marketplace-fixture-${process.pid}`);

let api;
let enrich;
let security;

before(async () => {
  rmSync(buildDir, { recursive: true, force: true });
  execFileSync('bash', ['-lc', 'npx tsc --outDir .tmp/test-build --module esnext --target es2022 --moduleResolution bundler --skipLibCheck extensions/*.ts extensions/tools/*.ts'], {
    stdio: 'inherit',
  });

  api = await import(pathToFileURL(join(buildDir, 'api.js')).href);
  enrich = await import(pathToFileURL(join(buildDir, 'enrich.js')).href);
  security = await import(pathToFileURL(join(buildDir, 'security.js')).href);
});

after(() => {
  rmSync(buildDir, { recursive: true, force: true });
  rmSync(fixtureDir, { recursive: true, force: true });
});

test('searchPackages parses downloads from npm search results', async () => {
  const results = await api.searchPackages('pi-mcp-adapter', { limit: 5 });
  const target = results.find((pkg) => pkg.name === 'pi-mcp-adapter');

  assert.ok(target, 'expected pi-mcp-adapter in search results');
  assert.ok(target.downloads.monthly > 0, 'expected monthly downloads > 0');
  assert.ok(target.downloads.weekly > 0, 'expected weekly downloads > 0');
});

test('getPackageDetail follows dist-tags.latest metadata', async () => {
  const detail = await api.getPackageDetail('pi-mcp-adapter');
  const registry = await fetch('https://registry.npmjs.org/pi-mcp-adapter').then((res) => res.json());
  const latest = registry['dist-tags'].latest;

  assert.equal(detail.version, latest);
  assert.equal(detail.date, registry.time[latest]);
  assert.equal(detail.publisher.username, 'nicopreme');
  assert.match(detail.links.npm ?? '', /npmjs\.com\/package\/pi-mcp-adapter/);
  assert.match(detail.links.homepage ?? '', /github\.com/);
  assert.match(detail.links.repository ?? '', /github\.com/);
});

test('fetchPiDevPackages enriches search metadata from pi.dev', async () => {
  const results = await enrich.fetchPiDevPackages('mcp');
  const target = results.find((pkg) => pkg.name === 'pi-mcp-adapter');

  assert.ok(target, 'expected pi-mcp-adapter in pi.dev results');
  assert.equal(target.author, 'nicopreme');
  assert.ok(target.downloads.endsWith('/mo'), 'expected human-readable downloads');
  assert.match(target.timeAgo, /^(?:today|\d+[hdw] ago|\d+mo ago)$/);
  assert.ok(target.types.includes('extension'));
  assert.equal(target.installCmd, 'pi install npm:pi-mcp-adapter');
});

test('parsePiDevHtml parses rich metadata from pi.dev fixture HTML', () => {
  const html = readFileSync(resolve('tests/fixtures/pi-dev-packages.html'), 'utf8');
  const packages = enrich.parsePiDevHtml(html);
  const adapter = packages.find((pkg) => pkg.name === 'pi-mcp-adapter');
  const contextMode = packages.find((pkg) => pkg.name === 'context-mode');

  assert.equal(packages.length, 2);
  assert.ok(adapter, 'expected pi-mcp-adapter from fixture');
  assert.equal(adapter.author, 'nicopreme');
  assert.equal(adapter.downloads, '98.3K/mo');
  assert.equal(adapter.timeAgo, '6d ago');
  assert.deepEqual(adapter.types, ['extension']);
  assert.equal(adapter.installCmd, 'pi install npm:pi-mcp-adapter');
  assert.equal(adapter.piDevUrl, 'https://pi.dev/packages/pi-mcp-adapter');

  assert.ok(contextMode, 'expected context-mode from fixture');
  assert.deepEqual(contextMode.types, ['skill', 'extension']);
  assert.equal(contextMode.installCmd, 'pi install npm:context-mode');
});

test('sourceScan scans dist output files', async () => {
  mkdirSync(join(fixtureDir, 'dist'), { recursive: true });
  writeFileSync(join(fixtureDir, 'package.json'), '{"name":"pi-audit-fixture","version":"1.0.0"}\n');
  writeFileSync(
    join(fixtureDir, 'dist', 'index.js'),
    'export function run(input) {\n  return eval(input);\n}\n',
  );

  const findings = await security.sourceScan(fixtureDir);
  const evalFinding = findings.find((finding) => finding.file === 'dist/index.js');

  assert.ok(evalFinding, 'expected finding in dist/index.js');
  assert.equal(evalFinding.severity, 'high');
  assert.equal(evalFinding.line, 2);
});
