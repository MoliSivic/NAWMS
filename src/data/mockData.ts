import type { User, MoneyPackage, DenominationLine, Pallet, Zone, ShelfLocation, Robot, RobotTask, Approval, AuditLog, OptimizationSuggestion, Alert, StockMovement } from './types';

// ─── Users ───
export const mockUsers: User[] = [
  { userId: 'USR-001', name: 'Admin Chea Sokha', employeeId: 'EMP-0001', role: 'admin', email: 'admin@nbc.gov.kh', isActive: true, lastLogin: '2026-04-02T08:00:00Z' },
  { userId: 'USR-002', name: 'Op. Vann Dara', employeeId: 'EMP-0042', role: 'operator', email: 'vdara@nbc.gov.kh', isActive: true, lastLogin: '2026-04-02T07:45:00Z' },
  { userId: 'USR-003', name: 'Op. Srey Leak', employeeId: 'EMP-0043', role: 'operator', email: 'sleak@nbc.gov.kh', isActive: true, lastLogin: '2026-04-01T16:30:00Z' },
  { userId: 'USR-006', name: 'Op. Meas Sophea', employeeId: 'EMP-0044', role: 'operator', email: 'msophea@nbc.gov.kh', isActive: false, lastLogin: '2026-03-15T09:00:00Z' },
];

// ─── Zones ───
export const mockZones: Zone[] = [
  { zoneId: 'ZONE-A', zoneName: 'Zone A — High Value', securityClass: 'high', maxCapacity: 8, allowedTypes: '50000, 100000, 200000 KHR', shelfCount: 6, color: '#1e3a5f' },
  { zoneId: 'ZONE-B', zoneName: 'Zone B — Medium Value', securityClass: 'medium', maxCapacity: 12, allowedTypes: '5000, 10000, 20000 KHR', shelfCount: 8, color: '#2d5a87' },
  { zoneId: 'ZONE-C', zoneName: 'Zone C — Low Value', securityClass: 'low', maxCapacity: 8, allowedTypes: '500, 1000, 2000 KHR', shelfCount: 4, color: '#4a7fb5' },
  { zoneId: 'ZONE-D', zoneName: 'Zone D — Mixed', securityClass: 'mixed', maxCapacity: 6, allowedTypes: '100, 200 KHR', shelfCount: 3, color: '#6b9fd4' },
];

// Helper to create denomination lines
function denom(currency: string, denomination: number, quantity: number): DenominationLine {
  return { currency, denomination, quantity, subtotal: denomination * quantity };
}

// ─── Money Packages (654 packages) ───
const pkgBase = (id: number, denoms: DenominationLine[], palletId: string, loc: string, status: MoneyPackage['status'], security: MoneyPackage['securityLevel'], date: string): MoneyPackage => ({
  packageId: `PKG-${String(id).padStart(5, '0')}`,
  qrCode: `QR-${String(id).padStart(5, '0')}-NBC`,
  productType: 'Money',
  denominations: denoms,
  totalValue: denoms.reduce((s, d) => s + d.subtotal, 0),
  currency: denoms[0].currency,
  palletId,
  locationCode: loc,
  status,
  securityLevel: security,
  sealStatus: 'sealed',
  source: ['Central Treasury', 'Branch Office Phnom Penh', 'Ministry of Finance', 'Provincial Branch'][id % 4],
  arrivalDate: date,
  releasedDate: status === 'released' ? date : null,
  registeredBy: 'USR-002',
  createdAt: date,
  notes: '',
});

