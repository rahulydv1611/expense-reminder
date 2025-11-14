// backend/server.js
// Simple Express backend for Expense Reminder (Node.js)
const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
require('dotenv').config();
const app = express();
app.use(bodyParser.json());
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false });
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'no auth' });
  const token = header.split(' ')[1];
  try { const payload = jwt.verify(token, JWT_SECRET); req.user = payload; next(); } catch (e) { res.status(401).json({ error: 'invalid token' }); }
}
app.post('/api/register', async (req, res) => {
  const { email, password, phone, timezone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await pool.query('INSERT INTO users (email, password_hash, phone, timezone) VALUES ($1,$2,$3,$4) RETURNING id,email,phone', [email, hash, phone||null, timezone||'UTC']);
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'db error' }); }
});
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const r = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
  const user = r.rows[0];
  if (!user) return res.status(400).json({ error: 'no user' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'bad credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token });
});
app.post('/api/expenses', auth, async (req, res) => {
  const { title, amount, currency, due_date, repeat_interval, reminder_days_before, notify_email, notify_whatsapp } = req.body;
  const q = `INSERT INTO expenses (user_id, title, amount, currency, due_date, repeat_interval, reminder_days_before, notify_email, notify_whatsapp)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const vals = [req.user.id, title, amount, currency||'INR', due_date, repeat_interval||null, reminder_days_before||1, notify_email?true:false, notify_whatsapp?true:false];
  try { const r = await pool.query(q, vals); res.json(r.rows[0]); } catch (e) { console.error(e); res.status(500).json({ error:'db' }); }
});
app.get('/api/expenses', auth, async (req,res)=>{
  const q = 'SELECT * FROM expenses WHERE user_id = $1 ORDER BY due_date';
  const r = await pool.query(q, [req.user.id]); res.json(r.rows);
});
async function sendEmail(to, subject, text) {
  return transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
}
async function sendWhatsApp(phone, text) {
  const apikey = process.env.CALLMEBOT_APIKEY;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  const resp = await fetch(url);
  const txt = await resp.text();
  return txt;
}
cron.schedule('0 7 * * *', async () => {
  console.log('[cron] checking reminders');
  try {
    const q = `SELECT e.*, u.email, u.phone FROM expenses e JOIN users u ON u.id = e.user_id WHERE (e.due_date::date - e.reminder_days_before::int) = CURRENT_DATE`;
    const { rows } = await pool.query(q);
    for (const e of rows) {
      const msg = `Reminder: ${e.title} of ${e.amount} ${e.currency} is due on ${e.due_date}.`;
      if (e.notify_email && e.email) {
        try { await sendEmail(e.email, 'Expense reminder', msg); await pool.query('INSERT INTO reminders (expense_id,user_id,send_time,channel,status) VALUES ($1,$2,now(),$3,$4)', [e.id, e.user_id, 'email', 'sent']); } catch (err) { console.error('email fail', err); await pool.query('INSERT INTO reminders (expense_id,user_id,send_time,channel,status,details) VALUES ($1,$2,now(),$3,$4,$5)',[e.id,e.user_id,'email','failed',String(err)]); }
      }
      if (e.notify_whatsapp && e.phone) {
        try { await sendWhatsApp(e.phone, msg); await pool.query('INSERT INTO reminders (expense_id,user_id,send_time,channel,status) VALUES ($1,$2,now(),$3,$4)', [e.id, e.user_id, 'whatsapp', 'sent']); } catch (err) { console.error('wa fail', err); await pool.query('INSERT INTO reminders (expense_id,user_id,send_time,channel,status,details) VALUES ($1,$2,now(),$3,$4,$5)',[e.id,e.user_id,'whatsapp','failed',String(err)]); }
      }
    }
  } catch (err) { console.error('cron error', err); }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log('Server running on',PORT));
