'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loginUser } from '@/lib/yellowbird-api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    try { await loginUser({ email, password }); toast.success('Welcome back'); const next = new URLSearchParams(window.location.search).get('next'); router.replace(next?.startsWith('/') ? next : '/'); }
    catch (error) { toast.error('Could not sign in', { description: error instanceof Error ? error.message : 'Check your credentials and try again.' }); setPending(false); }
  }

  return <main className="yb-auth-shell"><div className="yb-auth-card"><Link href="/" className="yb-auth-back"><ArrowLeft className="size-3.5" /> Yellowbird</Link><div className="yb-auth-mark">yellowbird</div><span className="yb-auth-kicker">Workspace access</span><h1>Make media tangible.</h1><p className="yb-auth-copy">Sign in to continue shaping your source into finished work.</p><form className="yb-auth-form" onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@studio.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label><button className="yb-auth-submit" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {pending ? 'Signing in…' : 'Sign in'}</button></form><p className="yb-auth-switch">New to Yellowbird? <Link href="/register">Create an account</Link></p></div><div className="yb-auth-orbit orbit-one" /><div className="yb-auth-orbit orbit-two" /></main>;
}
