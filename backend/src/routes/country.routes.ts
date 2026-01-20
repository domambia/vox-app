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
 * @swagger
 * /countries:
 *   get:
 *     summary: List all countries with pagination and filters
 *     description: Get a paginated list of all countries with optional filtering
 *     tags: [Countries]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by country name or code
 *       - in: query
 *         name: is_allowed
 *         schema:
 *           type: boolean
 *         description: Filter by allowed status
 *     responses:
 *       200:
 *         description: Countries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
 * @swagger
 * /countries/allowed:
 *   get:
 *     summary: Get all allowed countries
 *     description: Retrieve a list of countries where registration is allowed
 *     tags: [Countries]
 *     responses:
 *       200:
 *         description: Allowed countries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                             example: "US"
 *                           name:
 *                             type: string
 *                             example: "United States"
 *                           is_allowed:
 *                             type: boolean
 *                             example: true
 */
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
 * @swagger
 * /countries/stats:
 *   get:
 *     summary: Get country statistics
 *     description: Retrieve statistics about countries (total, allowed, etc.)
 *     tags: [Countries]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_countries:
 *                       type: integer
 *                       example: 195
 *                     allowed_countries:
 *                       type: integer
 *                       example: 150
 */
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
 * @swagger
 * /countries/{code}:
 *   get:
 *     summary: Get country by code
 *     description: Retrieve detailed information about a specific country
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Country code (e.g., US, GB, CA)
 *         example: "US"
 *     responses:
 *       200:
 *         description: Country retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Country not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
 * @swagger
 * /countries/{code}/allowed:
 *   patch:
 *     summary: Update country allowed status
 *     description: Update whether a country is allowed for registration (Admin/Moderator only)
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Country code
 *         example: "US"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_allowed
 *             properties:
 *               is_allowed:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Country status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (verification required)
 *       404:
 *         description: Country not found
 */
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
 * @swagger
 * /countries/bulk-allowed:
 *   patch:
 *     summary: Bulk update countries allowed status
 *     description: Update allowed status for multiple countries at once (Admin/Moderator only)
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - country_codes
 *               - is_allowed
 *             properties:
 *               country_codes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["US", "GB", "CA"]
 *               is_allowed:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Countries updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (verification required)
 *       400:
 *         description: Validation error
 */
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

