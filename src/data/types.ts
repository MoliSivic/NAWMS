export type UserRole = 'admin' | 'operator' | 'supervisor' | 'technician';

export interface User {
  userId: string;
  name: string;
  employeeId: string;
  role: UserRole;
  email: string;
  isActive: boolean;
  lastLogin: string;
  avatar?: string;
}

export interface DenominationLine {
  currency: string;
  denomination: number;
  quantity: number;
  subtotal: number;
}

export type PackageStatus = 'registered' | 'stored' | 'in-transit' | 'outbound' | 'released';
export type SecurityLevel = 'high' | 'medium' | 'low';

export interface MoneyPackage {
  packageId: string;
  qrCode: string;
  denominations: DenominationLine[];
  totalValue: number;
  currency: string;
  palletId: string;
  locationCode: string;
  status: PackageStatus;
  securityLevel: SecurityLevel;
  source: string;
  arrivalDate: string;
  registeredBy: string;
  createdAt: string;
}

export type PalletStatus = 'available' | 'in-use' | 'in-transit' | 'maintenance';

export interface Pallet {
  palletId: string;
  currentPackageCount: number;
  maxCapacity: number;
  status: PalletStatus;
  locationCode: string;
  zoneId: string;
  shelfNumber: number;
  tier: 'top' | 'bottom';
  slot: 'P1' | 'P2';
  packages: string[];
}

export interface ShelfLocation {
  locationId: string;
  zoneId: string;
  shelfNumber: number;
  tier: 'top' | 'bottom';
  slot: 'P1' | 'P2';
  palletId: string | null;
  isAvailable: boolean;
  mapX: number;
  mapY: number;
}

export type ZoneSecurity = 'high' | 'medium' | 'low' | 'mixed';

export interface Zone {
  zoneId: string;
  zoneName: string;
  securityClass: ZoneSecurity;
  maxCapacity: number;
  allowedTypes: string;
  shelfCount: number;
  color: string;
}

export type RobotStatus = 'active' | 'idle' | 'charging' | 'error' | 'maintenance' | 'decommissioned';

export interface Robot {
  robotId: string;
  model: string;
  maxLoadKg: number;
  batteryLevel: number;
  currentSpeed: number;
  currentLoadKg: number;
  temperature: number;
  locationX: number;
  locationY: number;
  status: RobotStatus;
  errorCode: string | null;
  idleTimeSec: number;
  commEndpoint: string;
  lastMaintenance: string;
  totalTasksCompleted: number;
}

export type TaskType = 'store' | 'retrieve' | 'reorganize';
export type TaskStatus = 'queued' | 'assigned' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface RobotTask {
  taskId: string;
  taskType: TaskType;
  robotId: string | null;
  palletId: string;
  sourceLocation: string;
  targetLocation: string;
  status: TaskStatus;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  completionTimeSec: number | null;
}

export type ApprovalType = 'stock-out' | 'reorganization' | 'exception' | 'override';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  approvalId: string;
  type: ApprovalType;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reason: string;
  details: Record<string, unknown>;
}

export interface AuditLog {
  logId: number;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  sourcePallet: string;
  sourceLocation: string;
  targetPallet: string;
  targetLocation: string;
  benefit: string;
  riskLevel: 'low' | 'medium' | 'high';
  approvalRequired: boolean;
  estimatedSpaceSaved: string;
  estimatedTravelReduction: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}
