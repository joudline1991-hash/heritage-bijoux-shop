import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  console.log("--- DÉBUT DE L'ANALYSE GEMINI ---");

  try {
    // 1. Vérification de la clé API
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("ERREUR: La variable GOOGLE_GENERATIVE_AI_API_KEY est manquante dans Vercel.");
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète (Clé API manquante)." }), { status: 500 });
    }

    // 2. Vérification des données entrantes
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      console.error("ERREUR: Aucune image reçue dans la requête.");
      return new Response(JSON.stringify({ error: "Aucune image fournie." }), { status: 400 });
    }
    console.log("Image reçue (Base64), envoi à Gemini...");

    // 3. Initialisation de Gemini 2.0 Flash (Version 2025)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" } // Force le format JSON
    });

    const prompt = `Tu es un expert en haute joaillerie pour Héritage Bijoux en Suisse. 
    Analyse cette photo et génère une fiche produit luxueuse.
    RETOURNE UNIQUEMENT UN OBJET JSON avec ces champs :
    {
      "title": "Nom du bijou",
      "description": "Description détaillée avec métal, pierres, époque et mention de La Poste Suisse",
      "price": 1250,
      "tags": ["or", "vintage", "expertisé", "suisse"]
    }`;

    // 4. Appel à l'IA
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
    ]);

    const responseText = result.response.text();
    console.log("Réponse brute de Gemini reçue.");

    // 5. Nettoyage et validation du JSON
    let cleanJson;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      cleanJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
      console.log("JSON analysé avec succès :", cleanJson.title);
    } catch (parseError) {
      console.error("ERREUR de lecture du JSON produit par l'IA:", responseText);
      return new Response(JSON.stringify({ error: "L'IA a produit un format incorrect." }), { status: 500 });
    }

    console.log("--- ANALYSE TERMINÉE AVEC SUCCÈS ---");
    return new Response(JSON.stringify(cleanJson), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    // Le côté "Bavard" : on affiche tout dans les logs Vercel
    console.error("ERREUR CRITIQUE DANS LA ROUTE API :");
    console.error("Message :", error.message);
    console.error("Stack :", error.stack);

    return new Response(JSON.stringify({ 
      error: "Erreur interne du serveur",
      details: error.message 
    }), { status: 500 });
  }
}
