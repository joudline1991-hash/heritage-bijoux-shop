'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  PlusCircleIcon, 
  PhotoIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  CameraIcon,
  ArrowPathRoundedSquareIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// Définition du format de l'archive
interface ArchiveItem {
  id: string;
  title: string;
  price: number;
  description: string;
  date: string;
  image: string;
}

export default function AdminPage() {
  // --- ÉTATS ---
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'archive'>('dashboard');

  const [images, setImages] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [archive, setArchive] = useState<ArchiveItem[]>([]);

  // Chargement de l'archive au démarrage
  useEffect(() => {
    const savedArchive = localStorage.getItem('hb_archive');
    if (savedArchive) {
      try {
        setArchive(JSON.parse(savedArchive));
      } catch (e) {
        console.error("Erreur lecture archive");
      }
    }
  }, []);

  // --- 1. SÉCURITÉ ---
  const checkPassword = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Accès refusé.");
    }
  };

  // --- 2. COMPRESSION (Anti-Erreur 413 & TypeScript Fix) ---
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
          
          // FIX TYPESCRIPT : Ajout de "|| ''" pour garantir une string
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1] || '';
          resolve(base64);
        };
      };
    });
  };

  // --- 3. ROTATION (TypeScript Fix) ---
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
        
        // FIX TYPESCRIPT ICI AUSSI
        const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1] || '';
        
        const newImages = [...images];
        newImages[index] = rotatedBase64;
        setImages(newImages);
      }
    };
  };

  // --- 4. GESTION DES PHOTOS ---
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

  // --- 5. ANALYSE IA ---
  const analyzeJewelry = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setProgress(15);
    const interval = setInterval(() => setProgress(p => p < 90 ? p + 3 : p), 500);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagesBase64: images }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setProgress(100);
    } catch (e: any) { 
      alert("Erreur analyse: " + e.message); 
    } finally { 
      clearInterval(interval); 
      setLoading(false); 
    }
  };

  // --- 6. PUBLICATION & ARCHIVAGE ---
  const publishToShopify = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/shopify-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      
      if (res.ok) {
        // Création de l'objet archive
        const newItem: ArchiveItem = {
          id: Date.now().toString(),
          title: result.title,
          price: result.price,
          description: result.description,
          date: new Date().toLocaleDateString('fr-CH'),
          image: images[0] || ''
        };

        // Sauvegarde locale
        const newArchive = [newItem, ...archive];
        setArchive(newArchive);
        localStorage.setItem('hb_archive', JSON.stringify(newArchive));

        alert('Bijou publié avec succès !');
        setImages([]);
        setResult(null);
        setActiveTab('archive'); // Redirection vers l'archive
      } else {
        throw new Error("Erreur Shopify");
      }
    } catch (error: any) {
      alert(error.message);
    } finally { 
      setPublishing(false); 
    }
  };

  // --- RENDU : ÉCRAN DE CONNEXION ---
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

  // --- RENDU : APPLICATION ---
  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white border-r border-stone-200 flex flex-col fixed md:relative h-full z-10">
        <div className="p-8 font-serif text-amber-700 hidden md:block text-2xl italic">HB</div>
        <nav className="flex-1 p-4 space-y-2 mt-4 md:mt-0">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <ChartBarIcon className="w-6 h-6" /> <span className="hidden md:block font-bold">Stats</span>
          </button>
          <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'create' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <PlusCircleIcon className="w-6 h-6" /> <span className="hidden md:block font-bold">Expertise</span>
          </button>
          <button onClick={() => setActiveTab('archive')} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'archive' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <ArchiveBoxIcon className="w-6 h-6" /> <span className="hidden md:block font-bold">Archive</span>
          </button>
        </nav>
      </div>

      <div className="flex-1 p-6 md:p-10 overflow-y-auto ml-20 md:ml-0">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-serif italic text-stone-900">Tableau de bord</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                <p className="text-stone-400 text-xs uppercase font-bold tracking-widest">Bijoux Archivés</p>
                <p className="text-4xl font-serif mt-2 text-stone-800">{archive.length}</p>
              </div>
              <div className="bg-stone-900 p-6 rounded-2xl shadow-xl text-white md:col-span-2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl text-amber-400">Prêt à expertiser ?</h3>
                  <p className="text-stone-400 text-sm mt-1">L'IA est prête pour vos photos.</p>
                </div>
                <button onClick={() => setActiveTab('create')} className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform">
                  Nouveau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500">
            <h2 className="text-3xl font-serif italic text-stone-900">Nouvelle Expertise</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Zone Photos */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-stone-200 relative overflow-hidden shadow-sm">
                  {loading && <div className="absolute top-0 left-0 h-1.5 bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />}
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square group">
                        <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover rounded-2xl border border-stone-100" alt="preview" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => rotateImage(i)} className="bg-white p-2 rounded-full shadow-lg text-amber-600 hover:scale-110 transition-transform">
                            <ArrowPathRoundedSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="bg-white p-2 rounded-full shadow-lg text-red-500 hover:scale-110 transition-transform">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <label className="border-2 border-dashed border-stone-200 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group">
                      <CameraIcon className="w-8 h-8 text-stone-300 group-hover:text-amber-500" />
                      <span className="text-[10px] font-bold mt-2 text-stone-400">PHOTO</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                    </label>
                    
                    <label className="border-2 border-dashed border-stone-200 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group">
                      <PhotoIcon className="w-8 h-8 text-stone-300 group-hover:text-amber-500" />
                      <span className="text-[10px] font-bold mt-2 text-stone-400">GALERIE</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>

                  {images.length > 0 && !result && (
                    <button onClick={analyzeJewelry} disabled={loading} className="w-full bg-amber-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-amber-700 transition-all shadow-xl flex items-center justify-center gap-2">
                      {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : null}
                      {loading ? "Analyse..." : `Analyser ${images.length} photos`}
                    </button>
                  )}
                </div>
              </div>

              {/* Zone Résultat */}
              <div className="space-y-6">
                {result ? (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-amber-100 space-y-5 animate-in zoom-in duration-300">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full w-fit text-sm">
                      <CheckCircleIcon className="w-5 h-5" /> Expertise terminée
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Titre</label>
                      <input className="w-full text-2xl font-serif text-stone-900 border-b border-stone-100 outline-none py-2 bg-transparent focus:border-amber-500 transition-colors" value={result.title} onChange={e => setResult({...result, title: e.target.value})} />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Prix (CHF)</label>
                      <input type="number" className="w-full text-3xl font-bold text-amber-600 border-b border-stone-100 outline-none py-2 bg-transparent focus:border-amber-500 transition-colors" value={result.price} onChange={e => setResult({...result, price: parseInt(e.target.value)})} />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Description</label>
                      <textarea className="w-full bg-stone-50 p-5 rounded-2xl text-stone-700 text-sm outline-none min-h-[180px] leading-relaxed border border-stone-100 mt-2" value={result.description.replace(/<[^>]*>?/gm, '')} onChange={e => setResult({...result, description: e.target.value})} />
                    </div>
                    
                    <button onClick={publishToShopify} disabled={publishing} className="w-full bg-stone-900 text-amber-400 py-5 rounded-2xl font-bold text-xl hover:scale-[1.02] transition-transform shadow-2xl">
                      {publishing ? 'Publication...' : 'Mettre en vente'}
                    </button>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-stone-100/50 rounded-[2.5rem] border-2 border-dashed border-stone-200 italic text-stone-400">
                    <p>Ajoutez des photos pour voir l'expertise IA ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ARCHIVE TAB */}
        {activeTab === 'archive' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-serif italic text-stone-900">Historique</h2>
            <div className="grid gap-4">
              {archive.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex gap-4 items-center hover:shadow-md transition-shadow">
                  {item.image ? (
                    <img src={`data:image/jpeg;base64,${item.image}`} className="w-20 h-20 object-cover rounded-xl bg-stone-100" alt="" />
                  ) : (
                    <div className="w-20 h-20 bg-stone-100 rounded-xl flex items-center justify-center"><PhotoIcon className="w-8 h-8 text-stone-300"/></div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-stone-800 text-lg">{item.title}</h4>
                    <p className="text-stone-400 text-sm">{item.date} • <span className="text-amber-600 font-bold">{item.price} CHF</span></p>
                  </div>
                  <button onClick={() => {
                    if(confirm('Supprimer de l\'archive ?')) {
                      const newArchive = archive.filter(a => a.id !== item.id);
                      setArchive(newArchive);
                      localStorage.setItem('hb_archive', JSON.stringify(newArchive));
                    }
                  }} className="text-stone-300 hover:text-red-400 p-3 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {archive.length === 0 && (
                <div className="text-center py-20 text-stone-400 italic">
                  Aucun bijou archivé pour le moment.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
