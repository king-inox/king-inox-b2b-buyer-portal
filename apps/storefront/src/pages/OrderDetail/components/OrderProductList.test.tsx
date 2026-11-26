import { builder, faker, renderWithProviders, screen } from 'tests/test-utils';

import { fetchQuotePdfVariants } from '@/pages/quote/components/useQuotePdfResources';

import { OrderProductList } from './OrderProductList';

vi.mock('@/pages/quote/components/useQuotePdfResources', () => ({
  fetchQuotePdfVariants: vi.fn(),
}));

const buildProductWith = builder(() => ({
  id: faker.number.int(),
  product_id: faker.number.int({ min: 1 }),
  variant_id: faker.number.int({ min: 1 }),
  sku: faker.string.alphanumeric(),
  name: faker.commerce.productName(),
  quantity: faker.number.int({ min: 2, max: 10 }),
  imageUrl: faker.image.url(),
  base_price: faker.number.int({ min: 1, max: 9 }).toString(),
  product_options: [
    { option_id: faker.number.int(), display_name: 'disambigua', display_value: '0' },
  ],
}));

it('shows the variant measure and price per hundred, hides disambiguation and keeps the total in currency', async () => {
  const product = buildProductWith('WHATEVER_VALUES');
  const measure = faker.string.alphanumeric(10);
  vi.mocked(fetchQuotePdfVariants).mockResolvedValue({
    [product.variant_id]: {
      description: { en: 'Gateway description', it: 'Descrizione gateway' },
      packaging: {},
      stock: {},
      dimensions: { MISURA: measure },
    },
  });

  renderWithProviders(<OrderProductList products={[product]} variantProducts={[product]} />);

  expect(screen.getByText('Misura')).toBeInTheDocument();
  expect(await screen.findByText(measure)).toBeInTheDocument();
  expect(screen.getByText('Gateway description')).toBeInTheDocument();
  expect(screen.queryByText(product.name)).not.toBeInTheDocument();
  expect(screen.queryByText(/disambigua/i)).not.toBeInTheDocument();
  expect(
    screen.getByText(`${(Number(product.base_price) * 100).toFixed(2)} %`),
  ).toBeInTheDocument();
  expect(
    screen.getByText(`$${(Number(product.base_price) * product.quantity).toFixed(2)}`),
  ).toBeInTheDocument();
});

it('shares one bulk lookup across shipment product lists in the same order', async () => {
  const first = buildProductWith('WHATEVER_VALUES');
  const second = buildProductWith('WHATEVER_VALUES');
  const variantProducts = [first, second];
  vi.mocked(fetchQuotePdfVariants).mockClear();
  vi.mocked(fetchQuotePdfVariants).mockResolvedValue({
    [first.variant_id]: {
      description: { en: 'First description' },
      packaging: {},
      stock: {},
      dimensions: { MISURA: 'FIRST' },
    },
    [second.variant_id]: {
      description: { en: 'Second description' },
      packaging: {},
      stock: {},
      dimensions: { MISURA: 'SECOND' },
    },
  });
  renderWithProviders(
    <>
      <OrderProductList products={[first]} variantProducts={variantProducts} />
      <OrderProductList products={[second]} variantProducts={variantProducts} />
    </>,
  );
  expect(await screen.findByText('FIRST')).toBeInTheDocument();
  expect(await screen.findByText('SECOND')).toBeInTheDocument();
  expect(fetchQuotePdfVariants).toHaveBeenCalledExactlyOnceWith(
    variantProducts.map((product) => ({
      sku: product.sku,
      productId: product.product_id,
      variantId: product.variant_id,
    })),
    undefined,
    'en',
  );
});
