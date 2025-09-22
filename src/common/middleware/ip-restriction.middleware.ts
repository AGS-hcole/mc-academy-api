import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class IpRestrictionMiddleware implements NestMiddleware {
  constructor() {}

  use(req: Request, res: Response, next: NextFunction) {
    const allowedIps = process.env.ALLOWED_IPS.split(',');
    const enableIpRestriction = process.env.ENABLE_IP_RESTRICTION === 'true';
    const clientIp = req.ip;

    if (!allowedIps.includes(clientIp) && enableIpRestriction) {
      console.log('IP not allowed', clientIp);
      throw new UnauthorizedException('IP not allowed');
    }

    next();
  }
}
