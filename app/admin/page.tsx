'use client';

import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  PlusCircleIcon, 
  PhotoIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  // --- ÉTATS ---
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');

  // États pour l'IA et l'image
  const [image, setImage] = useState<string | null>(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const base64String = resultStr.split(',')[1];
        if (base64String) {
          setImage(base64String);
          setResult(null); // Reset le résultat si on change d'image
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeJewelry = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      alert("Erreur lors de l'analyse IA.");
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
        alert('Félicitations ! Le bijou est maintenant en brouillon sur votre Shopify.');
        setResult(null);
        setImage(null);
        setActiveTab('dashboard'); // Retour au dashboard après succès
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

  // --- RENDU : DASHBOARD PRINCIPAL ---
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">
          
          {/* VUE DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <header>
                <h2 className="text-3xl font-bold text-gray-900">Tableau de bord</h2>
                <p className="text-gray-500">Aperçu de votre activité aujourd'hui.</p>
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

              <div className="bg-amber-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-amber-200">
                <div>
                  <h3 className="text-xl font-bold mb-2">Prêt pour une nouvelle vente ?</h3>
                  <p className="text-amber-100">Prenez en photo votre bijou et laissez l'IA s'occuper de tout.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('create')}
                  className="bg-white text-amber-700 px-6 py-3 rounded-xl font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
                >
                  Créer une annonce à partir de photos
                </button>
              </div>
            </div>
          )}

          {/* VUE CRÉATION IA */}
          {activeTab === 'create' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Expertise IA</h2>
                  <p className="text-gray-500">Générez une annonce complète en quelques secondes.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="text-gray-500 hover:text-black font-medium"
                >
                  Annuler
                </button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Zone Photo */}
                <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                  {!image ? (
                    <>
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                        <PhotoIcon className="w-8 h-8 text-amber-600" />
                      </div>
                      <p className="text-gray-900 font-bold mb-1">Prendre ou choisir une photo</p>
                      <p className="text-gray-400 text-sm mb-6">Face, profil ou détails (poinçon)</p>
                      <label className="bg-black text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-gray-800 transition-all font-bold">
                        Sélectionner l'image
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                      </label>
                    </>
                  ) : (
                    <div className="relative w-full">
                      <img 
                        src={`data:image/jpeg;base64,${image}`} 
                        alt="Preview" 
                        className="w-full h-auto rounded-xl shadow-lg border border-gray-100" 
                      />
                      {!result && (
                        <button 
                          onClick={analyzeJewelry} 
                          disabled={loading}
                          className="mt-6 w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 disabled:bg-gray-300 shadow-md transition-all"
                        >
                          {loading ? 'Analyse par Gemini...' : 'Lancer l\'expertise IA'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Zone Résultat IA */}
                <div className="space-y-6">
                  {result ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-2 text-green-600 font-bold mb-4">
                        <CheckCircleIcon className="w-6 h-6" />
                        Expertise terminée
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Titre suggéré</label>
                        <p className="text-xl font-bold text-gray-900">{result.title}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prix estimé</label>
                        <p className="text-2xl font-bold text-amber-600">{result.price} CHF</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                        <div className="text-gray-700 text-sm prose" dangerouslySetInnerHTML={{ __html: result.description }} />
                      </div>
                      <button 
                        onClick={publishToShopify} 
                        disabled={publishing}
                        className="w-full bg-black text-amber-400 py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-3 shadow-lg"
                      >
                        {publishing ? 'Publication...' : '🚀 Publier sur Shopify'}
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-100/50 rounded-3xl border border-gray-100 italic text-gray-400">
                      {loading ? "L'intelligence artificielle analyse les détails de votre bijou..." : "Les résultats de l'analyse apparaîtront ici après l'envoi de la photo."}
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
