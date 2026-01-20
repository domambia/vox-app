import { Router } from 'express';
import discoveryController from '@/controllers/discovery.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  discoverProfilesSchema,
  getMatchesSchema,
  getLikesSchema,
} from '@/validations/discovery.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/profiles/discover
 * @desc    Discover profile suggestions
 * @access  Private (Authenticated)
 */
router.get(
  '/discover',
  authenticate,
  validate(discoverProfilesSchema),
  discoveryController.discoverProfiles.bind(discoveryController)
);

/**
 * @route   GET /api/v1/profiles/matches
 * @desc    Get all matches
 * @access  Private (Authenticated)
 */
router.get(
  '/matches',
  authenticate,
  validate(getMatchesSchema),
  discoveryController.getMatches.bind(discoveryController)
);

/**
 * @route   GET /api/v1/profiles/likes
 * @desc    Get likes (given or received)
 * @access  Private (Authenticated)
 */
router.get(
  '/likes',
  authenticate,
  validate(getLikesSchema),
  discoveryController.getLikes.bind(discoveryController)
);

export default router;

