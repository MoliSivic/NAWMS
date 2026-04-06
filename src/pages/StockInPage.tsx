import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPallets, mockShelfLocations, mockZones } from '@/data/mockData';
import { CheckCircle, Printer, QrCode, ArrowRight, MapPin, ShieldCheck, Box, Loader2, ScanLine, Check } from 'lucide-react';
import WarehouseCanvas, { LiveTask } from '@/components/WarehouseCanvas';

interface DenomRow { currency: string; denomination: number; quantity: number; }

const steps = ['Manifest', 'Count', 'Assignment', 'Retrieval', 'Loading', 'Dispatch'];

const StockInPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const mode = 'single';
  const currency = 'KHR';
  const [singleDenom, setSingleDenom] = useState(100000);
  const [singleQty, setSingleQty] = useState(1000); 
  const [packageCount, setPackageCount] = useState(40);
  
  const [source, setSource] = useState('Central Treasury');
  const [security, setSecurity] = useState('high');

  const [palletId, setPalletId] = useState('');
  const [robotStatus, setRobotStatus] = useState<'idle' | 'retrieving' | 'arrived' | 'storing' | 'completed' | 'emergency_stop'>('idle');
  const [retrievalPhase, setRetrievalPhase] = useState<'idle' | 'moving_to_shelf' | 'returning'>('idle');
  const [isLabelAttached, setIsLabelAttached] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const valuePerSack = useMemo(() => singleDenom * singleQty, [singleDenom, singleQty]);
  const totalValue = useMemo(() => valuePerSack * packageCount, [valuePerSack, packageCount]);

  const khrDenoms = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 100];

  const availablePallets = useMemo(() => {
    const securityToZone: Record<string, string[]> = {
      high: ['ZONE-A'],
      medium: ['ZONE-B', 'ZONE-D'],
      low: ['ZONE-C', 'ZONE-D'],
    };
    const allowedZones = securityToZone[security] || [];
    
    return mockPallets.filter(p => {
      const zoneMatch = allowedZones.includes(p.zoneId);
      const capacityMatch = p.currentPackageCount === 0; // Look for empty pallets for new assignment
      return p.status !== 'maintenance' && zoneMatch && capacityMatch;
    }).sort((a, b) => a.palletId.localeCompare(b.palletId));
  }, [security]);

  const selectedPallet = mockPallets.find(p => p.palletId === palletId);
  const suggestedPallet = availablePallets[0];
  const effectivePalletId = palletId || suggestedPallet?.palletId || '';

  const suggestedLocation = useMemo(() => {
    const pallet = selectedPallet || suggestedPallet;
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
  }, [selectedPallet, suggestedPallet]);

  // Robot simulation logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 3 && robotStatus === 'retrieving') {
      // Total retrieval time is 20s (10s to shelf, 10s back)
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(timer);
            setRobotStatus('arrived');
            setRetrievalPhase('idle');
            return null;
          }
          
          if (prev !== null) {
             const nextVal = prev - 1;
             // Switch to returning phase halfway through
             if (nextVal <= 10 && retrievalPhase === 'moving_to_shelf') {
                setRetrievalPhase('returning');
             }
             return nextVal;
          }
          return null;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, robotStatus, retrievalPhase]);

  // Automated loading detection simulation
  useEffect(() => {
    if (step === 4 && !isLabelAttached) {
      const timer = setTimeout(() => {
        setIsLabelAttached(true);
      }, 4000); // Simulate sensor detecting 40 sacks after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [step, isLabelAttached]);

  const handleStartDispatch = () => {
    if (robotStatus === 'emergency_stop') return;
    setRobotStatus('storing');
    setStep(5);
    setCountdown(6);
    // Simulate storage completion after 6 seconds
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          setRobotStatus('completed');
          return null;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
  };

  const handleEmergencyStop = () => {
    setRobotStatus('emergency_stop');
    setCountdown(null);
    alert('EMERGENCY STOP ACTIVATED: Robot ROB-002 halted. Safety protocol engaged.');
  };

  const handleCancel = () => {
    if (confirm('Discard registration?')) window.location.reload();
  };

  const liveTask: LiveTask | null = useMemo(() => {
    if (!suggestedLocation) return null;
    
    // Retrieval logic for Step 3
    if (step === 3 && robotStatus === 'retrieving' && countdown !== null) {
      // 20s to 11s: Moving from Door to Shelf
      if (countdown > 10) {
        return {
          robotId: 'ROB-002',
          sourceLocation: 'Inbound Area',
          targetLocation: suggestedLocation.locationId,
          status: 'storing' // Moving TO shelf
        };
      } 
      // 10s to 1s: Moving from Shelf back to Door
      else {
        return {
          robotId: 'ROB-002',
          sourceLocation: suggestedLocation.locationId,
          targetLocation: 'Inbound Area',
          status: 'retrieving' // Moving BACK to Inbound Area
        };
      }
    }

    if (robotStatus === 'storing') {
      return {
        robotId: 'ROB-002',
        sourceLocation: 'Inbound Area',
        targetLocation: suggestedLocation.locationId,
        status: 'storing'
      };
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
  }, [step, robotStatus, suggestedLocation, countdown]);

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
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all shrink-0 ${
                i === step ? 'bg-primary text-primary-foreground' :
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
                    <SelectItem value="high">L1 - Restricted (Zone A)</SelectItem>
                    <SelectItem value="medium">L2 - Standard (Zone B/D)</SelectItem>
                    <SelectItem value="low">L3 - General (Zone C/D)</SelectItem>
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
                  <Select value={String(singleDenom)} onValueChange={(v) => setSingleDenom(Number(v))}>
                    <SelectTrigger className="h-9 text-sm bg-background font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>{khrDenoms.map(d => (<SelectItem key={d} value={String(d)}>{d.toLocaleString()}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Pieces / Sack</label>
                  <input type="number" value={singleQty} onChange={e => setSingleQty(Number(e.target.value))} className="w-full h-9 px-3 border rounded text-sm bg-background font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Number of Sacks (Max 40)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="40"
                    value={packageCount} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (val <= 40) setPackageCount(val);
                    }} 
                    className="w-full h-9 px-3 border rounded text-sm bg-background font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-muted/30 rounded border text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Value per Sack</p>
                  <p className="text-xl font-semibold">{currency} {valuePerSack.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-navy-50 rounded border border-navy-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-primary mb-1">Total Pallet Entry Value</p>
                  <p className="text-xl font-bold text-primary">{currency} {totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button size="sm" variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button size="sm" onClick={() => setStep(2)}>Pallet Selection <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Pallet & Rack Assignment</h2>
              <div className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded uppercase">Zone {security.toUpperCase()} — Ready</div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Target Pallet ID</label>
                  <Select value={effectivePalletId} onValueChange={setPalletId}>
                    <SelectTrigger className="h-9 text-sm bg-background font-mono">
                      <SelectValue placeholder="Select pallet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePallets.map(p => (
                        <SelectItem key={p.palletId} value={p.palletId}>
                          {p.palletId} — (EMPTY)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-tight">System protocol: One currency type per pallet. Robot will retrieve this empty pallet for loading.</p>
                </div>
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
                    <div className="flex justify-between font-bold"><span className="text-muted-foreground">Status</span><span className="text-success uppercase">Valid Slot</span></div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Identify pallet to calculate destination...</p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button size="sm" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" onClick={() => setStep(3)} disabled={!effectivePalletId}>Confirm & Initiate Protocol <ArrowRight className="w-3 h-3 ml-1" /></Button>
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
                        {String(i+1).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex-1 bg-white border-2 border-primary/20 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4">
                  <QrCode className="w-16 h-16 text-primary/20 mb-2" />
                  <p className="text-[10px] font-bold text-primary mb-1">Labels Ready</p>
                  <p className="text-[9px] text-muted-foreground">Review batch identifiers above</p>
                </div>
                <Button 
                  size="sm" 
                  className="w-full" 
                  disabled={isPrinting || robotStatus !== 'idle'} 
                  onClick={() => { 
                    setIsPrinting(true); 
                    setRobotStatus('retrieving');
                    setRetrievalPhase('moving_to_shelf');
                    setCountdown(20);
                    setTimeout(() => setIsPrinting(false), 2000); 
                  }}
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

              <div className="relative aspect-video bg-muted/50 rounded-lg border flex items-center justify-center overflow-hidden">
                <Box className="w-16 h-16 text-muted-foreground/20" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                   <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Live Camera: Inbound Area 01</span>
                   </div>
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
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Next Registration</Button>
                  <Button size="sm" onClick={() => window.location.href='/inventory'}>View Inventory</Button>
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
          <div className="bg-card rounded-lg border border-border overflow-hidden h-[550px] relative shadow-sm">
            <WarehouseCanvas 
              selectedSlotId={suggestedLocation?.locationId ?? null}
              liveTask={liveTask}
              onSlotClick={(slot) => {
                if (step < 3 && slot.palletId) setPalletId(slot.palletId);
              }}
            />
          </div>
        </div>
      )}

      {/* Security Footer Guardrails */}
      <div className="flex justify-center gap-6 text-[10px] font-semibold uppercase text-muted-foreground tracking-widest pt-8 opacity-60">
        <div className="flex items-center gap-1.5"><Box className="w-3 h-3"/> Protocol: {packageCount} Sacks/Pallet</div>
        <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> NBC Security Verified</div>
        <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Real-time G-SL Tracking</div>
      </div>
      </div>
    </div>
  );
};

export default StockInPage;
