import { type ReactNode } from 'react';
import { AppProvider } from '@/context/AppContext';

/**
 * App-wide providers. AppProvider holds all VendorIQ state
 * (auth/role, vendors, POs, contracts, performance, messages, notifications).
 */
export function AppProviders({ children }: { children: ReactNode }) {
	return <AppProvider>{children}</AppProvider>;
}
