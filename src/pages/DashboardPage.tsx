import React from 'react';
import { mockPackages, mockPallets, mockRobots, mockTasks, mockApprovals, mockAlerts, mockZones, dashboardStats } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package, DollarSign, ArrowDownToLine, ArrowUpFromLine,
  Bot, ClipboardCheck, BatteryLow, AlertTriangle, Activity, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color: string; sub?: string; onClick?: () => void }> = ({ icon: Icon, label, value, color, sub, onClick }) => (
  <div className={`bg-card rounded-lg border p-4 animate-fade-in ${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`} onClick={onClick}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2 rounded ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const STOCK_MOVEMENT_TREND = [
  { date: 'Mar 27', stockIn: 1800, stockOut: 1200 },
  { date: 'Mar 28', stockIn: 2200, stockOut: 1400 },
  { date: 'Mar 29', stockIn: 1600, stockOut: 1800 },
  { date: 'Mar 30', stockIn: 2420, stockOut: 1100 },
  { date: 'Mar 31', stockIn: 2100, stockOut: 1500 },
  { date: 'Apr 01', stockIn: 2350, stockOut: 1120 },
];

const formatCurrency = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const recentTasks = mockTasks.slice(0, 5);
  const recentAlerts = mockAlerts.slice(0, 4);
  const pendingApprovals = mockApprovals.filter(a => a.status === 'pending');

  const zoneCapacityData = mockZones.map((zone, index) => {
    const mockPercentages = [85, 72, 92, 60, 45];
    const percent = mockPercentages[index] ?? 50;
    return {
      name: zone.zoneName.split('—')[0].trim(),
      percent,
      barClass: percent >= 90 ? 'bg-red-600' : percent >= 70 ? 'bg-amber-500' : 'bg-green-600',
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.name} — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* === ADMIN: Pending Approvals Banner === */}
      {role === 'admin' && pendingApprovals.length > 0 && (
        <div className="p-4 bg-amber-50 border border-warning/20 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate('/approvals')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''} Require Your Review</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {pendingApprovals.filter(a => a.type === 'stock-out').length} stock-out requests, {pendingApprovals.filter(a => a.type === 'reorganization').length} reorganization, {pendingApprovals.filter(a => a.type === 'exception').length} exceptions
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-amber-700">Review Now →</span>
          </div>
        </div>
      )}

      {/* === ADMIN: Robot Alert Banner === */}
      {role === 'admin' && mockRobots.some(r => r.status === 'error' || r.batteryLevel < 20) && (
        <div className="p-4 bg-red-50 border border-destructive/20 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => navigate('/robots')}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-red-800">Robot Attention Required</p>
              <p className="text-xs text-red-700 mt-0.5">
                {mockRobots.filter(r => r.status === 'error').length} robot(s) in error state, {mockRobots.filter(r => r.batteryLevel < 20).length} with critical battery
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid — role-aware */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Common stats for all */}
        <StatCard icon={Package} label="Total Packages" value={dashboardStats.totalPackages} color="bg-navy-100 text-navy-700" />
        <StatCard icon={DollarSign} label="Total Stored Value" value={formatCurrency(dashboardStats.totalStoredValue)} color="bg-green-50 text-success" sub="Across all zones" />

        {/* Stock in/out */}
        <StatCard icon={ArrowDownToLine} label="Stock In Today" value={dashboardStats.stockInToday} color="bg-blue-50 text-info" onClick={() => navigate('/stock-in')} />
        <StatCard icon={ArrowUpFromLine} label="Stock Out Today" value={dashboardStats.stockOutToday} color="bg-amber-50 text-warning" onClick={() => navigate('/stock-out')} />

        {/* Admin: approvals, tasks, robot stats */}
        {role === 'admin' && (
          <>
            <StatCard icon={ClipboardCheck} label="Pending Approvals" value={dashboardStats.pendingApprovals} color="bg-orange-50 text-warning" onClick={() => navigate('/approvals')} />
            <StatCard icon={TrendingUp} label="Tasks Completed" value={mockTasks.filter(t => t.status === 'completed').length} color="bg-green-50 text-success" sub="Last 7 days" />
            <StatCard icon={Bot} label="Active Robot Tasks" value={dashboardStats.activeRobotTasks} color="bg-navy-100 text-navy-600" onClick={() => navigate('/robots')} />
            <StatCard icon={BatteryLow} label="Low Battery Alerts" value={dashboardStats.lowBatteryAlerts} color="bg-red-50 text-destructive" onClick={() => navigate('/robots')} />
          </>
        )}

        {/* Operator extras */}
        {role === 'operator' && (
          <>
            <StatCard icon={Bot} label="Active Robot Tasks" value={dashboardStats.activeRobotTasks} color="bg-navy-100 text-navy-600" />
            <StatCard icon={ClipboardCheck} label="Pending Approvals" value={dashboardStats.pendingApprovals} color="bg-orange-50 text-warning" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
          <div className="bg-card rounded-lg border p-4 md:p-5">
            <h3 className="text-2xl font-semibold uppercase tracking-wide text-foreground">Stock Movement Trend</h3>
            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STOCK_MOVEMENT_TREND} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(214, 30%, 86%)" vertical={true} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#5f6b7a' }} axisLine={{ stroke: '#2b3442' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#5f6b7a' }} axisLine={{ stroke: '#2b3442' }} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(30,58,95,0.04)' }}
                    contentStyle={{ borderRadius: 10, borderColor: 'hsl(214, 26%, 84%)', fontSize: 12 }}
                  />
                  <Bar dataKey="stockIn" fill="#1d2b52" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stockOut" fill="#a5afc1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4 md:p-5">
            <h3 className="text-2xl font-semibold uppercase tracking-wide text-foreground">Zone Capacity</h3>
            <div className="mt-5 space-y-4 px-1">
              {zoneCapacityData.map((zone) => (
                <div key={zone.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{zone.name}</span>
                    <span className="text-lg font-semibold text-slate-500">{zone.percent}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${zone.barClass}`} style={{ width: `${zone.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks — shown to all */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Robot Tasks</h3>
          </div>
          <div className="divide-y">
            {recentTasks.map(task => (
              <div key={task.taskId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{task.taskId} — {task.taskType.toUpperCase()}</p>
                  <p className="text-[10px] text-muted-foreground">{task.sourceLocation} → {task.targetLocation}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  task.status === 'completed' ? 'bg-green-50 text-success' :
                  task.status === 'in-progress' ? 'bg-blue-50 text-info' :
                  task.status === 'queued' ? 'bg-amber-50 text-warning' :
                  'bg-red-50 text-destructive'
                }`}>{task.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Active Alerts</h3>
          </div>
          <div className="divide-y">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.type === 'error' ? 'bg-destructive' :
                    alert.type === 'warning' ? 'bg-warning' : 'bg-info'
                  }`} />
                  <div>
                    <p className="text-xs font-medium">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{alert.message}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Robot Fleet — detailed for admin, overview for operator */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium flex items-center gap-2"><Bot className="w-4 h-4" /> Robot Fleet {role === 'admin' ? 'Status' : 'Overview'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          {mockRobots.map(robot => (
            <div key={robot.robotId} className={`p-4 ${role === 'admin' ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`} onClick={role === 'admin' ? () => navigate('/robots') : undefined}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{robot.robotId}{role === 'admin' ? ` — ${robot.model}` : ''}</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  robot.status === 'active' ? 'bg-green-50 text-success' :
                  robot.status === 'idle' ? 'bg-amber-50 text-warning' :
                  robot.status === 'error' ? 'bg-red-50 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>{robot.status}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Battery</span><span className={robot.batteryLevel < 20 ? 'text-destructive font-medium' : ''}>{robot.batteryLevel}%</span></div>
                <div className="w-full h-1.5 bg-muted rounded-full"><div className={`h-full rounded-full transition-all ${robot.batteryLevel < 20 ? 'bg-destructive' : robot.batteryLevel < 50 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${robot.batteryLevel}%` }} /></div>
                <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Temperature</span><span className={robot.temperature > 50 ? 'text-destructive font-medium' : ''}>{robot.temperature}°C</span></div>
                {role === 'admin' && (
                  <>
                    <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Load</span><span>{robot.currentLoadKg} / {robot.maxLoadKg} kg</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Speed</span><span>{robot.currentSpeed} m/s</span></div>
                  </>
                )}
                <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Tasks Done</span><span>{robot.totalTasksCompleted}</span></div>
                {role === 'admin' && robot.errorCode && <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Error</span><span className="text-destructive font-medium">{robot.errorCode}</span></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
