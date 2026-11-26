# Buyer Portal translations

The JSON dictionaries cover the same 23 language codes as the storefront theme's
`lang/` directory. `en.json` defines the message keys and ICU argument structure.

Existing translations were preserved. Missing messages were translated from
English with Google Translate on 2026-11-26. These machine translations require
linguistic review before publication, especially checkout, shipping, payment and
quote terminology. ICU arguments, plural/select branches and rich text tags were
excluded from translation. Arabic currently uses the existing ICU plural branches;
a native reviewer should check whether additional plural categories are needed.

The active proxy language (`html[data-proxy-language]`) takes precedence over
BigCommerce's native locale. Channel-wide custom text is excluded on proxy pages
because it is not language-specific. Unsupported dictionaries raise an error.
Dates use the same active language, and the Material UI theme uses the document's
language and writing direction.

Run the dictionary coverage and ICU checks from `apps/storefront`:

```sh
yarn test run src/lib/lang/locales/locales.test.ts src/lib/lang/LangProvider.test.tsx
```
