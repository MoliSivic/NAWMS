import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  warehouseLayout,
  findRoute,
  locationToWaypointId,
} from "@/data/warehouseLayout";
import { mockRobots, mockTasks, mockPallets, mockZones } from "@/data/mockData";
import type { Robot, RobotTask, RouteWaypoint } from "@/data/types";
import { Plus, Minus } from "lucide-react";

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
  tier: "top" | "bottom";
  slot: "P1" | "P2";
  palletId: string | null;
  occupancy: number;
  shelfId: string;
  zoneId: string;
  /** Pixel rect on canvas for hit-testing */
  rect: { x: number; y: number; w: number; h: number };
}

interface PanOffset {
  x: number;
  y: number;
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
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
const DRAG_THRESHOLD = 4;
const PAN_OVERSCROLL = 96;

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  if (r.robotId === "ROB-001") return { x: 14, y: 8.5 };
  // ROB-002 idle — on the corridor near the door
  if (r.robotId === "ROB-002") return { x: 2, y: 32 };
  // ROB-003 error — on the aisle below C/D, near Zone D
  return { x: 37.5, y: 26.5 };
}

function robotColor(status: Robot["status"]): string {
  switch (status) {
    case "active":
      return "#22c55e";
    case "idle":
      return "#f59e0b";
    case "charging":
      return "#3b82f6";
    case "error":
      return "#ef4444";
    case "maintenance":
      return "#8b5cf6";
    default:
      return "#6b7280";
  }
}