const tierCoverageConfigs = [
  { palletId: 'PAL-023', locationCode: 'A-01-B-P1', zoneId: 'ZONE-A', shelfNumber: 1, tier: 'bottom' as const, slot: 'P1' as const, security: 'high' as const, packageCount: 14 },
  { palletId: 'PAL-024', locationCode: 'A-03-B-P2', zoneId: 'ZONE-A', shelfNumber: 3, tier: 'bottom' as const, slot: 'P2' as const, security: 'high' as const, packageCount: 12 },
  { palletId: 'PAL-025', locationCode: 'A-04-T-P1', zoneId: 'ZONE-A', shelfNumber: 4, tier: 'top' as const, slot: 'P1' as const, security: 'high' as const, packageCount: 16 },
  { palletId: 'PAL-026', locationCode: 'A-05-B-P1', zoneId: 'ZONE-A', shelfNumber: 5, tier: 'bottom' as const, slot: 'P1' as const, security: 'high' as const, packageCount: 18 },
  { palletId: 'PAL-027', locationCode: 'A-06-T-P2', zoneId: 'ZONE-A', shelfNumber: 6, tier: 'top' as const, slot: 'P2' as const, security: 'high' as const, packageCount: 15 },
  { palletId: 'PAL-028', locationCode: 'B-01-B-P1', zoneId: 'ZONE-B', shelfNumber: 1, tier: 'bottom' as const, slot: 'P1' as const, security: 'medium' as const, packageCount: 13 },
  { palletId: 'PAL-029', locationCode: 'B-03-B-P1', zoneId: 'ZONE-B', shelfNumber: 3, tier: 'bottom' as const, slot: 'P1' as const, security: 'medium' as const, packageCount: 12 },
  { palletId: 'PAL-030', locationCode: 'B-04-T-P2', zoneId: 'ZONE-B', shelfNumber: 4, tier: 'top' as const, slot: 'P2' as const, security: 'medium' as const, packageCount: 18 },
  { palletId: 'PAL-031', locationCode: 'B-05-T-P1', zoneId: 'ZONE-B', shelfNumber: 5, tier: 'top' as const, slot: 'P1' as const, security: 'medium' as const, packageCount: 16 },
  { palletId: 'PAL-032', locationCode: 'B-05-B-P2', zoneId: 'ZONE-B', shelfNumber: 5, tier: 'bottom' as const, slot: 'P2' as const, security: 'medium' as const, packageCount: 14 },
  { palletId: 'PAL-033', locationCode: 'B-06-T-P2', zoneId: 'ZONE-B', shelfNumber: 6, tier: 'top' as const, slot: 'P2' as const, security: 'medium' as const, packageCount: 17 },
  { palletId: 'PAL-034', locationCode: 'B-06-B-P1', zoneId: 'ZONE-B', shelfNumber: 6, tier: 'bottom' as const, slot: 'P1' as const, security: 'medium' as const, packageCount: 15 },
  { palletId: 'PAL-035', locationCode: 'B-07-B-P2', zoneId: 'ZONE-B', shelfNumber: 7, tier: 'bottom' as const, slot: 'P2' as const, security: 'medium' as const, packageCount: 18 },
  { palletId: 'PAL-036', locationCode: 'B-08-T-P1', zoneId: 'ZONE-B', shelfNumber: 8, tier: 'top' as const, slot: 'P1' as const, security: 'medium' as const, packageCount: 16 },
  { palletId: 'PAL-037', locationCode: 'C-03-T-P1', zoneId: 'ZONE-C', shelfNumber: 3, tier: 'top' as const, slot: 'P1' as const, security: 'low' as const, packageCount: 11 },
  { palletId: 'PAL-038', locationCode: 'C-03-B-P2', zoneId: 'ZONE-C', shelfNumber: 3, tier: 'bottom' as const, slot: 'P2' as const, security: 'low' as const, packageCount: 13 },
  { palletId: 'PAL-039', locationCode: 'C-04-T-P2', zoneId: 'ZONE-C', shelfNumber: 4, tier: 'top' as const, slot: 'P2' as const, security: 'low' as const, packageCount: 12 },
  { palletId: 'PAL-040', locationCode: 'C-04-B-P1', zoneId: 'ZONE-C', shelfNumber: 4, tier: 'bottom' as const, slot: 'P1' as const, security: 'low' as const, packageCount: 14 },
  { palletId: 'PAL-041', locationCode: 'D-02-B-P2', zoneId: 'ZONE-D', shelfNumber: 2, tier: 'bottom' as const, slot: 'P2' as const, security: 'medium' as const, packageCount: 17 },
  { palletId: 'PAL-042', locationCode: 'D-03-T-P1', zoneId: 'ZONE-D', shelfNumber: 3, tier: 'top' as const, slot: 'P1' as const, security: 'medium' as const, packageCount: 19 },
  { palletId: 'PAL-043', locationCode: 'D-03-B-P2', zoneId: 'ZONE-D', shelfNumber: 3, tier: 'bottom' as const, slot: 'P2' as const, security: 'medium' as const, packageCount: 16 },
];

