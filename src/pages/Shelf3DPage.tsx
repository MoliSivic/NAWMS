import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import { mockPallets, mockPackages } from '@/data/mockData';
import * as THREE from 'three';

// ─── 3D Components ───

const PackageBlock: React.FC<{ position: [number, number, number]; fillRatio: number }> = ({ position, fillRatio }) => {
  const color = fillRatio >= 0.9 ? '#16a34a' : fillRatio >= 0.5 ? '#3b82f6' : fillRatio >= 0.25 ? '#eab308' : '#ef4444';
  return (
    <mesh position={position}>
      <boxGeometry args={[0.15, 0.1, 0.15]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

interface PalletMeshProps {
  position: [number, number, number];
  palletData: typeof mockPallets[0] | null;
  isSelected: boolean;
  onClick: () => void;
  label: string;
}

const PalletMesh: React.FC<PalletMeshProps> = ({ position, palletData, isSelected, onClick, label }) => {
  const groupRef = useRef<THREE.Group>(null);
  const fillRatio = palletData ? palletData.currentPackageCount / palletData.maxCapacity : 0;
  const pkgCount = palletData?.currentPackageCount || 0;

  // Arrange packages in a grid: 8x5 = 40 max
  const cols = 8, rows = 5;
  const packages: [number, number, number][] = [];
  for (let i = 0; i < pkgCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    packages.push([
      position[0] - 0.55 + col * 0.16,
      position[1] + 0.12,
      position[2] - 0.3 + row * 0.16,
    ]);
  }

  return (
    <group ref={groupRef} onClick={onClick}>
      {/* Pallet base */}
      <mesh position={position}>
        <boxGeometry args={[1.3, 0.06, 0.85]} />
        <meshStandardMaterial color={isSelected ? '#3b82f6' : '#8B7355'} />
      </mesh>

      {/* Fill indicator */}
      {palletData && pkgCount > 0 && (
        <mesh position={[position[0], position[1] + 0.08, position[2]]}>
          <boxGeometry args={[1.25 * fillRatio, 0.03, 0.8]} />
          <meshStandardMaterial
            color={fillRatio >= 0.9 ? '#16a34a' : fillRatio >= 0.5 ? '#3b82f6' : fillRatio >= 0.25 ? '#eab308' : '#ef4444'}
            transparent opacity={0.3}
          />
        </mesh>
      )}

      {/* Individual package blocks */}
      {packages.map((pos, i) => (
        <PackageBlock key={i} position={pos} fillRatio={fillRatio} />
      ))}

      {/* Label */}
      <Text
        position={[position[0], position[1] + 0.35 + (pkgCount > 0 ? 0.1 * Math.ceil(pkgCount / cols) * 0.3 : 0), position[2]]}
        fontSize={0.08}
        color={isSelected ? '#3b82f6' : '#475569'}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>

      {palletData && (
        <Text
          position={[position[0], position[1] - 0.06, position[2] + 0.5]}
          fontSize={0.06}
          color="#64748b"
          anchorX="center"
        >
          {`${pkgCount}/${palletData.maxCapacity} (${Math.round(fillRatio * 100)}%)`}
        </Text>
      )}
    </group>
  );
};

const ShelfStructure: React.FC<{ selectedPallet: string | null; onSelectPallet: (id: string | null) => void }> = ({ selectedPallet, onSelectPallet }) => {
  // Two-tier shelf with 4 pallets
  const shelfPallets = [
    { id: 'PAL-001', tier: 'top', slot: 'P1', pos: [-0.75, 1.5, 0] as [number, number, number] },
    { id: 'PAL-002', tier: 'top', slot: 'P2', pos: [0.75, 1.5, 0] as [number, number, number] },
    { id: 'PAL-003', tier: 'bottom', slot: 'P1', pos: [-0.75, 0.3, 0] as [number, number, number] },
    { id: 'PAL-004', tier: 'bottom', slot: 'P2', pos: [0.75, 0.3, 0] as [number, number, number] },
  ];

  return (
    <group>
      {/* Shelf frame - vertical posts */}
      {[-1.5, -0.05, 1.5].map((x, i) => (
        <mesh key={`post-${i}`} position={[x, 1, 0]}>
          <boxGeometry args={[0.06, 2.2, 0.06]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
      ))}

      {/* Shelf platforms */}
      {[0.0, 1.2].map((y, i) => (
        <mesh key={`shelf-${i}`} position={[0, y, 0]}>
          <boxGeometry args={[3.1, 0.05, 1]} />
          <meshStandardMaterial color="#718096" />
        </mesh>
      ))}

      {/* Top cap */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[3.1, 0.05, 1]} />
        <meshStandardMaterial color="#718096" />
      </mesh>

      {/* Tier labels */}
      <Text position={[-1.7, 1.5, 0]} fontSize={0.1} color="#64748b" anchorX="right">Top Tier</Text>
      <Text position={[-1.7, 0.3, 0]} fontSize={0.1} color="#64748b" anchorX="right">Bottom Tier</Text>

      {/* Pallets */}
      {shelfPallets.map(sp => {
        const pallet = mockPallets.find(p => p.palletId === sp.id);
        return (
          <PalletMesh
            key={sp.id}
            position={sp.pos}
            palletData={pallet || null}
            isSelected={selectedPallet === sp.id}
            onClick={() => onSelectPallet(selectedPallet === sp.id ? null : sp.id)}
            label={sp.id}
          />
        );
      })}

      {/* Floor */}
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
    </group>
  );
};

// ─── Main Page ───

const Shelf3DPage: React.FC = () => {
  const [selectedPallet, setSelectedPallet] = useState<string | null>(null);
  const selected = selectedPallet ? mockPallets.find(p => p.palletId === selectedPallet) : null;
  const selectedPkgs = selected ? mockPackages.filter(p => p.palletId === selected.palletId).slice(0, 10) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">3D Shelf / Storage Visualization</h1>
        <p className="text-sm text-muted-foreground">Interactive two-tier shelf with pallet occupancy — click pallets to inspect</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Canvas */}
        <div className="lg:col-span-2 bg-card rounded-lg border overflow-hidden" style={{ height: 500 }}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[3, 2.5, 4]} fov={50} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 5]} intensity={0.8} />
            <directionalLight position={[-3, 4, -3]} intensity={0.3} />
            <ShelfStructure selectedPallet={selectedPallet} onSelectPallet={setSelectedPallet} />
            <OrbitControls enablePan enableZoom enableRotate minDistance={3} maxDistance={10} />
          </Canvas>
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3">Occupancy Legend</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: '90–100% Full', color: 'bg-success' },
                { label: '50–89%', color: 'bg-info' },
                { label: '25–49%', color: 'bg-warning' },
                { label: 'Below 25%', color: 'bg-destructive' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-4 h-3 rounded ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shelf Summary */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3">Shelf Summary</h3>
            <div className="space-y-2 text-xs">
              {['PAL-001', 'PAL-002', 'PAL-003', 'PAL-004'].map(pid => {
                const p = mockPallets.find(pp => pp.palletId === pid);
                if (!p) return null;
                const fill = p.currentPackageCount / p.maxCapacity;
                return (
                  <button
                    key={pid}
                    onClick={() => setSelectedPallet(pid)}
                    className={`w-full flex items-center justify-between p-2 rounded transition-all ${selectedPallet === pid ? 'bg-primary/5 ring-1 ring-primary' : 'bg-muted hover:bg-muted/80'}`}
                  >
                    <span className="font-mono font-medium">{pid}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${fill >= 0.9 ? 'bg-success' : fill >= 0.5 ? 'bg-info' : fill >= 0.25 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${fill * 100}%` }} />
                      </div>
                      <span className="w-10 text-right">{Math.round(fill * 100)}%</span>
                    </div>
                  </button>
                );
              })}
              <div className="pt-2 border-t text-muted-foreground">
                Total capacity: {['PAL-001', 'PAL-002', 'PAL-003', 'PAL-004'].reduce((sum, pid) => sum + (mockPallets.find(p => p.palletId === pid)?.maxCapacity || 0), 0)} packages across 4 pallets
              </div>
            </div>
          </div>

          {/* Selected Pallet Detail */}
          {selected && (
            <div className="bg-card rounded-lg border p-4 animate-fade-in">
              <h3 className="text-sm font-medium mb-3">Pallet: {selected.palletId}</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-mono">{selected.locationCode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Packages</span><span>{selected.currentPackageCount} / {selected.maxCapacity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Occupancy</span><span className="font-medium">{Math.round((selected.currentPackageCount / selected.maxCapacity) * 100)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{selected.zoneId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{selected.status}</span></div>
              </div>

              {selectedPkgs.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-2">Stored Packages (showing {selectedPkgs.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedPkgs.map(pkg => (
                      <div key={pkg.packageId} className="flex justify-between text-[10px] py-1 px-2 bg-muted rounded">
                        <span className="font-mono">{pkg.packageId}</span>
                        <span>{pkg.currency} {pkg.totalValue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shelf3DPage;
