import React, { useRef, useEffect, useState, useCallback } from 'react';
import { warehouseLayout, findRoute, locationToWaypointId } from '@/data/warehouseLayout';
import { mockRobots, mockTasks, mockPallets, mockZones } from '@/data/mockData';
import type { Robot, RobotTask, RouteWaypoint } from '@/data/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Types ───
interface CanvasRobot extends Robot {
  /** Display position (interpolated), in warehouse meters */
  displayX: number;
  displayY: number;
  /** Target position for smooth interpolation */
  targetX: number;
  targetY: number;
  /** Current route waypoints */
  route: RouteWaypoint[];
  routeIdx: number;
  /** Direction: +1 forward, -1 backward (ping-pong along route) */
  routeDir: 1 | -1;
}

interface SlotInfo {
  locationId: string;
  tier: 'top' | 'bottom';
  slot: 'P1' | 'P2';
  palletId: string | null;
  occupancy: number;
  shelfId: string;
  zoneId: string;
  /** Pixel rect on canvas for hit-testing */
  rect: { x: number; y: number; w: number; h: number };
}

export interface WarehouseCanvasProps {
  onSlotClick?: (slot: SlotInfo | null) => void;
  selectedSlotId?: string | null;
  className?: string;
}

// ─── Helpers ───
const ROUTE_SPEED_FACTOR = 0.8;
const MIN_ROUTE_SPEED = 0.9; // meters per second
const MAX_FRAME_DELTA = 0.05; // cap large RAF gaps to avoid visible jumps

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

