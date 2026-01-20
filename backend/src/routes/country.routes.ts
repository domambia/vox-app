import { Router } from 'express';
import countryController from '@/controllers/country.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  listCountriesSchema,
  getCountrySchema,
  updateCountryAllowedSchema,
  bulkUpdateCountriesSchema,
} from '@/validations/country.validation';
import { authenticate, requireVerification } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/countries
 * @desc    List all countries with pagination and filters
 * @access  Public
 */
router.get(
  '/',
  validate(listCountriesSchema),
  countryController.listCountries.bind(countryController)
);

/**
 * @route   GET /api/v1/countries/allowed
 * @desc    Get all allowed countries
 * @access  Public
 */
router.get(
  '/allowed',
  countryController.getAllowedCountries.bind(countryController)
);

/**
 * @route   GET /api/v1/countries/stats
 * @desc    Get country statistics
 * @access  Public
 */
router.get(
  '/stats',
  countryController.getCountryStats.bind(countryController)
);

/**
 * @route   GET /api/v1/countries/:code
 * @desc    Get country by code
 * @access  Public
 */
router.get(
  '/:code',
  validate(getCountrySchema),
  countryController.getCountryByCode.bind(countryController)
);

/**
 * @route   PATCH /api/v1/countries/:code/allowed
 * @desc    Update country allowed status
 * @access  Private (Admin/Moderator - requires verification)
 */
router.patch(
  '/:code/allowed',
  authenticate,
  requireVerification,
  validate(updateCountryAllowedSchema),
  countryController.updateCountryAllowed.bind(countryController)
);

/**
 * @route   PATCH /api/v1/countries/bulk-allowed
 * @desc    Bulk update countries allowed status
 * @access  Private (Admin/Moderator - requires verification)
 */
router.patch(
  '/bulk-allowed',
  authenticate,
  requireVerification,
  validate(bulkUpdateCountriesSchema),
  countryController.bulkUpdateCountriesAllowed.bind(countryController)
);

export default router;

