import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Five named documents only; no repository-wide scan or generated files.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['README.md', 'README.zh-CN.md', 'README.ru.md', 'ROADMAP.md', 'ROADMAP.zh-CN.md'];
const targets = ['c-lvgl', 'lispbm-vesc', 'basic-iotembedded'];
const deadline = Date.now() + 3000;
const abort = new AbortController();
const timer = setTimeout(() => abort.abort(new Error('Documentation check exceeded 3 seconds')), 3000);
const cancel = () => abort.abort(new Error('Documentation check cancelled'));
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);
let totalBytes = 0;
let totalLinks = 0;

function checkBounds() {
  if (abort.signal.aborted) throw abort.signal.reason;
  if (Date.now() > deadline) throw new Error('Documentation check exceeded 3 seconds');
}

function metadata(text, name) {
  const match = text.match(/<!-- docs-sync: family=(readme|roadmap) revision=([^\s]+) -->/);
  if (!match) throw new Error(`${name}: missing docs-sync revision`);
  if (match[1] !== (name.startsWith('README') ? 'readme' : 'roadmap')) {
    throw new Error(`${name}: wrong document family`);
  }
  return match[2];
}

function taskStates(text, name) {
  const rows = text.split('\n').filter(line => /^\| GEN-\d+ \|/.test(line));
  if (rows.length === 0 || rows.length > 32) throw new Error(`${name}: expected 1..32 task rows`);
  const tasks = new Map();
  for (const row of rows) {
    checkBounds();
    const columns = row.split('|').map(value => value.trim());
    const id = columns[1];
    const state = columns[4];
    if (tasks.has(id)) throw new Error(`${name}: duplicate ${id}`);
    if (!['planned', 'partial', 'done-doc', 'done-local'].includes(state)) {
      throw new Error(`${name}: invalid state ${state} for ${id}`);
    }
    tasks.set(id, state);
  }
  return JSON.stringify([...tasks]);
}

try {
  let revision;
  let outputStatus;
  let roadmapTasks;
  for (const name of names) {
    checkBounds();
    const path = resolve(root, name);
    const info = await stat(path);
    totalBytes += info.size;
    if (totalBytes > 4 * 1024 * 1024) throw new Error('Named documentation exceeded 4 MiB');
    const text = await readFile(path, { encoding: 'utf8', signal: abort.signal });
    const currentRevision = metadata(text, name);
    revision ??= currentRevision;
    if (revision !== currentRevision) throw new Error(`${name}: revision differs from ${revision}`);
    for (const target of targets) {
      checkBounds();
      if (!text.includes(`\`${target}\``)) throw new Error(`${name}: missing target ${target}`);
    }
    if (name.startsWith('README')) {
      const status = text.match(/<!-- output-status: ([^\n]+) -->/)?.[1];
      if (!status) throw new Error(`${name}: missing output status`);
      outputStatus ??= status;
      if (status !== outputStatus) throw new Error(`${name}: output status differs`);
    } else {
      const tasks = taskStates(text, name);
      roadmapTasks ??= tasks;
      if (tasks !== roadmapTasks) throw new Error(`${name}: task IDs/order/statuses differ`);
    }
    const links = [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)];
    totalLinks += links.length;
    if (totalLinks > 160) throw new Error('Named documentation exceeded 160 links');
    for (const link of links) {
      checkBounds();
      const href = link[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const local = href.split('#')[0];
      const targetPath = resolve(dirname(path), decodeURIComponent(local));
      try { await stat(targetPath); }
      catch { throw new Error(`${name}: missing local link ${href}`); }
    }
  }
  checkBounds();
  console.log(`Documentation synchronized: ${names.length} files, revision ${revision}, ${JSON.parse(roadmapTasks).length} tasks, ${totalLinks} links checked`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  process.removeListener('SIGINT', cancel);
  process.removeListener('SIGTERM', cancel);
}
