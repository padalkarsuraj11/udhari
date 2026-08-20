import ClientSidebar from './ClientSidebar';
import ClientTopbar  from './ClientTopbar';
import { Outlet }    from 'react-router-dom';

export default function ClientLayout() {
  return (
    <div className="app-layout">
      <ClientSidebar />
      <div className="main-content">
        <ClientTopbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
