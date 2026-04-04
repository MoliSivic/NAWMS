import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/data/types';
import BrandLockup from '@/components/BrandLockup';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const roles: { role: UserRole; label: string; desc: string }[] = [
  { role: 'admin', label: 'Administrator', desc: 'Full system access, configuration, user management' },
  { role: 'operator', label: 'Operator', desc: 'Stock in/out, scanning, warehouse operations' },
  { role: 'supervisor', label: 'Supervisor', desc: 'Approvals, review, reports oversight' },
  { role: 'technician', label: 'Robot Technician', desc: 'Robot monitoring, maintenance, diagnostics' },
];

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) login(selectedRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 70px)',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="text-center mb-8">
          <BrandLockup variant="hero" />
          <div className="inline-block mt-3 px-3 py-1 bg-navy-800 border border-navy-600 rounded text-xs text-navy-300 tracking-wider uppercase">
            Internal Use Only — Authorized Personnel
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-lg p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="EMP-0001"
                className="w-full px-3 py-2 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Demo Role Selection</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    className={`p-3 rounded border text-left transition-all duration-200 ${
                      selectedRole === r.role
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-navy-300 hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-semibold">{r.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!selectedRole}
              className="w-full bg-primary hover:bg-navy-600 text-primary-foreground"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-[10px] text-muted-foreground">
              National Bank of Cambodia — Confidential System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
