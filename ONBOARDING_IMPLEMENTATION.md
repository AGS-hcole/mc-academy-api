# First-Login Onboarding Endpoints - Implementation Guide

## Overview

This document describes the implementation of backend endpoints for the first-login onboarding flow in the MyCenter Academy API. The implementation follows NestJS 10+ best practices with Prisma 5+ and PostgreSQL.

## Architecture

### Technology Stack
- **Framework**: NestJS 10+
- **ORM**: Prisma 5+
- **Database**: PostgreSQL
- **Validation**: class-validator, class-transformer
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **File Upload**: Multer

### Module Structure

```
src/
├── auth/
│   ├── auth.controller.ts       # Added GET /auth/me endpoint
│   └── auth.service.ts           # Added getMe() method
├── users/
│   ├── dto/
│   │   ├── update-me.dto.ts      # Profile update DTO
│   │   └── update-consents.dto.ts # Consents update DTO
│   ├── upload/
│   │   └── image-upload.pipe.ts  # Image validation pipe
│   ├── users.controller.ts       # Users endpoints
│   ├── users.service.ts          # Users business logic
│   └── users.module.ts           # Users module
├── metadata/
│   ├── metadata.controller.ts    # Metadata endpoints
│   └── metadata.module.ts        # Metadata module
└── common/
    ├── validators/
    │   └── is-past-date.validator.ts # Custom date validator
    └── filters/
        └── prisma-exception.filter.ts # Prisma error handler
```

## Endpoints

### 1. GET /api/auth/me

**Purpose**: Retrieve current authenticated user with onboarding status

**Authentication**: Required (JWT Bearer token)

**Response**:
```typescript
{
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    firstname: string;
    lastname: string;
    phone?: string | null;
    birthDate?: string | null;
    fftLicenseNumber?: string | null;
    formula?: 'MORNING' | 'AFTERNOON' | 'FULL' | null;
    notifyEmail: boolean;
    notifySMS: boolean;
    notifyWhatsApp: boolean;
    privacyConsentAt?: string | null;
    photoConsentAt?: string | null;
    marketingConsentAt?: string | null;
    createdAt: string;
    updatedAt?: string | null;
  };
  mustOnboard: boolean;
}
```

**mustOnboard Logic**:
Returns `true` if ANY of the following conditions are met:
- `privacyConsentAt` is `null`
- `firstname` is blank/empty
- `lastname` is blank/empty
- `formula` is `null`

**Swagger Tags**: Auth

---

### 2. PUT /api/users/me

**Purpose**: Update current user's profile

**Authentication**: Required (JWT Bearer token)

**Request Body** (all fields optional):
```typescript
{
  firstname?: string;        // 2-100 chars
  lastname?: string;         // 2-100 chars
  phone?: string;            // Format: /^\+?[0-9\s\.\-]{7,15}$/
  birthDate?: string;        // ISO date, must be in past and >= 1900-01-01
  fftLicenseNumber?: string; // 3-64 chars, unique
  formula?: 'MORNING' | 'AFTERNOON' | 'FULL';
  notifyEmail?: boolean;
  notifySMS?: boolean;
  notifyWhatsApp?: boolean;
}
```

**Response**: Updated user object (same as /auth/me.user)

**Error Handling**:
- `409 Conflict`: FFT license number already exists
  ```json
  {
    "error": "Conflict",
    "code": "FFT_LICENSE_TAKEN",
    "field": "fftLicenseNumber"
  }
  ```
- `400 Bad Request`: Validation errors

**Swagger Tags**: Users

---

### 3. PUT /api/users/me/consents

**Purpose**: Update user consent preferences

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```typescript
{
  privacyConsent: boolean;    // Required
  photoConsent?: boolean;     // Optional
  marketingConsent?: boolean; // Optional
}
```

**Behavior**:
- `privacyConsent = true` → Sets `privacyConsentAt` to current timestamp
- `photoConsent = true` → Sets `photoConsentAt` to current timestamp
- `photoConsent = false` → Sets `photoConsentAt` to `null`
- `marketingConsent = true` → Sets `marketingConsentAt` to current timestamp
- `marketingConsent = false` → Sets `marketingConsentAt` to `null`

**Response**:
```json
{
  "ok": true
}
```

**Swagger Tags**: Users

---

### 4. POST /api/users/me/avatar

**Purpose**: Upload user avatar image

**Authentication**: Required (JWT Bearer token)

**Content-Type**: `multipart/form-data`

**Request Body**:
- Field name: `file`
- Max size: 2 MB
- Allowed types: `image/png`, `image/jpeg`, `image/jpg`

**Storage**: 
- Image bytes stored in `user.avatarData` (Bytes field)
- MIME type stored in `user.avatarMime` (String field)

