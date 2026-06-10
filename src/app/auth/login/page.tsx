'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/home';

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPw]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoad] = useState(false);
  const [error, setError]             = useState('');

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push(next); router.refresh();
  }

  async function handleGoogleLogin() {
    setGoogleLoad(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (error) { setError(error.message); setGoogleLoad(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050816', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' as const }}
        style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <img src="/logo-wordmark.png" alt="X-Hunt" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0F4FF', margin: '0 0 6px', letterSpacing: '-.02em' }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: '#8B9CC0', margin: '0 0 28px' }}>Sign in to your workspace</p>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,92,122,.1)', border: '1px solid rgba(255,92,122,.3)', borderRadius: 14, padding: '10px 14px', marginBottom: 18 }}>
            <AlertCircle size={15} style={{ color: '#FF5C7A', flexShrink: 0 }} strokeWidth={2} />
            <p style={{ fontSize: 13, color: '#FF5C7A', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#4A5578' }} strokeWidth={2} />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: '100%', height: 48, background: '#0A1226', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, paddingLeft: 44, paddingRight: 16, color: '#F0F4FF', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(34,255,170,.35)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#4A5578' }} strokeWidth={2} />
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: '100%', height: 48, background: '#0A1226', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, paddingLeft: 44, paddingRight: 44, color: '#F0F4FF', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(34,255,170,.35)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
            <button type="button" onClick={() => setShowPw(!showPassword)}
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5578', padding: 2 }}>
              {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
            </button>
          </div>

          <motion.button type="submit" disabled={loading || !email || !password} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', height: 48, background: '#22FFAA', color: '#050816', borderRadius: 14, border: 'none', fontWeight: 800, fontSize: 15, cursor: loading || !email || !password ? 'not-allowed' : 'pointer', opacity: loading || !email || !password ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(34,255,170,0.35)', marginTop: 4, fontFamily: 'inherit' }}>
            {loading ? <Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign in'}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
          <span style={{ fontSize: 12, color: '#4A5578', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
        </div>

        {/* Google */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleGoogleLogin} disabled={googleLoading}
          style={{ width: '100%', height: 48, background: '#0A1226', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, fontWeight: 600, color: '#F0F4FF', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: googleLoading ? 'wait' : 'pointer', opacity: googleLoading ? 0.55 : 1, fontFamily: 'inherit' }}>
          {googleLoading ? <Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </motion.button>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#8B9CC0', marginTop: 24 }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: '#22FFAA', fontWeight: 700, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#050816', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #22FFAA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