function nearestRouteIndex(route: RouteWaypoint[], x: number, y: number) {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  route.forEach((wp, idx) => {
    const d = distance(x, y, wp.x, wp.y);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

function syncTargetToRoute(robot: CanvasRobot) {
  if (!robot.route.length) return;
  const waypoint = robot.route[robot.routeIdx];
  robot.targetX = waypoint.x;
  robot.targetY = waypoint.y;
}

function advanceRoute(robot: CanvasRobot) {
  if (robot.route.length < 2) return;

  let nextIdx = robot.routeIdx + robot.routeDir;
  if (nextIdx < 0 || nextIdx >= robot.route.length) {
    robot.routeDir = robot.routeDir === 1 ? -1 : 1;
    nextIdx = robot.routeIdx + robot.routeDir;
  }

  robot.routeIdx = Math.max(0, Math.min(robot.route.length - 1, nextIdx));
  syncTargetToRoute(robot);
}

/** Map initial mock robot positions to valid aisle/corridor locations (warehouse meters) */
function initRobotPos(r: Robot): { x: number; y: number } {
  // ROB-001 active — on the aisle between A and B, near shelf A-02
  if (r.robotId === 'ROB-001') return { x: 14, y: 8.5 };
  // ROB-002 idle — on the corridor near the door
  if (r.robotId === 'ROB-002') return { x: 2, y: 32 };
  // ROB-003 error — on the aisle below C/D, near Zone D
  return { x: 37.5, y: 26.5 };
}

function robotColor(status: Robot['status']): string {
  switch (status) {
    case 'active': return '#22c55e';
    case 'idle': return '#f59e0b';
    case 'charging': return '#3b82f6';
    case 'error': return '#ef4444';
    case 'maintenance': return '#8b5cf6';
    default: return '#6b7280';
  }
}

// ─── Theme palette ───
function getCanvasPalette(mode: 'light' | 'dark') {
  if (mode === 'light') {
    return {
      bg: '#f1f5f9',
      boundary: '#cbd5e1',
      grid: 'rgba(148,163,184,0.2)',
      zoneFillAlpha: '30',
      zoneStrokeAlpha: '70',
      zoneLabelBand: 'rgba(255,255,255,0.55)',
      zoneLabelText: '#1e293b',
      aisle: 'rgba(100,116,139,0.3)',
      doorFill: '#fef3c766',
      doorStroke: '#d97706',
      doorText: '#92400e',
      shelfBg: '#e2e8f0',
      shelfBorder: '#94a3b8',
      shelfLabel: '#475569',
      slotEmpty: '#f8fafc',
      slotHigh: '#16a34a',
      slotMed: '#3b82f6',
      slotLow: '#f59e0b',
      slotCrit: '#ef4444',
      slotSelected: '#2563eb',
      robotStroke: '#fff',
      robotLabel: '#fff',
      batteryBg: '#cbd5e1',
      scaleText: '#64748b',
    };
  }
  return {
    bg: '#0f1729',
    boundary: '#334155',
    grid: 'rgba(51,65,85,0.3)',
    zoneFillAlpha: '40',
    zoneStrokeAlpha: '99',
    zoneLabelBand: 'rgba(15,23,42,0.35)',
    zoneLabelText: '#e2e8f0',
    aisle: 'rgba(148,163,184,0.25)',
    doorFill: '#f59e0b44',
    doorStroke: '#f59e0b',
    doorText: '#fbbf24',
    shelfBg: '#1e293b',
    shelfBorder: '#475569',
    shelfLabel: '#94a3b8',
    slotEmpty: '#0f172a',
    slotHigh: '#166534',
    slotMed: '#1e40af',
    slotLow: '#92400e',
    slotCrit: '#7f1d1d',
    slotSelected: '#60a5fa',
    robotStroke: '#fff',
    robotLabel: '#fff',
    batteryBg: '#334155',
    scaleText: '#94a3b8',
  };
}

// ─── Component ───
const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({ onSlotClick, selectedSlotId, className }) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number>(0);
  const robotsRef = useRef<CanvasRobot[]>([]);
  const slotsRef = useRef<SlotInfo[]>([]);
  const scaleRef = useRef(1);
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 600 });

  const layout = warehouseLayout;
  const PADDING = 20; // px padding around the warehouse

  // Scale: pixels per meter
  const pxPerM = useCallback(() => {
    return Math.min(
      (canvasSize.w - PADDING * 2) / layout.width,
      (canvasSize.h - PADDING * 2) / layout.height,
    );
  }, [canvasSize, layout]);

  // Center the warehouse drawing within the canvas
  const offsetX = useCallback(() => {
    const s = pxPerM();
    return (canvasSize.w - layout.width * s) / 2;
  }, [canvasSize, pxPerM, layout]);

  const offsetY = useCallback(() => {
    const s = pxPerM();
    return (canvasSize.h - layout.height * s) / 2;
  }, [canvasSize, pxPerM, layout]);

  const toCanvasX = useCallback((mx: number) => offsetX() + mx * pxPerM(), [pxPerM, offsetX]);
  const toCanvasY = useCallback((my: number) => offsetY() + my * pxPerM(), [pxPerM, offsetY]);

  // ─── Initialize robots with routes ───
  useEffect(() => {
    const activeTask = (rid: string): RobotTask | undefined =>
      mockTasks.find(t => t.robotId === rid && t.status === 'in-progress');
    const activeRobots = mockRobots.filter(r => r.status === 'active');

    robotsRef.current = activeRobots.map(r => {
      const pos = initRobotPos(r);
      const task = activeTask(r.robotId);
      let route: RouteWaypoint[] = [];
      let routeIdx = 0;
      let routeDir: 1 | -1 = 1;
      let targetX = pos.x;
      let targetY = pos.y;

      if (task) {
        const fromWp = locationToWaypointId(task.sourceLocation);
        const toWp = locationToWaypointId(task.targetLocation);
        route = findRoute(fromWp, toWp);

        if (route.length > 0) {
          routeIdx = nearestRouteIndex(route, pos.x, pos.y);
          routeDir = routeIdx >= route.length - 1 ? -1 : 1;
          targetX = route[routeIdx].x;
          targetY = route[routeIdx].y;
        }
      }

      return {
        ...r,
        displayX: pos.x,
        displayY: pos.y,
        targetX,
        targetY,
        route,
        routeIdx,
        routeDir,
      };
    });
  }, []);

  // ─── Resize observer ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ─── Animation loop ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastFrameTs = 0;

    function tick(timestamp: number) {
      const deltaSec = lastFrameTs === 0
        ? 0
        : Math.min((timestamp - lastFrameTs) / 1000, MAX_FRAME_DELTA);
      lastFrameTs = timestamp;

      const s = pxPerM();
      scaleRef.current = s;

      // Move active robots continuously along their route at a capped speed.
      for (const rb of robotsRef.current) {
        if (rb.status !== 'active' || rb.route.length === 0 || deltaSec === 0) continue;

        let remainingStep = Math.max(MIN_ROUTE_SPEED, rb.currentSpeed * ROUTE_SPEED_FACTOR) * deltaSec;
        while (remainingStep > 0) {
          const distToTarget = distance(rb.displayX, rb.displayY, rb.targetX, rb.targetY);

          if (distToTarget < 0.01) {
            rb.displayX = rb.targetX;
            rb.displayY = rb.targetY;
            advanceRoute(rb);
            if (distance(rb.displayX, rb.displayY, rb.targetX, rb.targetY) < 0.01) break;
            continue;
          }

          const step = Math.min(remainingStep, distToTarget);
          const progress = step / distToTarget;
          rb.displayX += (rb.targetX - rb.displayX) * progress;
          rb.displayY += (rb.targetY - rb.displayY) * progress;
          remainingStep -= step;

          if (step >= distToTarget) {
            rb.displayX = rb.targetX;
            rb.displayY = rb.targetY;
            advanceRoute(rb);
          }
        }
      }

      draw(ctx!, s);
      animFrame.current = requestAnimationFrame(tick);
    }

    animFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame.current);
  }, [canvasSize, pxPerM, selectedSlotId, theme]);

  // ─── Draw function ───
  function draw(ctx: CanvasRenderingContext2D, s: number) {
    const p = getCanvasPalette(theme);
    const { w, h } = canvasSize;
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    // Warehouse boundary
    ctx.strokeStyle = p.boundary;
    ctx.lineWidth = 2;
    ctx.strokeRect(toCanvasX(0), toCanvasY(0), layout.width * s, layout.height * s);

    // Grid lines
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 0.5;
    for (let mx = 0; mx <= layout.width; mx += 5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(mx), toCanvasY(0));
      ctx.lineTo(toCanvasX(mx), toCanvasY(layout.height));
      ctx.stroke();
    }
    for (let my = 0; my <= layout.height; my += 5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(0), toCanvasY(my));
      ctx.lineTo(toCanvasX(layout.width), toCanvasY(my));
      ctx.stroke();
    }

    // Zones
    for (const zone of layout.zones) {
      const zoneX = toCanvasX(zone.x);
      const zoneY = toCanvasY(zone.y);
      const zoneW = zone.width * s;
      const zoneH = zone.height * s;
      const labelBandH = Math.max(16, s * 0.95);
      const fullLabel = zone.label;
      const shortLabel = zone.label.split('—')[0].trim();

      ctx.fillStyle = zone.color + p.zoneFillAlpha;
      ctx.fillRect(zoneX, zoneY, zoneW, zoneH);
      ctx.strokeStyle = zone.color + p.zoneStrokeAlpha;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(zoneX, zoneY, zoneW, zoneH);

      ctx.fillStyle = p.zoneLabelBand;
      ctx.fillRect(zoneX, zoneY, zoneW, labelBandH);

      ctx.save();
      ctx.fillStyle = p.zoneLabelText;
      ctx.font = `600 ${Math.max(10, s * 0.8)}px sans-serif`;
      const labelMaxW = zoneW - 16;
      const label = ctx.measureText(fullLabel).width <= labelMaxW ? fullLabel : shortLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, zoneX + zoneW / 2, zoneY + labelBandH / 2);
      ctx.restore();
    }

    // Aisles
    ctx.strokeStyle = p.aisle;
    ctx.lineWidth = Math.max(2, s * 0.6);
    ctx.setLineDash([6, 4]);
    for (const a of layout.aisles) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(a.x1), toCanvasY(a.y1));
      ctx.lineTo(toCanvasX(a.x2), toCanvasY(a.y2));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Door
    const door = layout.door;
    ctx.fillStyle = p.doorFill;
    ctx.fillRect(toCanvasX(door.x), toCanvasY(door.y), door.width * s, door.height * s);
    ctx.strokeStyle = p.doorStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(toCanvasX(door.x), toCanvasY(door.y), door.width * s, door.height * s);
    ctx.fillStyle = p.doorText;
    ctx.font = `bold ${Math.max(10, s * 1)}px sans-serif`;
    ctx.fillText('DOOR (In/Out)', toCanvasX(door.x) + 4, toCanvasY(door.y) + door.height * s / 2 + 4);

    // Shelves + slots
    const newSlots: SlotInfo[] = [];
    for (const shelf of layout.shelves) {
      const sx = toCanvasX(shelf.x);
      const sy = toCanvasY(shelf.y);
      const sw = shelf.width * s;
      const sh = shelf.height * s;

      // Shelf background
      ctx.fillStyle = p.shelfBg;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = p.shelfBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);

      // Shelf label
      ctx.fillStyle = p.shelfLabel;
      ctx.font = `${Math.max(8, s * 0.7)}px monospace`;
      ctx.fillText(shelf.shelfId, sx + 2, sy + Math.max(10, s * 0.9));

      // Draw 4 slots (2×2 grid inside shelf)
      const slotPad = 2;
      const slotW = (sw - slotPad * 3) / 2;
      const slotH = (sh - slotPad * 3 - Math.max(10, s * 0.9)) / 2;
      const slotStartY = sy + Math.max(12, s * 1.1);

      for (const slot of shelf.slots) {
        const col = slot.slot === 'P1' ? 0 : 1;
        const row = slot.tier === 'top' ? 0 : 1;
        const rx = sx + slotPad + col * (slotW + slotPad);
        const ry = slotStartY + row * (slotH + slotPad);

        // Occupancy color
        let fill = p.slotEmpty;
        if (slot.palletId) {
          if (slot.occupancy >= 0.9) fill = p.slotHigh;
          else if (slot.occupancy >= 0.5) fill = p.slotMed;
          else if (slot.occupancy >= 0.25) fill = p.slotLow;
          else fill = p.slotCrit;
        }

        const isSelected = selectedSlotId === slot.locationId;
        ctx.fillStyle = fill;
        ctx.fillRect(rx, ry, slotW, slotH);
        if (isSelected) {
          ctx.strokeStyle = p.slotSelected;
          ctx.lineWidth = 2;
          ctx.strokeRect(rx - 1, ry - 1, slotW + 2, slotH + 2);
        }

        newSlots.push({
          locationId: slot.locationId,
          tier: slot.tier,
          slot: slot.slot,
          palletId: slot.palletId,
          occupancy: slot.occupancy,
          shelfId: shelf.shelfId,
          zoneId: shelf.zoneId,
          rect: { x: rx, y: ry, w: slotW, h: slotH },
        });
      }
    }
    slotsRef.current = newSlots;

    // Robot route overlays
    for (const rb of robotsRef.current) {
      if (rb.route.length < 2) continue;
      ctx.strokeStyle = robotColor(rb.status) + '55';
      ctx.lineWidth = Math.max(2, s * 0.3);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(rb.route[0].x), toCanvasY(rb.route[0].y));
      for (let i = 1; i < rb.route.length; i++) {
        ctx.lineTo(toCanvasX(rb.route[i].x), toCanvasY(rb.route[i].y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Robots
    const robotRadius = Math.max(8, s * 1);
    for (const rb of robotsRef.current) {
      const cx = toCanvasX(rb.displayX);
      const cy = toCanvasY(rb.displayY);
      const color = robotColor(rb.status);

      // Glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, robotRadius * 2);
      grad.addColorStop(0, color + '44');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, robotRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, robotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.robotStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = p.robotLabel;
      ctx.font = `bold ${Math.max(8, s * 0.65)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rb.robotId.replace('ROB-', 'R'), cx, cy);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';

      // Battery bar below robot
      const barW = robotRadius * 2;
      const barH = 3;
      const barX = cx - robotRadius;
      const barY = cy + robotRadius + 3;
      ctx.fillStyle = p.batteryBg;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = rb.batteryLevel > 30 ? '#22c55e' : rb.batteryLevel > 15 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barW * (rb.batteryLevel / 100), barH);
    }

    // Scale indicator
    ctx.fillStyle = p.scaleText;
    ctx.font = '10px sans-serif';
    ctx.fillText(`Scale: 1px = ${(1 / s).toFixed(2)}m | ${layout.width}m × ${layout.height}m`, offsetX(), canvasSize.h - 6);
  }

  // ─── Click handler ───
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSlotClick) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on a slot
    for (const slot of slotsRef.current) {
      const r = slot.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        onSlotClick(slot);
        return;
      }
    }
    onSlotClick(null);
  }, [onSlotClick]);

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: 500 }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onClick={handleClick}
        style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default WarehouseCanvas;
export type { SlotInfo };