**Response**:
```json
{
  "ok": true
}
```

**Error Handling**:
- `400 Bad Request`: Invalid file type or size exceeds limit
  ```json
  {
    "error": "Bad Request",
    "code": "INVALID_IMAGE" | "IMAGE_TOO_LARGE"
  }
  ```

**Swagger Tags**: Users

---

### 5. POST /api/users/me/background

**Purpose**: Upload user background image

**Authentication**: Required (JWT Bearer token)

**Content-Type**: `multipart/form-data`

**Request Body**:
- Field name: `file`
- Max size: 4 MB
- Allowed types: `image/png`, `image/jpeg`, `image/jpg`

**Storage**: 
- Image bytes stored in `user.backgroundData` (Bytes field)
- MIME type stored in `user.backgroundMime` (String field)

**Response**:
```json
{
  "ok": true
}
```

**Error Handling**: Same as avatar endpoint

**Swagger Tags**: Users

---

### 6. GET /api/users/me/avatar

**Purpose**: Retrieve user avatar image

**Authentication**: Required (JWT Bearer token)

**Response**:
- Content-Type: Image MIME type (e.g., `image/png`)
- Cache-Control: `private, max-age=0`
- Body: Binary image data

**Error Handling**:
- `404 Not Found`: No avatar uploaded

**Swagger Tags**: Users

---

### 7. GET /api/users/me/background

**Purpose**: Retrieve user background image

**Authentication**: Required (JWT Bearer token)

**Response**: Same as avatar endpoint

**Error Handling**:
- `404 Not Found`: No background uploaded

**Swagger Tags**: Users

---

### 8. GET /api/metadata/formulas

**Purpose**: Get list of available formula types

**Authentication**: Required (JWT Bearer token)

**Response**:
```json
{
  "items": ["MORNING", "AFTERNOON", "FULL"]
}
```

**Note**: Values are dynamically sourced from Prisma `FormulaType` enum to prevent drift

**Swagger Tags**: Metadata

---

## Data Models

### User Model (Relevant Fields)

```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  role               Role      @default(user)
  firstname          String
  lastname           String
  phone              String?
  birthDate          DateTime?
  fftLicenseNumber   String?   @unique
  formula            FormulaType?
  
  // Consents
  privacyConsentAt   DateTime?
  photoConsentAt     DateTime?
  marketingConsentAt DateTime?
  
  // Images
  avatarData         Bytes?
  avatarMime         String?
  backgroundData     Bytes?
  backgroundMime     String?
  
  // Notifications
  notifyEmail        Boolean   @default(true)
  notifySMS          Boolean   @default(false)
  notifyWhatsApp     Boolean   @default(false)
  
  createdAt          DateTime  @default(now())
  updatedAt          DateTime? @updatedAt
}
```

## Validation

### Custom Validators

#### IsPastDateConstraint
- Validates that a date is in the past
- Validates that a date is after 1900-01-01
- Allows optional fields (returns true if value is undefined/null)

### DTO Validation

All DTOs use class-validator decorators:
- `@IsString()`, `@IsBoolean()`, `@IsEnum()`
- `@Length()` for string length constraints
- `@Matches()` for regex validation (e.g., phone numbers)
- `@IsISO8601()` for date validation
- `@IsOptional()` for optional fields

Global ValidationPipe configuration:
```typescript
new ValidationPipe({
  whitelist: true,           // Strip non-whitelisted properties
  forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
  transform: true,            // Auto-transform payloads to DTO instances
})
```

## Error Handling

### PrismaExceptionFilter

Global exception filter for Prisma errors:

**P2002 (Unique Constraint Violation)**:
- Special handling for `fftLicenseNumber` field
- Returns 409 Conflict with custom error code

**P2025 (Record Not Found)**:
- Returns 404 Not Found

**Other Errors**:
- Returns 500 Internal Server Error with safe message

### File Upload Errors

Custom `ImageUploadPipe` validates:
- File presence
- MIME type
- File size

Returns structured error responses with error codes.

## Security

### Authentication
- All endpoints require JWT authentication via `AuthGuard`
- Token extracted from Authorization header: `Bearer <token>`
- Guard validates token and attaches user to request

### File Upload Security
- Strict MIME type validation
- File size limits enforced
- Files stored in database (not filesystem) for easier access control
- No execution of uploaded files (stored as bytes)

### Input Validation
- All user input validated with class-validator
- Whitelist mode prevents injection of unexpected fields
- Regex validation for phone numbers
- Date constraints prevent invalid dates

### Data Privacy
- Image bytes NOT returned in user profile endpoints (avoid payload bloat)
- Separate endpoints for image retrieval
- Cache-Control headers prevent caching of sensitive data

