import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = exception.meta?.target as string[] | undefined;
        const field = target?.[0] || 'field';

        if (field === 'fftLicenseNumber') {
          response.status(HttpStatus.CONFLICT).json({
            error: 'Conflict',
            code: 'FFT_LICENSE_TAKEN',
            field: 'fftLicenseNumber',
            message: 'This FFT license number is already in use',
          });
        } else {
          response.status(HttpStatus.CONFLICT).json({
            error: 'Conflict',
            message: `Unique constraint failed on field: ${field}`,
          });
        }
        break;
      }

      case 'P2025': {
        // Record not found
        response.status(HttpStatus.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Record not found',
        });
        break;
      }

      default: {
        // Generic database error
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Internal Server Error',
          message: 'An unexpected database error occurred',
        });
        break;
      }
    }
  }
}
