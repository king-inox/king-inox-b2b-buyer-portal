import { createPortal } from 'react-dom';
import { faker, renderWithProviders, within } from 'tests/test-utils';

import { Logo as RegistrationLogo } from '@/pages/RegisteredBCToB2B/Logo';

import B3Logo from './B3Logo';

afterEach(() => {
  vi.unstubAllGlobals();
  document.querySelector('iframe[data-logo-test]')?.remove();
});

it.each(['account', 'registration'])(
  'opens the localized home in the top window from the %s logo inside the portal iframe',
  (variant) => {
    vi.stubGlobal('location', { href: 'http://localhost:3001/pt/webshop#/orderDetail/139' });
    const frame = document.createElement('iframe');
    frame.dataset.logoTest = '';
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument;
    if (!frameDocument) throw new Error('Portal iframe document unavailable');
    const logo = faker.image.url();
    const { result } = renderWithProviders(
      createPortal(
        variant === 'account' ? <B3Logo /> : <RegistrationLogo logoUrl={logo} logoAlt="logo" />,
        frameDocument.body,
      ),
      { initialGlobalContext: { logo, isLogoLoaded: true } },
    );
    try {
      const link = within(frameDocument.body).getByRole('link', { name: 'logo' });
      expect(link).toHaveAttribute('href', '/pt/');
      expect(link).toHaveAttribute('target', '_top');
      expect(link.ownerDocument).toBe(frameDocument);
    } finally {
      result.unmount();
      frame.remove();
    }
  },
);
