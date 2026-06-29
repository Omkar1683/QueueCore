import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SocketProvider } from '../../context/SocketContext';

export default function Layout() {
  return (
    <SocketProvider>
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
