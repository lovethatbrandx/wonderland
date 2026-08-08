import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Pencil, 
  Copy,
  Play,
  RefreshCw,
  Send,
  User,
  X,
  BookOpen,
  AtSign,
  Sparkles,
  GitBranch,
  ChevronDown,
  Download
} from 'lucide-react';
import { getStory, addStoryEntry, updateStoryTitle, getSettings, getPrompts, copyStoryAsBranch, getStories, saveItems, exportStory, downloadFile } from '../store';
import { chatCompletion as openRouterChat } from '../openrouter';
import { chatCompletion as ollamaChat } from '../ollama';
import { chatCompletion as lmstudioChat } from '../lmstudio';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StoryEditor({ storyId, onBack, characters, onRefreshStories }) {
  const [story, setStory] = useState(() => getStory(storyId));
  const [input, setInput] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(story?.title || '');
  const [showChars, setShowChars] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [generatingInitial, setGeneratingInitial] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const settings = getSettings();
  const prompts = getPrompts();
  const allModels = settings.models;

  const entries = useMemo(() => story?.entries || [], [story?.entries]);
  
  const effectivePromptId = story?.systemPromptId || '';
  const effectiveModelId = story?.modelId || settings.defaultModel || '';
  
  const [activePromptId, setActivePromptId] = useState(effectivePromptId);
  const [activeModel, setActiveModel] = useState(effectiveModelId);
  
  // Detect if we should show initial generating indicator
  useEffect(() => {
    const isWaitingForInitialAI = 
      entries.length === 1 && 
      entries[0].author === 'You' &&
      !streaming;
    
    if (isWaitingForInitialAI) {
      setGeneratingInitial(true);
    }
  }, [entries, streaming]);
  
  // Poll for AI response when generatingInitial is true
  useEffect(() => {
    if (!generatingInitial) return;
    
    const interval = setInterval(() => {
      const updatedStory = getStory(storyId);
      if (updatedStory && updatedStory.entries.length > entries.length) {
        // AI response arrived
        setStory(updatedStory);
        setGeneratingInitial(false);
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [generatingInitial, storyId, entries.length]);
  
  // Listen for story updates from other sources (e.g., StartStory AI response)
  useEffect(() => {
    function handleStoryUpdated(e) {
      if (e.detail?.storyId === storyId) {
        const updated = getStory(storyId);
        setStory(updated);
        // If AI response arrived via event, stop generating indicator
        if (updated?.entries?.length > entries.length) {
          setGeneratingInitial(false);
        }
      }
    }
    window.addEventListener('wonderland:story-updated', handleStoryUpdated);
    return () => window.removeEventListener('wonderland:story-updated', handleStoryUpdated);
  }, [storyId, entries.length]);
  
  const sortedPrompts = [...prompts].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return 0;
  });

  const activePromptName = activePromptId ? (prompts.find(p => p.id === activePromptId)?.name || 'Custom') : (settings.defaultPrompt ? (prompts.find(p => p.id === settings.defaultPrompt)?.name + ' (default)') || 'Default' : 'None');
  const activeModelName = activeModel ? (allModels.find(m => m.id === activeModel)?.name || activeModel).split('/').pop() : (settings.defaultModel ? 'Default' : 'Select');

  const requestQueue = new Set();
  
  async function doLLMResponse(entriesToUse) {
    if (requestQueue.has(storyId)) {
      console.warn('[DO_LLM] Request already in progress');
      return;
    }
    requestQueue.add(storyId);
    
    const modelData = allModels.find(m => m.id === activeModel);
    const provider = modelData?.provider || 'openrouter';
    const modelName = modelData?.name || activeModel;
    
    const systemPrompt = buildSystemPrompt();
    const contextSummary = story?.contextSummaryGenerated || story?.contextSummary || null;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...entriesToUse.map(entry => ({
        role: entry.author === 'You' ? 'user' : 'assistant',
        content: entry.text,
      })),
    ];

    let localStreamText = '';
    try {
      if (provider === 'ollama') {
        await ollamaChat(settings.ollamaUrl, activeModel, messages, (text) => { 
          localStreamText = text; 
          setStreamText(text); 
        }, contextSummary);
      } else if (provider === 'lmstudio') {
        await lmstudioChat(settings.lmstudioUrl, activeModel, messages, (text) => { 
          localStreamText = text; 
          setStreamText(text); 
        }, contextSummary);
      } else {
        await openRouterChat(settings.apiKey, activeModel, messages, (text) => { 
          localStreamText = text; 
          setStreamText(text); 
        }, contextSummary);
      }
      
      if (localStreamText && localStreamText.trim()) {
        addStoryEntry(storyId, localStreamText, modelName);
        const updatedStory = getStory(storyId);
        setStory(updatedStory);
        onRefreshStories();
      } else {
        addStoryEntry(storyId, '[Error: Empty response from AI]', 'System');
        const updatedStory = getStory(storyId);
        setStory(updatedStory);
        onRefreshStories();
      }
    } catch (err) {
      console.error('[DO_LLM] ERROR:', err);
      addStoryEntry(storyId, `[Error: ${err.message}]`, 'System');
      const updatedStory = getStory(storyId);
      setStory(updatedStory);
      onRefreshStories();
    } finally {
      setStreaming(false);
      setStreamText('');
      requestQueue.delete(storyId);
    }
  }

  async function handleLLMSubmit(e) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    
    const modelData = allModels.find(m => m.id === activeModel);
    const provider = modelData?.provider || 'openrouter';
    
    if (provider === 'openrouter' && !settings.apiKey) {
      alert('OpenRouter API key not configured. Please add it in Settings.');
      return;
    }

    const userText = input.trim();
    setInput('');
    setStreaming(true);
    setStreamText('');
    addStoryEntry(storyId, userText, 'You');
    const updatedStory = getStory(storyId);
    setStory(updatedStory);
    onRefreshStories();
    
    await doLLMResponse(updatedStory?.entries || entries);
  }

  async function handleContinue() {
    if (!activeModel || streaming) return;
    if (entries.length === 0) return;
    
    const modelData = allModels.find(m => m.id === activeModel);
    const provider = modelData?.provider || 'openrouter';
    
    if (provider === 'openrouter' && !settings.apiKey) {
      alert('OpenRouter API key not configured. Please add it in Settings.');
      return;
    }

    setStreaming(true);
    setStreamText('');
    await doLLMResponse(entries);
  }

  async function handleRegenerate() {
    if (!activeModel || streaming) return;
    if (entries.length < 2) return;
    
    const modelData = allModels.find(m => m.id === activeModel);
    const provider = modelData?.provider || 'openrouter';
    
    if (provider === 'openrouter' && !settings.apiKey) {
      alert('OpenRouter API key not configured. Please add it in Settings.');
      return;
    }

    const entriesWithoutLast = entries.slice(0, -1);
    
    setStreaming(true);
    setStreamText('');
    
    try {
      await doLLMResponse(entriesWithoutLast);
      
      const updatedStory = getStory(storyId);
      if (updatedStory && updatedStory.entries.length > entriesWithoutLast.length) {
        updatedStory.entries = updatedStory.entries.slice(0, entriesWithoutLast.length + 1);
        saveItems('wonderland_stories', getStories());
        setStory(getStory(storyId));
      }
    } finally {
      setStreaming(false);
      setStreamText('');
    }
  }

  function handleBranch() {
    if (entries.length === 0) return;
    const lastEntryId = entries[entries.length - 1].id;
    const branchStory = copyStoryAsBranch(storyId, lastEntryId);
    if (branchStory) {
      onRefreshStories();
      alert(`Branch created: "${branchStory.title}"\n\nYou can find it in your stories list.`);
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
  }

  function handleSaveTitle() {
    if (titleDraft.trim()) {
      updateStoryTitle(storyId, titleDraft.trim());
      setStory(getStory(storyId));
      onRefreshStories();
    }
    setEditingTitle(false);
  }

  function buildSystemPrompt() {
    let prompt = '';
    if (activePromptId) {
      const p = prompts.find(pr => pr.id === activePromptId);
      if (p) prompt = p.content;
    }
    return prompt;
  }

  function insertCharacter(name) {
    setInput(prev => prev + `@${name} `);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleLLMSubmit(e);
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] story-editor-header">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4 story-title-row">
            <button 
              className="btn btn-ghost p-2"
              onClick={onBack}
              title="Back to stories"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {editingTitle ? (
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="text"
                  className="input flex-1 max-w-lg text-base py-2 px-4 story-title-input"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                />
                <button className="btn btn-primary text-sm px-5 py-2.5" onClick={handleSaveTitle}>Save</button>
              </div>
            ) : (
              <div 
                className="flex-1 flex items-center gap-3 cursor-pointer group"
                onClick={() => { setEditingTitle(true); setTitleDraft(story.title); }}
              >
                <h1 
                  className="text-xl font-bold text-[var(--color-text-primary)]"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  {story.title}
                </h1>
                <Pencil className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Model/Prompt Row */}
          <div className="flex items-center gap-3 header-actions">
            <div className="relative">
              <button
                className="btn btn-secondary text-sm px-4 py-2"
                onClick={() => { setShowPrompts(!showPrompts); setShowModels(false); setShowExport(false); }}
              >
                <Sparkles className="w-4 h-4" />
                {activePromptName}
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showPrompts && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="dropdown left-0 mt-2 min-w-56"
                  >
                    <button
                      className={`dropdown-item text-sm py-2.5 ${!activePromptId ? 'active' : ''}`}
                      onClick={() => { setActivePromptId(''); setShowPrompts(false); }}
                    >
                      None
                    </button>
                    {sortedPrompts.map((p) => (
                      <button
                        key={p.id}
                        className={`dropdown-item text-sm py-2.5 ${activePromptId === p.id ? 'active' : ''}`}
                        onClick={() => { setActivePromptId(p.id); setShowPrompts(false); }}
                      >
                        {p.name}
                        {p.id === settings.defaultPrompt && ' (default)'}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                className="btn btn-secondary text-sm px-4 py-2"
                onClick={() => { setShowModels(!showModels); setShowPrompts(false); setShowExport(false); }}
              >
                <BookOpen className="w-4 h-4" />
                {activeModelName}
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showModels && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="dropdown left-0 mt-2 min-w-56"
                  >
                    {allModels.length === 0 ? (
                      <div className="dropdown-item text-sm py-2 disabled">No models added</div>
                    ) : (
                      allModels.map((m) => (
                        <button
                          key={m.id}
                          className={`dropdown-item text-sm py-2 ${activeModel === m.id ? 'active' : ''}`}
                          onClick={() => { setActiveModel(m.id); setShowModels(false); }}
                        >
                          {(m.name || m.id).split('/').pop()}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative ml-auto">
              <button
                className="btn btn-secondary text-sm px-4 py-2"
                onClick={() => { setShowExport(!showExport); setShowPrompts(false); setShowModels(false); }}
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showExport && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="dropdown right-0 mt-2 min-w-44"
                  >
                    <button
                      className="dropdown-item text-sm py-2.5"
                      onClick={() => {
                        const content = exportStory(storyId, 'json');
                        if (content) downloadFile(content, `${story.title}.json`, 'application/json');
                        setShowExport(false);
                      }}
                    >
                      Export as JSON
                    </button>
                    <button
                      className="dropdown-item text-sm py-2.5"
                      onClick={() => {
                        const content = exportStory(storyId, 'markdown');
                        if (content) downloadFile(content, `${story.title}.md`, 'text/markdown');
                        setShowExport(false);
                      }}
                    >
                      Export as Markdown
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Story Content Area */}
      <div className="flex-1 overflow-y-auto px-16 py-8 story-entries" ref={chatRef}>
        {entries.length === 0 && !streaming && !generatingInitial && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-6" />
              <p className="text-xl text-[var(--color-text-secondary)] mb-3">Start writing your story below</p>
              <p className="text-base text-[var(--color-text-muted)]">or use the AI button to have a model continue</p>
            </div>
          </div>
        )}
        
        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {entries.map((entry, idx) => {
              const isUser = entry.author === 'You';
              const isSystem = entry.author === 'System';
              const isImported = entry.author === 'Imported';
              const isLastEntry = idx === entries.length - 1;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                      {isUser ? (
                        <User className="w-4 h-4 text-[var(--color-accent)]" />
                      ) : isSystem ? (
                        <X className="w-4 h-4 text-[var(--color-error)]" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />
                      )}
                      <span className={`text-sm font-medium ${isUser ? 'text-[var(--color-accent)]' : isSystem ? 'text-[var(--color-error)]' : 'text-[var(--color-secondary)]'}`}>
                        {entry.author}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                  </div>
                  
                  <div className={`rounded-2xl p-6 ${isUser ? 'bg-[var(--color-accent-muted)] border-l-4 border-[var(--color-accent)]' : isSystem ? 'bg-[rgba(232,138,154,0.08)]' : isImported ? 'bg-[rgba(126,202,195,0.08)] border-l-4 border-[var(--color-secondary)]' : 'bg-[var(--color-bg-tertiary)]'}`}>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{entry.text}</ReactMarkdown>
                    </div>
                  </div>
                  
                  {!isSystem && !isImported && isLastEntry && (
                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="btn btn-ghost text-xs px-3 py-1.5"
                        onClick={() => handleCopy(entry.text)}
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                      <button 
                        className="btn btn-ghost text-xs px-3 py-1.5"
                        onClick={handleContinue}
                        title="Continue"
                        disabled={streaming}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Continue
                      </button>
                      {entries.length > 1 && (
                        <button 
                          className="btn btn-ghost text-xs px-3 py-1.5"
                          onClick={handleRegenerate}
                          title="Regenerate"
                          disabled={streaming}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Regenerate
                        </button>
                      )}
                      <button 
                        className="btn btn-ghost text-xs px-3 py-1.5"
                        onClick={handleBranch}
                        title="Branch from here"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        Branch
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {generatingInitial && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-8 h-8 text-[var(--color-secondary)]" />
              </motion.div>
            </motion.div>
          )}

          {streaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />
                  </motion.div>
                  <span className="text-sm font-medium text-[var(--color-secondary)]">
                    {allModels.find(m => m.id === activeModel)?.name?.split('/').pop() || 'AI'}
                  </span>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    writing...
                  </motion.span>
                </div>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>
              
              <div className="bg-[var(--color-bg-tertiary)] rounded-2xl p-6">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{streamText}</ReactMarkdown>
                </div>
                <motion.div 
                  className="inline-block w-0.5 h-5 bg-[var(--color-accent)] ml-1 mt-2"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 border-t-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 chat-input-area">
        <form onSubmit={handleLLMSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-4">
            {characters.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className="btn btn-secondary text-sm px-4 py-3"
                  onClick={() => setShowChars(!showChars)}
                >
                  <AtSign className="w-5 h-5" />
                  Characters
                </button>
                <AnimatePresence>
                  {showChars && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="dropdown bottom-full mb-3 left-0 min-w-56"
                    >
                      {characters.map((ch) => (
                        <button
                          key={ch.id}
                          className="dropdown-item text-base py-3"
                          onClick={() => insertCharacter(ch.name)}
                        >
                          <User className="w-5 h-5" />
                          {ch.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write the next part of your story..."
                rows={1}
                className="w-full bg-[var(--color-bg-input)] border-2 border-[var(--color-border)] rounded-xl px-6 py-4 text-base text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-muted)] transition-all"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary text-base px-6 py-4"
              disabled={!input.trim() || streaming}
            >
              <Send className="w-5 h-5" />
              Send
            </button>
            
            {activeModel && (() => {
              const modelData = allModels.find(m => m.id === activeModel);
              const provider = modelData?.provider || 'openrouter';
              const canUse = provider === 'ollama' || provider === 'lmstudio' || settings.apiKey;
              return canUse && (
                <button
                  type="button"
                  className="btn btn-secondary text-sm px-4 py-3"
                  onClick={handleContinue}
                  disabled={streaming}
                >
                  <Sparkles className="w-4 h-4" />
                  {streaming ? '...' : 'AI'}
                </button>
              );
            })()}
          </div>
        </form>
      </div>
    </div>
  );
}
