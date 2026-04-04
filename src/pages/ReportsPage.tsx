import React, { useState } from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockPallets, mockRobots, mockPackages, mockZones, mockTasks, mockOptimizations, mockShelfLocations } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

const stockData = [
  { day: 'Mon', stockIn: 12, stockOut: 8 }, { day: 'Tue', stockIn: 15, stockOut: 10 },
  { day: 'Wed', stockIn: 8, stockOut: 12 }, { day: 'Thu', stockIn: 20, stockOut: 5 },
  { day: 'Fri', stockIn: 10, stockOut: 14 }, { day: 'Sat', stockIn: 3, stockOut: 2 },
  { day: 'Sun', stockIn: 0, stockOut: 0 },
];

const batteryData = mockRobots.map(r => ({ name: r.robotId, battery: r.batteryLevel, tasks: r.totalTasksCompleted }));
const energyData = mockRobots.map(r => ({
  name: r.robotId,
  avgConsumption: Math.round(100 - r.batteryLevel + Math.random() * 20),
  operatingHours: Math.round(r.totalTasksCompleted * 0.12),
  idleHours: Math.round(r.idleTimeSec / 3600 + Math.random() * 5),
}));

const zoneValue = mockZones.map(z => ({
  name: z.zoneName.split('—')[0].trim(),
  value: mockPackages.filter(p => {
    const pallet = mockPallets.find(pp => pp.palletId === p.palletId);
    return pallet?.zoneId === z.zoneId;
  }).reduce((s, p) => s + p.totalValue, 0) / 1e6,
}));

const shelfUtilization = mockZones.map(z => {
  const locations = mockShelfLocations.filter(l => l.zoneId === z.zoneId);
  const occupied = locations.filter(l => !l.isAvailable).length;
  return { name: z.zoneName.split('—')[0].trim(), occupied, total: locations.length, percent: Math.round((occupied / locations.length) * 100) };
});

const dailySummary = [
  { metric: 'Total Packages In', value: '2' },
  { metric: 'Total Packages Out', value: '1' },
  { metric: 'Active Robots', value: String(mockRobots.filter(r => r.status === 'active').length) },
  { metric: 'Tasks Completed Today', value: String(mockTasks.filter(t => t.status === 'completed').length) },
  { metric: 'Pending Approvals', value: String(mockOptimizations.filter(o => o.status === 'pending').length + 3) },
  { metric: 'Robot Errors', value: String(mockRobots.filter(r => r.status === 'error').length) },
  { metric: 'Optimization Suggestions', value: String(mockOptimizations.length) },
  { metric: 'Total Stored Value', value: `${(mockPackages.reduce((s, p) => s + p.totalValue, 0) / 1e6).toFixed(1)}M` },
];

type ReportType = 'stock-level' | 'movement' | 'reorganization' | 'robot-performance' | 'robot-energy' | 'shelf-utilization' | 'daily-summary';

