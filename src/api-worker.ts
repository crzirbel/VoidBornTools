export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      return handleFeedback(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleFeedback(request: Request, env: any): Promise<Response> {
  try {
    const data: any = await request.json();
    const { title, description, reporter, honeypot } = data;

    // Bots fill hidden fields; humans won't see this field at all
    if (honeypot) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "Missing title or description" }), { status: 400 });
    }

    const body = `${description}\n\n---\n*Submitted via in-app feedback form${reporter ? ` by ${reporter}` : ""}*`;

    const ghRes = await fetch("https://api.github.com/repos/crzirbel/VoidBornTools/issues", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "voidborn-feedback-worker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels: ["player-feedback"] }),
    });

    if (!ghRes.ok) {
      return new Response(JSON.stringify({ error: "GitHub API error" }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}