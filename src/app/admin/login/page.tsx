'use client';
import { useActionState } from 'react';
import { login, type FormState } from '../actions';

export default function Login() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <main className="wrap">
      <form className="login form" action={action} style={{ gridTemplateColumns: '1fr' }}>
        <span className="tag">Administración</span>
        <h1 style={{ fontSize: 30 }}>Entrar al panel</h1>
        <label>Clave<input name="password" type="password" autoComplete="current-password" required autoFocus /></label>
        <p className="err" role="alert">{state.error}</p>
        <button className="btn btn-brand" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}
