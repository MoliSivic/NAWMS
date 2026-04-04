import React, { useState } from 'react';
import { mockOptimizations } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Lightbulb, Check, X } from 'lucide-react';

const OptimizationPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState(mockOptimizations);

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    setSuggestions(s => s.map(sg => sg.id === id ? { ...sg, status: action } : sg));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Optimization Suggestions</h1>
        <p className="text-sm text-muted-foreground">End-of-day system-generated recommendations for warehouse efficiency</p>
      </div>
      <div className="p-3 bg-blue-50 rounded text-xs text-blue-800 flex items-start gap-2">
        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>These suggestions move <strong>whole sealed packages</strong> between pallets only. The system never suggests opening packages or mixing money contents. Pallet/shelf reassignment is treated as a rare, exception-based operation.</span>
      </div>
      <div className="space-y-4">
        {suggestions.map(s => (
          <div key={s.id} className={`bg-card rounded-lg border p-5 animate-fade-in ${s.status !== 'pending' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ml-4 ${s.riskLevel === 'low' ? 'bg-green-50 text-green-700' : s.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                {s.riskLevel} risk
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-2 bg-muted rounded"><p className="text-[10px] text-muted-foreground">Source</p><p className="font-mono font-medium">{s.sourcePallet} ({s.sourceLocation})</p></div>
              <div className="p-2 bg-muted rounded"><p className="text-[10px] text-muted-foreground">Target</p><p className="font-mono font-medium">{s.targetPallet} ({s.targetLocation})</p></div>
              <div className="p-2 bg-muted rounded"><p className="text-[10px] text-muted-foreground">Space Saved</p><p className="font-medium">{s.estimatedSpaceSaved}</p></div>
              <div className="p-2 bg-muted rounded"><p className="text-[10px] text-muted-foreground">Travel Reduction</p><p className="font-medium">{s.estimatedTravelReduction}</p></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {s.approvalRequired && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-medium">Approval Required</span>}
                <span>{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              {s.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAction(s.id, 'rejected')}><X className="w-3 h-3 mr-1" /> Reject</Button>
                  <Button size="sm" onClick={() => handleAction(s.id, 'approved')}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                </div>
              ) : (
                <span className={`text-xs font-medium ${s.status === 'approved' ? 'text-success' : 'text-destructive'}`}>{s.status === 'approved' ? '✓ Approved' : '✗ Rejected'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default OptimizationPage;
