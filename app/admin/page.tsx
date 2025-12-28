'use client';

import React, { useState } from 'react';

export default function AdminPage() {
  // États pour la sécurité
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // États pour l'IA et l'image
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 1. Vérification du mot de passe
  const checkPassword = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Accès refusé : Mot de passe incorrect.");
    }
  };

  // 2. Gestion de la photo (Conversion en Base64 pour Gemini)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        // CORRECTION ICI : On s'assure que la chaîne existe avant de la donner à setImage
        const base64String = resultStr.split(',')[1];
        if (base64String) {
          setImage(base64String);
        } else {
          setImage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. Appel à l'API Gemini (Cerveau)
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

  // 4. Envoi vers Shopify (Bras)
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
      }
    } catch (error) {
      alert("Erreur lors de la création sur Shopify.");
    } finally {
      setPublishing(false);
    }
  };

  // --- INTERFACE DE CONNEXION ---
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
        <h1 style={{ color: '#d4af37' }}>Héritage Bijoux - Accès Privé</h1>
        <div style={{ marginTop: '20px' }}>
          <input 
            type="password" 
            placeholder="Entrez votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc', width: '250px', color: '#000' }}
          />
          <button 
            onClick={checkPassword}
            style={{ padding: '12px 25px', marginLeft: '10px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // --- INTERFACE D'EXPERTISE (UNE FOIS CONNECTÉ) ---
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #d4af37', marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '10px' }}>Expertise IA - Héritage Bijoux</h1>
      </header>
      
      <section style={{ marginBottom: '30px', textAlign: 'center' }}>
        <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>
          Prendre une photo du bijou (Face, Profil ou Poinçon)
        </label>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handleImageChange}
          style={{ marginBottom: '20px' }}
        />
        
        {image && !result && (
          <button 
            onClick={analyzeJewelry} 
            disabled={loading}
            style={{ width: '100%', padding: '15px', backgroundColor: '#d4af37', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Analyse par Gemini en cours...' : 'Lancer l\'expertise IA'}
          </button>
        )}
      </section>

      {result && (
        <section style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Résultat de l'analyse</h2>
          <p><strong>Titre suggéré :</strong> {result.title}</p>
          <p><strong>Prix estimé :</strong> {result.price} CHF</p>
          <div style={{ backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Description générée :</p>
            <div dangerouslySetInnerHTML={{ __html: result.description }} />
          </div>
          
          <button 
            onClick={publishToShopify} 
            disabled={publishing}
            style={{ width: '100%', marginTop: '20px', padding: '15px', backgroundColor: '#000', color: 'gold', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {publishing ? 'Publication...' : 'Confirmer et Publier sur Shopify'}
          </button>
        </section>
      )}
    </div>
  );
}
