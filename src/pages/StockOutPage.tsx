import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { mockPackages, mockPallets } from "@/data/mockData";
import { warehouseLayout } from "@/data/warehouseLayout";
import WarehouseCanvas, { LiveTask } from "@/components/WarehouseCanvas";
import {
  CheckCircle,
  ArrowRight,
  ScanLine,
  Package,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";

function useSessionState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {}
    return initialValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

const steps = [
  "Request Details",
  "System Selection (FIFO)",
  "Confirm & Dispatch",
  "Robot Retrieval",
  "Outbound Verification",
];

const StockOutPage: React.FC = () => {
  const [step, setStep] = useSessionState("nawms_so_step", 0);
  const [requestType, setRequestType] = useSessionState<
    "denomination"
  >("nawms_so_reqType", "denomination");
  const [denomReq, setDenomReq] = useSessionState(
    "nawms_so_denomReq",
    "KHR 100000",
  );
  const [pkgCount, setPkgCount] = useSessionState("nawms_so_pkgCount", "0");
  const [submitted, setSubmitted] = useSessionState(
    "nawms_so_submitted",
    false,
  );
  const [scanList, setScanList] = useSessionState<string[]>(
    "nawms_so_scanList",
    [],
  );
  const [scanInput, setScanInput] = useState("");
  const [verified, setVerified] = useSessionState("nawms_so_verified", false);

  const [robotStatus, setRobotStatus] = useSessionState<
    "idle" | "retrieving" | "arrived"
  >("nawms_so_robotStatus", "idle");
  const [retrievalPhase, setRetrievalPhase] = useSessionState<
    "idle" | "moving_to_shelf" | "loading" | "returning"
  >("nawms_so_retrievalPhase", "idle");
  const [countdown, setCountdown] = useSessionState<number | null>(
    "nawms_so_countdown",
    null,
  );

  // FIFO selection respecting request type
  const selectedPkgs = useMemo(() => {
    const stored = mockPackages
      .filter((p) => p.status === "stored")
      .sort(
        (a, b) =>
          new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime(),
      );

    const parts = denomReq.trim().split(/\s+/);
    const cur = parts[0]?.toUpperCase() || "KHR";
    const denomVal = Number(parts[1]) || 0;
    
    const matching = stored.filter(
      (p) =>
        p.currency === cur &&
        (denomVal === 0 ||
          p.denominations.some((d) => d.denomination === denomVal)),
    );
    
    return matching.slice(0, Number(pkgCount) || 5);
  }, [denomReq, pkgCount]);

  const totalSelectedValue = selectedPkgs.reduce((s, p) => s + p.totalValue, 0);

  const handleScan = () => {
    if (scanInput.trim() && !scanList.includes(scanInput)) {
      setScanList((l) => [...l, scanInput]);
      setScanInput("");
    }
  };

  const allScanned = scanList.length === selectedPkgs.length;

  const handleLiveTaskArrival = useCallback(() => {
    if (retrievalPhase === "moving_to_shelf") {
      setRetrievalPhase("loading");
    } else if (retrievalPhase === "returning") {
      setRobotStatus("arrived");
      setRetrievalPhase("idle");
    }
  }, [retrievalPhase, setRetrievalPhase, setRobotStatus]);

  useEffect(() => {
    let t: string | number | NodeJS.Timeout | undefined;
    if (retrievalPhase === "loading") {
      t = setTimeout(() => setRetrievalPhase("returning"), 4000);
    }
    return () => clearTimeout(t);
  }, [retrievalPhase, setRetrievalPhase]);

  const liveTask: LiveTask | null = useMemo(() => {
    if (robotStatus === "idle" || robotStatus === "arrived") return null;
    const targetLocation = selectedPkgs[0]?.locationCode || "A1-01"; // Targeting the first package's location

    if (retrievalPhase === "moving_to_shelf" || retrievalPhase === "loading") {
      return {
        robotId: "ROB-002",
        sourceLocation: "Inbound Area",
        targetLocation: targetLocation,
        status: "storing", // Moving towards the shelf
      };
    }
    if (retrievalPhase === "returning") {
      return {
        robotId: "ROB-002",
        sourceLocation: targetLocation,
        targetLocation: "Inbound Area",
        status: "retrieving", // Moving back
      };
    }
    return null;
  }, [robotStatus, retrievalPhase, selectedPkgs]);

  const confirmRelease = () => {
    setVerified(true);

    // Cleanup warehouse layout & data globally across the system
    selectedPkgs.forEach((pkg) => {
      const originalPkg = mockPackages.find(
        (p) => p.packageId === pkg.packageId,
      );
      if (originalPkg) {
        originalPkg.status = "released";
        originalPkg.releasedDate = new Date().toISOString();
      }

      const pallet = mockPallets.find((p) => p.palletId === pkg.palletId);
      if (pallet) {
        pallet.currentPackageCount = Math.max(
          0,
          pallet.currentPackageCount - 1,
        );
        if (pallet.currentPackageCount === 0) {
          pallet.status = "available";

          for (const shelf of warehouseLayout.shelves) {
            const slot = shelf.slots.find(
              (s) => s.locationId === pallet.locationCode,
            );
            if (slot && slot.palletId === pallet.palletId) {
              slot.palletId = null;
              slot.occupancy = 0;
            }
          }
          pallet.locationCode = "";
        }
      }
    });
  };

  const clearSession = () => {
    setStep(0);
    setDenomReq("KHR 100000");
    setPkgCount("0");
    setSubmitted(false);
    setScanList([]);
    setVerified(false);
    setRobotStatus("idle");
    setRetrievalPhase("idle");
  };

  const handleStartDispatch = () => {
    setSubmitted(true);
    setRobotStatus("retrieving");
    setRetrievalPhase("moving_to_shelf");
    setStep(3);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-start p-4 py-12">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-xl font-semibold">
            Stock Out — Process Outbound Request
          </h1>
          <p className="text-sm text-muted-foreground">
            Controlled stock-out with FIFO selection
          </p>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {steps.map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="w-4 text-center">{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-card rounded-lg border p-6 animate-fade-in w-full shadow-sm">
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Request Configuration</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                  <Package className="w-3 h-3" />
                  DENOMINATION MODE
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                    Denomination Requirement
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={denomReq}
                      onChange={(e) => setDenomReq(e.target.value)}
                      placeholder="e.g. KHR 100000"
                      className="w-full pl-3 pr-10 py-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                    Number of Packages
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={pkgCount === "0" || pkgCount === "" ? "" : pkgCount}
                    onChange={(e) => setPkgCount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                    Request Rationale
                  </label>
                  <textarea
                    defaultValue="Scheduled disbursement to Provincial Branch for atmospheric liquidity maintenance."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  size="sm" 
                  onClick={() => setStep(1)}
                  className="px-6 h-10 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Analyze & Select Packages <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  System Selected Packages (FIFO)
                </h2>
                <div className="flex items-center gap-1 text-[10px] text-success bg-green-50 px-2 py-1 rounded border border-success/20">
                  <Clock className="w-3 h-3" /> FIFO Compliant — Oldest First
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Package ID
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Location
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Pallet
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Arrival
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Denominations
                      </th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPkgs.map((pkg) => (
                      <tr
                        key={pkg.packageId}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="py-2 px-3 font-mono font-medium">
                          {pkg.packageId}
                        </td>
                        <td className="py-2 px-3">{pkg.locationCode}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {pkg.palletId}
                        </td>
                        <td className="py-2 px-3">
                          {new Date(pkg.arrivalDate).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          {pkg.denominations.map((d, i) => (
                            <span
                              key={i}
                              className="inline-block mr-1 px-1.5 py-0.5 bg-background border rounded text-[10px]"
                            >
                              {d.currency} {d.denomination} x{d.quantity}
                            </span>
                          ))}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {pkg.currency} {pkg.totalValue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {selectedPkgs.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No matching packages found for criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-navy-50 border border-navy-100 rounded flex justify-between items-center text-primary">
                <span className="text-sm font-medium">
                  Total Selected Value
                </span>
                <span className="text-lg font-bold">
                  USD {totalSelectedValue.toLocaleString()}
                </span>
              </div>

              {/* Estimated robot route */}
              <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded text-xs text-blue-700 flex items-start gap-3">
                <Package className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-80" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px]">
                    Estimated Robot Retrieval Route
                  </p>
                  <p className="mt-1 font-medium">
                    {selectedPkgs
                      .map((p) => p.locationCode)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(" → ")}{" "}
                    → Outbound Door
                  </p>
                  <p className="opacity-70 mt-0.5">
                    Estimated retrieval time: ~
                    {Math.max(5, selectedPkgs.length * 2)} minutes for{" "}
                    {selectedPkgs.length} packages
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button size="sm" variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep(2)}
                  disabled={selectedPkgs.length === 0}
                >
                  Review & Confirm <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
              <h2 className="text-sm font-medium">
                Confirm & Dispatch Workflow
              </h2>

              <div className="p-4 bg-muted/50 rounded border space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Dispatch Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background p-3 rounded border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Packages to Verify
                    </p>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {selectedPkgs.length}
                    </p>
                  </div>
                  <div className="bg-background p-3 rounded border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Total Outbound Value
                    </p>
                    <p className="text-2xl font-bold font-mono text-primary">
                      USD {totalSelectedValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Please confirm the request before dispatching the automated
                  retrieval sequence. Ensure Outbound Area is clear for robot
                  drop-off.
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <Button size="sm" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartDispatch}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Confirm & Dispatch Robot{" "}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  Robotic Retrieval Active
                </h2>
                {robotStatus === "retrieving" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-full animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {retrievalPhase === "moving_to_shelf"
                      ? `Robot Dispatching to ${selectedPkgs[0]?.locationCode || "Target"}`
                      : retrievalPhase === "loading"
                        ? `Loading pallet at ${selectedPkgs[0]?.locationCode || "Target"}...`
                        : `Robot Returning with Payload`}
                  </div>
                )}
                {robotStatus === "arrived" && (
                  <div className="px-3 py-1.5 bg-success/10 border border-success/30 text-success text-[10px] font-bold rounded-full flex items-center gap-1.5">
                    <Check className="w-3 h-3" /> Pallet Delivered to Outbound
                  </div>
                )}
              </div>

              {robotStatus === "retrieving" && (
                <div className="p-4 bg-muted/30 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-4">
                    The automated system is currently fetching the selected
                    packages. Please wait for the robot to complete its route on
                    the warehouse map below.
                  </p>
                </div>
              )}

              {robotStatus === "arrived" && (
                <div className="p-6 bg-success/5 border border-success/30 rounded-xl flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-500">
                  <div className="w-12 h-12 rounded-full bg-success text-white flex items-center justify-center shadow-lg">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-success mb-1">
                      Payload Arrived
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      The robot has delivered all queried pallets to the
                      Outbound Door.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setStep(4)}
                    className="w-full max-w-xs mt-2"
                  >
                    Proceed to Outbound Verification{" "}
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  Outbound Door Verification
                </h2>
                <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded flex items-center gap-1.5">
                  <ScanLine className="w-3 h-3" /> Scanner Active
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan each outgoing package at the warehouse exit to verify
                against the approved request. Packages must match exactly.
              </p>

              <div className="p-5 bg-muted/50 rounded-lg border-2 border-dashed border-primary/30 flex flex-col items-center sm:flex-row sm:items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                  <ScanLine className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Barcode Input
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {scanList.length} / {selectedPkgs.length} SCANNED
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                      placeholder="Scan package QR or ID..."
                      className="flex-1 px-4 py-2 border rounded-md text-sm bg-background font-mono shadow-inner"
                      disabled={verified || allScanned}
                      autoFocus={!allScanned}
                    />
                    <Button
                      size="sm"
                      onClick={handleScan}
                      disabled={verified || allScanned || !scanInput.trim()}
                    >
                      Scan/Enter
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedPkgs.map((pkg) => {
                    const scanned =
                      scanList.includes(pkg.packageId) ||
                      scanList.includes(`NBC-${pkg.packageId}`);
                    return (
                      <div
                        key={pkg.packageId}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-md border transition-all ${scanned ? "bg-green-50 border-success/20" : "bg-background hover:bg-muted/50 border-border"}`}
                      >
                        {scanned ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground/50" />
                        )}
                        <div className="flex-1">
                          <span
                            className={`font-mono font-bold block ${scanned ? "text-success" : "text-foreground"}`}
                          >
                            {pkg.packageId}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Pallet: {pkg.palletId} | Value: {pkg.currency}{" "}
                            {pkg.totalValue.toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${scanned ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                        >
                          {scanned ? "Verified" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!verified && !allScanned && scanList.length > 0 && (
                <div className="p-3 bg-amber-50 border border-warning/20 rounded text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                  <span>
                    Missing items! All {selectedPkgs.length} packages must be
                    verified before release.{" "}
                    {selectedPkgs.length - scanList.length} remaining.
                  </span>
                </div>
              )}

              {!verified && allScanned && (
                <Button
                  size="lg"
                  onClick={confirmRelease}
                  className="w-full bg-success hover:bg-success/90 text-white font-bold h-12 animate-in slide-in-from-bottom-2"
                >
                  Confirm Shipment Release ({scanList.length} items)
                </Button>
              )}

              {verified && (
                <div className="p-6 bg-green-50 border border-success/30 rounded-xl space-y-4 animate-in zoom-in-95 duration-500 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center shadow-lg shadow-success/20">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-success mb-1">
                      Outbound Operation Complete
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Verification successful. Packages have been released,
                      locations cleared, and dispatch logged in audit trail.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSession}
                    className="mt-2 w-full max-w-xs"
                  >
                    Start New Outbound Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {step >= 3 && !verified && (
          <div className="w-full max-w-4xl space-y-3 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Live
                Vault Topology
              </h3>
            </div>
            <div className="bg-card rounded-lg border border-border overflow-hidden h-[550px] relative shadow-sm">
              <WarehouseCanvas
                liveTask={liveTask}
                onLiveTaskArrival={handleLiveTaskArrival}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockOutPage;
