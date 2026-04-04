import type { User, MoneyPackage, DenominationLine, Pallet, Zone, ShelfLocation, Robot, RobotTask, Approval, AuditLog, OptimizationSuggestion, Alert } from './types';

// ─── Users ───
export const mockUsers: User[] = [
  { userId: 'USR-001', name: 'Admin Chea Sokha', employeeId: 'EMP-0001', role: 'admin', email: 'admin@nbc.gov.kh', isActive: true, lastLogin: '2026-04-02T08:00:00Z' },
  { userId: 'USR-002', name: 'Op. Vann Dara', employeeId: 'EMP-0042', role: 'operator', email: 'vdara@nbc.gov.kh', isActive: true, lastLogin: '2026-04-02T07:45:00Z' },
  { userId: 'USR-003', name: 'Op. Srey Leak', employeeId: 'EMP-0043', role: 'operator', email: 'sleak@nbc.gov.kh', isActive: true, lastLogin: '2026-04-01T16:30:00Z' },
  { userId: 'USR-004', name: 'Sup. Nhem Bunthy', employeeId: 'EMP-0015', role: 'supervisor', email: 'nbunthy@nbc.gov.kh', isActive: true, lastLogin: '2026-04-02T08:10:00Z' },
  { userId: 'USR-005', name: 'Tech. Keo Rith', employeeId: 'EMP-0078', role: 'technician', email: 'krith@nbc.gov.kh', isActive: true, lastLogin: '2026-04-02T07:30:00Z' },
  { userId: 'USR-006', name: 'Op. Meas Sophea', employeeId: 'EMP-0044', role: 'operator', email: 'msophea@nbc.gov.kh', isActive: false, lastLogin: '2026-03-15T09:00:00Z' },
];

// ─── Zones ───
export const mockZones: Zone[] = [
  { zoneId: 'ZONE-A', zoneName: 'Zone A — High Value', securityClass: 'high', maxCapacity: 8, allowedTypes: 'USD, High-Value KHR', shelfCount: 4, color: '#1e3a5f' },
  { zoneId: 'ZONE-B', zoneName: 'Zone B — Medium Value', securityClass: 'medium', maxCapacity: 12, allowedTypes: 'KHR Standard', shelfCount: 6, color: '#2d5a87' },
  { zoneId: 'ZONE-C', zoneName: 'Zone C — Low Value', securityClass: 'low', maxCapacity: 10, allowedTypes: 'KHR Low Denomination', shelfCount: 5, color: '#4a7fb5' },
  { zoneId: 'ZONE-D', zoneName: 'Zone D — Mixed', securityClass: 'mixed', maxCapacity: 6, allowedTypes: 'Mixed Currency', shelfCount: 3, color: '#6b9fd4' },
];

// Helper to create denomination lines
function denom(currency: string, denomination: number, quantity: number): DenominationLine {
  return { currency, denomination, quantity, subtotal: denomination * quantity };
}

// ─── Money Packages (45 packages) ───
const pkgBase = (id: number, denoms: DenominationLine[], palletId: string, loc: string, status: MoneyPackage['status'], security: MoneyPackage['securityLevel'], date: string): MoneyPackage => ({
  packageId: `PKG-${String(id).padStart(5, '0')}`,
  qrCode: `QR-${String(id).padStart(5, '0')}-NBC`,
  denominations: denoms,
  totalValue: denoms.reduce((s, d) => s + d.subtotal, 0),
  currency: denoms[0].currency,
  palletId,
  locationCode: loc,
  status,
  securityLevel: security,
  source: ['Central Treasury', 'Branch Office Phnom Penh', 'Ministry of Finance', 'Provincial Branch'][id % 4],
  arrivalDate: date,
  registeredBy: 'USR-002',
  createdAt: date,
});