// ─── Theme palette ───
function getCanvasPalette() {
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
    slotPalletOnly: '#cbd5e1',
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

function getMapControlPalette() {
  return {
    panelBg: 'rgba(255,255,255,0.82)',
    panelBorder: 'rgba(148,163,184,0.22)',
    panelShadow: '0 10px 22px rgba(15, 23, 42, 0.10)',
    buttonBg: 'rgba(248,250,252,0.98)',
    buttonBorder: 'rgba(148,163,184,0.32)',
    buttonText: '#0f172a',
    buttonHoverBg: 'rgba(241,245,249,1)',
    buttonHoverBorder: 'rgba(59,130,246,0.24)',
    activeBg: 'rgba(248,250,252,0.94)',
    activeBorder: 'rgba(34,211,238,0.95)',
    activeText: '#0f172a',
    activeShadow: '0 0 0 2px rgba(34,211,238,0.18)',
  };
}

// ─── Component ───
const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({
  onSlotClick,
  selectedSlotId,
  className,
}) => {
  const controlPalette = getMapControlPalette();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number>(0);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const dragMovedRef = useRef(false);
  const robotsRef = useRef<CanvasRobot[]>([]);
  const slotsRef = useRef<SlotInfo[]>([]);
  const scaleRef = useRef(1);
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });

  const layout = warehouseLayout;
  const PADDING = 20; // px padding around the warehouse

  // Base scale: pixels per meter at 1:1 fit.
  const basePxPerM = useCallback(() => {
    return Math.min(
      (canvasSize.w - PADDING * 2) / layout.width,
      (canvasSize.h - PADDING * 2) / layout.height,
    );
  }, [canvasSize, layout]);

  const pxPerM = useCallback(
    () => basePxPerM() * zoomLevel,
    [basePxPerM, zoomLevel],
  );

  const getPanLimits = useCallback(
    (targetZoom = zoomLevel) => {
      const scale = basePxPerM() * targetZoom;
      const overflowX = Math.abs(canvasSize.w - layout.width * scale) / 2;
      const overflowY = Math.abs(canvasSize.h - layout.height * scale) / 2;
      return {
        x: overflowX + PAN_OVERSCROLL,
        y: overflowY + PAN_OVERSCROLL,
      };
    },
    [basePxPerM, canvasSize, layout, zoomLevel],
  );

  const clampPanOffset = useCallback(
    (nextPan: PanOffset, targetZoom = zoomLevel) => {
      if (targetZoom === 1) return { x: 0, y: 0 };
      const limits = getPanLimits(targetZoom);
      return {
        x: clamp(nextPan.x, -limits.x, limits.x),
        y: clamp(nextPan.y, -limits.y, limits.y),
      };
    },
    [getPanLimits, zoomLevel],
  );

  const offsetX = useCallback(() => {
    const s = pxPerM();
    return (canvasSize.w - layout.width * s) / 2 + panOffset.x;
  }, [canvasSize, pxPerM, layout, panOffset.x]);

  const offsetY = useCallback(() => {
    const s = pxPerM();
    return (canvasSize.h - layout.height * s) / 2 + panOffset.y;
  }, [canvasSize, pxPerM, layout, panOffset.y]);

  const toCanvasX = useCallback(
    (mx: number) => offsetX() + mx * pxPerM(),
    [pxPerM, offsetX],
  );
  const toCanvasY = useCallback(
    (my: number) => offsetY() + my * pxPerM(),
    [pxPerM, offsetY],
  );

  const applyZoom = useCallback(
    (targetZoom: number) => {
      const nextZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
      setZoomLevel(nextZoom);
      setPanOffset((prev) => {
        const nextPan = clampPanOffset(prev, nextZoom);
        return nextPan.x === prev.x && nextPan.y === prev.y ? prev : nextPan;
      });
    },
    [clampPanOffset],
  );

  useEffect(() => {
    setPanOffset((prev) => {
      const nextPan = clampPanOffset(prev);
      return nextPan.x === prev.x && nextPan.y === prev.y ? prev : nextPan;
    });
  }, [canvasSize, clampPanOffset]);

  // ─── Initialize robots with routes ───
  useEffect(() => {
    const activeTask = (rid: string): RobotTask | undefined =>
      mockTasks.find((t) => t.robotId === rid && t.status === "in-progress");
    const activeRobots = mockRobots.filter((r) => r.status === "active");

    robotsRef.current = activeRobots.map((r) => {
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
    const ro = new ResizeObserver((entries) => {
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastFrameTs = 0;

    function tick(timestamp: number) {
      const deltaSec =
        lastFrameTs === 0
          ? 0
          : Math.min((timestamp - lastFrameTs) / 1000, MAX_FRAME_DELTA);
      lastFrameTs = timestamp;

      const s = pxPerM();
      scaleRef.current = s;

      // Move active robots continuously along their route at a capped speed.
      for (const rb of robotsRef.current) {
        if (rb.status !== "active" || rb.route.length === 0 || deltaSec === 0)
          continue;

        let remainingStep =
          Math.max(MIN_ROUTE_SPEED, rb.currentSpeed * ROUTE_SPEED_FACTOR) *
          deltaSec;
        while (remainingStep > 0) {
          const distToTarget = distance(
            rb.displayX,
            rb.displayY,
            rb.targetX,
            rb.targetY,
          );

          if (distToTarget < 0.01) {
            rb.displayX = rb.targetX;
            rb.displayY = rb.targetY;
            advanceRoute(rb);
            if (
              distance(rb.displayX, rb.displayY, rb.targetX, rb.targetY) < 0.01
            )
              break;
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
  }, [canvasSize, pxPerM, selectedSlotId, offsetX, offsetY]);

  // ─── Draw function ───
  function draw(ctx: CanvasRenderingContext2D, s: number) {
    const p = getCanvasPalette();
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
    ctx.strokeRect(
      toCanvasX(0),
      toCanvasY(0),
      layout.width * s,
      layout.height * s,
    );

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
      const shortLabel = zone.label.split("—")[0].trim();

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
      const label =
        ctx.measureText(fullLabel).width <= labelMaxW ? fullLabel : shortLabel;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
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
    ctx.fillRect(
      toCanvasX(door.x),
      toCanvasY(door.y),
      door.width * s,
      door.height * s,
    );
    ctx.strokeStyle = p.doorStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      toCanvasX(door.x),
      toCanvasY(door.y),
      door.width * s,
      door.height * s,
    );
    ctx.fillStyle = p.doorText;
    ctx.font = `bold ${Math.max(10, s * 1)}px sans-serif`;
    ctx.fillText(
      "DOOR (In/Out)",
      toCanvasX(door.x) + 4,
      toCanvasY(door.y) + (door.height * s) / 2 + 4,
    );

    // Shelves + slots
    const newSlots: SlotInfo[] = [];
    for (const shelf of layout.shelves) {
      const sx = toCanvasX(shelf.x);
      const sy = toCanvasY(shelf.y);
      const sw = shelf.width * s;
      const sh = shelf.height * s;
      const clipInset = 1;
      const labelBandH = Math.max(12, Math.round(s * 0.9));
      const innerPadX = Math.max(3, Math.round(s * 0.12));
      const innerPadBottom = Math.max(3, Math.round(s * 0.12));
      const labelGap = Math.max(3, Math.round(s * 0.08));
      const slotGap = Math.max(2, Math.round(s * 0.08));
      const labelX = Math.round(sx + innerPadX);
      const labelY = Math.round(sy + Math.max(10, labelBandH * 0.75));
      const gridX = Math.round(sx + innerPadX);
      const gridY = Math.round(sy + labelBandH + labelGap);
      const gridRight = Math.round(sx + sw - innerPadX);
      const gridBottom = Math.round(sy + sh - innerPadBottom);
      const gridW = Math.max(4, gridRight - gridX);
      const gridH = Math.max(4, gridBottom - gridY);
      const slotW = Math.max(1, Math.floor((gridW - slotGap) / 2));
      const slotH = Math.max(1, Math.floor((gridH - slotGap) / 2));

      // Shelf background
      ctx.fillStyle = p.shelfBg;
      ctx.fillRect(sx, sy, sw, sh);

      // Shelf label
      ctx.fillStyle = p.shelfLabel;
      ctx.font = `${Math.max(8, s * 0.7)}px monospace`;
      ctx.fillText(shelf.shelfId, labelX, labelY);

      ctx.save();
      ctx.beginPath();
      ctx.rect(
        sx + clipInset,
        sy + clipInset,
        Math.max(0, sw - clipInset * 2),
        Math.max(0, sh - clipInset * 2),
      );
      ctx.clip();

      // Draw 4 slots (2×2 grid inside an inset content box)
      for (const slot of shelf.slots) {
        const col = slot.slot === "P1" ? 0 : 1;
        const row = slot.tier === "top" ? 0 : 1;
        const rx = col === 0 ? gridX : gridRight - slotW;
        const ry = row === 0 ? gridY : gridBottom - slotH;

        // Occupancy color
        let fill = p.slotEmpty;
        if (slot.palletId) {
          if (slot.occupancy === 0) fill = p.slotPalletOnly;
          else if (slot.occupancy >= 0.9) fill = p.slotHigh;
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

      ctx.restore();

      // Paint the frame after slots so the border always stays visible.
      ctx.strokeStyle = p.shelfBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);
    }
    slotsRef.current = newSlots;

    // Robot route overlays
    for (const rb of robotsRef.current) {
      if (rb.route.length < 2) continue;
      ctx.strokeStyle = robotColor(rb.status) + "55";
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
    const robotRadius = Math.max(5, s * 0.6);
    for (const rb of robotsRef.current) {
      const cx = toCanvasX(rb.displayX);
      const cy = toCanvasY(rb.displayY);
      const color = robotColor(rb.status);

      // Glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, robotRadius * 2);
      grad.addColorStop(0, color + "44");
      grad.addColorStop(1, color + "00");
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
      ctx.font = `bold ${Math.max(5, s * 0.38)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rb.robotId.replace("ROB-", "R"), cx, cy);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";

      // Battery bar below robot
      const barW = robotRadius * 2;
      const barH = 3;
      const barX = cx - robotRadius;
      const barY = cy + robotRadius + 3;
      ctx.fillStyle = p.batteryBg;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle =
        rb.batteryLevel > 30
          ? "#22c55e"
          : rb.batteryLevel > 15
            ? "#f59e0b"
            : "#ef4444";
      ctx.fillRect(barX, barY, barW * (rb.batteryLevel / 100), barH);
    }

    // Scale indicator
    ctx.fillStyle = p.scaleText;
    ctx.font = "10px sans-serif";
    ctx.fillText(
      `Scale: 1px = ${(1 / s).toFixed(2)}m | ${layout.width}m × ${layout.height}m`,
      12,
      canvasSize.h - 6,
    );
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (zoomLevel === 1) return;
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
      dragMovedRef.current = false;
    },
    [panOffset.x, panOffset.y, zoomLevel],
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        dragMovedRef.current = true;
      }

      const nextPan = clampPanOffset({
        x: dragState.panX + dx,
        y: dragState.panY + dy,
      });

      setPanOffset((prev) =>
        prev.x === nextPan.x && prev.y === nextPan.y ? prev : nextPan,
      );
    }

    function handleMouseUp() {
      dragStateRef.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampPanOffset]);

  // ─── Click handler ───
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onSlotClick) return;
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }

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
    },
    [onSlotClick],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 500,
        position: "relative",
      }}
    >
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-[3px] rounded-[0.82rem] p-[3px] backdrop-blur-xl"
        style={{
          background: controlPalette.panelBg,
          border: `1px solid ${controlPalette.panelBorder}`,
          boxShadow: controlPalette.panelShadow,
        }}
      >
        {(() => {
          const plusActive = zoomLevel > 1;
          const minusActive = false;
          const resetActive = zoomLevel === 1;
          const styleFor = (active: boolean) => ({
            background: active
              ? controlPalette.activeBg
              : controlPalette.buttonBg,
            // Use a bright blue border for active (1:1) button, no shadow
            border: active ? "2px solid #22d3ee" : "none",
            color: active
              ? controlPalette.activeText
              : controlPalette.buttonText,
            // Remove boxShadow for active, keep subtle for inactive
            boxShadow: active ? "none" : "inset 0 1px 0 rgba(255,255,255,0.04)",
          });
          const hoverHandlers = (active: boolean) => ({
            onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = controlPalette.buttonHoverBg;
              e.currentTarget.style.borderColor =
                controlPalette.buttonHoverBorder;
            },
            onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = active
                ? controlPalette.activeBg
                : controlPalette.buttonBg;
              e.currentTarget.style.borderColor = active
                ? "#22d3ee"
                : controlPalette.buttonBorder;
            },
          });
          return (
            <>
              <button
                type="button"
                onClick={() => applyZoom(zoomLevel + ZOOM_STEP)}
                disabled={zoomLevel >= MAX_ZOOM}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[0.58rem] transition disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Zoom in"
                title="Zoom in"
                style={{}}
              >
                <Plus className="h-[14px] w-[14px]" strokeWidth={2.35} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="flex h-[30px] min-w-[42px] items-center justify-center rounded-[0.58rem] px-2 text-[0.78rem] font-semibold tracking-[0.01em] transition"
                aria-label="Reset zoom"
                title="Reset zoom"
                style={{}}
              >
                1:1
              </button>
            </>
          );
        })()}
      </div>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{
          cursor:
            zoomLevel === 1
              ? "pointer"
              : dragStateRef.current
                ? "grabbing"
                : "grab",
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default WarehouseCanvas;
export type { SlotInfo };
