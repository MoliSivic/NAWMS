import React, { useState } from 'react';
import { mockApprovals, mockUsers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Check, X, Shield, Clock } from 'lucide-react';

const ApprovalPage: React.FC = () => {
  const [approvals, setApprovals] = useState(mockApprovals);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = approvals.filter(a => filter === 'all' || a.status === filter);

  const handleApprove = (id: string) => {
    setApprovals(prev => prev.map(a => a.approvalId === id ? { ...a, status: 'approved' as const, reviewedBy: 'USR-001', reviewedAt: new Date().toISOString() } : a));
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) return;
    setApprovals(prev => prev.map(a => a.approvalId === id ? { ...a, status: 'rejected' as const, reviewedBy: 'USR-001', reviewedAt: new Date().toISOString(), reason: `Rejected: ${rejectReason}` } : a));
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /><h1 className="text-xl font-semibold">Approval Queue</h1></div>
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded border text-xs font-medium capitalize ${filter === f ? 'border-primary bg-primary/5' : 'border-border'}`}>{f} ({approvals.filter(a => f === 'all' || a.status === f).length})</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(a => {
          const requester = mockUsers.find(u => u.userId === a.requestedBy);
          return (
            <div key={a.approvalId} className={`bg-card rounded-lg border p-4 ${a.status !== 'pending' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium">{a.approvalId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${a.type === 'stock-out' ? 'bg-blue-50 text-blue-700' : a.type === 'reorganization' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'}`}>{a.type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${a.status === 'pending' ? 'bg-amber-50 text-amber-700' : a.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{a.reason}</p>
                </div>
              </div>

              {/* Detail cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] mb-3">
                <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Requested By</span><p className="font-medium mt-0.5">{requester?.name || a.requestedBy}</p></div>
                <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Date</span><p className="font-medium mt-0.5">{new Date(a.requestedAt).toLocaleString()}</p></div>
                {a.details && (a.details as Record<string, unknown>).packages && (
                  <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Packages</span><p className="font-medium mt-0.5">{String((a.details as Record<string, unknown>).packages)} packages</p></div>
                )}
                {a.details && (a.details as Record<string, unknown>).totalValue && (
                  <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Total Value</span><p className="font-medium mt-0.5">{Number((a.details as Record<string, unknown>).totalValue).toLocaleString()}</p></div>
                )}
                {a.details && (a.details as Record<string, unknown>).denomination && (
                  <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Denomination</span><p className="font-medium mt-0.5">{String((a.details as Record<string, unknown>).denomination)}</p></div>
                )}
                {a.details && (a.details as Record<string, unknown>).source && (
                  <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Source Pallet</span><p className="font-medium mt-0.5">{String((a.details as Record<string, unknown>).source)}</p></div>
                )}
                {a.details && (a.details as Record<string, unknown>).target && (
                  <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Target Pallet</span><p className="font-medium mt-0.5">{String((a.details as Record<string, unknown>).target)}</p></div>
                )}
                {a.details && (a.details as Record<string, unknown>).spaceSaved && (
                  <div className="p-2 bg-muted rounded"><span className="text-muted-foreground">Space Saved</span><p className="font-medium mt-0.5">{String((a.details as Record<string, unknown>).spaceSaved)}</p></div>
                )}
              </div>

              {/* FIFO compliance */}
              {a.type === 'stock-out' && (
                <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-green-50 rounded text-[10px]">
                  <Clock className="w-3 h-3 text-success" />
                  <span className="font-medium text-success">FIFO Compliant</span>
                  <span className="text-muted-foreground">— Packages selected in arrival-date order (oldest first)</span>
                </div>
              )}

              {/* Reviewed info */}
              {a.status !== 'pending' && a.reviewedBy && (
                <div className="text-[10px] text-muted-foreground mb-2">
                  {a.status === 'approved' ? 'Approved' : 'Rejected'} by {mockUsers.find(u => u.userId === a.reviewedBy)?.name || a.reviewedBy} on {a.reviewedAt ? new Date(a.reviewedAt).toLocaleString() : ''}
                </div>
              )}

              {/* Pending actions */}
              {a.status === 'pending' && (
                <>
                  {rejectingId === a.approvalId ? (
                    <div className="space-y-2 p-3 bg-red-50 border border-destructive/20 rounded animate-fade-in">
                      <label className="block text-xs font-medium text-red-800">Rejection Reason (required)</label>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Provide a reason for rejection..."
                        className="w-full px-3 py-2 border border-red-200 rounded text-xs bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-destructive/50"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</Button>
                        <Button size="sm" variant="destructive" disabled={!rejectReason.trim()} onClick={() => handleReject(a.approvalId)}>
                          <X className="w-3 h-3 mr-1" /> Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setRejectingId(a.approvalId)}><X className="w-3 h-3 mr-1" /> Reject</Button>
                      <Button size="sm" onClick={() => handleApprove(a.approvalId)}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No {filter === 'all' ? '' : filter} approvals found.</div>
        )}
      </div>
    </div>
  );
};
export default ApprovalPage;
