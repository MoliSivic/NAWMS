import React, { useState } from 'react';
import { mockAuditLogs } from '@/data/mockData';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const filtered = mockAuditLogs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.userName.toLowerCase().includes(search.toLowerCase()) ||
    l.entityId.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><h1 className="text-xl font-semibold">Audit Log</h1></div>
        <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" /> Export</Button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions, users, entities..." className="px-3 py-1.5 border rounded text-xs bg-background w-80" />
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium text-muted-foreground">Timestamp</th>
            <th className="text-left p-3 font-medium text-muted-foreground">User</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Entity</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Details</th>
            <th className="text-left p-3 font-medium text-muted-foreground">IP</th>
          </tr></thead>
          <tbody>{filtered.map(l => (
            <tr key={l.logId} className="border-b hover:bg-muted/30">
              <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
              <td className="p-3">{l.userName}</td>
              <td className="p-3"><span className="px-2 py-0.5 bg-navy-50 text-navy-700 rounded font-mono text-[10px]">{l.action}</span></td>
              <td className="p-3 font-mono">{l.entityType}: {l.entityId}</td>
              <td className="p-3 max-w-xs truncate text-muted-foreground">{l.details}</td>
              <td className="p-3 font-mono text-muted-foreground">{l.ipAddress}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};
export default AuditPage;
