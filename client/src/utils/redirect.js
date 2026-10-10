/**
 * Where to go after logging in: the ?next= page (set when a session expired) or the page that redirected to
 * login, else the dashboard. Only same-site paths are allowed, never an external or protocol-relative URL.
 */
export function postLoginPath(location) {
  const next = new URLSearchParams(location.search).get('next');
  const from = location.state?.from;
  const wanted = next || (from ? `${from.pathname}${from.search || ''}` : '');
  return /^\/(?!\/)/.test(wanted) && !wanted.startsWith('/login') ? wanted : '/dashboard';
}
