"use client";
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, CheckCircle, Plus, X, Upload,
  FileText, GripVertical, Star, StarOff, ArrowRight
} from 'lucide-react';
import Header from '@/components/Header';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove as dndArrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ─────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

type BannerImage = {
  id: string;
  file: File | null;
  url: string;
  isCover: boolean;
};

type CommunityAmenity = {
  id: string;
  name: string;
  imageFile: File | null;
};

const DEFAULT_PROPERTY_AMENITIES = [
  'CCTV Cameras', 'Reserved Parking', '24/7 Security', 'Power Backup', 'Lift',
  'Gym', 'Swimming Pool', 'Garden', 'Club House', 'Children Play Area',
];

const DEFAULT_NEARBY_PLACES = [
  'Hospital', 'School', 'Shopping Mall', 'Airport', 'Railway Station',
  'Metro Station', 'Bus Stand', 'Bank', 'Pharmacy', 'Restaurant',
];

// ─── Drag helper ─────────────────────────────────────────────────────────────
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ─── Sortable Banner Image Item ─────────────────────────────────────────────
function SortableBannerItem({
  banner, onRemove, onSetCover
}: {
  banner: { id: string; url: string; isCover: boolean };
  onRemove: (id: string) => void;
  onSetCover: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    minHeight: 110,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border-2 overflow-hidden transition-all ${banner.isCover ? 'border-[#C9A84C]' : 'border-[#E7E5E4]'}`}
    >
      <img src={banner.url} alt="Banner" className="w-full h-24 object-cover" />

      {/* Cover badge */}
      {banner.isCover && (
        <div className="absolute top-1 left-1 bg-[#C9A84C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Star size={7} /> Cover
        </div>
      )}

      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 bg-white/80 hover:bg-white p-1 rounded-full cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={11} className="text-[#78716C]" />
      </button>

      {/* Bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-1.5 flex gap-1">
        {!banner.isCover && (
          <button
            type="button"
            onClick={() => onSetCover(banner.id)}
            className="flex-1 bg-white/80 hover:bg-white text-[9px] font-bold rounded py-0.5 flex items-center justify-center gap-0.5"
          >
            <StarOff size={7} /> Cover
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(banner.id)}
          className="flex-1 bg-red-500/80 hover:bg-red-500 text-white text-[9px] font-bold rounded py-0.5"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Sortable Nearby Place Item ───────────────────────────────────────────────
function SortableNearbyItem({
  place, idx, onUpdate
}: {
  place: { id: string; category: string; distance: string; unit: 'km' | 'm' };
  idx: number;
  onUpdate: (id: string, field: 'distance' | 'unit', val: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg bg-[#FAFAF8] p-2.5 border border-[#E7E5E4]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-[#A8A29E] hover:text-[#78716C] cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical size={13} />
      </button>
      <span className="w-5 h-5 rounded-full bg-[#E7E5E4] text-[#78716C] text-[10px] font-bold flex items-center justify-center shrink-0">
        {idx + 1}
      </span>
      <span className="flex-1 text-xs font-semibold text-[#78716C] truncate">{place.category}</span>
      <input
        type="number" step="0.1"
        value={place.distance}
        onChange={e => onUpdate(place.id, 'distance', e.target.value)}
        className="w-14 bg-white border border-[#E7E5E4] rounded-md px-2 py-1.5 text-xs text-[#1C1917] text-right focus-visible:border-[#C9A84C] outline-none transition-all"
        placeholder="0"
      />
      <div className="flex border border-[#E7E5E4] rounded-md overflow-hidden shrink-0">
        {(['km', 'm'] as const).map(u => (
          <button key={u} type="button" onClick={() => onUpdate(place.id, 'unit', u)}
            className={`px-2 py-1.5 text-[10px] font-bold transition-all ${place.unit === u ? 'bg-[#1C1917] text-white' : 'bg-white text-[#78716C]'}`}>
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-sm font-medium leading-none text-[#78716C]";
const sectionTitleClass = "text-base font-bold text-[#1C1917]";

// ─── Step Labels ─────────────────────────────────────────────────────────────
const stepLabels = [
  { n: 1 as Step, label: 'Property Info' },
  { n: 2 as Step, label: 'Details' },
  { n: 3 as Step, label: 'Location & Attachments' },
];

// ─── Auto-resizing Textarea ──────────────────────────────────────────────────
function AutoResizeTextarea({ value, onChange, placeholder, name, rows = 3 }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; name?: string; rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const adjust = useCallback(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; }
  }, []);
  return (
    <textarea ref={ref} name={name} value={value} onChange={(e) => { onChange(e); adjust(); }} rows={rows}
      placeholder={placeholder}
      className={`${inputClass} resize-none overflow-hidden min-h-[80px]`}
      style={{ height: 'auto' }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    projectName: '', location: '', price: '',
    bedrooms: '', bathrooms: '', area: '', furnishing: 'Unfurnished',
    description: '', locationIframe: '', projectStatus: 'ONGOING',
  });

  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [communityAmenities, setCommunityAmenities] = useState<CommunityAmenity[]>([
    { id: Math.random().toString(36).slice(2), name: '', imageFile: null }
  ]);
  const [selectedPropertyAmenities, setSelectedPropertyAmenities] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState(
    DEFAULT_NEARBY_PLACES.map(cat => ({ id: Math.random().toString(36).slice(2), category: cat, distance: '', unit: 'km' as 'km' | 'm' }))
  );
  const [selectedNearbyPlaces, setSelectedNearbyPlaces] = useState<string[]>([]);
  const [brochureFile, setBrochureFile] = useState<File | null>(null);

  // Drag states
  const [commDragIdx, setCommDragIdx] = useState<number | null>(null);
  const [propDragIdx, setPropDragIdx] = useState<number | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Banner handlers ───────────────────────────────────────────────────────
  const addBannerImage = (file: File) => {
    if (bannerImages.length >= 3) return;
    const id = Math.random().toString(36).slice(2);
    setBannerImages(prev => [...prev, { id, file, url: URL.createObjectURL(file), isCover: prev.length === 0 }]);
  };
  const removeBannerImage = (id: string) => {
    setBannerImages(prev => {
      const updated = prev.filter(b => b.id !== id);
      if (updated.length > 0 && !updated.some(b => b.isCover)) updated[0].isCover = true;
      return updated;
    });
  };
  const setCoverImage = (id: string) => setBannerImages(prev => prev.map(b => ({ ...b, isCover: b.id === id })));
  const moveBannerImage = (from: number, to: number) => setBannerImages(prev => arrayMove(prev, from, to));

  // ── Community handlers ────────────────────────────────────────────────────
  const addCommunity = () => setCommunityAmenities(prev => [...prev, { id: Math.random().toString(36).slice(2), name: '', imageFile: null }]);
  const removeCommunity = (idx: number) => setCommunityAmenities(prev => prev.filter((_, i) => i !== idx));
  const updateCommunity = (idx: number, field: 'name' | 'imageFile', val: any) => {
    const updated = [...communityAmenities];
    if (field === 'name') updated[idx].name = val;
    else updated[idx].imageFile = val;
    setCommunityAmenities(updated);
  };
  const onCommDragStart = (idx: number) => setCommDragIdx(idx);
  const onCommDrop = (to: number) => {
    if (commDragIdx === null || commDragIdx === to) return;
    setCommunityAmenities(prev => arrayMove(prev, commDragIdx, to));
    setCommDragIdx(null);
  };

  // ── Property handlers ────────────────────────────────────────────────────
  const toggleProperty = (name: string) => setSelectedPropertyAmenities(prev =>
    prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
  );
  const onPropDragStart = (idx: number) => setPropDragIdx(idx);
  const onPropDrop = (to: number) => {
    if (propDragIdx === null || propDragIdx === to) return;
    setSelectedPropertyAmenities(prev => arrayMove(prev, propDragIdx, to));
    setPropDragIdx(null);
  };

  const toggleNearby = (id: string) => {
    setSelectedNearbyPlaces(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleBannerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBannerImages(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      return dndArrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleNearbyDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Only reorder among selected places
    setNearbyPlaces(prev => {
      const oldIdx = prev.findIndex(p => p.id === active.id);
      const newIdx = prev.findIndex(p => p.id === over.id);
      return dndArrayMove(prev, oldIdx, newIdx);
    });
  };

  const updateNearbyById = (id: string, field: 'distance' | 'unit', val: string) => {
    setNearbyPlaces(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!formData.projectName.trim()) return 'Project name is required.';
    if (!formData.location.trim()) return 'Location is required.';
    if (!formData.price.trim()) return 'Starting price is required.';
    if (!formData.bedrooms.trim()) return 'Number of bedrooms is required.';
    if (!formData.area.trim()) return 'Carpet area is required.';
    if (!formData.description.trim()) return 'Description is required.';
    if (bannerImages.length === 0) return 'At least 1 banner image is required.';
    if (selectedNearbyPlaces.length === 0) return 'Select at least 1 nearby place.';
    if (!brochureFile) return 'Brochure PDF is required.';
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (isDraft: boolean = false) => {
    if (isSubmitting) return;
    const err = validate();
    if (err) { setError(err); window.scrollTo(0, 0); return; }
    setIsSubmitting(true);
    setLoading(true);
    const formPayload = new FormData();
    formPayload.append('isDraft', isDraft ? 'true' : 'false');
    Object.entries(formData).forEach(([key, val]) => {
      formPayload.append(key, key === 'price' && val.trim() ? `₹ ${val}` : val);
    });

    const bannerPayload = bannerImages.map((b, idx) => ({ id: b.id, url: b.url, order: idx, isCover: b.isCover }));
    formPayload.append('bannerImages', JSON.stringify(bannerPayload));
    bannerImages.forEach((b, idx) => { if (b.file) formPayload.append(`bannerImage_${idx}`, b.file); });

    if (brochureFile) formPayload.append('brochure', brochureFile);

    const cleanComm = communityAmenities.filter(am => am.name.trim()).map(am => ({ name: am.name }));
    formPayload.append('communityAmenities', JSON.stringify(cleanComm));
    communityAmenities.forEach((am, idx) => { if (am.imageFile) formPayload.append(`communityImage_${idx}`, am.imageFile); });

    formPayload.append('propertyAmenities', JSON.stringify(selectedPropertyAmenities));

    const cleanNearby = nearbyPlaces
      .filter(p => selectedNearbyPlaces.includes(p.id) && p.category)
      .map(p => ({ category: p.category, distance: p.distance, unit: p.unit }));
    formPayload.append('nearbyPlaces', JSON.stringify(cleanNearby));

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('http://localhost:3002/admin/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formPayload
      });
      const data = await res.json();
      if (res.ok) router.push('/dashboard');
      else setError(data.status_message || 'Failed to create project.');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); setIsSubmitting(false); }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      <Header />

      {/* ── Stepper Bar ── */}
      <div className="bg-gradient-to-r from-[#1C1917] via-[#2D2420] to-[#1C1917] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <p className="text-xs font-semibold text-white/40 tracking-widest uppercase mb-4">New Listing</p>

          {/* Step indicators */}
          <div className="flex items-center">
            {stepLabels.map(({ n, label }, idx) => {
              const isDone = n < step;
              const isActive = n === step;
              return (
                <React.Fragment key={n}>
                  <button
                    onClick={() => isDone && setStep(n)}
                    className={`flex items-center gap-2.5 group ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {/* Circle */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                      isDone ? 'bg-[#16A34A] text-white shadow-lg shadow-green-900/40' :
                      isActive ? 'bg-[#C9A84C] text-[#1C1917] shadow-lg shadow-amber-900/40 ring-2 ring-[#C9A84C]/30' :
                      'bg-white/10 text-white/30'
                    }`}>
                      {isDone ? <CheckCircle size={14} strokeWidth={2.5} /> : n}
                    </div>
                    {/* Label */}
                    <span className={`text-sm font-semibold transition-colors ${
                      isActive ? 'text-[#C9A84C]' :
                      isDone ? 'text-white/70 group-hover:text-white' :
                      'text-white/30'
                    }`}>
                      {label}
                    </span>
                  </button>

                  {/* Connector line */}
                  {idx < stepLabels.length - 1 && (
                    <div className="flex-1 mx-4 h-[1px] bg-white/10 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#16A34A] transition-all duration-700 ease-out"
                        style={{ width: n < step ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Animated progress line at very bottom */}
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#C9A84C] to-[#16A34A] transition-all duration-700 ease-out"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Form Body (full width, card layout) ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium flex items-center gap-2">
            <X size={15} /> {error}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            STEP 1 — Property Info
        ════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Banner */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={sectionTitleClass}>Banner Images <span className="text-red-500">*</span></h2>
                  <p className="text-xs text-[#A8A29E] mt-0.5">First image is set as cover by default. Drag uploaded images to reorder.</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bannerImages.length === 3 ? 'bg-[#F0E6C8] text-[#8B6914]' : 'bg-[#F5F3EF] text-[#A8A29E]'}`}>
                  {bannerImages.length}/3
                </span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBannerDragEnd}>
                <SortableContext items={bannerImages.map(b => b.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Render all 3 slots */}
                    {[0, 1, 2].map(slotIdx => {
                      const banner = bannerImages[slotIdx];
                      if (banner) {
                        return (
                          <SortableBannerItem
                            key={banner.id}
                            banner={banner}
                            onRemove={removeBannerImage}
                            onSetCover={setCoverImage}
                          />
                        );
                      }
                      // Empty slot — upload placeholder
                      return (
                        <label
                          key={`slot-${slotIdx}`}
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E7E5E4] bg-[#FAFAF8] cursor-pointer hover:bg-[#F5F3EF] hover:border-[#C9A84C] transition-all group"
                          style={{ minHeight: 130 }}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#F0E6C8] group-hover:bg-[#E8D9A8] flex items-center justify-center mb-2 transition-colors">
                            <Upload size={18} className="text-[#C9A84C]" />
                          </div>
                          <span className="text-xs font-semibold text-[#78716C]">Image {slotIdx + 1}</span>
                          <span className="text-[10px] text-[#A8A29E] mt-0.5">Click to upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) addBannerImage(f); e.target.value = ''; }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>


            {/* Basic Info Card */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-5">
              <h2 className={sectionTitleClass}>Basic Information</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Project Name <span className="text-red-500">*</span></label>
                  <input name="projectName" value={formData.projectName} onChange={handleTextChange} className={inputClass} placeholder="e.g. Canvas by Kolte Patil" />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Location <span className="text-red-500">*</span></label>
                  <input name="location" value={formData.location} onChange={handleTextChange} className={inputClass} placeholder="e.g. Hinjewadi, Pune" />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Starting Price <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#78716C]">₹</span>
                    <input name="price" value={formData.price} onChange={handleTextChange} className={`${inputClass} pl-8`} placeholder="e.g. 82 Lacs" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════
            STEP 2 — Details
        ════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Overview */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-5">
              <h2 className={sectionTitleClass}>Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs text-[#A8A29E]">Bedrooms *</span>
                  <input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleTextChange} className={inputClass} placeholder="e.g. 3" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[#A8A29E]">Bathrooms</span>
                  <input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleTextChange} className={inputClass} placeholder="e.g. 2" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[#A8A29E]">Carpet Area *</span>
                  <input name="area" value={formData.area} onChange={handleTextChange} className={inputClass} placeholder="e.g. 1200 Sqft" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[#A8A29E]">Furnishing</span>
                  <select name="furnishing" value={formData.furnishing} onChange={handleTextChange} className={inputClass}>
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Furnished">Fully Furnished</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Project Status */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Project Status</h2>
              <div className="flex gap-3">
                {(['ONGOING', 'LATEST', 'COMPLETED'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, projectStatus: status }))}
                    className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      formData.projectStatus === status
                        ? 'bg-[#1C1917] text-white border-[#1C1917]'
                        : 'bg-white text-[#78716C] border-[#E7E5E4] hover:border-[#D6D3D1]'
                    }`}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Description <span className="text-red-500">*</span></h2>
              <AutoResizeTextarea name="description" value={formData.description} onChange={handleTextChange} placeholder="Describe the project, highlights, and what makes it unique..." rows={4} />
            </div>

            {/* Community Amenities */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className={sectionTitleClass}>Community Amenities</h2>
                <button type="button" onClick={addCommunity} className="flex items-center gap-1 text-xs font-semibold text-[#C9A84C] hover:text-[#8B6914] transition-colors">
                  <Plus size={12} /> Add
                </button>
              </div>
              <p className="text-xs text-[#A8A29E] -mt-1">Drag rows to reorder. Each needs a name and image.</p>
              <div className="space-y-2">
                {communityAmenities.map((am, idx) => (
                  <div
                    key={am.id}
                    draggable
                    onDragStart={() => onCommDragStart(idx)}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={() => onCommDrop(idx)}
                    className={`flex items-center gap-2 rounded-xl bg-[#FAFAF8] p-3 border border-[#E7E5E4] ${commDragIdx === idx ? 'opacity-50' : ''}`}
                  >
                    <GripVertical size={13} className="text-[#A8A29E] cursor-grab shrink-0" />
                    <input value={am.name} onChange={e => updateCommunity(idx, 'name', e.target.value)} className="flex-1 bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 outline-none transition-all" placeholder="Amenity name" />
                    <input type="file" accept="image/*" className="hidden" id={`comm-${am.id}`} onChange={e => updateCommunity(idx, 'imageFile', e.target.files?.[0] || null)} />
                    <label htmlFor={`comm-${am.id}`} className="flex items-center gap-1.5 border border-[#E7E5E4] rounded-lg px-3 py-2 text-xs font-medium text-[#78716C] cursor-pointer hover:border-[#C9A84C] transition-colors whitespace-nowrap">
                      {am.imageFile ? <><CheckCircle size={10} className="text-[#C9A84C]" /> Uploaded</> : <><Upload size={10} /> Image</>}
                    </label>
                    {communityAmenities.length > 1 && (
                      <button onClick={() => removeCommunity(idx)} className="p-1.5 text-[#A8A29E] hover:text-red-500 transition-colors shrink-0"><X size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Property Amenities */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Property Amenities</h2>
              <p className="text-xs text-[#A8A29E] -mt-1">Select which apply, drag checked items to reorder priority.</p>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_PROPERTY_AMENITIES.map(name => {
                  const isSelected = selectedPropertyAmenities.includes(name);
                  const displayIdx = selectedPropertyAmenities.indexOf(name);
                  return (
                    <div
                      key={name}
                      draggable={isSelected}
                      onDragStart={() => isSelected && onPropDragStart(displayIdx)}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={() => isSelected && onPropDrop(displayIdx)}
                      onClick={() => toggleProperty(name)}
                      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border cursor-pointer transition-all ${
                        isSelected ? 'bg-[#FBF8F0] border-[#C9A84C] text-[#1C1917]' : 'bg-white border-[#E7E5E4] text-[#A8A29E] hover:border-[#D6D3D1]'
                      } ${isSelected && propDragIdx === displayIdx ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-[#D6D3D1]'}`}>
                        {isSelected && <CheckCircle size={9} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium flex-1 leading-tight">{name}</span>
                      {isSelected && <GripVertical size={11} className="text-[#C9A84C] shrink-0" />}
                    </div>
                  );
                })}
              </div>
              {selectedPropertyAmenities.length > 0 && (
                <p className="text-xs text-[#A8A29E] italic">Display order: {selectedPropertyAmenities.join(' → ')}</p>
              )}
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════
            STEP 3 — Location & Attachments
        ════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Nearby Places */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Nearby Places</h2>
              <p className="text-xs text-[#A8A29E] -mt-1">Select which apply and enter distance. Drag selected items to reorder priority.</p>

              {/* All places as toggleable checkboxes */}
              <div className="grid grid-cols-2 gap-2">
                {nearbyPlaces.map(pl => {
                  const isSelected = selectedNearbyPlaces.includes(pl.id);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => toggleNearby(pl.id)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border cursor-pointer transition-all ${
                        isSelected ? 'bg-[#FBF8F0] border-[#C9A84C] text-[#1C1917]' : 'bg-white border-[#E7E5E4] text-[#A8A29E] hover:border-[#D6D3D1]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-[#D6D3D1]'}`}>
                        {isSelected && <CheckCircle size={9} className="text-white" />}
                      </div>
                      <span className="text-xs font-medium flex-1 leading-tight">{pl.category}</span>
                    </div>
                  );
                })}
              </div>

              {/* Distance inputs for selected places only — sortable */}
              {selectedNearbyPlaces.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E7E5E4]">
                  <p className="text-xs font-semibold text-[#78716C] mb-2">Arrange in the order you'd like them shown in the app</p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleNearbyDragEnd}>
                    <SortableContext
                      items={nearbyPlaces.filter(p => selectedNearbyPlaces.includes(p.id)).map(p => p.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nearbyPlaces
                          .filter(p => selectedNearbyPlaces.includes(p.id))
                          .map((pl, idx) => (
                            <SortableNearbyItem
                              key={pl.id}
                              place={pl}
                              idx={idx}
                              onUpdate={updateNearbyById}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>

            {/* Location Map */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-2">
              <h2 className={sectionTitleClass}>Location Map Embed Link</h2>
              <input name="locationIframe" value={formData.locationIframe} onChange={handleTextChange} className={inputClass} placeholder="https://www.google.com/maps/embed?pb=..." />
              <p className="text-xs text-[#A8A29E]">Paste a Google Maps embed URL to display the project location on the detail page.</p>
            </div>

            {/* Brochure */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Project Brochure (PDF) <span className="text-red-500">*</span></h2>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${brochureFile ? 'border-[#C9A84C] bg-[#FBF8F0]' : 'border-[#E7E5E4]'}`}>
                <input type="file" accept="application/pdf" className="hidden" id="brochure-upload" onChange={e => setBrochureFile(e.target.files?.[0] || null)} />
                <label htmlFor="brochure-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  {brochureFile ? (
                    <>
                      <div className="w-10 h-10 bg-[#F0E6C8] rounded-full flex items-center justify-center"><FileText size={20} className="text-[#C9A84C]" /></div>
                      <p className="text-sm font-semibold text-[#1C1917]">{brochureFile.name}</p>
                      <p className="text-xs text-[#A8A29E]">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <Upload size={22} className="text-[#A8A29E]" />
                      <p className="text-sm font-semibold text-[#78716C]">Click to upload PDF</p>
                      <p className="text-xs text-[#A8A29E]">Required</p>
                    </>
                  )}
                </label>
              </div>
            </div>

          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="mt-8 flex gap-3">
          {/* Left button: Cancel on step 1, Go back on steps 2+ */}
          {step === 1 ? (
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-5 h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F3EF] text-[#78716C] text-sm font-medium transition-all"
            >
              <X size={14} /> Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setStep(prev => (prev - 1) as Step); window.scrollTo(0, 0); }}
              className="px-6 h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F3EF] text-[#78716C] text-sm font-medium transition-all"
            >
              <ChevronLeft size={15} /> Go back
            </button>
          )}

          {/* Right button(s) */}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => { setStep(prev => (prev + 1) as Step); window.scrollTo(0, 0); }}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-[#C9A84C] hover:bg-[#8B6914] text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md"
            >
              Continue <ArrowRight size={15} strokeWidth={2} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-[#E7E5E4] hover:bg-[#D6D3D1] disabled:opacity-60 text-[#1C1917] text-sm font-semibold transition-all"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="flex-[2] h-11 flex items-center justify-center gap-2 rounded-lg bg-[#C9A84C] hover:bg-[#8B6914] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                {loading ? 'Publishing...' : <><CheckCircle size={15} strokeWidth={2} /> Publish Listing</>}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
