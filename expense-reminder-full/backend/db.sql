-- backend/db.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  due_date DATE NOT NULL,
  repeat_interval VARCHAR(20),
  reminder_days_before INT DEFAULT 1,
  notify_email BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  expense_id INT REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  send_time TIMESTAMP,
  channel VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  details TEXT,
  created_at TIMESTAMP DEFAULT now()
);
