import { Navigate, Outlet } from 'react-router';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useApp } from '@/context/AppContext';

export default function AppShell() {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div data-ev-id="ev_2fbe30021c" className="flex min-h-screen bg-canvas">
			<Sidebar />
			<div data-ev-id="ev_14cea8185b" className="flex min-w-0 flex-1 flex-col">
				<Topbar />
				<main data-ev-id="ev_7b9e1b38e4" className="flex-1 p-4 md:p-6">
					<Outlet />
				</main>
			</div>
		</div>);

}