function getPalletSackConfig(palletId: string, locationCode: string): DenominationLine[] {
  const zoneLetter = locationCode.split('-')[0];
  const seed = Array.from(palletId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  
  let denomValue = 100000;
  if (zoneLetter === 'A') {
    denomValue = [200000, 100000, 50000][seed % 3];
  } else if (zoneLetter === 'B') {
    denomValue = [20000, 10000, 5000][seed % 3];
  } else if (zoneLetter === 'C') {
    denomValue = [2000, 1000, 500][seed % 3];
  } else if (zoneLetter === 'D') {
    denomValue = [200, 100][seed % 2];
  }
  
  const quantityMultipliers = [10, 25, 50, 100];
  const quantity = quantityMultipliers[seed % 4];
  
  return [denom('KHR', denomValue, quantity)];
}

let nextTierCoveragePackageId = 339;
const tierCoveragePackages: MoneyPackage[] = tierCoverageConfigs.flatMap((cfg, cfgIdx) =>
  Array.from({ length: cfg.packageCount }, (_, pkgIdx) => pkgBase(
    nextTierCoveragePackageId++,
    getPalletSackConfig(cfg.palletId, cfg.locationCode),
    cfg.palletId,
    cfg.locationCode,
    'stored',
    cfg.security,
    `2026-04-${String(1 + ((cfgIdx + pkgIdx) % 5)).padStart(2, '0')}T${String(8 + (cfgIdx % 9)).padStart(2, '0')}:${String((pkgIdx % 6) * 10).padStart(2, '0')}:00Z`,
  )),
);

const warehouseZoneLetters = ['A', 'B', 'C', 'D'] as const;
const warehouseShelvesPerZone = [6, 8, 4, 3] as const;
const warehouseRackSlots = [
  { tier: 'top' as const, slot: 'P1' as const },
  { tier: 'top' as const, slot: 'P2' as const },
  { tier: 'bottom' as const, slot: 'P1' as const },
  { tier: 'bottom' as const, slot: 'P2' as const },
];

export const mockPackages: MoneyPackage[] = [
  ...Array.from({ length: 35 }, (_, i) => pkgBase(i + 1, getPalletSackConfig('PAL-001', 'A-01-T-P1'), 'PAL-001', 'A-01-T-P1', 'stored', 'high', `2026-03-${String(15 + (i % 15)).padStart(2, '0')}T09:00:00Z`)),
  ...Array.from({ length: 5 }, (_, i) => pkgBase(36 + i, getPalletSackConfig('PAL-002', 'A-01-T-P2'), 'PAL-002', 'A-01-T-P2', 'stored', 'high', `2026-04-01T10:${String(i * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 20 }, (_, i) => pkgBase(41 + i, getPalletSackConfig('PAL-003', 'B-02-B-P1'), 'PAL-003', 'B-02-B-P1', 'stored', 'medium', `2026-03-${String(20 + (i % 10)).padStart(2, '0')}T11:00:00Z`)),
  ...Array.from({ length: 40 }, (_, i) => pkgBase(61 + i, getPalletSackConfig('PAL-004', 'B-02-T-P1'), 'PAL-004', 'B-02-T-P1', 'stored', 'medium', `2026-03-${String(1 + (i % 28)).padStart(2, '0')}T08:00:00Z`)),
  ...Array.from({ length: 10 }, (_, i) => pkgBase(101 + i, getPalletSackConfig('PAL-005', 'C-01-B-P1'), 'PAL-005', 'C-01-B-P1', 'stored', 'low', `2026-04-01T14:${String(i * 3).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 30 }, (_, i) => pkgBase(111 + i, getPalletSackConfig('PAL-006', 'C-01-T-P1'), 'PAL-006', 'C-01-T-P1', 'stored', 'low', `2026-03-${String(10 + (i % 20)).padStart(2, '0')}T09:30:00Z`)),
  ...Array.from({ length: 15 }, (_, i) => pkgBase(141 + i, getPalletSackConfig('PAL-007', 'D-01-B-P2'), 'PAL-007', 'D-01-B-P2', 'stored', 'medium', `2026-03-25T10:00:00Z`)),
  pkgBase(156, getPalletSackConfig('PAL-008', 'A-02-B-P1'), 'PAL-008', 'A-02-B-P1', 'in-transit', 'high', '2026-04-02T06:00:00Z'),
  pkgBase(157, getPalletSackConfig('PAL-008', 'A-02-B-P1'), 'PAL-008', 'A-02-B-P1', 'outbound', 'medium', '2026-04-02T06:30:00Z'),
  ...Array.from({ length: 18 }, (_, i) => pkgBase(158 + i, getPalletSackConfig('PAL-013', 'A-03-T-P1'), 'PAL-013', 'A-03-T-P1', 'stored', 'high', `2026-04-${String(1 + (i % 4)).padStart(2, '0')}T09:${String((i % 6) * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 24 }, (_, i) => pkgBase(176 + i, getPalletSackConfig('PAL-014', 'A-05-T-P2'), 'PAL-014', 'A-05-T-P2', 'stored', 'high', `2026-03-${String(20 + (i % 8)).padStart(2, '0')}T10:${String((i % 6) * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 12 }, (_, i) => pkgBase(200 + i, getPalletSackConfig('PAL-015', 'A-06-B-P1'), 'PAL-015', 'A-06-B-P1', 'stored', 'high', `2026-04-${String(2 + (i % 3)).padStart(2, '0')}T11:${String((i % 4) * 10).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 16 }, (_, i) => pkgBase(212 + i, getPalletSackConfig('PAL-016', 'B-01-T-P2'), 'PAL-016', 'B-01-T-P2', 'stored', 'medium', `2026-03-${String(12 + (i % 10)).padStart(2, '0')}T08:${String((i % 6) * 6).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 28 }, (_, i) => pkgBase(228 + i, getPalletSackConfig('PAL-017', 'B-04-B-P1'), 'PAL-017', 'B-04-B-P1', 'stored', 'medium', `2026-03-${String(5 + (i % 12)).padStart(2, '0')}T13:${String((i % 6) * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 32 }, (_, i) => pkgBase(256 + i, getPalletSackConfig('PAL-018', 'B-07-T-P1'), 'PAL-018', 'B-07-T-P1', 'stored', 'medium', `2026-03-${String(1 + (i % 14)).padStart(2, '0')}T07:${String((i % 6) * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 14 }, (_, i) => pkgBase(288 + i, getPalletSackConfig('PAL-019', 'B-08-B-P2'), 'PAL-019', 'B-08-B-P2', 'stored', 'medium', `2026-04-${String(1 + (i % 5)).padStart(2, '0')}T15:${String((i % 6) * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 22 }, (_, i) => pkgBase(302 + i, getPalletSackConfig('PAL-020', 'D-02-T-P1'), 'PAL-020', 'D-02-T-P1', 'stored', 'medium', `2026-03-${String(18 + (i % 7)).padStart(2, '0')}T12:${String((i % 6) * 5).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 9 }, (_, i) => pkgBase(324 + i, getPalletSackConfig('PAL-021', 'C-02-T-P1'), 'PAL-021', 'C-02-T-P1', 'stored', 'low', `2026-04-${String(1 + (i % 3)).padStart(2, '0')}T16:${String((i % 3) * 10).padStart(2, '0')}:00Z`)),
  ...Array.from({ length: 6 }, (_, i) => pkgBase(333 + i, getPalletSackConfig('PAL-022', 'A-04-B-P2'), 'PAL-022', 'A-04-B-P2', 'stored', 'high', `2026-04-${String(1 + i).padStart(2, '0')}T17:00:00Z`)),
  ...tierCoveragePackages,
];

// ─── Pallets ───
const seededPallets: Pallet[] = [
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
  { palletId: 'PAL-013', currentPackageCount: 18, maxCapacity: 40, status: 'in-use', locationCode: 'A-03-T-P1', zoneId: 'ZONE-A', shelfNumber: 3, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-013').map(p => p.packageId) },
  { palletId: 'PAL-014', currentPackageCount: 24, maxCapacity: 40, status: 'in-use', locationCode: 'A-05-T-P2', zoneId: 'ZONE-A', shelfNumber: 5, tier: 'top', slot: 'P2', packages: mockPackages.filter(p => p.palletId === 'PAL-014').map(p => p.packageId) },
  { palletId: 'PAL-015', currentPackageCount: 12, maxCapacity: 40, status: 'in-use', locationCode: 'A-06-B-P1', zoneId: 'ZONE-A', shelfNumber: 6, tier: 'bottom', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-015').map(p => p.packageId) },
  { palletId: 'PAL-016', currentPackageCount: 16, maxCapacity: 40, status: 'in-use', locationCode: 'B-01-T-P2', zoneId: 'ZONE-B', shelfNumber: 1, tier: 'top', slot: 'P2', packages: mockPackages.filter(p => p.palletId === 'PAL-016').map(p => p.packageId) },
  { palletId: 'PAL-017', currentPackageCount: 28, maxCapacity: 40, status: 'in-use', locationCode: 'B-04-B-P1', zoneId: 'ZONE-B', shelfNumber: 4, tier: 'bottom', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-017').map(p => p.packageId) },
  { palletId: 'PAL-018', currentPackageCount: 32, maxCapacity: 40, status: 'in-use', locationCode: 'B-07-T-P1', zoneId: 'ZONE-B', shelfNumber: 7, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-018').map(p => p.packageId) },
  { palletId: 'PAL-019', currentPackageCount: 14, maxCapacity: 40, status: 'in-use', locationCode: 'B-08-B-P2', zoneId: 'ZONE-B', shelfNumber: 8, tier: 'bottom', slot: 'P2', packages: mockPackages.filter(p => p.palletId === 'PAL-019').map(p => p.packageId) },
  { palletId: 'PAL-020', currentPackageCount: 22, maxCapacity: 40, status: 'in-use', locationCode: 'D-02-T-P1', zoneId: 'ZONE-D', shelfNumber: 2, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-020').map(p => p.packageId) },
  { palletId: 'PAL-021', currentPackageCount: 9, maxCapacity: 40, status: 'in-use', locationCode: 'C-02-T-P1', zoneId: 'ZONE-C', shelfNumber: 2, tier: 'top', slot: 'P1', packages: mockPackages.filter(p => p.palletId === 'PAL-021').map(p => p.packageId) },
  { palletId: 'PAL-022', currentPackageCount: 6, maxCapacity: 40, status: 'in-use', locationCode: 'A-04-B-P2', zoneId: 'ZONE-A', shelfNumber: 4, tier: 'bottom', slot: 'P2', packages: mockPackages.filter(p => p.palletId === 'PAL-022').map(p => p.packageId) },
  ...tierCoverageConfigs.map(cfg => ({
    palletId: cfg.palletId,
    currentPackageCount: cfg.packageCount,
    maxCapacity: 40,
    status: 'in-use' as const,
    locationCode: cfg.locationCode,
    zoneId: cfg.zoneId,
    shelfNumber: cfg.shelfNumber,
    tier: cfg.tier,
    slot: cfg.slot,
    packages: mockPackages.filter(p => p.palletId === cfg.palletId).map(p => p.packageId),
  })),
];

const occupiedLocationCodes = new Set(seededPallets.map(p => p.locationCode));
let nextGeneratedPalletNumber = Math.max(
  ...seededPallets.map(p => Number.parseInt(p.palletId.replace('PAL-', ''), 10)),
) + 1;

const generatedPlaceholderPallets: Pallet[] = warehouseZoneLetters.flatMap((zoneLetter, zoneIndex) =>
  Array.from({ length: warehouseShelvesPerZone[zoneIndex] }, (_, shelfOffset) => shelfOffset + 1).flatMap(shelfNumber =>
    warehouseRackSlots.flatMap(({ tier, slot }) => {
      const locationCode = `${zoneLetter}-${String(shelfNumber).padStart(2, '0')}-${tier === 'top' ? 'T' : 'B'}-${slot}`;
      if (occupiedLocationCodes.has(locationCode)) return [];

      const palletId = `PAL-${String(nextGeneratedPalletNumber++).padStart(3, '0')}`;
      return [{
        palletId,
        currentPackageCount: 0,
        maxCapacity: 40,
        status: 'available' as const,
        locationCode,
        zoneId: `ZONE-${zoneLetter}`,
        shelfNumber,
        tier,
        slot,
        packages: [],
      }];
    }),
  ),
);

export const mockPallets: Pallet[] = [...seededPallets, ...generatedPlaceholderPallets];

// ─── Shelf Locations ───
export const mockShelfLocations: ShelfLocation[] = [];
warehouseZoneLetters.forEach((z, zi) => {
  for (let s = 1; s <= warehouseShelvesPerZone[zi]; s++) {
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
  { robotId: 'ROB-002', model: 'ForkMaster 3000', maxLoadKg: 500, batteryLevel: 85, currentSpeed: 1.2, currentLoadKg: 0, temperature: 38, locationX: 100, locationY: 300, status: 'active', errorCode: null, idleTimeSec: 0, commEndpoint: 'ws://robot-002.local:8080', lastMaintenance: '2026-03-25T14:00:00Z', totalTasksCompleted: 218 },
];

// ─── Robot Tasks ───
export const mockTasks: RobotTask[] = [
  { taskId: 'TSK-00001', taskType: 'store', robotId: 'ROB-002', palletId: 'PAL-008', sourceLocation: 'Inbound Area', targetLocation: 'A-02-B-P1', status: 'completed', createdBy: 'USR-002', approvedBy: null, createdAt: '2026-04-01T14:00:00Z', startedAt: '2026-04-01T14:02:00Z', completedAt: '2026-04-01T14:08:00Z', completionTimeSec: 360 },
];

// ─── Approvals ───
export const mockApprovals: Approval[] = [
  { approvalId: 'APR-001', type: 'stock-out', requestedBy: 'USR-002', requestedAt: '2026-04-02T08:00:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'Scheduled disbursement to Provincial Branch Siem Reap', details: { packages: 5, totalValue: 25000000, denomination: 'KHR 200000' } },
  { approvalId: 'APR-002', type: 'stock-out', requestedBy: 'USR-003', requestedAt: '2026-04-02T07:30:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'Emergency cash request from Ministry of Finance', details: { packages: 10, totalValue: 50000000, denomination: 'KHR 50000' } },
  { approvalId: 'APR-003', type: 'reorganization', requestedBy: 'SYSTEM', requestedAt: '2026-04-01T23:00:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'End-of-day consolidation: merge PAL-005 into PAL-003', details: { source: 'PAL-005', target: 'PAL-003', spaceSaved: '1 pallet slot' } },
  { approvalId: 'APR-004', type: 'stock-out', requestedBy: 'USR-002', requestedAt: '2026-04-01T15:00:00Z', status: 'approved', reviewedBy: 'USR-001', reviewedAt: '2026-04-01T15:10:00Z', reason: 'Routine transfer to Central Treasury', details: { packages: 3, totalValue: 15000000 } },
  { approvalId: 'APR-005', type: 'exception', requestedBy: 'USR-002', requestedAt: '2026-04-02T09:00:00Z', status: 'pending', reviewedBy: null, reviewedAt: null, reason: 'Manual override: pallet PAL-011 requires reassignment due to maintenance', details: { palletId: 'PAL-011' } },
];

// ─── Optimization Suggestions ───
export const mockOptimizations: OptimizationSuggestion[] = [
  { id: 'OPT-001', title: 'Consolidate KHR packages on PAL-005 into PAL-003', description: 'PAL-005 has only 10 packages (25% capacity) of similar denomination to PAL-003 (50% capacity). Merging would free one pallet slot in Zone C.', sourcePallet: 'PAL-005', sourceLocation: 'C-01-B-P1', targetPallet: 'PAL-003', targetLocation: 'B-02-B-P1', benefit: 'Frees 1 pallet slot, reduces fragmentation', riskLevel: 'low', approvalRequired: true, estimatedSpaceSaved: '1 pallet slot (40 pkg capacity)', estimatedTravelReduction: '12%', status: 'pending', createdAt: '2026-04-01T23:00:00Z' },
  { id: 'OPT-002', title: 'Move older KHR packages closer to outbound', description: 'PAL-001 contains 35 high-value KHR packages stored since March 15. Relocating to A-02-T-P2 (closer to exit) would improve FIFO retrieval time.', sourcePallet: 'PAL-001', sourceLocation: 'A-01-T-P1', targetPallet: 'PAL-001', targetLocation: 'A-02-T-P2', benefit: 'Reduces retrieval time by ~20 seconds per stock-out', riskLevel: 'medium', approvalRequired: true, estimatedSpaceSaved: 'N/A (relocation only)', estimatedTravelReduction: '18%', status: 'pending', createdAt: '2026-04-01T23:00:00Z' },
  { id: 'OPT-003', title: 'Rebalance Zone B shelf load', description: 'Shelf B-02 has one full pallet (40 pkgs) and one half pallet (20 pkgs). Suggest distributing 10 packages from PAL-004 to PAL-009 on B-03 for better balance.', sourcePallet: 'PAL-004', sourceLocation: 'B-02-T-P1', targetPallet: 'PAL-009', targetLocation: 'B-03-T-P2', benefit: 'Improves shelf weight distribution, easier access', riskLevel: 'low', approvalRequired: true, estimatedSpaceSaved: 'Improves access to 10 packages', estimatedTravelReduction: '8%', status: 'pending', createdAt: '2026-04-01T23:00:00Z' },
  { id: 'OPT-004', title: 'Schedule PAL-011 maintenance return', description: 'PAL-011 has been in maintenance for 5 days. If repairs complete today, it can be returned to Zone D shelf D-01-T-P1.', sourcePallet: 'PAL-011', sourceLocation: 'Maintenance Area', targetPallet: 'PAL-011', targetLocation: 'D-01-T-P1', benefit: 'Restores 1 pallet capacity to Zone D', riskLevel: 'low', approvalRequired: false, estimatedSpaceSaved: '1 pallet slot (40 pkg capacity)', estimatedTravelReduction: 'N/A', status: 'pending', createdAt: '2026-04-02T06:00:00Z' },
];

// ─── Audit Logs ───
export const mockAuditLogs: AuditLog[] = [
  { logId: 1, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'STOCK_IN', entityType: 'Package', entityId: 'PKG-00156', details: 'Registered incoming KHR package from Central Treasury', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:30:00Z' },
  { logId: 2, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'PALLET_ASSIGN', entityType: 'Pallet', entityId: 'PAL-008', details: 'Assigned PKG-00156 to PAL-008', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:31:00Z' },
  { logId: 3, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'QR_PRINT', entityType: 'Package', entityId: 'PKG-00156', details: 'QR label printed successfully', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:31:30Z' },
  { logId: 4, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'ROBOT_TASK_CREATE', entityType: 'Task', entityId: 'TSK-00001', details: 'Created storage task for PAL-008 to A-02-B-P1', ipAddress: '10.0.1.42', timestamp: '2026-04-02T08:32:00Z' },
  { logId: 5, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'STOCK_OUT_APPROVE', entityType: 'Approval', entityId: 'APR-004', details: 'Approved stock-out request for 3 packages, total value 15,000,000 KHR', ipAddress: '10.0.1.15', timestamp: '2026-04-01T15:10:00Z' },
  { logId: 6, userId: 'USR-003', userName: 'Op. Srey Leak', action: 'STOCK_OUT_REQUEST', entityType: 'Approval', entityId: 'APR-002', details: 'Submitted stock-out request: 10 KHR 50000 packages for Ministry of Finance', ipAddress: '10.0.1.43', timestamp: '2026-04-02T07:30:00Z' },
  { logId: 7, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'USER_DEACTIVATE', entityType: 'User', entityId: 'USR-006', details: 'Deactivated user Op. Meas Sophea', ipAddress: '10.0.1.10', timestamp: '2026-03-15T09:30:00Z' },
  { logId: 8, userId: 'SYSTEM', userName: 'System', action: 'OPTIMIZATION_GENERATE', entityType: 'Optimization', entityId: 'OPT-001', details: 'Generated end-of-day consolidation suggestion for PAL-005', ipAddress: 'system', timestamp: '2026-04-01T23:00:00Z' },
  { logId: 9, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'ROBOT_ALERT_ACK', entityType: 'Robot', entityId: 'ROB-003', details: 'Acknowledged low battery alert for ROB-003', ipAddress: '10.0.1.78', timestamp: '2026-04-02T07:35:00Z' },
  { logId: 10, userId: 'USR-002', userName: 'Op. Vann Dara', action: 'OUTBOUND_VERIFY', entityType: 'Package', entityId: 'PKG-00050', details: 'Verified outbound package at exit door — matched approved request APR-004', ipAddress: '10.0.1.42', timestamp: '2026-04-01T16:15:00Z' },
  { logId: 11, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'ZONE_CONFIG', entityType: 'Zone', entityId: 'ZONE-D', details: 'Updated Zone D security classification to Mixed', ipAddress: '10.0.1.10', timestamp: '2026-03-28T11:00:00Z' },
  { logId: 12, userId: 'USR-001', userName: 'Admin Chea Sokha', action: 'ROBOT_MAINTENANCE', entityType: 'Robot', entityId: 'ROB-003', details: 'Scheduled maintenance for ROB-003 — battery replacement required', ipAddress: '10.0.1.78', timestamp: '2026-04-02T07:40:00Z' },
];

// ─── Alerts ───
export const mockAlerts: Alert[] = [
  { id: 'ALR-001', type: 'error', title: 'Robot ROB-003 Low Battery', message: 'Battery level critical at 12%. Robot stopped. Immediate maintenance required.', source: 'ROB-003', timestamp: '2026-04-02T07:30:00Z', acknowledged: true },
  { id: 'ALR-002', type: 'warning', title: 'Robot ROB-002 Idle Too Long', message: 'ROB-002 has been idle for 20 minutes. Consider assigning pending tasks.', source: 'ROB-002', timestamp: '2026-04-02T08:10:00Z', acknowledged: false },
  { id: 'ALR-003', type: 'warning', title: 'ROB-003 Temperature Warning', message: 'Internal temperature at 55°C exceeds threshold of 50°C.', source: 'ROB-003', timestamp: '2026-04-02T07:28:00Z', acknowledged: true },
  { id: 'ALR-004', type: 'info', title: 'End-of-Day Optimization Ready', message: '4 optimization suggestions generated. Admin review required.', source: 'System', timestamp: '2026-04-01T23:01:00Z', acknowledged: false },
  { id: 'ALR-005', type: 'warning', title: 'Pallet PAL-011 Overdue Maintenance', message: 'PAL-011 has been in maintenance for 5 days — exceeds normal 3-day threshold.', source: 'System', timestamp: '2026-04-02T06:00:00Z', acknowledged: false },
];

// ─── Stock Movements ───
export const mockStockMovements: StockMovement[] = [
  { movementId: 1, packageId: 'PKG-00156', fromPallet: '', toPallet: 'PAL-008', fromLocation: 'Inbound Area', toLocation: 'A-02-B-P1', movementType: 'stock-in', taskId: 'TSK-00001', performedBy: 'USR-002', approvedBy: null, timestamp: '2026-04-02T08:30:00Z' },
  { movementId: 2, packageId: 'PKG-00050', fromPallet: 'PAL-003', toPallet: '', fromLocation: 'B-02-B-P1', toLocation: 'Outbound Area', movementType: 'stock-out', taskId: 'TSK-00005', performedBy: 'USR-003', approvedBy: 'USR-001', timestamp: '2026-04-01T16:15:00Z' },
  { movementId: 3, packageId: 'PKG-00001', fromPallet: 'PAL-001', toPallet: 'PAL-001', fromLocation: 'Inbound Area', toLocation: 'A-01-T-P1', movementType: 'stock-in', taskId: 'TSK-00003', performedBy: 'USR-002', approvedBy: null, timestamp: '2026-04-01T14:08:00Z' },
  { movementId: 4, packageId: 'PKG-00041', fromPallet: 'PAL-003', toPallet: 'PAL-003', fromLocation: 'Inbound Area', toLocation: 'B-02-B-P1', movementType: 'stock-in', taskId: null, performedBy: 'USR-002', approvedBy: null, timestamp: '2026-03-20T11:00:00Z' },
  { movementId: 5, packageId: 'PKG-00157', fromPallet: '', toPallet: 'PAL-008', fromLocation: 'Inbound Area', toLocation: 'A-02-B-P1', movementType: 'stock-in', taskId: 'TSK-00001', performedBy: 'USR-002', approvedBy: null, timestamp: '2026-04-02T08:35:00Z' },
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
