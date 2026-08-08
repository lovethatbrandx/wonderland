import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  User, 
  Settings, 
  Folder, 
  FolderOpen,
  FileText,
  Plus,
  X,
  Code,
  Sun,
  Moon
} from 'lucide-react';
import { createFolder, updateFolder, deleteFolder, getSubfolders } from '../store';

function FolderNode({ folder, allStories, depth, expandedFolders, toggleFolder, onOpenStory, activeStoryId, onCreateSubfolder, onDeleteFolder, onRenameFolder, rootSubfolders, onDeleteStory, onClose }) {
  const [showSubfolderInput, setShowSubfolderInput] = useState(false);
  const [subfolderName, setSubfolderName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const subfolders = rootSubfolders.filter(sf => sf.parentId === folder.id);
  const stories = allStories.filter(s => s.folderId === folder.id);
  const isExpanded = expandedFolders.has(folder.id);

  function handleAddSubfolder(e) {
    e.stopPropagation();
    if (!subfolderName.trim()) return;
    createFolder(subfolderName.trim(), folder.id);
    setSubfolderName('');
    setShowSubfolderInput(false);
    onCreateSubfolder();
  }

  function handleRename() {
    if (editName.trim()) {
      updateFolder(folder.id, { name: editName.trim() });
      onRenameFolder();
    }
    setIsEditing(false);
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (confirm(`Delete folder "${folder.name}"? Stories will be moved to root.`)) {
      deleteFolder(folder.id);
      onDeleteFolder();
    }
  }

  return (
    <div className="space-y-1.5" style={{ paddingLeft: depth > 0 ? '16px' : '0' }}>
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[var(--color-bg-tertiary)] group"
        onClick={() => toggleFolder(folder.id)}
      >
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
        )}
        {isEditing ? (
          <input
            className="input flex-1 py-2 px-3 text-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span 
            className="text-sm text-[var(--color-text-primary)] flex-1 truncate font-medium" 
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          >
            {folder.name}
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="btn-icon p-1.5" 
            onClick={(e) => { e.stopPropagation(); setShowSubfolderInput(!showSubfolderInput); }}
            title="Add subfolder"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            className="btn-danger p-1.5" 
            onClick={handleDelete}
            title="Delete folder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showSubfolderInput && (
        <div className="pl-8 pr-4 pb-2">
          <input
            className="input py-2 px-4 text-sm"
            value={subfolderName}
            onChange={(e) => setSubfolderName(e.target.value)}
            placeholder="Subfolder name..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubfolder(e); if (e.key === 'Escape') setShowSubfolderInput(false); }}
            autoFocus
          />
        </div>
      )}
      {isExpanded && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          {subfolders.map(sf => (
            <FolderNode
              key={sf.id}
              folder={sf}
              allStories={allStories}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onOpenStory={onOpenStory}
              activeStoryId={activeStoryId}
              onCreateSubfolder={onCreateSubfolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
              rootSubfolders={rootSubfolders}
              onClose={onClose}
            />
          ))}
          {stories.map(story => (
              <StoryNode
                  key={story.id}
                  story={story}
                  onOpenStory={onOpenStory}
                  activeStoryId={activeStoryId}
                  onDeleteStory={onDeleteStory}
                  onClose={onClose}
                />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function StoryNode({ story, onOpenStory, activeStoryId, onDeleteStory, onClose }) {
  const isActive = story.id === activeStoryId;

  return (
    <div className="space-y-1.5" style={{ paddingLeft: '16px' }}>
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${
          isActive 
            ? 'bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/40' 
            : 'hover:bg-[var(--color-bg-tertiary)]'
        }`}
        onClick={() => { onOpenStory(story.id); onClose?.(); }}
      >
        <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`} />
        <span className={`text-sm flex-1 truncate ${isActive ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-text-primary)]'}`}>
          {story.title}
        </span>
        <button
          className="btn-danger p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDeleteStory(story.id); }}
          title="Delete story"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ view, setView, stories, onOpenStory, activeStoryId, onRefresh, onDeleteStory, theme, onToggleTheme, isOpen, onClose }) {
  const handleOpenStory = (storyId) => { onOpenStory(storyId); onClose?.(); };
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderName, setFolderName] = useState('');

  const allFolders = getSubfolders(null);
  const rootFolders = allFolders.filter(f => !f.parentId);
  const rootStories = stories.filter(s => !s.folderId);

  function toggleFolder(id) {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCreateFolder(e) {
    e.preventDefault();
    if (!folderName.trim()) return;
    createFolder(folderName.trim());
    setFolderName('');
    setShowFolderInput(false);
    onRefresh();
  }

  const navItems = [
    { id: 'stories', icon: BookOpen },
    { id: 'characters', icon: Users },
    { id: 'profile', icon: User },
    { id: 'settings', icon: Settings },
  ];

  return (
    <nav className={`bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col h-full sidebar ${isOpen ? 'open' : ''}`}>
      {/* Nav */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-bg-primary)]/50">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = view === item.id || (item.id === 'stories' && view === 'editor');
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); onClose?.(); }}
                className={`flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-all flex-1 ${
                  isActive 
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow-md' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Explorer</span>
          <button className="btn-icon p-2" onClick={() => setShowFolderInput(!showFolderInput)} title="New folder">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {showFolderInput && (
          <div className="mb-3 px-2">
            <input
              className="input py-2 px-3 text-sm"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(e); if (e.key === 'Escape') setShowFolderInput(false); }}
              autoFocus
            />
          </div>
        )}

        <div className="space-y-2">
          {rootFolders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              allStories={stories}
              depth={0}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onOpenStory={handleOpenStory}
              activeStoryId={activeStoryId}
              onCreateSubfolder={onRefresh}
              onDeleteFolder={onRefresh}
              onRenameFolder={onRefresh}
              onDeleteStory={onDeleteStory}
              rootSubfolders={allFolders}
              onClose={onClose}
            />
          ))}
          {rootStories.map(story => (
            <StoryNode
              key={story.id}
              story={story}
              depth={0}
              onOpenStory={handleOpenStory}
              activeStoryId={activeStoryId}
              onDeleteStory={onDeleteStory}
              onClose={onClose}
            />
          ))}
          {rootFolders.length === 0 && rootStories.length === 0 && (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-muted)] opacity-50" />
              <p className="text-sm text-[var(--color-text-muted)]">Create a story to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <span className="w-px h-4 bg-[var(--color-border)]" />
          <a 
            href="https://github.com/lovethatbrandx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Code className="w-4 h-4" />
            @lovethatbrandx
          </a>
        </div>
      </div>
    </nav>
  );
}
