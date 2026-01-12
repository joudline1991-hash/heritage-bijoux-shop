export async function POST(req: Request) {
  console.log("--- DÉBUT DE LA CRÉATION SHOPIFY (MODE PUBLIC) ---");

  try {
    // 1. Récupération et vérification des données reçues
    const data = await req.json();
    console.log("Données reçues :", JSON.stringify(data));

    if (!data.title || !data.price) {
      console.error("ERREUR: Données incomplètes.");
      return new Response(JSON.stringify({ error: "Données manquantes." }), { status: 400 });
    }

    // 2. Vérification des configurations serveur
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

    if (!domain || !token) {
      console.error("ERREUR: Configuration Shopify manquante.");
      return new Response(JSON.stringify({ error: "Config serveur incomplète." }), { status: 500 });
    }

    // 3. Préparation de la requête Shopify
    const shopifyUrl = `https://${domain}/admin/api/2025-01/products.json`;

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
          // --- CHANGEMENT MAJEUR ICI ---
          status: "active", // Rend le produit visible immédiatement sur le site
          published: true,  // Confirme la publication
          variants: [
            { 
              price: data.price.toString(),
              // inventory_management: null signifie "Ne pas suivre le stock".
              // Le produit sera donc achetable tout de suite sans marquer "Épuisé".
              // Vous pourrez mettre le stock à "1" manuellement plus tard si besoin.
              inventory_management: null 
            }
          ],
          tags: data.tags ? data.tags.join(", ") : "Expertisé IA",
        },
      }),
    });

    // 4. Analyse de la réponse
    const result = await response.json();

    if (!response.ok) {
      console.error("ERREUR SHOPIFY API :", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        error: "Refus de Shopify", 
        details: result 
      }), { status: response.status });
    }

    console.log("--- PRODUIT EN LIGNE ! ID:", result.product?.id);
    
    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("ERREUR CRITIQUE :", error.message);
    return new Response(JSON.stringify({ 
      error: "Erreur serveur",
      details: error.message 
    }), { status: 500 });
  }
}
