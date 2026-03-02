import { type IntlayerConfig, Locales } from 'intlayer';

const config: IntlayerConfig = {
  internationalization: {
    locales: [Locales.ENGLISH, Locales.PORTUGUESE],
    defaultLocale: Locales.ENGLISH,
  },
  routing: {
    // Use prefix-all so every locale has an explicit URL prefix (/en/... and /pt/...).
    // This makes locale switching unambiguous — the URL always takes priority over
    // any stored cookie, which fixes the production locale-switching issue.
    mode: 'prefix-all',
  },
};

export default config;
