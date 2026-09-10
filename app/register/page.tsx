'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { registerUser } from '@/lib/yellowbird-api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [pending, setPending] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password.length < 8) { toast.error('Password is too short', { description: 'Use at least 8 characters.' }); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setPending(true);
    try { await registerUser({ name: form.name, email: form.email, password: form.password }); toast.success('Account created', { description: 'Sign in to open your workspace.' }); router.replace('/login?registered=1'); }
    catch (error) { toast.error('Could not create account', { description: error instanceof Error ? error.message : 'Please try again.' }); setPending(false); }
  }
  return <main className="yb-auth-shell"><div className="yb-auth-card"><Link href="/login" className="yb-auth-back"><ArrowLeft className="size-3.5" /> Back to sign in</Link><div className="yb-auth-mark"><span>yellowbird</span><i /></div><span className="yb-auth-kicker">Start a workspace</span><h1>Bring your work together.</h1><p className="yb-auth-copy">Create an account and turn one source into a considered set of outputs.</p><form className="yb-auth-form" onSubmit={submit}><label>Name<input type="text" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={update('name')} placeholder="Your name" /></label><label>Email<input type="email" autoComplete="email" required value={form.email} onChange={update('email')} placeholder="you@studio.com" /></label><label>Password<input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.password} onChange={update('password')} placeholder="At least 8 characters" /></label><label>Confirm password<input type="password" autoComplete="new-password" required value={form.confirm} onChange={update('confirm')} placeholder="Repeat your password" /></label><button className="yb-auth-submit" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {pending ? 'Creating…' : 'Create account'}</button></form><p className="yb-auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></div><div className="yb-auth-orbit orbit-one" /><div className="yb-auth-orbit orbit-two" /></main>;
}
