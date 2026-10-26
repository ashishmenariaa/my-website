// tests/helpers.js
// Loads route modules with fake models/Razorpay injected through the require cache,
// so the real Express handlers run without MongoDB or network access.
const path = require('path');
const express = require('express');

const root = path.join(__dirname, '..');

function stubModule(relativeOrName, exportsValue) {
  const resolved = require.resolve(relativeOrName.startsWith('.') ? path.join(root, relativeOrName) : relativeOrName,
    { paths: [root] });
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsValue };
}

function freshRequire(relative) {
  const resolved = require.resolve(path.join(root, relative));
  delete require.cache[resolved];
  return require(resolved);
}

/** Starts an app that mounts `router` at `mountPath` with req.user preset, returns { url, close }. */
async function startApp(mountPath, router, user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = user; next(); });
  app.use(mountPath, router);
  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  return {
    url: `http://127.0.0.1:${server.address().port}${mountPath}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

module.exports = { stubModule, freshRequire, startApp, postJson };
