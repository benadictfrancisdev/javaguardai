import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { 
  Shield, LayoutDashboard, AlertTriangle, Play, Bell, LogOut, Key, Copy
} from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import Analyzer from './pages/Analyzer';
import Alerts from './pages/Alerts';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('fg_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const Sidebar = () => {
  const navigate = useNavigate();
  const customer = JSON.parse(localStorage.getItem('fg_customer') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_customer');
    navigate('/login');
  };

  const handleCopyApiKey = () => {
    if (customer.api_key) {
      navigator.clipboard.writeText(customer.api_key);
      toast.success('API key copied to clipboard');
    }
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
    { path: '/analyze', icon: Play, label: 'Analyzer' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-brand-card border-r border-zinc-800 z-50 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-green/20">
            <Shield className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h1 className="font-bold text-white">FrameworkGuard</h1>
            <p className="text-xs text-zinc-500">AI Monitoring</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-brand-green/10 text-brand-green' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`
            }
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* API Key */}
      <div className="p-3 border-t border-zinc-800">
        <div className="p-3 rounded-lg bg-zinc-900/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Key className="w-3 h-3" /> API Key
            </span>
            <button
              onClick={handleCopyApiKey}
              className="p-1 rounded hover:bg-zinc-800 transition-colors"
              data-testid="copy-api-key"
            >
              <Copy className="w-3 h-3 text-zinc-500 hover:text-brand-green" />
            </button>
          </div>
          <p className="text-xs font-mono text-zinc-400 truncate">
            {customer.api_key?.slice(0, 20)}...
          </p>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {customer.company_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{customer.company_name}</p>
            <p className="text-xs text-zinc-500 truncate">{customer.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};

const DashboardLayout = ({ children }) => (
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
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <DashboardLayout><Incidents /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze"
          element={
            <ProtectedRoute>
              <DashboardLayout><Analyzer /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <DashboardLayout><Alerts /></DashboardLayout>
            </ProtectedRoute>
          }
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
