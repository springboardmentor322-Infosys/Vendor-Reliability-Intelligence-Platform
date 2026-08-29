import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ROLES } from '@/data/mock';
import type { Role } from '@/data/types';
import loginArt from '@/assests/generated/login-illustration.png';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('admin');
  const [email, setEmail] = useState('admin@vendoriq.io');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
    navigate('/dashboard');
  };

  return (
    <div data-ev-id="ev_f9eadd9470" className="flex min-h-screen bg-canvas">
			<div data-ev-id="ev_9811a6a553" className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-white lg:flex">
				<div data-ev-id="ev_85b3a4f191" className="flex items-center gap-3">
					<div data-ev-id="ev_307c12cfdc" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
						<ShieldCheck className="h-6 w-6" />
					</div>
					<div data-ev-id="ev_1bf5458662">
						<p data-ev-id="ev_0277516bfd" className="text-lg font-bold">VendorIQ</p>
						<p data-ev-id="ev_bbce3c843e" className="text-xs text-white/60">Vendor Reliability Intelligence</p>
					</div>
				</div>
				<div data-ev-id="ev_8ef82e210d" className="flex flex-col items-center">
					<img data-ev-id="ev_ea008bc260" src={loginArt} alt="Vendor reliability analytics" className="w-full max-w-md rounded-xl" />
					<h1 data-ev-id="ev_bde5a76c86" className="mt-6 text-center text-2xl font-bold leading-snug">
						Score, rank & monitor every supplier in one place
					</h1>
					<p data-ev-id="ev_7a6bb079d3" className="mt-2 max-w-md text-center text-sm text-white/70">
						Real-time reliability scoring, procurement workflows, contract tracking and
						role-based analytics for a resilient supply chain.
					</p>
				</div>
				<p data-ev-id="ev_9f567c6a88" className="text-xs text-white/40">© 2024 VendorIQ · Infosys Internship Project</p>
			</div>

			<div data-ev-id="ev_28029e5e9d" className="flex w-full items-center justify-center p-6 lg:w-1/2">
				<form data-ev-id="ev_88b26be1a9" onSubmit={submit} className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
					<h2 data-ev-id="ev_4b3f9795e7" className="text-2xl font-bold text-gray-800">Welcome back</h2>
					<p data-ev-id="ev_9e39b03fb0" className="mt-1 text-sm text-muted-foreground">Sign in to your reliability workspace</p>

					<div data-ev-id="ev_c4c4f4c454" className="mt-6 flex flex-col gap-4">
						<label data-ev-id="ev_ae42b77bae" className="flex flex-col gap-1.5">
							<span data-ev-id="ev_eaae330d23" className="text-sm font-medium text-gray-700">Email</span>
							<input data-ev-id="ev_aede921fde"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />

						</label>
						<label data-ev-id="ev_cd7621e951" className="flex flex-col gap-1.5">
							<span data-ev-id="ev_3461239990" className="text-sm font-medium text-gray-700">Password</span>
							<input data-ev-id="ev_7fb9eb396c"
              type="password"
              defaultValue="demo1234"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />

						</label>
						<label data-ev-id="ev_c5eb8b6e4e" className="flex flex-col gap-1.5">
							<span data-ev-id="ev_71cbecadc1" className="text-sm font-medium text-gray-700">Sign in as (role)</span>
							<select data-ev-id="ev_575e2833bf"
              value={role}
              onChange={(e) => {
                const r = e.target.value as Role;
                setRole(r);
                setEmail(`${r === 'admin' ? 'admin' : r}@vendoriq.io`);
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">

								{ROLES.map((r) =>
                <option data-ev-id="ev_e966ce717f" key={r.id} value={r.role}>
										{r.label}
									</option>
                )}
							</select>
						</label>

						<button data-ev-id="ev_8c7d138bce"
            type="submit"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">

							<LogIn className="h-4 w-4" /> Sign In
						</button>
					</div>

					<p data-ev-id="ev_7385ee43ec" className="mt-5 text-center text-sm text-muted-foreground">
						No account?{' '}
						<Link to="/register" className="font-semibold text-primary hover:underline">
							Register
						</Link>
					</p>
				</form>
			</div>
		</div>);

}