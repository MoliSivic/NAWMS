import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_CURRENCY,
  getAllowedSackValues,
} from "@/data/denominationRules";
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
  "Details",
  "System Selection (FIFO)",
  "Confirm & Dispatch",
  "Robot Retrieval",
  "Outbound Verification",
];

function parseDenominationRequest(value: string) {
  const parts = value.trim().split(/\s+/);
  return {
    currency: parts[0]?.toUpperCase() || DEFAULT_CURRENCY,
    denomination: Number(parts[1]) || 0,
  };
}

const StockOutPage: React.FC = () => {
  const [step, setStep] = useSessionState("nawms_so_step", 0);
  const [requestType, setRequestType] = useSessionState<
    "denomination"
  >("nawms_so_reqType", "denomination");
  const [denomReq, setDenomReq] = useSessionState(
    "nawms_so_denomReq",
    `${DEFAULT_CURRENCY} 100000`,
  );
  const [valuePerSack, setValuePerSack] = useSessionState(
    "nawms_so_valuePerSack",
    5000000,
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
  const [retrievalPalletIndex, setRetrievalPalletIndex] = useSessionState(
    "nawms_so_retrievalPalletIndex",
    0,
  );

  const denominationOptions = useMemo(() => {
    const options = new Map<string, { currency: string; denomination: number }>();

    mockPackages
      .filter((pkg) => pkg.status === "stored")
      .forEach((pkg) => {
        pkg.denominations.forEach((line) => {
          const key = `${line.currency} ${line.denomination}`;
          if (!options.has(key)) {
            options.set(key, {
              currency: line.currency,
              denomination: line.denomination,
            });
          }
        });
      });

    return Array.from(options.values()).sort((a, b) => {
      if (a.currency !== b.currency) {
        return a.currency.localeCompare(b.currency);
      }
      return a.denomination - b.denomination;
    });
  }, []);

  const selectedDenomination = useMemo(
    () => parseDenominationRequest(denomReq),
    [denomReq],
  );
  const requestedPackageCount = Math.max(0, Number(pkgCount) || 0);
  const isPackageCountValid = requestedPackageCount >= 1;

  const valuePerSackOptions = useMemo(() => {
    const matchingValues = new Set<number>();

    mockPackages
      .filter((pkg) => pkg.status === "stored")
      .forEach((pkg) => {
        const matchesDenomination =
          pkg.currency === selectedDenomination.currency &&
          pkg.denominations.some(
            (line) => line.denomination === selectedDenomination.denomination,
          );

        if (matchesDenomination) {
          matchingValues.add(pkg.totalValue);
        }
      });

    return getAllowedSackValues(selectedDenomination.denomination).filter(
      (value) => matchingValues.has(value),
    );
  }, [selectedDenomination]);

  useEffect(() => {
    if (valuePerSackOptions.length === 0) {
      if (valuePerSack !== 0) {
        setValuePerSack(0);
      }
      return;
    }

    if (!valuePerSackOptions.includes(valuePerSack)) {
      setValuePerSack(valuePerSackOptions[0]);
    }
  }, [setValuePerSack, valuePerSack, valuePerSackOptions]);

  const matchingPkgs = useMemo(() => {
    const stored = mockPackages
      .filter((p) => p.status === "stored")
      .sort(
        (a, b) =>
          new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime(),
      );

    const matching = stored.filter(
      (p) =>
        p.currency === selectedDenomination.currency &&
        (selectedDenomination.denomination === 0 ||
          p.denominations.some(
            (d) => d.denomination === selectedDenomination.denomination,
          )) &&
        (valuePerSack === 0 || p.totalValue === valuePerSack),
    );

    return matching;
  }, [selectedDenomination, valuePerSack]);

  const availablePackageCount = matchingPkgs.length;
  const isRequestExceedingAvailability =
    isPackageCountValid && requestedPackageCount > availablePackageCount;

  // FIFO selection respecting request type
  const selectedPkgs = useMemo(() => {
    if (!isPackageCountValid) {
      return [];
    }

    return matchingPkgs.slice(0, requestedPackageCount);
  }, [
    isPackageCountValid,
    matchingPkgs,
    requestedPackageCount,
  ]);

  const totalSelectedValue = selectedPkgs.reduce((s, p) => s + p.totalValue, 0);
  const totalRequestValue = valuePerSack * requestedPackageCount;
  const missingPackageCount = Math.max(0, requestedPackageCount - selectedPkgs.length);

  const selectedPalletGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        palletId: string;
        locationCode: string;
        packageCount: number;
        totalValue: number;
        oldestArrival: string;
        packages: typeof selectedPkgs;
      }
    >();

    selectedPkgs.forEach((pkg) => {
      const existing = groups.get(pkg.palletId);
      if (existing) {
        existing.packageCount += 1;
        existing.totalValue += pkg.totalValue;
        existing.packages.push(pkg);
        if (
          new Date(pkg.arrivalDate).getTime() <
          new Date(existing.oldestArrival).getTime()
        ) {
          existing.oldestArrival = pkg.arrivalDate;
        }
        return;
      }

      groups.set(pkg.palletId, {
        palletId: pkg.palletId,
        locationCode: pkg.locationCode,
        packageCount: 1,
        totalValue: pkg.totalValue,
        oldestArrival: pkg.arrivalDate,
        packages: [pkg],
      });
    });

    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(a.oldestArrival).getTime() -
        new Date(b.oldestArrival).getTime(),
    );
  }, [selectedPkgs]);

  const theoreticalMinPallets = Math.ceil(requestedPackageCount / 40);
  const currentRetrievalPallet =
    selectedPalletGroups[retrievalPalletIndex] || null;

  const selectedScanTargets = useMemo(() => {
    const targets = new Map<string, string>();

    selectedPkgs.forEach((pkg) => {
      targets.set(pkg.packageId.toUpperCase(), pkg.packageId);
      targets.set(pkg.qrCode.toUpperCase(), pkg.packageId);
    });

    return targets;
  }, [selectedPkgs]);

  const handleScan = () => {
    const rawValue = scanInput.trim();
    if (!rawValue) return;

    const matchedPackageId = selectedScanTargets.get(rawValue.toUpperCase());
    if (matchedPackageId && !scanList.includes(matchedPackageId)) {
      setScanList((list) => [...list, matchedPackageId]);
    }

    setScanInput("");
  };

  const allScanned =
    selectedPkgs.length > 0 &&
    selectedPkgs.every((pkg) => scanList.includes(pkg.packageId));

  const handleLiveTaskArrival = useCallback(() => {
    if (retrievalPhase === "moving_to_shelf") {
      setRetrievalPhase("loading");
    } else if (retrievalPhase === "returning") {
      const isLastPallet =
        retrievalPalletIndex >= selectedPalletGroups.length - 1;

      if (isLastPallet) {
        setRobotStatus("arrived");
        setRetrievalPhase("idle");
        return;
      }

      setRetrievalPalletIndex((current) => current + 1);
      setRetrievalPhase("moving_to_shelf");
    }
  }, [
    retrievalPalletIndex,
    retrievalPhase,
    selectedPalletGroups.length,
    setRetrievalPalletIndex,
    setRetrievalPhase,
    setRobotStatus,
  ]);

  useEffect(() => {
    let t: string | number | NodeJS.Timeout | undefined;
    if (retrievalPhase === "loading") {
      t = setTimeout(() => setRetrievalPhase("returning"), 4000);
    }
    return () => clearTimeout(t);
  }, [retrievalPhase, setRetrievalPhase]);

  const liveTask: LiveTask | null = useMemo(() => {
    if (robotStatus === "idle" || robotStatus === "arrived") return null;
    const targetLocation = currentRetrievalPallet?.locationCode || "A1-01";

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
  }, [currentRetrievalPallet, retrievalPhase, robotStatus]);

  const confirmRelease = () => {
    if (!allScanned) return;

    setVerified(true);
    const releasedAt = new Date().toISOString();
    const releasedPackageIds = new Set(selectedPkgs.map((pkg) => pkg.packageId));
    const touchedPalletIds = new Set(selectedPkgs.map((pkg) => pkg.palletId));

    selectedPkgs.forEach((pkg) => {
      const originalPkg = mockPackages.find(
        (p) => p.packageId === pkg.packageId,
      );

      if (originalPkg) {
        originalPkg.status = "released";
        originalPkg.releasedDate = releasedAt;
        originalPkg.palletId = "";
        originalPkg.locationCode = "Released";
      }
    });

    touchedPalletIds.forEach((palletId) => {
      const pallet = mockPallets.find((item) => item.palletId === palletId);
      if (!pallet) return;

      const currentLocation = pallet.locationCode;
      pallet.packages = pallet.packages.filter(
        (packageId) => !releasedPackageIds.has(packageId),
      );
      pallet.currentPackageCount = pallet.packages.length;

      const slot = warehouseLayout.shelves
        .flatMap((shelf) => shelf.slots)
        .find((item) => item.locationId === currentLocation);

      if (pallet.currentPackageCount === 0) {
        pallet.status = "available";
        if (slot && slot.palletId === pallet.palletId) {
          slot.palletId = null;
          slot.occupancy = 0;
        }
        pallet.locationCode = "";
        return;
      }

      pallet.status = "in-use";
      if (slot && slot.palletId === pallet.palletId) {
        slot.occupancy = pallet.currentPackageCount / pallet.maxCapacity;
      }
    });
  };

  const clearSession = () => {
    setStep(0);
    setDenomReq(`${DEFAULT_CURRENCY} 100000`);
    setValuePerSack(0);
    setPkgCount("0");
    setSubmitted(false);
    setScanList([]);
    setScanInput("");
    setVerified(false);
    setRobotStatus("idle");
    setRetrievalPhase("idle");
    setRetrievalPalletIndex(0);
  };

  const handleStartDispatch = () => {
    if (selectedPalletGroups.length === 0) return;

    setSubmitted(true);
    setScanList([]);
    setVerified(false);
    setRetrievalPalletIndex(0);
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

        <div className="stock-out-steps flex items-center justify-center sm:justify-start gap-2 overflow-x-auto pb-2">
          {steps.map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <span className="w-4 text-center">{i + 1}</span>
                )}
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
                  {availablePackageCount} sacks available
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                    Denomination Requirement
                  </label>
                  <Select value={denomReq} onValueChange={setDenomReq}>
                    <SelectTrigger className="h-10 text-sm bg-background shadow-sm">
                      <SelectValue placeholder="Select currency and denomination" />
                    </SelectTrigger>
                    <SelectContent>
                      {denominationOptions.map((option) => {
                        const value = `${option.currency} ${option.denomination}`;
                        return (
                          <SelectItem key={value} value={value}>
                            {option.currency} {option.denomination.toLocaleString()}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                    Total Value per Sack
                  </label>
                  <Select
                    value={String(valuePerSack)}
                    onValueChange={(value) => setValuePerSack(Number(value))}
                    disabled={valuePerSackOptions.length === 0}
                  >
                    <SelectTrigger className="h-10 text-sm bg-background shadow-sm">
                      <SelectValue placeholder="Select total value per sack" />
                    </SelectTrigger>
                    <SelectContent>
                      {valuePerSackOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {selectedDenomination.currency} {value.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                    Number of Packages
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={
                      isPackageCountValid
                        ? "0"
                        : "Number of packages must be at least 1."
                    }
                    value={isPackageCountValid ? pkgCount : ""}
                    onChange={(e) => {
                      const nextValue = e.target.value;

                      if (nextValue === "") {
                        setPkgCount("");
                        return;
                      }

                      setPkgCount(String(Math.max(0, Number(nextValue) || 0)));
                    }}
                    onBlur={() => {
                      if (pkgCount === "") {
                        setPkgCount("0");
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md text-sm bg-background placeholder:text-muted-foreground/70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm ${
                      isRequestExceedingAvailability
                        ? "border-red-300 focus:ring-red-100"
                        : ""
                    }`}
                  />
                  {isRequestExceedingAvailability && (
                    <p className="mt-1 text-[11px] text-red-500">
                      Only {availablePackageCount} sacks are available for this selection.
                    </p>
                  )}
                </div>

                <div className="col-span-3">
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

              <div className="pt-2">
                <div className="p-4 bg-navy-50 rounded border border-navy-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-primary mb-1">
                    Total Stock Out Value
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {selectedDenomination.currency} {totalRequestValue.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  size="sm" 
                  onClick={() => setStep(1)}
                  disabled={!isPackageCountValid || isRequestExceedingAvailability}
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

              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Requested Sacks
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {requestedPackageCount}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sack Available
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {availablePackageCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    matching sacks in warehouse
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pallets Involved
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {selectedPalletGroups.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Minimum physical retrieval: {theoreticalMinPallets}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Robot Cycles
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {selectedPalletGroups.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedPalletGroups.length * 2} one-way trips
                  </p>
                </div>
              </div>

              <div className="rounded-md border bg-card overflow-hidden">
                <div className="border-b bg-muted/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Selected Sack List
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expand each pallet to inspect the FIFO-selected sacks inside it.
                      </p>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {selectedPkgs.length} sacks
                    </div>
                  </div>
                </div>

                {selectedPalletGroups.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {selectedPalletGroups.map((group, index) => (
                      <AccordionItem
                        key={group.palletId}
                        value={group.palletId}
                        className="border-b last:border-b-0"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex flex-1 items-center justify-between gap-4 text-left">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Trip {index + 1}: {group.palletId}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {group.locationCode} •{" "}
                                {new Date(group.oldestArrival).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="pr-3 text-right">
                              <p className="text-sm font-semibold text-primary">
                                {group.packageCount} sacks
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {selectedDenomination.currency}{" "}
                                {group.totalValue.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/60">
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                                    Package ID
                                  </th>
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                                    Arrival
                                  </th>
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                                    Denomination
                                  </th>
                                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                                    Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.packages.map((pkg) => (
                                  <tr
                                    key={pkg.packageId}
                                    className="border-b last:border-b-0 hover:bg-muted/20"
                                  >
                                    <td className="py-2 px-3 font-mono font-medium">
                                      {pkg.packageId}
                                    </td>
                                    <td className="py-2 px-3">
                                      {new Date(pkg.arrivalDate).toLocaleDateString()}
                                    </td>
                                    <td className="py-2 px-3">
                                      {pkg.denominations.map((d, itemIndex) => (
                                        <span
                                          key={itemIndex}
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
                              </tbody>
                            </table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No matching packages found for the current request criteria.
                  </div>
                )}
              </div>

              <div className="p-4 bg-navy-50 border border-navy-100 rounded text-primary space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                      Available Under FIFO
                    </p>
                    <p className="mt-1 text-xs text-primary/70">
                      Stock that can be dispatched now using the oldest matching sacks first
                    </p>
                  </div>
                  <span className="text-2xl font-bold leading-none">
                    {selectedPkgs.length} sacks = {selectedDenomination.currency}{" "}
                    {totalSelectedValue.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-primary/15 bg-white/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                      Operator Request
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      Need {requestedPackageCount} sacks x {selectedDenomination.currency}{" "}
                      {valuePerSack.toLocaleString()} = {selectedDenomination.currency}{" "}
                      {totalRequestValue.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Requested outbound quantity and per-sack value
                    </p>
                  </div>

                  <div className="rounded-md border border-primary/15 bg-white/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                      Available Now
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedPkgs.length} sacks = {selectedDenomination.currency}{" "}
                      {totalSelectedValue.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Matching sacks currently available in storage under FIFO rules
                    </p>
                  </div>
                </div>
              </div>

              {missingPackageCount > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>
                    Requested sacks exceed available warehouse stock. FIFO found only{" "}
                    {availablePackageCount} matching sacks for {selectedDenomination.currency}{" "}
                    {valuePerSack.toLocaleString()} per sack, so {missingPackageCount} requested sacks are not available now.
                  </span>
                </div>
              )}

              {/* Estimated robot route */}
              <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded text-xs text-blue-700 flex items-start gap-3">
                <Package className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-80" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px]">
                    Estimated Robot Retrieval Route
                  </p>
                  <p className="mt-1 font-medium">
                    {selectedPalletGroups
                      .map((group) => group.locationCode)
                      .join(" → ")}{" "}
                    → Inbound Area
                  </p>
                  <p className="opacity-70 mt-0.5">
                    Estimated retrieval time: ~
                    {Math.max(5, selectedPalletGroups.length * 4)} minutes for{" "}
                    {selectedPalletGroups.length} pallet cycles and{" "}
                    {selectedPkgs.length} sacks
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  Confirm & Dispatch
                </h2>
                <div
                  className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                    missingPackageCount > 0
                      ? "bg-amber-50 border-warning/20 text-warning"
                      : "bg-green-50 border-success/20 text-success"
                  }`}
                >
                  {missingPackageCount > 0
                    ? "Partial Dispatch"
                    : "Full Request Available"}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 overflow-hidden">
                <div className="border-b bg-muted/40 px-4 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Dispatch Scope
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review what the robot will retrieve in this outbound run based on the current FIFO match.
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-md border bg-background p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Requested
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {requestedPackageCount}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        sacks needed
                      </p>
                    </div>
                    <div className="rounded-md border bg-background p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Dispatch Now
                      </p>
                      <p className="mt-1 text-2xl font-bold text-primary">
                        {selectedPkgs.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        sacks available
                      </p>
                    </div>
                    <div className="rounded-md border bg-background p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pallets
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {selectedPalletGroups.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        robot retrieval cycles
                      </p>
                    </div>
                    <div className="rounded-md border bg-background p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Remaining
                      </p>
                      <p className="mt-1 text-2xl font-bold text-warning">
                        {missingPackageCount}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        sacks still missing
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border bg-background p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Operator Request
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {requestedPackageCount} sacks x {selectedDenomination.currency}{" "}
                        {valuePerSack.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Requested total: {selectedDenomination.currency}{" "}
                        {totalRequestValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-md border bg-background p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Dispatch In This Run
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {selectedPkgs.length} sacks = {selectedDenomination.currency}{" "}
                        {totalSelectedValue.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Current FIFO-matched stock to be retrieved now
                      </p>
                    </div>
                  </div>

                  {selectedPalletGroups.length > 0 && (
                    <div className="rounded-md border bg-background p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Robot Dispatch Queue
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            The robot will retrieve these pallets one cycle at a time and return each load to the inbound area.
                          </p>
                        </div>
                        <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {selectedPalletGroups.length} pallets
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {selectedPalletGroups.map((group, index) => (
                          <div
                            key={group.palletId}
                            className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Trip {index + 1}: {group.palletId}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {group.locationCode} {"->"} Inbound Area
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                {group.packageCount} sacks
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {selectedDenomination.currency}{" "}
                                {group.totalValue.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {missingPackageCount > 0 ? (
                    <div className="rounded-md border border-warning/20 bg-amber-50 px-4 py-3 text-xs text-warning">
                      FIFO currently found only {selectedPkgs.length} of {requestedPackageCount} requested sacks. This dispatch will proceed with the available stock now, and {missingPackageCount} sacks remain unfulfilled.
                    </div>
                  ) : (
                    <div className="rounded-md border border-success/20 bg-green-50 px-4 py-3 text-xs text-success">
                      The full outbound request is available. Dispatch will proceed with all requested sacks under FIFO rules.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button size="sm" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartDispatch}
                  disabled={selectedPkgs.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Dispatch {selectedPkgs.length} Available Sacks{" "}
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
                      scanList.includes(pkg.packageId);
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
