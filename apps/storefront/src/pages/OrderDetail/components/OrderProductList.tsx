import { Alert, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { B3ProductList } from '@/components/B3ProductList';
import { isDisambiguationLabel } from '@/pages/quote/components/quoteProductOptions';
import { fetchQuotePdfVariants } from '@/pages/quote/components/useQuotePdfResources';
import { MoneyFormat, ProductItem } from '@/types';
import { currencyFormatInfo, ordersCurrencyFormat } from '@/utils/b3CurrencyFormat';

interface Props<T extends ProductItem> {
  products: Array<T & { variant_id?: number }>;
  variantProducts: Array<ProductItem & { variant_id?: number }>;
  money?: MoneyFormat;
  quantityKey?: string;
  totalText?: string;
  canToProduct?: boolean;
  textAlign?: string;
  getCurrentProductUrls?: (productId: number | undefined) => void;
}

export function OrderProductList<T extends ProductItem>({
  products,
  variantProducts,
  money,
  quantityKey,
  totalText,
  canToProduct,
  textAlign,
  getCurrentProductUrls,
}: Props<T>) {
  const targets = variantProducts.map((product) => ({
    sku: product.sku,
    productId: product.product_id,
    variantId: product.variant_id,
  }));
  const { data: variants = {}, error } = useQuery({
    queryKey: ['order-product-measures', targets],
    queryFn: () => fetchQuotePdfVariants(targets),
    enabled: variantProducts.length > 0,
    staleTime: 60_000,
    retry: false,
  });

  const formatUnitPrice = (price: number) =>
    `${ordersCurrencyFormat(
      { ...(money || currencyFormatInfo()), decimal_places: 2 },
      price * 100,
      false,
    )} %`;

  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <B3ProductList
      hideMobileImages
      products={products}
      money={money}
      quantityKey={quantityKey}
      totalText={totalText}
      canToProduct={canToProduct}
      textAlign={textAlign}
      getCurrentProductUrls={getCurrentProductUrls}
      formatUnitPrice={formatUnitPrice}
      isProductOptionVisible={(label) => !isDisambiguationLabel(label)}
      renderMeasure={(product) => (
        <Typography component="span">
          {variants[Number(product.variant_id)]?.dimensions.MISURA}
        </Typography>
      )}
    />
  );
}
