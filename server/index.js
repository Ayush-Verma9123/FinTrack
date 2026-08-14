import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDatabase, verifyDatabaseConnection } from './db.js';
import { createToken, requireAuth } from './auth.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());
const validTypes = new Set(['income', 'expense', 'savings', 'investment']);
const maxAmountCents = 999999999999;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function dateForDatabase(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function objectIdFrom(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
    ? new ObjectId(value)
    : null;
}

function amountToCents(value) {
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(cents) || cents > maxAmountCents) {
    return null;
  }
  return Math.abs(amount * 100 - cents) < 0.000001 ? cents : null;
}

function nonNegativeAmountToCents(value) {
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(cents) || cents > maxAmountCents) {
    return null;
  }
  return Math.abs(amount * 100 - cents) < 0.000001 ? cents : null;
}

function centsToAmount(cents) {
  return Number(cents || 0) / 100;
}

function serializeUser(user) {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
  };
}

function serializeEntry(entry) {
  return {
    id: entry._id.toHexString(),
    entryType: entry.entryType,
    category: entry.category,
    description: entry.description || null,
    amount: centsToAmount(entry.amountCents),
    entryDate: entry.entryDate,
  };
}

function serializeGoal(goal) {
  return {
    id: goal._id.toHexString(),
    name: goal.name,
    targetAmount: centsToAmount(goal.targetAmountCents),
    currentAmount: centsToAmount(goal.currentAmountCents),
    targetDate: goal.targetDate || null,
  };
}

function entryFromBody(body) {
  const entryType = cleanString(body.entryType, 20);
  const category = cleanString(body.category, 64);
  const description = cleanString(body.description, 180) || null;
  const amountCents = amountToCents(body.amount);
  const entryDate = dateForDatabase(body.entryDate);

  if (!validTypes.has(entryType)) {
    return { error: 'Choose a valid entry type.' };
  }
  if (!category) {
    return { error: 'Enter a category.' };
  }
  if (!amountCents) {
    return { error: 'Enter an amount greater than zero with no more than two decimal places.' };
  }
  if (!entryDate) {
    return { error: 'Choose a valid date.' };
  }

  return { entryType, category, description, amountCents, entryDate };
}

function entryForResponse(id, entry) {
  return {
    id: id.toHexString(),
    entryType: entry.entryType,
    category: entry.category,
    description: entry.description,
    amount: centsToAmount(entry.amountCents),
    entryDate: entry.entryDate,
  };
}

function authenticatedUserId(req) {
  return objectIdFrom(req.auth.userId);
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

    const database = await getDatabase();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await database.collection('users').insertOne({
      name,
      email,
      passwordHash,
      createdAt: new Date(),
    });
    const user = { _id: result.insertedId, name, email };
    return res.status(201).json({ user: serializeUser(user), token: createToken(serializeUser(user)) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = cleanString(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');
    const database = await getDatabase();
    const account = await database.collection('users').findOne({ email });

    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is not correct.' });
    }

    const user = serializeUser(account);
    return res.json({ user, token: createToken(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const database = await getDatabase();
    const user = await database.collection('users').findOne(
      { _id: userId },
      { projection: { name: 1, email: 1 } },
    );
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/entries', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const database = await getDatabase();
    const entries = await database.collection('financeEntries')
      .find({ userId })
      .sort({ entryDate: -1, _id: -1 })
      .toArray();
    return res.json({ entries: entries.map(serializeEntry) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/entries', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    const entry = entryFromBody(req.body);
    if (!userId) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    if (entry.error) {
      return res.status(400).json({ error: entry.error });
    }

    const database = await getDatabase();
    const now = new Date();
    const result = await database.collection('financeEntries').insertOne({
      userId,
      ...entry,
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json({ entry: entryForResponse(result.insertedId, entry) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/entries/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    const entryId = objectIdFrom(req.params.id);
    const entry = entryFromBody(req.body);
    if (!userId || !entryId) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    if (entry.error) {
      return res.status(400).json({ error: entry.error });
    }

    const database = await getDatabase();
    const result = await database.collection('financeEntries').updateOne(
      { _id: entryId, userId },
      { $set: { ...entry, updatedAt: new Date() } },
    );
    if (!result.matchedCount) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    return res.json({ entry: entryForResponse(entryId, entry) });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/entries/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    const entryId = objectIdFrom(req.params.id);
    if (!userId || !entryId) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    const database = await getDatabase();
    const result = await database.collection('financeEntries').deleteOne({ _id: entryId, userId });
    if (!result.deletedCount) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const database = await getDatabase();
    const [summaryRows, categoryRows, goals] = await Promise.all([
      database.collection('financeEntries').aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            income: { $sum: { $cond: [{ $eq: ['$entryType', 'income'] }, '$amountCents', 0] } },
            expenses: { $sum: { $cond: [{ $eq: ['$entryType', 'expense'] }, '$amountCents', 0] } },
            savings: { $sum: { $cond: [{ $eq: ['$entryType', 'savings'] }, '$amountCents', 0] } },
            investments: { $sum: { $cond: [{ $eq: ['$entryType', 'investment'] }, '$amountCents', 0] } },
          },
        },
      ]).toArray(),
      database.collection('financeEntries').aggregate([
        { $match: { userId, entryType: 'expense' } },
        { $group: { _id: '$category', amountCents: { $sum: '$amountCents' } } },
        { $sort: { amountCents: -1 } },
        { $limit: 5 },
      ]).toArray(),
      database.collection('financialGoals')
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);
    const summaryCents = summaryRows[0] || { income: 0, expenses: 0, savings: 0, investments: 0 };
    const summary = {
      income: centsToAmount(summaryCents.income),
      expenses: centsToAmount(summaryCents.expenses),
      savings: centsToAmount(summaryCents.savings),
      investments: centsToAmount(summaryCents.investments),
    };
    summary.balance = summary.income - summary.expenses - summary.savings - summary.investments;
    return res.json({
      summary,
      categories: categoryRows.map((category) => ({
        category: category._id,
        amount: centsToAmount(category.amountCents),
      })),
      goals: goals.map(serializeGoal),
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/goals', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const database = await getDatabase();
    const goals = await database.collection('financialGoals')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return res.json({ goals: goals.map(serializeGoal) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/goals', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    const name = cleanString(req.body.name, 100);
    const targetAmountCents = amountToCents(req.body.targetAmount);
    const currentAmountCents = req.body.currentAmount === '' || req.body.currentAmount === undefined
      ? 0
      : nonNegativeAmountToCents(req.body.currentAmount);
    const targetDate = req.body.targetDate ? dateForDatabase(req.body.targetDate) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    if (!name || !targetAmountCents || currentAmountCents === null || (req.body.targetDate && !targetDate)) {
      return res.status(400).json({ error: 'Enter a goal name and valid amounts.' });
    }

    const database = await getDatabase();
    const now = new Date();
    const goal = {
      userId,
      name,
      targetAmountCents,
      currentAmountCents,
      targetDate,
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection('financialGoals').insertOne(goal);
    return res.status(201).json({ goal: serializeGoal({ _id: result.insertedId, ...goal }) });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/goals/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(req);
    const goalId = objectIdFrom(req.params.id);
    if (!userId || !goalId) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const database = await getDatabase();
    const result = await database.collection('financialGoals').deleteOne({ _id: goalId, userId });
    if (!result.deletedCount) {
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
