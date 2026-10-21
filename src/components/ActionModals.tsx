import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  ArrowRightLeft, 
  Wrench, 
  Heart, 
  ShieldCheck, 
  Gauge, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  Building
} from 'lucide-react';
import { ItemDetail, User, ServiceProvider, KnownIssue, Organization } from '../types';
import { api } from '../api';

// ============================================================================
// 1. LIST FOR SALE MODAL
// ============================================================================
interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDetail['item'];
  onSuccess: () => void;
}

export const ListModal: React.FC<ListModalProps> = ({ isOpen, onClose, item, onSuccess }) => {
  const [askingPrice, setAskingPrice] = useState<number | ''>(
    item.purchase_price ? Math.round(Number(item.purchase_price) * 0.7) : 500
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askingPrice || Number(askingPrice) <= 0) {
      setError('Please provide a valid asking price.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await api.listItemForSale(item.item_id, Number(askingPrice));
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to list item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">List Item on Marketplace</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-800">{item.name}</div>
            <div className="text-xs text-slate-500 font-mono">SN: {item.serial_number}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asking Price ($ USD) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900">
            ℹ️ Listing will update the item status to <strong>'listed'</strong> and register an entry in the listings table and lifecycle history.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              {loading ? 'Listing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. RECORD SALE MODAL (ATOMIC 5-TABLE WRITE)
// ============================================================================
interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDetail['item'];
  currentUser: User | null;
  users: User[];
  onSuccess: () => void;
}

export const SellModal: React.FC<SellModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  users,
  onSuccess
}) => {
  const [buyerId, setBuyerId] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>(
    item.current_asking_price || item.purchase_price || 1000
  );
  const [paymentMethod, setPaymentMethod] = useState('Escrow / Verified Wire');
  const [conditionScore, setConditionScore] = useState<number>(
    item.latest_condition_score || 8
  );
  const [conditionNotes, setConditionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter out the current owner from potential buyers
  const eligibleBuyers = users.filter((u) => u.userId !== item.current_owner_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId) {
      setError('Please select a verified buyer.');
      return;
    }
    if (!salePrice || Number(salePrice) <= 0) {
      setError('Please provide a valid sale price.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.recordSale(item.item_id, {
        buyer_id: Number(buyerId),
        sale_price: Number(salePrice),
        payment_method: paymentMethod,
        condition_score: conditionScore,
        condition_notes: conditionNotes,
        listing_id: item.active_listing_id
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Sale transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Record Sale & Transfer Title</h3>
              <p className="text-[11px] text-slate-400">Atomic Multi-Table Transaction</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-800">{item.name}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Current Owner: <strong>{item.current_owner_name}</strong></span>
              <span>•</span>
              <span className="font-mono">{item.serial_number}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select New Buyer (Purchaser) *
            </label>
            <select
              required
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Buyer User Account...</option>
              {eligibleBuyers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName} ({u.email}) {u.city ? `• ${u.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final Sale Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Escrow / Verified Wire">Escrow / Verified Wire</option>
                <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                <option value="In-Person Cash">In-Person Cash</option>
                <option value="Credit Card / Stripe">Credit Card / Stripe</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Verified Condition Score at Transfer:</span>
              <span className="font-bold text-slate-900">{conditionScore}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={conditionScore}
              onChange={(e) => setConditionScore(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transfer Assessment Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Verified working order, serial inspected, cosmetic condition confirmed."
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Atomic Transaction Guaranteed:</span>
            </div>
            <ul className="list-disc list-inside text-[10px] space-y-0.5 text-emerald-800">
              <li>Inserts record into <code>sales_transactions</code></li>
              <li>Inserts record into <code>ownership_transfers</code></li>
              <li>Closes seller's <code>ownership_records</code> row (end_date set)</li>
              <li>Opens new buyer's <code>ownership_records</code> row</li>
              <li>Adds lifecycle event & new condition log</li>
              <li>Updates <code>items.current_owner_id</code> & increments owner count</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              {loading ? 'Executing Transaction...' : 'Complete Sale & Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. LOG REPAIR MODAL (WITH KNOWLEDGE BASE DIAGNOSTICS)
// ============================================================================
interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDetail['item'];
  providers: ServiceProvider[];
  knownIssues: KnownIssue[];
  onSuccess: () => void;
}

export const RepairModal: React.FC<RepairModalProps> = ({
  isOpen,
  onClose,
  item,
  providers,
  knownIssues,
  onSuccess
}) => {
  const [providerId, setProviderId] = useState<number | ''>('');
  const [repairDate, setRepairDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState<number | ''>(150);
  const [conditionBefore, setConditionBefore] = useState<number>(
    Math.max(1, (item.latest_condition_score || 8) - 2)
  );
  const [conditionAfter, setConditionAfter] = useState<number>(
    item.latest_condition_score || 9
  );
  const [selectedIssueId, setSelectedIssueId] = useState<number | ''>('');
  const [selectedCauseId, setSelectedCauseId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Selected issue details
  const activeIssue = knownIssues.find((i) => i.issue_id === Number(selectedIssueId));

  const handleSelectIssue = (issueId: number | '') => {
    setSelectedIssueId(issueId);
    if (!issueId) {
      setSelectedCauseId('');
      return;
    }
    const issue = knownIssues.find((i) => i.issue_id === issueId);
    if (issue && issue.causes && issue.causes.length > 0) {
      const firstCause = issue.causes[0];
      setSelectedCauseId(firstCause.cause_id);
      setDescription(`Serviced issue: ${issue.title}. Fix: ${firstCause.suggested_fix}`);
      if (firstCause.estimated_cost) {
        setCost(firstCause.estimated_cost);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return setError('Please choose a certified service provider.');
    if (!description.trim()) return setError('Please provide repair details.');

    try {
      setLoading(true);
      setError(null);
      await api.logRepair(item.item_id, {
        provider_id: Number(providerId),
        repair_date: repairDate,
        description: description.trim(),
        cost: Number(cost || 0),
        condition_before: Number(conditionBefore),
        condition_after: Number(conditionAfter),
        issue_id: selectedIssueId ? Number(selectedIssueId) : null,
        cause_id: selectedCauseId ? Number(selectedCauseId) : null,
        notes: notes.trim()
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to log repair');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Log Certified Repair / Service</h3>
              <p className="text-[11px] text-slate-400">Knowledge Base Integration & Condition Restoration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          {/* Knowledge Base Suggestion Assist */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Repair Knowledge Base Diagnostic Assist</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Select a known issue to automatically pre-fill symptom causes, suggested fix methods, and estimated costs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Known Issue
                </label>
                <select
                  value={selectedIssueId}
                  onChange={(e) => handleSelectIssue(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                >
                  <option value="">Select Known Issue...</option>
                  {knownIssues.map((issue) => (
                    <option key={issue.issue_id} value={issue.issue_id}>
                      [{issue.severity}] {issue.title}
                    </option>
                  ))}
                </select>
              </div>

              {activeIssue && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Identified Root Cause
                  </label>
                  <select
                    value={selectedCauseId}
                    onChange={(e) => setSelectedCauseId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                  >
                    {activeIssue.causes.map((c) => (
                      <option key={c.cause_id} value={c.cause_id}>
                        {c.cause_description.slice(0, 45)}... (${c.estimated_cost})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Service Provider *
              </label>
              <select
                required
                value={providerId}
                onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Service Provider...</option>
                {providers.map((p) => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.name} ({p.service_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Service Date *
              </label>
              <input
                type="date"
                required
                value={repairDate}
                onChange={(e) => setRepairDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Repair Description & Parts Replaced *
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Replaced swollen battery module with genuine OEM part, cleaned fan heatsinks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition Before (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={conditionBefore}
                onChange={(e) => setConditionBefore(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition After (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={conditionAfter}
                onChange={(e) => setConditionAfter(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspector / Diagnostic Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Diagnostic pass 100%, battery health restored to 100%."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
            >
              {loading ? 'Logging Service...' : 'Commit Repair to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. DONATE TO CHARITY / ORGANIZATION MODAL
// ============================================================================
interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDetail['item'];
  organizations: Organization[];
  onSuccess: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({
  isOpen,
  onClose,
  item,
  organizations,
  onSuccess
}) => {
  const [orgId, setOrgId] = useState<number | ''>('');
  const [notes, setNotes] = useState('Charitable donation for educational and community repurposing.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return setError('Please select a recipient organization.');

    try {
      setLoading(true);
      setError(null);
      await api.recordDonation(item.item_id, {
        organization_id: Number(orgId),
        notes: notes.trim()
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Donation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-sm">Donate Item to Non-Profit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Certified Non-Profit / Charity *
            </label>
            <select
              required
              value={orgId}
              onChange={(e) => setOrgId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Select Non-Profit Organization...</option>
              {organizations.map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.name} ({org.org_type}) - {org.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Donation Notes & Tax Exemption Reference
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-rose-900">
            ❤️ Donating transfers legal ownership to the organization, closes the current owner record, and creates an official donation receipt.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
            >
              {loading ? 'Recording Donation...' : 'Confirm Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PROVENANCE VERIFICATION MODAL
// ============================================================================
interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDetail['item'];
  onSuccess: () => void;
}

export const VerifyProvenanceModal: React.FC<VerifyModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess
}) => {
  const [method, setMethod] = useState('Serial Check + OEM Database');
  const [notes, setNotes] = useState(
    'Hardware serial matched with manufacturer records; original purchase invoice cross-referenced.'
  );
  const [status, setStatus] = useState('verified');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.verifyProvenance(item.item_id, {
        method,
        notes,
        status
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Issue Provenance Verification</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verification Methodology *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="Serial Check + OEM Database">Serial Check + OEM Database</option>
              <option value="Original Purchase Receipt Audit">Original Purchase Receipt Audit</option>
              <option value="Physical Hardware Inspection">Physical Hardware Inspection</option>
              <option value="Cryptographic / NFC Tag Validation">Cryptographic / NFC Tag Validation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verification Outcome
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="verified"
                  checked={status === 'verified'}
                  onChange={() => setStatus('verified')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-emerald-700 font-semibold">Verified Title / Genuine</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="rejected"
                  checked={status === 'rejected'}
                  onChange={() => setStatus('rejected')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700 font-semibold">Flag / Disputed</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verification Details & Inspector Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              {loading ? 'Recording...' : 'Certify Provenance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
