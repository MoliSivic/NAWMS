import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPackages } from '@/data/mockData';

const InventoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = mockPackages.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (p.packageId.toLowerCase().includes(search.toLowerCase()) || p.palletId.toLowerCase().includes(search.toLowerCase()))
  );

  const detail = selected ? mockPackages.find(p => p.packageId === selected) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Inventory Registry</h1>
      <div className="flex gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Package ID or Pallet..." className="px-3 py-1.5 border rounded text-xs bg-background w-64" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="stored">Stored</SelectItem>
            <SelectItem value="in-transit">In Transit</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} packages</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Package ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Pallet</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Security</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Value</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody>{filtered.map(p => (
              <tr key={p.packageId} onClick={() => setSelected(p.packageId)} className={`border-b cursor-pointer transition-colors ${selected === p.packageId ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                <td className="p-3 font-mono font-medium">{p.packageId}</td>
                <td className="p-3">{p.palletId}</td>
                <td className="p-3 font-mono">{p.locationCode}</td>
                <td className="p-3 capitalize">{p.securityLevel}</td>
                <td className="p-3 text-right">{p.currency} {p.totalValue.toLocaleString()}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.status === 'stored' ? 'bg-green-50 text-green-700' : p.status === 'in-transit' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3">Package Details</h3>
          {detail ? (
            <div className="space-y-3 text-xs animate-fade-in">
              <div className="space-y-2 p-3 bg-muted rounded">
                {Object.entries({
                  'Package ID': detail.packageId,
                  'QR Code': detail.qrCode,
                  'Product Type': detail.productType,
                  'Pallet': detail.palletId,
                  'Location': detail.locationCode,
                  'Security': detail.securityLevel,
                  'Seal Status': detail.sealStatus,
                  'Source': detail.source,
                  'Status': detail.status,
                  'Arrival': new Date(detail.arrivalDate).toLocaleDateString(),
                  ...(detail.releasedDate ? { 'Released': new Date(detail.releasedDate).toLocaleDateString() } : {}),
                  ...(detail.notes ? { 'Notes': detail.notes } : {}),
                }).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium capitalize">{v}</span></div>
                ))}
              </div>
              <div>
                <p className="font-medium mb-2">Denomination Breakdown</p>
                <table className="w-full text-[10px]"><thead><tr className="border-b"><th className="text-left py-1">Currency</th><th className="text-left py-1">Denomination</th><th className="text-right py-1">Notes per Sack</th><th className="text-right py-1">Subtotal</th></tr></thead>
                  <tbody>{detail.denominations.map((d, i) => (
                    <tr key={i} className="border-b"><td className="py-1">{d.currency}</td><td className="py-1">{d.denomination.toLocaleString()}</td><td className="py-1 text-right">{d.quantity}</td><td className="py-1 text-right">{d.subtotal.toLocaleString()}</td></tr>
                  ))}</tbody>
                </table>
                <div className="flex justify-between mt-2 pt-2 border-t font-semibold"><span>Total</span><span>{detail.currency} {detail.totalValue.toLocaleString()}</span></div>
              </div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Select a package to view details.</p>}
        </div>
      </div>
    </div>
  );
};
export default InventoryPage;
