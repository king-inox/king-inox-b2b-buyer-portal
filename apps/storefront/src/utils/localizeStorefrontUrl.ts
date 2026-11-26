import { SUPPORT_LANGUAGE } from '@/constants';

const SERVICE_PATH =
  /^\/(?:api|graphql|remote|assets|content|cdn-cgi|_next|customer|login\/token)(?:\/|\.|$)/;
const FILE_PATH = /\.(?!php$|html?$)[a-z0-9]+$/i;

export function stripStorefrontLanguagePrefix(pathname: string): string {
  const code = pathname.split('/')[1];
  return SUPPORT_LANGUAGE.includes(code) ? pathname.slice(code.length + 1) || '/' : pathname;
}

export function localizeStorefrontUrl(value: string): string {
  if (!value || value.startsWith('#') || value.startsWith('?')) return value;
  const current = new URL(window.location.href);
  const language = current.pathname.split('/')[1];
  if (!SUPPORT_LANGUAGE.includes(language)) return value;

  const url = new URL(value, current);
  if (!['http:', 'https:'].includes(url.protocol)) return value;
  const storefrontOrigins = new Set([current.origin]);
  const { storeBaseUrl } = document.body.dataset;
  if (storeBaseUrl) storefrontOrigins.add(new URL(storeBaseUrl).origin);
  if (!storefrontOrigins.has(url.origin)) return value;

  const path = stripStorefrontLanguagePrefix(url.pathname);
  if (SERVICE_PATH.test(path) || FILE_PATH.test(path)) return value;
  url.pathname = `/${language}${path}`;
  url.protocol = current.protocol;
  url.host = current.host;
  return /^[a-z][a-z\d+.-]*:|^\/\//i.test(value)
    ? url.href
    : `${url.pathname}${url.search}${url.hash}`;
}
