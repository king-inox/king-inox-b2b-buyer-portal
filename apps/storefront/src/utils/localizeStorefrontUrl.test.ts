import { SUPPORT_LANGUAGE } from '@/constants';

import { localizeStorefrontUrl, stripStorefrontLanguagePrefix } from './localizeStorefrontUrl';

beforeEach(() => {
  vi.stubGlobal('location', { href: 'http://localhost:3001/pt/webshop#/orderDetail/139' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.storeBaseUrl;
});

it.each([
  ['/', '/pt/'],
  ['/cart.php?x=1#items', '/pt/cart.php?x=1#items'],
  ['/en/cart.php', '/pt/cart.php'],
  ['/pt/cart.php', '/pt/cart.php'],
  ['/fr', '/pt/'],
  ['/checkout?cartId=123', '/pt/checkout?cartId=123'],
  ['/webshop#/quotes', '/pt/webshop#/quotes'],
  ['cart.php', '/pt/cart.php'],
  ['http://localhost:3001/', 'http://localhost:3001/pt/'],
  ['//localhost:3001/cart.php', 'http://localhost:3001/pt/cart.php'],
  ['#/orders', '#/orders'],
  ['?action=login', '?action=login'],
  ['https://external.example/path', 'https://external.example/path'],
  ['http://localhost:3001@evil.example/cart.php', 'http://localhost:3001@evil.example/cart.php'],
  ['https://localhost:3001/cart.php', 'https://localhost:3001/cart.php'],
  ['mailto:sales@example.com', 'mailto:sales@example.com'],
  ['/customer/current.jwt', '/customer/current.jwt'],
  ['/api/v1/orders', '/api/v1/orders'],
  ['/graphql', '/graphql'],
  ['/login/token/123', '/login/token/123'],
  ['/content/file.pdf', '/content/file.pdf'],
])('localizes navigation %s to %s', (value, expected) => {
  expect(localizeStorefrontUrl(value)).toBe(expected);
});

it.each(SUPPORT_LANGUAGE)(
  'preserves the active %s prefix across storefront navigation',
  (language) => {
    vi.stubGlobal('location', { href: `https://store.example/${language}/webshop#/orders` });
    expect(localizeStorefrontUrl('/')).toBe(`/${language}/`);
    expect(localizeStorefrontUrl('/en/product/')).toBe(`/${language}/product/`);
  },
);

it('routes the configured storefront origin through the current proxy', () => {
  document.body.dataset.storeBaseUrl = 'https://king-inox.mybigcommerce.com/';
  expect(localizeStorefrontUrl('https://king-inox.mybigcommerce.com/en/product/?x=1#details')).toBe(
    'http://localhost:3001/pt/product/?x=1#details',
  );
});

it('does not invent a language on an unprefixed storefront', () => {
  vi.stubGlobal('location', { href: 'https://store.example/webshop' });
  expect(localizeStorefrontUrl('/cart.php')).toBe('/cart.php');
});

it('recognizes checkout and cart paths independently of the language prefix', () => {
  expect(stripStorefrontLanguagePrefix('/pt/checkout')).toBe('/checkout');
  expect(stripStorefrontLanguagePrefix('/it/cart.php')).toBe('/cart.php');
  expect(stripStorefrontLanguagePrefix('/pt')).toBe('/');
  expect(stripStorefrontLanguagePrefix('/product/')).toBe('/product/');
});
