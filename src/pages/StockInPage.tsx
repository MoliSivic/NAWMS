import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_CURRENCY,
  buildPackageQrCode,
  getAllowedSackValues,
  getDenominationsForSecurity,
} from '@/data/denominationRules';
import { mockPallets, mockShelfLocations, mockZones, mockPackages } from '@/data/mockData';
import { warehouseLayout } from '@/data/warehouseLayout';
import { CheckCircle, Printer, QrCode, ArrowRight, MapPin, ShieldCheck, Box, Loader2, ScanLine, Check, XCircle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import WarehouseCanvas, { LiveTask } from '@/components/WarehouseCanvas';
import qrCodeImg from '@/assets/qr-code.png';

interface PalletAssignmentEvaluation {
  pallet: typeof mockPallets[number];
  zoneName: string;
  currentSacks: number;
  remainingCapacity: number;
  zoneAllowed: boolean;
  statusAllowed: boolean;
  capacityAllowed: boolean;
  compatibilityAllowed: boolean;
  fifoAllowed: boolean;
  existingCurrency: string | null;
  existingDenomination: number | null;
  existingSackValue: number | null;
  reasons: string[];
  allowed: boolean;
}

const steps = ['Manifest', 'Count', 'Assignment', 'Retrieval', 'Loading', 'Dispatch'];

function useSessionState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      return initialValue;
    }
    return initialValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

const StockInPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useSessionState('nawms_si_step', 0);
  const mode = 'single';
  const currency = DEFAULT_CURRENCY;
  const [singleDenom, setSingleDenom] = useSessionState('nawms_si_denom', 100000);
  const [valuePerSack, setValuePerSack] = useSessionState('nawms_si_valuePerSack', 10000000);
  const [packageCount, setPackageCount] = useSessionState('nawms_si_packageCount', 0);

  const [source, setSource] = useSessionState('nawms_si_source', 'Central Treasury');
  const [security, setSecurity] = useSessionState('nawms_si_security', 'high');

  const [palletId, setPalletId] = useSessionState('nawms_si_palletId', '');
  const [robotStatus, setRobotStatus] = useSessionState<'idle' | 'retrieving' | 'arrived' | 'storing' | 'completed' | 'emergency_stop'>('nawms_si_robotStatus', 'idle');
  const [retrievalPhase, setRetrievalPhase] = useSessionState<'idle' | 'moving_to_shelf' | 'loading' | 'returning'>('nawms_si_retrievalPhase', 'idle');
  const [storingPhase, setStoringPhase] = useSessionState<'idle' | 'moving_to_shelf' | 'unloading' | 'returning'>('nawms_si_storingPhase', 'idle');
  const [isLabelAttached, setIsLabelAttached] = useSessionState('nawms_si_isLabelAttached', false);
  const [isPrinting, setIsPrinting] = useSessionState('nawms_si_isPrinting', false);
  const [countdown, setCountdown] = useSessionState<number | null>('nawms_si_countdown', null);
  const [completedStockIns, setCompletedStockIns] = useSessionState<{ locationId: string, palletId: string, packageCount: number }[]>('nawms_si_completedStockIns', []);
  const initialRetrievalTime = React.useRef(20);

  const isValidSackValue = getAllowedSackValues(singleDenom).includes(valuePerSack);
  const isPackageCountValid = packageCount > 0;
  const packageCountError = !isPackageCountValid ? 'Enter a sack count greater than 0 to continue.' : '';
  const targetZone = useMemo(
    () => mockZones.find((zone) => zone.securityClass === security) ?? null,
    [security],
  );

  const handleDenomChange = (newDenom: number) => {
    setSingleDenom(newDenom);
    const validValues = getAllowedSackValues(newDenom);
    setValuePerSack(prev => validValues.includes(prev) ? prev : validValues[0] || 0);
  };

  const totalValue = useMemo(() => valuePerSack * packageCount, [valuePerSack, packageCount]);

  const filteredDenoms = useMemo(() => {
    return getDenominationsForSecurity(security);
  }, [security]);

  useEffect(() => {
    if (!filteredDenoms.includes(singleDenom)) {
      const nextDenom = filteredDenoms[0];
      setSingleDenom(nextDenom);
      const validValues = getAllowedSackValues(nextDenom);
      setValuePerSack((prev) => (validValues.includes(prev) ? prev : validValues[0] || 0));
    }
  }, [filteredDenoms, setSingleDenom, setValuePerSack, singleDenom]);

  useEffect(() => {
    const validValues = getAllowedSackValues(singleDenom);
    if (!validValues.includes(valuePerSack)) {
      setValuePerSack(validValues[0] || 0);
    }
  }, [singleDenom, valuePerSack, setValuePerSack]);

  const palletAssignments = useMemo<PalletAssignmentEvaluation[]>(() => {
    return [...mockPallets]
      .sort((a, b) => a.palletId.localeCompare(b.palletId))
      .map((pallet) => {
        const existingPackages = mockPackages.filter(
          (pkg) =>
            pkg.palletId === pallet.palletId &&
            pkg.status !== 'released' &&
            pkg.status !== 'discarded',
        );
        const currentSacks = pallet.currentPackageCount;
        const remainingCapacity = Math.max(0, pallet.maxCapacity - currentSacks);
        const zoneAllowed = targetZone ? pallet.zoneId === targetZone.zoneId : false;
        const statusAllowed = pallet.status === 'available' || pallet.status === 'in-use';
        const capacityAllowed = isPackageCountValid && remainingCapacity >= packageCount;

        const currencySet = new Set(existingPackages.map((pkg) => pkg.currency));
        const denominationSet = new Set(
          existingPackages.flatMap((pkg) => pkg.denominations.map((line) => line.denomination)),
        );
        const sackValueSet = new Set(existingPackages.map((pkg) => pkg.totalValue));

        const existingCurrency = currencySet.size === 1 ? [...currencySet][0] : null;
        const existingDenomination = denominationSet.size === 1 ? [...denominationSet][0] : null;
        const existingSackValue = sackValueSet.size === 1 ? [...sackValueSet][0] : null;
        const hasMixedExistingProfile =
          currencySet.size > 1 || denominationSet.size > 1 || sackValueSet.size > 1;
        const compatibilityAllowed =
          existingPackages.length === 0 ||
          (!hasMixedExistingProfile &&
            existingCurrency === currency &&
            existingDenomination === singleDenom &&
            existingSackValue === valuePerSack);
        const fifoAllowed =
          existingPackages.length === 0 ||
          existingPackages.every((pkg) => pkg.status === 'stored');

        const reasons: string[] = [];
        if (!zoneAllowed) {
          reasons.push(`Wrong zone. This stock-in is restricted to ${targetZone?.zoneName ?? 'the selected zone'}.`);
        }
        if (!statusAllowed) {
          reasons.push(
            pallet.status === 'maintenance'
              ? 'Pallet is under maintenance and cannot receive stock.'
              : 'Pallet is in transit and cannot receive stock right now.',
          );
        }
        if (statusAllowed && !capacityAllowed) {
          reasons.push(
            `Not enough space. ${remainingCapacity} sack${remainingCapacity === 1 ? '' : 's'} remaining, ${packageCount} required.`,
          );
        }
        if (statusAllowed && existingPackages.length > 0 && !compatibilityAllowed) {
          reasons.push(
            hasMixedExistingProfile
              ? 'Pallet contains mixed sack profiles, so compatibility cannot be guaranteed.'
              : `Compatibility failed. Existing sacks are ${existingCurrency ?? currency} ${existingDenomination?.toLocaleString() ?? '-'} at ${existingSackValue?.toLocaleString() ?? '-'} per sack.`,
          );
        }
        if (statusAllowed && existingPackages.length > 0 && !fifoAllowed) {
          reasons.push('FIFO rule failed. Existing sacks are not all in stored status.');
        }

        return {
          pallet,
          zoneName: mockZones.find((zone) => zone.zoneId === pallet.zoneId)?.zoneName || pallet.zoneId,
          currentSacks,
          remainingCapacity,
          zoneAllowed,
          statusAllowed,
          capacityAllowed,
          compatibilityAllowed,
          fifoAllowed,
          existingCurrency,
          existingDenomination,
          existingSackValue,
          reasons,
          allowed:
            zoneAllowed &&
            statusAllowed &&
            capacityAllowed &&
            compatibilityAllowed &&
            fifoAllowed,
        };
      });
  }, [currency, isPackageCountValid, packageCount, singleDenom, targetZone, valuePerSack]);

  const selectedAssignment = useMemo(
    () => palletAssignments.find((assignment) => assignment.pallet.palletId === palletId) ?? null,
    [palletAssignments, palletId],
  );
  const suggestedAssignment = useMemo(
    () => palletAssignments.find((assignment) => assignment.allowed) ?? null,
    [palletAssignments],
  );
  const dropdownAssignments = useMemo(
    () =>
      palletAssignments.filter((assignment) => assignment.allowed),
    [palletAssignments],
  );
  const allowedPalletIds = useMemo(
    () => new Set(dropdownAssignments.map((assignment) => assignment.pallet.palletId)),
    [dropdownAssignments],
  );
  const effectiveAssignment = selectedAssignment?.allowed ? selectedAssignment : suggestedAssignment;
  const effectivePalletId = effectiveAssignment?.pallet.palletId || '';
  const assignmentPanel = selectedAssignment ?? effectiveAssignment;
  const assignmentWarnings = selectedAssignment && !selectedAssignment.allowed ? selectedAssignment.reasons : [];
  const hasEligiblePallet = palletAssignments.some((assignment) => assignment.allowed);

  const suggestedLocation = useMemo(() => {
    const pallet = effectiveAssignment?.pallet ?? null;
    if (!pallet) return null;
    const loc = mockShelfLocations.find(l => l.palletId === pallet.palletId);
    if (loc) {
      const zone = mockZones.find(z => z.zoneId === loc.zoneId);
      return {
        zone: zone?.zoneName || loc.zoneId,
        code: loc.locationId,
        locationId: loc.locationId
      };
    }
    return null;
  }, [effectiveAssignment]);

  const previewPkgId = useMemo(() => {
    const existingPkgIds = new Set(mockPackages.map(p => p.packageId));
    let nextId = mockPackages.length + 500;
    while (existingPkgIds.has(`PKG-${String(nextId).padStart(5, '0')}`)) {
      nextId++;
    }
    return `PKG-${String(nextId).padStart(5, '0')}`;
  }, []);

  // Independent Robot simulation logic
  const handleRobotMovement = () => {
    setRobotStatus('retrieving');
    setRetrievalPhase('moving_to_shelf');
  };

  const handleLiveTaskArrival = useCallback(() => {
    if (retrievalPhase === 'moving_to_shelf') {
      setRetrievalPhase('loading');
    } else if (retrievalPhase === 'returning') {
      setRobotStatus('arrived');
      setRetrievalPhase('idle');
    }

    if (storingPhase === 'moving_to_shelf') {
      setStoringPhase('unloading');
    } else if (storingPhase === 'returning') {
      setRobotStatus('completed');
      setStoringPhase('idle');
    }
  }, [retrievalPhase, storingPhase, setRetrievalPhase, setRobotStatus, setStoringPhase]);

  useEffect(() => {
    let t: string | number | NodeJS.Timeout | undefined;
    if (retrievalPhase === 'loading') {
      t = setTimeout(() => setRetrievalPhase('returning'), 4000);
    }
    return () => clearTimeout(t);
  }, [retrievalPhase, setRetrievalPhase]);

  useEffect(() => {
    let t: string | number | NodeJS.Timeout | undefined;
    if (storingPhase === 'unloading') {
      t = setTimeout(() => {
        setStoringPhase('returning');
        if (suggestedLocation?.locationId) {
          const palletObj = mockPallets.find(p => p.palletId === effectivePalletId);
          const existingPackageCount = palletObj?.currentPackageCount ?? 0;
          const updatedPackageCount = existingPackageCount + packageCount;

          setCompletedStockIns(prev => [...prev, {
            locationId: suggestedLocation.locationId,
            palletId: effectivePalletId,
            packageCount: updatedPackageCount
          }]);
          if (palletObj) {
            palletObj.currentPackageCount = updatedPackageCount;
            palletObj.locationCode = suggestedLocation.locationId;
            palletObj.status = 'in-use';
          }

          const existingPkgIds = new Set(mockPackages.map(p => p.packageId));
          let nextId = mockPackages.length + 500;

          for (let i = 0; i < packageCount; i++) {
            while (existingPkgIds.has(`PKG-${String(nextId).padStart(5, '0')}`)) {
              nextId++;
            }
            const pkgId = `PKG-${String(nextId).padStart(5, '0')}`;
            const pkgValue = valuePerSack;
            const pkgQuantity = valuePerSack / singleDenom;

            mockPackages.push({
              packageId: pkgId,
              qrCode: buildPackageQrCode(nextId),
              productType: 'Banknotes',
              denominations: [{
                currency: currency,
                denomination: singleDenom,
                quantity: pkgQuantity,
                subtotal: pkgValue
              }],
              totalValue: pkgValue,
              currency: currency,
              palletId: effectivePalletId,
              locationCode: suggestedLocation.locationId,
              status: 'stored',
              securityLevel: security === 'mixed' ? 'medium' : security,
              sealStatus: 'sealed',
              source: source,
              arrivalDate: new Date().toISOString(),
              releasedDate: null,
              registeredBy: 'OP-042',
              createdAt: new Date().toISOString(),
              notes: 'System Generated'
            });

            existingPkgIds.add(pkgId);
            if (palletObj) {
              palletObj.packages.push(pkgId);
            }
          }

          for (const shelf of warehouseLayout.shelves) {
            const slot = shelf.slots.find(s => s.locationId === suggestedLocation.locationId);
            if (slot) {
              slot.palletId = effectivePalletId;
              slot.occupancy = updatedPackageCount / 40;
              break;
            }
          }
        }
      }, 4000);
    }
    return () => clearTimeout(t);
  }, [currency, effectivePalletId, packageCount, security, setCompletedStockIns, setStoringPhase, singleDenom, source, storingPhase, suggestedLocation, valuePerSack]);

  // Independent Printing Logic
  const handlePrintingDispatch = () => {
    setIsPrinting(true);
    const printDelay = Math.floor(Math.random() * 2000) + 2000;
    setTimeout(() => setIsPrinting(false), printDelay);
  };

  const handleStartProtocol = () => {
    handlePrintingDispatch();
    handleRobotMovement();
  };

  // Automated loading detection simulation removed by user request.

  const handleStartDispatch = () => {
    if (robotStatus === 'emergency_stop') return;
    setRobotStatus('storing');
    setStep(5);
    setStoringPhase('moving_to_shelf');
  };

  const handleEmergencyStop = () => {
    setRobotStatus('emergency_stop');
    setCountdown(null);
    alert('EMERGENCY STOP ACTIVATED: Robot ROB-002 halted. Safety protocol engaged.');
  };

  const clearSessionAndReload = () => {
    setStep(0);
    setSingleDenom(100000);
    setValuePerSack(100000000);
    setPackageCount(40);
    setSource('Central Treasury');
    setSecurity('high');
    setPalletId('');
    setRobotStatus('idle');
    setRetrievalPhase('idle');
    setStoringPhase('idle');
    setIsLabelAttached(false);
    setIsPrinting(false);
    setCountdown(null);
    setCompletedStockIns([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    if (confirm('Discard registration and abort operation? Data will be reverted.')) {
      clearSessionAndReload();
    }
  };

  const liveTask: LiveTask | null = useMemo(() => {
    if (!suggestedLocation) return null;

    // Retrieval logic for Step 3
    if (step === 3 && robotStatus === 'retrieving') {
      if (retrievalPhase === 'moving_to_shelf' || retrievalPhase === 'loading') {
        return {
          robotId: 'ROB-002',
          sourceLocation: 'Inbound Area',
          targetLocation: suggestedLocation.locationId,
          status: 'storing' // Moving TO shelf
        };
      }
      else if (retrievalPhase === 'returning') {
        return {
          robotId: 'ROB-002',
          sourceLocation: suggestedLocation.locationId,
          targetLocation: 'Inbound Area',
          status: 'retrieving' // Moving BACK to Inbound Area
        };
      }
    }

    if (robotStatus === 'storing') {
      if (storingPhase === 'moving_to_shelf' || storingPhase === 'unloading') {
        return {
          robotId: 'ROB-002',
          sourceLocation: 'Inbound Area',
          targetLocation: suggestedLocation.locationId,
          status: 'storing' // Moving TO shelf
        };
      }
      else if (storingPhase === 'returning') {
        return {
          robotId: 'ROB-002',
          sourceLocation: suggestedLocation.locationId,
          targetLocation: 'Inbound Area',
          status: 'retrieving' // Moving BACK to Inbound Area
        };
      }
    }
    if (robotStatus === 'emergency_stop') {
      return {
        robotId: 'ROB-002',
        sourceLocation: 'Inbound Area',
        targetLocation: suggestedLocation.locationId,
        status: 'idle'
      };
    }
    return {
      robotId: 'ROB-002',
      sourceLocation: 'Inbound Area',
      targetLocation: 'Inbound Area',
      status: 'idle'
    };
  }, [step, robotStatus, suggestedLocation, retrievalPhase, storingPhase]);

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-start p-4 py-12">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-xl font-semibold text-foreground">Stock In — NBC Vault Protocol</h1>
          <p className="text-sm text-muted-foreground">Standard {packageCount}-sack pallet registration and robot-assisted storage</p>
        </div>

        {/* Protocol Steps */}
        <div className="flex items-center justify-center sm:justify-start gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all shrink-0 ${i === step ? 'bg-primary text-primary-foreground' :
                i < step ? 'bg-success/10 text-success' :
                  'bg-muted text-muted-foreground'
                }`}>
                {i < step ? <CheckCircle className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-card rounded-lg border p-6 animate-fade-in shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Manifest Details</h2>
                <div className="px-2 py-0.5 bg-navy-100 text-primary text-[10px] font-bold rounded uppercase">Protocol: KHR-Standard</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Source Institution</label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Central Treasury">Central Treasury</SelectItem>
                      <SelectItem value="Branch Office Phnom Penh">Phnom Penh Branch</SelectItem>
                      <SelectItem value="Ministry of Finance">Ministry of Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vault Security Zone</label>
                  <Select value={security} onValueChange={setSecurity}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Zone A — 50K, 100K, 200K KHR</SelectItem>
                      <SelectItem value="medium">Zone B — 5K, 10K, 20K KHR</SelectItem>
                      <SelectItem value="low">Zone C — 500, 1K, 2K KHR</SelectItem>
                      <SelectItem value="mixed">Zone D — 100, 200 KHR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Entry Timestamp</label>
                  <input type="text" readOnly value={new Date().toLocaleString()} className="w-full px-3 py-1.5 border rounded text-xs bg-muted" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setStep(1)}>Verify Inventory <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium">Inventory Count (Pallet Load)</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Denomination</label>
                    <Select value={String(singleDenom)} onValueChange={(v) => handleDenomChange(Number(v))}>
                      <SelectTrigger className="h-9 text-sm bg-background font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>{filteredDenoms.map(d => (<SelectItem key={d} value={String(d)}>{d.toLocaleString()}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Value per Sack ({currency})</label>
                    <Select value={String(valuePerSack)} onValueChange={(v) => setValuePerSack(Number(v))}>
                      <SelectTrigger className="h-9 text-sm bg-background font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getAllowedSackValues(singleDenom).map(val => (
                          <SelectItem key={val} value={String(val)}>{val.toLocaleString()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Number of Sacks (Max 40)</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      placeholder="0"
                      value={packageCount === 0 ? '' : packageCount}
                      onChange={e => {
                        const rawValue = e.target.value;
                        const val = rawValue === '' ? 0 : Number(rawValue);
                        if (!Number.isFinite(val)) return;
                        if (val <= 40) {
                          setPackageCount(val);
                        } else {
                          toast({
                            title: "Invalid Input",
                            description: "Maximum number of sacks per pallet is 40.",
                            variant: "destructive"
                          });
                        }
                      }}
                      className={`w-full h-9 px-3 border rounded text-sm bg-background font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${packageCountError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {packageCountError && (
                      <p className="mt-1 text-xs text-destructive">{packageCountError}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-4 bg-navy-50 rounded border border-navy-100 text-center">
                    <p className="text-[10px] font-bold uppercase text-primary mb-1">Total Pallet Entry Value</p>
                    <p className="text-xl font-bold text-primary">{currency} {totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button size="sm" variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button size="sm" onClick={() => setStep(2)} disabled={!isValidSackValue || !isPackageCountValid}>Pallet Selection <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Pallet & Rack Assignment</h2>
                <div className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded uppercase">
                  {([50000, 100000, 200000].includes(singleDenom)) && 'Zone A — Ready'}
                  {([5000, 10000, 20000].includes(singleDenom)) && 'Zone B — Ready'}
                  {([500, 1000, 2000].includes(singleDenom)) && 'Zone C — Ready'}
                  {([100, 200].includes(singleDenom)) && 'Zone D — Ready'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Target Pallet ID</label>
                    <Select
                      value={
                        allowedPalletIds.has(effectivePalletId)
                          ? effectivePalletId
                          : ''
                      }
                      onValueChange={setPalletId}
                    >
                      <SelectTrigger className="h-9 text-sm bg-background font-mono">
                        <SelectValue placeholder="Select pallet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dropdownAssignments.map((assignment) => (
                          <SelectItem
                            key={assignment.pallet.palletId}
                            value={assignment.pallet.palletId}
                            disabled={!assignment.allowed}
                          >
                            {assignment.pallet.palletId} — {assignment.pallet.zoneId.replace('ZONE-', 'Zone ')} — {assignment.currentSacks}/{assignment.pallet.maxCapacity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 bg-blue-50 rounded border border-blue-100 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-tight">System protocol: assignments stay inside the selected zone and only compatible pallets with enough remaining space can receive new sacks.</p>
                  </div>
                  {!hasEligiblePallet && (
                    <div className="p-3 border border-destructive/20 bg-destructive/5 rounded flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <p className="text-[11px] text-destructive leading-tight">No pallets currently satisfy the selected zone, capacity, and compatibility rules for this stock-in request.</p>
                    </div>
                  )}
                  {assignmentWarnings.length > 0 && (
                    <div className="p-3 border border-warning/20 bg-amber-50 rounded space-y-1.5">
                      {assignmentWarnings.map((warning) => (
                        <div key={warning} className="flex items-start gap-2 text-[11px] text-warning">
                          <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted/30 rounded border space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Assigned Rack Location</span>
                  </div>
                  {suggestedLocation ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-muted pb-1"><span className="text-muted-foreground">Zone</span><span className="font-medium">{suggestedLocation.zone}</span></div>
                      <div className="flex justify-between border-b border-muted pb-1"><span className="text-muted-foreground">Rack</span><span className="font-mono">{suggestedLocation.code}</span></div>
                      <div className="flex justify-between font-bold"><span className="text-muted-foreground">Status</span><span className={effectiveAssignment?.allowed ? 'text-success uppercase' : 'text-warning uppercase'}>{effectiveAssignment?.allowed ? 'Valid Slot' : 'Review Rules'}</span></div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">Identify pallet to calculate destination...</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button size="sm" variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button size="sm" onClick={() => setStep(3)} disabled={!effectiveAssignment?.allowed}>Confirm & Initiate Protocol <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Identifier Generation & Pallet Retrieval</h2>
                {robotStatus === 'idle' && (
                  <div className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded flex items-center gap-1.5">
                    Ready for Retrieval
                  </div>
                )}
                {robotStatus === 'retrieving' && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {retrievalPhase === 'moving_to_shelf' ? `Robot ROB-002 Navigating to ${suggestedLocation?.code}` : `Robot ROB-002 Returning with Pallet ${effectivePalletId}`}
                  </div>
                )}
                {robotStatus === 'arrived' && (
                  <div className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded flex items-center gap-1.5">
                    <Check className="w-3 h-3" /> Robot Arrived with Pallet {effectivePalletId}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <div className="p-4 bg-navy-900 text-white rounded-lg space-y-3">
                    <div className="flex items-center gap-2 opacity-80 border-b border-white/10 pb-2">
                      <QrCode className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Master Pallet Identifier</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] opacity-60 uppercase">Pallet Reference</p>
                        <p className="text-lg font-mono font-bold leading-none">{effectivePalletId}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] opacity-60 uppercase">Load Verify</p>
                        <p className="text-sm font-bold leading-none">{packageCount} SACKS / {currency}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 border rounded p-3 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sack Identity Registry (Batch {packageCount})</p>
                    <div className="grid grid-cols-8 gap-1 opacity-60">
                      {Array.from({ length: packageCount }).map((_, i) => (
                        <div key={i} className="aspect-square bg-white border border-dashed rounded-sm flex items-center justify-center text-[8px] font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex-1 bg-white border-2 border-slate-300 border-dashed rounded-lg flex flex-col items-center justify-center p-3 relative shadow-sm">
                    <div className="absolute top-0 w-full bg-slate-100 border-b border-slate-200 py-1.5 px-3 flex justify-between items-center rounded-t-lg">
                      <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">NBC Vault - Official Stamp</span>
                      <QrCode className="w-3 h-3 text-slate-400" />
                    </div>

                    <div className="mt-6 mb-3 p-2 border-2 border-slate-200 rounded-md bg-white">
                      <img src={qrCodeImg} alt="Master Pallet QR Code" className="w-40 h-40 object-contain mix-blend-multiply" />
                    </div>

                    <div className="w-full text-left space-y-1 bg-slate-50/50 p-2.5 rounded-md border border-slate-200">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Package ID</span>
                        <span className="font-mono font-bold text-[10px] text-slate-500 leading-none">{previewPkgId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Pallet</span>
                        <span className="font-mono font-bold text-[11px] text-slate-800 leading-none">{effectivePalletId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Location</span>
                        <span className="font-mono font-bold text-[11px] text-slate-800 leading-none">{suggestedLocation?.locationId || 'PENDING'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Arrival</span>
                        <span className="font-mono font-bold text-[11px] text-slate-800 leading-none">{new Date().toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Source</span>
                        <span className="font-bold text-[10px] text-slate-800 leading-none truncate max-w-[100px] text-right">{source}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Notes per Sack</span>
                        <span className="font-bold text-[11px] text-slate-800 leading-none">{(valuePerSack / singleDenom).toLocaleString()} pcs</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Value</span>
                        <span className="font-bold text-[11px] text-slate-800 leading-none">{currency} {valuePerSack.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={isPrinting || robotStatus !== 'idle'}
                    onClick={handleStartProtocol}
                  >
                    <Printer className="w-3.5 h-3.5 mr-2" /> {isPrinting ? 'Printing...' : 'Print Identity Batch'}
                  </Button>

                  {robotStatus === 'arrived' && !isPrinting && (
                    <Button
                      size="sm"
                      onClick={() => setStep(4)}
                      className="w-full bg-success hover:bg-success/90 animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      Proceed to Loading <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  )}
                </div>
              </div>

              {robotStatus === 'idle' && (
                <div className="bg-muted/50 border border-muted p-3 rounded flex items-center gap-3">
                  <Printer className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Ready to begin registration. Click <strong>Print Identity Batch</strong> to generate QR labels and signal the robot to retrieve pallet <span className="font-mono font-bold">{effectivePalletId}</span>.</p>
                </div>
              )}

              {robotStatus === 'retrieving' && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <p className="text-xs text-blue-700">
                    {countdown !== null ? `Phase: ${retrievalPhase === 'moving_to_shelf' ? 'Outbound to Shelf' : 'Inbound with Pallet'} (${countdown}s remaining)... ` : ''}
                    {retrievalPhase === 'moving_to_shelf'
                      ? `Robot is navigating to shelf ${suggestedLocation?.code} to retrieve the empty pallet.`
                      : `Robot has picked up pallet ${effectivePalletId} and is returning to the Inbound Area.`}
                  </p>
                </div>
              )}

              {robotStatus === 'arrived' && (
                <div className="bg-success/5 border border-success/20 p-3 rounded flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <p className="text-xs text-success">Robot has arrived at the Inbound Area with pallet <span className="font-mono font-bold">{effectivePalletId}</span>. Please attach the printed labels and proceed.</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Loading & Identification</h2>
                <div className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Pallet Arrived at Inbound
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center font-bold text-sm">1</div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-success uppercase tracking-wider">Physical Loading</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">Place {packageCount} sacks onto pallet <span className="font-mono">{effectivePalletId}</span> as indicated by the protocol.</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full bg-white border-success/30 hover:bg-success/5 hover:text-success text-success" onClick={() => setIsLabelAttached(true)}>
                      {isLabelAttached ? <><Check className="w-3.5 h-3.5 mr-2" /> Sacks Loaded</> : `Confirm ${packageCount} Sacks Placed`}
                    </Button>
                  </div>

                  <div className={`border rounded-lg p-4 space-y-4 transition-all ${isLabelAttached ? 'bg-primary/5 border-primary/20 opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">2</div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Identity Attachment</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">Scan the pallet master label after attaching it to the pallet frame.</p>
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={handleStartDispatch}>
                      <ScanLine className="w-3.5 h-3.5 mr-2" /> Scan Master Label & Dispatch
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col h-full">
                  <div className="relative aspect-video bg-muted/50 rounded-lg border flex items-center justify-center overflow-hidden shrink-0">
                    <Box className="w-16 h-16 text-muted-foreground/20" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                      <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Live Camera: Inbound Area 01</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[16px]"></div>
                  <div className="flex justify-end mt-auto">
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleCancel}>
                      Abort Operation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Finalizing Storage</h2>
                <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Storing Pallet {effectivePalletId}
                </div>
              </div>

              {robotStatus === 'completed' ? (
                <div className="p-8 bg-success/5 border border-dashed border-success/30 rounded-xl flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center shadow-lg shadow-success/20">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Protocol Completed Successfully</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">Pallet <span className="font-mono font-bold text-foreground">{effectivePalletId}</span> containing {packageCount} sacks of {currency} {singleDenom.toLocaleString()} is now securely stored at <span className="font-mono font-bold text-foreground">{suggestedLocation?.code}</span>.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs pt-2">
                    <Button variant="outline" size="sm" onClick={() => clearSessionAndReload()}>Next Registration</Button>
                    <Button size="sm" onClick={() => navigate('/inventory')}>View Inventory</Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center space-y-4 border border-dashed rounded-xl">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Box className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-foreground uppercase tracking-widest">In Transit to Vault</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Robot ROB-002 is placing the pallet into rack <span className="font-mono font-bold text-primary">{suggestedLocation?.code}</span>.<br />Observe progress on the Live Vault Topology map below.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map integrated into the card vibe - only show from step 2 onwards */}
        {step > 1 && (
          <div className="w-full max-w-4xl space-y-3 pt-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Live Vault Topology
              </h3>
              <div className="flex gap-3 text-[9px] font-medium text-muted-foreground/70">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-primary/20 border border-primary/50 rounded-sm" /> Selected Rack</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-success rounded-sm" /> Active Robot</span>
              </div>
            </div>
            <div className={`grid gap-4 ${step === 2 && assignmentPanel ? 'lg:grid-cols-[minmax(0,1fr)_260px]' : 'grid-cols-1'}`}>
              <div className="bg-card rounded-lg border border-border overflow-hidden h-[550px] relative shadow-sm">
                <WarehouseCanvas
                  selectedSlotId={suggestedLocation?.locationId ?? null}
                  liveTask={liveTask}
                  onLiveTaskArrival={handleLiveTaskArrival}
                  completedStockIns={completedStockIns}
                  onSlotClick={(slot) => {
                    if (
                      step === 2 &&
                      slot?.palletId &&
                      slot.zoneId === targetZone?.zoneId &&
                      allowedPalletIds.has(slot.palletId)
                    ) {
                      setPalletId(slot.palletId);
                    }
                  }}
                />
              </div>
              {step === 2 && assignmentPanel && (
                <div className="bg-card rounded-lg border border-border p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pallet Detail</p>
                      <p className="text-sm font-semibold text-foreground">{assignmentPanel.pallet.palletId}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${assignmentPanel.allowed ? 'bg-success/10 text-success' : 'bg-amber-50 text-warning'}`}>
                      {assignmentPanel.allowed ? 'Allowed' : 'Blocked'}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-muted-foreground">Zone</span><span className="font-medium">{assignmentPanel.zoneName}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-muted-foreground">Rack</span><span className="font-mono">{assignmentPanel.pallet.locationCode || 'Unassigned'}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-muted-foreground">Current Sacks</span><span>{assignmentPanel.currentSacks}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-muted-foreground">Remaining Capacity</span><span>{assignmentPanel.remainingCapacity}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-muted-foreground">Incoming Sacks</span><span>{packageCount}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Assignment</span><span className={assignmentPanel.allowed ? 'text-success font-semibold' : 'text-warning font-semibold'}>{assignmentPanel.allowed ? 'Allowed for current stock-in' : 'Not allowed'}</span></div>
                  </div>

                  {assignmentPanel.currentSacks > 0 && (
                    <div className="p-3 bg-muted/30 rounded border space-y-1.5 text-[11px]">
                      <p className="font-bold uppercase tracking-wider text-muted-foreground">Existing Sack Profile</p>
                      <p className="text-foreground">{assignmentPanel.existingCurrency ?? currency} {assignmentPanel.existingDenomination?.toLocaleString() ?? '-'} at {assignmentPanel.existingSackValue?.toLocaleString() ?? '-'} per sack</p>
                    </div>
                  )}

                  {assignmentPanel.reasons.length > 0 ? (
                    <div className="space-y-2">
                      {assignmentPanel.reasons.map((reason) => (
                        <div key={reason} className="flex items-start gap-2 p-3 rounded border border-warning/20 bg-amber-50 text-[11px] text-warning">
                          <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded border border-success/20 bg-success/5 text-[11px] text-success">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>This pallet is in the selected zone, has enough space, and matches the current sack profile for FIFO-safe retrieval later.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Footer Guardrails */}
        <div className="flex justify-center gap-6 text-[10px] font-semibold uppercase text-muted-foreground tracking-widest pt-8 opacity-60">
          <div className="flex items-center gap-1.5"><Box className="w-3 h-3" /> Protocol: {packageCount} Sacks/Pallet</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> NBC Security Verified</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Real-time G-SL Tracking</div>
        </div>
      </div>
    </div>
  );
};

export default StockInPage;
