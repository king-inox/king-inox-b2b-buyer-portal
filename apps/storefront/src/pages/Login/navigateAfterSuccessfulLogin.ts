import { type NavigateFunction } from 'react-router-dom';

import { localizeStorefrontUrl } from '@/utils/localizeStorefrontUrl';

export function navigateAfterSuccessfulLogin(
  navigate: NavigateFunction,
  quoteDetailToCheckoutUrl: string,
  redirectUrl: string,
): void {
  if (quoteDetailToCheckoutUrl) {
    navigate(quoteDetailToCheckoutUrl);
    return;
  }

  window.location.assign(localizeStorefrontUrl(redirectUrl));
}
