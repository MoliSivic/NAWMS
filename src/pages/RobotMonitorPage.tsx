import React, { useState, useEffect } from 'react';
import { mockRobots, mockTasks, mockAlerts } from '@/data/mockData';
import type { Robot, RobotTask } from '@/data/types';
import { Bot, Battery, Thermometer, Gauge, Package, AlertTriangle, Wrench, Activity, Pause, Play, ArrowRightLeft, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RobotCard: React.FC<{ robot: Robot; selected: boolean; onClick: () => void }> = ({ robot, selected, onClick }) => (
  <div onClick={onClick} className={`bg-card rounded-lg border p-4 cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : 'hover:border-primary/30'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /><span className="text-sm font-semibold">{robot.robotId}</span></div>
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${robot.status === 'active' ? 'bg-green-50 text-green-700' : robot.status === 'idle' ? 'bg-amber-50 text-amber-700' : robot.status === 'error' ? 'bg-red-50 text-red-700' : robot.status === 'maintenance' ? 'bg-blue-50 text-blue-700' : 'bg-muted text-muted-foreground'}`}>{robot.status}</span>
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
  const [tasks, setTasks] = useState(mockTasks);
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selected = telemetry.find(r => r.robotId === selectedId)!;
  const robotTasks = tasks.filter(t => t.robotId === selectedId);
  const robotAlerts = mockAlerts.filter(a => a.source === selectedId);
  const otherActiveRobots = telemetry.filter(r => r.robotId !== selectedId && r.status !== 'error' && r.status !== 'decommissioned' && r.status !== 'maintenance');

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

  const showAction = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handlePause = () => {
    setTelemetry(prev => prev.map(r => r.robotId === selectedId ? { ...r, status: r.status === 'active' ? 'idle' as const : 'active' as const, currentSpeed: r.status === 'active' ? 0 : 1.0 } : r));
    showAction(selected.status === 'active' ? `${selectedId} paused successfully.` : `${selectedId} resumed.`);
  };

  const handleReassign = (taskId: string) => {
    if (!reassignTarget) return;
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, robotId: reassignTarget } : t));
    setReassigningTaskId(null);
    setReassignTarget('');
    showAction(`Task ${taskId} reassigned to ${reassignTarget}.`);
  };

  const handleDispatchHuman = () => {
    showAction(`Human worker dispatched to ${selectedId} location (X: ${Math.round(selected.locationX)}, Y: ${Math.round(selected.locationY)}).`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Robot Monitoring</h1>

      {/* Action feedback */}
      {actionMessage && (
        <div className="p-3 bg-green-50 border border-success/20 rounded text-xs text-success font-medium animate-fade-in">
          {actionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {telemetry.map(r => <RobotCard key={r.robotId} robot={r} selected={selectedId === r.robotId} onClick={() => setSelectedId(r.robotId)} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Telemetry */}
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
                { label: 'Position', value: `X: ${Math.round(selected.locationX)}, Y: ${Math.round(selected.locationY)}` },
                { label: 'Endpoint', value: selected.commEndpoint },
              ].map(item => (
                <div key={item.label} className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground text-[10px]">{item.label}</p>
                  <p className={`font-medium mt-0.5 ${item.warn ? 'text-destructive' : ''}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" /> Robot Actions</h3>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant={selected.status === 'active' ? 'destructive' : 'default'} onClick={handlePause} disabled={selected.status === 'error' || selected.status === 'decommissioned'}>
                {selected.status === 'active' ? <><Pause className="w-3 h-3 mr-1" /> Pause Robot</> : <><Play className="w-3 h-3 mr-1" /> Resume Robot</>}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDispatchHuman}>
                <UserCheck className="w-3 h-3 mr-1" /> Dispatch Human Worker
              </Button>
            </div>
            {selected.status === 'error' && (
              <p className="text-[10px] text-destructive mt-2">Robot is in error state ({selected.errorCode}). Resolve the error before resuming operations.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Task History with reassign */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Task History</h3>
            <div className="space-y-2">{robotTasks.length > 0 ? robotTasks.map(t => (
              <div key={t.taskId} className="p-2 bg-muted rounded text-xs">
                <div className="flex justify-between items-center">
                  <div><span className="font-mono font-medium">{t.taskId}</span><span className="ml-2 text-muted-foreground capitalize">{t.taskType}</span></div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${t.status === 'completed' ? 'bg-green-50 text-green-700' : t.status === 'in-progress' ? 'bg-blue-50 text-blue-700' : t.status === 'queued' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{t.status}</span>
                    {(t.status === 'queued' || t.status === 'assigned' || t.status === 'in-progress') && (
                      <button onClick={() => { setReassigningTaskId(t.taskId); setReassignTarget(''); }} className="p-1 hover:bg-background rounded" title="Reassign task">
                        <ArrowRightLeft className="w-3 h-3 text-primary" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{t.sourceLocation} → {t.targetLocation}</p>
                {reassigningTaskId === t.taskId && (
                  <div className="mt-2 p-2 bg-blue-50 rounded space-y-2 animate-fade-in">
                    <p className="text-[10px] font-medium text-blue-800">Reassign to another robot:</p>
                    <div className="flex gap-2">
                      <Select value={reassignTarget} onValueChange={setReassignTarget}>
                        <SelectTrigger className="h-7 text-[10px] flex-1"><SelectValue placeholder="Select robot..." /></SelectTrigger>
                        <SelectContent>
                          {otherActiveRobots.map(r => (
                            <SelectItem key={r.robotId} value={r.robotId}>{r.robotId} ({r.status}, {r.batteryLevel.toFixed(0)}% battery)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-7 text-[10px]" disabled={!reassignTarget} onClick={() => handleReassign(t.taskId)}>Reassign</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setReassigningTaskId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )) : <p className="text-xs text-muted-foreground">No tasks for this robot.</p>}</div>
          </div>

          {/* Alerts */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alerts</h3>
            <div className="space-y-2">{robotAlerts.length > 0 ? robotAlerts.map(a => (
              <div key={a.id} className={`p-2 rounded text-xs border-l-2 ${a.type === 'error' ? 'border-l-destructive bg-red-50' : 'border-l-warning bg-amber-50'}`}>
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">{a.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(a.timestamp).toLocaleString()}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground">No alerts.</p>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RobotMonitorPage;
