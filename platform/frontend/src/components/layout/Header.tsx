import { useAuth } from '../../context/AuthContext';
import { Code2, LogOut, LayoutDashboard, FolderOpen, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/editor', label: 'Editor', icon: Code2 },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderOpen },
  ];

  return (
    <header className="h-12 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4 select-none">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-white font-semibold text-sm">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <Code2 size={14} className="text-white" />
          </div>
          <span>Java AI</span>
        </Link>

        {isAuthenticated && (
          <nav className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-[#333] text-white'
                    : 'text-[#999] hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-2 text-xs text-[#999]">
              <User size={14} />
              <span>{user?.username}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#999] hover:text-white hover:bg-[#333] rounded transition-colors"
            >
              <LogOut size={14} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-1 text-xs text-[#999] hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
