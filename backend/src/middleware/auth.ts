import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/env';

export default function adminAuthMiddleware(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status_code: 401, status_message: "Unauthorized: Missing Token" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Mount securely decoded admin credentials onto Express request object
    next();
  } catch (error) {
    return res.status(401).json({ status_code: 401, status_message: "Unauthorized: Invalid or expired access token" });
  }
}
