import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Loading } from '../../components/ui';
import AuthShell from './AuthShell';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // StrictMode double-invokes effects; the token is single-use.
    sent.current = true;
    api.post('/auth/verify-email', { token: params.get('token') })
      .then(({ data }) => setState({ ok: true, message: data.message }))
      .catch((e) => setState({ ok: false, message: errMsg(e) }));
  }, [params]);

  return (
    <AuthShell title="Email verification" footer={<Link to="/login" className="font-semibold text-indigo-600 hover:underline">Go to login</Link>}>
      {state.loading ? <Loading text="Verifying…" /> : (
        <div className={`flex items-start gap-3 rounded-xl border p-5 text-sm ${state.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {state.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          {state.message}
        </div>
      )}
    </AuthShell>
  );
}
