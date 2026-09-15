import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import worker from './worker.mjs';
import prompt from './system-prompt.json' with { type: 'json' };

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', OPENAI_API_KEY: 'secret-test-key' };
const ask = (body = { question: 'Resumo', context: {} }, headers = {}) => new Request('https://www.hydraagro.sbs/api/hydra-assistant', { method: 'POST', headers: { Authorization: 'Bearer test-session', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockUpstream(t, options = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) return reply(options.user ?? { id: 'user-1' }, options.authStatus ?? 200);
    if (url.includes('consume_api_rate_limit')) {
      const body = JSON.parse(init.body);
      if (options.limitFailure) throw new Error('Unavailable');
      return reply(options.limits?.[body.p_endpoint] ?? { allowed: true, retryAfter: 0 });
    }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    return reply(options.ai ?? { output: [{ content: [{ text: 'Resposta de teste.' }] }] }, options.aiStatus ?? 200);
  });
  return calls;
}

test('preserves the original assistant instructions', () => {
  const original = execFileSync('python', ['-c', "import ast,json; m=ast.parse(open('api/hydra-assistant.py').read()); print(json.dumps(next(ast.literal_eval(n.value) for n in m.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SYSTEM_PROMPT' for t in n.targets))))"], { encoding: 'utf8' });
  assert.equal(prompt, JSON.parse(original));
});

test('unauthenticated requests never contact upstream services', async (t) => {
  const calls = mockUpstream(t);
  const request = ask();
  request.headers.delete('Authorization');
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
  assert.equal(response.headers.get('Cache-Control'), 'no-store, private');
});

test('expired sessions never reach the limiter or AI', async (t) => {
  const calls = mockUpstream(t, { authStatus: 401 });
  assert.equal((await worker.fetch(ask(), env)).status, 401);
  assert.equal(calls.length, 1);
});

test('rate limit rejection sends retry-after and never calls AI', async (t) => {
  const calls = mockUpstream(t, { limits: { 'hydra-assistant:minute': { allowed: false, retryAfter: 37 } } });
  const response = await worker.fetch(ask(), env);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '37');
  assert.equal(calls.length, 3);
});

test('rate limit outages and malformed responses fail closed', async (t) => {
  for (const options of [{ limitFailure: true }, { limits: { 'hydra-assistant:minute': {} } }]) {
    const calls = mockUpstream(t, options);
    assert.equal((await worker.fetch(ask(), env)).status, 503);
    assert.equal(calls.length, 2);
    t.mock.restoreAll();
  }
});

test('both declared and streamed oversized bodies are rejected', async (t) => {
  const calls = mockUpstream(t);
  assert.equal((await worker.fetch(ask({}, { 'Content-Length': '32769' }), env)).status, 413);
  assert.equal(calls.length, 0);
  assert.equal((await worker.fetch(ask('x'.repeat(32769)), env)).status, 413);
  assert.equal(calls.length, 3);
});

test('malformed JSON and array contexts never reach AI', async (t) => {
  const calls = mockUpstream(t);
  for (const body of ['{broken', { question: 'Resumo', context: [] }]) {
    assert.equal((await worker.fetch(ask(body), env)).status, 400);
  }
  assert.equal(calls.filter((call) => call.url.includes('openai')).length, 0);
});

test('authenticated AI response preserves payload and API contract', async (t) => {
  const calls = mockUpstream(t);
  const response = await worker.fetch(ask({ question: 'q'.repeat(700), context: { animals: 3 } }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: 'Resposta de teste.', model: 'gpt-5.6' });
  assert.equal(calls.length, 4);
  const payload = JSON.parse(calls[3].init.body);
  assert.equal(payload.store, false);
  assert.equal(payload.input[0].content[0].text, prompt);
  assert.ok(payload.input[1].content[0].text.includes('"animals":3'));
  assert.equal(payload.input[1].content[0].text.split('PERGUNTA DO USUÁRIO:\n')[1].length, 600);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-session');
  assert.equal(calls[3].init.headers.Authorization, 'Bearer secret-test-key');
});

test('missing AI config and upstream failures have safe responses', async (t) => {
  mockUpstream(t, { aiStatus: 500 });
  assert.equal((await worker.fetch(ask(), { ...env, OPENAI_API_KEY: '' })).status, 503);
  assert.equal((await worker.fetch(ask(), env)).status, 502);
});

test('static HTML, public links, sitemap, tag routing and 404s use built files', async () => {
  const assets = { async fetch(request) {
    const path = new URL(request.url).pathname;
    try {
      const file = await readFile(new URL(`../dist${path}`, import.meta.url));
      return new Response(request.method === 'HEAD' ? null : file, { headers: { 'Content-Type': path.endsWith('.html') ? 'text/html' : 'text/plain' } });
    } catch { return new Response(null, { status: 404 }); }
  } };
  const site = { ASSETS: assets };
  for (const path of ['/', '/sobre', '/funcionalidades', '/identificacao-animal', '/gestao-de-agua', '/sitemap.xml', '/robots.txt', '/tag/demo', '/preview/ios/splash']) {
    const response = await worker.fetch(new Request(`https://www.hydraagro.sbs${path}`), site);
    assert.equal(response.status, 200, path);
    const body = await response.text();
    assert.ok(body.length > 10, path);
    if (path === '/' || path === '/sobre') assert.ok(body.includes('<h1'), path);
    if (path.startsWith('/tag/') || path.startsWith('/preview/')) assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, follow');
    assert.equal(response.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  }
  const missing = await worker.fetch(new Request('https://www.hydraagro.sbs/nao-existe'), site);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('X-Robots-Tag'), 'noindex, follow');
  assert.equal((await worker.fetch(new Request('https://www.hydraagro.sbs/api/missing'), site)).status, 404);
  assert.equal((await worker.fetch(new Request('https://www.hydraagro.sbs/sobre/'), site)).headers.get('Location'), 'https://www.hydraagro.sbs/sobre');
  assert.equal((await worker.fetch(new Request('https://hydraagro.sbs/sobre?x=1'), site)).headers.get('Location'), 'https://www.hydraagro.sbs/sobre?x=1');
  assert.equal((await worker.fetch(new Request('https://hydra-agro.test.workers.dev/'), site)).headers.get('X-Robots-Tag'), 'noindex, follow');
});
