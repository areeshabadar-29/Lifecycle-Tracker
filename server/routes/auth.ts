import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register new user
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { full_name, email, password, phone, city, role } = req.body;

    // Server-side input validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const db = await getDb();
    // Check if email already registered
    const [existing] = await db.query<any[]>('SELECT user_id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing && existing.length > 0) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Never store plain-text passwords: hash with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [insertResult] = await db.query(
      'INSERT INTO users (full_name, email, password_hash, phone, city, role) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name.trim(), email.trim().toLowerCase(), passwordHash, phone || null, city || null, assignedRole]
    );

    const newUserId = insertResult.insertId;
    const token = generateToken({
      userId: newUserId,
      email: email.trim().toLowerCase(),
      fullName: full_name.trim(),
      role: assignedRole
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: newUserId,
        email: email.trim().toLowerCase(),
        fullName: full_name.trim(),
        role: assignedRole,
        phone: phone || null,
        city: city || null
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user. ' + (error.message || '') });
  }
});

// User login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = await getDb();
    const [rows] = await db.query<any[]>(
      'SELECT user_id, full_name, email, password_hash, phone, city, role FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!rows || rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        city: user.city
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// Current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const [rows] = await db.query<any[]>(
      'SELECT user_id, full_name, email, phone, city, role, created_at FROM users WHERE user_id = ?',
      [req.user!.userId]
    );

    if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user: rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// List users for selection (for transfers, buyers, donors)
router.get('/users', async (_req, res): Promise<void> => {
  try {
    const db = await getDb();
    const [rows] = await db.query<any[]>(
      'SELECT user_id, full_name, email, city, role FROM users ORDER BY full_name ASC'
    );
    res.json({ users: rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load users list.' });
  }
});

export default router;
