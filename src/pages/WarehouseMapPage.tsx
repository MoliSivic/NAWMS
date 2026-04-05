import React, { useState } from 'react';
import WarehouseCanvas, { type SlotInfo } from '@/components/WarehouseCanvas';
import { mockZones, mockPallets, mockPackages } from '@/data/mockData';
import { warehouseLayout } from '@/data/warehouseLayout';
import { X } from 'lucide-react';

const WarehouseMapPage: React.FC = () => {
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  const pallet = selectedSlot?.palletId
    ? mockPallets.find(p => p.palletId === selectedSlot.palletId)
    : null;
  const zone = selectedSlot ? mockZones.find(z => z.zoneId === selectedSlot.zoneId) : null;
  const palletPkgs = pallet ? mockPackages.filter(p => p.palletId === pallet.palletId) : [];

  return (
    <div className="flex gap-3 overflow-hidden" style={{ height: 'calc(100vh - 6.5rem)' }}>
      {/* Map — fills remaining space */}
      <div className="flex-1 bg-card rounded-lg border overflow-hidden">
        <WarehouseCanvas
          onSlotClick={setSelectedSlot}
          selectedSlotId={selectedSlot?.locationId ?? null}
        />
      </div>

      {/* Detail panel — conditionally rendered beside the map */}
      {selectedSlot && (
        <div className="w-72 bg-card rounded-lg border overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Header with close */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              RACK {selectedSlot.shelfId}
            </span>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Zone & Reserved */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Zone</span>
              <div className="font-semibold">{selectedSlot.zoneId.replace('ZONE-', '')}</div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Reserved</span>
              <div className="font-semibold">{selectedSlot.palletId ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Pallet Slots grid — all 4 slots of this shelf, clickable */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Pallet Slots</span>
            <div className="grid grid-cols-2 gap-1">
              {(() => {
                const shelf = warehouseLayout.shelves.find(s => s.shelfId === selectedSlot.shelfId);
                if (!shelf) return null;
                return (['top', 'bottom'] as const).map(tier =>
                  (['P1', 'P2'] as const).map(slot => {
                    const slotData = shelf.slots.find(s => s.tier === tier && s.slot === slot);
                    const isSelected = selectedSlot.tier === tier && selectedSlot.slot === slot;
                    const label = `${tier === 'top' ? 'Top' : 'Bottom'} ${slot === 'P1' ? 'Left' : 'Right'}`;
                    const hasPallet = slotData?.palletId;

                    return (
                      <button
                        key={`${tier}-${slot}`}
                        onClick={() => {
                          if (slotData) {
                            setSelectedSlot({
                              locationId: slotData.locationId,
                              tier: slotData.tier,
                              slot: slotData.slot,
                              palletId: slotData.palletId,
                              occupancy: slotData.occupancy,
                              shelfId: shelf.shelfId,
                              zoneId: shelf.zoneId,
                              rect: { x: 0, y: 0, w: 0, h: 0 },
                            });
                          }
                        }}
                        className={`p-2 rounded text-center transition-colors ${
                          isSelected
                            ? 'bg-primary/15 border-2 border-primary/50 ring-1 ring-primary/20'
                            : hasPallet
                              ? 'bg-primary/10 border border-primary/30 hover:bg-primary/20 cursor-pointer'
                              : 'bg-muted/30 border border-border hover:bg-muted/50 cursor-pointer'
                        }`}
                      >
                        <div className="text-[9px] text-muted-foreground">{label}</div>
                        <div className={`text-[10px] font-semibold ${hasPallet ? 'text-primary' : 'text-muted-foreground'}`}>
                          {hasPallet || 'Empty'}
                        </div>
                      </button>
                    );
                  })
                );
              })()}
            </div>
          </div>

          {/* Slot details */}
          <div className="p-3 bg-muted/30 rounded space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-mono font-medium">{selectedSlot.locationId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shelf</span><span className="font-mono">{selectedSlot.shelfId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{zone?.zoneName ?? selectedSlot.zoneId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tier / Slot</span><span className="capitalize">{selectedSlot.tier} — {selectedSlot.slot}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
              <span className={selectedSlot.palletId ? 'text-info' : 'text-success'}>{selectedSlot.palletId ? 'Occupied' : 'Available'}</span>
            </div>
          </div>

          {pallet && (
            <div className="p-3 bg-muted/30 rounded space-y-2 text-xs">
              <p className="font-medium">Pallet: {pallet.palletId}</p>
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
                  <p className="text-muted-foreground mb-1">All packages ({palletPkgs.length}):</p>
                  <div className="overflow-y-auto space-y-0.5 pr-1">
                    {palletPkgs.map(p => (
                      <div key={p.packageId} className="flex justify-between text-[10px] py-0.5 border-b border-border/50 last:border-0">
                        <span className="font-mono">{p.packageId}</span>
                        <span>{p.currency} {p.totalValue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 mt-2 border-t border-border text-[11px] font-semibold">
                    <span>Total Value</span>
                    <span>{palletPkgs[0]?.currency} {palletPkgs.reduce((sum, p) => sum + p.totalValue, 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WarehouseMapPage;
