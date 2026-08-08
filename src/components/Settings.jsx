import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Server, 
  MessageSquare,
  Bot,
  Cloud,
  Star,
  Trash2,
  Plus,
  Search,
  Check,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { getSettings, saveSettings, getPrompts, createPrompt, updatePrompt, deletePrompt, togglePromptFavorite } from '../store';
import { fetchModels as fetchOpenRouterModels } from '../openrouter';
import { fetchModels as fetchOllamaModels } from '../ollama';
import { fetchModels as fetchLmStudioModels } from '../lmstudio';

const TABS = [
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'ollama', label: 'Ollama', icon: Server },
  { id: 'lmstudio', label: 'LM Studio', icon: Server },
  { id: 'cloud', label: 'Cloud Sync', icon: Cloud },
  { id: 'prompts', label: 'System Prompts', icon: MessageSquare },
  { id: 'models', label: 'Models', icon: Bot },
];

export default function Settings({ onRefresh }) {
  const [settings, setSettings] = useState(getSettings);
  const [activeTab, setActiveTab] = useState('api');
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434');
  const [lmstudioUrl, setLmstudioUrl] = useState(settings.lmstudioUrl || 'http://localhost:1234/v1');
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showOnlyAdded, setShowOnlyAdded] = useState(false);
  const [searchProvider, setSearchProvider] = useState('openrouter');
  const [keyStatus, setKeyStatus] = useState({ type: '', message: '' });
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState('');
  const [lmstudioModels, setLmstudioModels] = useState([]);
  const [lmstudioLoading, setLmstudioLoading] = useState(false);
  const [lmstudioError, setLmstudioError] = useState('');
  const [prompts, setPrompts] = useState(getPrompts);
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [promptForm, setPromptForm] = useState({ name: '', content: '' });
  const [showPromptForm, setShowPromptForm] = useState(false);

  const addedIds = new Set(settings.models.map(m => m.id));

  async function handleSaveKey() {
    const key = apiKeyInput.trim();
    if (!key) { setKeyStatus({ type: 'error', message: 'Please enter an API key' }); return; }
    setKeyStatus({ type: 'loading', message: 'Validating...' });
    try {
      await fetchOpenRouterModels(key);
      const updated = { ...settings, apiKey: key };
      setSettings(updated);
      saveSettings(updated);
      setKeyStatus({ type: 'success', message: 'Key saved successfully!' });
      if (onRefresh) onRefresh();
    } catch (err) { setKeyStatus({ type: 'error', message: err.message }); }
  }

  function handleSaveOllamaUrl() {
    const updated = { ...settings, ollamaUrl: ollamaUrl.trim() || 'http://localhost:11434' };
    setSettings(updated);
    saveSettings(updated);
    if (onRefresh) onRefresh();
  }

  function handleSaveLmstudioUrl() {
    const updated = { ...settings, lmstudioUrl: lmstudioUrl.trim() || 'http://localhost:1234/v1' };
    setSettings(updated);
    saveSettings(updated);
    if (onRefresh) onRefresh();
  }

  function handleSaveSupabase() {
    const updated = {
      ...settings,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    };
    setSettings(updated);
    saveSettings(updated);
    if (onRefresh) onRefresh();
  }

  async function handleSearch() {
    if (searchProvider === 'openrouter' && !settings.apiKey?.trim()) { setSearchError('Set your API key first.'); return; }
    setSearching(true);
    setSearchError('');
    try {
      let all;
      if (searchProvider === 'openrouter') {
        all = await fetchOpenRouterModels(settings.apiKey);
      } else if (searchProvider === 'ollama') {
        all = await fetchOllamaModels(settings.ollamaUrl || 'http://localhost:11434');
      } else if (searchProvider === 'lmstudio') {
        all = await fetchLmStudioModels(settings.lmstudioUrl || 'http://localhost:1234/v1');
      }
      const filtered = searchQuery.trim() ? all.filter(m => m.id.toLowerCase().includes(searchQuery.toLowerCase()) || (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase()))) : all;
      setSearchResults(filtered.slice(0, 100));
    } catch (err) { setSearchError(err.message); }
    finally { setSearching(false); }
  }

  async function handleRefreshOllama() {
    setOllamaLoading(true);
    setOllamaError('');
    try { setOllamaModels(await fetchOllamaModels(settings.ollamaUrl || 'http://localhost:11434')); }
    catch (err) { setOllamaError(err.message); }
    finally { setOllamaLoading(false); }
  }

  async function handleRefreshLmstudio() {
    setLmstudioLoading(true);
    setLmstudioError('');
    try { setLmstudioModels(await fetchLmStudioModels(settings.lmstudioUrl || 'http://localhost:1234/v1')); }
    catch (err) { setLmstudioError(err.message); }
    finally { setLmstudioLoading(false); }
  }

  function handleAddModel(model, provider = 'openrouter') {
    if (addedIds.has(model.id)) return;
    const updated = { ...settings, models: [...settings.models, { id: model.id, name: model.name || model.id, favorite: false, provider }] };
    setSettings(updated);
    saveSettings(updated);
    if (onRefresh) onRefresh();
  }

  function handleRemoveModel(id) {
    const updated = { ...settings, models: settings.models.filter(m => m.id !== id), defaultModel: settings.defaultModel === id ? '' : settings.defaultModel };
    setSettings(updated);
    saveSettings(updated);
    if (onRefresh) onRefresh();
  }

  function handleToggleFavorite(id) {
    const updated = { ...settings, models: settings.models.map(m => m.id === id ? { ...m, favorite: !m.favorite } : m) };
    setSettings(updated);
    saveSettings(updated);
  }

  function handleSetDefault(id) {
    const updated = { ...settings, defaultModel: id };
    setSettings(updated);
    saveSettings(updated);
    if (onRefresh) onRefresh();
  }

  function handleSetDefaultPrompt(id) {
    const updated = { ...settings, defaultPrompt: id };
    setSettings(updated);
    saveSettings(updated);
  }

  function refreshPrompts() { setPrompts(getPrompts()); }

  function handlePromptSubmit(e) {
    e.preventDefault();
    if (!promptForm.name.trim() || !promptForm.content.trim()) return;
    if (editingPromptId) { updatePrompt(editingPromptId, { name: promptForm.name.trim(), content: promptForm.content.trim() }); setEditingPromptId(null); }
    else { createPrompt(promptForm.name.trim(), promptForm.content.trim()); }
    setPromptForm({ name: '', content: '' });
    setShowPromptForm(false);
    refreshPrompts();
  }

  function handleEditPrompt(prompt) { setEditingPromptId(prompt.id); setPromptForm({ name: prompt.name, content: prompt.content }); setShowPromptForm(true); }
  function handleCancelPrompt() { setEditingPromptId(null); setPromptForm({ name: '', content: '' }); setShowPromptForm(false); }
  function handleDeletePrompt(id) { if (confirm('Delete this prompt?')) { deletePrompt(id); refreshPrompts(); } }

  const displayList = showOnlyAdded ? settings.models : searchResults;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>Settings</h1>
          <p className="text-base text-[var(--color-text-secondary)]">Configure your AI models and preferences</p>
        </div>

        <div className="flex gap-2 p-2 rounded-xl mb-8 w-fit" style={{ background: 'var(--color-bg-secondary)' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'}`}>
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {activeTab === 'api' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-5" style={{ fontFamily: 'var(--font-family-display)' }}>OpenRouter API</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="label text-base mb-2">API Key</label>
                      <div className="flex gap-3">
                        <input type="password" value={apiKeyInput} onChange={(e) => { setApiKeyInput(e.target.value); setKeyStatus({ type: '', message: '' }); }} placeholder="sk-or-v1-..." className="input flex-1 text-sm py-3 px-4" />
                        <button className="btn btn-primary text-sm px-5 py-3" onClick={handleSaveKey} disabled={keyStatus.type === 'loading'}>
                          {keyStatus.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          Save & Validate
                        </button>
                      </div>
                    </div>
                    {keyStatus.message && (
                      <div className={`flex items-center gap-3 text-sm p-4 rounded-lg ${keyStatus.type === 'success' ? 'bg-[rgba(126,202,195,0.12)] text-[var(--color-success)]' : keyStatus.type === 'error' ? 'bg-[rgba(232,138,154,0.12)] text-[var(--color-error)]' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>
                        {keyStatus.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {keyStatus.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {keyStatus.message}
                      </div>
                    )}
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] flex items-center gap-1.5 inline-flex">openrouter.ai/keys <ExternalLink className="w-3.5 h-3.5" /></a>. Stored only in your browser.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ollama' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-5" style={{ fontFamily: 'var(--font-family-display)' }}>Ollama Configuration</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="label text-base mb-2">Server URL</label>
                      <div className="flex gap-3">
                        <input type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://localhost:11434" className="input flex-1 text-sm py-3 px-4" />
                        <button className="btn btn-primary text-sm px-5 py-3" onClick={handleSaveOllamaUrl}><Check className="w-5 h-5" /> Save URL</button>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">URL of your running Ollama instance. Make sure CORS is enabled.</p>
                  </div>
                </div>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>Available Models</h2>
                    <button className="btn btn-secondary text-sm px-5 py-3" onClick={handleRefreshOllama} disabled={ollamaLoading}>
                      {ollamaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Refresh
                    </button>
                  </div>
                  {ollamaError && <div className="flex items-center gap-3 text-sm p-4 rounded-lg bg-[rgba(232,138,154,0.12)] text-[var(--color-error)] mb-5"><AlertCircle className="w-5 h-5" /> {ollamaError}</div>}
                  {ollamaModels.length > 0 ? (
                    <div className="space-y-3">
                      {ollamaModels.map(m => {
                        const isAdded = addedIds.has(m.id);
                        const localModel = settings.models.find(xm => xm.id === m.id);
                        return (
                          <div key={m.id} className={`flex items-center justify-between p-4 rounded-lg ${isAdded ? 'bg-[var(--color-bg-tertiary)]' : 'bg-[var(--color-bg-secondary)]'}`}>
                            <div>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.name}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">ollama · {m.id}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isAdded ? (
                                <>
                                  <button className={`btn-icon ${localModel?.favorite ? 'text-[var(--color-gold)]' : ''}`} onClick={() => handleToggleFavorite(m.id)}><Star className={`w-5 h-5 ${localModel?.favorite ? 'fill-current' : ''}`} /></button>
                                  {settings.defaultModel === m.id ? <span className="badge badge-accent text-xs px-3 py-1.5">Default</span> : <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => handleSetDefault(m.id)}>Set Default</button>}
                                  <button className="btn-danger p-2" onClick={() => handleRemoveModel(m.id)}><Trash2 className="w-5 h-5" /></button>
                                </>
                              ) : <button className="btn btn-primary text-xs px-4 py-2" onClick={() => handleAddModel(m, 'ollama')}><Plus className="w-4 h-4" /> Add</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !ollamaLoading && !ollamaError && <p className="text-sm text-[var(--color-text-muted)] text-center py-12">Click Refresh to load available models from Ollama</p>}
                </div>
              </div>
            )}

            {activeTab === 'lmstudio' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-5" style={{ fontFamily: 'var(--font-family-display)' }}>LM Studio Configuration</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="label text-base mb-2">Server URL</label>
                      <div className="flex gap-3">
                        <input type="text" value={lmstudioUrl} onChange={(e) => setLmstudioUrl(e.target.value)} placeholder="http://localhost:1234/v1" className="input flex-1 text-sm py-3 px-4" />
                        <button className="btn btn-primary text-sm px-5 py-3" onClick={handleSaveLmstudioUrl}><Check className="w-5 h-5" /> Save URL</button>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">URL of your running LM Studio instance. LM Studio exposes an OpenAI-compatible API.</p>
                  </div>
                </div>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>Available Models</h2>
                    <button className="btn btn-secondary text-sm px-5 py-3" onClick={handleRefreshLmstudio} disabled={lmstudioLoading}>
                      {lmstudioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Refresh
                    </button>
                  </div>
                  {lmstudioError && <div className="flex items-center gap-3 text-sm p-4 rounded-lg bg-[rgba(232,138,154,0.12)] text-[var(--color-error)] mb-5"><AlertCircle className="w-5 h-5" /> {lmstudioError}</div>}
                  {lmstudioModels.length > 0 ? (
                    <div className="space-y-3">
                      {lmstudioModels.map(m => {
                        const isAdded = addedIds.has(m.id);
                        const localModel = settings.models.find(xm => xm.id === m.id);
                        return (
                          <div key={m.id} className={`flex items-center justify-between p-4 rounded-lg ${isAdded ? 'bg-[var(--color-bg-tertiary)]' : 'bg-[var(--color-bg-secondary)]'}`}>
                            <div>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.name}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">lmstudio · {m.id}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isAdded ? (
                                <>
                                  <button className={`btn-icon ${localModel?.favorite ? 'text-[var(--color-gold)]' : ''}`} onClick={() => handleToggleFavorite(m.id)}><Star className={`w-5 h-5 ${localModel?.favorite ? 'fill-current' : ''}`} /></button>
                                  {settings.defaultModel === m.id ? <span className="badge badge-accent text-xs px-3 py-1.5">Default</span> : <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => handleSetDefault(m.id)}>Set Default</button>}
                                  <button className="btn-danger p-2" onClick={() => handleRemoveModel(m.id)}><Trash2 className="w-5 h-5" /></button>
                                </>
                              ) : <button className="btn btn-primary text-xs px-4 py-2" onClick={() => handleAddModel(m, 'lmstudio')}><Plus className="w-4 h-4" /> Add</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !lmstudioLoading && !lmstudioError && <p className="text-sm text-[var(--color-text-muted)] text-center py-12">Click Refresh to load available models from LM Studio</p>}
                </div>
              </div>
            )}

            {activeTab === 'cloud' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-5" style={{ fontFamily: 'var(--font-family-display)' }}>Supabase Cloud Sync</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="label text-base mb-2">Supabase Project URL</label>
                      <div className="flex gap-3">
                        <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="input flex-1 text-sm py-3 px-4" />
                        <button className="btn btn-primary text-sm px-5 py-3" onClick={handleSaveSupabase}><Check className="w-5 h-5" /> Save</button>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">Project URL from Supabase → Project Settings → API</p>
                    </div>
                    <div>
                      <label className="label text-base mb-2">Supabase Anon/Public Key</label>
                      <div className="flex gap-3">
                        <input type="password" value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} placeholder="eyJhbGci..." className="input flex-1 text-sm py-3 px-4" />
                        <button className="btn btn-primary text-sm px-5 py-3" onClick={handleSaveSupabase}><Check className="w-5 h-5" /> Save</button>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">anon/public key from Supabase → Project Settings → API</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)]">
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        <strong>How it works:</strong> The n8n workflow (running on your server) writes directly to this Supabase project using the service_role key. When you open Wonderland on any device, it reads characters from here and adds them to your local collection (skipping duplicates).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>System Prompts</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">Customize how the AI writes your stories</p>
                  </div>
                  <button className="btn btn-primary text-sm px-5 py-3" onClick={() => { if (showPromptForm) handleCancelPrompt(); else { setEditingPromptId(null); setPromptForm({ name: '', content: '' }); setShowPromptForm(true); } }}>
                    {showPromptForm ? <><X className="w-5 h-5" /> Cancel</> : <><Plus className="w-5 h-5" /> New Prompt</>}
                  </button>
                </div>
                {showPromptForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card p-6">
                    <form onSubmit={handlePromptSubmit} className="space-y-5">
                      <div><label className="label text-base mb-2">Name</label><input type="text" value={promptForm.name} onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })} placeholder="e.g. Dark Fantasy, Romance..." className="input text-sm py-3 px-4" /></div>
                      <div><label className="label text-base mb-2">Prompt Content</label><textarea value={promptForm.content} onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })} placeholder="Instructions for the AI..." rows={10} className="textarea text-sm py-3 px-4" /></div>
                      <div className="flex justify-end gap-3"><button type="button" className="btn btn-secondary text-sm px-5 py-3" onClick={handleCancelPrompt}>Cancel</button><button type="submit" className="btn btn-primary text-sm px-5 py-3">{editingPromptId ? 'Save Changes' : 'Create Prompt'}</button></div>
                    </form>
                  </motion.div>
                )}
                {prompts.length === 0 && !showPromptForm && <div className="empty-state py-24"><MessageSquare className="w-14 h-14 mb-4" /><p className="text-xl text-[var(--color-text-secondary)] mb-2">No system prompts yet</p><p className="text-sm text-[var(--color-text-muted)]">Create one to customize how the AI writes</p></div>}
                <div className="space-y-4">
                  {prompts.map((p) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {p.favorite && <Star className="w-5 h-5 text-[var(--color-gold)] fill-current" />}
                          <h3 className="font-semibold text-[var(--color-text-primary)] text-xl" style={{ fontFamily: 'var(--font-family-display)' }}>{p.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className={`btn-icon ${p.favorite ? 'text-[var(--color-gold)]' : ''}`} onClick={() => { togglePromptFavorite(p.id); refreshPrompts(); }} title={p.favorite ? 'Remove from favorites' : 'Add to favorites'}><Star className="w-5 h-5" /></button>
                          {settings.defaultPrompt === p.id ? (
                            <span className="badge badge-accent text-xs px-3 py-1.5">Default</span>
                          ) : (
                            <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => handleSetDefaultPrompt(p.id)}>Set Default</button>
                          )}
                          <button className="btn-icon p-2" onClick={() => handleEditPrompt(p)}><Sparkles className="w-5 h-5" /></button>
                          <button className="btn-danger p-2" onClick={() => handleDeletePrompt(p.id)}><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-5" style={{ fontFamily: 'var(--font-family-display)' }}>Add Models</h2>
                  <div className="flex gap-3 mb-5">
                    <select value={searchProvider} onChange={(e) => setSearchProvider(e.target.value)} className="input w-48 text-sm py-3 px-4">
                      <option value="openrouter">OpenRouter</option>
                      <option value="ollama">Ollama</option>
                      <option value="lmstudio">LM Studio</option>
                    </select>
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search models..." onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} className="input pl-12 text-sm py-3 px-4" />
                    </div>
                    <button className="btn btn-primary text-sm px-5 py-3" onClick={handleSearch} disabled={searching}>{searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Search</button>
                  </div>
                  {searchError && <div className="flex items-center gap-3 text-sm p-4 rounded-lg bg-[rgba(232,138,154,0.12)] text-[var(--color-error)]"><AlertCircle className="w-5 h-5" /> {searchError}</div>}
                </div>
                {settings.models.length > 0 && (
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>Your Models ({settings.models.length})</h2>
                    <label className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                      <input type="checkbox" checked={showOnlyAdded} onChange={(e) => setShowOnlyAdded(e.target.checked)} className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-input)] accent-[var(--color-accent)]" />
                      Show only added
                    </label>
                  </div>
                )}
                {displayList.length === 0 && !searching && <div className="empty-state py-24"><Bot className="w-14 h-14 mb-4" /><p className="text-xl text-[var(--color-text-secondary)] mb-2">{showOnlyAdded ? 'No models added yet' : 'Search for models to add'}</p><p className="text-sm text-[var(--color-text-muted)]">{showOnlyAdded ? 'Search above to find models' : 'Results will appear here'}</p></div>}
                <div className="space-y-3">
                  {displayList.map((m) => {
                    const isAdded = addedIds.has(m.id);
                    const localModel = settings.models.find(xm => xm.id === m.id);
                    const isFav = localModel?.favorite;
                    const isDefault = settings.defaultModel === m.id;
                    const provider = localModel?.provider || searchProvider;
                    return (
                      <div key={m.id} className={`flex items-center justify-between p-4 rounded-lg ${isAdded ? 'bg-[var(--color-bg-tertiary)]' : 'bg-[var(--color-bg-secondary)]'}`}>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{localModel?.name || m.name || m.id}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{provider} · {m.id}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAdded ? (
                            <>
                              <button className={`btn-icon ${isFav ? 'text-[var(--color-gold)]' : ''}`} onClick={() => handleToggleFavorite(m.id)}><Star className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} /></button>
                              {isDefault ? <span className="badge badge-accent text-xs px-3 py-1.5">Default</span> : <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => handleSetDefault(m.id)}>Set Default</button>}
                              <button className="btn-danger p-2" onClick={() => handleRemoveModel(m.id)}><Trash2 className="w-5 h-5" /></button>
                            </>
                          ) : <button className="btn btn-primary text-xs px-4 py-2" onClick={() => handleAddModel(m, provider)}><Plus className="w-4 h-4" /> Add</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
