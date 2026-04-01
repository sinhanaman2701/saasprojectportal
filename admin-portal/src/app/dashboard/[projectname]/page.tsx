"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, Share2, Heart, BedDouble, Square, Bath, 
  Armchair, MapPin, Download, Eye, Phone, MessageCircle,
  Hospital, GraduationCap, ShoppingCart, Plane, Train, Archive
} from 'lucide-react';

export default function ProjectDetail() {
  const { projectname } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'hospital': return <Hospital size={24} />;
      case 'school': return <GraduationCap size={24} />;
      case 'shopping mall': return <ShoppingCart size={24} />;
      case 'airport': return <Plane size={24} />;
      case 'railway station': return <Train size={24} />;
      default: return <MapPin size={24} />;
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive ${project.projectName}? This will remove it from the live catalog.`)) return;
    try {
      const res = await fetch(`http://localhost:3001/admin/projects/${project.projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'prototype-bypass'}` }
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        alert('Failed to archive project. Please check permissions.');
      }
    } catch (e) {
      console.error(e);
      alert('Internal Server Error while archiving.');
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/projects/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access-token': 'prototype-bypass' },
      body: JSON.stringify({ page: "1", limit: "100" })
    })
    .then(r => r.json())
    .then(data => {
      const decodedSearchName = decodeURIComponent(projectname as string).toLowerCase().trim();
      const found = data.response_data.find((p: any) => p.projectName.toLowerCase().trim() === decodedSearchName);
      setProject(found);
      
      if (found) {
        fetch(`http://localhost:3001/projects/${found.projectId}/click`, { method: 'POST' });
      }
    });
  }, [projectname]);

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 w-48 bg-gray-100 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-[#1A1A1A] font-sans pb-12">
      {/* SECTION 1: Hero Banner */}
      <div className="relative w-full h-[420px] md:h-[500px] bg-gray-200 overflow-hidden">
        <img 
          src={project.attachments?.[0]?.imageUrl || project.thumbnailUrl} 
          alt={project.projectName} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Hero Overlays */}
        <div className="absolute top-6 left-6 md:left-12 flex space-x-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition">
            <ChevronLeft size={24} />
          </button>
        </div>
        
        <div className="absolute top-6 right-6 md:right-12 flex space-x-3">
          <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition">
            <Share2 size={20} />
          </button>
          <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition">
            <Heart size={20} />
          </button>
        </div>

        <div className="absolute bottom-10 left-6 md:left-12 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{project.projectName}</h1>
          <div className="flex items-center text-white/90">
            <MapPin size={16} className="mr-2" />
            <span className="text-lg">{project.location}</span>
          </div>
        </div>
      </div>

      {/* Layout Container */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-12 mt-8">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* LEFT COLUMN: Scrollable Content */}
          <div className="lg:w-[68%] space-y-12">
            
            {/* SECTION 3: Overview */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-8 uppercase tracking-wide text-gray-400">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="flex flex-col items-center md:items-start">
                  <BedDouble className="text-gray-400 mb-2" size={24} />
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-tight">Bedrooms</span>
                  <span className="text-lg font-bold">{project.overview?.bedrooms} BHK</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <Square className="text-gray-400 mb-2" size={24} />
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-tight">Area</span>
                  <span className="text-lg font-bold">{project.overview?.area}</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <Armchair className="text-gray-400 mb-2" size={24} />
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-tight">Furnishing</span>
                  <span className="text-lg font-bold">{project.overview?.furnishing}</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <Bath className="text-gray-400 mb-2" size={24} />
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-tight">Bathrooms</span>
                  <span className="text-lg font-bold">{project.overview?.bathrooms || 2} Bathrooms</span>
                </div>
              </div>
            </section>

            {/* SECTION 4: Description */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Description</h2>
              <div className={`text-gray-600 text-lg leading-relaxed max-w-[700px] ${!isExpanded ? 'line-clamp-4' : ''}`}>
                {project.description}
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="mt-4 text-[#D4AF37] font-bold hover:underline"
              >
                {isExpanded ? 'Read Less' : 'Read More'}
              </button>
            </section>

            {/* SECTION 5: Community Amenities */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Community Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {(project.communityAmenities?.length > 0 ? project.communityAmenities : [
                  { name: "Swimming pool", imageUrl: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=600" },
                  { name: "Kids Area", imageUrl: "https://images.unsplash.com/photo-1537162809335-5e367808269e?auto=format&fit=crop&q=80&w=600" }
                ]).map((amenity: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group">
                    <div className="h-40 w-full bg-gray-100 overflow-hidden">
                      <img src={amenity.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={amenity.name} />
                    </div>
                    <div className="p-4 bg-[#F2EDE4] text-center">
                      <span className="font-bold text-gray-700">{amenity.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 6: Property Amenities */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Property Amenities</h2>
              <div className="flex flex-wrap gap-4">
                {(project.propertyAmenities?.length > 0 ? project.propertyAmenities : [
                  { name: "CCTV Cameras" }, { name: "Parking" }
                ]).map((amenity: any, idx: number) => (
                  <div key={idx} className="flex items-center px-6 py-4 bg-[#F2EDE4] rounded-xl border border-gray-100 shadow-sm">
                    <span className="font-bold text-gray-700">{amenity.name}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 7: Nearby Places */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Nearby Places</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {project.nearbyPlaces?.map((place: any, idx: number) => (
                  <div key={idx} className="bg-[#F2EDE4] p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="mb-4 bg-white p-3 rounded-full text-[#D4AF37]">
                      {getCategoryIcon(place.category)}
                    </div>
                    <span className="text-gray-500 font-medium mb-1">{place.category}</span>
                    <span className="text-xl font-bold">{place.distanceKm} km</span>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 8: Location */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-black">Location</h2>
              <div className="h-[400px] w-full rounded-2xl overflow-hidden relative shadow-md">
                <iframe 
                  src={project.locationIframe || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15129.567439545!2d73.7402!3d18.5913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bb08e1ec26a3%3A0x7d025b3a4a1d6368!2sHinjewadi%2C%20Pune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"} 
                  className="w-full h-full border-0" 
                  allowFullScreen 
                  loading="lazy"
                ></iframe>
                <div className="absolute bottom-0 w-full p-6 flex justify-center">
                   <button className="bg-[#F2EDE4] px-8 py-3 rounded-full font-bold shadow-lg hover:bg-white transition text-[#D4AF37]">
                     View All On Map
                   </button>
                </div>
              </div>
            </section>

            {/* SECTION 9: Project Brochure */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-black">Project Brochure</h2>
              <div className="flex flex-col md:flex-row bg-[#F2EDE4] rounded-2xl overflow-hidden shadow-sm">
                <div className="md:w-1/2 h-64 bg-gray-300">
                  <img src={project.attachments?.[1]?.imageUrl || project.thumbnailUrl} className="w-full h-full object-cover grayscale" alt="brochure" />
                </div>
                <div className="md:w-1/2 p-8 flex flex-col justify-center items-center space-y-4">
                  <button className="w-full bg-[#1A1A1A] text-white py-4 rounded-full font-bold flex items-center justify-center space-x-2">
                    <Eye size={20} /> <span>View Brochure</span>
                  </button>
                  <button className="w-full bg-white text-[#D4AF37] border border-[#D4AF37] py-4 rounded-full font-bold flex items-center justify-center space-x-2">
                    <Download size={20} /> <span>Download Brochure</span>
                  </button>
                </div>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: Sticky Summary Panel */}
          <div className="lg:w-[32%]">
            <div className="sticky top-10 bg-white p-10 rounded-2xl shadow-xl border border-gray-100 flex flex-col space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">{project.projectName}</h2>
                <div className="flex items-center text-gray-500">
                  <MapPin size={14} className="mr-1" />
                  <span className="text-sm font-medium">{project.location}</span>
                </div>
              </div>

              <div className="pb-8 border-b border-gray-100">
                <span className="text-gray-400 text-sm font-medium">Starting from</span>
                <div className="text-3xl font-bold text-[#D4AF37]">{project.overview?.price || "₹ On Request"}</div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Bedrooms</span>
                  <span className="font-bold">{project.overview?.bedrooms} BHK</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Area</span>
                  <span className="font-bold">{project.overview?.area}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Bathrooms</span>
                  <span className="font-bold">{project.overview?.bathrooms || 2}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-4 pt-4">
                <button className="w-full bg-[#D4AF37] hover:bg-[#B8962F] text-white py-5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center space-x-2">
                  <MessageCircle size={20} /> <span>Enquire Now</span>
                </button>
                <button className="w-full bg-white border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#FDFCF9] py-5 rounded-xl font-bold text-lg transition flex items-center justify-center space-x-2">
                  <Phone size={20} /> <span>Refer</span>
                </button>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <button onClick={handleArchive} className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2">
                    <Archive size={16} /> <span>Archive Project</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
