import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ImageUploadPipe implements PipeTransform {
  constructor(
    private readonly maxSize: number,
    private readonly allowedMimeTypes: string[],
  ) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        error: 'Bad Request',
        code: 'INVALID_IMAGE',
        message: 'File is required',
      });
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        error: 'Bad Request',
        code: 'INVALID_IMAGE',
        message: `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      });
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException({
        error: 'Bad Request',
        code: 'IMAGE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${this.maxSize / 1024 / 1024}MB`,
      });
    }

    return file;
  }
}
