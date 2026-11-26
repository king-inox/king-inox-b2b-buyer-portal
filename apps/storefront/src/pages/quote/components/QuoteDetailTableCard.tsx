import { Box, CardContent, Typography } from '@mui/material';

import { ProductImage } from '@/components/B3ProductList';
import BackorderMessage from '@/components/BackorderMessage';
import { useBackorderStorefrontMessaging } from '@/hooks/useBackorderStorefrontMessaging';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useB3Lang } from '@/lib/lang';
import { useAppSelector } from '@/store';
import { DisplayCurrency } from '@/types/currency';
import { getBCPrice } from '@/utils/b3Product/b3Product';

import { formatQuoteConvertedPrice, formatQuoteConvertedUnitPrice } from './quotePriceFormat';
import { isDetailProductOptionVisible } from './quoteProductOptions';

interface QuoteTableCardProps {
  measure?: string;
  description?: string;
  item: any;
  len: number;
  getTaxRate: (variants: any) => number;
  itemIndex?: number;
  showPrice: (price: string, row: CustomFieldItems) => string | number;
  displayDiscount: boolean;
  currency: CurrencyProps | DisplayCurrency;
  showBackorderDetails?: boolean;
  status?: string | number;
}

function QuoteDetailTableCard(props: QuoteTableCardProps) {
  const {
    item: quoteTableItem,
    len,
    itemIndex,
    getTaxRate,
    showPrice,
    currency,
    displayDiscount,
    showBackorderDetails = false,
    status,
    measure = '—',
    description,
  } = props;
  const isOrdered = Number(status) === 4;
  const b3Lang = useB3Lang();
  const isCurrencySymbolPlacementFixEnabled = useFeatureFlag(
    'B2B-3876.fix_quote_currency_symbol_placement',
  );
  const enteredInclusiveTax = useAppSelector(
    ({ storeConfigs }) => storeConfigs.currencies.enteredInclusiveTax,
  );
  const { isBackorderMessagingContextEnabled, hasAnyBackorderDisplay } =
    useBackorderStorefrontMessaging();

  const {
    basePrice,
    quantity,
    options,
    notes,
    offeredPrice,
    backorderMessage,
    quantityBackordered,
    totalOnHand,
    productsSearch: { variants = [] },
  } = quoteTableItem;

  const taxRate = getTaxRate(variants);
  const taxPrice = enteredInclusiveTax
    ? (Number(basePrice) * taxRate) / (1 + taxRate)
    : Number(basePrice) * taxRate;
  const discountTaxPrice = enteredInclusiveTax
    ? (Number(offeredPrice) * taxRate) / (1 + taxRate)
    : Number(offeredPrice) * taxRate;

  const price = getBCPrice(Number(basePrice), taxPrice);
  const discountPrice = getBCPrice(Number(offeredPrice), discountTaxPrice);

  const isDiscount = Number(basePrice) - Number(offeredPrice) > 0 && displayDiscount;

  const total = Number(price) * Number(quantity);
  const totalWithDiscount = discountPrice * Number(quantity);

  return (
    <Box
      key={quoteTableItem.id}
      width="100%"
      sx={{
        borderTop: '1px solid #D9DCE9',
        borderBottom: itemIndex === len - 1 ? '1px solid #D9DCE9' : '',
      }}
    >
      <CardContent
        sx={{
          color: '#313440',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          pl: 0,
        }}
      >
        <ProductImage src={quoteTableItem.imageUrl} alt="" loading="lazy" />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography variant="body1" color="#212121">
            {description}
          </Typography>
          <Box
            sx={{
              margin: '1rem 0',
            }}
          >
            {options.length > 0 && (
              <Box>
                {options
                  .filter((option: { optionName?: string }) =>
                    isDetailProductOptionVisible(option.optionName),
                  )
                  .map((option: any) => (
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        lineHeight: '1.5',
                        color: '#455A64',
                      }}
                      key={option.optionName}
                    >
                      {`${option.optionName}: ${option.optionLabel}`}
                    </Typography>
                  ))}
              </Box>
            )}
          </Box>
          <Typography sx={{ my: 1 }}>
            {b3Lang('quoteDetail.table.measure')}: {measure}
          </Typography>
          <Typography variant="body1" color="#616161">
            {notes}
          </Typography>
          {isBackorderMessagingContextEnabled && hasAnyBackorderDisplay && !isOrdered && (
            <BackorderMessage
              totalOnHand={totalOnHand}
              quantityBackordered={quantityBackordered}
              backorderMessage={backorderMessage}
              visible={showBackorderDetails}
            />
          )}
          <Typography
            sx={{
              fontSize: '14px',
            }}
          >
            {b3Lang('quoteDetail.tableCard.price')}
            {isDiscount && (
              <span
                style={{
                  marginLeft: '5px',
                  textDecoration: 'line-through',
                }}
              >
                {`${showPrice(
                  formatQuoteConvertedUnitPrice(price, {
                    currency,
                    useCurrentCurrency: isCurrencySymbolPlacementFixEnabled,
                  }),
                  quoteTableItem,
                )}`}
              </span>
            )}
            <span
              style={{
                marginLeft: '5px',
                color: isDiscount ? '#2E7D32' : '#212121',
              }}
            >
              {`${showPrice(
                formatQuoteConvertedUnitPrice(offeredPrice, {
                  currency,
                  useCurrentCurrency: isCurrencySymbolPlacementFixEnabled,
                }),
                quoteTableItem,
              )}`}
            </span>
          </Typography>

          <Typography
            sx={{
              padding: '12px 0',
              fontSize: '14px',
            }}
          >
            {b3Lang('quoteDetail.tableCard.qty', { quantity })}
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
            }}
          >
            {b3Lang('quoteDetail.tableCard.total')}
            {isDiscount && (
              <span
                style={{
                  marginLeft: '5px',
                  textDecoration: 'line-through',
                }}
              >
                {`${showPrice(
                  formatQuoteConvertedPrice(total, {
                    currency,
                    useCurrentCurrency: isCurrencySymbolPlacementFixEnabled,
                  }),
                  quoteTableItem,
                )}`}
              </span>
            )}
            <span
              style={{
                marginLeft: '5px',
                color: isDiscount ? '#2E7D32' : '#212121',
              }}
            >
              {`${showPrice(
                formatQuoteConvertedPrice(totalWithDiscount, {
                  currency,
                  useCurrentCurrency: isCurrencySymbolPlacementFixEnabled,
                }),
                quoteTableItem,
              )}`}
            </span>
          </Typography>
        </Box>
      </CardContent>
    </Box>
  );
}

export default QuoteDetailTableCard;
