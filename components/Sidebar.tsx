import React from 'react';
import { LayoutDashboard, ClipboardList, Syringe, Home, TestTube2, Settings, Users } from 'lucide-react';
import { translations, Language } from '../utils/helpers';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onSearch: (id: string) => void;
  language: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, language }) => {
  const t = translations[language].sidebar;

  const menuItems = [
    { id: 'HOME', label: t.home, icon: Home },
    { id: 'HERD', label: t.herd, icon: LayoutDashboard },
    { id: 'PROTOCOLS', label: t.protocols, icon: ClipboardList },
    { id: 'INSEMINATION', label: t.insemination, icon: TestTube2 },
    { id: 'REPORTS', label: t.reports, icon: Syringe },
  ];

  const rightItems = [
    { id: 'USERS', label: t.users, icon: Users },
    { id: 'SETTINGS', label: t.settings, icon: Settings },
  ]

  return (
    <header className="w-full bg-neutral-900 text-white flex items-center justify-between px-6 h-16 shadow-md z-50 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center font-display font-black text-white shadow-lg shadow-primary-900/20">
          DH
        </div>
        <h1 className="text-xl font-display font-bold tracking-tight text-white">
          DairyHerd
        </h1>
      </div>

      {/* Main Navigation */}
      <nav className="hidden md:flex items-center gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-2 border-l border-neutral-800 pl-4 ml-4">
        {rightItems.map((item) => {
           const Icon = item.icon;
           const isActive = currentView === item.id;
           return (
             <button
               key={item.id}
               onClick={() => onNavigate(item.id)}
               className={`p-2 rounded-full transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
               }`}
               title={item.label}
             >
               <Icon className="w-5 h-5" />
             </button>
           );
        })}
      </div>
    </header>
  );
};

export default Sidebar;