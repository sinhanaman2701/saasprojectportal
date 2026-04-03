"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BedDouble, Square, Bath,
  Armchair, MapPin, Download, Eye, Phone, MessageCircle,
  Hospital, GraduationCap, ShoppingCart, Plane, Train,
  Archive, Pencil, CheckCircle, X, ChevronRight, ChevronLeft as ChevronLeftIcon,
  FileText
} from 'lucide-react';
import Header from '@/components/Header';

export default function ProjectDetail() {
  const { projectname } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Get banner images array from admin API response (bannerImages is a JSON string)
  const bannerImages: string[] = [];
  if (project?.bannerImages) {
    try {
      const parsed = typeof project.bannerImages === 'string'
        ? JSON.parse(project.bannerImages)
        : project.bannerImages;
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((b: any) => bannerImages.push(b.url));
      } else if (project.coverImageUrl) {
        bannerImages.push(project.coverImageUrl);
      }
    } catch {
      if (project.coverImageUrl) bannerImages.push(project.coverImageUrl);
    }
  } else if (project?.coverImageUrl) {
    bannerImages.push(project.coverImageUrl);
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'hospital': return <Hospital size={20} />;
      case 'school': return <GraduationCap size={20} />;
      case 'shopping mall': return <ShoppingCart size={20} />;
      case 'airport': return <Plane size={20} />;
      case 'railway station': return <Train size={20} />;
      default: return <MapPin size={20} />;
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archive "${project.projectName}"? It will be removed from the live catalog.`)) return;
    const res = await fetch(`http://localhost:3002/admin/projects/${project.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    });
    if (res.ok) router.push('/dashboard');
    else alert('Failed to archive. Check permissions.');
  };

  const handleUnarchive = async () => {
    if (!confirm(`Restore "${project.projectName}" to the live catalog?`)) return;
    const res = await fetch(`http://localhost:3002/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
      body: JSON.stringify({ isArchived: false })
    });
    if (res.ok) router.push('/dashboard');
    else alert('Failed to restore.');
  };

  const handleMakeLive = async () => {
    if (!confirm(`Publish "${project.projectName}" live to the catalog?`)) return;
    const res = await fetch(`http://localhost:3002/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
      body: JSON.stringify({ isDraft: false })
    });
    if (res.ok) router.push('/dashboard');
    else alert('Failed to publish.');
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch('http://localhost:3002/admin/projects?includeArchived=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const decoded = decodeURIComponent(projectname as string).toLowerCase().trim();
        const found = data.response_data.find((p: any) => p.projectName.toLowerCase().trim() === decoded);
        setProject(found);
      });
  }, [projectname]);

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#78716C] text-sm font-medium">Loading project...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      <Header />

      {/* ── Hero Banner Carousel ── */}
      <div className="relative w-full h-64 md:h-80 bg-[#F5F3EF] overflow-hidden">
        {bannerImages.length > 0 ? (
          <>
            <img
              src={bannerImages[activeBannerIdx]}
              alt={`${project.projectName} - ${activeBannerIdx + 1}`}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
            {bannerImages.length > 1 && (
              <>
                <button
                  onClick={() => setActiveBannerIdx(prev => (prev - 1 + bannerImages.length) % bannerImages.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all"
                >
                  <ChevronLeftIcon size={18} className="text-[#1C1917]" />
                </button>
                <button
                  onClick={() => setActiveBannerIdx(prev => (prev + 1) % bannerImages.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all"
                >
                  <ChevronRight size={18} className="text-[#1C1917]" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {bannerImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBannerIdx(idx)}
                      className={`rounded-full transition-all ${idx === activeBannerIdx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-black/40 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {activeBannerIdx + 1}/{bannerImages.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#A8A29E] text-sm font-medium">No Images</div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Status badge */}
        <div className="absolute top-5 left-6">
          {project.isDraft ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#E7E5E4] text-[#1C1917] shadow">
              <Pencil size={12} /> Draft
            </span>
          ) : project.isArchived ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-600 text-white shadow">
              <Archive size={12} /> Archived
            </span>
          ) : project.projectStatus === 'LATEST' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#C9A84C] text-white shadow">
              New Launch
            </span>
          ) : project.projectStatus === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-600 text-white shadow">
              <CheckCircle size={12} /> Ready to Move
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 text-[#1C1917] shadow">
              Ongoing
            </span>
          )}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main Left — Single Section ── */}
          <div className="flex-1 min-w-0">

            {/* Project Title */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#1C1917] tracking-tight mb-3">
                {project.projectName}
              </h1>
              <div className="flex items-center gap-2 text-[#78716C]">
                <MapPin size={16} className="shrink-0" />
                <span className="text-base font-medium">{project.location}</span>
              </div>
            </div>

            {/* ── Key Specs Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: BedDouble, label: 'Bedrooms', value: `${project.bedrooms || '—'} BHK` },
                { icon: Square, label: 'Area', value: project.area || '—' },
                { icon: Armchair, label: 'Furnishing', value: project.furnishing || '—' },
                { icon: Bath, label: 'Bathrooms', value: project.bathrooms || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E7E5E4] p-5 text-center shadow-sm">
                  <div className="w-10 h-10 bg-[#F5F3EF] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon size={18} className="text-[#C9A84C]" />
                  </div>
                  <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-base font-bold text-[#1C1917]">{value}</p>
                </div>
              ))}
            </div>

            {/* ── Description ── */}
            {project.description && (
              <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 shadow-sm mb-8">
                <h3 className="text-sm font-bold text-[#A8A29E] uppercase tracking-wider mb-4">Description</h3>
                <p className="text-[#78716C] leading-relaxed text-base whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            {/* ── Community Amenities ── */}
            {project.communityAmenities && project.communityAmenities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1C1917] mb-5">Community Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {project.communityAmenities.map((am: any) => (
                    <div key={am.id} className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden shadow-sm group hover:shadow-md transition-all">
                      <div className="h-36 bg-[#F5F3EF] overflow-hidden">
                        {am.imageUrl ? (
                          <img
                            src={am.imageUrl}
                            alt={am.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#A8A29E] text-sm">No Image</div>
                        )}
                      </div>
                      <div className="p-3.5 text-center">
                        <span className="text-sm font-semibold text-[#1C1917]">{am.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Property Amenities ── */}
            {project.propertyAmenities && project.propertyAmenities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1C1917] mb-5">Property Amenities</h3>
                <div className="flex flex-wrap gap-3">
                  {project.propertyAmenities.map((am: any) => (
                    <div key={am.id} className="flex items-center gap-2.5 bg-white border border-[#E7E5E4] rounded-full px-4 py-2.5 shadow-sm">
                      <div className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                      <span className="text-sm font-semibold text-[#1C1917]">{am.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Nearby Places ── */}
            {project.nearbyPlaces && project.nearbyPlaces.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1C1917] mb-5">Nearby Places</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.nearbyPlaces.map((place: any) => (
                    <div key={place.id} className="flex items-center gap-4 bg-white border border-[#E7E5E4] rounded-xl p-4 shadow-sm">
                      <div className="w-11 h-11 bg-[#F5F3EF] rounded-full flex items-center justify-center text-[#C9A84C] shrink-0">
                        {getCategoryIcon(place.category)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">{place.category}</p>
                        <p className="text-lg font-extrabold text-[#1C1917]">{place.distanceKm} km</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Location Map ── */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#1C1917] mb-4">Project Location</h3>
              <div className="h-[420px] rounded-xl overflow-hidden border border-[#E7E5E4] shadow-sm">
                <iframe
                  src={project.locationIframe || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15129.567439545!2d73.7402!3d18.5913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bb08e1ec26a3%3A0x7d025b3a4a1d6368!2sHinjewadi%2C%20Pune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              {project.location && (
                <p className="mt-3 text-sm text-[#78716C] font-medium flex items-center gap-2">
                  <MapPin size={14} className="text-[#C9A84C]" />
                  {project.location}
                </p>
              )}
            </div>

            {/* ── Brochure ── */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#1C1917] mb-4">Project Brochure</h3>
              {project.project_brochure ? (
                <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden shadow-sm">
                  <div className="h-72 bg-[#F5F3EF] flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 bg-[#F0E6C8] rounded-full flex items-center justify-center">
                      <FileText size={24} className="text-[#C9A84C]" />
                    </div>
                    <p className="text-sm font-semibold text-[#78716C]">PDF Brochure Available</p>
                  </div>
                  <div className="p-6 flex flex-col sm:flex-row gap-3">
                    <a
                      href={project.project_brochure}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2.5 bg-[#1C1917] hover:bg-[#2D2926] text-white py-3 rounded-xl font-semibold text-sm transition-all"
                    >
                      <Eye size={16} /> View Brochure
                    </a>
                    <a
                      href={project.project_brochure}
                      download
                      className="flex-1 flex items-center justify-center gap-2.5 bg-white border-2 border-[#E7E5E4] hover:border-[#C9A84C] text-[#1C1917] py-3 rounded-xl font-semibold text-sm transition-all"
                    >
                      <Download size={16} /> Download PDF
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-[#E7E5E4]">
                  <div className="w-14 h-14 bg-[#F5F3EF] rounded-full flex items-center justify-center mb-4">
                    <X size={22} className="text-[#A8A29E]" />
                  </div>
                  <p className="text-[#78716C] font-medium">No brochure has been uploaded for this project.</p>
                </div>
              )}
            </div>

          </div>

          {/* ── Right Sidebar ── */}
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-20 bg-white rounded-xl border border-[#E7E5E4] shadow-md overflow-hidden">

              {/* Price Header */}
              <div className="p-6 border-b border-[#E7E5E4]">
                <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-1">Starting Price</p>
                <p className="text-3xl font-extrabold text-[#C9A84C]">
                  {project.price || 'On Request'}
                </p>
              </div>

              {/* Quick Specs */}
              <div className="p-5 border-b border-[#E7E5E4] space-y-3">
                {[
                  { label: 'Bedrooms', value: `${project.bedrooms || '—'} BHK` },
                  { label: 'Area', value: project.area || '—' },
                  { label: 'Furnishing', value: project.furnishing || '—' },
                  { label: 'Bathrooms', value: project.bathrooms || '—' },
                  { label: 'Location', value: project.location || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-[#A8A29E] font-medium">{label}</span>
                    <span className="font-semibold text-[#1C1917]">{value}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="p-5 space-y-3">
                <button className="w-full flex items-center justify-center gap-2.5 bg-[#C9A84C] hover:bg-[#8B6914] text-white py-3.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all">
                  <MessageCircle size={16} /> Enquire Now
                </button>
                <button className="w-full flex items-center justify-center gap-2.5 bg-white border-2 border-[#E7E5E4] hover:border-[#C9A84C] text-[#1C1917] py-3.5 rounded-xl font-bold text-sm transition-all">
                  <Phone size={16} /> Refer
                </button>
              </div>

              {/* Admin Actions */}
              <div className="p-5 border-t border-[#E7E5E4] space-y-2.5">
                <button
                  onClick={() => router.push(`/projects/edit/${project.id}`)}
                  className="w-full flex items-center justify-center gap-2 bg-[#1C1917] hover:bg-[#2D2926] text-white py-3 rounded-xl font-semibold text-sm transition-all"
                >
                  <Pencil size={14} /> Edit Listing
                </button>
                {project.isDraft ? (
                  <button
                    onClick={handleMakeLive}
                    className="w-full flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803d] text-white py-3 rounded-xl font-semibold text-sm transition-all"
                  >
                    <CheckCircle size={14} /> Make Live
                  </button>
                ) : project.isArchived ? (
                  <button
                    onClick={handleUnarchive}
                    className="w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-3 rounded-xl font-semibold text-sm transition-all"
                  >
                    Restore Project
                  </button>
                ) : (
                  <button
                    onClick={handleArchive}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-semibold text-sm transition-all"
                  >
                    <Archive size={14} /> Archive Project
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
