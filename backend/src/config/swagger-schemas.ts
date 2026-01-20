/**
 * Common Swagger schemas for VOX API
 * These can be referenced in route documentation using $ref
 */

export const swaggerSchemas = {
  /**
   * @swagger
   * components:
   *   schemas:
   *     User:
   *       type: object
   *       properties:
   *         user_id:
   *           type: string
   *           format: uuid
   *           example: "123e4567-e89b-12d3-a456-426614174000"
   *         email:
   *           type: string
   *           format: email
   *           example: "user@example.com"
   *         phone_number:
   *           type: string
   *           example: "+1234567890"
   *         is_active:
   *           type: boolean
   *           example: true
   *         verified:
   *           type: boolean
   *           example: false
   *         created_at:
   *           type: string
   *           format: date-time
   *         updated_at:
   *           type: string
   *           format: date-time
   *
   *     Profile:
   *       type: object
   *       properties:
   *         profile_id:
   *           type: string
   *           format: uuid
   *         user_id:
   *           type: string
   *           format: uuid
   *         first_name:
   *           type: string
   *           example: "John"
   *         last_name:
   *           type: string
   *           example: "Doe"
   *         date_of_birth:
   *           type: string
   *           format: date
   *         gender:
   *           type: string
   *           enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
   *         bio:
   *           type: string
   *         interests:
   *           type: array
   *           items:
   *             type: string
   *         location:
   *           type: object
   *           properties:
   *             city:
   *               type: string
   *             country:
   *               type: string
   *             latitude:
   *               type: number
   *             longitude:
   *               type: number
   *
   *     AuthTokens:
   *       type: object
   *       properties:
   *         accessToken:
   *           type: string
   *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *         refreshToken:
   *           type: string
   *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *         expiresIn:
   *           type: string
   *           example: "1h"
   *
   *     RegisterRequest:
   *       type: object
   *       required:
   *         - email
   *         - password
   *         - phone_number
   *         - country_code
   *       properties:
   *         email:
   *           type: string
   *           format: email
   *           example: "user@example.com"
   *         password:
   *           type: string
   *           format: password
   *           minLength: 8
   *           example: "SecurePass123!"
   *         phone_number:
   *           type: string
   *           example: "+1234567890"
   *         country_code:
   *           type: string
   *           example: "US"
   *
   *     LoginRequest:
   *       type: object
   *       required:
   *         - email
   *         - password
   *       properties:
   *         email:
   *           type: string
   *           format: email
   *           example: "user@example.com"
   *         password:
   *           type: string
   *           format: password
   *           example: "SecurePass123!"
   */
};

