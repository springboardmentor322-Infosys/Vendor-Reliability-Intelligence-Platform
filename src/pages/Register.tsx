import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ROLES } from '@/data/mock';
import type { Role } from '@/data/types';

export default function Register() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('vendor');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
    navigate('/dashboard');
  };

  return (
    <div data-ev-id="ev_1cbe3ede4b" className="flex min-h-screen items-center justify-center bg-canvas p-6">
			<form data-ev-id="ev_4383b1b9aa" onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
				<div data-ev-id="ev_f42f64fe72" className="mb-6 flex items-center gap-3">
					<div data-ev-id="ev_0e704aa3ad" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
						<ShieldCheck className="h-6 w-6" />
					</div>
					<div data-ev-id="ev_160263efc2">
						<p data-ev-id="ev_7c8523ce90" className="text-lg font-bold text-gray-800">Create your account</p>
						<p data-ev-id="ev_f9952b5fd2" className="text-xs text-muted-foreground">Join the VendorIQ platform</p>
					</div>
				</div>

				<div data-ev-id="ev_f1ad481d6a" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<label data-ev-id="ev_81828873c5" className="flex flex-col gap-1.5 sm:col-span-2">
						<span data-ev-id="ev_72cc46c16a" className="text-sm font-medium text-gray-700">Full name / Company</span>
						<input data-ev-id="ev_02f06bab0d" required className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
					</label>
					<label data-ev-id="ev_0f3d443dff" className="flex flex-col gap-1.5">
						<span data-ev-id="ev_79c50574b3" className="text-sm font-medium text-gray-700">Email</span>
						<input data-ev-id="ev_ffac3899bd" required type="email" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
					</label>
					<label data-ev-id="ev_8e6bd2b462" className="flex flex-col gap-1.5">
						<span data-ev-id="ev_a8b89d3fb4" className="text-sm font-medium text-gray-700">Password</span>
						<input data-ev-id="ev_4d7364d7b0" required type="password" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
					</label>
					<label data-ev-id="ev_d5c35a4fd7" className="flex flex-col gap-1.5 sm:col-span-2">
						<span data-ev-id="ev_5cdf277cef" className="text-sm font-medium text-gray-700">Register as</span>
						<select data-ev-id="ev_9fff44375e" value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
							{ROLES.map((r) =>
              <option data-ev-id="ev_909b7c0268" key={r.id} value={r.role}>{r.label}</option>
              )}
						</select>
					</label>
				</div>

				<button data-ev-id="ev_96e5bcd7e8" type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
					<UserPlus className="h-4 w-4" /> Create Account
				</button>
				<p data-ev-id="ev_4dc72b48a1" className="mt-5 text-center text-sm text-muted-foreground">
					Already have an account?{' '}
					<Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
				</p>
			</form>
		</div>);

}