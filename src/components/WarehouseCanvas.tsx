import React, { useRef, useEffect, useState, useCallback } from 'react';
import { warehouseLayout, findRoute, locationToWaypointId } from '@/data/warehouseLayout';
import { mockRobots, mockTasks, mockPallets, mockZones } from '@/data/mockData';
import type { Robot, RobotTask, RouteWaypoint } from '@/data/types';

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
const LERP_SPEED = 0.08;
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
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

// ─── Component ───
const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({ onSlotClick, selectedSlotId, className }) => {
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

  const toCanvasX = useCallback((mx: number) => PADDING + mx * pxPerM(), [pxPerM]);
  const toCanvasY = useCallback((my: number) => PADDING + my * pxPerM(), [pxPerM]);

  // ─── Initialize robots with routes ───
  useEffect(() => {
    const activeTask = (rid: string): RobotTask | undefined =>
      mockTasks.find(t => t.robotId === rid && t.status === 'in-progress');

    robotsRef.current = mockRobots.map(r => {
      const pos = initRobotPos(r);
      const task = activeTask(r.robotId);
      let route: RouteWaypoint[] = [];
      if (task) {
        const fromWp = locationToWaypointId(task.sourceLocation);
        const toWp = locationToWaypointId(task.targetLocation);
        route = findRoute(fromWp, toWp);
      }
      return {
        ...r,
        displayX: pos.x,
        displayY: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        route,
        routeIdx: 0,
        routeDir: 1 as const,
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

    let tickCount = 0;

    function tick() {
      tickCount++;
      const s = pxPerM();
      scaleRef.current = s;

      // Advance robots along routes every ~60 ticks (~1s at 60fps)
      // Ping-pong: when reaching either end, reverse direction so the robot
      // retraces the same path instead of jumping back through racks.
      if (tickCount % 60 === 0) {
        for (const rb of robotsRef.current) {
          if (rb.status !== 'active' || rb.route.length < 2) continue;
          const nextIdx = rb.routeIdx + rb.routeDir;
          if (nextIdx < 0 || nextIdx >= rb.route.length) {
            rb.routeDir = (rb.routeDir === 1 ? -1 : 1) as 1 | -1;
          }
          rb.routeIdx = Math.max(0, Math.min(rb.route.length - 1, rb.routeIdx + rb.routeDir));
          const wp = rb.route[rb.routeIdx];
          rb.targetX = wp.x;
          rb.targetY = wp.y;
        }
      }

      // Lerp display positions
      for (const rb of robotsRef.current) {
        rb.displayX = lerp(rb.displayX, rb.targetX, LERP_SPEED);
        rb.displayY = lerp(rb.displayY, rb.targetY, LERP_SPEED);
      }

      draw(ctx!, s);
      animFrame.current = requestAnimationFrame(tick);
    }

    animFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame.current);
  }, [canvasSize, pxPerM, selectedSlotId]);

  // ─── Draw function ───
  function draw(ctx: CanvasRenderingContext2D, s: number) {
    const { w, h } = canvasSize;
    const dpr = window.devicePixelRatio || 1;
    const canvas = ctx.canvas;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = '#0f1729';
    ctx.fillRect(0, 0, w, h);

    // Warehouse boundary
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(toCanvasX(0), toCanvasY(0), layout.width * s, layout.height * s);

    // Grid lines (light)
    ctx.strokeStyle = 'rgba(51,65,85,0.3)';
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
      ctx.fillStyle = zone.color + '40'; // semi-transparent
      ctx.fillRect(toCanvasX(zone.x), toCanvasY(zone.y), zone.width * s, zone.height * s);
      ctx.strokeStyle = zone.color + '99';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(toCanvasX(zone.x), toCanvasY(zone.y), zone.width * s, zone.height * s);
      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `bold ${Math.max(10, s * 1.2)}px sans-serif`;
      ctx.fillText(zone.label, toCanvasX(zone.x) + 6, toCanvasY(zone.y) + Math.max(14, s * 1.8));
    }

    // Aisles
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
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
    ctx.fillStyle = '#f59e0b44';
    ctx.fillRect(toCanvasX(door.x), toCanvasY(door.y), door.width * s, door.height * s);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(toCanvasX(door.x), toCanvasY(door.y), door.width * s, door.height * s);
    ctx.fillStyle = '#fbbf24';
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
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);

      // Shelf label
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(8, s * 0.7)}px monospace`;
      ctx.fillText(shelf.shelfId, sx + 2, sy + Math.max(10, s * 0.9));

      // Draw 4 slots (2×2 grid inside shelf)
      const slotPad = 2;
      const slotW = (sw - slotPad * 3) / 2;
      const slotH = (sh - slotPad * 3 - Math.max(10, s * 0.9)) / 2; // leave room for label
      const slotStartY = sy + Math.max(12, s * 1.1);

      for (const slot of shelf.slots) {
        const col = slot.slot === 'P1' ? 0 : 1;
        const row = slot.tier === 'top' ? 0 : 1;
        const rx = sx + slotPad + col * (slotW + slotPad);
        const ry = slotStartY + row * (slotH + slotPad);

        // Occupancy color
        let fill = '#0f172a'; // empty
        if (slot.palletId) {
          if (slot.occupancy >= 0.9) fill = '#166534';
          else if (slot.occupancy >= 0.5) fill = '#1e40af';
          else if (slot.occupancy >= 0.25) fill = '#92400e';
          else fill = '#7f1d1d';
        }

        const isSelected = selectedSlotId === slot.locationId;
        ctx.fillStyle = fill;
        ctx.fillRect(rx, ry, slotW, slotH);
        if (isSelected) {
          ctx.strokeStyle = '#60a5fa';
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
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
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
      ctx.fillStyle = '#334155';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = rb.batteryLevel > 30 ? '#22c55e' : rb.batteryLevel > 15 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barW * (rb.batteryLevel / 100), barH);
    }

    // Scale indicator
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Scale: 1px = ${(1 / s).toFixed(2)}m | ${layout.width}m × ${layout.height}m`, PADDING, canvasSize.h - 6);
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
