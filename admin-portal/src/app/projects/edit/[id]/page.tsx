"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, CheckCircle, Plus, X, Upload,
  FileText, GripVertical, Star, StarOff, ArrowRight
} from 'lucide-react';

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

const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white/50 px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-sm font-medium leading-none text-[#78716C]";

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
        const res = await fetch('http://localhost:3001/admin/projects?includeArchived=true', {
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
      const res = await fetch(`http://localhost:3001/admin/projects/${id}`, {
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

  const progress = (step / 3) * 100;

  if (initialLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#78716C] text-sm font-medium">Loading project...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition-colors">
            <ChevronLeft size={16} /> Cancel
          </button>
          <h1 className="text-sm font-semibold text-[#1C1917]">Edit Listing</h1>
          <div className="w-16" />
        </div>

        {/* Stepper */}
        <div className="max-w-xl mx-auto px-6 pb-4">
          <div className="flex items-center justify-center gap-3">
            {stepLabels.map(({ n, label }, idx) => (
              <div key={n} className="flex items-center gap-3">
                <button
                  onClick={() => n < step && setStep(n)}
                  disabled={n > step}
                  className={`group relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500 disabled:cursor-not-allowed ${
                    n < step ? 'bg-[#16A34A] text-white' :
                    n === step ? 'bg-[#1C1917] text-white shadow-[0_0_20px_-5px_rgba(0,0,0,0.25)]' :
                    'bg-[#E7E5E4]/60 text-[#A8A29E]'
                  }`}
                >
                  {n < step ? <CheckCircle size={16} strokeWidth={2.5} /> : <span className="text-sm font-medium tabular-nums">{n}</span>}
                  {n === step && <div className="absolute inset-0 rounded-full bg-[#1C1917]/20 blur-md animate-pulse" />}
                </button>
                <span className={`text-xs font-medium hidden sm:block ${n === step ? 'text-[#1C1917]' : 'text-[#A8A29E]'}`}>{label}</span>
                {idx < stepLabels.length - 1 && (
                  <div className="relative h-[1.5px] w-12">
                    <div className="absolute inset-0 bg-[#E7E5E4]" />
                    <div className="absolute inset-0 bg-[#1C1917]/30 transition-all duration-700 ease-out origin-left" style={{ transform: `scaleX(${n < step ? 1 : 0})` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-full bg-[#E7E5E4]/40 h-[2px]">
            <div className="h-full bg-gradient-to-r from-[#1C1917]/60 to-[#1C1917] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-xl mx-auto w-full px-6 py-8">

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium flex items-center gap-2">
            <X size={15} /> {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Banner Images <span className="text-red-500">*</span></label>
                <span className="text-xs text-[#A8A29E]">{bannerImages.length}/3</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map(idx => {
                  const banner = bannerImages[idx];
                  return (
                    <div key={idx} className={`relative rounded-xl border-2 transition-all overflow-hidden ${banner?.isCover ? 'border-[#C9A84C]' : 'border-[#E7E5E4]'}`} style={{ minHeight: 96 }}>
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
                        <label className="flex flex-col items-center justify-center h-full min-h-[92px] cursor-pointer hover:bg-[#F5F3EF] transition-colors">
                          <Upload size={16} className="text-[#A8A29E] mb-1" />
                          <span className="text-[10px] text-[#A8A29E] font-medium">Slot {idx + 1}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addBannerImage(f); }} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Project Name <span className="text-red-500">*</span></label>
              <input name="projectName" value={formData.projectName} onChange={handleTextChange} className={inputClass} />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Location <span className="text-red-500">*</span></label>
              <input name="location" value={formData.location} onChange={handleTextChange} className={inputClass} />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Starting Price <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#78716C]">₹</span>
                <input name="price" value={formData.price} onChange={handleTextChange} className={`${inputClass} pl-8`} />
              </div>
            </div>

          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            <div className="space-y-2">
              <label className={labelClass}>Overview <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Bedrooms *</span><input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleTextChange} className={inputClass} /></div>
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Bathrooms</span><input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleTextChange} className={inputClass} /></div>
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Carpet Area *</span><input name="area" value={formData.area} onChange={handleTextChange} className={inputClass} /></div>
                <div className="space-y-1.5"><span className="text-xs text-[#A8A29E]">Furnishing</span>
                  <select name="furnishing" value={formData.furnishing} onChange={handleTextChange} className={inputClass}>
                    <option value="Unfurnished">Unfurnished</option><option value="Semi-Furnished">Semi-Furnished</option><option value="Furnished">Fully Furnished</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Project Status</label>
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

            <div className="space-y-2">
              <label className={labelClass}>Description <span className="text-red-500">*</span></label>
              <textarea name="description" value={formData.description} onChange={handleTextChange} rows={4} className={`${inputClass} resize-none`} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Community Amenities</label>
                <button type="button" onClick={addCommunity} className="flex items-center gap-1 text-xs font-semibold text-[#C9A84C] hover:text-[#8B6914] transition-colors"><Plus size={12} /> Add</button>
              </div>
              <div className="space-y-2">
                {communityAmenities.map((am, idx) => (
                  <div key={am.id} draggable onDragStart={() => onCommDragStart(idx)} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => onCommDrop(idx)}
                    className={`flex items-center gap-2 rounded-xl bg-[#FAFAF8] p-3 border border-[#E7E5E4] ${commDragIdx === idx ? 'opacity-50' : ''}`}>
                    <GripVertical size={13} className="text-[#A8A29E] cursor-grab shrink-0" />
                    <input value={am.name} onChange={e => updateCommunity(idx, 'name', e.target.value)} className="flex-1 bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 outline-none transition-all" />
                    <input type="file" accept="image/*" className="hidden" id={`comm-${am.id}`} onChange={e => updateCommunity(idx, 'imageFile', e.target.files?.[0] || null)} />
                    <label htmlFor={`comm-${am.id}`} className="flex items-center gap-1.5 border border-[#E7E5E4] rounded-lg px-3 py-2 text-xs font-medium text-[#78716C] cursor-pointer hover:border-[#C9A84C] transition-colors whitespace-nowrap">
                      {am.imageFile ? <><CheckCircle size={10} className="text-[#C9A84C]" /> Uploaded</> : am.existingUrl ? <><CheckCircle size={10} className="text-[#16A34A]" /> Has Image</> : <><Upload size={10} /> Image</>}
                    </label>
                    {communityAmenities.length > 1 && <button onClick={() => removeCommunity(idx)} className="p-1.5 text-[#A8A29E] hover:text-red-500 transition-colors shrink-0"><X size={13} /></button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelClass}>Property Amenities</label>
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            <div className="space-y-3">
              <label className={labelClass}>Nearby Places</label>
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

            <div className="space-y-2">
              <label className={labelClass}>Location Map Embed Link</label>
              <input name="locationIframe" value={formData.locationIframe} onChange={handleTextChange} className={inputClass} placeholder="https://www.google.com/maps/embed?pb=..." />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Project Brochure (PDF)</label>
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

        {/* Navigation */}
        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={step < 3 ? () => { setStep((prev => prev + 1) as Step); window.scrollTo(0, 0); } : handleSubmit}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#1C1917] hover:bg-[#2D2926] disabled:opacity-60 text-white text-sm font-medium transition-all hover:shadow-lg"
          >
            {loading ? 'Saving...' : step < 3 ? <>Continue <ArrowRight size={15} strokeWidth={2} /></> : <>Save Changes <ArrowRight size={15} strokeWidth={2} /></>}
          </button>
          {step > 1 && (
            <button type="button" onClick={() => { setStep((prev => prev - 1) as Step); window.scrollTo(0, 0); }}
              className="w-full text-center text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">
              Go back
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
