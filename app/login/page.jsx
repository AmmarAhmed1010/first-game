'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Gamepad2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router   = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);
  const emailRef = useRef(null);

  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);
  useEffect(() => { emailRef.current?.focus(); }, []);
//changesafdsafdsafadsfsdafdsa
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim())    { triggerError('Email is required.');    return; }
    if (!password.trim()) { triggerError('Password is required.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const result = login(email.trim().toLowerCase(), password, remember);
    setLoading(false);
    if (result.success) {
      router.replace('/dashboard');
    } else {
      triggerError(result.error);
    }
  };

  const triggerError = (msg) => {
    setError(msg); setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

      {/* Card */}
      <div className={`relative w-full max-w-md mx-4 ${shake ? 'animate-shake' : ''}`}
        style={{ animation: shake ? undefined : 'fadeInUp 0.6s ease forwards' }}>
        <div className="glass rounded-2xl p-8"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 animate-float"
              style={{ boxShadow: '0 0 40px rgba(255,255,255,0.15)' }}>
              <Gamepad2 size={28} className="text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white">GamePortal</h1>
            <p className="text-sm text-[#555] mt-1">Sign in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider">Email</label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@games.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#333] text-sm outline-none focus:border-white/30 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#333] text-sm outline-none focus:border-white/30 transition-all"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors p-1">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setRemember(r => !r)}
                  className={`w-4 h-4 rounded border transition-all cursor-pointer flex items-center justify-center ${
                    remember ? 'bg-white border-white' : 'border-white/20 bg-transparent'
                  }`}>
                  {remember && <svg viewBox="0 0 12 10" className="w-3 h-3"><path d="M1 5l3.5 3.5L11 1" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                </div>
                <span className="text-xs text-[#666]">Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-black text-sm font-bold transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#333] mt-6">
            Use admin@games.com / 123456
          </p>
        </div>
      </div>
    </div>
  );
}
