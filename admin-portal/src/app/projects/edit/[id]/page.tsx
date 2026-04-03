"use client";
import React, { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, CheckCircle, Plus, X, Upload,
  FileText, GripVertical, Star, StarOff, ArrowRight
} from 'lucide-react';

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
  existingUrl?: string;
};

const DEFAULT_PROPERTY_AMENITIES = [
  'CCTV Cameras', 'Reserved Parking', '24/7 Security', 'Power Backup', 'Lift',
  'Gym', 'Swimming Pool', 'Garden', 'Club House', 'Children Play Area',
];

const DEFAULT_NEARBY_PLACES = [
  'Hospital', 'School', 'Shopping Mall', 'Airport', 'Railway Station',
  'Metro Station', 'Bus Stand', 'Bank', 'Pharmacy', 'Restaurant',
];

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-sm font-medium leading-none text-[#78716C]";
const sectionTitleClass = "text-base font-bold text-[#1C1917]";

const stepLabels = [
  { n: 1 as Step, label: 'Property Info' },
  { n: 2 as Step, label: 'Details' },
  { n: 3 as Step, label: 'Location & Attachments' },
];

interface EditProjectProps { params: Promise<{ id: string }>; }

export default function EditProjectPage({ params }: EditProjectProps) {
  const { id } = use(params);
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    projectName: '', location: '', price: '',
    bedrooms: '', bathrooms: '', area: '', furnishing: 'Unfurnished',
    description: '', locationIframe: '', projectStatus: 'ONGOING',
  });
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [communityAmenities, setCommunityAmenities] = useState<CommunityAmenity[]>([]);
  const [selectedPropertyAmenities, setSelectedPropertyAmenities] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState(
    DEFAULT_NEARBY_PLACES.map(cat => ({ id: Math.random().toString(36).slice(2), category: cat, distance: '', unit: 'km' as 'km' | 'm' }))
  );
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [existingBrochure, setExistingBrochure] = useState('');

  const [commDragIdx, setCommDragIdx] = useState<number | null>(null);
  const [propDragIdx, setPropDragIdx] = useState<number | null>(null);
  const [nearbyDragIdx, setNearbyDragIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch('http://localhost:3002/admin/projects?includeArchived=true', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await res.json();
        const project = data.response_data.find((p: any) => p.id === parseInt(id));
        if (!project) { setError('Project not found.'); setInitialLoading(false); return; }

        setFormData({
          projectName: project.projectName || '',
          location: project.location || '',
          price: (project.price || '').replace('₹ ', ''),
          bedrooms: project.bedrooms?.toString() || '',
          bathrooms: project.bathrooms?.toString() || '',
          area: project.area || '',
          furnishing: project.furnishing || 'Unfurnished',
          description: project.description || '',
          locationIframe: project.locationIframe || '',
          projectStatus: project.projectStatus || 'ONGOING',
        });

        // Banner images
        const bannerRaw = project.bannerImages;
        const bannerArr: any[] = typeof bannerRaw === 'string' ? JSON.parse(bannerRaw || '[]') : (bannerRaw || []);
        const banners: BannerImage[] = bannerArr.map((b: any) => ({
          id: Math.random().toString(36).slice(2), file: null, url: b.url, isCover: b.isCover,
        }));
        if (banners.length === 0 && project.coverImageUrl) {
          banners.push({ id: Math.random().toString(36).slice(2), file: null, url: project.coverImageUrl, isCover: true });
        }
        setBannerImages(banners);

        // Community amenities
        setCommunityAmenities((project.communityAmenities || []).map((am: any) => ({
          id: Math.random().toString(36).slice(2), name: am.name, imageFile: null, existingUrl: am.imageUrl,
        })));

        // Property amenities
        setSelectedPropertyAmenities((project.propertyAmenities || []).map((am: any) => am.name));

        // Nearby places
        const existingNearby = (project.nearbyPlaces || []).reduce((acc: any, pl: any) => { acc[pl.category] = pl.distanceKm; return acc; }, {});
        setNearbyPlaces(DEFAULT_NEARBY_PLACES.map(cat => {
          const distKm = existingNearby[cat];
          let distance = '', unit: 'km' | 'm' = 'km';
          if (distKm !== undefined) {
            if (distKm >= 1) { distance = distKm.toString(); unit = 'km'; }
            else { distance = (distKm * 1000).toFixed(0); unit = 'm'; }
          }
          return { id: Math.random().toString(36).slice(2), category: cat, distance, unit };
        }));

        setExistingBrochure(project.project_brochure || '');
      } catch { setError('Failed to load project data.'); }
      finally { setInitialLoading(false); }
    };
    fetchProject();
  }, [id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addBannerImage = (file: File) => {
    if (bannerImages.length >= 3) return;
    setBannerImages(prev => [...prev, { id: Math.random().toString(36).slice(2), file, url: URL.createObjectURL(file), isCover: prev.length === 0 }]);
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

  const toggleProperty = (name: string) => setSelectedPropertyAmenities(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const onPropDragStart = (idx: number) => setPropDragIdx(idx);
  const onPropDrop = (to: number) => {
    if (propDragIdx === null || propDragIdx === to) return;
    setSelectedPropertyAmenities(prev => arrayMove(prev, propDragIdx, to));
    setPropDragIdx(null);
  };

  const updateNearby = (idx: number, field: 'distance' | 'unit', val: string) => {
    const updated = [...nearbyPlaces];
    if (field === 'distance') updated[idx].distance = val;
    if (field === 'unit') updated[idx].unit = val as 'km' | 'm';
    setNearbyPlaces(updated);
  };
  const onNearbyDragStart = (idx: number) => setNearbyDragIdx(idx);
  const onNearbyDrop = (to: number) => {
    if (nearbyDragIdx === null || nearbyDragIdx === to) return;
    setNearbyPlaces(prev => arrayMove(prev, nearbyDragIdx, to));
    setNearbyDragIdx(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const formPayload = new FormData();
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

    const cleanNearby = nearbyPlaces.filter(p => p.category && p.distance.trim()).map(p => ({
      category: p.category, distance: p.distance, unit: p.unit,
    }));
    formPayload.append('nearbyPlaces', JSON.stringify(cleanNearby));

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`http://localhost:3002/admin/projects/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formPayload
      });
      const data = await res.json();
      if (res.ok) router.push('/dashboard');
      else setError(data.status_message || 'Failed to update project.');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (initialLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#78716C] text-sm font-medium">Loading project...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* ── Top Header (matching dashboard) ── */}
      <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Kolte Patil" className="h-8 w-auto object-contain" />
            <span className="hidden sm:inline text-[#A8A29E] text-sm font-medium border-l border-[#E7E5E4] pl-3 ml-1">Admin Portal</span>
          </div>
          <h1 className="text-base font-bold text-[#1C1917]">Edit Listing</h1>
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-sm font-medium text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF] px-3 py-2 rounded-lg transition-all">
            <ChevronLeft size={15} /> Cancel
          </button>
        </div>

        {/* ── Stepper (pill style) ── */}
        <div className="max-w-7xl mx-auto px-6 pb-5">
          <div className="flex items-center gap-2">
            {stepLabels.map(({ n, label }, idx) => (
              <React.Fragment key={n}>
                <button
                  onClick={() => n < step && setStep(n)}
                  disabled={n > step}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    n < step ? 'bg-[#16A34A] text-white border-[#16A34A] cursor-pointer' :
                    n === step ? 'bg-[#1C1917] text-white border-[#1C1917] cursor-default' :
                    'bg-white text-[#A8A29E] border-[#E7E5E4] cursor-not-allowed'
                  }`}
                >
                  {n < step ? <CheckCircle size={13} strokeWidth={2.5} /> : null}
                  <span>{label}</span>
                </button>
                {idx < stepLabels.length - 1 && (
                  <div className="flex-1 h-[2px] rounded-full bg-[#E7E5E4] overflow-hidden">
                    <div className="h-full bg-[#16A34A] transition-all duration-500 ease-out" style={{ width: `${n < step ? 100 : 0}%` }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* ── Form Body (full width, card layout) ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium flex items-center gap-2">
            <X size={15} /> {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Banner */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={sectionTitleClass}>Banner Images <span className="text-red-500">*</span></h2>
                <span className="text-xs text-[#A8A29E]">{bannerImages.length}/3</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map(idx => {
                  const banner = bannerImages[idx];
                  return (
                    <div key={idx} className={`relative rounded-xl border-2 transition-all overflow-hidden ${banner?.isCover ? 'border-[#C9A84C]' : 'border-[#E7E5E4]'}`} style={{ minHeight: 110 }}>
                      {banner ? (
                        <>
                          <img src={banner.url} alt={`Banner ${idx + 1}`} className="w-full h-24 object-cover" />
                          {banner.isCover && <div className="absolute top-1 left-1 bg-[#C9A84C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star size={7} /> Cover</div>}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-1.5 flex gap-1">
                            <button onClick={() => { const fi = bannerImages.findIndex(b => b.id === banner.id); if (fi > 0) moveBannerImage(fi, fi - 1); }} disabled={idx === 0} className="flex-1 bg-white/80 hover:bg-white text-[9px] font-bold rounded py-0.5 disabled:opacity-30">←</button>
                            <button onClick={() => { const fi = bannerImages.findIndex(b => b.id === banner.id); if (fi < bannerImages.length - 1) moveBannerImage(fi, fi + 1); }} disabled={idx === bannerImages.length - 1} className="flex-1 bg-white/80 hover:bg-white text-[9px] font-bold rounded py-0.5 disabled:opacity-30">→</button>
                            <button onClick={() => removeBannerImage(banner.id)} className="flex-1 bg-red-500/80 hover:bg-red-500 text-white text-[9px] font-bold rounded py-0.5">✕</button>
                          </div>
                          {!banner.isCover && <button onClick={() => setCoverImage(banner.id)} className="absolute top-1 right-1 bg-white/80 hover:bg-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><StarOff size={7} /> Cover</button>}
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-full min-h-[106px] cursor-pointer hover:bg-[#F5F3EF] transition-colors">
                          <Upload size={18} className="text-[#A8A29E] mb-1" />
                          <span className="text-[10px] text-[#A8A29E] font-medium">Slot {idx + 1}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addBannerImage(f); }} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-4">
              <h2 className={sectionTitleClass}>Basic Information</h2>
              <div className="space-y-4">
                <div className="space-y-1.5"><label className={labelClass}>Project Name <span className="text-red-500">*</span></label><input name="projectName" value={formData.projectName} onChange={handleTextChange} className={inputClass} placeholder="e.g. Canvas by Kolte Patil" /></div>
                <div className="space-y-1.5"><label className={labelClass}>Location <span className="text-red-500">*</span></label><input name="location" value={formData.location} onChange={handleTextChange} className={inputClass} placeholder="e.g. Hinjewadi, Pune" /></div>
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

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Overview */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-5">
              <h2 className={sectionTitleClass}>Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Bedrooms *</span><input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleTextChange} className={inputClass} placeholder="e.g. 3" /></div>
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Bathrooms</span><input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleTextChange} className={inputClass} placeholder="e.g. 2" /></div>
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Carpet Area *</span><input name="area" value={formData.area} onChange={handleTextChange} className={inputClass} placeholder="e.g. 1200 Sqft" /></div>
                <div className="space-y-1.5">
                  <span className="text-xs text-[#A8A29E]">Furnishing</span>
                  <select name="furnishing" value={formData.furnishing} onChange={handleTextChange} className={inputClass}>
                    <option value="Unfurnished">Unfurnished</option><option value="Semi-Furnished">Semi-Furnished</option><option value="Furnished">Fully Furnished</option>
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
                <button type="button" onClick={addCommunity} className="flex items-center gap-1 text-xs font-semibold text-[#C9A84C] hover:text-[#8B6914] transition-colors"><Plus size={12} /> Add</button>
              </div>
              <div className="space-y-2">
                {communityAmenities.map((am, idx) => (
                  <div key={am.id} draggable onDragStart={() => onCommDragStart(idx)} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => onCommDrop(idx)}
                    className={`flex items-center gap-2 rounded-xl bg-[#FAFAF8] p-3 border border-[#E7E5E4] ${commDragIdx === idx ? 'opacity-50' : ''}`}>
                    <GripVertical size={13} className="text-[#A8A29E] cursor-grab shrink-0" />
                    <input value={am.name} onChange={e => updateCommunity(idx, 'name', e.target.value)} className="flex-1 bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 outline-none transition-all" placeholder="Amenity name" />
                    <input type="file" accept="image/*" className="hidden" id={`comm-${am.id}`} onChange={e => updateCommunity(idx, 'imageFile', e.target.files?.[0] || null)} />
                    <label htmlFor={`comm-${am.id}`} className="flex items-center gap-1.5 border border-[#E7E5E4] rounded-lg px-3 py-2 text-xs font-medium text-[#78716C] cursor-pointer hover:border-[#C9A84C] transition-colors whitespace-nowrap">
                      {am.imageFile ? <><CheckCircle size={10} className="text-[#C9A84C]" /> Uploaded</> : am.existingUrl ? <><CheckCircle size={10} className="text-[#16A34A]" /> Has Image</> : <><Upload size={10} /> Image</>}
                    </label>
                    {communityAmenities.length > 1 && <button onClick={() => removeCommunity(idx)} className="p-1.5 text-[#A8A29E] hover:text-red-500 transition-colors shrink-0"><X size={13} /></button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Property Amenities */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Property Amenities</h2>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_PROPERTY_AMENITIES.map(name => {
                  const isSelected = selectedPropertyAmenities.includes(name);
                  const displayIdx = selectedPropertyAmenities.indexOf(name);
                  return (
                    <div key={name} draggable={isSelected} onDragStart={() => isSelected && onPropDragStart(displayIdx)} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => isSelected && onPropDrop(displayIdx)} onClick={() => toggleProperty(name)}
                      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border cursor-pointer transition-all ${isSelected ? 'bg-[#FBF8F0] border-[#C9A84C] text-[#1C1917]' : 'bg-white border-[#E7E5E4] text-[#A8A29E] hover:border-[#D6D3D1]'} ${isSelected && propDragIdx === displayIdx ? 'opacity-50' : ''}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-[#D6D3D1]'}`}>{isSelected && <CheckCircle size={9} className="text-white" />}</div>
                      <span className="text-sm font-medium flex-1 leading-tight">{name}</span>
                      {isSelected && <GripVertical size={11} className="text-[#C9A84C] shrink-0" />}
                    </div>
                  );
                })}
              </div>
              {selectedPropertyAmenities.length > 0 && <p className="text-xs text-[#A8A29E] italic">Display order: {selectedPropertyAmenities.join(' → ')}</p>}
            </div>

          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Nearby Places */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Nearby Places</h2>
              <div className="space-y-2">
                {nearbyPlaces.map((pl, idx) => (
                  <div key={pl.id} draggable onDragStart={() => onNearbyDragStart(idx)} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => onNearbyDrop(idx)}
                    className={`flex items-center gap-3 rounded-xl bg-[#FAFAF8] p-3 border border-[#E7E5E4] ${nearbyDragIdx === idx ? 'opacity-50' : ''}`}>
                    <GripVertical size={13} className="text-[#A8A29E] cursor-grab shrink-0" />
                    <span className="w-28 text-sm font-semibold text-[#78716C] shrink-0 truncate">{pl.category}</span>
                    <input type="number" step="0.1" value={pl.distance} onChange={e => updateNearby(idx, 'distance', e.target.value)} className="w-20 bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#1C1917] text-right focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 outline-none transition-all" placeholder="0" />
                    <div className="flex border border-[#E7E5E4] rounded-lg overflow-hidden shrink-0">
                      {(['km', 'm'] as const).map(u => (
                        <button key={u} type="button" onClick={() => updateNearby(idx, 'unit', u)} className={`px-3 py-2 text-xs font-bold transition-all ${pl.unit === u ? 'bg-[#1C1917] text-white' : 'bg-white text-[#78716C]'}`}>{u}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Map */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-2">
              <h2 className={sectionTitleClass}>Location Map Embed Link</h2>
              <input name="locationIframe" value={formData.locationIframe} onChange={handleTextChange} className={inputClass} placeholder="https://www.google.com/maps/embed?pb=..." />
            </div>

            {/* Brochure */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-3">
              <h2 className={sectionTitleClass}>Project Brochure (PDF)</h2>
              {existingBrochure && !brochureFile && <p className="text-xs text-[#A8A29E] mb-2">Current: {existingBrochure}</p>}
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${brochureFile ? 'border-[#C9A84C] bg-[#FBF8F0]' : 'border-[#E7E5E4]'}`}>
                <input type="file" accept="application/pdf" className="hidden" id="brochure-edit" onChange={e => setBrochureFile(e.target.files?.[0] || null)} />
                <label htmlFor="brochure-edit" className="cursor-pointer flex flex-col items-center gap-2">
                  {brochureFile ? (
                    <><div className="w-10 h-10 bg-[#F0E6C8] rounded-full flex items-center justify-center"><FileText size={20} className="text-[#C9A84C]" /></div><p className="text-sm font-semibold text-[#1C1917]">{brochureFile.name}</p><p className="text-xs text-[#A8A29E]">Click to replace</p></>
                  ) : (
                    <><Upload size={22} className="text-[#A8A29E]" /><p className="text-sm font-semibold text-[#78716C]">Click to upload PDF (optional)</p></>
                  )}
                </label>
              </div>
            </div>

          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button type="button" onClick={() => { setStep((prev => prev - 1) as Step); window.scrollTo(0, 0); }}
              className="px-6 h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F3EF] text-[#78716C] text-sm font-medium transition-all">
              <ChevronLeft size={15} /> Go back
            </button>
          )}
          <button
            type="button"
            onClick={step < 3 ? () => { setStep((prev => prev + 1) as Step); window.scrollTo(0, 0); } : handleSubmit}
            disabled={loading}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-[#C9A84C] hover:bg-[#8B6914] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            {loading ? 'Saving...' : step < 3 ? <>Continue <ArrowRight size={15} strokeWidth={2} /></> : <>Save Changes <ArrowRight size={15} strokeWidth={2} /></>}
          </button>
        </div>

      </div>
    </div>
  );
}
