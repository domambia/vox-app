import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import countryService from '@/services/country.service';
import { AuthRequest } from '@/types';

export class CountryController {
  /**
   * List all countries with pagination and filters
   * GET /countries
   */
  async listCountries(req: Request, res: Response): Promise<void> {
    try {
      const params = {
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        search: req.query.search as string | undefined,
        isAllowed:
          req.query.isAllowed !== undefined
            ? req.query.isAllowed === 'true'
            : undefined,
        sortBy: (req.query.sortBy as 'code' | 'name' | 'created_at') || 'name',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };

      const result = await countryService.listCountries(params);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'LIST_COUNTRIES_ERROR', error.message || 'Failed to list countries', 400);
    }
  }

  /**
   * Get country by code
   * GET /countries/:code
   */
  async getCountryByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const country = await countryService.getCountryByCode(code);
      sendSuccess(res, country);
    } catch (error: any) {
      if (error.message === 'Country not found') {
        sendError(res, 'COUNTRY_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'GET_COUNTRY_ERROR', error.message || 'Failed to get country', 400);
    }
  }

  /**
   * Get all allowed countries
   * GET /countries/allowed
   */
  async getAllowedCountries(_req: Request, res: Response): Promise<void> {
    try {
      const countries = await countryService.getAllowedCountries();
      sendSuccess(res, { countries });
    } catch (error: any) {
      sendError(
        res,
        'GET_ALLOWED_COUNTRIES_ERROR',
        error.message || 'Failed to get allowed countries',
        400
      );
    }
  }

  /**
   * Update country allowed status
   * PATCH /countries/:code/allowed
   */
  async updateCountryAllowed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { isAllowed } = req.body;

      const country = await countryService.updateCountryAllowed({
        code,
        isAllowed,
      });
      sendSuccess(res, country);
    } catch (error: any) {
      if (error.message === 'Country not found') {
        sendError(res, 'COUNTRY_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(
        res,
        'UPDATE_COUNTRY_ERROR',
        error.message || 'Failed to update country',
        400
      );
    }
  }

  /**
   * Bulk update countries allowed status
   * PATCH /countries/bulk-allowed
   */
  async bulkUpdateCountriesAllowed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { codes, isAllowed } = req.body;

      const result = await countryService.bulkUpdateCountriesAllowed(codes, isAllowed);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(
        res,
        'BULK_UPDATE_COUNTRIES_ERROR',
        error.message || 'Failed to bulk update countries',
        400
      );
    }
  }

  /**
   * Get country statistics
   * GET /countries/stats
   */
  async getCountryStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await countryService.getCountryStats();
      sendSuccess(res, stats);
    } catch (error: any) {
      sendError(
        res,
        'GET_COUNTRY_STATS_ERROR',
        error.message || 'Failed to get country statistics',
        400
      );
    }
  }
}

export default new CountryController();

