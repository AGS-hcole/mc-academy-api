import {
  Controller,
  Put,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guards';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateConsentsDto } from './dto/update-consents.dto';
import { ImageUploadPipe } from './upload/image-upload.pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 409, description: 'FFT license number already taken' })
  async updateMe(@GetUser() user: any, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Put('me/consents')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update user consents' })
  @ApiResponse({ status: 200, description: 'Consents updated successfully' })
  async updateConsents(@GetUser() user: any, @Body() dto: UpdateConsentsDto) {
    return this.usersService.updateConsents(user.id, dto);
  }

  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
          return cb(
            new Error('Invalid file type. Only PNG and JPEG are allowed.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid image or size too large' })
  async uploadAvatar(
    @GetUser() user: any,
    @UploadedFile(
      new ImageUploadPipe(2 * 1024 * 1024, [
        'image/png',
        'image/jpeg',
        'image/jpg',
      ]),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Post('me/background')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('background', {
      limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
      fileFilter: (req, file, cb) => {
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
          return cb(
            new Error('Invalid file type. Only PNG and JPEG are allowed.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload user background' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        background: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Background uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid image or size too large' })
  async uploadBackground(
    @GetUser() user: any,
    @UploadedFile(
      new ImageUploadPipe(4 * 1024 * 1024, [
        'image/png',
        'image/jpeg',
        'image/jpg',
      ]),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadBackground(user.id, file);
  }

  @Get('me/avatar')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Avatar not found' })
  async getAvatar(@GetUser() user: any, @Res() res: Response) {
    const avatar = await this.usersService.getAvatar(user.id);

    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    const buffer = Buffer.isBuffer(avatar.data)
      ? avatar.data
      : Buffer.from(avatar.data as any, 'base64');

    res.set({
      'Content-Type': avatar.mimeType || 'image/png',
      'Cache-Control': 'private, max-age=0',
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  @Get('me/background')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get user background' })
  @ApiResponse({
    status: 200,
    description: 'Background retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Background not found' })
  async getBackground(@GetUser() user: any, @Res() res: Response) {
    const background = await this.usersService.getBackground(user.id);

    if (!background) {
      throw new NotFoundException('Background not found');
    }

    res.set({
      'Content-Type': background.mimeType || 'image/png',
      'Cache-Control': 'private, max-age=0',
    });
    res.send(background.data);
  }
}
