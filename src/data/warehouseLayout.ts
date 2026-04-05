import type { WarehouseLayoutConfig, RouteWaypoint } from './types';
import { mockPallets, mockShelfLocations } from './mockData';

/**
 * Warehouse floor plan layout — all coordinates in meters.
 * The warehouse is 60m wide × 40m deep.
 *
 *  ┌─────────────────────────────────────────────────────┐
 *  │                      WAREHOUSE                       │
 *  │                                                      │
 *  │   ┌─────────────────────────────────────────────┐    │
 *  │   │            ZONE A (High Value)              │    │
 *  │   │  [S01] [S02] [S03] [S04] [S05] [S06]       │    │
 *  │   └─────────────────────────────────────────────┘    │
 *  │                   ═══ AISLE ═══                       │
 *  │   ┌─────────────────────────────────────────────┐    │
 *  │   │        ZONE B (Medium Value)                │    │
 *  │   │  [S01] [S02] [S03] [S04] [S05] [S06]       │    │
 *  │   │  [S07] [S08]                                │    │
 *  │   └─────────────────────────────────────────────┘    │
 *  │                   ═══ AISLE ═══                       │
 *  │   ┌──────────────────────┐ ┌────────────────────┐    │
 *  │   │  ZONE C (Low Value)  │ │  ZONE D (Mixed)    │    │
 *  │   │  [S01][S02][S03][S04]│ │  [S01][S02][S03]   │    │
 *  │   │           [S05]      │ │                     │    │
 *  │   └──────────────────────┘ └────────────────────┘    │
 *  │                   ═══ AISLE ═══                       │
 *  │                                                      │
 *  │   ┌──────────┐                                       │
 *  │   │  DOOR    │  ← Inbound / Outbound                 │
 *  │   └──────────┘                                       │
 *  └─────────────────────────────────────────────────────┘
 */

const SHELF_W = 5;
const SHELF_H = 3;
const SHELF_GAP = 1.5;  // gap between shelves in a row
const ZONE_SIDE_PADDING = 1;
const ZONE_TOP_PADDING = 1.6;

// Build shelves for a zone at given starting position
function buildShelves(
  zoneId: string,
  zoneLetter: string,
  count: number,
  startX: number,
  startY: number,
): WarehouseLayoutConfig['shelves'] {
  const shelves: WarehouseLayoutConfig['shelves'] = [];
  for (let i = 0; i < count; i++) {
    const shelfNum = String(i + 1).padStart(2, '0');
    const shelfId = `${zoneLetter}-${shelfNum}`;
    const x = startX + i * (SHELF_W + SHELF_GAP);
    const y = startY;

    // Build 4 slots per shelf: Top-P1, Top-P2, Bottom-P1, Bottom-P2
    const slots: WarehouseLayoutConfig['shelves'][0]['slots'] = [];
    for (const tier of ['top', 'bottom'] as const) {
      for (const slot of ['P1', 'P2'] as const) {
        const locId = `${zoneLetter}-${shelfNum}-${tier === 'top' ? 'T' : 'B'}-${slot}`;
        const shelfLoc = mockShelfLocations.find(l => l.locationId === locId);
        const pallet = shelfLoc?.palletId
          ? mockPallets.find(p => p.palletId === shelfLoc.palletId)
          : null;
        slots.push({
          locationId: locId,
          tier,
          slot,
          palletId: pallet?.palletId ?? null,
          occupancy: pallet ? pallet.currentPackageCount / pallet.maxCapacity : 0,
        });
      }
    }

    shelves.push({ shelfId, zoneId, x, y, width: SHELF_W, height: SHELF_H, slots });
  }
  return shelves;
}

// Zone positions
const ZONE_A = { x: 4, y: 3, w: 52, h: 5 };
const ZONE_B = { x: 4, y: 11, w: 52, h: 5 };
const ZONE_C = { x: 4, y: 19, w: 27, h: 7 };
const ZONE_D = { x: 33, y: 19, w: 23, h: 7 };

const shelvesA = buildShelves('ZONE-A', 'A', 6, ZONE_A.x + ZONE_SIDE_PADDING, ZONE_A.y + ZONE_TOP_PADDING);
const shelvesB = buildShelves('ZONE-B', 'B', 8, ZONE_B.x + ZONE_SIDE_PADDING, ZONE_B.y + ZONE_TOP_PADDING);
const shelvesC = buildShelves('ZONE-C', 'C', 4, ZONE_C.x + ZONE_SIDE_PADDING, ZONE_C.y + ZONE_TOP_PADDING);
const shelvesD = buildShelves('ZONE-D', 'D', 3, ZONE_D.x + ZONE_SIDE_PADDING, ZONE_D.y + ZONE_TOP_PADDING);

