import React, { useState } from 'react';
import { mockPallets, mockPackages, mockZones } from '@/data/mockData';

const PalletPage: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const detail = selected ? mockPallets.find(p => p.palletId === selected) : null;
  const detailPkgs = detail ? mockPackages.filter(p => p.palletId === detail.palletId).slice(0, 10) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Pallet Management</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Pallet ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Zone</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Packages</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Occupancy</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody>{mockPallets.map(p => {
              const fill = p.currentPackageCount / p.maxCapacity;
              return (
                <tr key={p.palletId} onClick={() => setSelected(p.palletId)} className={`border-b cursor-pointer transition-colors ${selected === p.palletId ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <td className="p-3 font-mono font-medium">{p.palletId}</td>
                  <td className="p-3">{mockZones.find(z => z.zoneId === p.zoneId)?.zoneName.split('—')[0]}</td>
                  <td className="p-3 font-mono">{p.locationCode}</td>
                  <td className="p-3">{p.currentPackageCount}/{p.maxCapacity}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${fill >= 0.9 ? 'bg-success' : fill >= 0.5 ? 'bg-info' : fill >= 0.25 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${fill * 100}%` }} /></div><span className="text-[10px]">{Math.round(fill * 100)}%</span></div></td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.status === 'in-use' ? 'bg-green-50 text-green-700' : p.status === 'available' ? 'bg-blue-50 text-blue-700' : p.status === 'maintenance' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span></td>
                </tr>);
            })}</tbody>
          </table>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3">Pallet Details</h3>
          {detail ? (
            <div className="space-y-3 text-xs animate-fade-in">
              <div className="space-y-2 p-3 bg-muted rounded">
                {Object.entries({ 'Pallet ID': detail.palletId, 'Location': detail.locationCode, 'Zone': detail.zoneId, 'Tier': detail.tier, 'Slot': detail.slot, 'Status': detail.status, 'Packages': `${detail.currentPackageCount}/${detail.maxCapacity}` }).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium capitalize">{String(v)}</span></div>
                ))}
              </div>
              {detailPkgs.length > 0 && <div><p className="font-medium mb-2">Packages on Pallet</p><div className="space-y-1 max-h-40 overflow-y-auto">{detailPkgs.map(pkg => (
                <div key={pkg.packageId} className="flex justify-between p-2 bg-muted rounded text-[10px]"><span className="font-mono">{pkg.packageId}</span><span>{pkg.currency} {pkg.totalValue.toLocaleString()}</span></div>
              ))}</div></div>}
              <div className="p-3 bg-amber-50 rounded text-[10px] text-amber-800">Pallet reassignment is an exception operation requiring admin authorization.</div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Select a pallet to view details.</p>}
        </div>
      </div>
    </div>
  );
};
export default PalletPage;
