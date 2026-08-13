# FinTrack

FinTrack is a full-stack personal finance dashboard for recording income, expenses, savings, investments, and financial goals. It is designed to be clear and comfortable for customers of all ages, with a responsive layout for desktop and mobile.

## Included

- Account creation and sign-in with hashed passwords and JWT sessions
- MySQL-backed, per-user finance entries
- Dashboard totals for available money, income, expenses, savings, and investments
- Spending-by-category overview
- Savings and financial goals
- Add, edit, filter, and delete transactions
- Responsive navigation and accessible form controls

## Tech Stack

- Frontend: React and Vite
- Backend: Express
- Database: MySQL 8+
- Authentication: bcryptjs and JSON Web Tokens

## Run Locally

1. Install MySQL 8 or newer and make sure its server is running.
2. Create the database and tables:

   ```bash
   mysql -u root -p < database/schema.sql
   ```

3. Create `.env` from `.env.example`, then set your actual MySQL password and a long, private JWT secret.

   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=fintrack
   JWT_SECRET=replace_with_a_long_random_secret
   CLIENT_URL=http://localhost:5173
   VITE_API_URL=http://localhost:3001/api
   ```

4. Install dependencies and start the frontend and API together:

   ```bash
   npm install
   npm run dev
   ```

5. Open `http://localhost:5173`, create an account, and add transactions. Entries and goals are saved in MySQL.

## Separate Commands

```bash
npm run client  # React client at http://localhost:5173
npm run server  # Express API at http://localhost:3001
npm run build   # Production frontend build
```

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/me` | Read signed-in user |
| GET, POST | `/api/entries` | List or add transactions |
| PUT, DELETE | `/api/entries/:id` | Update or delete a transaction |
| GET | `/api/dashboard` | Read dashboard totals and spending data |
| GET, POST | `/api/goals` | List or create financial goals |
| DELETE | `/api/goals/:id` | Delete a goal |

Authenticated endpoints require an `Authorization: Bearer <token>` header. The browser application handles this automatically.
