import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SocialService } from './social.service';
import { AuthGuard } from '../../auth/guards/auth.guards';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  SocialTargetInputDto,
  SocialLikeResponseDto,
  CreateCommentDto,
  CommentItemDto,
  CommentPageDto,
  CommentQueryDto,
} from './dto';

@ApiTags('Social')
@ApiBearerAuth()
@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('likes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a target (session, tournament, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Like added successfully',
    type: SocialLikeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async likeTarget(
    @Body() body: SocialTargetInputDto,
    @GetUser('id') userId: string,
  ): Promise<SocialLikeResponseDto> {
    return this.socialService.likeTarget(userId, body);
  }

  @Delete('likes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlike a target (session, tournament, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Like removed successfully',
    type: SocialLikeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unlikeTarget(
    @Body() body: SocialTargetInputDto,
    @GetUser('id') userId: string,
  ): Promise<SocialLikeResponseDto> {
    return this.socialService.unlikeTarget(userId, body);
  }

  @Get('comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comments for a target' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: CommentPageDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getComments(@Query() query: CommentQueryDto): Promise<CommentPageDto> {
    return this.socialService.getComments(query);
  }

  @Post('comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment on a target' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentItemDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createComment(
    @Body() body: CreateCommentDto,
    @GetUser('id') userId: string,
  ): Promise<CommentItemDto> {
    return this.socialService.createComment(userId, body);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ): Promise<void> {
    await this.socialService.deleteComment(userId, id);
  }
}
