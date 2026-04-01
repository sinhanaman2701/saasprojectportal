"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, LogOut, Plus } from 'lucide-react';

export default function DashboardCatalog() {
  const [properties, setProperties] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch('http://localhost:3001/projects/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access-token': 'prototype-bypass' },
      body: JSON.stringify({ page: "1", limit: "100" })
    })
    .then(r => r.json())
    .then(data => setProperties(data.response_data || []))
    .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCF9] py-16 px-6 sm:px-12 text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="mb-6 md:mb-0">
            <h1 className="text-4xl font-extrabold text-[#1A1A1A] mb-2 tracking-tight">Project Catalog</h1>
            <p className="text-md text-[#6B7280] font-medium">Explore live listings & manage your real estate directory.</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={() => { localStorage.clear(); router.push('/'); }} className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] px-6 py-3 rounded-xl font-bold transition">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
            <button onClick={() => router.push('/projects/new')} className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#B8962F] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition">
              <Plus size={20} />
              <span>Publish Listing</span>
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {properties.map((p: any) => (
            <div key={p.projectId} onClick={() => router.push(`/dashboard/${encodeURIComponent(p.projectName)}`)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="h-64 w-full relative bg-[#F2EDE4] overflow-hidden">
                {p.attachments && p.attachments.length > 0 ? (
                  <img src={p.attachments[0].imageUrl} alt="banner" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400 font-bold">No Cover Image</div>
                )}
                
                <div className="absolute top-4 right-4 bg-[#1A1A1A]/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-[#D4AF37] shadow-sm uppercase tracking-wide">
                  {p.overview?.bedrooms} BHK
                </div>
              </div>
              
              <div className="p-8">
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">{p.projectName}</h2>
                <div className="flex items-center text-[#6B7280] mb-6 font-medium text-sm">
                  <MapPin size={14} className="mr-1.5" />
                  <span>{p.location}</span>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm font-bold text-[#1A1A1A]">
                    <span className="text-[#6B7280] font-medium">Starting from</span>
                    <span className="text-lg text-[#D4AF37]">{p.overview?.price || "On Request"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm font-bold text-[#1A1A1A] pt-2">
                    <span className="text-[#6B7280] font-medium">{p.overview?.area}</span>
                    <span className="text-[#D4AF37] group-hover:underline transition">View Details &rarr;</span>
                  </div>
                </div>

              </div>
            </div>
          ))}
          
          {properties.length === 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
               <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-300 rounded-2xl">
                 <div className="h-16 w-16 bg-[#F2EDE4] rounded-full flex items-center justify-center mb-4"><MapPin className="text-[#D4AF37]" size={24} /></div>
                 <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No projects found.</h3>
                 <p className="text-[#6B7280] font-medium text-center">Your catalog is currently empty.<br/>Click 'Publish Listing' to add your first project.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
