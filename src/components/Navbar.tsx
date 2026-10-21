import React, { useState } from 'react';
import { 
  ShieldCheck, 
  PlusCircle, 
  Wrench, 
  Search, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  Database,
  ArrowRightLeft,
  ChevronDown,
  Layers
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onOpenRegisterItem: () => void;
  onLogout: () => void;
  onSwitchUser: (email: string) => void;
  activeView: 'explorer' | 'knowledge_base';
  setActiveView: (view: 'explorer' | 'knowledge_base') => void;
  onSelectDemoItem: () => void;
  dbStatus: { engine: string; details: string; status: string } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onOpenRegisterItem,
  onLogout,
  onSwitchUser,
  activeView,
  setActiveView,
  onSelectDemoItem,
  dbStatus
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const demoAccounts = [
    { name: 'Admin Inspector', email: 'admin@lifecycle.com', role: 'admin', desc: 'Can verify provenance & audit' },
    { name: 'Alice Walker', email: 'alice@example.com', role: 'user', desc: '1st Owner of Demo MacBook' },
    { name: 'Bob Miller', email: 'bob@example.com', role: 'user', desc: '2nd Owner (Repaired battery)' },
    { name: 'Charlie Davis', email: 'charlie@example.com', role: 'user', desc: 'Current Owner (Listed for sale)' },
    { name: 'Diana Evans', email: 'diana@example.com', role: 'user', desc: 'Owner of Leica M10 Rangefinder' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top micro banner showing DB engine status */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-white">Database Engine:</span>
          <span className="text-emerald-400 font-mono">
            {dbStatus?.engine || 'MySQL 8 (mysql2)'}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            • Strict Atomic Transactions (BEGIN/COMMIT/ROLLBACK)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onSelectDemoItem}
            className="text-xs text-blue-300 hover:text-white underline cursor-pointer font-medium"
          >
            ⭐ View Multi-Owner Demo Item (MacBook Pro M1 Max)
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveView('explorer')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
                Lifecycle<span className="text-blue-600">Ledger</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200">
                Item Carfax
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-none">Second-Hand Provenance & Condition Registry</p>
          </div>
        </div>

        {/* View switcher navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('explorer')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeView === 'explorer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Registry & Marketplace
          </button>
          <button
            onClick={() => setActiveView('knowledge_base')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeView === 'knowledge_base'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Repair Knowledge Base
          </button>
        </nav>

        {/* Actions & User profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenRegisterItem}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Item</span>
          </button>

          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    {currentUser.role === 'admin' ? '🛡️ Admin Inspector' : '👤 User'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 text-xs"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-medium text-slate-900">{currentUser.fullName}</p>
                    <p className="text-slate-500 text-[11px] truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                      Role: {currentUser.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
                      <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                      <span>Switch Demo Actor:</span>
                    </div>
                    <div className="space-y-1">
                      {demoAccounts.map((demo) => (
                        <button
                          key={demo.email}
                          onClick={() => onSwitchUser(demo.email)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg transition text-[11px] flex items-center justify-between ${
                            currentUser.email === demo.email 
                              ? 'bg-blue-600 text-white font-semibold' 
                              : 'hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <div>
                            <div>{demo.name}</div>
                            <div className={`text-[10px] ${currentUser.email === demo.email ? 'text-blue-100' : 'text-slate-500'}`}>
                              {demo.desc}
                            </div>
                          </div>
                          <span className={`text-[9px] uppercase px-1 py-0.5 rounded ${
                            currentUser.email === demo.email ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {demo.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 text-xs font-semibold transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Demo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
