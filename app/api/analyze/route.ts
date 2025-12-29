import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  console.log("--- DÉBUT DE L'ANALYSE GEMINI MULTI-PHOTOS ---");

  try {
    // 1. Vérification de la clé API
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("ERREUR: La variable GOOGLE_GENERATIVE_AI_API_KEY est manquante.");
      return new Response(JSON.stringify({ error: "Clé API manquante." }), { status: 500 });
    }

    // 2. Vérification des données (Support multi-photos)
    const { imagesBase64 } = await req.json();
    if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
      console.error("ERREUR: Aucun tableau d'images reçu.");
      return new Response(JSON.stringify({ error: "Veuillez fournir au moins une image." }), { status: 400 });
    }
    console.log(`${imagesBase64.length} image(s) reçue(s), envoi à Gemini...`);

    // 3. Initialisation de Gemini 2.0 Flash (Version 2025)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", // Modèle le plus rapide et précis en 2025
      generationConfig: { responseMimeType: "application/json" } 
    });

    // 4. Prompt d'expertise "Conservateur"
    const prompt = `Tu es l'expert joaillier principal de "Héritage Bijoux" en Suisse. 
    Analyse ces photos (vue d'ensemble, profil, poinçon) pour identifier le bijou.
    
    CONSIGNE DE PRIX : Donne une estimation "boutique en ligne" RÉALISTE et CONSERVATRICE en CHF. 
    Ne te base pas sur des prix d'enchères records. Si un doute subsiste sur la pureté ou l'état, vise la fourchette basse.
    
    RETOURNE UNIQUEMENT UN OBJET JSON :
    {
      "title": "Nom luxueux et court du bijou",
      "description": "Description élégante (métal, pierres, époque, état) mentionnant la livraison sécurisée par la Poste Suisse",
      "price": 1200,
      "tags": ["or", "vintage", "expertisé", "suisse", "ancien"]
    }`;

    // 5. Préparation des contenus (Texte + toutes les Images)
    const imageParts = imagesBase64.map((base64: string) => ({
      inlineData: { data: base64, mimeType: "image/jpeg" } // Format d'image standard
    }));

    // 6. Appel à l'IA
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    // 7. Nettoyage et validation du JSON
    let cleanJson;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      cleanJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
    } catch (parseError) {
      console.error("ERREUR de lecture du JSON IA:", responseText);
      return new Response(JSON.stringify({ error: "Format JSON IA invalide." }), { status: 500 });
    }

    console.log("--- ANALYSE TERMINÉE : ", cleanJson.title, " ---");
    return new Response(JSON.stringify(cleanJson), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("ERREUR CRITIQUE :", error.message);
    return new Response(JSON.stringify({ 
      error: "Erreur interne du serveur",
      details: error.message 
    }), { status: 500 });
  }
}
