import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Shield, LayoutDashboard } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ErrorDetail from './pages/ErrorDetail';
import './App.css';

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-brand-card border-r border-zinc-800 z-50 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-green/20">
            <Shield className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-bold text-white">JavaGuard AI</h1>
            <p className="text-xs text-zinc-500">Error Analysis Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-green/10 text-brand-green'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`
          }
          data-testid="nav-dashboard"
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </NavLink>
      </nav>
    </aside>
  );
};

const AppLayout = ({ children }) => (
  <div className="min-h-screen bg-brand-dark">
    <Sidebar />
    <main className="pl-64">
      <div className="p-6 lg:p-8">{children}</div>
    </main>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/dashboard"
          element={<AppLayout><Dashboard /></AppLayout>}
        />
        <Route
          path="/errors/:id"
          element={<AppLayout><ErrorDetail /></AppLayout>}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111620',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
