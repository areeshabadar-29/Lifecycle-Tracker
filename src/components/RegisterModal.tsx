import React, { useState } from 'react';
import { X, Upload, Plus, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { api } from '../api';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: (itemId: number) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [manufactureYear, setManufactureYear] = useState<number | ''>(new Date().getFullYear());
  const [acquisitionType, setAcquisitionType] = useState('first_hand');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');

  // Battery info
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryType, setBatteryType] = useState('Lithium-Ion');
  const [batteryCapacityMah, setBatteryCapacityMah] = useState<number | ''>('');
  const [batteryRatedHours, setBatteryRatedHours] = useState<number | ''>('');

  // Condition assessment
  const [conditionScore, setConditionScore] = useState<number>(10);
  const [conditionNotes, setConditionNotes] = useState('');
  const [batteryHealthPct, setBatteryHealthPct] = useState<number | ''>(100);

  // Images
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
  ]);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!isOpen) return null;

  const getGradeText = (score: number) => {
    if (score >= 9) return { grade: 'Mint', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 8) return { grade: 'Excellent', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (score >= 6) return { grade: 'Good', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (score >= 4) return { grade: 'Fair', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { grade: 'Poor', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);
      const res = await api.uploadImage(file);
      setImagesList([...imagesList, res.url]);
    } catch (err: any) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImagesList([...imagesList, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImagesList(imagesList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Item name is required.');
    if (!categoryId) return setError('Please select a category.');
    if (!brand.trim()) return setError('Brand is required.');
    if (!model.trim()) return setError('Model is required.');
    if (!serialNumber.trim()) return setError('Serial number is required.');

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        category_id: Number(categoryId),
        brand: brand.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim().toUpperCase(),
        description: description.trim(),
        color: color.trim() || null,
        manufacture_year: manufactureYear ? Number(manufactureYear) : null,
        acquisition_type: acquisitionType,
        purchase_date: purchaseDate || null,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        warranty_expiry_date: warrantyExpiryDate || null,
        battery_type: hasBattery ? batteryType : null,
        battery_capacity_mah: hasBattery && batteryCapacityMah ? Number(batteryCapacityMah) : null,
        battery_rated_hours: hasBattery && batteryRatedHours ? Number(batteryRatedHours) : null,
        condition_score: conditionScore,
        condition_notes: conditionNotes || `Initial registration assessment: ${getGradeText(conditionScore).grade} (${conditionScore}/10).`,
        battery_health_pct: hasBattery && batteryHealthPct ? Number(batteryHealthPct) : null,
        image_urls: imagesList
      };

      const result = await api.registerItem(payload);
      onSuccess(result.item_id);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const gradeInfo = getGradeText(conditionScore);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Register New Item in Ledger</h2>
              <p className="text-xs text-slate-400">
                Executes in ONE atomic transaction across 5 MySQL tables with zero history deletion.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Item Identification */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <span>1. Item Identification & Specs</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony WH-1000XM5 Noise Canceling Headphones"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.parent_category_id ? `↳ ${cat.name}` : `📁 ${cat.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony, Apple, Nikon, Trek"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH1000XM5 / A2485"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serial Number (Immutable Provenance Key) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SN-84920492"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Color / Finish</label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Black, Silver"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacture Year</label>
                <input
                  type="number"
                  placeholder="2023"
                  value={manufactureYear}
                  onChange={(e) => setManufactureYear(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Detailed notes on item condition, included original accessories, boxes, warranty paperwork..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Acquisition & Purchase Info */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              2. Acquisition & Purchase Origin
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Acquisition Type</label>
                <select
                  value={acquisitionType}
                  onChange={(e) => setAcquisitionType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="first_hand">Brand New (Retail)</option>
                  <option value="second_hand">Second-Hand (Pre-Owned)</option>
                  <option value="refurbished">Certified Refurbished</option>
                  <option value="gift">Gift / Inherited</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="499.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Battery & Power Info (Optional) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Battery Specifications (Optional)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={hasBattery}
                  onChange={(e) => setHasBattery(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Item contains rechargeable battery</span>
              </label>
            </div>

            {hasBattery && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Battery Chemistry</label>
                  <input
                    type="text"
                    placeholder="e.g. Lithium-Polymer 100Wh"
                    value={batteryType}
                    onChange={(e) => setBatteryType(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (mAh)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={batteryCapacityMah}
                    onChange={(e) => setBatteryCapacityMah(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rated Backup Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 14.0"
                    value={batteryRatedHours}
                    onChange={(e) => setBatteryRatedHours(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Initial Condition Score & Assessment */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              4. Initial Baseline Condition Assessment
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Condition Score (1 - 10):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{conditionScore}/10</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${gradeInfo.color}`}>
                      {gradeInfo.grade}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={conditionScore}
                  onChange={(e) => setConditionScore(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>1 (Poor / Damaged)</span>
                  <span>5 (Fair / Heavy Signs)</span>
                  <span>8 (Excellent)</span>
                  <span>10 (Brand New / Mint)</span>
                </div>
              </div>

              {hasBattery && (
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Battery Health (%):</span>
                    <span>{batteryHealthPct || 100}%</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batteryHealthPct}
                    onChange={(e) => setBatteryHealthPct(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Condition & Aesthetic Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sealed box, zero scratches, pristine glass and pristine bezel."
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Photos */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              5. Photos & Provenance Evidence
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste direct Image URL (e.g. Unsplash or hosted photo)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700 cursor-pointer"
                >
                  Add URL
                </button>
                <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 border border-slate-200">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {/* Thumbnails preview */}
              {imagesList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {imagesList.map((url, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-300">
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-blue-600 text-[9px] text-white font-bold px-1 rounded">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              ⚡ Atomically inserts to items, item_images, ownership_records, lifecycle_events & condition_logs.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {loading ? (
                  <span>Executing Transaction...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register to Ledger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
