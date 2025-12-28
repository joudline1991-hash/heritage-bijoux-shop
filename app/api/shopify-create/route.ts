export async function POST(req: Request) {
  try {
    const data = await req.json();

    const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/products.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        product: {
          title: data.title,
          body_html: data.description,
          variants: [{ price: data.price.toString() }],
          tags: data.tags.join(", "),
          status: "draft", // Créé en brouillon pour que vous puissiez le vérifier avant publication
        },
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erreur Shopify" }), { status: 500 });
  }
}
