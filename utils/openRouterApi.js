const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// callOpenRouter(systemPrompt, userPrompt)
// ---------------------------------------------------------------------------
//
// Sends a chat-completion request to OpenRouter and returns the parsed JSON
// content from the model.  The caller is expected to have loaded env vars
// via dotenv before this module is required.
// ---------------------------------------------------------------------------

async function callOpenRouter(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  console.log("[openrouter] Calling API …");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
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
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`OpenRouter API request timed out after ${API_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  console.log(`[openrouter] Response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[openrouter] API error (${response.status}):`, errorBody);
    throw new Error(
      `OpenRouter API returned ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    console.error("[openrouter] No choices in response:", data);
    throw new Error("OpenRouter returned no choices");
  }

  const raw = data.choices[0].message.content;
  console.log("[openrouter] Raw response length:", raw.length);

  // ----- Extract JSON from the response ------------------------------------
  //
  // LLMs sometimes wrap JSON in markdown fences or add preamble text.
  // We try several strategies in order:
  //   1. Direct JSON.parse on the full string.
  //   2. Extract content between ```json / ``` fences (try ALL fences).
  //   3. Extract all { … } blocks and try each one.
  //   4. Extract all [ … ] blocks and try each one.
  // -------------------------------------------------------------------------

  let parsed = null;

  // Attempt 1 – clean parse
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    // fall through
  }

  // Attempt 2 – strip markdown fences (try all fences, not just first)
  if (!parsed) {
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    let fenceMatch;
    while ((fenceMatch = fenceRegex.exec(raw)) !== null && !parsed) {
      try {
        parsed = JSON.parse(fenceMatch[1].trim());
      } catch (_) {
        // try next fence
      }
    }
  }

  // Attempt 3 – find all { } blocks (non-greedy, nested-aware)
  if (!parsed) {
    const candidates = raw.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
    for (const candidate of candidates) {
      try {
        parsed = JSON.parse(candidate);
        break;
      } catch (_) {
        // try next candidate
      }
    }
  }

  // Attempt 4 – find all [ ] block candidates
  if (!parsed) {
    const candidates = raw.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/g) || [];
    for (const candidate of candidates) {
      try {
        parsed = JSON.parse(candidate);
        break;
      } catch (_) {
        // try next candidate
      }
    }
  }

  if (!parsed) {
    console.error("[openrouter] Failed to extract JSON from response");
    console.error("[openrouter] Raw content:", raw);
    throw new Error(
      "Could not parse JSON from OpenRouter response. Raw content:\n" + raw
    );
  }

  console.log("[openrouter] Successfully parsed response");
  return parsed;
}

// ---------------------------------------------------------------------------
// batchProcessSections(sections, prompts)
// ---------------------------------------------------------------------------
//
// Process each non-empty section of a resume through OpenRouter sequentially.
//
//   sections – object like { summary: "...", skills: "...", experience: "..." }
//   prompts  – object like { summary: "Improve this summary: {text}", … }
//
// Each prompt template may contain the placeholder {text} which will be
// replaced with the section content.  Returns an object with the same keys,
// each value being the model's parsed response for that section.
// ---------------------------------------------------------------------------

async function batchProcessSections(sections, prompts) {
  const results = {};
  const sectionKeys = Object.keys(sections);

  console.log(
    `[batch] Processing ${sectionKeys.length} section(s): ${sectionKeys.join(", ")}`
  );

  for (const key of sectionKeys) {
    const content = sections[key];

    // Skip empty / whitespace-only sections
    if (!content || content.trim().length === 0) {
      console.log(`[batch] Skipping empty section: "${key}"`);
      results[key] = { skipped: true, reason: "empty section" };
      continue;
    }

    const promptTemplate = prompts[key];

    if (!promptTemplate) {
      console.log(`[batch] No prompt template for "${key}", returning raw content`);
      results[key] = { original: content };
      continue;
    }

    const userPrompt = promptTemplate.replace(/\{text\}/g, content);

    try {
      console.log(`[batch] Processing "${key}" (${content.length} chars) …`);
      const result = await callOpenRouter(
        "You are an expert resume writer and career coach.",
        userPrompt
      );
      results[key] = result;
      console.log(`[batch] Done "${key}"`);
    } catch (err) {
      console.error(`[batch] Error processing "${key}":`, err.message);
      results[key] = { error: err.message, original: content };
    }
  }

  console.log("[batch] All sections processed");
  return results;
}

module.exports = { callOpenRouter, batchProcessSections };
