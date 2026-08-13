import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool, verifyDatabaseConnection } from './db.js';
import { createToken, requireAuth } from './auth.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());
const validTypes = new Set(['income', 'expense', 'savings', 'investment']);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function dateForMySql(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function entryFromBody(body) {
  const entryType = cleanString(body.entryType, 20);
  const category = cleanString(body.category, 64);
  const description = cleanString(body.description, 180) || null;
  const amount = Number(body.amount);
  const entryDate = dateForMySql(body.entryDate);

  if (!validTypes.has(entryType)) {
    return { error: 'Choose a valid entry type.' };
  }
  if (!category) {
    return { error: 'Enter a category.' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Enter an amount greater than zero.' };
  }
  if (!entryDate) {
    return { error: 'Choose a valid date.' };
  }

  return { entryType, category, description, amount, entryDate };
}

async function entryBelongsToUser(entryId, userId) {
  const [rows] = await pool.execute(
    'SELECT id FROM finance_entries WHERE id = ? AND user_id = ?',
    [entryId, userId],
  );
  return rows.length > 0;
}

app.get('/api/health', async (_req, res) => {
  try {
    await verifyDatabaseConnection();
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable', error: 'Database connection unavailable.' });
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = cleanString(req.body.name, 80);
    const email = cleanString(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Enter your name and a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Use at least 8 characters for your password.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash],
    );
    const user = { id: result.insertId, name, email };
    return res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = cleanString(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');
    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email],
    );
    const account = rows[0];

    if (!account || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ error: 'Email or password is not correct.' });
    }

    const user = { id: account.id, name: account.name, email: account.email };
    return res.json({ user, token: createToken(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.auth.userId],
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    return res.json({ user: rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/entries', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, entry_type AS entryType, category, description, amount,
        DATE_FORMAT(entry_date, '%Y-%m-%d') AS entryDate
       FROM finance_entries
       WHERE user_id = ?
       ORDER BY entry_date DESC, id DESC`,
      [req.auth.userId],
    );
    return res.json({ entries: rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/entries', requireAuth, async (req, res, next) => {
  try {
    const entry = entryFromBody(req.body);
    if (entry.error) {
      return res.status(400).json({ error: entry.error });
    }
    const [result] = await pool.execute(
      `INSERT INTO finance_entries
        (user_id, entry_type, category, description, amount, entry_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.auth.userId, entry.entryType, entry.category, entry.description, entry.amount, entry.entryDate],
    );
    return res.status(201).json({ entry: { id: result.insertId, ...entry } });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/entries/:id', requireAuth, async (req, res, next) => {
  try {
    const id = positiveId(req.params.id);
    const entry = entryFromBody(req.body);
    if (!id || !(await entryBelongsToUser(id, req.auth.userId))) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    if (entry.error) {
      return res.status(400).json({ error: entry.error });
    }
    await pool.execute(
      `UPDATE finance_entries
       SET entry_type = ?, category = ?, description = ?, amount = ?, entry_date = ?
       WHERE id = ? AND user_id = ?`,
      [entry.entryType, entry.category, entry.description, entry.amount, entry.entryDate, id, req.auth.userId],
    );
    return res.json({ entry: { id, ...entry } });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/entries/:id', requireAuth, async (req, res, next) => {
  try {
    const id = positiveId(req.params.id);
    if (!id) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    const [result] = await pool.execute(
      'DELETE FROM finance_entries WHERE id = ? AND user_id = ?',
      [id, req.auth.userId],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const [summaryRows] = await pool.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
        COALESCE(SUM(CASE WHEN entry_type = 'savings' THEN amount ELSE 0 END), 0) AS savings,
        COALESCE(SUM(CASE WHEN entry_type = 'investment' THEN amount ELSE 0 END), 0) AS investments
       FROM finance_entries WHERE user_id = ?`,
      [req.auth.userId],
    );
    const [categoryRows] = await pool.execute(
      `SELECT category, SUM(amount) AS amount
       FROM finance_entries
       WHERE user_id = ? AND entry_type = 'expense'
       GROUP BY category
       ORDER BY amount DESC
       LIMIT 5`,
      [req.auth.userId],
    );
    const [goalRows] = await pool.execute(
      `SELECT id, name, target_amount AS targetAmount, current_amount AS currentAmount,
        DATE_FORMAT(target_date, '%Y-%m-%d') AS targetDate
       FROM financial_goals WHERE user_id = ? ORDER BY created_at DESC`,
      [req.auth.userId],
    );
    const summary = summaryRows[0];
    summary.balance = Number(summary.income) - Number(summary.expenses) - Number(summary.savings) - Number(summary.investments);
    return res.json({ summary, categories: categoryRows, goals: goalRows });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/goals', requireAuth, async (req, res, next) => {
  try {
    const [goals] = await pool.execute(
      `SELECT id, name, target_amount AS targetAmount, current_amount AS currentAmount,
        DATE_FORMAT(target_date, '%Y-%m-%d') AS targetDate
       FROM financial_goals WHERE user_id = ? ORDER BY created_at DESC`,
      [req.auth.userId],
    );
    return res.json({ goals });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/goals', requireAuth, async (req, res, next) => {
  try {
    const name = cleanString(req.body.name, 100);
    const targetAmount = Number(req.body.targetAmount);
    const currentAmount = Number(req.body.currentAmount || 0);
    const targetDate = req.body.targetDate ? dateForMySql(req.body.targetDate) : null;
    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(currentAmount) || currentAmount < 0 || (req.body.targetDate && !targetDate)) {
      return res.status(400).json({ error: 'Enter a goal name and valid amounts.' });
    }
    const [result] = await pool.execute(
      'INSERT INTO financial_goals (user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?)',
      [req.auth.userId, name, targetAmount, currentAmount, targetDate],
    );
    return res.status(201).json({ goal: { id: result.insertId, name, targetAmount, currentAmount, targetDate } });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/goals/:id', requireAuth, async (req, res, next) => {
  try {
    const id = positiveId(req.params.id);
    if (!id) {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    const [result] = await pool.execute(
      'DELETE FROM financial_goals WHERE id = ? AND user_id = ?',
      [id, req.auth.userId],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(port, () => {
  console.log(`FinTrack API is running at http://localhost:${port}`);
});
