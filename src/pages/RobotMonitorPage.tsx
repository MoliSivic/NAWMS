import React, { useState, useEffect } from 'react';
import { mockRobots, mockTasks, mockAlerts } from '@/data/mockData';
import type { Robot } from '@/data/types';
import { Bot, Battery, Thermometer, Gauge, Package, AlertTriangle, Wrench, Activity } from 'lucide-react';

const RobotCard: React.FC<{ robot: Robot; selected: boolean; onClick: () => void }> = ({ robot, selected, onClick }) => (
  <div onClick={onClick} className={`bg-card rounded-lg border p-4 cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : 'hover:border-primary/30'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /><span className="text-sm font-semibold">{robot.robotId}</span></div>
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${robot.status === 'active' ? 'bg-green-50 text-green-700' : robot.status === 'idle' ? 'bg-amber-50 text-amber-700' : robot.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-muted text-muted-foreground'}`}>{robot.status}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-[10px]">
      <div className="flex items-center gap-1"><Battery className="w-3 h-3" /><span className={robot.batteryLevel < 20 ? 'text-destructive font-medium' : ''}>{robot.batteryLevel}%</span></div>
      <div className="flex items-center gap-1"><Thermometer className="w-3 h-3" /><span className={robot.temperature > 50 ? 'text-destructive font-medium' : ''}>{robot.temperature}°C</span></div>
      <div className="flex items-center gap-1"><Gauge className="w-3 h-3" />{robot.currentSpeed} m/s</div>
      <div className="flex items-center gap-1"><Package className="w-3 h-3" />{robot.currentLoadKg} kg</div>
    </div>
    <div className="mt-2 w-full h-1.5 bg-muted rounded-full"><div className={`h-full rounded-full ${robot.batteryLevel < 20 ? 'bg-destructive' : robot.batteryLevel < 50 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${robot.batteryLevel}%` }} /></div>
  </div>
);

const RobotMonitorPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState(mockRobots[0].robotId);
  const [telemetry, setTelemetry] = useState(mockRobots);
  const selected = telemetry.find(r => r.robotId === selectedId)!;
  const robotTasks = mockTasks.filter(t => t.robotId === selectedId);
  const robotAlerts = mockAlerts.filter(a => a.source === selectedId);

  // Simulate live telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => prev.map(r => ({
        ...r,
        currentSpeed: r.status === 'active' ? Math.max(0, r.currentSpeed + (Math.random() - 0.5) * 0.3) : 0,
        temperature: Math.max(30, Math.min(60, r.temperature + (Math.random() - 0.5) * 0.5)),
        batteryLevel: Math.max(0, r.batteryLevel - (r.status === 'active' ? 0.02 : 0)),
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Robot Monitoring</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {telemetry.map(r => <RobotCard key={r.robotId} robot={r} selected={selectedId === r.robotId} onClick={() => setSelectedId(r.robotId)} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Telemetry — {selected.robotId}</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              { label: 'Battery Level', value: `${selected.batteryLevel.toFixed(1)}%`, warn: selected.batteryLevel < 20 },
              { label: 'Speed', value: `${selected.currentSpeed.toFixed(2)} m/s` },
              { label: 'Load Weight', value: `${selected.currentLoadKg} / ${selected.maxLoadKg} kg` },
              { label: 'Temperature', value: `${selected.temperature.toFixed(1)}°C`, warn: selected.temperature > 50 },
              { label: 'Status', value: selected.status },
              { label: 'Error Code', value: selected.errorCode || 'None' },
              { label: 'Idle Time', value: `${Math.floor(selected.idleTimeSec / 60)} min` },
              { label: 'Model', value: selected.model },
              { label: 'Tasks Completed', value: String(selected.totalTasksCompleted) },
              { label: 'Last Maintenance', value: new Date(selected.lastMaintenance).toLocaleDateString() },
            ].map(item => (
              <div key={item.label} className="p-2 bg-muted rounded">
                <p className="text-muted-foreground text-[10px]">{item.label}</p>
                <p className={`font-medium mt-0.5 ${item.warn ? 'text-destructive' : ''}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" /> Task History</h3>
            <div className="space-y-2">{robotTasks.length > 0 ? robotTasks.map(t => (
              <div key={t.taskId} className="flex justify-between items-center p-2 bg-muted rounded text-xs">
                <div><span className="font-mono font-medium">{t.taskId}</span><span className="ml-2 text-muted-foreground capitalize">{t.taskType}</span></div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${t.status === 'completed' ? 'bg-green-50 text-green-700' : t.status === 'in-progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{t.status}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground">No tasks for this robot.</p>}</div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alerts</h3>
            <div className="space-y-2">{robotAlerts.length > 0 ? robotAlerts.map(a => (
              <div key={a.id} className={`p-2 rounded text-xs border-l-2 ${a.type === 'error' ? 'border-l-destructive bg-red-50' : 'border-l-warning bg-amber-50'}`}>
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">{a.message}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground">No alerts.</p>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RobotMonitorPage;
