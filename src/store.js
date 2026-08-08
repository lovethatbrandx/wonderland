const STORIES_KEY = 'wonderland_stories';
const CHARACTERS_KEY = 'wonderland_characters';
const SETTINGS_KEY = 'wonderland_settings';
const FOLDERS_KEY = 'wonderland_folders';
const PROFILE_KEY = 'wonderland_profile';
const PROMPTS_KEY = 'wonderland_prompts';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getItems(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

export { saveItems };

export const STORY_UPDATED_EVENT = 'wonderland:story-updated';

export function emitStoryUpdated(storyId) {
  window.dispatchEvent(new CustomEvent(STORY_UPDATED_EVENT, { detail: { storyId } }));
}

function getObject(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveObject(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

// Stories
export function getStories() {
  return getItems(STORIES_KEY);
}

export function getStory(id) {
  return getStories().find(s => s.id === id) || null;
}

export function createStory(title = 'Untitled Story', folderId = null) {
  const stories = getStories();
  const story = {
    id: generateId(),
    title,
    folderId,
    entries: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  stories.unshift(story);
  saveItems(STORIES_KEY, stories);
  return story;
}

export function updateStoryTitle(id, title) {
  const stories = getStories();
  const story = stories.find(s => s.id === id);
  if (story) {
    story.title = title;
    story.updatedAt = Date.now();
    saveItems(STORIES_KEY, stories);
  }
}

export function addStoryEntry(storyId, text, author = 'You') {
  const stories = getStories();
  const story = stories.find(s => s.id === storyId);
  if (!story) return null;
  const entry = {
    id: generateId(),
    text,
    author,
    timestamp: Date.now(),
  };
  story.entries.push(entry);
  story.updatedAt = Date.now();
  saveItems(STORIES_KEY, stories);
  return entry;
}

export function updateStoryEntry(storyId, entryId, text) {
  const stories = getStories();
  const story = stories.find(s => s.id === storyId);
  if (!story) return null;
  const entry = story.entries.find(e => e.id === entryId);
  if (!entry) return null;
  entry.text = text;
  entry.timestamp = Date.now();
  story.updatedAt = Date.now();
  saveItems(STORIES_KEY, stories);
  return entry;
}

export function deleteStory(id) {
  const stories = getStories().filter(s => s.id !== id);
  saveItems(STORIES_KEY, stories);
}

export function copyStoryAsBranch(sourceStoryId, afterEntryId, newTitle = null) {
  const stories = getStories();
  const sourceStory = stories.find(s => s.id === sourceStoryId);
  if (!sourceStory) return null;
  
  const entryIndex = sourceStory.entries.findIndex(e => e.id === afterEntryId);
  if (entryIndex === -1) return null;
  
  const copiedEntries = sourceStory.entries.slice(0, entryIndex + 1).map(e => ({
    ...e,
    id: generateId(),
  }));
  
  const branchTitle = newTitle || `Branch - ${sourceStory.title}`;
  
  const branchStory = {
    id: generateId(),
    title: branchTitle,
    folderId: sourceStory.folderId,
    entries: copiedEntries,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  stories.unshift(branchStory);
  saveItems(STORIES_KEY, stories);
  return branchStory;
}

export function updateStory(storyId, updates) {
  const stories = getStories();
  const story = stories.find(s => s.id === storyId);
  if (story) {
    Object.assign(story, updates);
    story.updatedAt = Date.now();
    saveItems(STORIES_KEY, stories);
  }
}

export function importStory(title, text, folderId = null) {
  const stories = getStories();
  const story = {
    id: generateId(),
    title,
    folderId,
    entries: [{
      id: generateId(),
      text,
      author: 'Imported',
      timestamp: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  stories.unshift(story);
  saveItems(STORIES_KEY, stories);
  return story;
}

export function importChatJson(title, json, folderId = null) {
  const stories = getStories();
  const entries = (json.messages || []).map(msg => {
    const author = msg.author === 'user' ? 'You' : 'AI';
    let text = msg.content || '';
    text = text.replace(/\ue200entity\ue202\[.*?\]\ue201/g, '');
    text = text.replace(/\ue200image_group\ue202\{.*?\}\ue201/g, '');
    text = text.replace(/\ue200.*?\ue201/g, '');
    text = text.replace(/\ue202.*?\ue201/g, '');
    text = text.replace(/\[line truncated to \d+ chars\]/g, '');
    text = text.trim();
    text = text.replace(/\n{3,}/g, '\n\n');
    return {
      id: generateId(),
      text,
      author,
      timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
    };
  }).filter(e => e.text.length > 0);

  const story = {
    id: generateId(),
    title,
    folderId,
    entries,
    createdAt: entries[0]?.timestamp || Date.now(),
    updatedAt: entries[entries.length - 1]?.timestamp || Date.now(),
  };
  stories.unshift(story);
  saveItems(STORIES_KEY, stories);
  return story;
}

// Folders
export function getFolders() {
  return getItems(FOLDERS_KEY);
}

export function createFolder(name, parentId = null) {
  const folders = getFolders();
  const folder = {
    id: generateId(),
    name,
    parentId,
  };
  folders.push(folder);
  saveItems(FOLDERS_KEY, folders);
  return folder;
}

export function updateFolder(id, updates) {
  const folders = getFolders();
  const folder = folders.find(f => f.id === id);
  if (folder) {
    Object.assign(folder, updates);
    saveItems(FOLDERS_KEY, folders);
  }
}

export function deleteFolder(id) {
  const folders = getFolders();
  const childFolders = folders.filter(f => f.parentId === id);
  childFolders.forEach(child => deleteFolder(child.id));
  const remaining = folders.filter(f => f.id !== id);
  saveItems(FOLDERS_KEY, remaining);
  const stories = getStories();
  stories.forEach(story => {
    if (story.folderId === id) {
      story.folderId = null;
    }
  });
  saveItems(STORIES_KEY, stories);
}

export function getSubfolders(parentId) {
  return getFolders().filter(f => f.parentId === parentId);
}

export function getStoriesInFolder(folderId) {
  return getStories().filter(s => s.folderId === folderId);
}

export function getRootStories() {
  return getStories().filter(s => s.folderId === null);
}

// Characters
export function getCharacters() {
  return getItems(CHARACTERS_KEY);
}

export function createCharacter(name, description = '', traits = '') {
  const characters = getCharacters();
  const character = {
    id: generateId(),
    name,
    description,
    traits,
    aliases: [],
    systemPrompt: '',
    knowledgeManual: '',
    knowledgeSources: [],
    nsfw: false,
    tags: [],
    sillyTavernData: null,
    createdAt: Date.now(),
  };
  characters.unshift(character);
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

export function updateCharacter(id, updates) {
  const characters = getCharacters();
  const character = characters.find(c => c.id === id);
  if (character) {
    Object.assign(character, updates);
    saveItems(CHARACTERS_KEY, characters);
  }
  return character;
}

export function deleteCharacter(id) {
  const characters = getCharacters().filter(c => c.id !== id);
  saveItems(CHARACTERS_KEY, characters);
}

export function addCharacterAlias(id, alias) {
  const characters = getCharacters();
  const character = characters.find(c => c.id === id);
  if (!character) return null;
  
  const trimmed = alias.trim();
  if (!trimmed) return null;
  
  if (character.aliases.includes(trimmed)) return null;
  
  const otherCharacter = characters.find(c => 
    c.id !== id && c.aliases.includes(trimmed)
  );
  if (otherCharacter) return null;
  
  character.aliases.push(trimmed);
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

export function removeCharacterAlias(id, alias) {
  const characters = getCharacters();
  const character = characters.find(c => c.id === id);
  if (!character) return null;
  
  character.aliases = character.aliases.filter(a => a !== alias);
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

export async function fetchUrlContent(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = stripHtml(html);
    return { content: text.slice(0, 10000), error: null };
  } catch (err) {
    return { content: '', error: err.message };
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function addCharacterKnowledgeSource(id, url, content) {
  const characters = getCharacters();
  const character = characters.find(c => c.id === id);
  if (!character) return null;
  
  character.knowledgeSources.push({
    id: generateId(),
    url,
    content,
    summary: null,
  });
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

export function removeCharacterKnowledgeSource(id, sourceId) {
  const characters = getCharacters();
  const character = characters.find(c => c.id === id);
  if (!character) return null;
  
  character.knowledgeSources = character.knowledgeSources.filter(s => s.id !== sourceId);
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

export function updateCharacterKnowledgeSource(id, sourceId, updates) {
  const characters = getCharacters();
  const character = characters.find(c => c.id === id);
  if (!character) return null;
  
  const source = character.knowledgeSources.find(s => s.id === sourceId);
  if (!source) return null;
  
  Object.assign(source, updates);
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

export function importSillyTavern(json) {
  const characters = getCharacters();
  const data = json.data || json;
  
  const name = data.name || 'Unnamed Character';
  const description = data.description || '';
  const traits = data.personality || '';
  const systemPrompt = data.system_prompt || '';
  const nsfw = data.nsfw || false;
  const tags = data.tags || [];
  
  let knowledgeManual = '';
  if (data.character_book && Array.isArray(data.character_book)) {
    knowledgeManual = data.character_book
      .map(entry => `[${entry.name}]\n${entry.content}`)
      .join('\n\n');
  }
  
  const character = {
    id: generateId(),
    name,
    description,
    traits,
    aliases: [],
    systemPrompt,
    knowledgeManual,
    knowledgeSources: [],
    nsfw,
    tags,
    sillyTavernData: json,
    createdAt: Date.now(),
  };
  
  characters.unshift(character);
  saveItems(CHARACTERS_KEY, characters);
  return character;
}

// Settings
export function getSettings() {
  return getObject(SETTINGS_KEY, {
    apiKey: '',
    models: [],
    defaultModel: '',
    defaultPrompt: '',
    ollamaUrl: 'http://localhost:11434',
    lmstudioUrl: 'http://localhost:1234/v1',
    supabaseUrl: '',
    supabaseAnonKey: ''
  });
}

export function saveSettings(settings) {
  saveObject(SETTINGS_KEY, settings);
}

// Profile
export function getProfile() {
  return getObject(PROFILE_KEY, {
    name: '',
    bio: '',
    writingStyle: '',
    preferredGenres: '',
    backgroundNotes: '',
  });
}

export function saveProfile(profile) {
  saveObject(PROFILE_KEY, profile);
}

// Theme
export function getTheme() {
  return localStorage.getItem('wonderland_theme') || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem('wonderland_theme', theme);
}

// System Prompts
export function getPrompts() {
  return getItems(PROMPTS_KEY);
}

export function createPrompt(name, content, favorite = false) {
  const prompts = getPrompts();
  const prompt = {
    id: generateId(),
    name,
    content,
    favorite,
    createdAt: Date.now(),
  };
  prompts.push(prompt);
  saveItems(PROMPTS_KEY, prompts);
  return prompt;
}

export function updatePrompt(id, updates) {
  const prompts = getPrompts();
  const prompt = prompts.find(p => p.id === id);
  if (prompt) {
    Object.assign(prompt, updates);
    saveItems(PROMPTS_KEY, prompts);
  }
  return prompt;
}

export function togglePromptFavorite(id) {
  const prompts = getPrompts();
  const prompt = prompts.find(p => p.id === id);
  if (prompt) {
    prompt.favorite = !prompt.favorite;
    saveItems(PROMPTS_KEY, prompts);
    return prompt;
  }
  return null;
}

export function deletePrompt(id) {
  const prompts = getPrompts().filter(p => p.id !== id);
  saveItems(PROMPTS_KEY, prompts);
}

// ===== EXPORT / BACKUP =====

export function exportStory(storyId, format = 'json') {
  const story = getStory(storyId);
  if (!story) return null;
  if (format === 'markdown') {
    let md = `# ${story.title}\n\n`;
    story.entries.forEach(e => {
      md += `**${e.author}** (${new Date(e.timestamp).toLocaleString()})\n\n${e.text}\n\n---\n\n`;
    });
    return md;
  }
  return JSON.stringify(story, null, 2);
}

export function exportAllStories(format = 'json') {
  const stories = getStories();
  if (format === 'markdown') {
    return stories.map(s => exportStory(s.id, 'markdown')).join('\n\n');
  }
  return JSON.stringify({ exportedAt: Date.now(), count: stories.length, stories }, null, 2);
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== CLOUD SYNC (Supabase) =====

async function fetchCloudCharacters() {
  const settings = getSettings();
  if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be set in Settings.');
  }
  const url = `${settings.supabaseUrl}/rest/v1/characters?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': settings.supabaseAnonKey,
      'Authorization': `Bearer ${settings.supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status}`);
  return await res.json();
}

function importCloudCharacter(supabaseChar) {
  // Skip if already exists by name (case-insensitive)
  const existing = getCharacters().find(c => c.name.toLowerCase() === (supabaseChar.name || '').toLowerCase());
  if (existing) return null;

  const char = createCharacter(
    supabaseChar.name,
    supabaseChar.description || '',
    supabaseChar.traits || ''
  );

  updateCharacter(char.id, {
    systemPrompt: supabaseChar.system_prompt || '',
    knowledgeManual: supabaseChar.knowledge_manual || '',
    knowledgeSources: Array.isArray(supabaseChar.knowledge_sources) ? supabaseChar.knowledge_sources : [],
    aliases: Array.isArray(supabaseChar.aliases) ? supabaseChar.aliases : [],
    nsfw: !!supabaseChar.nsfw,
    tags: Array.isArray(supabaseChar.tags) ? supabaseChar.tags : [],
    image: supabaseChar.image || '',
    sillyTavernData: supabaseChar.sillytavern_data || null
  });

  return char;
}

export async function syncFromSupabase() {
  const cloudChars = await fetchCloudCharacters();
  const localChars = getCharacters();
  const localNames = new Set(localChars.map(c => c.name.toLowerCase()));
  let imported = 0;
  for (const cc of cloudChars) {
    if (!localNames.has((cc.name || '').toLowerCase())) {
      importCloudCharacter(cc);
      imported++;
    }
  }
  return { total: cloudChars.length, imported };
}

