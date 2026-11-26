import { faker } from 'tests/test-utils';

import B3Request from '../../request/b3Fetch';

import { getBCGraphqlToken } from './login';

vi.mock('@/utils/basicConfig', () => ({ platform: 'bigcommerce' }));
vi.mock('../../request/b3Fetch', () => ({ default: { graphqlB2B: vi.fn() } }));

afterEach(() => {
  delete window.B3.setting.storefront_token_url;
  vi.restoreAllMocks();
});

it('obtains the token from the explicitly configured same-origin endpoint', async () => {
  const token = faker.string.uuid();
  window.B3.setting.storefront_token_url = '/api/b2b/storefront-token';
  const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(Response.json({ token }));

  await expect(getBCGraphqlToken({})).resolves.toBe(token);

  expect(fetchMock).toHaveBeenCalledWith(
    new URL('/api/b2b/storefront-token', window.location.origin),
    { method: 'POST', credentials: 'same-origin', cache: 'no-store' },
  );
  expect(B3Request.graphqlB2B).not.toHaveBeenCalled();
});

it('surfaces proxy errors without requesting a token directly from B2B', async () => {
  window.B3.setting.storefront_token_url = '/api/b2b/storefront-token';
  vi.spyOn(window, 'fetch').mockResolvedValue(new Response('', { status: 502 }));

  await expect(getBCGraphqlToken({})).rejects.toThrow('502');
  expect(B3Request.graphqlB2B).not.toHaveBeenCalled();
});

it('rejects token endpoints on another origin', async () => {
  window.B3.setting.storefront_token_url = 'https://other.example/token';
  const fetchMock = vi.spyOn(window, 'fetch');

  await expect(getBCGraphqlToken({})).rejects.toThrow('current origin');
  expect(fetchMock).not.toHaveBeenCalled();
});
