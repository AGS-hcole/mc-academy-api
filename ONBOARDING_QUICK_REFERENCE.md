# Onboarding Endpoints - Quick Reference

## Base URL
All endpoints are prefixed with `/api`

## Authentication
All endpoints require JWT Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints Summary

| Method | Endpoint | Purpose | Required Auth |
|--------|----------|---------|---------------|
| GET | /api/auth/me | Get user with onboarding status | ✅ |
| PUT | /api/users/me | Update user profile | ✅ |
| PUT | /api/users/me/consents | Update consents | ✅ |
| POST | /api/users/me/avatar | Upload avatar (2MB max) | ✅ |
| POST | /api/users/me/background | Upload background (4MB max) | ✅ |
| GET | /api/users/me/avatar | Get avatar image | ✅ |
| GET | /api/users/me/background | Get background image | ✅ |
| GET | /api/metadata/formulas | Get formula options | ✅ |

## Onboarding Requirements

`mustOnboard` is `true` when ANY of these are missing:
- ✅ Privacy consent accepted (`privacyConsentAt`)
- ✅ First name set (`firstname`)
- ✅ Last name set (`lastname`)

**Note**: Formula is managed by administrators and not required for user onboarding.

## Request/Response Examples

### 1. Check Onboarding Status
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "formula": "FULL",
    "privacyConsentAt": "2025-10-13T10:00:00.000Z",
    ...
  },
  "mustOnboard": false
}
```

### 2. Update Profile
```bash
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstname": "Hubert",
  "lastname": "Cole",
  "phone": "+33611223344",
  "birthDate": "1991-05-20",
  "fftLicenseNumber": "FFT-123456"
}
```

**Note**: The `formula` field cannot be updated by users - it is managed by administrators.

### 3. Update Consents
```bash
PUT /api/users/me/consents
Authorization: Bearer <token>
Content-Type: application/json

{
  "privacyConsent": true,
  "photoConsent": true,
  "marketingConsent": false
}
```

Response:
```json
{
  "ok": true
}
```

### 4. Upload Avatar
```bash
POST /api/users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image.png>
```

### 5. Get Formula Options
```bash
GET /api/metadata/formulas
Authorization: Bearer <token>
```

Response:
```json
{
  "items": ["MORNING", "AFTERNOON", "FULL"]
}
```

**Note**: This endpoint is primarily for admin use. Users cannot set their formula through the onboarding process.

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| FFT_LICENSE_TAKEN | 409 | FFT license number already in use |
| INVALID_IMAGE | 400 | Invalid image file type |
| IMAGE_TOO_LARGE | 400 | File exceeds size limit |

## Field Validation

### UpdateMeDto
- `firstname`: 2-100 characters
- `lastname`: 2-100 characters
- `phone`: Pattern `/^\+?[0-9\s\.\-]{7,15}$/`
- `birthDate`: ISO date, past date, >= 1900-01-01
- `fftLicenseNumber`: 3-64 characters, unique
- `notifyEmail`, `notifySMS`, `notifyWhatsApp`: boolean

**Note**: `formula` field is not editable by users - managed by administrators only.

### UpdateConsentsDto
- `privacyConsent`: boolean (required)
- `photoConsent`: boolean (optional)
- `marketingConsent`: boolean (optional)

### Image Upload
- **Avatar**: Max 2MB, PNG/JPEG only
- **Background**: Max 4MB, PNG/JPEG only

## Typical Onboarding Flow

1. **Check Status**: `GET /api/auth/me`
2. **Update Profile**: `PUT /api/users/me`
3. **Accept Consents**: `PUT /api/users/me/consents`
4. **Upload Avatar** (optional): `POST /api/users/me/avatar`
5. **Verify Complete**: `GET /api/auth/me` (mustOnboard should be false)
5. **Upload Avatar** (optional): `POST /api/users/me/avatar`
6. **Verify Complete**: `GET /api/auth/me` (mustOnboard should be false)

## cURL Examples

### Get current user
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update profile
```bash
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Hubert",
    "lastname": "Cole"
  }'
```

### Update consents
```bash
curl -X PUT http://localhost:3000/api/users/me/consents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "privacyConsent": true,
    "photoConsent": true
  }'
```

### Upload avatar
```bash
curl -X POST http://localhost:3000/api/users/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@avatar.png"
```

### Get formulas
```bash
curl -X GET http://localhost:3000/api/metadata/formulas \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing

### Run E2E tests
```bash
npm run test:e2e
```

### Check test coverage
```bash
npm run test:cov
```

## Swagger Documentation

Access interactive API documentation at:
```
http://localhost:3000/swagger
```

Set `ENABLE_SWAGGER=true` in environment variables to enable.
