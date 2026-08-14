import { useEffect, useState } from 'react';
import { request } from './api.js';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const fullCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

const emptySummary = {
  balance: 0,
  income: 0,
  expenses: 0,
  savings: 0,
  investments: 0,
};

const entryTypes = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
];

const categories = {
  expense: ['Food & dining', 'Home & utilities', 'Transport', 'Shopping', 'Health', 'Education', 'Entertainment', 'Other'],
  income: ['Salary', 'Freelance', 'Business', 'Gift', 'Other'],
  savings: ['Emergency fund', 'Retirement', 'Travel fund', 'Home fund', 'Other'],
  investment: ['Stocks', 'Funds', 'Retirement account', 'Real estate', 'Other'],
};

function Icon({ name, size = 20, stroke = 1.8 }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chart: <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    dots: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    goal: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="m15 9-3 3" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.62 2.62-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56v.08h-3.7v-.08A1.7 1.7 0 0 0 9.46 19.2a1.7 1.7 0 0 0-1.88.34l-.06.06L4.9 16.98l.06-.06A1.7 1.7 0 0 0 5.3 15a1.7 1.7 0 0 0-1.56-1.04h-.08v-3.7h.08A1.7 1.7 0 0 0 5.3 9.22 1.7 1.7 0 0 0 4.96 7.34l-.06-.06 2.62-2.62.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.04-1.56v-.08h3.7v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.62 2.62-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.08v3.7h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    trendDown: <><path d="M3 17 9 11l4 4 8-9" /><path d="M16 6h5v5" /></>,
    trendUp: <><path d="m3 17 6-6 4 4 8-9" /><path d="M16 6h5v5" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2H6.5a2.5 2.5 0 0 0 0 5H20v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M20 9v5H6.5a2.5 2.5 0 0 1 0-5Z" /><circle cx="16.5" cy="11.5" r=".75" fill="currentColor" stroke="none" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Logo({ light = false }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark"><span /></span>
      <span>FinTrack</span>
    </div>
  );
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'FT';
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const data = await request(endpoint, { method: 'POST', body });
      onAuthenticated(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="intro-inner">
          <Logo light />
          <div className="intro-copy">
            <p className="eyebrow">PERSONAL FINANCE, MADE CLEAR</p>
            <h1>Feel at home with your money.</h1>
            <p className="intro-text">A calm, clear place to see where your money goes and make plans that feel right for you.</p>
          </div>
          <div className="intro-balance" aria-label="Example balance card">
            <div className="intro-balance-top">
              <span>Available this month</span>
              <span className="balance-dot" />
            </div>
            <strong>₹2,840</strong>
            <div className="balance-chart">
              <span style={{ height: '30%' }} />
              <span style={{ height: '48%' }} />
              <span style={{ height: '37%' }} />
              <span style={{ height: '66%' }} />
              <span style={{ height: '55%' }} />
              <span style={{ height: '80%' }} />
              <span style={{ height: '72%' }} />
            </div>
            <p>Growing steadily</p>
          </div>
          <p className="intro-footnote">Your information stays private and secure.</p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Logo />
          <div className="auth-heading">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>{mode === 'login' ? 'Sign in to see your financial picture.' : 'Start managing your money with more clarity.'}</p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')} type="button" role="tab" aria-selected={mode === 'login' ? 'true' : 'false'}>Sign in</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')} type="button" role="tab" aria-selected={mode === 'register' ? 'true' : 'false'}>Create account</button>
          </div>

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label>
                <span>Your name</span>
                <input name="name" type="text" autoComplete="name" value={form.name} onChange={updateField} placeholder="e.g. Sam Taylor" required maxLength="80" />
              </label>
            )}
            <label>
              <span>Email address</span>
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} placeholder="you@example.com" required />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={updateField} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} required minLength={mode === 'register' ? '8' : undefined} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-wide" disabled={pending} type="submit">
              {pending ? 'Please wait...' : mode === 'login' ? 'Sign in to FinTrack' : 'Create my account'}
              {!pending && <Icon name="arrow" size={18} />}
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? 'New to FinTrack?' : 'Already have an account?'}
            <button type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ user, activeView, onNavigate, onLogout, isOpen, onClose }) {
  const links = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'entries', label: 'Transactions', icon: 'wallet' },
    { id: 'goals', label: 'Goals', icon: 'goal' },
  ];

  function navigate(id) {
    onNavigate(id);
    onClose();
  }

  return (
    <>
      <button className={`nav-scrim ${isOpen ? 'visible' : ''}`} aria-label="Close menu" onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><Logo light /></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-label">YOUR FINANCES</p>
          {links.map((link) => (
            <button key={link.id} type="button" className={activeView === link.id ? 'active' : ''} onClick={() => navigate(link.id)}>
              <Icon name={link.icon} size={19} />
              <span>{link.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button type="button" className="sidebar-settings" onClick={() => navigate('settings')}>
            <Icon name="settings" size={19} /> <span>Settings</span>
          </button>
          <div className="profile-mini">
            <span className="avatar">{initials(user.name)}</span>
            <span className="profile-mini-name">{user.name}</span>
            <button type="button" aria-label="Sign out" onClick={onLogout}><Icon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SummaryCard({ label, amount, variant, icon, detail }) {
  return (
    <article className={`summary-card ${variant || ''}`}>
      <div className="summary-icon"><Icon name={icon} size={21} /></div>
      <p>{label}</p>
      <strong>{currency.format(Number(amount || 0))}</strong>
      {detail && <span className="summary-detail">{detail}</span>}
    </article>
  );
}

function BalanceCard({ summary }) {
  const allocation = Math.max(Number(summary.expenses) + Number(summary.savings) + Number(summary.investments), 1);
  const savedPercent = Math.min(Math.round(((Number(summary.savings) + Number(summary.investments)) / allocation) * 100), 100);
  return (
    <article className="balance-card">
      <div className="balance-card-top">
        <div>
          <p>Money available</p>
          <strong>{currency.format(Number(summary.balance || 0))}</strong>
        </div>
        <span className="balance-card-icon"><Icon name="wallet" size={22} /></span>
      </div>
      <div className="balance-card-bottom">
        <div>
          <span>{savedPercent}% directed to your future</span>
          <div className="progress-track"><span style={{ width: `${savedPercent}%` }} /></div>
        </div>
        <span className="balance-caption">From your recorded activity</span>
      </div>
    </article>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="wallet" size={25} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

function ActivityIcon({ type }) {
  const icons = {
    income: { text: 'IN', icon: 'trendUp' },
    expense: { text: 'OUT', icon: 'trendDown' },
    savings: { text: 'SAVE', icon: 'goal' },
    investment: { text: 'INV', icon: 'chart' },
  };
  const item = icons[type] || icons.expense;
  return <span className={`activity-icon ${type}`} title={item.text}><Icon name={item.icon} size={17} /></span>;
}

function EntryAmount({ entry }) {
  const positive = entry.entryType === 'income';
  return <strong className={positive ? 'amount-positive' : 'amount-neutral'}>{positive ? '+' : '-'}{fullCurrency.format(Number(entry.amount))}</strong>;
}

function RecentActivity({ entries, onShowEntries, onEdit, onDelete }) {
  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow dark">RECENT ACTIVITY</p>
          <h2>Latest transactions</h2>
        </div>
        <button type="button" className="text-button" onClick={onShowEntries}>See all <Icon name="arrow" size={16} /></button>
      </div>
      {entries.length ? (
        <div className="activity-list">
          {entries.slice(0, 5).map((entry) => (
            <div className="activity-row" key={entry.id}>
              <ActivityIcon type={entry.entryType} />
              <div className="activity-detail">
                <strong>{entry.category}</strong>
                <span>{entry.description || titleCase(entry.entryType)} · {formatDate(entry.entryDate)}</span>
              </div>
              <EntryAmount entry={entry} />
              <div className="entry-actions">
                <button type="button" onClick={() => onEdit(entry)}>Edit</button>
                <button type="button" onClick={() => onDelete(entry.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No activity yet" description="Add your first entry to start building a clear financial picture." action={<button type="button" className="button button-outline" onClick={onShowEntries}>View transactions</button>} />
      )}
    </section>
  );
}

function SpendingPanel({ categories, totalExpenses }) {
  const highest = Math.max(...categories.map((category) => Number(category.amount)), 1);
  return (
    <section className="panel spending-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow dark">SPENDING SNAPSHOT</p>
          <h2>Where it is going</h2>
        </div>
        <span className="period-pill">All time</span>
      </div>
      {categories.length ? (
        <div className="spending-list">
          {categories.map((category, index) => (
            <div className="spending-row" key={category.category}>
              <div className="spending-row-title">
                <span className={`category-dot dot-${index % 5}`} />
                <span>{category.category}</span>
                <strong>{currency.format(Number(category.amount))}</strong>
              </div>
              <div className="spending-track"><span className={`bar-${index % 5}`} style={{ width: `${(Number(category.amount) / highest) * 100}%` }} /></div>
            </div>
          ))}
          <p className="spending-total">Total expenses recorded <strong>{fullCurrency.format(Number(totalExpenses || 0))}</strong></p>
        </div>
      ) : (
        <EmptyState title="Your spending will appear here" description="Record an expense and FinTrack will organize the picture for you." />
      )}
    </section>
  );
}

function GoalPanel({ goals, onShowGoals }) {
  const goal = goals[0];
  if (!goal) {
    return (
      <section className="goal-card goal-empty">
        <span className="goal-leaf"><Icon name="goal" size={24} /></span>
        <p className="eyebrow">LOOKING AHEAD</p>
        <h2>Give your money a direction.</h2>
        <p>Create a goal for something that matters to you, then see the progress at a glance.</p>
        <button type="button" className="button button-light" onClick={onShowGoals}><Icon name="plus" size={17} /> Create a goal</button>
      </section>
    );
  }
  const progress = Math.min(Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100), 100);
  return (
    <section className="goal-card">
      <div className="goal-card-heading">
        <span className="goal-leaf"><Icon name="goal" size={22} /></span>
        <button className="icon-button light" type="button" aria-label="View all goals" onClick={onShowGoals}><Icon name="chevron" size={18} /></button>
      </div>
      <p className="eyebrow">YOUR NEXT MILESTONE</p>
      <h2>{goal.name}</h2>
      <div className="goal-amounts"><strong>{fullCurrency.format(Number(goal.currentAmount))}</strong><span>of {fullCurrency.format(Number(goal.targetAmount))}</span></div>
      <div className="goal-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="goal-foot"><span>{progress}% complete</span><span>{goal.targetDate ? `Target ${formatDate(goal.targetDate)}` : 'Keep going'}</span></div>
    </section>
  );
}

function Dashboard({ user, data, entries, onAddEntry, onViewEntries, onViewGoals, onEditEntry, onDeleteEntry }) {
  const { summary = emptySummary, categories: spendCategories = [], goals = [] } = data;
  return (
    <>
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow dark">{getGreeting()}, {user.name.split(' ')[0]}</p>
          <h1>Your financial overview</h1>
          <p className="header-description">Here is a simple view of the money you have recorded.</p>
        </div>
        <button className="button button-primary add-entry" onClick={onAddEntry} type="button"><Icon name="plus" size={18} /> Add transaction</button>
      </header>

      <BalanceCard summary={summary} />

      <div className="summary-grid">
        <SummaryCard label="Income" amount={summary.income} variant="income" icon="trendUp" detail="Money coming in" />
        <SummaryCard label="Expenses" amount={summary.expenses} variant="expenses" icon="trendDown" detail="Money going out" />
        <SummaryCard label="Savings" amount={summary.savings} variant="savings" icon="goal" detail="Set aside for later" />
        <SummaryCard label="Investments" amount={summary.investments} variant="investments" icon="chart" detail="Building long-term value" />
      </div>

      <div className="dashboard-content-grid">
        <RecentActivity entries={entries} onShowEntries={onViewEntries} onEdit={onEditEntry} onDelete={onDeleteEntry} />
        <div className="dashboard-side-stack">
          <GoalPanel goals={goals} onShowGoals={onViewGoals} />
          <SpendingPanel categories={spendCategories} totalExpenses={summary.expenses} />
        </div>
      </div>
    </>
  );
}

function TransactionPage({ entries, onAddEntry, onEditEntry, onDeleteEntry }) {
  const [filter, setFilter] = useState('all');
  const visibleEntries = filter === 'all' ? entries : entries.filter((entry) => entry.entryType === filter);
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow dark">YOUR RECORDS</p>
          <h1>Transactions</h1>
          <p className="header-description">Every item you add is saved securely to your FinTrack account.</p>
        </div>
        <button className="button button-primary add-entry" onClick={onAddEntry} type="button"><Icon name="plus" size={18} /> Add transaction</button>
      </header>
      <section className="panel transactions-panel">
        <div className="transactions-toolbar">
          <div className="filter-tabs" role="tablist" aria-label="Filter transactions">
            {['all', 'expense', 'income', 'savings', 'investment'].map((type) => (
              <button type="button" role="tab" aria-selected={filter === type} className={filter === type ? 'active' : ''} key={type} onClick={() => setFilter(type)}>{type === 'all' ? 'All' : titleCase(type)}</button>
            ))}
          </div>
          <span className="entry-count">{visibleEntries.length} {visibleEntries.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        {visibleEntries.length ? (
          <div className="transaction-table-wrap">
            <table className="transaction-table">
              <thead><tr><th>Description</th><th>Type</th><th>Date</th><th className="number-cell">Amount</th><th><span className="screen-reader">Actions</span></th></tr></thead>
              <tbody>
                {visibleEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td><div className="transaction-main"><ActivityIcon type={entry.entryType} /><span><strong>{entry.category}</strong><small>{entry.description || 'No description'}</small></span></div></td>
                    <td><span className={`type-pill ${entry.entryType}`}>{titleCase(entry.entryType)}</span></td>
                    <td>{formatDate(entry.entryDate)}</td>
                    <td className="number-cell"><EntryAmount entry={entry} /></td>
                    <td><div className="table-actions"><button type="button" onClick={() => onEditEntry(entry)}>Edit</button><button type="button" onClick={() => onDeleteEntry(entry.id)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nothing to show here" description={filter === 'all' ? 'Add a transaction to begin tracking your money.' : `You have not added any ${filter} entries yet.`} action={<button type="button" className="button button-outline" onClick={onAddEntry}><Icon name="plus" size={17} /> Add transaction</button>} />
        )}
      </section>
    </>
  );
}

function GoalsPage({ goals, onAddGoal, onDeleteGoal }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow dark">PLANNING AHEAD</p>
          <h1>Your goals</h1>
          <p className="header-description">Keep the things you are working toward visible and encouraging.</p>
        </div>
        <button className="button button-primary add-entry" onClick={onAddGoal} type="button"><Icon name="plus" size={18} /> Create goal</button>
      </header>
      {goals.length ? (
        <section className="goals-grid">
          {goals.map((goal) => {
            const progress = Math.min(Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100), 100);
            return <article className="goal-item" key={goal.id}>
              <div className="goal-item-top"><span className="goal-item-icon"><Icon name="goal" size={20} /></span><button type="button" aria-label={`Delete ${goal.name}`} onClick={() => onDeleteGoal(goal.id)}><Icon name="close" size={18} /></button></div>
              <p>{goal.name}</p>
              <strong>{fullCurrency.format(Number(goal.currentAmount))}</strong><span className="of-goal">of {fullCurrency.format(Number(goal.targetAmount))}</span>
              <div className="goal-progress neutral"><span style={{ width: `${progress}%` }} /></div>
              <footer><span>{progress}% complete</span><span>{goal.targetDate ? formatDate(goal.targetDate) : 'No target date'}</span></footer>
            </article>;
          })}
        </section>
      ) : (
        <section className="panel"><EmptyState title="Start with something meaningful" description="Whether it is a holiday, a safety net, or a long-term plan, setting a goal makes progress visible." action={<button type="button" className="button button-primary" onClick={onAddGoal}><Icon name="plus" size={17} /> Create your first goal</button>} /></section>
      )}
    </>
  );
}

function SettingsPage({ user, onLogout }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow dark">YOUR ACCOUNT</p>
          <h1>Settings</h1>
          <p className="header-description">Manage the details of your FinTrack account.</p>
        </div>
      </header>
      <section className="panel settings-card">
        <div className="settings-avatar">{initials(user.name)}</div>
        <div><h2>{user.name}</h2><p>{user.email}</p></div>
        <button className="button button-outline" type="button" onClick={onLogout}><Icon name="logout" size={17} /> Sign out</button>
      </section>
    </>
  );
}

function EntryModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    entryType: entry?.entryType || 'expense',
    category: entry?.category || categories.expense[0],
    description: entry?.description || '',
    amount: entry?.amount || '',
    entryDate: entry?.entryDate || new Date().toISOString().slice(0, 10),
  }));
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === 'entryType') {
        return { ...current, entryType: value, category: categories[value][0] };
      }
      return { ...current, [name]: value };
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } catch (saveError) {
      setError(saveError.message);
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
        <div className="modal-heading"><div><p className="eyebrow dark">{entry ? 'UPDATE ENTRY' : 'NEW ENTRY'}</p><h2 id="entry-modal-title">{entry ? 'Edit transaction' : 'Add a transaction'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" size={20} /></button></div>
        <form className="form-grid" onSubmit={submit}>
          <label><span>What are you recording?</span><select name="entryType" value={form.entryType} onChange={update}>{entryTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label><span>Category</span><select name="category" value={form.category} onChange={update}>{categories[form.entryType].map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>Amount</span><div className="amount-input"><span>₹</span><input name="amount" type="number" value={form.amount} onChange={update} placeholder="0.00" min="0.01" step="0.01" inputMode="decimal" required /></div></label>
          <label><span>Date</span><input name="entryDate" type="date" value={form.entryDate} onChange={update} required /></label>
          <label className="form-full"><span>A note (optional)</span><input name="description" type="text" value={form.description} onChange={update} placeholder="Add a few details" maxLength="180" /></label>
          {error && <p className="form-error form-full" role="alert">{error}</p>}
          <div className="modal-actions form-full"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={pending}>{pending ? 'Saving...' : entry ? 'Save changes' : 'Add transaction'}</button></div>
        </form>
      </section>
    </div>
  );
}

function GoalModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await onSave({ ...form, targetAmount: Number(form.targetAmount), currentAmount: Number(form.currentAmount || 0) });
    } catch (saveError) {
      setError(saveError.message);
      setPending(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <div className="modal-heading"><div><p className="eyebrow dark">LOOKING AHEAD</p><h2 id="goal-modal-title">Create a goal</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" size={20} /></button></div>
        <form className="form-grid" onSubmit={submit}>
          <label className="form-full"><span>What are you saving for?</span><input name="name" type="text" value={form.name} onChange={update} placeholder="e.g. A family holiday" maxLength="100" required /></label>
          <label><span>Goal amount</span><div className="amount-input"><span>₹</span><input name="targetAmount" type="number" value={form.targetAmount} onChange={update} placeholder="0.00" min="0.01" step="0.01" inputMode="decimal" required /></div></label>
          <label><span>Already saved</span><div className="amount-input"><span>₹</span><input name="currentAmount" type="number" value={form.currentAmount} onChange={update} placeholder="0.00" min="0" step="0.01" inputMode="decimal" /></div></label>
          <label className="form-full"><span>Target date (optional)</span><input name="targetDate" type="date" value={form.targetDate} onChange={update} /></label>
          {error && <p className="form-error form-full" role="alert">{error}</p>}
          <div className="modal-actions form-full"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={pending}>{pending ? 'Creating...' : 'Create goal'}</button></div>
        </form>
      </section>
    </div>
  );
}

function LoadingScreen() {
  return <div className="loading-screen"><Logo /><span className="loading-ring" /><p>Loading your FinTrack account...</p></div>;
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fintrack-session'));
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(Boolean(session?.token));
  const [data, setData] = useState({ summary: emptySummary, categories: [], goals: [] });
  const [entries, setEntries] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function loadAccount(token = session?.token) {
    if (!token) return;
    try {
      const [account, dashboard, entryResponse] = await Promise.all([
        request('/me', { token }),
        request('/dashboard', { token }),
        request('/entries', { token }),
      ]);
      setSession((current) => ({ ...current, token, user: account.user }));
      setData(dashboard);
      setEntries(entryResponse.entries);
    } catch (loadError) {
      if (/session|sign in|account not found/i.test(loadError.message)) {
        localStorage.removeItem('fintrack-session');
        setSession(null);
      } else {
        setNotice(loadError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (session?.token) loadAccount(session.token);
  }, []);

  function authenticate(nextSession) {
    localStorage.setItem('fintrack-session', JSON.stringify(nextSession));
    setSession(nextSession);
    setIsLoading(true);
    loadAccount(nextSession.token);
  }

  function logout() {
    localStorage.removeItem('fintrack-session');
    setSession(null);
    setData({ summary: emptySummary, categories: [], goals: [] });
    setEntries([]);
    setActiveView('dashboard');
    setMenuOpen(false);
  }

  async function saveEntry(form) {
    const isEditing = Boolean(modal?.entry);
    const path = isEditing ? `/entries/${modal.entry.id}` : '/entries';
    const result = await request(path, { token: session.token, method: isEditing ? 'PUT' : 'POST', body: form });
    setModal(null);
    setNotice(isEditing ? 'Transaction updated.' : 'Transaction added.');
    await loadAccount();
    return result;
  }

  async function deleteEntry(id) {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try {
      await request(`/entries/${id}`, { token: session.token, method: 'DELETE' });
      setNotice('Transaction deleted.');
      await loadAccount();
    } catch (deleteError) {
      setNotice(deleteError.message);
    }
  }

  async function saveGoal(form) {
    const result = await request('/goals', { token: session.token, method: 'POST', body: form });
    setModal(null);
    setNotice('Goal created.');
    await loadAccount();
    return result;
  }

  async function deleteGoal(id) {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;
    try {
      await request(`/goals/${id}`, { token: session.token, method: 'DELETE' });
      setNotice('Goal deleted.');
      await loadAccount();
    } catch (deleteError) {
      setNotice(deleteError.message);
    }
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!session?.token) {
    return <AuthPage onAuthenticated={authenticate} />;
  }
  if (isLoading) return <LoadingScreen />;

  let view;
  if (activeView === 'entries') {
    view = <TransactionPage entries={entries} onAddEntry={() => setModal({ type: 'entry' })} onEditEntry={(entry) => setModal({ type: 'entry', entry })} onDeleteEntry={deleteEntry} />;
  } else if (activeView === 'goals') {
    view = <GoalsPage goals={data.goals || []} onAddGoal={() => setModal({ type: 'goal' })} onDeleteGoal={deleteGoal} />;
  } else if (activeView === 'settings') {
    view = <SettingsPage user={session.user} onLogout={logout} />;
  } else {
    view = <Dashboard user={session.user} data={data} entries={entries} onAddEntry={() => setModal({ type: 'entry' })} onViewEntries={() => setActiveView('entries')} onViewGoals={() => setActiveView('goals')} onEditEntry={(entry) => setModal({ type: 'entry', entry })} onDeleteEntry={deleteEntry} />;
  }

  return (
    <div className="app-shell">
      <Sidebar user={session.user} activeView={activeView} onNavigate={setActiveView} onLogout={logout} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="app-main">
        <div className="mobile-topbar"><button type="button" className="icon-button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon name="menu" size={23} /></button><Logo /><span className="avatar">{initials(session.user.name)}</span></div>
        {notice && <div className="toast" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}
        {view}
      </main>
      {modal?.type === 'entry' && <EntryModal entry={modal.entry} onClose={() => setModal(null)} onSave={saveEntry} />}
      {modal?.type === 'goal' && <GoalModal onClose={() => setModal(null)} onSave={saveGoal} />}
    </div>
  );
}

export default App;
