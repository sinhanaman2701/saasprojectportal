"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('admin@koltepatil.test');
  const [password, setPassword] = useState('password123');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken', data.response_data.token);
        router.push('/dashboard');
      } else {
        alert(data.status_message);
      }
    } catch(err) {
      alert("Network Error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-8">Kolte Patil Admin</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Administrator Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full text-black bg-white p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secure Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full text-black bg-white p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-md font-bold hover:bg-blue-700 transition duration-150 ease-in-out">Access Secure Portal</button>
        </form>
      </div>
    </div>
  );
}
