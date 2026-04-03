"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, LogOut, Plus, Building2, Archive,
  TrendingUp, Search, LayoutGrid, List
} from 'lucide-react';

type Project = {
  id: number;
  projectName: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number | null;
  price: string;
  furnishing: string;
  area: string;
  bannerImages: string;
  coverImageUrl: string | null;
  locationIframe: string | null;
  projectStatus: string;
  isActive: boolean;
  isArchived: boolean;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  communityAmenities: { id: number; name: string; imageUrl: string | null }[];
  propertyAmenities: { id: number; name: string; iconUrl: string | null }[];
  nearbyPlaces: { id: number; category: string; distanceKm: number; iconUrl: string | null }[];
};

type Filter = 'ALL' | 'ACTIVE' | 'ARCHIVED';
type StatusFilter = 'ALL' | 'ONGOING' | 'LATEST' | 'COMPLETED';

export default function DashboardCatalog() {
  const [properties, setProperties] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const router = useRouter();

  useEffect(() => {
    const includeArchived = activeFilter === 'ARCHIVED' ? 'true' : 'false';
    const token = localStorage.getItem('adminToken');
    fetch(`http://localhost:3001/admin/projects?includeArchived=${includeArchived}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const projects: Project[] = data.response_data || [];
        setProperties(projects);
        setFiltered(projects);
      })
      .catch(console.error);
  }, [activeFilter]);

  useEffect(() => {
    let result = properties;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.projectName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.projectStatus === statusFilter);
    }

    setFiltered(result);
  }, [search, properties, statusFilter]);

  const statusBadge = (p: Project) => {
    if (p.isArchived) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100"><Archive size={11} />Archived</span>;
    if (p.projectStatus === 'LATEST') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F0E6C8] text-[#8B6914] border border-[#E8D9A8]"><TrendingUp size={11} />Latest</span>;
    if (p.projectStatus === 'COMPLETED') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-green-700 border border-green-200">Completed</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F0E6C8] text-[#8B6914] border border-[#E8D9A8]">Ongoing</span>;
  };

  const filterPills: { label: string; value: Filter }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* ── Top Header ── */}
      <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Kolte Patil" className="h-8 w-auto object-contain" />
            <span className="hidden sm:inline text-[#A8A29E] text-sm font-medium border-l border-[#E7E5E4] pl-3 ml-1">Admin Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { localStorage.clear(); router.push('/'); }}
              className="flex items-center gap-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF] px-3 py-2 rounded-lg transition-all"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={() => router.push('/projects/new')}
              className="flex items-center gap-2 bg-[#C9A84C] hover:bg-[#8B6914] text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={16} />
              <span>Publish Listing</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Page Title ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1C1917] tracking-tight">Project Catalog</h1>
          <p className="text-[#78716C] mt-1">Manage and curate your real estate listings.</p>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">

          {/* Archive Pills */}
          <div className="flex flex-wrap gap-2">
            {filterPills.map(pill => (
              <button
                key={pill.value}
                onClick={() => setActiveFilter(pill.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  activeFilter === pill.value
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-white text-[#78716C] border-[#E7E5E4] hover:border-[#D6D3D1] hover:text-[#1C1917]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Right: Status + Search + View Toggle */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="pl-9 pr-4 py-2.5 bg-white border border-[#E7E5E4] rounded-lg text-sm text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all w-full lg:w-56"
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="h-10 pl-3 pr-8 rounded-lg border border-[#E7E5E4] bg-white text-sm text-[#1C1917] font-medium focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2378716C' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="ALL">All Status</option>
              <option value="ONGOING">Ongoing</option>
              <option value="LATEST">Latest</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-[#E7E5E4] rounded-lg overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-2.5 transition-all ${view === 'grid' ? 'bg-[#1C1917] text-white' : 'bg-white text-[#78716C] hover:bg-[#F5F3EF]'}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2.5 transition-all ${view === 'list' ? 'bg-[#1C1917] text-white' : 'bg-white text-[#78716C] hover:bg-[#F5F3EF]'}`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        {filtered.length > 0 ? (
          <div className={view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'flex flex-col gap-4'
          }>
            {filtered.map((p) => {
              return (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/${encodeURIComponent(p.projectName)}`)}
                className={`bg-white rounded-xl border border-[#E7E5E4] overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  view === 'list' ? 'flex flex-row h-40' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className={`relative overflow-hidden bg-[#F5F3EF] ${view === 'grid' ? 'h-52 w-full' : 'h-full w-56 shrink-0'}`}>
                  {p.coverImageUrl ? (
                    <img
                      src={p.coverImageUrl}
                      alt={p.projectName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-[#A8A29E] text-sm font-medium">No Cover</div>
                  )}

                  {/* Status overlay */}
                  <div className="absolute top-3 right-3">{statusBadge(p)}</div>

                  {/* BHK chip */}
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-[#1C1917] text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {p.bedrooms || '—'} BHK
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className={`flex flex-col justify-between p-5 ${view === 'list' ? 'flex-1' : ''}`}>
                  <div>
                    <h3 className="text-base font-bold text-[#1C1917] mb-1 group-hover:text-[#C9A84C] transition-colors line-clamp-1">
                      {p.projectName}
                    </h3>
                    <div className="flex items-center text-[#A8A29E] text-sm mb-3">
                      <MapPin size={12} className="mr-1 shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#C9A84C] font-extrabold text-lg">
                      {p.price || 'On Request'}
                    </span>
                    <span className="text-[#78716C] text-sm font-medium">{p.area || '—'}</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-dashed border-[#E7E5E4]">
            <div className="w-16 h-16 bg-[#F5F3EF] rounded-full flex items-center justify-center mb-5">
              <Building2 className="text-[#C9A84C]" size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#1C1917] mb-2">No projects found</h3>
            <p className="text-[#78716C] text-center max-w-sm mb-6">
              {search ? `No results for "${search}"` : 'Your catalog is empty.'}
            </p>
            <button
              onClick={() => router.push('/projects/new')}
              className="flex items-center gap-2 bg-[#C9A84C] hover:bg-[#8B6914] text-white px-5 py-3 rounded-lg font-semibold text-sm shadow-sm transition-all"
            >
              <Plus size={16} />
              Publish Listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
