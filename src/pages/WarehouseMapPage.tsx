import React, { useState } from 'react';
import WarehouseCanvas, { type SlotInfo } from '@/components/WarehouseCanvas';
import { mockZones, mockPallets, mockRobots, mockPackages } from '@/data/mockData';

const WarehouseMapPage: React.FC = () => {
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  const pallet = selectedSlot?.palletId
    ? mockPallets.find(p => p.palletId === selectedSlot.palletId)
    : null;
  const zone = selectedSlot ? mockZones.find(z => z.zoneId === selectedSlot.zoneId) : null;
  const palletPkgs = pallet ? mockPackages.filter(p => p.palletId === pallet.palletId) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Warehouse Map</h1>
        <p className="text-sm text-muted-foreground">Interactive 2D layout with live robot tracking — click any shelf slot to inspect</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas map */}
        <div className="lg:col-span-3 bg-card rounded-lg border overflow-hidden" style={{ height: 600 }}>
          <WarehouseCanvas
            onSlotClick={setSelectedSlot}
            selectedSlotId={selectedSlot?.locationId ?? null}
          />
        </div>

        {/* Detail panel */}
        <div className="bg-card rounded-lg border p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 600 }}>
          <h3 className="text-sm font-medium">Slot Details</h3>
          {selectedSlot ? (
            <div className="space-y-3 text-xs animate-fade-in">
              <div className="p-3 bg-muted rounded space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-mono font-medium">{selectedSlot.locationId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shelf</span><span className="font-mono">{selectedSlot.shelfId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{zone?.zoneName ?? selectedSlot.zoneId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tier / Slot</span><span className="capitalize">{selectedSlot.tier} — {selectedSlot.slot}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                  <span className={selectedSlot.palletId ? 'text-info' : 'text-success'}>{selectedSlot.palletId ? 'Occupied' : 'Available'}</span>
                </div>
              </div>

              {pallet && (
                <div className="p-3 bg-muted rounded space-y-2">
                  <p className="font-medium text-xs">Pallet: {pallet.palletId}</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Packages</span><span>{pallet.currentPackageCount} / {pallet.maxCapacity}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Occupancy</span><span>{Math.round(selectedSlot.occupancy * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pallet Status</span><span className="capitalize">{pallet.status}</span></div>
                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      selectedSlot.occupancy >= 0.9 ? 'bg-success' :
                      selectedSlot.occupancy >= 0.5 ? 'bg-info' :
                      selectedSlot.occupancy >= 0.25 ? 'bg-warning' : 'bg-destructive'
                    }`} style={{ width: `${selectedSlot.occupancy * 100}%` }} />
                  </div>
                  {palletPkgs.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted-foreground mb-1">Top packages:</p>
                      {palletPkgs.slice(0, 4).map(p => (
                        <div key={p.packageId} className="flex justify-between text-[10px] py-0.5">
                          <span className="font-mono">{p.packageId}</span>
                          <span>{p.currency} {p.totalValue.toLocaleString()}</span>
                        </div>
                      ))}
                      {palletPkgs.length > 4 && <p className="text-[10px] text-muted-foreground">...and {palletPkgs.length - 4} more</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Click a shelf slot on the map to view details.</p>
          )}

          {/* Robot Legend */}
          <div className="p-3 bg-muted rounded">
            <p className="text-xs font-medium mb-2">Robot Status (Live)</p>
            <div className="space-y-2">
              {mockRobots.map(r => (
                <div key={r.robotId} className="flex items-center gap-2 text-[10px]">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    r.status === 'active' ? 'bg-green-500 animate-pulse' :
                    r.status === 'idle' ? 'bg-amber-400' :
                    r.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium">{r.robotId}</span>
                  <span className="text-muted-foreground capitalize">{r.status}</span>
                  <span className="text-muted-foreground ml-auto">{r.batteryLevel}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Occupancy Legend */}
          <div className="p-3 bg-muted rounded">
            <p className="text-xs font-medium mb-2">Occupancy Legend</p>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded" style={{ backgroundColor: '#166534' }} /> 90-100% Full</div>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded" style={{ backgroundColor: '#1e40af' }} /> 50-89%</div>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded" style={{ backgroundColor: '#92400e' }} /> 25-49%</div>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded" style={{ backgroundColor: '#7f1d1d' }} /> Below 25%</div>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded" style={{ backgroundColor: '#0f172a' }} /> Empty</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseMapPage;
