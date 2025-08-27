import { useState } from 'react';
import { api, setToken } from '../api';
import { auth } from '../auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();
  const [username, setU] = useState(''); const [password, setP] = useState('');
  const [error, setE] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setE(null);
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    try {
      const { data } = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      auth.token = data.access_token;
      setToken(data.access_token);
      nav('/');
    } catch (err: any) { setE(err?.response?.data?.detail ?? 'Login failed'); }
  };

  return (
    <div className="container py-5" style={{maxWidth: 420}}>
      <h3 className="mb-3">Login</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder="Username" value={username} onChange={e=>setU(e.target.value)} />
        <input className="form-control mb-3" placeholder="Password" type="password" value={password} onChange={e=>setP(e.target.value)} />
        <button className="btn btn-primary w-100" type="submit">Sign in</button>
      </form>
    </div>
  );
}