import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  Wrench, 
  User as UserIcon, 
  Tag, 
  Battery, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown,
  Sparkles,
  Layers
} from 'lucide-react';
import { ItemSummary, Category } from '../types';

interface MarketplacePageProps {
  items: ItemSummary[];
  categories: Category[];
  categoryTree: Category[];
  onSelectItem: (itemId: number) => void;
  onOpenRegister: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: number | '';
  setSelectedCategory: (cat: number | '') => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  minCondition: number | '';
  setMinCondition: (score: number | '') => void;
  minPrice: string;
  setMinPrice: (p: string) => void;
  maxPrice: string;
  setMaxPrice: (p: string) => void;
  onResetFilters: () => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  items,
  categories,
  categoryTree,
  onSelectItem,
  onOpenRegister,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  minCondition,
  setMinCondition,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  onResetFilters
}) => {
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const getConditionColor = (score?: number) => {
    if (!score) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (score >= 9) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (score >= 8) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (score >= 6) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (score >= 4) return 'bg-orange-50 text-orange-800 border-orange-200';
    return 'bg-rose-50 text-rose-800 border-rose-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner with Carfax value prop */}
      <div className="relative rounded-2xl overflow-hidden bg-radial from-slate-900 via-slate-900 to-blue-950 text-white p-6 sm:p-10 border border-slate-800 shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>The Carfax for Everyday Physical Items</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Transparent Lifecycle, Ownership & Repair History
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Every second-hand purchase should have verifiable provenance. Trace original retail purchases, certified repair service records, condition degradations, and continuous title transfers with cryptographic certainty.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenRegister}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Register An Item to the Ledger</span>
            </button>
            <span className="text-xs text-slate-400">
              ⚡ Over 17 MySQL tables tracked with zero history erasure
            </span>
          </div>
        </div>

        {/* Decorative background grid */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Item Title, Brand, Model, Serial Number (e.g. C02G99XZMD6R)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Hierarchical category dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
              className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories (Hierarchical)</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.parent_category_id ? `  ↳ ${c.name}` : `📁 ${c.name}`}
                </option>
              ))}
            </select>

            {/* Toggle advanced filters */}
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                showFiltersMobile || minCondition || minPrice || maxPrice
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
            Status:
          </span>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'listed', label: '🏷️ Listed for Sale' },
            { id: 'active', label: '🛡️ Active In Registry' },
            { id: 'sold', label: '✅ Sold History' },
            { id: 'donated', label: '❤️ Donated' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters Drawer (Condition & Price range) */}
        {showFiltersMobile && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in">
            {/* Condition Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Minimum Condition Score
              </label>
              <select
                value={minCondition}
                onChange={(e) => setMinCondition(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Any Condition</option>
                <option value="9">9+ Mint Condition</option>
                <option value="8">8+ Excellent Condition</option>
                <option value="6">6+ Good Condition</option>
                <option value="4">4+ Fair Condition</option>
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Min Price ($)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Max Price ($)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="5000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
                />
                <button
                  onClick={onResetFilters}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items Count and Active Filters Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <strong>{items.length}</strong> verified item{items.length === 1 ? '' : 's'} on the ledger
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span>Click any item to view its complete title chain and Carfax history report</span>
        </div>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No items match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your category or condition filters, or register a new physical item.
          </p>
          <button
            onClick={onResetFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const condClass = getConditionColor(item.latest_condition_score);

            return (
              <div
                key={item.item_id}
                onClick={() => onSelectItem(item.item_id)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-400 hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Photo with Overlay Badges */}
                  <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                    <img
                      src={item.primary_image || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-xs text-white">
                        {item.category_name}
                      </span>
                      {item.verified_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Condition Pill */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold shadow-sm border ${condClass}`}>
                        {item.latest_condition_score ? `${item.latest_condition_score}/10` : '10/10'} {item.latest_condition_grade || 'Mint'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {item.brand} • {item.model}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                        {item.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                        SN: {item.serial_number}
                      </div>
                    </div>

                    {/* Metadata Summary Pill Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1 text-slate-700">
                        <UserIcon className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">
                          {item.total_owners_recorded} Owner{item.total_owners_recorded > 1 ? 's' : ''} ({item.current_owner_name})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700">
                        <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{item.repair_count} Certified Repair{item.repair_count === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Price / Status */}
                <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {item.current_asking_price ? (
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Asking Price</div>
                        <div className="text-base font-extrabold text-slate-900 leading-tight">
                          ${Number(item.current_asking_price).toFixed(2)}
                        </div>
                      </div>
                    ) : item.purchase_price ? (
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Original MSRP</div>
                        <div className="text-xs font-semibold text-slate-600">
                          ${Number(item.purchase_price).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500">
                        Private Ledger Record
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition">
                    <span>View Carfax</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