export const mockPackages: MoneyPackage[] = [
  // Pallet PAL-001 (Zone A, high value, 35 packages — nearly full)
  ...Array.from({ length: 35 }, (_, i) => pkgBase(i + 1,
    i % 3 === 0 ? [denom('USD', 100, 500), denom('USD', 50, 200)] :
    i % 3 === 1 ? [denom('USD', 100, 1000)] :
    [denom('USD', 50, 400), denom('USD', 20, 300)],
    'PAL-001', 'A-01-T-P1', 'stored', 'high', `2026-03-${String(15 + (i % 15)).padStart(2, '0')}T09:00:00Z`
  )),
  // Pallet PAL-002 (Zone A, 5 packages — nearly empty)
  ...Array.from({ length: 5 }, (_, i) => pkgBase(36 + i,
    [denom('USD', 100, 200 + i * 50)],
    'PAL-002', 'A-01-T-P2', 'stored', 'high', `2026-04-01T10:${String(i * 5).padStart(2, '0')}:00Z`
  )),
  // Pallet PAL-003 (Zone B, 20 packages — half full)
  ...Array.from({ length: 20 }, (_, i) => pkgBase(41 + i,
    i % 2 === 0 ? [denom('KHR', 50000, 100), denom('KHR', 10000, 200)] :
    [denom('KHR', 100000, 50)],
    'PAL-003', 'B-02-B-P1', 'stored', 'medium', `2026-03-${String(20 + (i % 10)).padStart(2, '0')}T11:00:00Z`
  )),
  // Pallet PAL-004 (Zone B, 40 packages — full)
  ...Array.from({ length: 40 }, (_, i) => pkgBase(61 + i,
    [denom('KHR', 50000, 80 + i * 2)],
    'PAL-004', 'B-02-T-P1', 'stored', 'medium', `2026-03-${String(1 + (i % 28)).padStart(2, '0')}T08:00:00Z`
  )),
  // Pallet PAL-005 (Zone C, 10 packages — quarter full)
  ...Array.from({ length: 10 }, (_, i) => pkgBase(101 + i,
    [denom('KHR', 1000, 500), denom('KHR', 500, 1000)],
    'PAL-005', 'C-01-B-P1', 'stored', 'low', `2026-04-01T14:${String(i * 3).padStart(2, '0')}:00Z`
  )),
  // Pallet PAL-006 (Zone C, 30 packages — 75%)
  ...Array.from({ length: 30 }, (_, i) => pkgBase(111 + i,
    [denom('KHR', 2000, 250)],
    'PAL-006', 'C-01-T-P1', 'stored', 'low', `2026-03-${String(10 + (i % 20)).padStart(2, '0')}T09:30:00Z`
  )),
  // Pallet PAL-007 (Zone D, 15 packages — mixed)
  ...Array.from({ length: 15 }, (_, i) => pkgBase(141 + i,
    [denom('USD', 20, 100), denom('KHR', 10000, 50), denom('KHR', 50000, 20)],
    'PAL-007', 'D-01-B-P2', 'stored', 'medium', `2026-03-25T10:00:00Z`
  )),
  // Some in-transit and outbound
  pkgBase(156, [denom('USD', 100, 300)], 'PAL-008', 'A-02-B-P1', 'in-transit', 'high', '2026-04-02T06:00:00Z'),
  pkgBase(157, [denom('KHR', 50000, 60)], 'PAL-008', 'A-02-B-P1', 'outbound', 'medium', '2026-04-02T06:30:00Z'),
];

