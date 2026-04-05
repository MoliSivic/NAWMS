import React, { useState } from 'react';
import { mockUsers as initialUsers, mockZones as initialZones, mockRobots as initialRobots } from '@/data/mockData';
import type { User, UserRole, Zone, ZoneSecurity, Robot } from '@/data/types';
import { Settings, Users, Map, Bot, Shield, Printer, ScanLine, Server, Plus, X, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Section: React.FC<{ title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }> = ({ title, icon: Icon, action, children }) => (
  <div className="bg-card rounded-lg border p-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

// ─── User Management ───
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', employeeId: '', role: 'operator' as UserRole, email: '', password: '' });

  const resetForm = () => { setForm({ name: '', employeeId: '', role: 'operator', email: '', password: '' }); setShowForm(false); setEditingId(null); };

  const handleSave = () => {
    if (!form.name || !form.employeeId || !form.email) return;
    if (editingId) {
      setUsers(prev => prev.map(u => u.userId === editingId ? { ...u, name: form.name, employeeId: form.employeeId, role: form.role, email: form.email } : u));
    } else {
      const newUser: User = { userId: `USR-${String(users.length + 1).padStart(3, '0')}`, name: form.name, employeeId: form.employeeId, role: form.role, email: form.email, isActive: true, lastLogin: '' };
      setUsers(prev => [...prev, newUser]);
    }
    resetForm();
  };

  const startEdit = (u: User) => {
    setForm({ name: u.name, employeeId: u.employeeId, role: u.role, email: u.email, password: '' });
    setEditingId(u.userId);
    setShowForm(true);
  };

  const toggleActive = (id: string) => {
    setUsers(prev => prev.map(u => u.userId === id ? { ...u, isActive: !u.isActive } : u));
  };

  return (
    <Section title="User Management" icon={Users} action={<Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-3 h-3 mr-1" /> Add User</Button>}>
      {showForm && (
        <div className="mb-4 p-3 bg-muted rounded space-y-2 animate-fade-in">
          <p className="text-xs font-medium">{editingId ? 'Edit User' : 'New User'}</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name" className="px-2 py-1.5 border rounded text-xs bg-background" />
            <input value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="Employee ID (e.g. EMP-0050)" className="px-2 py-1.5 border rounded text-xs bg-background" />
            <Select value={form.role} onValueChange={(v: UserRole) => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="px-2 py-1.5 border rounded text-xs bg-background" />
            {!editingId && <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="Initial Password" className="px-2 py-1.5 border rounded text-xs bg-background" />}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm}><X className="w-3 h-3 mr-1" /> Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.name || !form.employeeId || !form.email}><Check className="w-3 h-3 mr-1" /> {editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      )}
      <table className="w-full text-xs">
        <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground">Name</th><th className="text-left py-2 text-muted-foreground">Employee ID</th><th className="text-left py-2 text-muted-foreground">Role</th><th className="text-left py-2 text-muted-foreground">Email</th><th className="text-left py-2 text-muted-foreground">Status</th><th className="w-20"></th></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.userId} className="border-b hover:bg-muted/30">
            <td className="py-2">{u.name}</td>
            <td className="py-2 font-mono">{u.employeeId}</td>
            <td className="py-2 capitalize">{u.role}</td>
            <td className="py-2 text-muted-foreground">{u.email}</td>
            <td className="py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
            <td className="py-2 flex gap-1">
              <button onClick={() => startEdit(u)} className="p-1 hover:bg-muted rounded" title="Edit"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => toggleActive(u.userId)} className="p-1 hover:bg-muted rounded" title={u.isActive ? 'Deactivate' : 'Activate'}>
                {u.isActive ? <X className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-success" />}
              </button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">User accounts cannot be permanently deleted to preserve audit trail integrity.</p>
    </Section>
  );
};

// ─── Zone Configuration ───
const ZoneConfiguration: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ zoneName: '', securityClass: 'medium' as ZoneSecurity, maxCapacity: 10, allowedTypes: '' });

  const resetForm = () => { setForm({ zoneName: '', securityClass: 'medium', maxCapacity: 10, allowedTypes: '' }); setShowForm(false); setEditingId(null); };

  const handleSave = () => {
    if (!form.zoneName) return;
    if (editingId) {
      setZones(prev => prev.map(z => z.zoneId === editingId ? { ...z, zoneName: form.zoneName, securityClass: form.securityClass, maxCapacity: form.maxCapacity, allowedTypes: form.allowedTypes } : z));
    } else {
      const id = `ZONE-${String.fromCharCode(65 + zones.length)}`;
      setZones(prev => [...prev, { zoneId: id, zoneName: form.zoneName, securityClass: form.securityClass, maxCapacity: form.maxCapacity, allowedTypes: form.allowedTypes, shelfCount: 0, color: '#4a7fb5' }]);
    }
    resetForm();
  };

  const startEdit = (z: Zone) => {
    setForm({ zoneName: z.zoneName, securityClass: z.securityClass, maxCapacity: z.maxCapacity, allowedTypes: z.allowedTypes });
    setEditingId(z.zoneId);
    setShowForm(true);
  };

  return (
    <Section title="Zone Configuration" icon={Map} action={<Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-3 h-3 mr-1" /> Add Zone</Button>}>
      {showForm && (
        <div className="mb-4 p-3 bg-muted rounded space-y-2 animate-fade-in">
          <p className="text-xs font-medium">{editingId ? 'Edit Zone' : 'New Zone'}</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.zoneName} onChange={e => setForm(f => ({ ...f, zoneName: e.target.value }))} placeholder="Zone Name" className="px-2 py-1.5 border rounded text-xs bg-background" />
            <Select value={form.securityClass} onValueChange={(v: ZoneSecurity) => setForm(f => ({ ...f, securityClass: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Value</SelectItem>
                <SelectItem value="medium">Medium Value</SelectItem>
                <SelectItem value="low">Low Value</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <input type="number" value={form.maxCapacity} onChange={e => setForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))} placeholder="Max Shelves" className="px-2 py-1.5 border rounded text-xs bg-background" />
            <input value={form.allowedTypes} onChange={e => setForm(f => ({ ...f, allowedTypes: e.target.value }))} placeholder="Allowed Types (e.g. USD, KHR)" className="px-2 py-1.5 border rounded text-xs bg-background" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm}><X className="w-3 h-3 mr-1" /> Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.zoneName}><Check className="w-3 h-3 mr-1" /> {editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {zones.map(z => (
          <div key={z.zoneId} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: z.color }} />
              <div>
                <span className="font-medium">{z.zoneName}</span>
                <span className="text-muted-foreground ml-2">({z.allowedTypes})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground capitalize">{z.securityClass} security — {z.maxCapacity} shelves max</span>
              <button onClick={() => startEdit(z)} className="p-1 hover:bg-background rounded"><Pencil className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

// ─── Robot Configuration ───
const RobotConfiguration: React.FC = () => {
  const [robots, setRobots] = useState(initialRobots);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ robotId: '', model: '', maxLoadKg: 500, commEndpoint: '', lowBatteryAlert: 20, maxTemp: 50, speedLimit: 2.0 });

  const resetForm = () => { setForm({ robotId: '', model: '', maxLoadKg: 500, commEndpoint: '', lowBatteryAlert: 20, maxTemp: 50, speedLimit: 2.0 }); setShowForm(false); setEditingId(null); };

  const handleSave = () => {
    if (!form.model || !form.commEndpoint) return;
    if (editingId) {
      setRobots(prev => prev.map(r => r.robotId === editingId ? { ...r, model: form.model, maxLoadKg: form.maxLoadKg, commEndpoint: form.commEndpoint } : r));
    } else {
      const newRobot: Robot = {
        robotId: form.robotId || `ROB-${String(robots.length + 1).padStart(3, '0')}`,
        model: form.model, maxLoadKg: form.maxLoadKg, batteryLevel: 100, currentSpeed: 0, currentLoadKg: 0,
        temperature: 35, locationX: 0, locationY: 0, status: 'idle', errorCode: null, idleTimeSec: 0,
        commEndpoint: form.commEndpoint, lastMaintenance: new Date().toISOString(), totalTasksCompleted: 0,
      };
      setRobots(prev => [...prev, newRobot]);
    }
    resetForm();
  };

  const startEdit = (r: Robot) => {
    setForm({ robotId: r.robotId, model: r.model, maxLoadKg: r.maxLoadKg, commEndpoint: r.commEndpoint, lowBatteryAlert: 20, maxTemp: 50, speedLimit: 2.0 });
    setEditingId(r.robotId);
    setShowForm(true);
  };

  const decommission = (id: string) => {
    setRobots(prev => prev.map(r => r.robotId === id ? { ...r, status: r.status === 'decommissioned' ? 'idle' as const : 'decommissioned' as const } : r));
  };

  return (
    <Section title="Robot Configuration" icon={Bot} action={<Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-3 h-3 mr-1" /> Register Robot</Button>}>
      {showForm && (
        <div className="mb-4 p-3 bg-muted rounded space-y-2 animate-fade-in">
          <p className="text-xs font-medium">{editingId ? 'Edit Robot' : 'Register New Robot'}</p>
          <div className="grid grid-cols-2 gap-2">
            {!editingId && <input value={form.robotId} onChange={e => setForm(f => ({ ...f, robotId: e.target.value }))} placeholder="Robot ID (e.g. ROB-004)" className="px-2 py-1.5 border rounded text-xs bg-background" />}
            <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Model Name" className="px-2 py-1.5 border rounded text-xs bg-background" />
            <input type="number" value={form.maxLoadKg} onChange={e => setForm(f => ({ ...f, maxLoadKg: Number(e.target.value) }))} placeholder="Max Load (kg)" className="px-2 py-1.5 border rounded text-xs bg-background" />
            <input value={form.commEndpoint} onChange={e => setForm(f => ({ ...f, commEndpoint: e.target.value }))} placeholder="Comm Endpoint (e.g. ws://robot.local:8080)" className="px-2 py-1.5 border rounded text-xs bg-background col-span-2" />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-2">Operating Thresholds</p>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-[10px] text-muted-foreground">Low Battery Alert (%)</label><input type="number" value={form.lowBatteryAlert} onChange={e => setForm(f => ({ ...f, lowBatteryAlert: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-xs bg-background" /></div>
            <div><label className="block text-[10px] text-muted-foreground">Max Temperature (°C)</label><input type="number" value={form.maxTemp} onChange={e => setForm(f => ({ ...f, maxTemp: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-xs bg-background" /></div>
            <div><label className="block text-[10px] text-muted-foreground">Speed Limit (m/s)</label><input type="number" step="0.1" value={form.speedLimit} onChange={e => setForm(f => ({ ...f, speedLimit: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-xs bg-background" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm}><X className="w-3 h-3 mr-1" /> Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.model || !form.commEndpoint}><Check className="w-3 h-3 mr-1" /> {editingId ? 'Update' : 'Register'}</Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {robots.map(r => (
          <div key={r.robotId} className={`flex items-center justify-between p-2 bg-muted rounded text-xs ${r.status === 'decommissioned' ? 'opacity-50' : ''}`}>
            <div>
              <span className="font-mono font-medium">{r.robotId}</span>
              <span className="ml-2 text-muted-foreground">{r.model}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Max {r.maxLoadKg}kg</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${r.status === 'active' ? 'bg-green-50 text-green-700' : r.status === 'decommissioned' ? 'bg-red-50 text-red-700' : 'bg-muted text-muted-foreground'}`}>{r.status}</span>
              <button onClick={() => startEdit(r)} className="p-1 hover:bg-background rounded"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => decommission(r.robotId)} className="p-1 hover:bg-background rounded" title={r.status === 'decommissioned' ? 'Reactivate' : 'Decommission'}>
                {r.status === 'decommissioned' ? <Check className="w-3 h-3 text-success" /> : <X className="w-3 h-3 text-destructive" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

const SettingsPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /><h1 className="text-xl font-semibold">Settings & Administration</h1></div>

    <UserManagement />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ZoneConfiguration />
      <RobotConfiguration />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section title="Device Status" icon={ScanLine}>
        <div className="space-y-2 text-xs">
          {[
            { name: 'QR Scanner (USB HID)', icon: ScanLine, status: 'Connected', ok: true },
            { name: 'Label Printer (Network)', icon: Printer, status: 'Online', ok: true },
            { name: 'Local Server', icon: Server, status: 'Running', ok: true },
          ].map(d => (
            <div key={d.name} className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2"><d.icon className="w-3 h-3" /><span>{d.name}</span></div>
              <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${d.ok ? 'bg-success' : 'bg-destructive'}`} /><span className={d.ok ? 'text-success' : 'text-destructive'}>{d.status}</span></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Security & Access" icon={Shield}>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">Session Timeout</span><span>30 minutes</span></div>
          <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">Password Policy</span><span>Complex, 90-day rotation</span></div>
          <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">Encryption</span><span>TLS 1.3 / AES-256</span></div>
          <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">Deployment</span><span>Local Server (Hybrid-Ready)</span></div>
          <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">Backup Schedule</span><span>Daily 23:00, Encrypted</span></div>
        </div>
      </Section>
    </div>
  </div>
);
export default SettingsPage;
