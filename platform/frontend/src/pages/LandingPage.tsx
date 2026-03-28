import { Link } from 'react-router-dom';
import { Code2, Bot, Shield, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const features = [
    { icon: Code2, title: 'Smart Code Editor', desc: 'VS Code-like editor with syntax highlighting and error markers powered by Monaco Editor' },
    { icon: Bot, title: 'AI Debugging', desc: 'Get instant error explanations and AI-generated fixes for your Java code' },
    { icon: Shield, title: 'Secure Sandbox', desc: 'Execute Java code safely in an isolated sandbox environment' },
    { icon: Zap, title: 'Real-time Feedback', desc: 'See compilation and runtime results instantly with detailed error analysis' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track your coding progress, error patterns, and resolution rates' },
  ];

  return (
    <div className="flex-1 bg-[#1e1e1e] overflow-auto">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
          <Bot size={14} className="text-blue-400" />
          <span className="text-xs text-blue-400">Powered by AI</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Intelligent Java
          <br />
          <span className="text-blue-400">Debugging & Analysis</span>
        </h1>

        <p className="text-base text-[#999] max-w-xl mx-auto mb-8">
          Paste or upload your Java code, get instant AI-powered error detection,
          explanations, and code fixes. Debug smarter, not harder.
        </p>

        <div className="flex items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/editor"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              Open Editor
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                Get Started
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#252526] rounded-lg p-5 border border-[#333] hover:border-[#555] transition-colors">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
                <Icon size={20} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
              <p className="text-xs text-[#999] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#333] py-6">
        <p className="text-center text-xs text-[#666]">
          Java AI Platform &mdash; Built with React, Node.js, and AI
        </p>
      </div>
    </div>
  );
}
