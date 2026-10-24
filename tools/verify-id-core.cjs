const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name));
const json = name => JSON.parse(read(name));
const digest = (bytes,algorithm='sha256',encoding='hex') => createHash(algorithm).update(bytes).digest(encoding);
const manifest = json('artifacts/withys-core-0.1.0-pilot.2.json');
const archive = path.join(root,manifest.path);
assert.equal(digest(read(manifest.path)),manifest.sha256,'Artifact SHA-256 changed');
assert.equal('sha512-'+digest(read(manifest.path),'sha512','base64'),manifest.integrity,'Artifact integrity changed');
const expectedFiles=['LICENSE','README.md','dist/idUtils.d.ts','dist/idUtils.js','package.json'];
const payload=execFileSync('tar',['-tf',archive],{encoding:'utf8'}).trim().split(/\r?\n/).sort();
assert.deepEqual(payload,expectedFiles.map(file=>'package/'+file).sort(),'Unexpected packed files');
const suspicious=/(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|\b(?:service_role|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY)\b)/;
for(const file of manifest.files){
  const bytes=execFileSync('tar',['-xOf',archive,'package/'+file.path]);
  assert.equal(digest(bytes),file.sha256,'Packed bytes changed: '+file.path);
  assert.equal(suspicious.test(bytes.toString()),false,'Excluded secret/config marker: '+file.path);
}
const pkg=JSON.parse(execFileSync('tar',['-xOf',archive,'package/package.json']));
assert.equal(pkg.name,manifest.name);assert.equal(pkg.version,manifest.version);
assert.equal(pkg.private,true);assert.equal(pkg.license,'BSD-3-Clause');
assert.equal(manifest.license,pkg.license);
assert.equal(execFileSync('tar',['-xOf',archive,'package/LICENSE'],{encoding:'utf8'}),read('packages/core/LICENSE').toString().replace(/\r\n/g,'\n'));
assert.equal(json('packages/core/package-lock.json').packages['node_modules/typescript'].license,'Apache-2.0');
for(const field of ['dependencies','peerDependencies','optionalDependencies','bundledDependencies'])assert.equal(pkg[field],undefined);
for(const hook of ['preinstall','install','postinstall','prepare','prepack','postpack','prepublish','prepublishOnly'])assert.equal(pkg.scripts?.[hook],undefined);
const spec='file:../'+manifest.path;
assert.equal(json('app/package.json').dependencies[manifest.name],spec);
const lock=json('app/package-lock.json');
assert.equal(lock.packages[''].dependencies[manifest.name],spec);
assert.equal(lock.packages['node_modules/'+manifest.name].resolved,spec);
assert.equal(lock.packages['node_modules/'+manifest.name].version,manifest.version);
assert.equal(lock.packages['node_modules/'+manifest.name].integrity,manifest.integrity);
assert.equal(read('app/lib/idUtils.ts').toString().replace(/\r\n/g,'\n'),"// Compatibility entry point for the exact pinned ID utility artifact.\nexport { generateSecureId, generateSecureUuid } from '@withys/core';\n");
const contract=fs.existsSync(path.join(root,'public-export.json'))?json('public-export.json'):json('docs/shared-core-id-provenance.json');
const files=contract.idPilot?.exportFiles || contract.exportFiles;
for(const file of files){
  assert.equal(digest(Buffer.from(read(file.target).toString().replace(/\r\n/g,'\n'))),file.sha256,'Export digest changed: '+file.target);
  assert.equal(suspicious.test(read(file.target).toString()),false,'Excluded marker in export');
}
assert.equal(digest(Buffer.from(files.map(file=>file.source+'\n').join(''))),contract.idPilot?.allowlistSha256 || contract.allowlistSha256);
assert.equal(digest(Buffer.from(read('packages/core/src/idUtils.ts').toString().replace(/\r\n/g,'\n'))),manifest.sourceSha256);
// Check every changed/untracked Public path, not just selected files. This also
// proves Public save-safety, parsers, frameworks and existing notices stayed put.
if(contract.idPilot){
  const git=(...args)=>execFileSync('git',['--no-optional-locks',...args],{cwd:root,encoding:'utf8'}).trim();
  const changed=[git('diff','--name-only',contract.idPilot.baselinePublicRevision),git('ls-files','--others','--exclude-standard')].join('\n').split(/\r?\n/).filter(Boolean);
  const allowed=new Set([...files.map(file=>file.target),...contract.idPilot.integrationFiles]);
  for(const file of changed)assert.ok(allowed.has(file),'Unexpected Public change: '+file);
  assert.equal(read('LICENSE').toString().replace(/\r\n/g,'\n'),execFileSync('git',['show',contract.idPilot.baselinePublicRevision+':LICENSE'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'));
}
const peer=process.argv[2];
if(peer){
  assert.deepEqual(read(manifest.path),fs.readFileSync(path.join(peer,manifest.path)),'Consumers have different artifacts');
  assert.deepEqual(manifest,JSON.parse(fs.readFileSync(path.join(peer,'artifacts/withys-core-0.1.0-pilot.2.json'))));
  const peerLock=JSON.parse(fs.readFileSync(path.join(peer,'app/package-lock.json')));
  assert.deepEqual(lock.packages['node_modules/'+manifest.name],peerLock.packages['node_modules/'+manifest.name]);
}
console.log(JSON.stringify({artifact:manifest.name+'@'+manifest.version,sha256:manifest.sha256,exportedFiles:files.length,packedFiles:payload.length,peerIdentical:!!peer,checks:'digests, exact allowlists, pins, runtime dependency closure, install hooks, targeted secret/config markers',publication:'selective draft PR authorized; registry release disabled; integration gates pending'},null,2));
