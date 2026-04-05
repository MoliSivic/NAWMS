import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { mockAlerts } from '@/data/mockData';
import { useTheme } from '@/contexts/ThemeContext';

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const unackAlerts = mockAlerts.filter(a => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Top bar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search packages, pallets, tasks..."
                className="pl-8 pr-3 py-2 bg-muted rounded text-xs w-64 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="relative">
              <Bell className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              {unackAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unackAlerts}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{user?.role}</p>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
