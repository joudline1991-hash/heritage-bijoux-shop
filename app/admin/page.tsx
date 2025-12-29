'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  PlusCircleIcon, 
  PhotoIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');

  const [images, setImages] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // État pour la barre de progression (0 à 100)
  const [progress, setProgress] = useState(0);

  // Correction TypeScript pour le mot de passe
  const checkPassword = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Accès refusé.");
    }
  };

  // --- GESTION DES IMAGES (Correction de l'erreur Vercel) ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const readers = Array.from(files).map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            // Correction de l'erreur Vercel : on assure que c'est une string
            const base64 = resultStr.split(',')[1] || ""; 
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((base64Strings) => {
        setImages((prev) => [...prev, ...base64Strings]);
        setResult(null);
        setProgress(0);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  // --- ANALYSE AVEC BARRE DE PROGRESSION ---
  const analyzeJewelry = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setProgress(10); // Début de l'analyse

    // Simulation de progression fluide pendant l'appel API
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 5 : prev));
    }, 400);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagesBase64: images }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setProgress(100); // Analyse terminée
      setResult(data);
    } catch (error: any) {
      alert("Erreur : " + error.message);
      setProgress(0);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

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
        setResult(null);
        setImages([]);
        setActiveTab('dashboard');
      }
    } catch (error) {
      alert("Erreur Shopify.");
    } finally {
      setPublishing(false);
    }
  };

  // Rendu de connexion (inchangé)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-stone-100 text-center">
          <h1 className="text-3xl font-serif text-stone-900 mb-2 italic">Héritage Bijoux</h1>
          <p className="text-stone-400 mb-8 tracking-widest uppercase text-xs">Accès Propriétaire</p>
          <input 
            type="password" 
            placeholder="Code secret"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none mb-6 text-black text-center text-lg"
          />
          <button onClick={checkPassword} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg">
            Déverrouiller
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-8 font-serif text-amber-700 hidden md:block text-2xl border-b border-stone-50 italic">
          HB
        </div>
        <nav className="flex-1 p-4 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <ChartBarIcon className="w-6 h-6" />
            <span className="hidden md:block font-bold">Tableau de bord</span>
          </button>
          <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'create' ? 'bg-amber-50 text-amber-800' : 'text-stone-400 hover:bg-stone-50'}`}>
            <PlusCircleIcon className="w-6 h-6" />
            <span className="hidden md:block font-bold">Nouvelle expertise</span>
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-10 max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-700">
               <h2 className="text-4xl font-serif text-stone-900 mb-10">Bienvenue,</h2>
               <div className="bg-stone-900 rounded-[2rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-amber-400">Prêt pour une expertise ?</h3>
                  <p className="text-stone-300 text-lg">Plusieurs angles de photos améliorent la précision du prix.</p>
                </div>
                <button onClick={() => setActiveTab('create')} className="bg-amber-500 text-stone-900 px-10 py-5 rounded-2xl font-black hover:bg-amber-400 transition-transform hover:scale-105 shadow-xl whitespace-nowrap">
                  Commencer maintenant
                </button>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700">
              <header className="flex items-end justify-between border-b border-stone-200 pb-6">
                <div>
                  <h2 className="text-4xl font-serif text-stone-900 italic">Expertise IA Multi-Photos</h2>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Section Photos */}
                <div className="space-y-6">
                  <div className="bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-stone-200 shadow-sm relative overflow-hidden">
                    
                    {/* BARRE DE PROGRESSION VISUELLE */}
                    {loading && (
                      <div className="absolute top-0 left-0 w-full h-2 bg-stone-100">
                        <div 
                          className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      {images.map((img, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover rounded-2xl border border-stone-100 shadow-sm" alt="bijou" />
                          <button onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-white/90 text-red-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <label className="border-2 border-dashed border-stone-200 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all group">
                        <PhotoIcon className="w-10 h-10 text-stone-300 group-hover:text-amber-500 transition-colors" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mt-3">Ajouter</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>

                    {images.length > 0 && !result && (
                      <button onClick={analyzeJewelry} disabled={loading} className="w-full bg-amber-600 text-white py-5 rounded-[1.5rem] font-bold text-lg hover:bg-amber-700 disabled:bg-stone-200 transition-all shadow-xl flex items-center justify-center gap-3">
                        {loading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : null}
                        {loading ? `Expertise en cours (${progress}%)...` : `Analyser ${images.length} photo(s)`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Résultat */}
                <div className="space-y-6">
                  {result ? (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-amber-100 space-y-6">
                      <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 w-fit px-4 py-2 rounded-full text-sm">
                        <CheckCircleIcon className="w-5 h-5" />
                        Analyse terminée
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Titre du bijou</label>
                        <input className="w-full text-2xl font-serif text-stone-900 border-b border-stone-100 focus:border-amber-500 outline-none pb-2 bg-transparent" value={result.title} onChange={(e) => setResult({...result, title: e.target.value})} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Estimation (CHF)</label>
                        <input type="number" className="w-full text-3xl font-black text-amber-600 border-b border-stone-100 focus:border-amber-500 outline-none pb-2 bg-transparent" value={result.price} onChange={(e) => setResult({...result, price: parseInt(e.target.value)})} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Description Expert</label>
                        <textarea className="w-full bg-stone-50 p-6 rounded-2xl text-stone-700 text-sm outline-none min-h-[200px] leading-relaxed border border-stone-100" value={result.description.replace(/<[^>]*>?/gm, '')} onChange={(e) => setResult({...result, description: e.target.value})} />
                      </div>

                      <button onClick={publishToShopify} disabled={publishing} className="w-full bg-stone-900 text-amber-400 py-6 rounded-[1.5rem] font-black text-xl hover:bg-stone-800 transition-all shadow-2xl hover:scale-[1.02] active:scale-95">
                        {publishing ? 'Transmission...' : 'Publier sur le site'}
                      </button>
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-stone-100/30 rounded-[2.5rem] border border-stone-100 italic text-stone-400">
                      {loading ? "Gemini 2.0 identifie les métaux et poinçons..." : "Sélectionnez les photos pour voir l'expertise ici."}
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
