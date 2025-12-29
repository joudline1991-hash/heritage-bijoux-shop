'use client';

import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  PlusCircleIcon, 
  PhotoIcon,
  CheckCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  // --- ÉTATS ---
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');

  // États pour l'IA et les images (Tableau de chaînes pour le multi-photos)
  const [images, setImages] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // --- LOGIQUE ---

  const checkPassword = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Accès refusé : Mot de passe incorrect.");
    }
  };

  // Gestion de plusieurs images
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const readers = Array.from(files).map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((base64Strings) => {
        setImages((prev) => [...prev, ...base64Strings]);
        setResult(null); // Reset le résultat si on ajoute des photos
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const analyzeJewelry = async () => {
    if (images.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envoi du tableau d'images à la route API mise à jour
        body: JSON.stringify({ imagesBase64: images }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (error: any) {
      alert("Erreur lors de l'analyse : " + error.message);
    } finally {
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
        alert('Félicitations ! Le bijou est maintenant en brouillon sur Shopify.');
        setResult(null);
        setImages([]);
        setActiveTab('dashboard');
      }
    } catch (error) {
      alert("Erreur lors de la création sur Shopify.");
    } finally {
      setPublishing(false);
    }
  };

  // --- RENDU : CONNEXION ---
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Héritage Bijoux</h1>
          <p className="text-gray-500 mb-8 font-medium">Espace Administration</p>
          <input 
            type="password" 
            placeholder="Mot de passe secret"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none mb-4 text-black"
          />
          <button 
            onClick={checkPassword}
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-20 md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 font-bold text-amber-600 hidden md:block text-xl border-b border-gray-50">
          HERITAGE
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <ChartBarIcon className="w-6 h-6" />
            <span className="hidden md:block font-semibold">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'create' ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <PlusCircleIcon className="w-6 h-6" />
            <span className="hidden md:block font-semibold">Créer une annonce</span>
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">
          {/* VUE DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <header>
                <h2 className="text-3xl font-bold text-gray-900">Tableau de bord</h2>
                <p className="text-gray-500">Aperçu de votre activité.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-gray-500 text-sm font-medium">Annonces créées</p>
                  <p className="text-3xl font-bold mt-1 text-black">24</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-gray-500 text-sm font-medium">Analyses IA</p>
                  <p className="text-3xl font-bold mt-1 text-black">152</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-gray-500 text-sm font-medium">Temps gagné</p>
                  <p className="text-3xl font-bold mt-1 text-amber-600">~12h</p>
                </div>
              </div>

              <div className="bg-amber-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
                <div>
                  <h3 className="text-xl font-bold mb-2">Prêt pour une nouvelle vente ?</h3>
                  <p className="text-amber-100">Utilisez plusieurs photos pour une expertise plus précise.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('create')}
                  className="bg-white text-amber-700 px-6 py-3 rounded-xl font-bold hover:bg-amber-50 transition-colors"
                >
                  Ajouter un bijou
                </button>
              </div>
            </div>
          )}

          {/* VUE CRÉATION IA */}
          {activeTab === 'create' && (
            <div className="space-y-8">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Expertise IA</h2>
                  <p className="text-gray-500">Plusieurs photos permettent une meilleure identification des poinçons.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Zone Photo Multiples */}
                <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={`data:image/jpeg;base64,${img}`} 
                          className="w-full h-32 object-cover rounded-xl border border-gray-100" 
                          alt="preview" 
                        />
                        <button 
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all">
                      <PlusCircleIcon className="w-8 h-8 text-gray-300" />
                      <span className="text-xs text-gray-400 mt-2 font-bold">Ajouter</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>

                  {images.length > 0 && !result && (
                    <button 
                      onClick={analyzeJewelry} 
                      disabled={loading}
                      className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 disabled:bg-gray-300 transition-all shadow-md"
                    >
                      {loading ? 'Analyse par Gemini...' : `Analyser ${images.length} photo(s)`}
                    </button>
                  )}
                </div>

                {/* Zone Résultat IA */}
                <div className="space-y-6">
                  {result ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                      <div className="flex items-center gap-2 text-green-600 font-bold mb-4">
                        <CheckCircleIcon className="w-6 h-6" />
                        Expertise terminée
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Titre suggéré</label>
                        <input 
                          className="w-full text-xl font-bold text-gray-900 border-b border-transparent focus:border-amber-500 outline-none" 
                          value={result.title}
                          onChange={(e) => setResult({...result, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Prix estimé (CHF)</label>
                        <input 
                          type="number"
                          className="w-full text-2xl font-bold text-amber-600 border-b border-transparent focus:border-amber-500 outline-none" 
                          value={result.price}
                          onChange={(e) => setResult({...result, price: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Description</label>
                        <textarea 
                          className="w-full bg-transparent text-gray-700 text-sm outline-none min-h-[150px]"
                          value={result.description.replace(/<[^>]*>?/gm, '')}
                          onChange={(e) => setResult({...result, description: e.target.value})}
                        />
                      </div>
                      <button 
                        onClick={publishToShopify} 
                        disabled={publishing}
                        className="w-full bg-black text-amber-400 py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition-all"
                      >
                        {publishing ? 'Publication...' : '🚀 Publier sur Shopify'}
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-100/50 rounded-3xl border border-gray-100 italic text-gray-400">
                      {loading ? "L'IA analyse vos photos sous plusieurs angles..." : "L'analyse apparaîtra ici."}
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
