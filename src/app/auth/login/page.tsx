'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/home';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(0,230,118,0.4)]">
            <span className="text-[#060a0e] font-black text-lg">X</span>
          </div>
          <span className="text-xl font-bold text-[#e8f0fe]">hunt</span>
        </div>

        <h1 className="text-[26px] font-bold text-[#e8f0fe] mb-1">Welcome back</h1>
        <p className="text-[#7a8fa8] text-sm mb-8">Sign in to your workspace</p>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-[#2a0a0a] border border-[#ff5252]/30 rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={15} className="text-[#ff5252] flex-shrink-0" strokeWidth={2} />
            <p className="text-[13px] text-[#ff5252]">{error}</p>
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3 mb-5">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3d5068]" strokeWidth={2} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 bg-[#111927] border border-[#1c2a3a] rounded-xl pl-11 pr-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3d5068]" strokeWidth={2} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 bg-[#111927] border border-[#1c2a3a] rounded-xl pl-11 pr-11 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3d5068] hover:text-[#7a8fa8] transition-colors"
            >
              {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={loading || !email || !password}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 bg-accent text-[#060a0e] rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(0,230,118,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : 'Sign in'}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#1c2a3a]" />
          <span className="text-[12px] text-[#3d5068] font-medium">or</span>
          <div className="flex-1 h-px bg-[#1c2a3a]" />
        </div>

        {/* Google */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full h-12 bg-[#111927] border border-[#1c2a3a] rounded-xl font-semibold text-[#e8f0fe] text-sm flex items-center justify-center gap-3 hover:border-[#2a3f58] transition-colors disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 size={18} strokeWidth={2} className="animate-spin" />
          ) : (
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

        {/* Footer */}
        <p className="text-center text-[#7a8fa8] text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-accent font-semibold hover:text-accent-dark transition-colors">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
