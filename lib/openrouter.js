async function callOpenRouter(systemPrompt, userPrompt) {
  const apiKey = process.env.OLLAMA_API_KEY;
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "gpt-oss:20b";

  if (!apiKey) throw new Error("OLLAMA_API_KEY is not set");

  const isCloud = baseUrl.includes("ollama.com");
  const endpoint = `${baseUrl}/api/chat`;

  let response;
  if (isCloud) {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });
  } else {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ollama API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  let raw;
  if (isCloud) {
    raw = data.message?.content;
  } else {
    raw = data.choices?.[0]?.message?.content;
  }

  if (!raw) {
    throw new Error("Ollama returned no content");
  }

  let parsed = null;
  try { parsed = JSON.parse(raw); } catch {}
  if (!parsed) {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) try { parsed = JSON.parse(m[1].trim()); } catch {}
  }
  if (!parsed) {
    const m = raw.match(/(\{[\s\S]*\})/);
    if (m) try { parsed = JSON.parse(m[1]); } catch {}
  }
  if (!parsed) {
    const m = raw.match(/(\[[\s\S]*\])/);
    if (m) try { parsed = JSON.parse(m[1]); } catch {}
  }
  if (!parsed) throw new Error("Could not parse JSON from Ollama response");

  return parsed;
}

module.exports = { callOpenRouter };
