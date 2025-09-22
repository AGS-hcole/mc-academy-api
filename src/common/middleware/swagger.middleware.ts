import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export function swaggerAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.path === '/swagger') {
    const token = req.query.token as string;

    if (!token) {
      return res
        .status(401)
        .send('<html><body><h1>401 Unauthorized</h1></body></html>');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res
        .status(401)
        .send('<html><body><h1>401 Unauthorized</h1></body></html>');
    }
  } else {
    next();
  }
}
