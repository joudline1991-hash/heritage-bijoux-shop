import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Tu es un expert en bijoux anciens pour le marché suisse. Analyse cette photo. 
    Retourne obligatoirement un objet JSON pur avec ces champs :
    - title: un titre prestigieux
    - description: description d'expert (métal, style, pierres, époque) mentionnant la Poste Suisse
    - price: estimation en CHF (nombre entier)
    - tags: tableau de 4 mots-clés (ex: ["or", "vintage", "diamant"]).`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
    ]);

    const responseText = result.response.text();
    // Extraction du JSON au cas où l'IA ajoute du texte autour
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

    return new Response(cleanJson, { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erreur d'analyse" }), { status: 500 });
  }
}
