import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, User, Sparkles, BookOpen, AtSign, X, ExternalLink, Link, Pencil, Image } from 'lucide-react';
import { createCharacter, updateCharacter, deleteCharacter, importSillyTavern, addCharacterAlias, removeCharacterAlias, fetchUrlContent, addCharacterKnowledgeSource, removeCharacterKnowledgeSource } from '../store';

export default function CharacterManager({ characters, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [form, setForm] = useState({ name: '', description: '', traits: '', systemPrompt: '', knowledgeManual: '', image: '' });
  const [newAlias, setNewAlias] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const imageInputRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const characterData = { 
      name: form.name.trim(), 
      description: form.description.trim(), 
      traits: form.traits.trim(), 
      systemPrompt: form.systemPrompt.trim(), 
      knowledgeManual: form.knowledgeManual.trim(), 
      image: form.image,
    };
    if (editingId === 'new') {
      const newChar = createCharacter(characterData.name, characterData.description, characterData.traits);
      if (newChar) {
        const updates = {};
        if (characterData.systemPrompt || characterData.knowledgeManual) {
          updates.systemPrompt = characterData.systemPrompt;
          updates.knowledgeManual = characterData.knowledgeManual;
        }
        if (characterData.image) {
          updates.image = characterData.image;
        }
        updateCharacter(newChar.id, updates);
      }
    } else {
      updateCharacter(editingId, characterData);
    }
    resetForm();
    onRefresh();
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm({ ...form, image: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveImage() {
    setForm({ ...form, image: '' });
  }

  function handleEdit(ch) { setEditingId(ch.id); setForm({ name: ch.name, description: ch.description || '', traits: ch.traits || '', systemPrompt: ch.systemPrompt || '', knowledgeManual: ch.knowledgeManual || '', image: ch.image || '' }); setActiveTab('details'); }
  function handleCancel() { resetForm(); }
  function resetForm() { setEditingId(null); setForm({ name: '', description: '', traits: '', systemPrompt: '', knowledgeManual: '', image: '' }); setNewAlias(''); setNewUrl(''); setAddingUrl(false); setUrlError(''); }
  function handleDelete(id) { if (confirm(`Delete character "${characters.find(c => c.id === id)?.name}"?`)) { deleteCharacter(id); onRefresh(); } }

  function handleImportSillyTavern(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { importSillyTavern(JSON.parse(ev.target?.result)); onRefresh(); } catch { alert('Invalid JSON file.'); } };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleAddAlias(ch) { if (!newAlias.trim()) return; if (!addCharacterAlias(ch.id, newAlias.trim())) { alert('Alias already exists.'); return; } setNewAlias(''); onRefresh(); }
  function handleRemoveAlias(ch, alias) { removeCharacterAlias(ch.id, alias); onRefresh(); }

  function handleAddUrl(ch) {
    if (!newUrl.trim()) return;
    setAddingUrl(true);
    setUrlError('');
    fetchUrlContent(newUrl.trim())
      .then(({ content, error }) => { if (error) { setUrlError(`Failed to fetch: ${error}`); setAddingUrl(false); return; } addCharacterKnowledgeSource(ch.id, newUrl.trim(), content); setNewUrl(''); setAddingUrl(false); onRefresh(); });
  }

  function handleRemoveSource(ch, sourceId) { removeCharacterKnowledgeSource(ch.id, sourceId); onRefresh(); }

  const editingCharacter = editingId ? characters.find(c => c.id === editingId) : null;
  const tabs = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'prompt', label: 'Prompt', icon: Sparkles },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'aliases', label: 'Aliases', icon: AtSign },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-family-display)' }}>Characters</h1>
          <div className="flex items-center gap-3">
            <label className="btn btn-secondary cursor-pointer text-sm px-4 py-2.5">
              <Upload className="w-4 h-4" />
              Import SillyTavern
              <input type="file" accept=".json" onChange={handleImportSillyTavern} hidden />
            </label>
            <button className="btn btn-primary text-sm px-5 py-2.5" onClick={() => { resetForm(); setEditingId('new'); }}>
              <Plus className="w-4 h-4" />
              New Character
            </button>
          </div>
        </div>

        {characters.length === 0 ? (
          <div className="empty-state py-24">
            <User className="w-14 h-14 mb-4" />
            <p className="text-xl text-[var(--color-text-secondary)] mb-3">No characters yet</p>
            <p className="text-sm text-[var(--color-text-muted)]">Create one above or import a SillyTavern character</p>
          </div>
        ) : (
          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {characters.map((ch) => (
              <motion.div key={ch.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card p-6 group hover:border-[var(--color-accent)] transition-all cursor-pointer" onClick={() => handleEdit(ch)}>
                <div className="flex items-start gap-4 mb-4">
                  {ch.image ? (
                    <img src={ch.image} alt={ch.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[var(--color-accent-muted)] flex items-center justify-center flex-shrink-0">
                      <User className="w-8 h-8 text-[var(--color-accent)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-family-display)' }}>{ch.name}</h3>
                        {ch.aliases?.length > 0 && <p className="text-xs text-[var(--color-text-muted)]">{ch.aliases.map(a => `@${a}`).join(', ')}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="btn-icon p-2" onClick={(e) => { e.stopPropagation(); handleEdit(ch); }}><Pencil className="w-4 h-4" /></button>
                        <button className="btn-danger p-2" onClick={(e) => { e.stopPropagation(); handleDelete(ch.id); }}><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
                {ch.traits && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ch.traits.split(',').map((t, i) => (<span key={i} className="badge text-xs px-3 py-1">{t.trim()}</span>))}
                  </div>
                )}
                {ch.description && <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3">{ch.description}</p>}
                <div className="flex items-center gap-2">
                  {ch.systemPrompt && <span className="badge badge-accent text-xs px-3 py-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Prompt</span>}
                  {(ch.knowledgeManual || ch.knowledgeSources?.length > 0) && <span className="badge text-xs px-3 py-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Knowledge</span>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b-2 border-[var(--color-border)]">
                <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {editingId === 'new' ? 'New Character' : `Edit: ${editingCharacter?.name}`}
                </h2>
                <button className="btn-icon p-3" onClick={handleCancel}><X className="w-6 h-6" /></button>
              </div>

              {editingId !== 'new' && (
                <div className="flex gap-2 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'}`}>
                        <Icon className="w-5 h-5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {(editingId === 'new' || activeTab === 'details') && (
                    <div className="space-y-5">
                      <div>
                        <label className="label text-base mb-2">Portrait Image</label>
                        <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageUpload} hidden />
                        {form.image ? (
                          <div className="relative inline-block">
                            <img src={form.image} alt="Character portrait" className="w-32 h-32 rounded-xl object-cover border-2 border-[var(--color-border)]" />
                            <button
                              type="button"
                              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-error)] text-white flex items-center justify-center hover:bg-[var(--color-error)]/80 transition-colors"
                              onClick={handleRemoveImage}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flex items-center gap-3 px-6 py-5 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <Image className="w-6 h-6" />
                            <span className="text-base">Upload Image</span>
                          </button>
                        )}
                        <p className="text-sm text-[var(--color-text-muted)] mt-2">Shown only in the character collection.</p>
                      </div>
                      <div>
                        <label className="label text-base mb-2">Name</label>
                        <input type="text" className="input text-base py-4 px-5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kisune" autoFocus />
                      </div>
                      <div>
                        <label className="label text-base mb-2">Traits</label>
                        <input type="text" className="input text-base py-4 px-5" value={form.traits} onChange={(e) => setForm({ ...form, traits: e.target.value })} placeholder="e.g. Brave, Cunning, Elven" />
                      </div>
                      <div>
                        <label className="label text-base mb-2">Description</label>
                        <textarea className="textarea text-base py-4 px-5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Background, appearance, motivations..." rows={5} />
                      </div>
                    </div>
                  )}

                  {editingId !== 'new' && activeTab === 'prompt' && (
                    <div>
                      <label className="label text-base mb-2">Character System Prompt</label>
                      <textarea className="textarea text-base py-4 px-5" value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder="Instructions for how this character should be portrayed..." rows={10} />
                      <p className="text-sm text-[var(--color-text-muted)] mt-3">This prompt is injected when the character is @mentioned in a story.</p>
                    </div>
                  )}

                  {editingId !== 'new' && activeTab === 'knowledge' && (
                    <div className="space-y-6">
                      <div>
                        <label className="label text-base mb-2">Knowledge / Backstory</label>
                        <textarea className="textarea text-base py-4 px-5" value={form.knowledgeManual} onChange={(e) => setForm({ ...form, knowledgeManual: e.target.value })} placeholder="Character backstory, facts, relationships..." rows={8} />
                      </div>
                      <div className="border-t-2 border-[var(--color-border)] pt-6">
                        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">Knowledge Sources (URLs)</h3>
                        <div className="flex gap-4 mb-4">
                          <input type="url" className="input flex-1 text-base py-4 px-5" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(editingCharacter); }} />
                          <button type="button" className="btn btn-secondary text-base px-6 py-4" onClick={() => handleAddUrl(editingCharacter)} disabled={addingUrl || !newUrl.trim()}>{addingUrl ? 'Fetching...' : 'Add URL'}</button>
                        </div>
                        {urlError && <p className="text-base text-[var(--color-error)] mb-4">{urlError}</p>}
                        {editingCharacter?.knowledgeSources?.length > 0 && (
                          <div className="space-y-4">
                            {editingCharacter.knowledgeSources.map(source => (
                              <div key={source.id} className="bg-[var(--color-bg-tertiary)] rounded-xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-base text-[var(--color-accent)] hover:underline flex items-center gap-2">
                                    <Link className="w-5 h-5" />{new URL(source.url).hostname}<ExternalLink className="w-4 h-4" />
                                  </a>
                                  <button className="btn-icon p-2" onClick={() => handleRemoveSource(editingCharacter, source.id)}><X className="w-5 h-5" /></button>
                                </div>
                                <p className="text-sm text-[var(--color-text-secondary)]">{source.summary || source.content.slice(0, 300)}...</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {editingId !== 'new' && activeTab === 'aliases' && (
                    <div>
                      <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">Aliases</h3>
                      <p className="text-sm text-[var(--color-text-muted)] mb-4">Custom names you can use to reference this character (@mention) in stories.</p>
                      <div className="flex gap-4 mb-5">
                        <input type="text" className="input flex-1 text-base py-4 px-5" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="e.g. Su, Sudo" onKeyDown={(e) => { if (e.key === 'Enter') handleAddAlias(editingCharacter); }} />
                        <button type="button" className="btn btn-secondary text-base px-6 py-4" onClick={() => handleAddAlias(editingCharacter)} disabled={!newAlias.trim()}>Add</button>
                      </div>
                      {editingCharacter?.aliases?.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {editingCharacter.aliases.map(alias => (
                            <span key={alias} className="chip text-base px-5 py-3">@{alias}<button type="button" onClick={() => handleRemoveAlias(editingCharacter, alias)} className="ml-2"><X className="w-4 h-4" /></button></span>
                          ))}
                        </div>
                      )}
                      {(!editingCharacter?.aliases || editingCharacter.aliases.length === 0) && <p className="text-base text-[var(--color-text-muted)] text-center py-8">No aliases yet. Add custom names above.</p>}
                    </div>
                  )}
                </form>
              </div>

              <div className="flex justify-end gap-4 p-6 border-t-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <button type="button" className="btn btn-secondary text-base px-6 py-4" onClick={handleCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary text-base px-8 py-4" onClick={handleSubmit}>{editingId === 'new' ? 'Create' : 'Save'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
