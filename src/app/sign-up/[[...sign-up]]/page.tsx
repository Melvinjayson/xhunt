'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiRegister } from '@/lib/auth/api';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/theme/colors';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: `${t.card}cc`,
  border: `1px solid ${t.border}`,
  borderRadius: 12, color: t.txt,
  fontSize: 14, outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: t.txtDim, letterSpacing: '0.08em',
  textTransform: 'uppercase', marginBottom: 6,
};

function getStrength(pw: string): { level: string; color: string; width: number } {
  if (!pw) return { level: '', color: t.border, width: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 'Weak',   color: t.error,   width: 25  };
  if (score <= 2) return { level: 'Fair',   color: t.warning, width: 50  };
  if (score <= 3) return { level: 'Good',   color: t.info,    width: 75  };
  return              { level: 'Strong', color: t.accent,  width: 100 };
}

function SignUpForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const strength = getStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const user = await apiRegister({ email, password, display_name: name || undefined });
      setUser(user);
      router.push('/get-started');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex' }}>

      {/* ── Left panel — form ── */}
      <div
        style={{ flex: '0 0 100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 5vw, 64px) clamp(20px, 6vw, 72px)', position: 'relative' }}
        className="md:flex-[0_0_48%]"
      >
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <Image src="/xhunt-logo.png" alt="X-Hunt" width={64} height={64} style={{ objectFit: 'contain' }} priority onError={() => {}} />
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: t.txt, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Join X-Hunt</h2>
            <p style={{ fontSize: 13, color: t.txtDim, margin: 0 }}>This is the start of something good.</p>
          </div>

          {/* Register | Login tab toggle */}
          <div style={{ display: 'flex', background: t.card, borderRadius: 12, padding: 4, gap: 4, marginBottom: 24 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, color: t.bg, background: t.accent }}>
              Register
            </div>
            <Link
              href="/sign-in"
              style={{ flex: 1, display: 'block', textAlign: 'center', padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, color: t.txtDim, textDecoration: 'none' }}
            >
              Login
            </Link>
          </div>

          {/* Google stub */}
          <button
            type="button"
            disabled
            title="Google sign-in coming soon"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              border: `1px solid ${t.border}`, background: t.card,
              color: t.txtDim, fontSize: 13, fontWeight: 500,
              cursor: 'not-allowed', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, fontFamily: 'inherit',
              opacity: 0.65, boxSizing: 'border-box',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.017 17.64 11.71 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google
            <span style={{ fontSize: 10, color: t.txtFaint }}>· coming soon</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: t.border }} />
            <span style={{ fontSize: 12, color: t.txtFaint }}>or</span>
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Your name</label>
              <input
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Smith"
                style={INPUT_STYLE}
                autoComplete="name"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email" value={email} required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={INPUT_STYLE}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password} required
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...INPUT_STYLE, paddingRight: 44 }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: t.txtDim, cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength bar */}
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 3, background: t.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${strength.width}%`, height: '100%', background: strength.color, borderRadius: 2, transition: 'all 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: strength.color, fontWeight: 600, marginTop: 4 }}>{strength.level}</div>
                </div>
              )}
            </div>

            {error && (
              <p style={{ fontSize: 13, color: t.error, background: `${t.error}14`, border: `1px solid ${t.error}30`, borderRadius: 10, padding: '10px 14px', margin: 0 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? `${t.accent}80` : t.accent,
              color: t.bg, fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', boxShadow: `0 4px 20px ${t.accent}30`,
              transition: 'background 0.15s', marginTop: 4,
            }}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Join the Hunt →'}
            </button>

            <p style={{ fontSize: 11, color: t.txtFaint, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              By signing up you agree to our{' '}
              <Link href="/terms" style={{ color: t.txtDim }}>Terms</Link> and{' '}
              <Link href="/privacy" style={{ color: t.txtDim }}>Privacy Policy</Link>.
              Free forever · No credit card needed.
            </p>
          </form>

          <p style={{ fontSize: 13, color: t.txtDim, textAlign: 'center', marginTop: 20 }}>
            Already have an account?{' '}
            <Link href="/sign-in" style={{ color: t.accent, fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel — hero (desktop only) ── */}
      <div
        style={{ display: 'none', position: 'relative', flex: '0 0 52%', overflow: 'hidden' }}
        className="md:flex md:flex-col md:justify-end md:p-14"
      >
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${t.surface} 0%, ${t.bg} 50%, ${t.surface} 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 70% at 30% 40%, ${t.ai}22 0%, transparent 65%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 70% 70%, ${t.accent}10 0%, transparent 60%)` }} />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 460, aspectRatio: '4/3' }}>
            <Image src="/auth-glass.png" alt="" fill style={{ objectFit: 'contain', filter: `drop-shadow(0 0 80px ${t.ai}50)` }} priority onError={() => {}} />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            Join X-Hunt
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 2.8vw, 46px)', fontWeight: 900, color: t.txt, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Your impact<br />starts here.
          </h1>
          <p style={{ fontSize: 14, color: t.txtDim, lineHeight: 1.65, maxWidth: 320, marginBottom: 28 }}>
            AI-matched missions that align with your skills, passions, and values. Start earning while creating real impact.
          </p>
          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex' }}>
              {[t.accent, t.ai, t.warning, t.error].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `2px solid ${t.bg}`, marginLeft: i ? -8 : 0, opacity: 0.85 }} />
              ))}
            </div>
            <p style={{ fontSize: 13, color: t.txtDim, margin: 0 }}>
              Join <strong style={{ color: t.txt }}>2,400+</strong> explorers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
