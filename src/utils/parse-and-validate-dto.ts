import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export async function parseAndValidateDto<T extends object>(
  dtoClass: new () => T,
  input: string | object,
): Promise<T> {
  let raw: any;

  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      throw new BadRequestException('Invalid JSON format');
    }
  } else if (typeof input === 'object' && input !== null) {
    raw = input;
  } else {
    throw new BadRequestException('Invalid input type for DTO parsing');
  }

  const dto = plainToInstance(dtoClass, raw);

  try {
    await validateOrReject(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
  } catch (validationErrors) {
    throw new BadRequestException(validationErrors);
  }

  return dto;
}
