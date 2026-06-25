const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/airesume",
      "X-Title": "AI Resume Optimizer",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error("OpenRouter returned no choices");
  }

  const raw = data.choices[0].message.content;

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
  if (!parsed) throw new Error("Could not parse JSON from OpenRouter response");

  return parsed;
}

module.exports = { callOpenRouter };
