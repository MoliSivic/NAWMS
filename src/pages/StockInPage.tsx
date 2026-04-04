import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Printer, QrCode, Package, ArrowRight, Plus, Trash2, ScanLine } from 'lucide-react';

interface DenomRow { currency: string; denomination: number; quantity: number; }

const steps = ['Package Details', 'Denomination Breakdown', 'Assign Pallet', 'Confirm & Print QR'];

const StockInPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'single' | 'mixed'>('mixed');
  const [source, setSource] = useState('Central Treasury');
  const [security, setSecurity] = useState('high');
  const [denomRows, setDenomRows] = useState<DenomRow[]>([
    { currency: 'USD', denomination: 100, quantity: 500 },
    { currency: 'USD', denomination: 50, quantity: 200 },
  ]);
  const [palletId, setPalletId] = useState('PAL-009');
  const [scanInput, setScanInput] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [printing, setPrinting] = useState(false);

  const totalValue = denomRows.reduce((s, d) => s + d.denomination * d.quantity, 0);
  const newPkgId = 'PKG-00158';

  const addDenomRow = () => setDenomRows(r => [...r, { currency: 'USD', denomination: 0, quantity: 0 }]);
  const removeDenomRow = (i: number) => setDenomRows(r => r.filter((_, idx) => idx !== i));
  const updateDenom = (i: number, field: keyof DenomRow, val: string | number) =>
    setDenomRows(r => r.map((d, idx) => idx === i ? { ...d, [field]: typeof val === 'string' ? val : Number(val) } : d));

  const handleScan = () => {
    if (scanInput.trim()) { setScanSuccess(true); setTimeout(() => setScanSuccess(false), 2000); }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { setPrinting(false); setPrintSuccess(true); }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Stock In — Register Incoming Package</h1>
        <p className="text-sm text-muted-foreground">Step-by-step guided registration workflow</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              i === step ? 'bg-primary text-primary-foreground' :
              i < step ? 'bg-success/10 text-success' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <CheckCircle className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-card rounded-lg border p-6 animate-fade-in">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Package Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Denomination Mode</label>
                <div className="flex gap-2">
                  {(['single', 'mixed'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded border text-xs font-medium transition-all ${mode === m ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      {m === 'single' ? 'Single Denomination' : 'Mixed Denomination'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Source</label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Central Treasury">Central Treasury</SelectItem>
                    <SelectItem value="Branch Office Phnom Penh">Branch Office Phnom Penh</SelectItem>
                    <SelectItem value="Ministry of Finance">Ministry of Finance</SelectItem>
                    <SelectItem value="Provincial Branch">Provincial Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Security Level</label>
                <Select value={security} onValueChange={setSecurity}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Value</SelectItem>
                    <SelectItem value="medium">Medium Value</SelectItem>
                    <SelectItem value="low">Low Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Arrival Date/Time</label>
                <input type="text" value={new Date().toLocaleString()} readOnly className="w-full px-3 py-1.5 border rounded text-xs bg-muted" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setStep(1)}>Next <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Denomination Breakdown</h2>
              <Button size="sm" variant="outline" onClick={addDenomRow}><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Currency</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Denomination</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Quantity</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {denomRows.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">
                      <Select value={row.currency} onValueChange={value => updateDenom(i, 'currency', value)}>
                        <SelectTrigger className="h-9 w-[108px] px-2.5 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="KHR">KHR</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <input type="number" value={row.denomination} onChange={e => updateDenom(i, 'denomination', Number(e.target.value))} className="w-24 px-2 py-1 border rounded bg-background" />
                    </td>
                    <td className="py-2">
                      <input type="number" value={row.quantity} onChange={e => updateDenom(i, 'quantity', Number(e.target.value))} className="w-24 px-2 py-1 border rounded bg-background" />
                    </td>
                    <td className="py-2 text-right font-medium">{(row.denomination * row.quantity).toLocaleString()}</td>
                    <td className="py-2">
                      <button onClick={() => removeDenomRow(i)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between p-3 bg-navy-50 rounded">
              <span className="text-sm font-medium">Total Value</span>
              <span className="text-lg font-semibold">{denomRows[0]?.currency} {totalValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button size="sm" onClick={() => setStep(2)}>Next <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Assign to Pallet</h2>
            {/* Scanner Input */}
            <div className="p-4 bg-muted rounded-lg border-2 border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <ScanLine className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Scanner Input</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Scan or enter Pallet ID..."
                  className="flex-1 px-3 py-2 border rounded text-sm bg-background font-mono"
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                />
                <Button size="sm" onClick={handleScan}>Scan</Button>
              </div>
              {scanSuccess && (
                <div className="mt-2 flex items-center gap-2 text-success text-xs animate-fade-in">
                  <CheckCircle className="w-4 h-4" /> Pallet scanned successfully
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Selected Pallet</label>
                <Select value={palletId} onValueChange={setPalletId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAL-009">PAL-009 (Available — Zone B)</SelectItem>
                    <SelectItem value="PAL-010">PAL-010 (Available — Zone C)</SelectItem>
                    <SelectItem value="PAL-012">PAL-012 (Available — Zone A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Suggested Location</label>
                <div className="px-3 py-1.5 border rounded text-xs bg-navy-50 font-medium">
                  Zone A &gt; Shelf 02 &gt; Top Tier &gt; Slot P2
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded text-xs text-info flex items-start gap-2">
              <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>System recommends this location based on zone security rules, available capacity, and FIFO positioning. You may override with justification.</span>
            </div>

            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" onClick={() => setStep(3)}>Next <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Confirm & Print QR Label</h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-4 bg-muted rounded">
                <div className="flex justify-between"><span className="text-muted-foreground">Package ID</span><span className="font-mono font-medium">{newPkgId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="capitalize">{mode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{source}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Security</span><span className="capitalize">{security}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Denominations</span><span>{denomRows.length} rows</span></div>
                <div className="flex justify-between font-semibold"><span>Total Value</span><span>{denomRows[0]?.currency} {totalValue.toLocaleString()}</span></div>
              </div>

              <div className="p-4 bg-muted rounded flex flex-col items-center justify-center gap-3">
                <div className="w-28 h-28 bg-background border-2 rounded flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{newPkgId} — QR Preview</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handlePrint} disabled={printing || printSuccess} className="bg-primary">
                {printing ? (
                  <><span className="animate-pulse-soft">Printing...</span></>
                ) : printSuccess ? (
                  <><CheckCircle className="w-4 h-4 mr-1" /> Printed Successfully</>
                ) : (
                  <><Printer className="w-4 h-4 mr-1" /> Print QR Label</>
                )}
              </Button>
              {printSuccess && (
                <span className="text-xs text-success flex items-center gap-1 animate-fade-in">
                  <CheckCircle className="w-3 h-3" /> Label sent to printer. Attach to package.
                </span>
              )}
            </div>

            {printSuccess && (
              <div className="p-4 bg-green-50 border border-success/20 rounded animate-fade-in">
                <p className="text-sm font-medium text-success">✓ Stock-In Registration Complete</p>
                <p className="text-xs text-muted-foreground mt-1">Package {newPkgId} registered, QR label printed, assigned to {palletId}. Robot storage task created automatically.</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button size="sm" variant="outline" onClick={() => { setStep(0); setPrintSuccess(false); }}>Register Another</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockInPage;
