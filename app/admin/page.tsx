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
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon
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
  const [manualJson, setManualJson] = useState(''); 
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

  // --- SÉCURITÉ ---
  const checkPassword = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Accès refusé.");
    }
  };

  // --- COMPRESSION IMAGE ---
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
          
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1] || '';
          resolve(base64);
        };
      };
    });
  };

  // --- ROTATION IMAGE ---
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
        
        const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1] || '';
        
        const newImages = [...images];
        newImages[index] = rotatedBase64;
        setImages(newImages);
      }
    };
  };

  // --- GESTION DES FICHIERS ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLoading(true);
      try {
        const compressedPromises = Array.from(files).map(file => compressImage(file));
        const newImages = await Promise.all(compressedPromises);
        setImages((prev) => [...prev, ...newImages]);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- ANALYSE IA (GEMINI) ---
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

  // --- IMPORT MANUEL INTELLIGENT ---
  const handleManualImport = () => {
    try {
      // Nettoyage du JSON
      const cleanedJson = manualJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      
      let finalResult = null;

      // Cas A: Format Expert
      if (parsed.produit && parsed.produit.titre) {
        finalResult = {
          title: parsed.produit.titre,
          description: parsed.description_site.longue,
          price: parsed.produit.prix_vente_chf,
          tags: parsed.seo_metadonnees && typeof parsed.seo_metadonnees.mots_cles === 'string'
                ? parsed.seo_metadonnees.mots_cles.split(',').map((t: string) => t.trim())
                : []
        };
      } 
      // Cas B: Format Simple
      else if (parsed.title && parsed.price) {
        finalResult = parsed;
      }

      if (finalResult) {
        setResult(finalResult);
        setManualJson(''); 
      } else {
        alert("Le format JSON n'est pas reconnu.");
      }

    } catch (e) {
      alert("Erreur de lecture JSON.");
      console.error(e);
    }
  };

  // --- PUBLICATION SHOPIFY ---
  const publishToShopify = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/shopify-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      
      if (res.ok) {
        // Ajout à l'archive locale
        const newItem: ArchiveItem = {
          id: Date.now().toString(),
          title: result.title,
          price: result.price,
          description: result.description,
          date: new Date().toLocaleDateString('fr-CH'),
          image: images[0] || ''
        };

        const newArchive = [newItem, ...archive];
        setArchive(newArchive);
        localStorage.setItem('hb_archive', JSON.stringify(newArchive));

        alert('Bijou publié avec succès sur Shopify !');
        setImages([]);
        setResult(null);
        setActiveTab('archive'); 
      } else {
        throw new Error("Erreur Shopify");
      }
    } catch (error: any) {
      alert(error.message);
    } finally { 
      setPublishing(false); 
    }
  };

  // --- ÉCRAN DE CONNEXION ---
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-100 text-center">
          <h1 className="text-3xl font-serif text-stone-900 mb-2 italic">Héritage Bijoux</h1>
          <p className="text-stone-400 mb-6 text-xs uppercase tracking-widest">Admin Mobile</p>
          <input 
            type="password" placeholder="Code secret" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 text-center text-lg mb-4 outline-none focus:border-amber-500"
          />
          <button onClick={checkPassword} className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-colors">
            Entrer
          </button>
        </div>
      </div>
    );
  }

  // --- COMPOSANT BOUTON NAV ---
  const NavButton = ({ tab, icon: Icon, label }: any) => (
    <button onClick={() => setActiveTab(tab)} className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 p-2 md:p-4 rounded-xl transition-all ${activeTab === tab ? 'text-amber-700 bg-amber-50' : 'text-stone-400 hover:bg-stone-50'}`}>
      <Icon className="w-6 h-6" />
      <span className="text-[10px] md:text-base font-bold">{label}</span>
    </button>
  );

  // --- RENDU PRINCIPAL ---
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      
      {/* 1. SIDEBAR (DESKTOP) */}
      <div className="hidden md:flex w-64 bg-white border-r border-stone-200 flex-col sticky top-0 h-screen z-20">
        <div className="p-8 font-serif text-amber-700 text-2xl italic">HB Admin</div>
        <nav className="flex-1 px-4 space-y-2">
          <NavButton tab="dashboard" icon={ChartBarIcon} label="Tableau de bord" />
          <NavButton tab="create" icon={PlusCircleIcon} label="Expertise" />
          <NavButton tab="archive" icon={ArchiveBoxIcon} label="Historique" />
        </nav>
      </div>

      {/* 2. CONTENU PRINCIPAL */}
      <div className="flex-1 p-4 md:p-10 pb-24 md:pb-10 overflow-y-auto">
        
        {/* En-tête Mobile */}
        <div className="md:hidden flex justify-between items-center mb-6 pt-2">
          <span className="font-serif text-xl italic text-stone-800">Héritage Bijoux</span>
          <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">Admin</div>
        </div>

        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl md:text-3xl font-serif italic text-stone-900">Tableau de bord</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                <p className="text-stone-400 text-xs uppercase font-bold tracking-widest">En Archive</p>
                <p className="text-4xl font-serif mt-2 text-stone-800">{archive.length}</p>
              </div>
              <div onClick={() => setActiveTab('create')} className="bg-stone-900 p-6 rounded-2xl shadow-lg text-white md:col-span-2 flex items-center justify-between cursor-pointer active:scale-95 transition-transform">
                <div>
                  <h3 className="font-bold text-lg text-amber-400">Nouvelle Expertise</h3>
                  <p className="text-stone-400 text-xs mt-1">Lancer l'IA ou importer</p>
                </div>
                <PlusCircleIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* --- CREATE TAB --- */}
        {activeTab === 'create' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-5 duration-500">
            <h2 className="text-2xl md:text-3xl font-serif italic text-stone-900">Expertise</h2>
            
            {/* Zone Photos */}
            <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-sm border border-stone-100">
                {loading && <div className="h-1 bg-amber-500 w-full mb-4 rounded-full animate-pulse" />}
                
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover rounded-xl bg-stone-100 border border-stone-100" alt="preview" />
                      <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md"><TrashIcon className="w-3 h-3" /></button>
                      <button onClick={() => rotateImage(i)} className="absolute bottom-1 right-1 bg-white text-stone-600 p-1 rounded-full shadow-md"><ArrowPathRoundedSquareIcon className="w-4 h-4" /></button>
                    </div>
                  ))}
                  
                  <label className="bg-stone-50 border border-stone-200 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer active:bg-stone-100 transition-colors">
                    <CameraIcon className="w-6 h-6 text-stone-400 mb-1" />
                    <span className="text-[9px] font-bold text-stone-500 uppercase">Caméra</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                  </label>
                  
                  <label className="bg-stone-50 border border-stone-200 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer active:bg-stone-100 transition-colors">
                    <PhotoIcon className="w-6 h-6 text-stone-400 mb-1" />
                    <span className="text-[9px] font-bold text-stone-500 uppercase">Galerie</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                  </label>
                </div>

                {images.length > 0 && !result && (
                  <button onClick={analyzeJewelry} disabled={loading} className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
                      {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : null}
                      {loading ? "Analyse en cours..." : `Analyser (${images.length})`}
                  </button>
                )}
            </div>

            {/* Zone Résultat / Import */}
            {result ? (
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-amber-100 space-y-4 animate-in zoom-in duration-300">
                 <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest mb-2">
                    <CheckCircleIcon className="w-4 h-4" /> Expertise IA
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Titre</label>
                    <input className="w-full text-xl font-serif text-stone-900 border-b border-stone-100 py-2 bg-transparent outline-none focus:border-amber-500 transition-colors" value={result.title} onChange={e => setResult({...result, title: e.target.value})} placeholder="Titre du bijou" />
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Prix (CHF)</label>
                    <input type="number" className="w-full text-2xl font-bold text-amber-600 border-b border-stone-100 py-2 bg-transparent outline-none focus:border-amber-500 transition-colors" value={result.price} onChange={e => setResult({...result, price: parseInt(e.target.value)})} />
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Description</label>
                    <textarea className="w-full bg-stone-50 p-4 rounded-xl text-sm border border-stone-100 h-32 outline-none focus:border-amber-500 transition-colors mt-1" value={result.description.replace(/<[^>]*>?/gm, '')} onChange={e => setResult({...result, description: e.target.value})} />
                 </div>
                 
                 <button onClick={publishToShopify} disabled={publishing} className="w-full bg-stone-900 text-amber-400 py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform mt-2">
                    {publishing ? 'Publication...' : 'Mettre en vente'}
                 </button>
              </div>
            ) : (
              <div className="bg-stone-50 p-6 rounded-[2rem] border border-stone-200 text-center">
                 <ClipboardDocumentCheckIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                 <p className="text-xs text-stone-400 mb-3 uppercase font-bold">Ou import manuel (JSON)</p>
                 <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} placeholder="Coller le JSON ici..." className="w-full bg-white p-3 rounded-xl border border-stone-200 text-xs h-20 mb-3 outline-none focus:border-amber-500" />
                 <button onClick={handleManualImport} disabled={!manualJson} className="w-full bg-white border border-stone-300 text-stone-600 py-2 rounded-lg font-bold text-sm hover:bg-stone-100">Importer</button>
              </div>
            )}
          </div>
        )}

        {/* --- ARCHIVE TAB --- */}
        {activeTab === 'archive' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl md:text-3xl font-serif italic text-stone-900">Historique</h2>
            <div className="space-y-3">
              {archive.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex gap-3 items-center">
                  {item.image ? (
                    <img src={`data:image/jpeg;base64,${item.image}`} className="w-16 h-16 object-cover rounded-xl bg-stone-100" alt="archive" />
                  ) : <div className="w-16 h-16 bg-stone-100 rounded-xl flex items-center justify-center"><PhotoIcon className="w-6 h-6 text-stone-300"/></div>}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-800 text-sm truncate">{item.title}</h4>
                    <p className="text-amber-600 font-bold text-xs">{item.price} CHF <span className="text-stone-300">•</span> {item.date}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    <button onClick={() => { setResult(item); if(item.image) setImages([item.image]); setActiveTab('create'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => { if(confirm('Supprimer ?')) { const n = archive.filter(a => a.id !== item.id); setArchive(n); localStorage.setItem('hb_archive', JSON.stringify(n)); }}} className="p-2 bg-stone-100 text-stone-400 rounded-lg hover:bg-red-50 hover:text-red-500">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {archive.length === 0 && <p className="text-center text-stone-400 text-sm py-10 italic">Aucune archive pour l'instant.</p>}
            </div>
          </div>
        )}

      </div>

      {/* 3. NAVIGATION BASSE (MOBILE SEULEMENT) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-stone-200 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-bottom">
        <NavButton tab="dashboard" icon={ChartBarIcon} label="Stats" />
        <div className="relative -top-6">
           <button onClick={() => setActiveTab('create')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-stone-50 transition-all ${activeTab === 'create' ? 'bg-amber-600 text-white scale-110' : 'bg-stone-900 text-white'}`}>
             <PlusCircleIcon className="w-8 h-8" />
           </button>
        </div>
        <NavButton tab="archive" icon={ArchiveBoxIcon} label="Archives" />
      </div>

    </div>
  );
}