## Testing

### E2E Tests

Located in: `test/onboarding.e2e-spec.ts`

**Test Coverage**:
1. GET /auth/me
   - Returns user with mustOnboard=true when incomplete
   - Returns 401 without authentication

2. PUT /users/me
   - Updates profile successfully
   - Returns 409 for duplicate FFT license
   - Validates phone number format
   - Validates birthDate is in past

3. PUT /users/me/consents
   - Updates consents successfully
   - Requires privacyConsent field

4. POST /users/me/avatar
   - Uploads avatar successfully
   - Rejects invalid file types

5. POST /users/me/background
   - Uploads background successfully

6. GET /users/me/avatar
   - Retrieves avatar after upload

7. GET /metadata/formulas
   - Returns formula enum values
   - Requires authentication

8. Complete onboarding flow
   - Verifies mustOnboard=false after completing all steps

### Running Tests

```bash
# E2E tests
npm run test:e2e

# Unit tests
npm run test

# Test coverage
npm run test:cov
```

## Swagger Documentation

All endpoints are documented with Swagger/OpenAPI:

**Access**: `/swagger` (when ENABLE_SWAGGER=true)

**Features**:
- API tags for organization (Auth, Users, Metadata)
- Bearer token authentication (@ApiBearerAuth)
- Request/response schemas
- File upload documentation with binary format
- Error response examples

## Database Migrations

No schema changes required - all fields already exist in the Prisma schema.

If modifications are needed:
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy
```

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_EXP`: Access token expiration (e.g., "1h")
- `JWT_REFRESH_EXP`: Refresh token expiration (e.g., "7d")

## Usage Example

### Complete Onboarding Flow

```typescript
// 1. Sign in and get token
const { accessToken } = await POST('/api/auth/sign-in', {
  email: 'user@example.com',
  password: 'password'
});

// 2. Check onboarding status
const { user, mustOnboard } = await GET('/api/auth/me', {
  headers: { Authorization: `Bearer ${accessToken}` }
});

if (mustOnboard) {
  // 3. Get available formulas
  const { items } = await GET('/api/metadata/formulas', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  // 4. Update profile
  await PUT('/api/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      firstname: 'Hubert',
      lastname: 'Cole',
      phone: '+33611223344',
      birthDate: '1991-05-20',
      formula: 'FULL',
      fftLicenseNumber: 'FFT-123456'
    }
  });

  // 5. Accept consents
  await PUT('/api/users/me/consents', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      privacyConsent: true,
      photoConsent: true,
      marketingConsent: false
    }
  });

  // 6. Upload avatar (optional)
  const formData = new FormData();
  formData.append('file', avatarFile);
  await POST('/api/users/me/avatar', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData
  });

  // 7. Verify onboarding complete
  const { mustOnboard: stillOnboarding } = await GET('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  // stillOnboarding should be false
}
```

## Future Enhancements

### Potential Improvements
1. **Image Processing**
   - Server-side image downscaling/cropping
   - EXIF stripping for privacy
   - Dimension limits (e.g., max 1024px)
   - Format conversion to WebP for smaller sizes

2. **Audit Logging**
   - Track consent changes with timestamps
   - Log profile updates for compliance

3. **Rate Limiting**
   - Prevent abuse of upload endpoints
   - Throttle API calls per user

4. **Caching**
   - Cache user profile data with Redis
   - Invalidate on updates

5. **Batch Operations**
   - Update multiple fields atomically
   - Rollback on partial failures

6. **Webhooks**
   - Notify external systems on onboarding completion
   - Integration with CRM/marketing tools

## Troubleshooting

### Common Issues

**Issue**: 401 Unauthorized on all endpoints
- **Solution**: Verify JWT token is valid and not expired
- Check Authorization header format: `Bearer <token>`

**Issue**: 409 Conflict on FFT license update
- **Solution**: FFT license number must be unique across all users
- Check if another user already has this license number

**Issue**: 400 Bad Request on file upload
- **Solution**: Verify file type is PNG or JPEG
- Check file size is within limits (2MB for avatar, 4MB for background)

**Issue**: 404 Not Found when retrieving avatar/background
- **Solution**: Upload must be completed before retrieval
- Check that upload endpoint returned success

**Issue**: mustOnboard still true after updates
- **Solution**: Ensure ALL required fields are set:
  - privacyConsentAt must be set (via consents endpoint)
  - firstname and lastname must be non-empty
  - formula must be set to MORNING, AFTERNOON, or FULL

## Support

For issues or questions:
- Check Swagger documentation at `/swagger`
- Review E2E tests for usage examples
- Check application logs for detailed error messages
- Verify database state with Prisma Studio: `npx prisma studio`
