'use client';

import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  PlusCircleIcon, 
  PhotoIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  CameraIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');

  const [images, setImages] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- 1. SÉCURITÉ ---
  const checkPassword = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Accès refusé.");
    }
  };

  // --- 2. COMPRESSION & ROTATION (Anti-Erreur 413) ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Nettoyage de l'encodage pour Gemini
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
          resolve(base64);
        };
      };
    });
  };

  const rotateImage = (index: number) => {
    const base64 = images[index];
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        const newImages = [...images];
        newImages[index] = rotatedBase64;
        setImages(newImages);
      }
    };
  };

  // --- 3. GESTION DES PHOTOS ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLoading(true);
      try {
        const compressedPromises = Array.from(files).map(file => compressImage(file));
        const newImages = await Promise.all(compressedPromises);
        setImages((prev) => [...prev, ...newImages]);
        setResult(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const clearSelection = () => {
    setImages([]);
    setResult(null);
    setProgress(0);
  };

  // --- 4. ANALYSE IA ---
  const analyzeJewelry = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setProgress(15);
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 3 : prev));
    }, 500);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagesBase64: images }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setResult(data);
    } catch (error: any) {
      alert("Erreur : " + error.message);
      setProgress(0);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // --- 5. PUBLICATION ---
  const publishToShopify = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/shopify-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (res.ok) {
        alert('Produit créé avec succès !');
        clearSelection();
        setActiveTab('dashboard');
      }
    } finally {
      setPublishing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-stone-100 text-center">
          <h1 className="text-3xl font-serif text-stone-900 mb-2 italic">Héritage Bijoux</h1>
          <p className="text-stone-400 mb-8 tracking-widest uppercase text-xs">Accès Propriétaire</p>
          <input 
            type="password" placeholder="Code secret" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl border border-stone-200 outline-none mb-6 text-black text-center text-lg"
          />
          <button onClick={checkPassword} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 shadow-lg">
            Déverrouiller
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <div className="w-20 md:w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-8 font-serif text-amber-700 hidden md:block text-2xl italic">HB</div>
        <nav className="flex-1 p-4 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <ChartBarIcon className="w-6 h-6" /> <span className="hidden md:block font-bold">Tableau de bord</span>
          </button>
          <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'create' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <PlusCircleIcon className="w-6 h-6" /> <span className="hidden md:block font-bold">Nouvelle expertise</span>
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-10 max-w-6xl mx-auto">
          {activeTab === 'dashboard' ? (
            <div className="animate-in fade-in duration-700">
               <h2 className="text-4xl font-serif text-stone-900 mb-10">Bienvenue,</h2>
               <div className="bg-stone-900 rounded-[2rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-amber-400">Prêt pour une expertise ?</h3>
                  <p className="text-stone-300">La compression automatique évite l'erreur 413 sur Vercel.</p>
                </div>
                <button onClick={() => setActiveTab('create')} className="bg-amber-500 text-stone-900 px-10 py-5 rounded-2xl font-black">
                  Commencer maintenant
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700">
              <header className="flex items-end justify-between border-b border-stone-200 pb-6">
                <h2 className="text-4xl font-serif text-stone-900 italic">Expertise IA Multi-Photos</h2>
                {images.length > 0 && (
                  <button onClick={clearSelection} className="text-stone-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <TrashIcon className="w-4 h-4" /> Effacer tout
                  </button>
                )}
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-stone-200 relative overflow-hidden">
                    {loading && <div className="absolute top-0 left-0 w-full h-2 bg-stone-100"><div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      {images.map((img, index) => (
                        <div key={index} className="relative aspect-square group">
                          <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover rounded-2xl border border-stone-100 shadow-sm" alt="bijou" />
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => rotateImage(index)} className="bg-white/90 p-2 rounded-full shadow-lg text-amber-600 hover:scale-110 transition-transform">
                              <ArrowPathRoundedSquareIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => removeImage(index)} className="bg-white/90 p-2 rounded-full shadow-lg text-red-500 hover:scale-110 transition-transform">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <label className="border-2 border-dashed border-stone-200 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all group">
                        <CameraIcon className="w-10 h-10 text-stone-300 group-hover:text-amber-500" />
                        <span className="text-[10px] uppercase font-bold text-stone-400 mt-2">Caméra</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                      </label>
                      <label className="border-2 border-dashed border-stone-200 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all group">
                        <PhotoIcon className="w-10 h-10 text-stone-300 group-hover:text-amber-500" />
                        <span className="text-[10px] uppercase font-bold text-stone-400 mt-2">Galerie</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>
                    {images.length > 0 && !result && (
                      <button onClick={analyzeJewelry} disabled={loading} className="w-full bg-amber-600 text-white py-5 rounded-[1.5rem] font-bold text-lg hover:bg-amber-700 transition-all shadow-xl flex items-center justify-center gap-3">
                        {loading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : null}
                        {loading ? `Expertise (${progress}%)...` : `Lancer l'expertise (${images.length})`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {result ? (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-amber-100 space-y-6 animate-in zoom-in duration-500">
                      <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full text-sm">
                        <CheckCircleIcon className="w-5 h-5" /> Expertise terminée
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Titre du bijou</label>
                        <input className="w-full text-2xl font-serif text-stone-900 border-b border-stone-100 outline-none pb-2 bg-transparent" value={result.title} onChange={(e) => setResult({...result, title: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Estimation (CHF)</label>
                        <input type="number" className="w-full text-3xl font-black text-amber-600 border-b border-stone-100 outline-none pb-2 bg-transparent" value={result.price} onChange={(e) => setResult({...result, price: parseInt(e.target.value)})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Description Expert</label>
                        <textarea className="w-full bg-stone-50 p-6 rounded-2xl text-stone-700 text-sm outline-none min-h-[180px] leading-relaxed border border-stone-100" value={result.description.replace(/<[^>]*>?/gm, '')} onChange={(e) => setResult({...result, description: e.target.value})} />
                      </div>
                      <button onClick={publishToShopify} disabled={publishing} className="w-full bg-stone-900 text-amber-400 py-6 rounded-[1.5rem] font-black text-xl hover:bg-stone-800 transition-all shadow-2xl">
                        {publishing ? 'Transmission...' : 'Mettre en vente'}
                      </button>
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-stone-100/30 rounded-[2.5rem] border border-stone-100 italic text-stone-400">
                      L'expertise s'affichera ici après l'analyse.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
