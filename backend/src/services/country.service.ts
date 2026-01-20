import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';
import { PaginationParams } from '@/types';
import { Prisma } from '@prisma/client';

export interface ListCountriesParams extends PaginationParams {
  search?: string;
  isAllowed?: boolean;
  sortBy?: 'code' | 'name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateCountryAllowedParams {
  code: string;
  isAllowed: boolean;
}

export class CountryService {
  /**
   * List all countries with pagination and filters
   */
  async listCountries(params: ListCountriesParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);
      const { search, isAllowed, sortBy = 'name', sortOrder = 'asc' } = params;

      // Build where clause
      const where: Prisma.CountryWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
        ];
      }

      if (isAllowed !== undefined) {
        where.is_allowed = isAllowed;
      }

      // Build order by
      const orderBy: Prisma.CountryOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // Get total count
      const total = await prisma.country.count({ where });

      // Get countries
      const countries = await prisma.country.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          country_id: true,
          code: true,
          name: true,
          is_allowed: true,
          created_at: true,
          updated_at: true,
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      logger.info('Countries listed', {
        total,
        limit,
        offset,
        returned: countries.length,
      });

      return {
        ...createPaginatedResponse(countries, total, limit, offset),
        pagination: {
          ...pagination,
          ...createPaginatedResponse(countries, total, limit, offset).pagination,
        },
      };
    } catch (error) {
      logger.error('Error listing countries', error);
      throw error;
    }
  }

  /**
   * Get country by code
   */
  async getCountryByCode(code: string) {
    try {
      const country = await prisma.country.findUnique({
        where: { code: code.toUpperCase() },
        select: {
          country_id: true,
          code: true,
          name: true,
          is_allowed: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!country) {
        throw new Error('Country not found');
      }

      return country;
    } catch (error) {
      logger.error('Error getting country', error);
      throw error;
    }
  }

  /**
   * Get all allowed countries
   */
  async getAllowedCountries() {
    try {
      const countries = await prisma.country.findMany({
        where: { is_allowed: true },
        orderBy: { name: 'asc' },
        select: {
          country_id: true,
          code: true,
          name: true,
          is_allowed: true,
        },
      });

      return countries;
    } catch (error) {
      logger.error('Error getting allowed countries', error);
      throw error;
    }
  }

  /**
   * Update country allowed status
   */
  async updateCountryAllowed(params: UpdateCountryAllowedParams) {
    try {
      const { code, isAllowed } = params;

      const country = await prisma.country.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!country) {
        throw new Error('Country not found');
      }

      const updated = await prisma.country.update({
        where: { code: code.toUpperCase() },
        data: { is_allowed: isAllowed },
        select: {
          country_id: true,
          code: true,
          name: true,
          is_allowed: true,
          updated_at: true,
        },
      });

      logger.info('Country allowed status updated', {
        code: updated.code,
        isAllowed: updated.is_allowed,
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Country not found');
        }
      }
      logger.error('Error updating country allowed status', error);
      throw error;
    }
  }

  /**
   * Bulk update countries allowed status
   */
  async bulkUpdateCountriesAllowed(
    codes: string[],
    isAllowed: boolean
  ) {
    try {
      const upperCodes = codes.map((code) => code.toUpperCase());

      const result = await prisma.country.updateMany({
        where: {
          code: { in: upperCodes },
        },
        data: {
          is_allowed: isAllowed,
        },
      });

      logger.info('Bulk updated countries allowed status', {
        count: result.count,
        isAllowed,
      });

      return {
        updated: result.count,
        codes: upperCodes,
        isAllowed,
      };
    } catch (error) {
      logger.error('Error bulk updating countries', error);
      throw error;
    }
  }

  /**
   * Get country statistics
   */
  async getCountryStats() {
    try {
      const [total, allowed, notAllowed] = await Promise.all([
        prisma.country.count(),
        prisma.country.count({ where: { is_allowed: true } }),
        prisma.country.count({ where: { is_allowed: false } }),
      ]);

      return {
        total,
        allowed,
        notAllowed,
      };
    } catch (error) {
      logger.error('Error getting country stats', error);
      throw error;
    }
  }
}

export default new CountryService();

