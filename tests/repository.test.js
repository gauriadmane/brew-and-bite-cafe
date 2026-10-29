const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('README has no broken local Markdown documentation links', () => {
  const text = read('README.md');
  const links = [...text.matchAll(/\]\(([^)]+)\)/g)]
    .map(match => match[1].split('#')[0])
    .filter(value => value && !/^(https?:|mailto:|#)/i.test(value));
  for (const link of links) {
    assert.ok(fs.existsSync(path.join(root, link)), `Missing README link: ${link}`);
  }
  assert.ok(links.length >= 3, 'README should link to technical documentation');
});

test('environment template includes runtime settings without live credentials', () => {
  const text = read('.env.example');
  for (const key of ['NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET', 'TAX_BPS',
    'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
    assert.match(text, new RegExp('^' + key + '=', 'm'), `Missing ${key}`);
  }
  assert.match(read('.gitignore'), /^\.env$/m);
  assert.match(read('.gitignore'), /^!\.env\.example$/m);
  assert.doesNotMatch(text, /mongodb\+srv:\/\/[^\s]+@|rzp_(?:test|live)_[a-zA-Z0-9]{12,}/);
});

test('package-lock matches application dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version, lock.version);
  assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[''].devDependencies);
});
