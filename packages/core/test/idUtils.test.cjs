const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../dist/idUtils.js'), 'utf8');
function load(fill) {
  const exports = {};
  const context = { exports, Uint8Array, crypto: fill && {getRandomValues: fill} };
  vm.runInNewContext(code, context, {timeout:1000});
  return exports;
}
test('default alphabet, length, configured alphabet and zero length', () => {
  let calls = 0;
  const api = load(bytes => {calls++; bytes.fill(35); return bytes;});
  assert.equal(api.generateSecureId(), '999999999');
  assert.equal(api.generateSecureId(4, 'abcd'), 'dddd');
  assert.equal(api.generateSecureId(0), '');
  assert.equal(calls, 1);
});
test('rejects biased tail bytes and refills the shared 128-byte buffer', () => {
  let calls = 0;
  const api = load(bytes => {calls++; assert.equal(bytes.length,128); bytes.fill(0); if(calls===1) bytes.set([252,253,254,255,35]); return bytes;});
  assert.equal(api.generateSecureId(2), '9a');
  assert.equal(api.generateSecureId(123), 'a'.repeat(123));
  assert.equal(calls, 2);
});
test('invalid lengths and alphabets fail before requesting entropy', () => {
  const api = load(() => {throw Error('unexpected entropy request');});
  for (const length of [-1, 0.1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER+1, '9', null]) {
    assert.throws(() => api.generateSecureId(length), /non-negative safe integer/);
  }
  for (const chars of ['', null, 42, []]) assert.throws(() => api.generateSecureId(1, chars), /non-empty string/);
  assert.throws(() => api.generateSecureId(1, 'a'.repeat(257)), /Alphabet too large/);
});
test('supports alphabet boundaries and preserves UTF-16 code-unit behavior', () => {
  const api = load(bytes => {bytes.fill(255); return bytes;});
  assert.equal(api.generateSecureId(3, 'x'), 'xxx');
  const alphabet = Array.from({length:256},(_,i) => String.fromCharCode(i)).join('');
  assert.equal(api.generateSecureId(2, alphabet), '\u00ff\u00ff');
});
test('fails closed without crypto, including after a buffer has been populated', () => {
  assert.throws(() => load().generateSecureId(), /Cryptographically strong/);
  const exports = {};
  const context = {exports, Uint8Array, crypto:{getRandomValues: bytes => bytes.fill(0)}};
  vm.runInNewContext(code, context);
  assert.equal(exports.generateSecureId(), 'aaaaaaaaa');
  context.crypto = undefined;
  assert.throws(() => exports.generateSecureId(), /Cryptographically strong/);
});
test('propagates RNG failure and never returns a partially generated ID', () => {
  assert.throws(() => load(() => {throw Error('rng failed');}).generateSecureId(), /rng failed/);
});
test('UUID has deterministic version and variant bits', () => {
  const api = load(bytes => {bytes.fill(255); return bytes;});
  assert.equal(api.generateSecureUuid(), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});
test('real Web Crypto smoke test preserves shape (not a randomness proof)', () => {
  const api = require('../dist/idUtils.js');
  const ids = Array.from({length:100}, () => api.generateSecureId());
  assert.ok(ids.every(id => /^[a-z0-9]{9}$/.test(id)));
  assert.equal(new Set(ids).size, ids.length);
  assert.match(api.generateSecureUuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
