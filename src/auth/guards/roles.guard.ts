import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthGuard } from './auth.guards';

@Injectable()
export class RolesGuard extends AuthGuard implements CanActivate {
  constructor(
    jwtService: JwtService,
    prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {
    super(jwtService, prismaService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const allowedRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (allowedRoles.some(role => role === user?.role)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