// ─── Route network ───
// The main corridor runs at x=2, LEFT of all zones (zones start at x=4).
// Horizontal aisles run in the gaps BETWEEN zones.
// Each shelf has an "aisle turn-point" on the horizontal aisle at its center-x,
// and a "shelf front" waypoint just below the shelf.
// Robots travel: door → corridor → horizontal aisle → turn-point → shelf front.
// No route segment ever crosses through a shelf.

const CORRIDOR_X = 2;       // left of all zones
const AISLE_AB_Y = 8.5;     // gap between Zone A (bottom y=8) and Zone B (top y=11)
const AISLE_BC_Y = 16.5;    // gap between Zone B (bottom y=16) and Zone C (top y=19)
const AISLE_BELOW_Y = 26.5; // below Zone C/D (bottom y=26)

const routeWaypoints: WarehouseLayoutConfig['routeWaypoints'] = [
  // Door (center of the door rectangle)
  { id: 'DOOR', x: 9, y: 36 },
  // Door → corridor connection
  { id: 'CORR-DOOR', x: CORRIDOR_X, y: 36 },
  // Main corridor vertical nodes (at each horizontal-aisle intersection)
  { id: 'CORR-BELOW', x: CORRIDOR_X, y: AISLE_BELOW_Y },
  { id: 'CORR-BC', x: CORRIDOR_X, y: AISLE_BC_Y },
  { id: 'CORR-AB', x: CORRIDOR_X, y: AISLE_AB_Y },

  // Aisle turn-points — one per shelf, sitting on the horizontal aisle at the shelf's center-x.
  // Zone A shelves accessed from aisle between A and B
  ...shelvesA.map((s, i) => ({ id: `HA-${i + 1}`, x: s.x + SHELF_W / 2, y: AISLE_AB_Y })),
  // Zone B shelves accessed from aisle between B and C
  ...shelvesB.map((s, i) => ({ id: `HB-${i + 1}`, x: s.x + SHELF_W / 2, y: AISLE_BC_Y })),
  // Zone C shelves accessed from aisle below C/D
  ...shelvesC.map((s, i) => ({ id: `HC-${i + 1}`, x: s.x + SHELF_W / 2, y: AISLE_BELOW_Y })),
  // Zone D shelves accessed from same aisle below C/D
  ...shelvesD.map((s, i) => ({ id: `HD-${i + 1}`, x: s.x + SHELF_W / 2, y: AISLE_BELOW_Y })),

  // Shelf fronts — just below each shelf (perpendicular access from aisle)
  ...shelvesA.map((s, i) => ({ id: `SA-${i + 1}`, x: s.x + SHELF_W / 2, y: s.y + SHELF_H + 0.5 })),
  ...shelvesB.map((s, i) => ({ id: `SB-${i + 1}`, x: s.x + SHELF_W / 2, y: s.y + SHELF_H + 0.5 })),
  ...shelvesC.map((s, i) => ({ id: `SC-${i + 1}`, x: s.x + SHELF_W / 2, y: s.y + SHELF_H + 0.5 })),
  ...shelvesD.map((s, i) => ({ id: `SD-${i + 1}`, x: s.x + SHELF_W / 2, y: s.y + SHELF_H + 0.5 })),
];

const routeEdges: WarehouseLayoutConfig['routeEdges'] = [
  // Door ↔ corridor
  { from: 'DOOR', to: 'CORR-DOOR' },
  // Main corridor (vertical, bottom → top)
  { from: 'CORR-DOOR', to: 'CORR-BELOW' },
  { from: 'CORR-BELOW', to: 'CORR-BC' },
  { from: 'CORR-BC', to: 'CORR-AB' },

  // Corridor → first turn-point on each horizontal aisle
  { from: 'CORR-AB', to: 'HA-1' },
  { from: 'CORR-BC', to: 'HB-1' },
  { from: 'CORR-BELOW', to: 'HC-1' },

  // Horizontal aisle A-B: HA-1 → HA-2 → … → HA-N  (sequential along the aisle)
  ...shelvesA.slice(1).map((_, i) => ({ from: `HA-${i + 1}`, to: `HA-${i + 2}` })),
  // Horizontal aisle B-C: HB-1 → … → HB-N
  ...shelvesB.slice(1).map((_, i) => ({ from: `HB-${i + 1}`, to: `HB-${i + 2}` })),
  // Horizontal aisle below C/D: HC-1 → … → HC-N → HD-1 → … → HD-N
  ...shelvesC.slice(1).map((_, i) => ({ from: `HC-${i + 1}`, to: `HC-${i + 2}` })),
  { from: `HC-${shelvesC.length}`, to: 'HD-1' },  // bridge from Zone C to Zone D along same aisle
  ...shelvesD.slice(1).map((_, i) => ({ from: `HD-${i + 1}`, to: `HD-${i + 2}` })),

  // Turn-point → shelf front (short perpendicular segment, goes UP from aisle to shelf face)
  ...shelvesA.map((_, i) => ({ from: `HA-${i + 1}`, to: `SA-${i + 1}` })),
  ...shelvesB.map((_, i) => ({ from: `HB-${i + 1}`, to: `SB-${i + 1}` })),
  ...shelvesC.map((_, i) => ({ from: `HC-${i + 1}`, to: `SC-${i + 1}` })),
  ...shelvesD.map((_, i) => ({ from: `HD-${i + 1}`, to: `SD-${i + 1}` })),
];

