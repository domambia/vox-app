import { PaginatedResponse } from '@/types';

/**
 * Default pagination values
 */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_OFFSET = 0;

/**
 * Normalize pagination parameters
 */
export function normalizePagination(
  limit?: number,
  offset?: number
): { limit: number; offset: number } {
  const normalizedLimit = Math.min(
    Math.max(1, limit || DEFAULT_PAGE_LIMIT),
    MAX_PAGE_LIMIT
  );
  const normalizedOffset = Math.max(0, offset || DEFAULT_PAGE_OFFSET);

  return {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  const hasMore = offset + items.length < total;

  return {
    items,
    pagination: {
      limit,
      offset,
      total,
      hasMore,
    },
  };
}

/**
 * Extract pagination from query parameters
 */
export function extractPaginationFromQuery(
  query: any
): { limit: number; offset: number } {
  const limit = query.limit ? parseInt(query.limit as string, 10) : undefined;
  const offset = query.offset ? parseInt(query.offset as string, 10) : undefined;

  return normalizePagination(limit, offset);
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Get pagination metadata
 */
export function getPaginationMetadata(
  total: number,
  limit: number,
  offset: number
) {
  const totalPages = calculateTotalPages(total, limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const hasMore = offset + limit < total;
  const hasPrevious = offset > 0;

  return {
    total,
    limit,
    offset,
    totalPages,
    currentPage,
    hasMore,
    hasPrevious,
  };
}

