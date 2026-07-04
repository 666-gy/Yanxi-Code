const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isInside, buildRunPlan } = require('./terminal.cjs');

test('workspace path guard rejects traversal and accepts descendants', () => {
  const root = path.join(os.tmpdir(), 'yanxi-workspace');
  assert.equal(isInside(root, path.join(root, 'src', 'main.js')), true);
  assert.equal(isInside(root, path.join(root, '..', 'secret.txt')), false);
});

test('workspace path guard rejects symlinks that escape the workspace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yanxi-root-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'yanxi-outside-'));
  const link = path.join(root, 'escaped');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(isInside(root, path.join(link, 'secret.txt')), false);
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('run plans quote JavaScript paths and reject non-executable files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yanxi-test-'));
  const jsFile = path.join(root, "beginner's example.js");
  const markdown = path.join(root, 'README.md');
  fs.writeFileSync(jsFile, 'console.log("ok")');
  fs.writeFileSync(markdown, '# notes');

  const jsPlan = buildRunPlan(jsFile, root);
  assert.equal(jsPlan.supported, true);
  assert.match(jsPlan.commandPreview, /beginner/);
  assert.equal(buildRunPlan(markdown, root).supported, false);
  assert.throws(() => buildRunPlan(path.join(root, '..', 'outside.js'), root), /工作区/);
  fs.rmSync(root, { recursive: true, force: true });
});
