import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, sql } from '../db.js';
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
    const cleanEmail = email.trim().toLowerCase();

    const db = await getDb();
    // Check if email already registered using T-SQL TOP 1 and named @email
    const checkRes = await db.request()
      .input('email', sql.NVarChar(150), cleanEmail)
      .query('SELECT TOP 1 user_id FROM dbo.users WHERE email = @email');

    if (checkRes.recordset && checkRes.recordset.length > 0) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Never store plain-text passwords: hash with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // T-SQL INSERT with OUTPUT INSERTED.user_id
    const insertRes = await db.request()
      .input('full_name', sql.NVarChar(100), full_name.trim())
      .input('email', sql.NVarChar(150), cleanEmail)
      .input('password_hash', sql.NVarChar(255), passwordHash)
      .input('phone', sql.NVarChar(30), phone || null)
      .input('city', sql.NVarChar(80), city || null)
      .input('role', sql.NVarChar(20), assignedRole)
      .query(`
        INSERT INTO dbo.users (full_name, email, password_hash, phone, city, role)
        OUTPUT INSERTED.user_id
        VALUES (@full_name, @email, @password_hash, @phone, @city, @role)
      `);

    const newUserId = insertRes.recordset[0].user_id;
    const token = generateToken({
      userId: newUserId,
      email: cleanEmail,
      fullName: full_name.trim(),
      role: assignedRole
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: newUserId,
        email: cleanEmail,
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

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();

    // T-SQL parameterized query using TOP 1 and named @email
    const userRes = await db.request()
      .input('email', sql.NVarChar(150), cleanEmail)
      .query(`
        SELECT TOP 1 user_id, full_name, email, password_hash, phone, city, role
        FROM dbo.users
        WHERE email = @email
      `);

    if (!userRes.recordset || userRes.recordset.length === 0) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = userRes.recordset[0];
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
    const result = await db.request()
      .input('user_id', sql.Int, req.user!.userId)
      .query(`
        SELECT TOP 1 user_id, full_name, email, phone, city, role, created_at
        FROM dbo.users
        WHERE user_id = @user_id
      `);

    if (!result.recordset || result.recordset.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user: result.recordset[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// List users for selection
router.get('/users', async (_req, res): Promise<void> => {
  try {
    const db = await getDb();
    const result = await db.request().query(`
      SELECT user_id, full_name, email, city, role
      FROM dbo.users
      ORDER BY full_name ASC
    `);
    res.json({ users: result.recordset });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load users list.' });
  }
});

export default router;