const reportTabs: { key: ReportType; label: string; technicianOnly?: boolean }[] = [
  { key: 'stock-level', label: 'Stock Level Summary' },
  { key: 'movement', label: 'Stock Movement History' },
  { key: 'reorganization', label: 'Reorganization Log' },
  { key: 'robot-performance', label: 'Robot Performance' },
  { key: 'robot-energy', label: 'Robot Energy Usage' },
  { key: 'shelf-utilization', label: 'Shelf Utilization' },
  { key: 'daily-summary', label: 'Daily Summary' },
];

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<ReportType>('stock-level');
  const [dateFrom, setDateFrom] = useState('2026-03-28');
  const [dateTo, setDateTo] = useState('2026-04-04');
  const [zoneFilter, setZoneFilter] = useState('all');

  // Technician can only see robot reports
  const availableTabs = user?.role === 'technician'
    ? reportTabs.filter(t => t.key === 'robot-performance' || t.key === 'robot-energy')
    : reportTabs;

  const handleExport = () => {
    alert('Report exported to PDF (mock). In production, this generates a downloadable PDF file.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /><h1 className="text-xl font-semibold">Reports</h1></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}><Download className="w-3 h-3 mr-1" /> Export PDF</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-3 h-3 mr-1" /> Print</Button>
        </div>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-2 flex-wrap">
        {availableTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded border text-xs font-medium ${tab === t.key ? 'border-primary bg-primary/5' : 'border-border'}`}>{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1 uppercase">Date From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1.5 border rounded text-xs bg-background" />
        </div>
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1 uppercase">Date To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1.5 border rounded text-xs bg-background" />
        </div>
        {!tab.startsWith('robot') && tab !== 'daily-summary' && (
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1 uppercase">Zone</label>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {mockZones.map(z => <SelectItem key={z.zoneId} value={z.zoneId}>{z.zoneName.split('—')[0].trim()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Report content */}
      <div className="bg-card rounded-lg border p-6">
        {tab === 'stock-level' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Stock Level Summary — Stored Value by Zone (Millions)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneValue}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#2d5a87" name="Value (M)" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {mockZones.map(z => {
                const pkgs = mockPackages.filter(p => mockPallets.find(pp => pp.palletId === p.palletId)?.zoneId === z.zoneId);
                return (
                  <div key={z.zoneId} className="p-3 bg-muted rounded text-xs">
                    <p className="font-medium">{z.zoneName.split('—')[0].trim()}</p>
                    <p className="text-muted-foreground mt-1">{pkgs.length} packages</p>
                    <p className="text-muted-foreground">{(pkgs.reduce((s, p) => s + p.totalValue, 0)).toLocaleString()} total value</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'movement' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Stock Movement History — Weekly</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="stockIn" fill="#1e3a5f" name="Stock In" radius={[4, 4, 0, 0]} /><Bar dataKey="stockOut" fill="#6b9fd4" name="Stock Out" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'reorganization' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Stock Reorganization Log</h3>
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Target</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              </tr></thead>
              <tbody>
                {mockOptimizations.map(o => (
                  <tr key={o.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono">{o.id}</td>
                    <td className="p-3">{o.title}</td>
                    <td className="p-3 font-mono">{o.sourcePallet} ({o.sourceLocation})</td>
                    <td className="p-3 font-mono">{o.targetPallet} ({o.targetLocation})</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${o.status === 'approved' ? 'bg-green-50 text-green-700' : o.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{o.status}</span></td>
                    <td className="p-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'robot-performance' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Robot Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batteryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="battery" fill="#16a34a" name="Battery %" radius={[4, 4, 0, 0]} /><Bar dataKey="tasks" fill="#1e3a5f" name="Tasks Completed" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {mockRobots.map(r => (
                <div key={r.robotId} className="p-3 bg-muted rounded text-xs space-y-1">
                  <p className="font-medium">{r.robotId} — {r.model}</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{r.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Battery</span><span>{r.batteryLevel}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tasks Completed</span><span>{r.totalTasksCompleted}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Max Load</span><span>{r.maxLoadKg} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Maintenance</span><span>{new Date(r.lastMaintenance).toLocaleDateString()}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'robot-energy' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Robot Energy Usage Report</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={energyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="avgConsumption" fill="#dc2626" name="Avg Consumption %" radius={[4, 4, 0, 0]} /><Bar dataKey="operatingHours" fill="#16a34a" name="Operating Hours" radius={[4, 4, 0, 0]} /><Bar dataKey="idleHours" fill="#f59e0b" name="Idle Hours" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'shelf-utilization' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Shelf Utilization Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shelfUtilization}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="percent" fill="#2d5a87" name="Utilization %" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {shelfUtilization.map(s => (
                <div key={s.name} className="p-3 bg-muted rounded text-xs">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-muted-foreground mt-1">{s.occupied} / {s.total} slots occupied</p>
                  <div className="mt-2 w-full h-2 bg-background rounded-full"><div className={`h-full rounded-full ${s.percent >= 80 ? 'bg-destructive' : s.percent >= 50 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${s.percent}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-medium mb-2">Pallet Occupancy Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mockPallets.filter(p => p.status === 'in-use').map(p => {
                  const fill = p.currentPackageCount / p.maxCapacity;
                  return (
                    <div key={p.palletId} className="p-3 bg-muted rounded text-xs">
                      <p className="font-mono font-medium">{p.palletId}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{p.locationCode}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-background rounded-full"><div className={`h-full rounded-full ${fill >= 0.9 ? 'bg-success' : fill >= 0.5 ? 'bg-info' : fill >= 0.25 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${fill * 100}%` }} /></div>
                        <span>{Math.round(fill * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'daily-summary' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Daily Operational Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dailySummary.map(d => (
                <div key={d.metric} className="p-4 bg-muted rounded text-center">
                  <p className="text-2xl font-semibold">{d.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.metric}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ReportsPage;
