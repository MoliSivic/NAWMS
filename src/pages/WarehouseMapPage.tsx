import React, { useState } from 'react';
import { mockZones, mockShelfLocations, mockPallets, mockRobots } from '@/data/mockData';

const WarehouseMapPage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const filteredLocations = selectedZone
    ? mockShelfLocations.filter(l => l.zoneId === selectedZone)
    : mockShelfLocations;

  const selectedLoc = filteredLocations.find(l => l.locationId === selectedLocation);
  const selectedPallet = selectedLoc?.palletId ? mockPallets.find(p => p.palletId === selectedLoc.palletId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Warehouse Map</h1>
        <p className="text-sm text-muted-foreground">Interactive 2D layout — click any location to inspect</p>
      </div>

      {/* Zone filter */}
      <div className="flex gap-2">
        <button onClick={() => setSelectedZone(null)} className={`px-3 py-1.5 rounded border text-xs font-medium ${!selectedZone ? 'border-primary bg-primary/5' : 'border-border'}`}>All Zones</button>
        {mockZones.map(z => (
          <button key={z.zoneId} onClick={() => setSelectedZone(z.zoneId)} className={`px-3 py-1.5 rounded border text-xs font-medium ${selectedZone === z.zoneId ? 'border-primary bg-primary/5' : 'border-border'}`}>
            {z.zoneName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-card rounded-lg border p-4 min-h-[500px]">
          <div className="relative">
            {/* Zone areas */}
            {mockZones.filter(z => !selectedZone || z.zoneId === selectedZone).map((zone, zi) => (
              <div key={zone.zoneId} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                  <span className="text-xs font-medium">{zone.zoneName}</span>
                  <span className="text-[10px] text-muted-foreground">— {zone.securityClass} security</span>
                </div>

                {/* Grid of shelf locations */}
                <div className="grid grid-cols-8 gap-1.5">
                  {mockShelfLocations.filter(l => l.zoneId === zone.zoneId).map(loc => {
                    const pallet = loc.palletId ? mockPallets.find(p => p.palletId === loc.palletId) : null;
                    const occupancy = pallet ? (pallet.currentPackageCount / pallet.maxCapacity) : 0;
                    const isSelected = selectedLocation === loc.locationId;

                    return (
                      <button
                        key={loc.locationId}
                        onClick={() => setSelectedLocation(loc.locationId)}
                        className={`relative p-2 rounded text-[9px] font-mono border transition-all duration-200 ${
                          isSelected ? 'ring-2 ring-primary border-primary scale-105' :
                          loc.isAvailable ? 'border-border bg-muted/30 hover:bg-muted' :
                          'border-border hover:border-primary/50'
                        }`}
                        style={!loc.isAvailable ? {
                          backgroundColor: occupancy >= 0.9 ? 'hsl(142, 71%, 35%, 0.15)' :
                                          occupancy >= 0.5 ? 'hsl(210, 100%, 50%, 0.1)' :
                                          occupancy >= 0.25 ? 'hsl(38, 92%, 50%, 0.1)' :
                                          'hsl(0, 72%, 51%, 0.08)',
                        } : undefined}
                        title={`${loc.locationId}${pallet ? ` — ${pallet.currentPackageCount}/${pallet.maxCapacity} pkgs` : ' — Empty'}`}
                      >
                        <div className="truncate">{loc.locationId.split('-').slice(0, 2).join('-')}</div>
                        <div className="truncate text-muted-foreground">{loc.tier[0].toUpperCase()}-{loc.slot}</div>
                        {pallet && (
                          <div className="mt-1 w-full h-1 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${
                              occupancy >= 0.9 ? 'bg-success' :
                              occupancy >= 0.5 ? 'bg-info' :
                              occupancy >= 0.25 ? 'bg-warning' : 'bg-destructive'
                            }`} style={{ width: `${occupancy * 100}%` }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Robot positions */}
            <div className="mt-4 p-3 bg-muted rounded">
              <p className="text-xs font-medium mb-2">Robot Positions</p>
              <div className="flex gap-4">
                {mockRobots.map(robot => (
                  <div key={robot.robotId} className="flex items-center gap-2 text-[10px]">
                    <div className={`w-2 h-2 rounded-full ${
                      robot.status === 'active' ? 'bg-success animate-pulse-soft' :
                      robot.status === 'idle' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                    <span>{robot.robotId}</span>
                    <span className="text-muted-foreground">({robot.status})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3">Location Details</h3>
          {selectedLoc ? (
            <div className="space-y-3 text-xs animate-fade-in">
              <div className="p-3 bg-muted rounded space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Location Code</span><span className="font-mono font-medium">{selectedLoc.locationId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{mockZones.find(z => z.zoneId === selectedLoc.zoneId)?.zoneName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shelf</span><span>{selectedLoc.shelfNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><span className="capitalize">{selectedLoc.tier}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Slot</span><span>{selectedLoc.slot}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                  <span className={selectedLoc.isAvailable ? 'text-success' : 'text-info'}>{selectedLoc.isAvailable ? 'Available' : 'Occupied'}</span>
                </div>
              </div>

              {selectedPallet && (
                <div className="p-3 bg-muted rounded space-y-2">
                  <p className="font-medium">Pallet: {selectedPallet.palletId}</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Packages</span><span>{selectedPallet.currentPackageCount} / {selectedPallet.maxCapacity}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Occupancy</span><span>{Math.round((selectedPallet.currentPackageCount / selectedPallet.maxCapacity) * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{selectedPallet.status}</span></div>
                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      selectedPallet.currentPackageCount / selectedPallet.maxCapacity >= 0.9 ? 'bg-success' :
                      selectedPallet.currentPackageCount / selectedPallet.maxCapacity >= 0.5 ? 'bg-info' :
                      selectedPallet.currentPackageCount / selectedPallet.maxCapacity >= 0.25 ? 'bg-warning' : 'bg-destructive'
                    }`} style={{ width: `${(selectedPallet.currentPackageCount / selectedPallet.maxCapacity) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Click a location on the map to view details.</p>
          )}

          {/* Legend */}
          <div className="mt-6 p-3 bg-muted rounded">
            <p className="text-xs font-medium mb-2">Occupancy Legend</p>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2"><div className="w-3 h-1.5 rounded-full bg-success" /> 90–100% Full</div>
              <div className="flex items-center gap-2"><div className="w-3 h-1.5 rounded-full bg-info" /> 50–89% Occupied</div>
              <div className="flex items-center gap-2"><div className="w-3 h-1.5 rounded-full bg-warning" /> 25–49% Occupied</div>
              <div className="flex items-center gap-2"><div className="w-3 h-1.5 rounded-full bg-destructive" /> Below 25%</div>
              <div className="flex items-center gap-2"><div className="w-3 h-1.5 rounded-full bg-muted-foreground/20" /> Empty</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseMapPage;
