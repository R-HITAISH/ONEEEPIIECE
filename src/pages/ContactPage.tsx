import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type ContactForm = { name: string; email: string; subject: string; message: string };
const EMPTY_FORM: ContactForm = { name: '', email: '', subject: '', message: '' };

export function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ContactForm>({ ...EMPTY_FORM, email: user?.email ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: submitError } = await supabase.from('contact_messages').insert({ ...form, user_id: user?.id ?? null });
    setBusy(false);
    if (submitError) setError('Your message could not be sent. Please try again or email support@oneeepiiece.in.');
    else { setSent(true); setForm({ ...EMPTY_FORM, email: user?.email ?? '' }); }
  };

  if (sent) return <section className="page py-20 text-center" role="status"><Check className="mx-auto mb-4" /><h1 className="font-display" style={{ fontWeight: 400 }}>Message received</h1><p className="label mt-3">We’ll reply to you as soon as we can.</p></section>;

  const update = (key: keyof ContactForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return <section className="page py-12 md:py-20 max-w-3xl">
    <p className="label mb-2">We’re here to help</p><h1 className="font-display mb-4" style={{ fontWeight: 400 }}>Contact us</h1>
    <p className="mb-8" style={{ color: 'var(--ink-2)' }}>Questions about a piece, your order or selling with us? Send a note and our Bengaluru team will get back to you.</p>
    <form onSubmit={(event) => void submit(event)} className="grid sm:grid-cols-2 gap-5">
      <label className="label-field">Name<input className="input mt-2" required maxLength={120} value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label className="label-field">Email<input className="input mt-2" type="email" required value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
      <label className="label-field sm:col-span-2">Subject<input className="input mt-2" required maxLength={180} value={form.subject} onChange={(event) => update('subject', event.target.value)} /></label>
      <label className="label-field sm:col-span-2">Message<textarea className="input mt-2" required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={(event) => update('message', event.target.value)} /></label>
      {error && <p className="sm:col-span-2" role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
      <button className="btn btn-primary sm:col-span-2 sm:justify-self-start" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send message'}</button>
    </form>
  </section>;
}
