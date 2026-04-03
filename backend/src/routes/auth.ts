import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ status_code: 401, status_message: "Unauthorized: Invalid or expired access token" });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ status_code: 401, status_message: "Unauthorized: Invalid or expired access token" });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET);

    res.status(200).json({
      status_code: 200,
      status_message: "Success",
      response_data: { token, email: admin.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error: Something went wrong on the server." });
  }
});

router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is generally handled strictly via deleting the token directly on the client React SPA.
  res.status(200).json({ status_code: 200, status_message: "Logged out successfully" });
});

export default router;
