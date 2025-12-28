'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fonction pour transformer l'image en texte pour l'IA
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Appel à Gemini pour l'analyse
  const analyzeJewelry = async () => {
    setLoading(true);
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: image }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  // 2. Envoi vers votre inventaire Shopify
  const publishToShopify = async () => {
    await fetch('/api/shopify-create', {
      method: 'POST',
      body: JSON.stringify(result),
    });
    alert('Bijou ajouté avec succès sur Héritage Bijoux !');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      <h1>Expertise Héritage Bijoux</h1>
      
      <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} />
      
      {image && <button onClick={analyzeJewelry} disabled={loading}>
        {loading ? 'Analyse par Gemini en cours...' : 'Analyser le bijou'}
      </button>}

      {result && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>{result.title}</h3>
          <p><strong>Prix suggéré :</strong> {result.price} CHF</p>
          <div dangerouslySetInnerHTML={{ __html: result.description }} />
          <button onClick={publishToShopify} style={{ background: 'gold', padding: '10px' }}>
            Confirmer et Publier sur le site
          </button>
        </div>
      )}
    </div>
  );
}
