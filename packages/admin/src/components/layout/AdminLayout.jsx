import AdminSidebar from './AdminSidebar';
import AdminTopbar  from './AdminTopbar';
import { Outlet }   from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="main-content">
        <AdminTopbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
