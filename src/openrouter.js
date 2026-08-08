const BASE_URL = 'https://openrouter.ai/api/v1';
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

export async function fetchModels(apiKey) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Wonderland',
        },
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid API key');
        if (res.status === 403) throw new Error('API key may be expired or invalid');
        throw new Error(`Failed to fetch models: ${res.status}`);
      }
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      lastError = err;
      console.error(`[OPENROUTER] fetchModels attempt ${attempt} failed:`, err.message);
      if (attempt < MAX_RETRIES && err.message.includes('timed out')) {
        await sleep(Math.pow(2, attempt - 1) * 1000);
      } else if (attempt >= MAX_RETRIES) {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function chatCompletion(apiKey, model, messages, onChunk, contextSummary = null) {
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
      const res = await fetchWithTimeout(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Wonderland',
        },
        body: JSON.stringify({
          model,
          messages: processedMessages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[OPENROUTER] Error response:', err);
        throw new Error(err || `API error: ${res.status}`);
      }

      return parseStreamingResponse(res, onChunk);
    } catch (err) {
      lastError = err;
      console.error(`[OPENROUTER] chatCompletion attempt ${attempt} failed:`, err.message);
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
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });
    buffer += decoded;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('data: ')) {
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            if (onChunk) onChunk(fullText);
          }
        } catch (_) {
          // JSON parse error in stream, skip
        }
      }
    }
  }

  return fullText;
}
