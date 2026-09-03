import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthGuard } from './auth.guards';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Generic role-based guard.
 * Authenticates the request via `AuthGuard`, then checks that the connected
 * user's role matches at least one of the roles declared with `@Roles(...)`
 * on the controller or the handler (method-level metadata takes precedence).
 */
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
    // First check authentication (existing logic, unchanged)
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles declared: allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
