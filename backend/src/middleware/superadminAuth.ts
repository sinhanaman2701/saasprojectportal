import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export default function superadminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status_code: 401, status_message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };

    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ status_code: 403, status_message: 'Forbidden: Superadmin access required' });
    }

    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ status_code: 401, status_message: 'Unauthorized: Invalid or expired token' });
  }
}
