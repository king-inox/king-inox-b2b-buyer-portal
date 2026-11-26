import { useQuery } from '@tanstack/react-query';

import { storefrontGQLRequest } from '@/shared/service/bc/graphql/client';
import { searchVariantsBySku } from '@/shared/service/kingInox/searchVariants';
import B3Request from '@/shared/service/request/b3Fetch';

import { type PdfExtraField, type PdfVariantData } from './quotePdfData';

interface VariantTarget {
  sku: string;
  productId?: number | string;
  variantId?: number | string;
}

interface MetafieldConnection {
  edges?: Array<{ node: { key: string; value: string } }>;
}

export interface PdfAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  zipCode?: string;
  countryCode?: string;
  country?: string;
  id: number | string;
  extraFields?: PdfExtraField[];
}

interface ResourceOptions {
  items: VariantTarget[];
  companyId?: number | string;
  userId?: number;
  customerId?: number;
  masquerading?: boolean;
  companyFields?: PdfExtraField[];
}

const metafieldValues = (connection?: MetafieldConnection) =>
  Object.fromEntries((connection?.edges || []).map(({ node }) => [node.key, node.value]));

export async function fetchQuotePdfVariants(
  items: VariantTarget[],
  customerOracleId?: string,
): Promise<Record<number, PdfVariantData>> {
  const hits = await searchVariantsBySku(items.map(({ sku }) => sku));
  return Object.fromEntries(
    items.map(({ variantId, sku }) => {
      if (!Number.isInteger(Number(variantId)) || Number(variantId) <= 0) {
        throw new Error(`Invalid variant ID for SKU ${sku}.`);
      }
      const hit = hits.get(sku.trim())!;
      return [
        Number(variantId),
        {
          sku: hit.variantSku,
          packaging: {
            SCATOLA: String(hit.packaging.box),
            MASTER_CARTON: String(hit.packaging.masterCarton),
            PALLET: String(hit.packaging.pallet),
          },
          dimensions: { MISURA: hit.size, PESO: String(hit.weight) },
          stock: {
            STOCK: String(hit.availability.inStock),
            QTA_REFILL: String(hit.availability.nextRefillyQuantity),
            DATA_REFILL: hit.availability.nextRefill === null ? '' : hit.availability.nextRefill,
          },
          ...(customerOracleId
            ? {
                yourCode: hit.customs
                  ?.find((entry) => entry.slice(0, entry.indexOf('|')) === customerOracleId)
                  ?.slice(customerOracleId.length + 1),
              }
            : {}),
        },
      ];
    }),
  );
}

async function fetchPdfVariantsForCustomer(items: VariantTarget[]) {
  if (!items.length) return {};
  const response = await storefrontGQLRequest<{
    data?: {
      customer?: { entityId: number; customerOracleMetafields?: MetafieldConnection } | null;
    };
    errors?: Array<{ message: string }>;
  }>({
    query: `query GetQuotePdfCustomerOracle {
    customer {
      entityId
      customerOracleMetafields: metafields(namespace: "oracle", keys: ["CUSTOMER_ID"], first: 1) {
        edges { node { key value } }
      }
    }
  }`,
  });
  if (response.errors?.length) throw new Error(response.errors[0].message);
  const oracleId = metafieldValues(
    response.data?.customer?.customerOracleMetafields,
  ).CUSTOMER_ID?.trim();
  return fetchQuotePdfVariants(items, oracleId);
}

async function fetchPdfAddresses(companyId: number, offset = 0): Promise<PdfAddress[]> {
  const response = await B3Request.graphqlB2B<{
    addresses: { edges: Array<{ node: PdfAddress }>; pageInfo: { hasNextPage: boolean } };
  }>({
    query: `query GetQuotePdfAddresses {
      addresses(companyId: ${companyId}, first: 50, offset: ${offset}) {
        edges { node { id addressLine1 addressLine2 city zipCode countryCode country extraFields { fieldName fieldValue } } }
        pageInfo { hasNextPage }
      }
    }`,
  });
  const addresses = (response.addresses?.edges || []).map(({ node }) => node);
  if (addresses.length && response.addresses?.pageInfo?.hasNextPage) {
    return addresses.concat(await fetchPdfAddresses(companyId, offset + addresses.length));
  }
  return addresses;
}

async function fetchPdfCompanyFields(
  options: ResourceOptions,
): Promise<PdfExtraField[] | undefined> {
  if (options.companyFields) return options.companyFields;
  let selection: string | undefined;
  if (options.masquerading && options.customerId)
    selection = `superAdminMasquerading(customerId: ${Number(options.customerId)})`;
  else if (options.userId) selection = `userCompany(userId: ${Number(options.userId)})`;
  if (!selection) return undefined;
  const response = await B3Request.graphqlB2B<{
    pdfCompany?: { id: string; extraFields?: PdfExtraField[] };
  }>({
    query: `query GetQuotePdfCompany { pdfCompany: ${selection} { id extraFields { fieldName fieldValue } } }`,
  });
  // Never use a different company's ERP code (e.g. when viewing a subsidiary).
  return Number(response.pdfCompany?.id) === Number(options.companyId)
    ? response.pdfCompany?.extraFields
    : undefined;
}

async function fetchCommercialData(options: ResourceOptions) {
  const companyId = Number(options.companyId);
  if (!Number.isInteger(companyId) || companyId <= 0)
    return { addresses: [] as PdfAddress[], companyFields: options.companyFields };
  const [addresses, companyFields] = await Promise.all([
    fetchPdfAddresses(companyId),
    fetchPdfCompanyFields(options),
  ]);
  return { addresses, companyFields };
}

export function useQuotePdfResources(options: ResourceOptions) {
  const query = useQuery({
    queryKey: ['quote-pdf-resources', options],
    queryFn: async () => {
      const [variants, commercial] = await Promise.all([
        fetchPdfVariantsForCustomer(options.items),
        fetchCommercialData(options),
      ]);
      return { variants, ...commercial };
    },
    enabled: false,
    retry: false,
  });
  return async () => {
    const { data } = await query.refetch({ throwOnError: true });
    if (!data) throw new Error('Quote PDF resources unavailable');
    return data;
  };
}
