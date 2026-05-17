"use client";

import { Upload, Trash2, Home, Share2, Sparkles, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import imageCompression from 'browser-image-compression';

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface MediaItem {
  id: string;
  location_id: string;
  title: string;
  image_url: string;
  created_at: string;
}

function MediaHomeContent() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const locationId = searchParams.get('location_id');
  const locationName = searchParams.get('location_name');

  useEffect(() => {
    fetchMedia();
  }, [locationId]);

  const fetchMedia = async () => {
    try {
      const url = locationId ? `/api/media?location_id=${locationId}` : '/api/media';
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        setMediaItems(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = '';

    setUploading(true);
    try {
      // 1. Compress Image
      const options = {
        maxSizeMB: 0.5, // 500KB max
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed from ${file.size / 1024 / 1024} MB to ${compressedFile.size / 1024 / 1024} MB`);

      // 2. Upload to API
      const formData = new FormData();
      formData.append('file', compressedFile);
      // Sử dụng location_id từ URL nếu có, nếu không lấy id mặc định để test
      formData.append('location_id', locationId || '00000000-0000-0000-0000-000000000000'); 
      formData.append('title', file.name.split('.')[0] || 'Untitled');

      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.data) {
        setMediaItems(prev => [json.data, ...prev]);
      } else {
        alert('Upload failed: ' + json.error);
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    try {
      // Optimistic UI update
      setMediaItems(prev => prev.filter(item => item.id !== id));
      
      await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Delete error:', error);
      fetchMedia(); // Revert on failure
    }
  };

  // Helper to format date
  const formatDate = (isoStr: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(isoStr));
  };

  return (
    <div className="min-h-screen bg-white text-black p-6 font-sans selection:bg-primary selection:text-black">
      <header className="flex items-center justify-between mb-8 sticky top-0 z-50 bg-white/80 backdrop-blur-xl py-4 border-b border-gray-100">
        
        {/* Redesigned Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="bg-primary text-black p-2 rounded-xl">
            <Sparkles className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tight font-heading text-black">
            Media<span className="text-gray-400 font-light">Hub</span>
          </h1>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Muvmap</span>
          </button>
          
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </header>

      <main>
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {locationName ? `Photos of ${locationName}` : 'Recent Memories'}
            </h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p>No media found. Upload something to get started!</p>
            </div>
          ) : (
            /* Pinterest-style Masonry Layout */
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
              {mediaItems.map((media) => (
                <div 
                  key={media.id} 
                  className={`break-inside-avoid mb-4 relative group rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300`}
                >
                  {/* Actual Image */}
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={media.image_url} 
                      alt={media.title}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Top Action Bar (Delete) - Visible on hover */}
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(media.id); }}
                      className="p-2.5 bg-white/90 hover:bg-red-50 hover:text-red-500 text-gray-500 rounded-full backdrop-blur-md transition-colors shadow-sm" 
                      title="Delete media"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Bottom Info Glassmorphism Card */}
                  <div className="absolute inset-x-3 bottom-3 bg-white/90 backdrop-blur-xl rounded-2xl p-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-white">
                    <p className="font-bold text-sm text-black truncate">{media.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs font-medium text-gray-500">{formatDate(media.created_at)}</p>
                      <button className="text-gray-400 hover:text-black hover:bg-gray-100 p-1.5 rounded-full transition-colors" title="Share">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function MediaHome() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <MediaHomeContent />
    </Suspense>
  );
}