// ─── Pallets ───
export const mockPallets: Pallet[] = [
  { palletId: 'PAL-001', currentPackageCount: 35, maxCapacity: 40, status: 'in-use', locationCode: 'A-01-T-P1', zoneId: 'ZONE-A', shelfNumber: 1, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-001').map(p => p.packageId) },
  { palletId: 'PAL-002', currentPackageCount: 5, maxCapacity: 40, status: 'in-use', locationCode: 'A-01-T-P2', zoneId: 'ZONE-A', shelfNumber: 1, tier: 'top', slot: 'P2', packages: mockPackages.filter(p => p.palletId === 'PAL-002').map(p => p.packageId) },
  { palletId: 'PAL-003', currentPackageCount: 20, maxCapacity: 40, status: 'in-use', locationCode: 'B-02-B-P1', zoneId: 'ZONE-B', shelfNumber: 2, tier: 'bottom', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-003').map(p => p.packageId) },
  { palletId: 'PAL-004', currentPackageCount: 40, maxCapacity: 40, status: 'in-use', locationCode: 'B-02-T-P1', zoneId: 'ZONE-B', shelfNumber: 2, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-004').map(p => p.packageId) },
  { palletId: 'PAL-005', currentPackageCount: 10, maxCapacity: 40, status: 'in-use', locationCode: 'C-01-B-P1', zoneId: 'ZONE-C', shelfNumber: 1, tier: 'bottom', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-005').map(p => p.packageId) },
  { palletId: 'PAL-006', currentPackageCount: 30, maxCapacity: 40, status: 'in-use', locationCode: 'C-01-T-P1', zoneId: 'ZONE-C', shelfNumber: 1, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-006').map(p => p.packageId) },
  { palletId: 'PAL-007', currentPackageCount: 15, maxCapacity: 40, status: 'in-use', locationCode: 'D-01-B-P2', zoneId: 'ZONE-D', shelfNumber: 1, tier: 'bottom', slot: 'P2', packages: mockPackages.filter(p => p.palletId === 'PAL-007').map(p => p.packageId) },
  { palletId: 'PAL-008', currentPackageCount: 2, maxCapacity: 40, status: 'in-transit', locationCode: 'A-02-B-P1', zoneId: 'ZONE-A', shelfNumber: 2, tier: 'bottom', slot: 'P1', packages: ['PKG-00156', 'PKG-00157'] },
  { palletId: 'PAL-009', currentPackageCount: 0, maxCapacity: 40, status: 'available', locationCode: 'B-03-T-P2', zoneId: 'ZONE-B', shelfNumber: 3, tier: 'top', slot: 'P2', packages: [] },
  { palletId: 'PAL-010', currentPackageCount: 0, maxCapacity: 40, status: 'available', locationCode: 'C-02-B-P2', zoneId: 'ZONE-C', shelfNumber: 2, tier: 'bottom', slot: 'P2', packages: [] },
  { palletId: 'PAL-011', currentPackageCount: 0, maxCapacity: 40, status: 'maintenance', locationCode: 'D-01-T-P1', zoneId: 'ZONE-D', shelfNumber: 1, tier: 'top', slot: 'P1', packages: [] },
  { palletId: 'PAL-012', currentPackageCount: 0, maxCapacity: 40, status: 'available', locationCode: 'A-02-T-P2', zoneId: 'ZONE-A', shelfNumber: 2, tier: 'top', slot: 'P2', packages: [] },
];

// ─── Shelf Locations ───
export const mockShelfLocations: ShelfLocation[] = [];
const zones = ['A', 'B', 'C', 'D'];
const shelvesPerZone = [4, 6, 5, 3];
zones.forEach((z, zi) => {
  for (let s = 1; s <= shelvesPerZone[zi]; s++) {
    for (const tier of ['top', 'bottom'] as const) {
      for (const slot of ['P1', 'P2'] as const) {
        const locId = `${z}-${String(s).padStart(2, '0')}-${tier === 'top' ? 'T' : 'B'}-${slot}`;
        const pallet = mockPallets.find(p => p.locationCode === locId);
        mockShelfLocations.push({
          locationId: locId,
          zoneId: `ZONE-${z}`,
          shelfNumber: s,
          tier,
          slot,
          palletId: pallet?.palletId ?? null,
          isAvailable: !pallet,
          mapX: zi * 200 + s * 60,
          mapY: (tier === 'top' ? 80 : 180) + (slot === 'P2' ? 40 : 0),
        });
      }
    }
  }
});

// ─── Robots ───
export const mockRobots: Robot[] = [
  { robotId: 'ROB-001', model: 'ForkMaster 3000', maxLoadKg: 500, batteryLevel: 78, currentSpeed: 1.2, currentLoadKg: 120, temperature: 42, locationX: 320, locationY: 150, status: 'active', errorCode: null, idleTimeSec: 0, commEndpoint: 'ws://robot-001.local:8080', lastMaintenance: '2026-03-20T10:00:00Z', totalTasksCompleted: 342 },
  { robotId: 'ROB-002', model: 'ForkMaster 3000', maxLoadKg: 500, batteryLevel: 45, currentSpeed: 0, currentLoadKg: 0, temperature: 38, locationX: 100, locationY: 300, status: 'idle', errorCode: null, idleTimeSec: 1200, commEndpoint: 'ws://robot-002.local:8080', lastMaintenance: '2026-03-25T14:00:00Z', totalTasksCompleted: 218 },
  { robotId: 'ROB-003', model: 'ForkMaster 5000X', maxLoadKg: 750, batteryLevel: 12, currentSpeed: 0, currentLoadKg: 0, temperature: 55, locationX: 450, locationY: 250, status: 'error', errorCode: 'ERR-BATT-LOW', idleTimeSec: 3600, commEndpoint: 'ws://robot-003.local:8080', lastMaintenance: '2026-02-28T09:00:00Z', totalTasksCompleted: 156 },
];

// ─── Robot Tasks ───
export const mockTasks: RobotTask[] = [
  { taskId: 'TSK-00001', taskType: 'store', robotId: 'ROB-001', palletId: 'PAL-008', sourceLocation: 'Inbound Area', targetLocation: 'A-02-B-P1', status: 'in-progress', createdBy: 'USR-002', approvedBy: null, createdAt: '2026-04-02T08:30:00Z', startedAt: '2026-04-02T08:32:00Z', completedAt: null, completionTimeSec: null },
  { taskId: 'TSK-00002', taskType: 'retrieve', robotId: 'ROB-002', palletId: 'PAL-004', sourceLocation: 'B-02-T-P1', targetLocation: 'Outbound Area', status: 'queued', createdBy: 'USR-002', approvedBy: 'USR-004', createdAt: '2026-04-02T08:15:00Z', startedAt: null, completedAt: null, completionTimeSec: null },
  { taskId: 'TSK-00003', taskType: 'store', robotId: 'ROB-001', palletId: 'PAL-001', sourceLocation: 'Inbound Area', targetLocation: 'A-01-T-P1', status: 'completed', createdBy: 'USR-002', approvedBy: null, createdAt: '2026-04-01T14:00:00Z', startedAt: '2026-04-01T14:02:00Z', completedAt: '2026-04-01T14:08:00Z', completionTimeSec: 360 },
  { taskId: 'TSK-00004', taskType: 'reorganize', robotId: null, palletId: 'PAL-005', sourceLocation: 'C-01-B-P1', targetLocation: 'C-02-B-P1', status: 'queued', createdBy: 'USR-004', approvedBy: 'USR-004', createdAt: '2026-04-02T07:00:00Z', startedAt: null, completedAt: null, completionTimeSec: null },
  { taskId: 'TSK-00005', taskType: 'retrieve', robotId: 'ROB-001', palletId: 'PAL-003', sourceLocation: 'B-02-B-P1', targetLocation: 'Outbound Area', status: 'completed', createdBy: 'USR-003', approvedBy: 'USR-004', createdAt: '2026-04-01T16:00:00Z', startedAt: '2026-04-01T16:05:00Z', completedAt: '2026-04-01T16:12:00Z', completionTimeSec: 420 },
];

// ─── Approvals ───
export const mockApprovals: Approval[] = [
  { approvalId: 'APR-001', type: 'stock-out', requestedBy: 'USR-002', requestedAt: '2026-04-02T08:00:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'Scheduled disbursement to Provincial Branch Siem Reap', details: { packages: 5, totalValue: 250000, denomination: 'USD 100' } },
  { approvalId: 'APR-002', type: 'stock-out', requestedBy: 'USR-003', requestedAt: '2026-04-02T07:30:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'Emergency cash request from Ministry of Finance', details: { packages: 10, totalValue: 50000000, denomination: 'KHR 50000' } },
  { approvalId: 'APR-003', type: 'reorganization', requestedBy: 'SYSTEM', requestedAt: '2026-04-01T23:00:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'End-of-day consolidation: merge PAL-005 into PAL-003', details: { source: 'PAL-005', target: 'PAL-003', spaceSaved: '1 pallet slot' } },
  { approvalId: 'APR-004', type: 'stock-out', requestedBy: 'USR-002', requestedAt: '2026-04-01T15:00:00Z', status: 'approved', reviewedBy: 'USR-004', reviewedAt: '2026-04-01T15:10:00Z', reason: 'Routine transfer to Central Treasury', details: { packages: 3, totalValue: 150000 } },
  { approvalId: 'APR-005', type: 'exception', requestedBy: 'USR-002', requestedAt: '2026-04-02T09:00:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'Manual override: pallet PAL-011 requires reassignment due to maintenance', details: { palletId: 'PAL-011' } },
];

// ─── Optimization Suggestions ───
export const mockOptimizations: OptimizationSuggestion[] = [
  { id: 'OPT-001', title: 'Consolidate KHR packages on PAL-005 into PAL-003', description: 'PAL-005 has only 10 packages (25% capacity) of similar denomination to PAL-003 (50% capacity). Merging would free one pallet slot in Zone C.', sourcePallet: 'PAL-005', sourceLocation: 'C-01-B-P1', targetPallet: 'PAL-003', targetLocation: 'B-02-B-P1', benefit: 'Frees 1 pallet slot, reduces fragmentation', riskLevel: 'low', approvalRequired: true, estimatedSpaceSaved: '1 pallet slot (40 pkg capacity)', estimatedTravelReduction: '12%', status: 'pending', createdAt: '2026-04-01T23:00:00Z' },
  { id: 'OPT-002', title: 'Move older USD packages closer to outbound', description: 'PAL-001 contains 35 high-value USD packages stored since March 15. Relocating to A-02-T-P2 (closer to exit) would improve FIFO retrieval time.', sourcePallet: 'PAL-001', sourceLocation: 'A-01-T-P1', targetPallet: 'PAL-001', targetLocation: 'A-02-T-P2', benefit: 'Reduces retrieval time by ~20 seconds per stock-out', riskLevel: 'medium', approvalRequired: true, estimatedSpaceSaved: 'N/A (relocation only)', estimatedTravelReduction: '18%', status: 'pending', createdAt: '2026-04-01T23:00:00Z' },
  { id: 'OPT-003', title: 'Rebalance Zone B shelf load', description: 'Shelf B-02 has one full pallet (40 pkgs) and one half pallet (20 pkgs). Suggest distributing 10 packages from PAL-004 to PAL-009 on B-03 for better balance.', sourcePallet: 'PAL-004', sourceLocation: 'B-02-T-P1', targetPallet: 'PAL-009', targetLocation: 'B-03-T-P2', benefit: 'Improves shelf weight distribution, easier access', riskLevel: 'low', approvalRequired: true, estimatedSpaceSaved: 'Improves access to 10 packages', estimatedTravelReduction: '8%', status: 'pending', createdAt: '2026-04-01T23:00:00Z' },
  { id: 'OPT-004', title: 'Schedule PAL-011 maintenance return', description: 'PAL-011 has been in maintenance for 5 days. If repairs complete today, it can be returned to Zone D shelf D-01-T-P1.', sourcePallet: 'PAL-011', sourceLocation: 'Maintenance Area', targetPallet: 'PAL-011', targetLocation: 'D-01-T-P1', benefit: 'Restores 1 pallet capacity to Zone D', riskLevel: 'low', approvalRequired: false, estimatedSpaceSaved: '1 pallet slot (40 pkg capacity)', estimatedTravelReduction: 'N/A', status: 'pending', createdAt: '2026-04-02T06:00:00Z' },
];

// ─── Audit Logs ───
export const mockAuditLogs: AuditLog[] = [
  { logId: 1, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'STOCK_IN', entityType: 'Package', entityId: 'PKG-00156', details: 'Registered incoming USD package from Central Treasury', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:30:00Z' },
  { logId: 2, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'PALLET_ASSIGN', entityType: 'Pallet', entityId: 'PAL-008', details: 'Assigned PKG-00156 to PAL-008', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:31:00Z' },
  { logId: 3, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'QR_PRINT', entityType: 'Package', entityId: 'PKG-00156', details: 'QR label printed successfully', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:31:30Z' },
  { logId: 4, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'ROBOT_TASK_CREATE', entityType: 'Task', entityId: 'TSK-00001', details: 'Created storage task for PAL-008 to A-02-B-P1', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:32:00Z' },
  { logId: 5, userId: 'USR-004', userName: 'Sup. Nhem Bunthy', action: 'STOCK_OUT_APPROVE', entityType: 'Approval', entityId: 'APR-004', details: 'Approved stock-out request for 3 packages, total value $150,000', ipAddress: '10.0.1.15', timestamp: '2026-04-01T15:10:00Z' },
  { logId: 6, userId: 'USR-003', userName: 'Op. Srey Leak', action: 'STOCK_OUT_REQUEST', entityType: 'Approval', entityId: 'APR-002', details: 'Submitted stock-out request: 10 KHR 50000 packages for Ministry of Finance', ipAddress: '10.0.1.43', timestamp: '2026-04-02T07:30:00Z' },
  { logId: 7, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'USER_DEACTIVATE', entityType: 'User', entityId: 'USR-006', details: 'Deactivated user Op. Meas Sophea', ipAddress: '10.0.1.10', timestamp: '2026-03-15T09:30:00Z' },
  { logId: 8, userId: 'SYSTEM', userName: 'System', action: 'OPTIMIZATION_GENERATE', entityType: 'Optimization', entityId: 'OPT-001', details: 'Generated end-of-day consolidation suggestion for PAL-005', ipAddress: 'system', timestamp: '2026-04-01T23:00:00Z' },
  { logId: 9, userId: 'USR-005', userName: 'Tech. Keo Rith', action: 'ROBOT_ALERT_ACK', entityType: 'Robot', entityId: 'ROB-003', details: 'Acknowledged low battery alert for ROB-003', ipAddress: '10.0.1.78', timestamp: '2026-04-02T07:35:00Z' },
  { logId: 10, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'OUTBOUND_VERIFY', entityType: 'Package', entityId: 'PKG-00050', details: 'Verified outbound package at exit door — matched approved request APR-004', ipAddress: '10.0.1.42', timestamp: '2026-04-01T16:15:00Z' },
  { logId: 11, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'ZONE_CONFIG', entityType: 'Zone', entityId: 'ZONE-D', details: 'Updated Zone D security classification to Mixed', ipAddress: '10.0.1.10', timestamp: '2026-03-28T11:00:00Z' },
  { logId: 12, userId: 'USR-005', userName: 'Tech. Keo Rith', action: 'ROBOT_MAINTENANCE', entityType: 'Robot', entityId: 'ROB-003', details: 'Scheduled maintenance for ROB-003 — battery replacement required', ipAddress: '10.0.1.78', timestamp: '2026-04-02T07:40:00Z' },
];

// ─── Alerts ───
export const mockAlerts: Alert[] = [
  { id: 'ALR-001', type: 'error', title: 'Robot ROB-003 Low Battery', message: 'Battery level critical at 12%. Robot stopped. Immediate maintenance required.', source: 'ROB-003', timestamp: '2026-04-02T07:30:00Z', acknowledged: true },
  { id: 'ALR-002', type: 'warning', title: 'Robot ROB-002 Idle Too Long', message: 'ROB-002 has been idle for 20 minutes. Consider assigning pending tasks.', source: 'ROB-002', timestamp: '2026-04-02T08:10:00Z', acknowledged: false },
  { id: 'ALR-003', type: 'warning', title: 'ROB-003 Temperature Warning', message: 'Internal temperature at 55°C exceeds threshold of 50°C.', source: 'ROB-003', timestamp: '2026-04-02T07:28:00Z', acknowledged: true },
  { id: 'ALR-004', type: 'info', title: 'End-of-Day Optimization Ready', message: '4 optimization suggestions generated. Supervisor review required.', source: 'System', timestamp: '2026-04-01T23:01:00Z', acknowledged: false },
  { id: 'ALR-005', type: 'warning', title: 'Pallet PAL-011 Overdue Maintenance', message: 'PAL-011 has been in maintenance for 5 days — exceeds normal 3-day threshold.', source: 'System', timestamp: '2026-04-02T06:00:00Z', acknowledged: false },
];

// ─── Dashboard Stats ───
export const dashboardStats = {
  totalPackages: mockPackages.length,
  totalStoredValue: mockPackages.reduce((s, p) => s + p.totalValue, 0),
  stockInToday: 2,
  stockOutToday: 1,
  activeRobotTasks: mockTasks.filter(t => ['in-progress', 'assigned'].includes(t.status)).length,
  pendingApprovals: mockApprovals.filter(a => a.status === 'pending').length,
  lowBatteryAlerts: mockRobots.filter(r => r.batteryLevel < 20).length,
  zoneOccupancy: mockZones.map(z => ({
    zone: z.zoneName,
    used: mockPallets.filter(p => p.zoneId === z.zoneId && p.status === 'in-use').length,
    total: z.maxCapacity * 4, // 4 pallet slots per shelf
  })),
};
