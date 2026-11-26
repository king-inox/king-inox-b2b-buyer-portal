import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';

import { getCurrentApiClientId, getCurrentApiDomain } from './apiDomain';

export interface SearchVariant {
  variantSku: string;
  size: string;
  weight: number;
  packaging: { box: number; masterCarton: number; pallet: number };
  availability: { inStock: number; nextRefill: string | null; nextRefillyQuantity: number };
  customs?: string[];
}

export async function searchVariantsBySku(skus: string[]): Promise<Map<string, SearchVariant>> {
  if (skus.some((sku) => typeof sku !== 'string' || !sku.trim())) {
    throw new Error('A variant SKU is required for every detail item.');
  }
  const uniqueSkus = [...new Set(skus.map((sku) => sku.trim()))];
  if (!uniqueSkus.length) return new Map();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (document.body.dataset.customerLoggedIn === 'true') {
    const token = (await getCurrentCustomerJWT(getCurrentApiClientId()))?.trim();
    if (!token) throw new Error('A current customer JWT could not be obtained.');
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${getCurrentApiDomain()}/api/v1/bigcommerce/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: [`variantSku IN [${uniqueSkus.map((sku) => JSON.stringify(sku)).join(', ')}]`],
      hitsPerPage: uniqueSkus.length,
      page: 1,
    }),
  });
  if (!response.ok) throw new Error(`Search Gateway request failed (${response.status}).`);
  const payload: { meiliSearchOutput: { hits: SearchVariant[] } } = await response.json();
  if (!Array.isArray(payload.meiliSearchOutput?.hits)) {
    throw new Error('Search Gateway returned an invalid variant response.');
  }
  payload.meiliSearchOutput.hits.forEach((hit) => {
    const values = [
      hit.weight,
      hit.packaging?.box,
      hit.packaging?.masterCarton,
      hit.packaging?.pallet,
      hit.availability?.inStock,
      hit.availability?.nextRefillyQuantity,
    ];
    if (
      typeof hit.variantSku !== 'string' ||
      typeof hit.size !== 'string' ||
      values.some((value) => typeof value !== 'number' || !Number.isFinite(value)) ||
      !(hit.availability.nextRefill === null || typeof hit.availability.nextRefill === 'string')
    ) {
      throw new Error(`Invalid Search Gateway data for variant ${hit.variantSku}.`);
    }
  });
  const variants = new Map(payload.meiliSearchOutput.hits.map((hit) => [hit.variantSku, hit]));
  uniqueSkus.forEach((sku) => {
    if (!variants.has(sku)) throw new Error(`Variant ${sku} not found in Search Gateway.`);
  });
  return variants;
}
