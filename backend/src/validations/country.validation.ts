import { z } from 'zod';

// Pagination schema (reusable)
export const paginationSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// List countries schema
export const listCountriesSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    search: z.string().optional(),
    isAllowed: z
      .string()
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        return val === 'true';
      }),
    sortBy: z.enum(['code', 'name', 'created_at']).optional().default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
});

// Get country by code schema
export const getCountrySchema = z.object({
  params: z.object({
    code: z
      .string()
      .length(2, 'Country code must be 2 characters')
      .toUpperCase(),
  }),
});

// Update country allowed status schema
export const updateCountryAllowedSchema = z.object({
  params: z.object({
    code: z
      .string()
      .length(2, 'Country code must be 2 characters')
      .toUpperCase(),
  }),
  body: z.object({
    isAllowed: z.boolean({
      required_error: 'isAllowed is required',
      invalid_type_error: 'isAllowed must be a boolean',
    }),
  }),
});

// Bulk update countries schema
export const bulkUpdateCountriesSchema = z.object({
  body: z.object({
    codes: z
      .array(z.string().length(2, 'Each country code must be 2 characters'))
      .min(1, 'At least one country code is required')
      .max(50, 'Maximum 50 countries can be updated at once'),
    isAllowed: z.boolean({
      required_error: 'isAllowed is required',
      invalid_type_error: 'isAllowed must be a boolean',
    }),
  }),
});

export type ListCountriesInput = z.infer<typeof listCountriesSchema>['query'];
export type GetCountryInput = z.infer<typeof getCountrySchema>['params'];
export type UpdateCountryAllowedInput = z.infer<
  typeof updateCountryAllowedSchema
>;
export type BulkUpdateCountriesInput = z.infer<
  typeof bulkUpdateCountriesSchema
>['body'];

