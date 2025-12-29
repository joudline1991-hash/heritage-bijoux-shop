export async function POST(req: Request) {
  console.log("--- DÉBUT DE LA CRÉATION SHOPIFY ---");

  try {
    // 1. Récupération et vérification des données reçues
    const data = await req.json();
    console.log("Données reçues de l'analyse IA :", JSON.stringify(data));

    if (!data.title || !data.price) {
      console.error("ERREUR: Données de produit incomplètes (titre ou prix manquant).");
      return new Response(JSON.stringify({ error: "Données manquantes pour créer le produit." }), { status: 400 });
    }

    // 2. Vérification des configurations serveur
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

    if (!domain || !token) {
      console.error("ERREUR: Configuration Shopify manquante dans Vercel (Domain ou Token).");
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète." }), { status: 500 });
    }

    // 3. Préparation de la requête Shopify
    const shopifyUrl = `https://${domain}/admin/api/2025-01/products.json`;
    console.log("Tentative d'envoi vers Shopify :", shopifyUrl);

    const response = await fetch(shopifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        product: {
          title: data.title,
          body_html: data.description,
          variants: [{ price: data.price.toString() }],
          tags: data.tags ? data.tags.join(", ") : "Expertisé IA",
          status: "draft", // Reste en brouillon pour votre validation finale
        },
      }),
    });

    // 4. Analyse de la réponse de Shopify
    const result = await response.json();

    if (!response.ok) {
      console.error("ERREUR SHOPIFY API :", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        error: "Shopify a refusé la création", 
        details: result 
      }), { status: response.status });
    }

    console.log("--- PRODUIT CRÉÉ AVEC SUCCÈS SUR SHOPIFY --- ID:", result.product?.id);
    
    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("ERREUR CRITIQUE DANS SHOPIFY-CREATE :");
    console.error("Message :", error.message);
    
    return new Response(JSON.stringify({ 
      error: "Erreur interne lors de la création Shopify",
      details: error.message 
    }), { status: 500 });
  }
}
