# MyCenter Academy API

This is a NestJS application that provides APIs for MyCenter Academy App.

## Environment Variables

The application uses the following environment variables, which should be defined in a `.env` file:

### Global Settings

- `FRONT_URL`: The URL of the front-end application.
- `ALLOWED_IPS`: A comma-separated list of IP addresses that are allowed to access the API.
- `ENABLE_IP_RESTRICTION`: A boolean flag to enable or disable IP restriction.
- `ENABLE_SWAGGER`: A boolean flag to enable or disable Swagger documentation.

### Prisma Settings

- `DB_USER`: The database user.
- `DB_PASSWORD`: The database password.
- `DB_NAME`: The name of the database.
- `DB_HOST`: The database host.
- `DB_PORT`: The database port.
- `DATABASE_URL`: The full database connection URL.

### JWT Settings

- `JWT_SECRET`: The secret key used to sign JWT tokens.
- `JWT_EXP`: The expiration time for JWT tokens.
- `JWT_REFRESH_EXP`: The expiration time for JWT refresh tokens.

### Default User Settings

- `DEFAULT_PW`: The default password for the initial user.
- `DEFAULT_USERNAME`: The default username for the initial user.
- `DEFAULT_EMAIL`: The default email for the initial user.

### Mail Settings

- `M365_EMAIL`: The email address used for sending notifications.
- `M365_EMAIL_PASSWORD`: The password for the notification email account.

### App Settings


## Getting Started

To get started with the application, follow these steps:

1. Clone the repository.
2. Install the dependencies using `npm install`.
3. Create a `.env` file in the root directory and define the environment variables as described above.
4. Run the application using `npm run start`.

## Developper

This project has been developed by DEVOLUT, contact at [hubert.cole@devolut.fr](mailto:hubert.cole@devolut.fr).
