import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Upload, 
  Folder, 
  FileText,
  X,
  ChevronRight,
  Sparkles,
  BookOpen,
  ChevronDown,
  Search,
  Download
} from 'lucide-react';
import { createStory, deleteStory, importStory, importChatJson, getFolders, getStoriesInFolder, getRootStories, getPrompts, getCharacters, getSettings, getProfile, addStoryEntry, getStory, updateStory, emitStoryUpdated, exportAllStories, downloadFile } from '../store';
import { chatCompletion as openRouterChat } from '../openrouter';
import { chatCompletion as ollamaChat } from '../ollama';
import { chatCompletion as lmstudioChat } from '../lmstudio';
import { buildSystemPrompt } from '../promptBuilder';

export default function StartStory({ onRefresh, onOpenStory, onCreateAndOpen }) {
  const [showImport, setShowImport] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importText, setImportText] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportAll, setShowExportAll] = useState(false);

  const folders = getFolders();
  const rootStories = getRootStories();
  const displayedStories = selectedFolder ? getStoriesInFolder(selectedFolder) : rootStories;
  const filteredStories = searchQuery.trim()
    ? displayedStories.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.entries.some(e => e.text.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : displayedStories;
  const prompts = getPrompts();
  const characters = getCharacters();
  const settings = getSettings();

  const [selectedPrompt, setSelectedPrompt] = useState(settings.defaultPrompt || '');
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings.defaultModel || '');
  const [storyPrompt, setStoryPrompt] = useState('');

  const sortedPrompts = [...prompts].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return 0;
  });

  const allModels = settings.models || [];

  function getFolderPath(folderId) {
    if (!folderId) return [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return [];
    return [...getFolderPath(folder.parentId), folder.name];
  }

  function renderFolderPicker(depth = 0, parentId = null) {
    const subfolders = folders.filter(f => f.parentId === parentId);
    if (subfolders.length === 0) return null;
    return (
      <>
        {subfolders.map(folder => (
          <div key={folder.id} style={{ paddingLeft: `${depth * 16}px` }}>
            <button
              className={`dropdown-item text-sm py-2 ${selectedFolder === folder.id ? 'active' : ''}`}
              onClick={() => { setSelectedFolder(folder.id); setShowFolderPicker(false); }}
            >
              <Folder className="w-4 h-4" />
              {folder.name}
            </button>
            {renderFolderPicker(depth + 1, folder.id)}
          </div>
        ))}
      </>
    );
  }

  async function handleStartStory(e) {
    e.preventDefault();
    if (!storyPrompt.trim()) return;
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    setIsStarting(true);

    try {
      const story = createStory('Untitled Story', selectedFolder);
      addStoryEntry(story.id, storyPrompt.trim(), 'You');

      updateStory(story.id, {
        modelId: selectedModel,
        systemPromptId: selectedPrompt || null,
      });

      onRefresh();
      onCreateAndOpen(story.id);

      const modelData = allModels.find(m => m.id === selectedModel);
      const provider = modelData?.provider || 'openrouter';
      const modelName = modelData?.name || selectedModel;

      const selectedCharObj = selectedCharacter ? characters.find(c => c.id === selectedCharacter) : null;
      const systemPrompt = buildSystemPrompt({
        activePromptId: selectedPrompt,
        prompts,
        profile: getProfile(),
        characters: selectedCharObj ? [selectedCharObj] : [],
      });
      const storyData = getStory(story.id);
      const entries = storyData?.entries || [];

      const messages = [
        { role: 'system', content: systemPrompt },
        ...entries.map(entry => ({
          role: entry.author === 'You' ? 'user' : 'assistant',
          content: entry.text,
        })),
      ];

      let aiResponse = '';
      if (provider === 'ollama') {
        await ollamaChat(settings.ollamaUrl, selectedModel, messages, (text) => {
          aiResponse = text;
        }, null);
      } else if (provider === 'lmstudio') {
        await lmstudioChat(settings.lmstudioUrl, selectedModel, messages, (text) => {
          aiResponse = text;
        }, null);
      } else {
        await openRouterChat(settings.apiKey, selectedModel, messages, (text) => {
          aiResponse = text;
        }, null);
      }

      if (aiResponse && aiResponse.trim()) {
        addStoryEntry(story.id, aiResponse.trim(), modelName);
        emitStoryUpdated(story.id);

        // Auto-generate title from first 5 words of AI response
        const words = aiResponse.trim().split(/\s+/).slice(0, 5);
        const generatedTitle = words.join(' ') + (aiResponse.trim().split(/\s+/).length > 5 ? '...' : '');
        updateStory(story.id, { title: generatedTitle });
      }

      onRefresh();
    } catch (err) {
      alert('Failed to start story: ' + err.message);
    } finally {
      setIsStarting(false);
    }
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    if (confirm('Delete this story? This cannot be undone.')) {
      deleteStory(id);
      onRefresh();
    }
  }

  function handleImport(e) {
    e.preventDefault();
    if (!importTitle.trim() || !importText.trim()) return;
    importStory(importTitle.trim(), importText.trim(), selectedFolder);
    setImportTitle('');
    setImportText('');
    setShowImport(false);
    onRefresh();
  }

  function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      const isJson = file.name.toLowerCase().endsWith('.json');
      if (isJson) {
        try {
          const json = JSON.parse(content);
          const title = json.title || file.name.replace(/\.json$/i, '').replace(/^./, c => c.toUpperCase());
          importChatJson(title, json, selectedFolder);
          onRefresh();
        } catch {
          alert('Invalid JSON file.');
        }
      } else {
        const name = file.name.replace(/\.(txt|md|markdown)$/i, '');
        setImportTitle(name);
        setImportText(content);
        setShowImport(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-12" style={{ background: 'radial-gradient(ellipse at top, rgba(201, 160, 220, 0.03) 0%, transparent 50%)' }}>
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-family-display)' }}>
            WONDERLAND
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)]">
            Begin your collaborative story
          </p>
        </div>

        {/* Start Story Form */}
        <div className="card p-8 mb-10">
          <form onSubmit={handleStartStory} className="space-y-6">
            <div>
              <label className="label text-base mb-2 block">Write the opening of your story...</label>
              <textarea
                className="textarea text-base py-4 px-5"
                value={storyPrompt}
                onChange={(e) => setStoryPrompt(e.target.value)}
                placeholder="Once upon a time in a land far away..."
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label text-sm mb-2 block text-[var(--color-text-secondary)]">System Prompt</label>
                <div className="relative">
                  <select
                    className="input text-base py-3 px-4 w-full appearance-none pr-10"
                    value={selectedPrompt}
                    onChange={(e) => setSelectedPrompt(e.target.value)}
                  >
                    <option value="">None</option>
                    {sortedPrompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
                </div>
              </div>

              <div>
                <label className="label text-sm mb-2 block text-[var(--color-text-secondary)]">Character</label>
                <div className="relative">
                  <select
                    className="input text-base py-3 px-4 w-full appearance-none pr-10"
                    value={selectedCharacter}
                    onChange={(e) => setSelectedCharacter(e.target.value)}
                  >
                    <option value="">None</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
                </div>
              </div>

              <div>
                <label className="label text-sm mb-2 block text-[var(--color-text-secondary)]">Model</label>
                <div className="relative">
                  <select
                    className="input text-base py-3 px-4 w-full appearance-none pr-10"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="">Select model...</option>
                    {allModels.map(m => (
                      <option key={m.id} value={m.id}>{(m.name || m.id).split('/').pop()}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full text-lg py-4"
              disabled={!storyPrompt.trim() || !selectedModel || isStarting}
              style={{ boxShadow: '0 4px 20px rgba(201, 160, 220, 0.3)' }}
            >
              <Sparkles className="w-5 h-5" />
              {isStarting ? 'Starting...' : 'Start Writing'}
            </button>
          </form>
        </div>

        {/* Recent Stories */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>
              Recent Stories
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  className="btn btn-secondary cursor-pointer text-sm px-4 py-2"
                  onClick={() => setShowExportAll(!showExportAll)}
                >
                  <Download className="w-4 h-4" />
                  Export All
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExportAll ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showExportAll && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="dropdown right-0 mt-2 min-w-48"
                    >
                      <button
                        className="dropdown-item text-sm py-2.5"
                        onClick={() => {
                          const content = exportAllStories('json');
                          const date = new Date().toISOString().slice(0, 10);
                          downloadFile(content, `wonderland-backup-${date}.json`, 'application/json');
                          setShowExportAll(false);
                        }}
                      >
                        Export All as JSON
                      </button>
                      <button
                        className="dropdown-item text-sm py-2.5"
                        onClick={() => {
                          const content = exportAllStories('markdown');
                          const date = new Date().toISOString().slice(0, 10);
                          downloadFile(content, `wonderland-backup-${date}.md`, 'text/markdown');
                          setShowExportAll(false);
                        }}
                      >
                        Export All as Markdown
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <label className="btn btn-secondary cursor-pointer text-sm px-4 py-2">
                <Upload className="w-4 h-4" />
                Import
                <input type="file" accept=".json,.txt,.md,.markdown" onChange={handleFileImport} hidden />
              </label>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories by title or content..."
              className="input pl-12 pr-12 text-sm py-3 px-4"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon p-1"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'} found
            </p>
          )}

          {filteredStories.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? 'No stories match your search' : 'No stories yet. Start writing above!'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStories.slice(0, 10).map(story => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-5 card-interactive cursor-pointer group"
                  onClick={() => onOpenStory(story.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--color-text-primary)] text-lg mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
                        {story.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {story.entries?.length || 0} entries
                        </span>
                        <span>·</span>
                        <span>{new Date(story.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {story.entries?.length > 0 && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                          {story.entries[story.entries.length - 1].text.slice(0, 150)}...
                        </p>
                      )}
                    </div>
                    <button
                      className="btn-danger p-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                      onClick={(e) => handleDelete(story.id, e)}
                      title="Delete story"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Folder Picker */}
        {folders.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <button 
                className="btn btn-secondary text-sm px-4 py-2"
                onClick={() => setShowFolderPicker(!showFolderPicker)}
              >
                <Folder className="w-4 h-4" />
                {selectedFolder ? getFolderPath(selectedFolder).join(' / ') : 'All Folders'}
                <ChevronRight className={`w-4 h-4 transition-transform ${showFolderPicker ? 'rotate-90' : ''}`} />
              </button>
              {showFolderPicker && (
                <div className="dropdown mt-2 w-72">
                  <button
                    className={`dropdown-item text-sm py-2 ${!selectedFolder ? 'active' : ''}`}
                    onClick={() => { setSelectedFolder(null); setShowFolderPicker(false); }}
                  >
                    <Folder className="w-5 h-5" />
                    All Stories
                  </button>
                  {renderFolderPicker()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6 backdrop-blur-sm"
          onClick={() => setShowImport(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="card p-6 w-full max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>Import Story</h2>
              <button className="btn-icon p-2" onClick={() => setShowImport(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleImport} className="space-y-5">
              <div>
                <label className="label text-base mb-2">Title</label>
                <input type="text" className="input text-base py-3 px-4 w-full" value={importTitle} onChange={(e) => setImportTitle(e.target.value)} placeholder="Story title" autoFocus />
              </div>
              <div>
                <label className="label text-base mb-2">Content</label>
                <textarea className="textarea text-base py-3 px-4 w-full" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste or edit story content..." rows={10} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn btn-secondary text-sm px-5 py-3" onClick={() => setShowImport(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary text-sm px-5 py-3">Import</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
