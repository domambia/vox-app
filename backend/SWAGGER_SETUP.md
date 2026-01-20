# Swagger UI Documentation Setup

## Overview

The VOX Backend API now includes comprehensive Swagger/OpenAPI documentation accessible via Swagger UI.

## Accessing Swagger UI

Once the server is running, access the documentation at:

- **Swagger UI**: `http://localhost:3000/api-docs`
- **Swagger JSON**: `http://localhost:3000/api-docs/json`

## Features

- ✅ Interactive API documentation
- ✅ Try-it-out functionality
- ✅ Authentication support (Bearer JWT tokens)
- ✅ Request/response examples
- ✅ Schema definitions
- ✅ Error response documentation

## Authentication in Swagger UI

To test authenticated endpoints:

1. **Get an access token:**
   - Use the `/auth/login` endpoint
   - Copy the `accessToken` from the response

2. **Authorize in Swagger UI:**
   - Click the "Authorize" button (🔒) at the top
   - Enter: `Bearer <your-access-token>`
   - Click "Authorize"
   - Click "Close"

3. **Test protected endpoints:**
   - All protected endpoints will now include the token automatically

## Adding Documentation to Routes

### Basic Example

```typescript
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
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
 */
router.get('/health', controller.health);
```

### With Authentication

```typescript
/**
 * @swagger
 * /profile/me:
 *   get:
 *     summary: Get current user's profile
 *     description: Retrieve the authenticated user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, controller.getMyProfile);
```

### With Request Body

```typescript
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered
 */
router.post('/register', validate(schema), controller.register);
```

### Using Schema References

```typescript
/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
```

## Available Schemas

The following schemas are pre-defined and can be referenced:

- `Error` - Standard error response
- `Success` - Standard success response
- `Pagination` - Pagination metadata
- `User` - User object
- `AuthTokens` - Authentication tokens

## Tags

Routes are organized by tags:

- Health
- Authentication
- Profile
- Discovery
- KYC
- Groups
- Events
- Messaging
- Voice Calls
- Admin
- Countries
- Files

## Development

### Adding Documentation to New Routes

1. Add Swagger annotations above the route handler
2. Use appropriate tags
3. Document request/response schemas
4. Include authentication requirements
5. Add examples where helpful

### Testing Documentation

1. Start the server: `npm run dev`
2. Open: `http://localhost:3000/api-docs`
3. Verify all endpoints are documented
4. Test the "Try it out" functionality

## Production Considerations

- Swagger UI is enabled by default
- Consider disabling in production or restricting access
- Use environment variables to control visibility

## Customization

Swagger configuration is in `src/config/swagger.ts`:

- API info (title, version, description)
- Server URLs
- Security schemes
- Common schemas
- Tags

## Next Steps

- [ ] Add documentation to all remaining routes
- [ ] Add more detailed examples
- [ ] Add request/response examples
- [ ] Document WebSocket events
- [ ] Add API versioning documentation

