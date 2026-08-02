import { Outlet } from 'react-router-dom'
import RoleSidebar from './RoleSidebar'
import '../dashboard-admin.css'

export default function AppLayout() {
  return (
    <div className="dashboard-admin-shell page-enter">
      <RoleSidebar />
      <Outlet />
    </div>
  )
}
