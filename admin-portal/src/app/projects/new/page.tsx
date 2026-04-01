"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectV4() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Core Parameters
  const [formData, setFormData] = useState({
    projectName: '', description: '', location: '', bedrooms: '', 
    bathrooms: '', price: '', furnishing: 'Unfurnished', floor: '', area: '', 
    locationIframe: '', projectStatus: 'ONGOING'
  });

  // Physical Binary States
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [attachmentsFiles, setAttachmentsFiles] = useState<File[]>([]);
  
  // Dynamic Binary Sub-Arrays
  const [communityAmenities, setCommunityAmenities] = useState([
    { name: "Swimming Pool", imageFile: null as File | null },
    { name: "Kids Play Area", imageFile: null as File | null }
  ]);
  
  const [propertyAmenities, setPropertyAmenities] = useState([
    { name: "CCTV Cameras" },
    { name: "Reserved Parking" }
  ]);
  
  const [nearbyPlaces, setNearbyPlaces] = useState([
    { category: "Hospital", distanceKm: "" },
    { category: "School", distanceKm: "" },
    { category: "Shopping Mall", distanceKm: "" },
    { category: "Airport", distanceKm: "" },
    { category: "Railway Station", distanceKm: "" }
  ]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachmentsFiles(Array.from(e.target.files));
  };

  const updateCommunity = (idx: number, field: 'name'|'imageFile', val: any) => {
    const arr = [...communityAmenities];
    if (field === 'name') arr[idx].name = val;
    else arr[idx].imageFile = val;
    setCommunityAmenities(arr);
  };

  const updatePropertyAmenity = (idx: number, field: 'name', val: any) => {
    const arr = [...propertyAmenities];
    arr[idx].name = val;
    setPropertyAmenities(arr);
  };

  const updateNearby = (idx: number, field: 'distanceKm', val: any) => {
    const arr = [...nearbyPlaces];
    arr[idx].distanceKm = val;
    setNearbyPlaces(arr);
  };

  const validateMandatoryFields = () => {
    for (const [key, value] of Object.entries(formData)) {
      if (!value.trim()) return `The base field '${key}' is explicitly mandatory.`;
    }
    if (!brochureFile) return `The Official Brochure PDF Upload is mandatory.`;
    if (!thumbnailFile) return `The Tile Thumbnail Image is mandatory to render the catalog.`;
    if (attachmentsFiles.length === 0) return `At least one physical Gallery Attachment must be uploaded.`;

    for (const item of communityAmenities) {
      if (!item.name.trim() || !item.imageFile) return `All Community Amenities must completely possess both a Name and an uploaded Image File.`;
    }
    for (const item of propertyAmenities) {
      if (!item.name.trim()) return `All Property Amenities must explicitly possess a Name.`;
    }
    for (const item of nearbyPlaces) {
      if (!item.distanceKm.trim()) return `All Nearby Places must explicitly specify a distance (Km).`;
    }
    return null; 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationAlert = validateMandatoryFields();
    if (validationAlert) {
      setError(validationAlert);
      window.scrollTo(0,0);
      return;
    }

    setLoading(true);
    const formPayload = new FormData();
    
    Object.entries(formData).forEach(([key, val]) => {
      if (key === 'price' && val.trim() !== '') {
        formPayload.append(key, `₹ ${val}`);
      } else {
        formPayload.append(key, val as Blob | string);
      }
    });
    
    // Core Files
    formPayload.append('brochure', brochureFile as Blob);
    formPayload.append('thumbnail', thumbnailFile as Blob);
    attachmentsFiles.forEach(file => formPayload.append('attachments', file));

    // Array Structural Mappings (Sending names text JSON, mapping files separately via dynamic keys)
    const cleanCommunity = communityAmenities.map(am => ({ name: am.name }));
    formPayload.append('communityAmenities', JSON.stringify(cleanCommunity));
    communityAmenities.forEach((am, idx) => {
      if (am.imageFile) formPayload.append(`communityImage_${idx}`, am.imageFile);
    });

    const cleanProperty = propertyAmenities.map(am => ({ name: am.name }));
    formPayload.append('propertyAmenities', JSON.stringify(cleanProperty));

    const cleanNearby = nearbyPlaces.map(n => ({ category: n.category, distanceKm: parseFloat(n.distanceKm) }));
    formPayload.append('nearbyPlaces', JSON.stringify(cleanNearby));

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('http://localhost:3001/admin/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formPayload
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.status_message || 'Matrix failure during property injection.');
      }
    } catch (err) {
      setError('A fatal internal server timeout occurred posting legacy payloads.');
    } finally {
      setLoading(false);
    }
  };

  const SectionBreak = ({ title }: { title: string }) => (
    <div className="col-span-full mb-6 mt-10 pb-3 border-b border-[#D4AF37]/30 text-2xl font-extrabold text-[#1A1A1A] tracking-tight">{title}</div>
  );

  const inputClass = "w-full bg-[#FDFCF9] text-[#1A1A1A] border border-gray-200 focus:bg-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all rounded-xl p-3.5";

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex justify-center py-12 px-4 text-[#1A1A1A]">
      <div className="bg-white p-12 rounded-[2rem] shadow-xl w-full max-w-5xl border border-gray-100/50 relative overflow-hidden">
        
        {/* Decorative accent line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D4AF37] to-[#F2EDE4]"></div>

        <div className="flex justify-between items-center mb-10 pt-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">Publish Listing</h1>
            <p className="text-[#6B7280] font-medium text-lg">Provide comprehensive dataset properties to inject the matrix.</p>
          </div>
          <button type="button" onClick={() => router.push('/dashboard')} className="text-[#6B7280] font-bold hover:text-[#D4AF37] transition">Cancel</button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 shadow-sm border border-red-200 font-bold">Alert: {error}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <SectionBreak title="1. Basic Property Details" />
          
          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Project Name</label><input name="projectName" value={formData.projectName} onChange={handleTextChange} className={inputClass} placeholder="e.g. Canvas by Kolte Patil" /></div>
          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Location Text</label><input name="location" value={formData.location} onChange={handleTextChange} className={inputClass} placeholder="e.g. Pune City" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Detailed Description</label><textarea name="description" value={formData.description} onChange={handleTextChange} rows={4} className={inputClass} /></div>
          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Google Maps Iframe URL</label><input name="locationIframe" value={formData.locationIframe} onChange={handleTextChange} className={inputClass} placeholder="https://google.com/maps/embed?..." /></div>
          <div>
            <label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Project Status Phase</label>
            <select name="projectStatus" value={formData.projectStatus} onChange={handleTextChange} className={inputClass}>
              <option value="ONGOING">Ongoing Phase</option>
              <option value="LATEST">Latest Launch</option>
              <option value="COMPLETED">Completed Ready to Move</option>
            </select>
          </div>

          <SectionBreak title="2. Property Configuration" />

          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Bedrooms</label><input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleTextChange} className={inputClass} placeholder="e.g. 3" /></div>
          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Bathrooms</label><input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleTextChange} className={inputClass} placeholder="e.g. 2" /></div>
          <div>
            <label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Starting Price</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#1A1A1A] font-bold text-lg">₹</span>
              <input name="price" value={formData.price} onChange={handleTextChange} className={`${inputClass} !pl-9`} placeholder="82 Lacs" />
            </div>
          </div>
          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Carpet Area</label><input name="area" value={formData.area} onChange={handleTextChange} className={inputClass} placeholder="e.g. 1200 Sqft" /></div>
          <div><label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Floor Level</label><input name="floor" value={formData.floor} onChange={handleTextChange} className={inputClass} placeholder="e.g. 2nd Floor" /></div>
          <div>
            <label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Furnishing Status</label>
            <select name="furnishing" value={formData.furnishing} onChange={handleTextChange} className={inputClass}>
              <option value="Unfurnished">Unfurnished</option>
              <option value="Semi-Furnished">Semi-Furnished</option>
              <option value="Furnished">Fully Furnished</option>
            </select>
          </div>

          <SectionBreak title="3. Media & Attachments" />

          <div>
            <label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Banner Thumbnail Image</label>
            <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className={`${inputClass} !p-2 bg-white`} />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Official Brochure Upload (.pdf)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setBrochureFile(e.target.files?.[0] || null)} className={`${inputClass} !p-2 bg-white`} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Image Gallery (Multiple Files)</label>
            <input type="file" accept="image/*" multiple onChange={handleAttachments} className={`${inputClass} !p-2 bg-white`} />
            <p className="text-sm text-[#D4AF37] font-bold mt-2">{attachmentsFiles.length} files staged for upload.</p>
          </div>

          <SectionBreak title="4. Location & Amenities" />

          <div className="md:col-span-2 bg-[#FDFCF9] p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Community Amenities</h3>
            {communityAmenities.map((am, idx) => (
              <div key={idx} className="flex gap-4 mb-3">
                <input value={am.name} onChange={(e) => updateCommunity(idx, 'name', e.target.value)} className="w-1/3 bg-white border border-gray-200 focus:border-[#D4AF37] outline-none p-3 rounded-xl font-bold transition" placeholder="Name" />
                <input type="file" accept="image/*" onChange={(e) => updateCommunity(idx, 'imageFile', e.target.files?.[0] || null)} className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-sm" />
              </div>
            ))}
            <button type="button" onClick={() => setCommunityAmenities([...communityAmenities, {name: '', imageFile: null}])} className="text-[#D4AF37] font-bold text-sm mt-3 hover:underline">+ Add Extraneous Amenity</button>
          </div>

          <div className="md:col-span-2 bg-[#FDFCF9] p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Property Amenities</h3>
            {propertyAmenities.map((am, idx) => (
              <div key={idx} className="flex gap-4 mb-3">
                <input value={am.name} onChange={(e) => updatePropertyAmenity(idx, 'name', e.target.value)} className="w-full bg-white border border-gray-200 focus:border-[#D4AF37] outline-none p-3 rounded-xl font-bold transition" placeholder="Property Amenity Name (e.g., CCTV)" />
              </div>
            ))}
            <button type="button" onClick={() => setPropertyAmenities([...propertyAmenities, {name: ''}])} className="text-[#D4AF37] font-bold text-sm mt-3 hover:underline">+ Attach Physical Sub-amenity</button>
          </div>

          <div className="md:col-span-2 bg-[#FDFCF9] p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Nearby Places Matrix</h3>
            <div className="grid grid-cols-[1fr_120px] gap-4 mb-3 px-2">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Category</span>
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-widest text-center">Distance (Km)</span>
            </div>
            {nearbyPlaces.map((pl, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px] gap-4 mb-3">
                <input disabled className="bg-gray-100 text-[#6B7280] border border-gray-200 p-3 rounded-xl font-bold" value={pl.category} />
                <input placeholder="2.5" value={pl.distanceKm} onChange={(e) => updateNearby(idx, 'distanceKm', e.target.value)} className="bg-white border border-gray-200 focus:border-[#D4AF37] outline-none p-3 rounded-xl text-center font-bold transition" />
              </div>
            ))}
          </div>

          <div className="col-span-full pt-10 mt-6 border-t border-gray-100">
            <button type="submit" disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#B8962F] text-white p-5 rounded-2xl font-extrabold text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              {loading ? 'Executing Central Matrix Insertion...' : 'Initiate Secure Upload & Publish'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
