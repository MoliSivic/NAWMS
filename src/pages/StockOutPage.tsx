import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { mockPackages } from '@/data/mockData';
import { CheckCircle, ArrowRight, ScanLine, Shield, Package, Clock } from 'lucide-react';

const steps = ['Request Details', 'System Selection (FIFO)', 'Submit for Approval', 'Outbound Verification'];

const StockOutPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState<'amount' | 'packages' | 'denomination'>('amount');
  const [amount, setAmount] = useState('250000');
  const [denomReq, setDenomReq] = useState('USD 100');
  const [pkgCount, setPkgCount] = useState('5');
  const [submitted, setSubmitted] = useState(false);
  const [scanList, setScanList] = useState<string[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [verified, setVerified] = useState(false);

  // Simulate FIFO selection
  const selectedPkgs = mockPackages
    .filter(p => p.status === 'stored' && p.securityLevel === 'high')
    .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
    .slice(0, Number(pkgCount) || 5);

  const totalSelectedValue = selectedPkgs.reduce((s, p) => s + p.totalValue, 0);

  const handleScan = () => {
    if (scanInput.trim() && !scanList.includes(scanInput)) {
      setScanList(l => [...l, scanInput]);
      setScanInput('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Stock Out — Process Outbound Request</h1>
        <p className="text-sm text-muted-foreground">Controlled stock-out with FIFO selection and supervisor approval</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              i === step ? 'bg-primary text-primary-foreground' :
              i < step ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
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
            <h2 className="text-sm font-medium">Request Details</h2>
            <div className="flex gap-2 mb-4">
              {(['amount', 'packages', 'denomination'] as const).map(t => (
                <button key={t} onClick={() => setRequestType(t)} className={`px-3 py-1.5 rounded border text-xs font-medium capitalize ${requestType === t ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  By {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {requestType === 'amount' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Required Amount (USD)</label>
                  <input type="text" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm bg-background" />
                </div>
              )}
              {requestType === 'denomination' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Denomination Requirement</label>
                  <input type="text" value={denomReq} onChange={e => setDenomReq(e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm bg-background" />
                </div>
              )}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Number of Packages</label>
                <input type="number" value={pkgCount} onChange={e => setPkgCount(e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm bg-background" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Reason</label>
                <input type="text" defaultValue="Scheduled disbursement to Provincial Branch" className="w-full px-3 py-1.5 border rounded text-sm bg-background" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setStep(1)}>Find Matching Packages <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">System Selected Packages (FIFO)</h2>
              <div className="flex items-center gap-1 text-[10px] text-success bg-green-50 px-2 py-1 rounded">
                <Clock className="w-3 h-3" /> FIFO Compliant — Oldest First
              </div>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground">Package ID</th>
                  <th className="text-left py-2 text-muted-foreground">Location</th>
                  <th className="text-left py-2 text-muted-foreground">Pallet</th>
                  <th className="text-left py-2 text-muted-foreground">Arrival</th>
                  <th className="text-right py-2 text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedPkgs.map(pkg => (
                  <tr key={pkg.packageId} className="border-b hover:bg-muted/30">
                    <td className="py-2 font-mono font-medium">{pkg.packageId}</td>
                    <td className="py-2">{pkg.locationCode}</td>
                    <td className="py-2">{pkg.palletId}</td>
                    <td className="py-2">{new Date(pkg.arrivalDate).toLocaleDateString()}</td>
                    <td className="py-2 text-right">{pkg.currency} {pkg.totalValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3 bg-navy-50 rounded flex justify-between items-center">
              <span className="text-sm font-medium">Total Selected Value</span>
              <span className="text-lg font-semibold">USD {totalSelectedValue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button size="sm" onClick={() => setStep(2)}>Submit for Approval <Shield className="w-3 h-3 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Approval Status</h2>
            {!submitted ? (
              <>
                <div className="p-4 bg-amber-50 border border-warning/20 rounded text-xs">
                  <p className="font-medium text-warning">⚠ Supervisor Approval Required</p>
                  <p className="text-muted-foreground mt-1">This stock-out request for {selectedPkgs.length} packages (USD {totalSelectedValue.toLocaleString()}) requires supervisor authorization before retrieval can begin.</p>
                </div>
                <Button size="sm" onClick={() => setSubmitted(true)}>Submit Request</Button>
              </>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div className="p-4 bg-green-50 border border-success/20 rounded">
                  <p className="text-sm font-medium text-success">✓ Request Submitted</p>
                  <p className="text-xs text-muted-foreground mt-1">Approval request APR-006 sent to Supervisor. Robot retrieval tasks will be created upon approval.</p>
                </div>
                <div className="p-3 bg-muted rounded text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Request ID</span><span className="font-mono">APR-006</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-warning font-medium">Pending Approval</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{new Date().toLocaleString()}</span></div>
                </div>
                <p className="text-xs text-muted-foreground italic">For demo: Assuming approved. Proceed to outbound verification →</p>
                <Button size="sm" onClick={() => setStep(3)}>Proceed to Verification <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            )}
            <div className="flex justify-start">
              <Button size="sm" variant="outline" onClick={() => { setStep(1); setSubmitted(false); }}>Back</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Outbound Door Verification</h2>
            <p className="text-xs text-muted-foreground">Scan each outgoing package at the warehouse exit to verify against the approved request.</p>

            <div className="p-4 bg-muted rounded-lg border-2 border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <ScanLine className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Outbound Scanner</span>
              </div>
              <div className="flex gap-2">
                <input value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} placeholder="Scan package QR..." className="flex-1 px-3 py-2 border rounded text-sm bg-background font-mono" />
                <Button size="sm" onClick={handleScan}>Scan</Button>
              </div>
            </div>

            <div className="text-xs">
              <p className="text-muted-foreground mb-2">Scanned: {scanList.length} / {selectedPkgs.length} expected</p>
              <div className="space-y-1">
                {selectedPkgs.map(pkg => {
                  const scanned = scanList.includes(pkg.packageId);
                  return (
                    <div key={pkg.packageId} className={`flex items-center gap-2 px-3 py-2 rounded ${scanned ? 'bg-green-50' : 'bg-muted'}`}>
                      {scanned ? <CheckCircle className="w-3 h-3 text-success" /> : <Package className="w-3 h-3 text-muted-foreground" />}
                      <span className="font-mono">{pkg.packageId}</span>
                      <span className={`ml-auto text-[10px] ${scanned ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                        {scanned ? 'Verified ✓' : 'Pending scan'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {!verified && scanList.length > 0 && (
              <Button size="sm" onClick={() => setVerified(true)} className="bg-success hover:bg-success/90">
                Confirm Release ({scanList.length} packages)
              </Button>
            )}

            {verified && (
              <div className="p-4 bg-green-50 border border-success/20 rounded animate-fade-in">
                <p className="text-sm font-medium text-success">✓ Stock-Out Complete</p>
                <p className="text-xs text-muted-foreground mt-1">All packages verified and released. Audit log updated. Shelf locations freed.</p>
              </div>
            )}

            <div className="flex justify-start">
              <Button size="sm" variant="outline" onClick={() => setStep(2)}>Back</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockOutPage;
