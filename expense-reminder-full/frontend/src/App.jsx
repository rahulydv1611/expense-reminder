import React, { useState, useEffect } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ title:'', amount:'', due_date:'', notify_email:true, notify_whatsapp:false })
  useEffect(()=>{ if (token) fetchExpenses() }, [token])
async function registerUser(payload) {
  const API = import.meta.env.VITE_API_URL;
  const url = `${API}/register`; // adjust path if your endpoint is different
  console.log('Register URL ->', url);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // credentials: 'include' // uncomment if using cookies
    });

    console.log('HTTP status', resp.status, resp.statusText);
    const text = await resp.text(); // read raw body
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', json);
      return json;
    } catch (e) {
      console.log('Response text (not JSON):', text);
      throw new Error('Non-JSON response: ' + text);
    }
  } catch (err) {
    console.error('Fetch failed:', err);
    alert('reg err: ' + (err.message || String(err)));
    throw err;
  }
}

  async function login(){
    try { const r = await axios.post(`${API}/api/login`, { email, password }); localStorage.setItem('token', r.data.token); setToken(r.data.token); } catch (e){ alert('login err') }
  }
  async function fetchExpenses(){
    try { const r = await axios.get(`${API}/api/expenses`, { headers: { Authorization: 'Bearer '+token } }); setExpenses(r.data); } catch (e){ console.error(e) }
  }
  async function addExpense(e){
    e.preventDefault();
    try { const r = await axios.post(`${API}/api/expenses`, {...form}, { headers:{ Authorization: 'Bearer '+token } }); alert('Saved'); setForm({ title:'', amount:'', due_date:'', notify_email:true, notify_whatsapp:false }); fetchExpenses(); } catch (err){ alert('save err') }
  }
  if (!token) return (
    <div className="container">
      <h2>Expense Reminder — Register / Login</h2>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Phone (country code e.g. 9198...)" value={phone} onChange={e=>setPhone(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div className="row">
        <button onClick={register}>Register</button>
        <button onClick={login}>Login</button>
      </div>
    </div>
  )
  return (
    <div className="container">
      <h2>Your Expenses</h2>
      <form onSubmit={addExpense} className="card">
        <input required placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
        <input required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
        <input required type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} />
        <label><input type="checkbox" checked={form.notify_email} onChange={e=>setForm({...form,notify_email:e.target.checked})} /> Email</label>
        <label><input type="checkbox" checked={form.notify_whatsapp} onChange={e=>setForm({...form,notify_whatsapp:e.target.checked})} /> WhatsApp</label>
        <button>Add Expense</button>
      </form>
      <div>
        {expenses.length===0 ? <p>No expenses yet</p> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Amount</th><th>Due</th><th>Notify Email</th><th>Notify WA</th></tr></thead>
            <tbody>{expenses.map(x=> (<tr key={x.id}><td>{x.title}</td><td>{x.amount} {x.currency}</td><td>{x.due_date}</td><td>{x.notify_email? 'Yes':'No'}</td><td>{x.notify_whatsapp? 'Yes':'No'}</td></tr>))}</tbody>
          </table>
        )}
      </div>
      <div style={{marginTop:20}}>
        <button onClick={()=>{ localStorage.removeItem('token'); setToken(null); setExpenses([]) }}>Logout</button>
      </div>
    </div>
  )
}
