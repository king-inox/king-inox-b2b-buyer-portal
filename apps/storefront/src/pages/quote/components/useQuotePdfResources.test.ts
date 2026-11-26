import { builder, bulk, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import { getQuotePdfCustomCode, pdfExtraField, quotePdfDelivery } from './quotePdfData';
import { fetchQuotePdfVariants } from './useQuotePdfResources';

const { server } = startMockServer();
const buildStockWith = builder(() => ({
  STOCK: String(faker.number.int({ min: 0, max: 10 })),
  QTA_REFILL: String(faker.number.int({ min: 1, max: 10 })),
  DATA_REFILL: faker.date.future().toISOString().slice(0, 10),
}));
const buildTargetWith = builder(() => ({
  sku: faker.string.alphanumeric(12),
  productId: faker.number.int({ min: 1, max: 10000 }),
  variantId: faker.number.int({ min: 1, max: 10000 }),
}));
const buildFieldWith = builder(() => ({
  fieldName: faker.lorem.word(),
  fieldValue: faker.string.alphanumeric(),
}));

describe('quote PDF resources', () => {
  it('shows ready stock when the entire requested quantity is available', () => {
    const stock = buildStockWith('WHATEVER_VALUES');
    expect(quotePdfDelivery(stock, Number(stock.STOCK))).toBe('ready');
  });

  it('uses the refill date only when stock plus refill covers the request', () => {
    const stock = buildStockWith('WHATEVER_VALUES');
    const total = Number(stock.STOCK) + Number(stock.QTA_REFILL);
    expect(quotePdfDelivery(stock, total)).toBe(stock.DATA_REFILL);
    expect(quotePdfDelivery(stock, total + 1)).toBeUndefined();
  });

  it('does not infer stock or a delivery date from missing or invalid values', () => {
    const stock = buildStockWith({ STOCK: '0', QTA_REFILL: '100', DATA_REFILL: '2026-02-30' });
    expect(quotePdfDelivery(stock, 1)).toBeUndefined();
    expect(quotePdfDelivery({}, 1)).toBeUndefined();
    expect(quotePdfDelivery({ ...stock, STOCK: '', DATA_REFILL: '2026-11-30' }, 1)).toBeUndefined();
  });

  it('shows on request only when both stock and refill quantities are non-positive', () => {
    const stock = buildStockWith({ STOCK: '0', QTA_REFILL: '0' });
    expect(quotePdfDelivery(stock, 1)).toBe('onRequest');
    expect(quotePdfDelivery({ ...stock, STOCK: '-1', QTA_REFILL: '-2' }, 1)).toBe('onRequest');
    expect(quotePdfDelivery({ ...stock, STOCK: '1' }, 2)).toBeUndefined();
    expect(quotePdfDelivery({ ...stock, QTA_REFILL: '1' }, 2)).toBeUndefined();
  });

  it('reads named company and address fields without substituting unrelated fields', () => {
    const code = buildFieldWith({ fieldName: 'CODICE CLIENTE ERP' });
    const field = buildFieldWith('WHATEVER_VALUES');
    expect(pdfExtraField([field, code], 'CODICE CLIENTE ERP')).toBe(code.fieldValue);
    expect(pdfExtraField([field], 'SPEDIZIONE')).toBeUndefined();
  });

  it('parses the theme format with spaces, malformed entries and equals signs in the code', () => {
    const companyId = `00${faker.string.numeric(6)}`;
    const code = `${faker.string.uuid()}=suffix`;
    const value = `invalid | ${companyId}-other=OTHER | ${companyId} =  | ${companyId} = ${code} | ${companyId}=LATER`;
    expect(getQuotePdfCustomCode(value, ` ${companyId} `)).toBe(code);
    expect(getQuotePdfCustomCode(value, undefined)).toBeUndefined();
    expect(getQuotePdfCustomCode(undefined, companyId)).toBeUndefined();
  });
});

const buildHitWith = builder(() => ({
  variantSku: faker.string.alphanumeric(12),
  description: { en: faker.commerce.productName(), it: faker.commerce.productName() },
  size: faker.string.alphanumeric(10),
  weight: faker.number.int({ min: 0, max: 100 }),
  packaging: {
    box: faker.number.int({ min: 1, max: 10 }),
    masterCarton: faker.number.int({ min: 10, max: 100 }),
    pallet: faker.number.int({ min: 100, max: 1000 }),
  },
  availability: { inStock: 0, nextRefillyQuantity: 0, nextRefill: null },
  customs: [] as string[],
}));

afterEach(() => {
  delete document.body.dataset.customerLoggedIn;
});

beforeEach(() => {
  document.body.dataset.customerLoggedIn = 'true';
  server.use(http.get('*/customer/current.jwt', () => HttpResponse.text('test-customer-jwt')));
});

it('fetches all unique SKUs in one authenticated request and maps results by exact SKU', async () => {
  const targets = bulk(buildTargetWith, 'WHATEVER_VALUES').times(37);
  const hits = targets.map(({ sku }) => buildHitWith({ variantSku: sku }));
  let requests = 0;
  server.use(
    http.post('*/api/v1/bigcommerce/search', async ({ request }) => {
      requests += 1;
      expect(request.headers.get('authorization')).toBe('Bearer test-customer-jwt');
      expect(await request.json()).toEqual({
        filter: [`variantSku IN [${targets.map(({ sku }) => JSON.stringify(sku)).join(', ')}]`],
        hitsPerPage: targets.length,
        page: 1,
      });
      return HttpResponse.json({ meiliSearchOutput: { hits: [...hits].reverse() } });
    }),
  );
  const variants = await fetchQuotePdfVariants([...targets, targets[0]]);
  expect(requests).toBe(1);
  expect(Object.keys(variants)).toHaveLength(targets.length);
  targets.forEach(({ variantId }, index) => {
    expect(variants[variantId]).toEqual({
      sku: targets[index].sku,
      description: hits[index].description,
      packaging: {
        SCATOLA: String(hits[index].packaging.box),
        MASTER_CARTON: String(hits[index].packaging.masterCarton),
        PALLET: String(hits[index].packaging.pallet),
      },
      dimensions: { MISURA: hits[index].size, PESO: String(hits[index].weight) },
      stock: { STOCK: '0', QTA_REFILL: '0', DATA_REFILL: '' },
    });
  });
});

it('selects only the current customer code from gateway customs', async () => {
  const target = buildTargetWith('WHATEVER_VALUES');
  const oracleId = faker.string.numeric(6);
  const code = faker.string.alphanumeric();
  const hit = buildHitWith({
    variantSku: target.sku,
    customs: [`other|WRONG`, `${oracleId}|${code}`],
  });
  server.use(
    http.post('*/api/v1/bigcommerce/search', () =>
      HttpResponse.json({
        meiliSearchOutput: { hits: [hit] },
      }),
    ),
  );
  expect((await fetchQuotePdfVariants([target], oracleId))[target.variantId].yourCode).toBe(code);
  expect(
    (await fetchQuotePdfVariants([target], 'different'))[target.variantId].yourCode,
  ).toBeUndefined();
});

it('reports a missing variant instead of using another search result', async () => {
  const target = buildTargetWith('WHATEVER_VALUES');
  server.use(
    http.post('*/api/v1/bigcommerce/search', () =>
      HttpResponse.json({
        meiliSearchOutput: { hits: [buildHitWith('WHATEVER_VALUES')] },
      }),
    ),
  );
  await expect(fetchQuotePdfVariants([target])).rejects.toThrow(`Variant ${target.sku} not found`);
});

it('surfaces gateway errors without falling back to BigCommerce', async () => {
  server.use(
    http.post('*/api/v1/bigcommerce/search', () => new HttpResponse(null, { status: 503 })),
  );
  await expect(fetchQuotePdfVariants([buildTargetWith('WHATEVER_VALUES')])).rejects.toThrow('503');
});

it('does not request variants for an empty detail', async () => {
  expect(await fetchQuotePdfVariants([])).toEqual({});
});

it('rejects a line without a SKU before calling the gateway', async () => {
  await expect(fetchQuotePdfVariants([buildTargetWith({ sku: '' })])).rejects.toThrow('SKU');
});

it('uses the public gateway for a guest quote, as the theme cart does', async () => {
  delete document.body.dataset.customerLoggedIn;
  const target = buildTargetWith({ sku: 'SKU-"quoted"-\\slash' });
  const hit = buildHitWith({ variantSku: target.sku });
  server.use(
    http.get('*/customer/current.jwt', () => {
      throw new Error('Guest must not request JWT');
    }),
    http.post('*/api/v1/bigcommerce/search', async ({ request }) => {
      expect(request.headers.has('authorization')).toBe(false);
      const body = (await request.json()) as { filter: string[] };
      expect(JSON.parse(body.filter[0].slice('variantSku IN '.length))).toEqual([target.sku]);
      return HttpResponse.json({ meiliSearchOutput: { hits: [hit] } });
    }),
  );
  expect((await fetchQuotePdfVariants([target]))[target.variantId].sku).toBe(target.sku);
});

it('rejects incomplete gateway data instead of exporting undefined values', async () => {
  const target = buildTargetWith('WHATEVER_VALUES');
  server.use(
    http.post('*/api/v1/bigcommerce/search', () =>
      HttpResponse.json({
        meiliSearchOutput: { hits: [{ variantSku: target.sku }] },
      }),
    ),
  );
  await expect(fetchQuotePdfVariants([target])).rejects.toThrow('Invalid Search Gateway data');
});

it('requires the gateway description in the requested language without substituting English', async () => {
  const target = buildTargetWith('WHATEVER_VALUES');
  const hit = buildHitWith({ variantSku: target.sku });
  server.use(
    http.post('*/api/v1/bigcommerce/search', () =>
      HttpResponse.json({
        meiliSearchOutput: { hits: [hit] },
      }),
    ),
  );
  const result = await fetchQuotePdfVariants([target], undefined, 'it');
  expect(result[target.variantId].description?.it).toBe(hit.description.it);
  await expect(fetchQuotePdfVariants([target], undefined, 'fr')).rejects.toThrow('description.fr');
});
