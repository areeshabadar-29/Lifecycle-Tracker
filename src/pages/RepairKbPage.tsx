import React, { useState } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Sparkles, 
  Phone, 
  MapPin, 
  Search, 
  ShieldAlert,
  Building
} from 'lucide-react';
import { KnownIssue, ServiceProvider, Category } from '../types';

interface RepairKbPageProps {
  issues: KnownIssue[];
  providers: ServiceProvider[];
  categories: Category[];
}

export const RepairKbPage: React.FC<RepairKbPageProps> = ({
  issues,
  providers,
  categories
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'providers'>('issues');
  const [searchKb, setSearchKb] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | ''>('');

  const filteredIssues = issues.filter((iss) => {
    const matchesSearch =
      iss.title.toLowerCase().includes(searchKb.toLowerCase()) ||
      iss.symptoms.toLowerCase().includes(searchKb.toLowerCase());
    const matchesCategory = !selectedCat || iss.category_id === selectedCat;
    return matchesSearch && matchesCategory;
  });

  const filteredProviders = providers.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchKb.toLowerCase()) ||
      p.service_type.toLowerCase().includes(searchKb.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(searchKb.toLowerCase()))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Repair Knowledge Base & Service Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized failure modes, symptoms, causes, repair feasibility, and accredited repair providers.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'issues'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Known Issues & Causes ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'providers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Certified Providers ({providers.length})
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={activeTab === 'issues' ? 'Search failure symptoms, components...' : 'Search providers, city, specialties...'}
            value={searchKb}
            onChange={(e) => setSearchKb(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {activeTab === 'issues' && (
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value ? Number(e.target.value) : '')}
            className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tab 1: Known Issues & Diagnostics */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIssues.map((issue) => (
              <div
                key={issue.issue_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-amber-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {issue.category_name || 'Category'}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{issue.title}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    issue.severity === 'High' ? 'bg-rose-100 text-rose-800' :
                    issue.severity === 'Medium' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {issue.severity} Severity
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Reported Symptoms:</span>
                  <p className="text-slate-700">{issue.symptoms}</p>
                </div>

                {/* Causes & Fixes */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Documented Causes & Suggested Fixes ({issue.causes?.length || 0})
                  </div>
                  {issue.causes?.map((cause) => (
                    <div 
                      key={cause.cause_id}
                      className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs space-y-1.5"
                    >
                      <div className="font-semibold text-amber-950 flex items-center justify-between">
                        <span>Root Cause:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-amber-200 text-amber-800 font-semibold">
                            Est: ${Number(cause.estimated_cost).toFixed(2)}
                          </span>
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-amber-200 text-amber-800 capitalize">
                            {cause.difficulty}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700 text-[11px]">{cause.cause_description}</p>

                      <div className="pt-1 text-[11px] text-emerald-800 font-medium flex items-start gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Fix: {cause.suggested_fix}</span>
                      </div>

                      {cause.needs_professional && (
                        <div className="text-[10px] text-rose-700 font-medium flex items-center gap-1 pt-0.5">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Professional OEM-certified equipment recommended.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Service Providers Directory */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((p) => (
            <div
              key={p.provider_id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {p.service_type}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                {p.address && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{p.address}, {p.city}</span>
                  </div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{p.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
