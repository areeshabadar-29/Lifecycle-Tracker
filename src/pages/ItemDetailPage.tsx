import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Calendar, 
  Tag, 
  User as UserIcon, 
  Wrench, 
  DollarSign, 
  Heart, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Battery, 
  Layers, 
  FileCheck, 
  ChevronRight,
  Share2,
  Copy,
  ExternalLink,
  Award,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { ItemDetail, User, ServiceProvider, KnownIssue, Organization } from '../types';
import { 
  ListModal, 
  SellModal, 
  RepairModal, 
  DonateModal, 
  VerifyProvenanceModal 
} from '../components/ActionModals';

interface ItemDetailPageProps {
  itemDetail: ItemDetail;
  currentUser: User | null;
  users: User[];
  providers: ServiceProvider[];
  knownIssues: KnownIssue[];
  organizations: Organization[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenLogin: () => void;
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  itemDetail,
  currentUser,
  users,
  providers,
  knownIssues,
  organizations,
  onBack,
  onRefresh,
  onOpenLogin
}) => {
  const { item, images, lifecycleEvents, ownershipChain, conditionLogs, repairs, verifications, listings, donations } = itemDetail;

  const [activeImage, setActiveImage] = useState<string>(
    item.primary_image || (images.length > 0 ? images[0].image_url : 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80')
  );

  // Modal controls
  const [openListModal, setOpenListModal] = useState(false);
  const [openSellModal, setOpenSellModal] = useState(false);
  const [openRepairModal, setOpenRepairModal] = useState(false);
  const [openDonateModal, setOpenDonateModal] = useState(false);
  const [openVerifyModal, setOpenVerifyModal] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);

  const isOwner = currentUser && currentUser.userId === item.current_owner_id;
  const isAdmin = currentUser && currentUser.role === 'admin';

  const copySerial = () => {
    navigator.clipboard.writeText(item.serial_number);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'registration':
        return { label: 'Initial Registration', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: ShieldCheck };
      case 'sale':
        return { label: 'Title Transfer / Sale', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: DollarSign };
      case 'repair':
        return { label: 'Certified Repair', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: Wrench };
      case 'listing':
        return { label: 'Marketplace Listing', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Tag };
      case 'donation':
        return { label: 'Charitable Donation', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: Heart };
      case 'provenance_check':
        return { label: 'Provenance Verified', bg: 'bg-teal-100 text-teal-800 border-teal-200', icon: FileCheck };
      default:
        return { label: 'Condition Inspection', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: Clock };
    }
  };

  const latestCondition = conditionLogs.length > 0 ? conditionLogs[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Quick Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Registry Explorer</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-mono">
            Item ID: #{item.item_id}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-500">
            Immutable Ledger Record
          </span>
        </div>
      </div>

      {/* Main Carfax Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {item.category_name}
              </span>
              {verifications.some(v => v.status === 'verified') && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Provenance Title
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                item.status === 'listed' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                item.status === 'donated' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                'bg-slate-700 text-slate-200'
              }`}>
                Status: {item.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {item.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <div>Brand: <strong className="text-white">{item.brand}</strong></div>
              <div>Model: <strong className="text-white">{item.model}</strong></div>
              {item.manufacture_year && <div>Year: <strong className="text-white">{item.manufacture_year}</strong></div>}
              {item.color && <div>Color: <strong className="text-white">{item.color}</strong></div>}
              <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-slate-400">SN:</span>
                <span className="font-mono text-emerald-400 font-semibold">{item.serial_number}</span>
                <button
                  onClick={copySerial}
                  className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                  title="Copy Serial Number"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {copiedSerial && <span className="text-[10px] text-emerald-300">Copied!</span>}
              </div>
            </div>
          </div>

          {/* Action buttons panel */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            {isOwner && item.status !== 'listed' && (
              <button
                onClick={() => setOpenListModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>List for Sale</span>
              </button>
            )}

            {isOwner && (
              <>
                <button
                  onClick={() => setOpenSellModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transfer / Sell Title</span>
                </button>

                <button
                  onClick={() => setOpenRepairModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Log Repair Service</span>
                </button>

                <button
                  onClick={() => setOpenDonateModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  <span>Donate to Charity</span>
                </button>
              </>
            )}

            {/* Non-owner: Buy button if listed */}
            {!isOwner && item.status === 'listed' && (
              <button
                onClick={() => {
                  if (!currentUser) return onOpenLogin();
                  setOpenSellModal(true);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Purchase Item (${Number(item.current_asking_price || 0).toFixed(2)})</span>
              </button>
            )}

            {/* Admin inspector action */}
            {isAdmin && (
              <button
                onClick={() => setOpenVerifyModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit & Verify Provenance</span>
              </button>
            )}
          </div>
        </div>

        {/* Carfax Scoreboard Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/70">
          <div className="p-4 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-500">Condition Score</div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold text-slate-900">
                  {latestCondition ? `${latestCondition.condition_score}/10` : '10/10'}
                </span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {latestCondition?.condition_grade || 'Mint'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-500">Ownership Chain</div>
              <div className="text-base font-extrabold text-slate-900">
                {ownershipChain.length} {ownershipChain.length === 1 ? 'Owner' : 'Owners'}
              </div>
              <div className="text-[11px] text-slate-500">
                Current: <strong className="text-slate-700">{item.current_owner_name}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-500">Maintenance & Repairs</div>
              <div className="text-base font-extrabold text-slate-900">
                {repairs.length} {repairs.length === 1 ? 'Certified Record' : 'Certified Records'}
              </div>
              <div className="text-[11px] text-slate-500">
                Total Serviced: ${repairs.reduce((acc, r) => acc + Number(r.cost || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-500">Battery & Hardware</div>
              <div className="text-base font-extrabold text-slate-900">
                {latestCondition?.battery_health_pct ? `${latestCondition.battery_health_pct}% Health` : '100% Factory'}
              </div>
              <div className="text-[11px] text-slate-500">
                {item.battery_rated_hours ? `${item.battery_rated_hours} hrs runtime` : 'Optimal status'}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery & Specifications */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photos */}
          <div className="lg:col-span-1 space-y-3">
            <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={activeImage}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img) => (
                  <button
                    key={img.image_id}
                    onClick={() => setActiveImage(img.image_url)}
                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      activeImage === img.image_url ? 'border-blue-600 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Specs */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Description & Condition Summary
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {item.description || 'No description provided by the initial owner.'}
              </p>
            </div>

            {/* Specifications Key-Values */}
            {item.specifications && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Technical Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  {typeof item.specifications === 'object' ? (
                    Object.entries(item.specifications).map(([key, val]) => (
                      <div key={key} className="p-1.5">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">{key}:</span>
                        <span className="font-medium text-slate-800">{String(val)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full font-mono text-[11px] text-slate-700">
                      {String(item.specifications)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Listing / Price Status */}
            {item.current_asking_price && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-semibold">Active Marketplace Listing:</div>
                  <div className="text-lg font-extrabold text-emerald-950">
                    ${Number(item.current_asking_price).toFixed(2)} USD
                  </div>
                </div>
                <span className="text-xs text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-200 font-semibold">
                  Available for Purchase
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: Sequential Ownership Chain */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Sequential Title & Ownership Chain</h2>
          </div>
          <span className="text-xs text-slate-500">
            {ownershipChain.length} Ownership Era{ownershipChain.length > 1 ? 's' : ''} Documented
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ownershipChain.map((rec, idx) => (
            <div 
              key={rec.ownership_id}
              className={`p-4 rounded-xl border relative transition ${
                !rec.end_date 
                  ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/20' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {idx === 0 ? 'Original Owner (1st)' : idx === 1 ? 'Second Owner (2nd)' : `${idx + 1}th Owner`}
                </span>
                {!rec.end_date ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Current Owner
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    Transferred
                  </span>
                )}
              </div>

              <h4 className="font-bold text-sm text-slate-900">{rec.owner_name}</h4>
              <div className="text-xs text-slate-500">{rec.owner_city || 'City on file'}</div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 text-[11px] space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ownership Start:</span>
                  <span className="font-semibold text-slate-800">{rec.start_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ownership End:</span>
                  <span className="font-semibold text-slate-800">{rec.end_date || 'Present (Active)'}</span>
                </div>
                {rec.transfer_type && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Acquisition:</span>
                    <span className="font-semibold capitalize text-purple-700">{rec.transfer_type}</span>
                  </div>
                )}
                {rec.from_user_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transferred From:</span>
                    <span className="font-semibold text-slate-800">{rec.from_user_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: Chronological Lifecycle History Timeline ("Carfax Report") */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Complete Lifecycle Chronicle</h2>
              <p className="text-xs text-slate-500">
                Every event recorded chronologically with strict append-only integrity (no deletions/updates).
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {lifecycleEvents.length} Events Total
          </span>
        </div>

        {/* Timeline Stream */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {lifecycleEvents.map((evt, idx) => {
            const badge = getEventBadge(evt.event_type);
            const Icon = badge.icon;

            return (
              <div key={evt.event_id} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-110 transition">
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Event Card */}
                <div className="bg-slate-50/80 hover:bg-slate-50 transition rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Recorded by {evt.performed_by_name} ({evt.performed_by_role})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(evt.event_date).toLocaleDateString()}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(evt.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Contextual event sub-details if repair or condition check */}
                  {evt.event_type === 'repair' && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-amber-800 flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Certified Service Record verified by maintenance facility.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION: Certified Repairs & Maintenance Ledger */}
      {repairs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Certified Repairs & Service History</h2>
            </div>
            <span className="text-xs text-slate-500">{repairs.length} Service Logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Description & Diagnostic Fix</th>
                  <th className="py-2.5 px-3">Condition (Before → After)</th>
                  <th className="py-2.5 px-3 text-right">Service Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repairs.map((rep) => (
                  <tr key={rep.repair_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">{rep.repair_date}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{rep.provider_name}</div>
                      <div className="text-[10px] text-slate-500">{rep.provider_type} • {rep.provider_city}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800">{rep.description}</div>
                      {rep.issue_title && (
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          Diagnosed: <strong>{rep.issue_title}</strong>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-rose-600">{rep.condition_before}/10</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-bold text-emerald-600">{rep.condition_after}/10</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${Number(rep.cost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: Provenance Verifications & Authenticity Audits */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Official Provenance Verifications</h2>
          </div>
          <span className="text-xs text-slate-500">{verifications.length} Authentications on Record</span>
        </div>

        {verifications.length === 0 ? (
          <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-200">
            No official provenance verification logged yet. Administrators can conduct an audit and issue an official badge.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifications.map((v) => (
              <div 
                key={v.verification_id}
                className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Verified Genuine Title
                  </span>
                  <span className="text-[10px] text-slate-500">{v.verification_date}</span>
                </div>
                <div className="text-xs text-slate-800">
                  Method: <strong className="text-slate-900">{v.method}</strong>
                </div>
                <div className="text-[11px] text-slate-600">
                  {v.notes}
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200/50">
                  Inspector: {v.verified_by_name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ListModal
        isOpen={openListModal}
        onClose={() => setOpenListModal(false)}
        item={item}
        onSuccess={() => {
          setOpenListModal(false);
          onRefresh();
        }}
      />

      <SellModal
        isOpen={openSellModal}
        onClose={() => setOpenSellModal(false)}
        item={item}
        currentUser={currentUser}
        users={users}
        onSuccess={() => {
          setOpenSellModal(false);
          onRefresh();
        }}
      />

      <RepairModal
        isOpen={openRepairModal}
        onClose={() => setOpenRepairModal(false)}
        item={item}
        providers={providers}
        knownIssues={knownIssues}
        onSuccess={() => {
          setOpenRepairModal(false);
          onRefresh();
        }}
      />

      <DonateModal
        isOpen={openDonateModal}
        onClose={() => setOpenDonateModal(false)}
        item={item}
        organizations={organizations}
        onSuccess={() => {
          setOpenDonateModal(false);
          onRefresh();
        }}
      />

      <VerifyProvenanceModal
        isOpen={openVerifyModal}
        onClose={() => setOpenVerifyModal(false)}
        item={item}
        onSuccess={() => {
          setOpenVerifyModal(false);
          onRefresh();
        }}
      />
    </div>
  );
};
