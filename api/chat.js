// api/chat.js — Relais sécurisé vers l'API Anthropic.
// Ta clé API n'est JAMAIS exposée au navigateur : elle reste ici, côté serveur.
// Sur Vercel, ajoute une variable d'environnement nommée ANTHROPIC_API_KEY.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body || "{}");
    if (!body) body = {};
    const { system, messages } = body;

    // Prompt caching : on marque le system prompt (qui contient toute la notice)
    // comme "cacheable". Lors des requêtes suivantes dans la fenêtre de 5 min,
    // la notice est relue depuis le cache (~90 % moins cher) au lieu d'être
    // retraitée intégralement à chaque message.
    const systemBlocks = system
      ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
      : undefined;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemBlocks,
        messages: messages,
      }),
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "proxy_error", detail: String(e) });
  }
}
