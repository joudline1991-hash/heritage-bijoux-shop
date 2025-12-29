import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  console.log("--- DÉBUT DE L'ANALYSE GEMINI MULTI-PHOTOS (MODE STRICT) ---");

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

    // 3. Initialisation de Gemini 2.0 Flash
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", 
      // Cette option force Gemini à répondre en JSON, ce qui évite beaucoup d'erreurs
      generationConfig: { responseMimeType: "application/json" } 
    });

    // 4. LE NOUVEAU PROMPT "STRICT & MATHÉMATIQUE"
    const prompt = `Tu es l'expert joaillier principal de "Héritage Bijoux" en Suisse.
    Analyse ces photos. Cherche activement des indices techniques : poinçons, et surtout si le bijou est posé sur une BALANCE (pour le poids) ou à côté d'une RÈGLE.
    
    ESTIMATION DU PRIX (RÈGLES DE CALCUL STRICTES) :
    1. CORRECTION : Tes estimations précédentes étaient trop hautes de 20%. Applique une baisse immédiate.
    2. MÉTHODE : Ne devine pas la "valeur artistique". Calcule la "Valeur Métal" + Marge Commerciale.
       - Base : Poids estimé (ou lu sur balance) x Cours de l'or 18k (env. 50 CHF/g).
       - Marge : Ajoute maximum 30% à 50% pour le travail et l'époque.
       - Exemple : Une bague de 5g = 250 CHF d'or -> Prix boutique env. 350-400 CHF (pas 800 !).
    3. EXCEPTION : Si c'est une grande marque signée (Cartier, Chopard) ou une pierre > 1 carat, tu peux monter le prix.
    
    RETOURNE UNIQUEMENT UN OBJET JSON :
    {
      "title": "Titre court et précis (ex: Bague Or 750 Saphir)",
      "description": "Description commerciale vendeuse pour la Suisse. Mentionne l'état, les poinçons visibles et la livraison sécurisée par la Poste Suisse.",
      "price": 350,
      "tags": ["or 750", "vintage", "expertisé", "bague", "occasion"]
    }`;

    // 5. Préparation des contenus (Texte + Images)
    const imageParts = imagesBase64.map((base64: string) => ({
      inlineData: { data: base64, mimeType: "image/jpeg" }
    }));

    // 6. Appel à l'IA
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    // 7. Nettoyage et validation du JSON
    let cleanJson;
    try {
      // On nettoie au cas où l'IA rajoute du texte Markdown ```json ... ```
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      cleanJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
    } catch (parseError) {
      console.error("ERREUR de lecture du JSON IA:", responseText);
      return new Response(JSON.stringify({ error: "L'IA n'a pas renvoyé un format valide. Réessayez." }), { status: 500 });
    }

    console.log("--- ANALYSE TERMINÉE : ", cleanJson.title, " - PRIX : ", cleanJson.price, "CHF ---");
    
    return new Response(JSON.stringify(cleanJson), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("ERREUR CRITIQUE DANS L'API:", error.message);
    return new Response(JSON.stringify({ 
      error: "Erreur interne du serveur lors de l'analyse.",
      details: error.message 
    }), { status: 500 });
  }
}
