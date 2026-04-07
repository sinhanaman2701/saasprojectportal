import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number;

// POST /admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status_code: 400, status_message: 'Email and password are required' });
    }

    const superadmin = await prisma.superadmin.findUnique({ where: { email } });
    if (!superadmin) {
      return res.status(401).json({ status_code: 401, status_message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, superadmin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ status_code: 401, status_message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: superadmin.id, email: superadmin.email, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as JwtExpiry }
    );

    res.json({
      status_code: 200,
      status_message: 'Success',
      response_data: { token, email: superadmin.email, role: 'superadmin' },
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/auth/register — seed first superadmin
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status_code: 400, status_message: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ status_code: 400, status_message: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.superadmin.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: 'Superadmin already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const superadmin = await prisma.superadmin.create({
      data: { email, passwordHash },
    });

    const token = jwt.sign(
      { id: superadmin.id, email: superadmin.email, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as JwtExpiry }
    );

    res.status(201).json({
      status_code: 201,
      status_message: 'Superadmin created',
      response_data: { token, email: superadmin.email, role: 'superadmin' },
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
