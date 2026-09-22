import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guards';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Guard that restricts access to a specific child resource for parent users.
 * Expects a `playerId` route parameter (legacy route naming). Admins always pass.
 * Parents are allowed only if the child user is linked to them.
 */
@Injectable()
export class ParentGuard extends AuthGuard implements CanActivate {
  constructor(
    jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {
    super(jwtService, prismaService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    if (user?.role !== 'parent') {
      throw new ForbiddenException('Parent or admin access required');
    }

    const playerId = request.params?.playerId;

    if (!playerId) {
      throw new ForbiddenException('Missing playerId parameter');
    }

    const link = await this.prismaService.parentChild.findUnique({
      where: {
        parentUserId_childUserId: {
          parentUserId: user.id,
          childUserId: playerId,
        },
      },
    });

    if (!link) {
      throw new ForbiddenException('Access denied to this player');
    }

    return true;
  }
}
