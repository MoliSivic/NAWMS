import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import BrandLockup from '@/components/BrandLockup';
import BrandLogo from '@/components/BrandLogo';
import {
  LayoutDashboard, PackagePlus, PackageMinus, Map, Box, Boxes,
  Bot, Lightbulb, ClipboardCheck, FileText, BarChart3, Settings,
  LogOut, ChevronLeft, ChevronRight, Cuboid
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'operator', 'supervisor', 'technician'] },
  { path: '/stock-in', label: 'Stock In', icon: PackagePlus, roles: ['admin', 'operator'] },
  { path: '/stock-out', label: 'Stock Out', icon: PackageMinus, roles: ['admin', 'operator'] },
  { path: '/warehouse-map', label: 'Warehouse Map', icon: Map, roles: ['admin', 'operator', 'supervisor'] },
  { path: '/shelf-3d', label: '3D Shelf View', icon: Cuboid, roles: ['admin', 'operator', 'supervisor'] },
  { path: '/inventory', label: 'Inventory Registry', icon: Box, roles: ['admin', 'operator', 'supervisor'] },
  { path: '/pallets', label: 'Pallet Management', icon: Boxes, roles: ['admin', 'operator', 'supervisor'] },
  { path: '/robots', label: 'Robot Monitoring', icon: Bot, roles: ['admin', 'technician', 'operator'] },
  { path: '/optimization', label: 'Optimization', icon: Lightbulb, roles: ['admin', 'supervisor'] },
  { path: '/approvals', label: 'Approval Queue', icon: ClipboardCheck, roles: ['admin', 'supervisor'] },
  { path: '/audit', label: 'Audit Log', icon: FileText, roles: ['admin', 'supervisor'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'supervisor'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`border-b border-sidebar-border ${collapsed ? 'h-16 px-3 flex items-center justify-center' : 'h-20 px-4 flex items-center'}`}>
        {collapsed ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-sidebar-accent to-sidebar-background shadow-[0_12px_30px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/5">
            <BrandLogo imageClassName="h-8 w-8" />
          </div>
        ) : (
          <BrandLockup variant="sidebar" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {filteredItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-200 mb-0.5 group ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sidebar-primary' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Toggle */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase">{user.role}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={onToggle} className="p-2 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors" title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {!collapsed && (
            <button onClick={logout} className="flex items-center gap-2 p-2 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors text-xs">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