export const warehouseLayout: WarehouseLayoutConfig = {
  width: 60,
  height: 40,
  door: { x: 4, y: 34, width: 10, height: 4 },
  zones: [
    { zoneId: 'ZONE-A', x: ZONE_A.x, y: ZONE_A.y, width: ZONE_A.w, height: ZONE_A.h, color: '#1e3a5f', label: 'Zone A — High Value' },
    { zoneId: 'ZONE-B', x: ZONE_B.x, y: ZONE_B.y, width: ZONE_B.w, height: ZONE_B.h, color: '#2d5a87', label: 'Zone B — Medium Value' },
    { zoneId: 'ZONE-C', x: ZONE_C.x, y: ZONE_C.y, width: ZONE_C.w, height: ZONE_C.h, color: '#4a7fb5', label: 'Zone C — Low Value' },
    { zoneId: 'ZONE-D', x: ZONE_D.x, y: ZONE_D.y, width: ZONE_D.w, height: ZONE_D.h, color: '#6b9fd4', label: 'Zone D — Mixed' },
  ],
  shelves: [...shelvesA, ...shelvesB, ...shelvesC, ...shelvesD],
  aisles: [
    // Horizontal aisles between zones
    { x1: CORRIDOR_X, y1: AISLE_AB_Y, x2: 56, y2: AISLE_AB_Y },
    { x1: CORRIDOR_X, y1: AISLE_BC_Y, x2: 56, y2: AISLE_BC_Y },
    { x1: CORRIDOR_X, y1: AISLE_BELOW_Y, x2: 56, y2: AISLE_BELOW_Y },
    // Main vertical corridor (left of zones, x=2)
    { x1: CORRIDOR_X, y1: AISLE_AB_Y, x2: CORRIDOR_X, y2: 36 },
  ],
  routeWaypoints,
  routeEdges,
};

/** Find a route (list of waypoints) from one waypoint ID to another using BFS */
export function findRoute(fromId: string, toId: string): RouteWaypoint[] {
  const layout = warehouseLayout;
  const adj: Record<string, string[]> = {};
  for (const wp of layout.routeWaypoints) adj[wp.id] = [];
  for (const e of layout.routeEdges) {
    adj[e.from]?.push(e.to);
    adj[e.to]?.push(e.from);
  }

  const visited = new Set<string>();
  const parent: Record<string, string | null> = {};
  const queue = [fromId];
  visited.add(fromId);
  parent[fromId] = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const next of (adj[current] || [])) {
      if (!visited.has(next)) {
        visited.add(next);
        parent[next] = current;
        queue.push(next);
      }
    }
  }

  // Reconstruct path
  const path: RouteWaypoint[] = [];
  let cur: string | null = toId;
  while (cur !== null) {
    const wp = layout.routeWaypoints.find(w => w.id === cur);
    if (wp) path.unshift(wp);
    cur = parent[cur] ?? null;
    if (cur === undefined) break;
  }
  return path;
}

/** Map a shelf location code (e.g. "A-01-T-P1") to the nearest route waypoint */
export function locationToWaypointId(locationCode: string): string {
  if (locationCode === 'Inbound Area' || locationCode === 'Outbound Area') return 'DOOR';
  // "A-01-T-P1" → zone A, shelf 01
  const parts = locationCode.split('-');
  const zoneLetter = parts[0];
  const shelfNum = parseInt(parts[1], 10);
  const zonePrefix = zoneLetter === 'A' ? 'SA' : zoneLetter === 'B' ? 'SB' : zoneLetter === 'C' ? 'SC' : 'SD';
  return `${zonePrefix}-${shelfNum}`;
}
