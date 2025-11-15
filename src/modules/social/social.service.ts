import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SocialTargetType } from '@prisma/client';
import {
  SocialTargetInputDto,
  SocialLikeResponseDto,
  CreateCommentDto,
  CommentItemDto,
  CommentPageDto,
  CommentQueryDto,
} from './dto';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateTarget(
    type: SocialTargetType,
    entityId: string,
  ): Promise<{ id: string }> {
    const existing = await this.prisma.socialTarget.findUnique({
      where: {
        type_entityId: {
          type,
          entityId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    const target = await this.prisma.socialTarget.create({
      data: {
        type,
        entityId,
      },
      select: { id: true },
    });

    return target;
  }

  async likeTarget(
    userId: string,
    targetInput: SocialTargetInputDto,
  ): Promise<SocialLikeResponseDto> {
    const type = targetInput.targetType as SocialTargetType;
    const target = await this.findOrCreateTarget(type, targetInput.entityId);

    // Try to create the like, ignore if it already exists
    try {
      await this.prisma.socialLike.create({
        data: {
          targetId: target.id,
          userId,
        },
      });
    } catch (error) {
      // If unique constraint violation (like already exists), continue
      // The error code P2002 is the Prisma unique constraint violation
    }

    // Get like count and user's like status
    const likesCount = await this.prisma.socialLike.count({
      where: { targetId: target.id },
    });

    const userLike = await this.prisma.socialLike.findUnique({
      where: {
        targetId_userId: {
          targetId: target.id,
          userId,
        },
      },
    });

    return {
      targetId: target.id,
      likesCount,
      userHasLiked: !!userLike,
    };
  }

  async unlikeTarget(
    userId: string,
    targetInput: SocialTargetInputDto,
  ): Promise<SocialLikeResponseDto> {
    const type = targetInput.targetType as SocialTargetType;

    // Try to find the target
    const target = await this.prisma.socialTarget.findUnique({
      where: {
        type_entityId: {
          type,
          entityId: targetInput.entityId,
        },
      },
      select: { id: true },
    });

    if (!target) {
      // No target means no likes, return empty state
      return {
        targetId: '',
        likesCount: 0,
        userHasLiked: false,
      };
    }

    // Delete the like if it exists
    try {
      await this.prisma.socialLike.delete({
        where: {
          targetId_userId: {
            targetId: target.id,
            userId,
          },
        },
      });
    } catch (error) {
      // If not found, that's fine - user didn't have a like
    }

    // Get updated like count
    const likesCount = await this.prisma.socialLike.count({
      where: { targetId: target.id },
    });

    return {
      targetId: target.id,
      likesCount,
      userHasLiked: false,
    };
  }

  async createComment(
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentItemDto> {
    const type = dto.targetType as SocialTargetType;
    const target = await this.findOrCreateTarget(type, dto.entityId);

    const comment = await this.prisma.socialComment.create({
      data: {
        targetId: target.id,
        userId,
        content: dto.content,
        parentId: dto.parentId,
      },
    });

    return {
      id: comment.id,
      targetId: comment.targetId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      parentId: comment.parentId || undefined,
    };
  }

  async getComments(dto: CommentQueryDto): Promise<CommentPageDto> {
    const type = dto.targetType as SocialTargetType;

    // Try to find the target
    const target = await this.prisma.socialTarget.findUnique({
      where: {
        type_entityId: {
          type,
          entityId: dto.entityId,
        },
      },
      select: { id: true },
    });

    if (!target) {
      // No target means no comments
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const limit = dto.limit || 20;
    const take = Math.min(limit, 50);

    // Fetch comments with cursor-based pagination
    const comments = await this.prisma.socialComment.findMany({
      where: { targetId: target.id },
      orderBy: { createdAt: 'asc' },
      take: take + 1, // +1 to check if there's more
      ...(dto.cursor
        ? {
            cursor: { id: dto.cursor },
            skip: 1, // Skip the cursor item
          }
        : {}),
    });

    const hasMore = comments.length > take;
    const items = hasMore ? comments.slice(0, take) : comments;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const commentItems: CommentItemDto[] = items.map(c => ({
      id: c.id,
      targetId: c.targetId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      parentId: c.parentId || undefined,
    }));

    return {
      items: commentItems,
      nextCursor,
      hasMore,
    };
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    // Load the comment
    const comment = await this.prisma.socialComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { role: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check authorization: author can delete, or admin can delete
    const isAuthor = comment.userId === userId;

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const canDelete = isAuthor || (currentUser && currentUser.role === 'admin');

    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    // Delete the comment (cascade will handle replies)
    await this.prisma.socialComment.delete({
      where: { id: commentId },
    });
  }

  async getSocialStateForTargets(
    targets: { type: SocialTargetType; entityId: string }[],
    userId: string,
  ): Promise<
    Record<
      string,
      {
        likesCount: number;
        commentsCount: number;
        isLikedByUser: boolean;
        targetId: string | null;
      }
    >
  > {
    if (targets.length === 0) {
      return {};
    }

    // Find all existing social targets for these entities
    const socialTargets = await this.prisma.socialTarget.findMany({
      where: {
        OR: targets.map(t => ({
          type: t.type,
          entityId: t.entityId,
        })),
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    // Build a map from type:entityId to social state
    const result: Record<
      string,
      {
        likesCount: number;
        commentsCount: number;
        isLikedByUser: boolean;
        targetId: string | null;
      }
    > = {};

    // Initialize all targets with zero state
    for (const target of targets) {
      const key = `${target.type}:${target.entityId}`;
      result[key] = {
        likesCount: 0,
        commentsCount: 0,
        isLikedByUser: false,
        targetId: null,
      };
    }

    // Fill in actual data for targets that exist
    for (const socialTarget of socialTargets) {
      const key = `${socialTarget.type}:${socialTarget.entityId}`;
      result[key] = {
        likesCount: socialTarget._count.likes,
        commentsCount: socialTarget._count.comments,
        isLikedByUser: socialTarget.likes.length > 0,
        targetId: socialTarget.id,
      };
    }

    return result;
  }
}
