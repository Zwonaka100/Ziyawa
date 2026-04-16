import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

async function getPage(path) {
  const response = await fetch(new URL(path, BASE_URL), {
    redirect: 'follow',
  });

  const html = await response.text();

  return {
    response,
    html,
    finalUrl: response.url,
  };
}

function assertHtmlResponse(response) {
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/i);
}

test('sign-in page loads', async () => {
  const page = await getPage('/auth/signin');

  assertHtmlResponse(page.response);
  assert.match(page.html, /sign in|welcome back|email/i);
});

test('browse events page loads', async () => {
  const page = await getPage('/ziwaphi');

  assertHtmlResponse(page.response);
  assert.match(page.html, /ziwaphi|find events|showing/i);
});

test('event details page is reachable for ticket purchase visibility', async () => {
  const response = await fetch(new URL('/api/events/search?page=1', BASE_URL));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.events) && payload.events.length > 0, 'Expected at least one event from the search API');

  const firstEvent = payload.events[0];
  const eventPage = await getPage(`/events/${firstEvent.id}`);

  assertHtmlResponse(eventPage.response);
  assert.match(eventPage.html, /ticket|buy|free/i);
});

test('organizer booking flow is protected for anonymous visitors', async () => {
  const page = await getPage('/dashboard/organizer/events/test-event/book');

  assertHtmlResponse(page.response);
  assert.ok(
    page.finalUrl.includes('/auth/signin') || /sign in|login/i.test(page.html),
    'Expected anonymous organizer booking access to redirect to sign-in'
  );
});

test('wallet and support routes resolve safely', async () => {
  for (const path of ['/wallet', '/support']) {
    const page = await getPage(path);

    assertHtmlResponse(page.response);
    assert.ok(
      page.finalUrl.includes('/auth/signin') || /sign in|support|wallet/i.test(page.html),
      `Expected ${path} to either load safely or redirect to sign-in`
    );
  }
});
