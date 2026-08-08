const TIMEOUT_MS = 60000;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

export async function fetchModels(baseUrl) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/tags`, {}, 10000);
      if (!res.ok) throw new Error(`Failed to fetch Ollama models: ${res.status}`);
      const data = await res.json();
      return (data.models || []).map(m => ({
        id: m.name,
        name: m.name,
      }));
    } catch (err) {
      lastError = err;
      console.error(`[OLLAMA] fetchModels attempt ${attempt} failed:`, err.message);
      if (attempt < MAX_RETRIES && err.message.includes('timed out')) {
        await sleep(Math.pow(2, attempt - 1) * 1000);
      } else if (attempt >= MAX_RETRIES) {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function chatCompletion(baseUrl, model, messages, onChunk, contextSummary = null) {
  const processedMessages = [...messages];

  if (contextSummary) {
    processedMessages[0] = {
      ...processedMessages[0],
      content: `${contextSummary}\n\n${processedMessages[0]?.content || ''}`
    };
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: processedMessages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[OLLAMA] Error response:', err);
        throw new Error(err || `Ollama error: ${res.status}`);
      }

      return parseStreamingResponse(res, onChunk);
    } catch (err) {
      lastError = err;
      console.error(`[OLLAMA] chatCompletion attempt ${attempt} failed:`, err.message);
      if (attempt < MAX_RETRIES && (err.message.includes('timed out') || err.message.includes('aborted'))) {
        await sleep(Math.pow(2, attempt - 1) * 1000);
      } else if (attempt >= MAX_RETRIES) {
        throw err;
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

async function parseStreamingResponse(res, onChunk) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });

    try {
      const json = JSON.parse(decoded);
      const content = json.message?.content;
      if (content) {
        fullText += content;
        if (onChunk) onChunk(fullText);
      }
    } catch (_) {
      // non-JSON line in stream, skip
    }
  }

  return fullText;
}
