import { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { getStories, getCharacters, getSettings, deleteStory, syncFromSupabase, getTheme, saveTheme } from './store';
import Sidebar from './components/Sidebar';
import StartStory from './components/StartStory';
import StoryEditor from './components/StoryEditor';
import CharacterManager from './components/CharacterManager';
import Settings from './components/Settings';
import UserProfile from './components/UserProfile';

export default function App() {
  const [stories, setStories] = useState(getStories);
  const [characters, setCharacters] = useState(getCharacters);
  const [view, setView] = useState('stories');
  const [activeStoryId, setActiveStoryId] = useState(null);
  const [theme, setTheme] = useState(getTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }

  // Auto-sync characters from Supabase on first load if credentials exist
  useEffect(() => {
    const s = getSettings();
    if (s.supabaseUrl && s.supabaseAnonKey) {
      syncFromSupabase().then(() => {
        setCharacters(getCharacters());
      }).catch(err => {
        console.error('[APP] Supabase sync error:', err);
      });
    }
  }, []);

  const refreshStories = useCallback(() => setStories(getStories()), []);
  const refreshCharacters = useCallback(() => setCharacters(getCharacters()), []);

  const openStory = (storyId) => {
    setActiveStoryId(storyId);
    setView('editor');
  };

  const createAndOpenStory = (storyId) => {
    setActiveStoryId(storyId);
    setView('editor');
  };

  const goBack = () => {
    setActiveStoryId(null);
    setView('stories');
  };

  const handleDeleteStory = (storyId) => {
    if (confirm('Delete this story? This cannot be undone.')) {
      deleteStory(storyId);
      if (activeStoryId === storyId) {
        goBack();
      }
      refreshStories();
    }
  };

  return (
    <div className="app">
      {/* Mobile sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="btn btn-ghost p-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-[var(--text-primary)]">Wonderland</span>
      </div>
      <Sidebar
        view={view}
        setView={setView}
        stories={stories}
        onOpenStory={openStory}
        activeStoryId={activeStoryId}
        onRefresh={refreshStories}
        onDeleteStory={handleDeleteStory}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        {view === 'stories' && (
          <StartStory
            onRefresh={refreshStories}
            onOpenStory={openStory}
            onCreateAndOpen={createAndOpenStory}
          />
        )}
        {view === 'editor' && activeStoryId && (
          <StoryEditor
            storyId={activeStoryId}
            onBack={goBack}
            characters={characters}
            onRefreshStories={refreshStories}
          />
        )}
        {view === 'characters' && (
          <CharacterManager
            characters={characters}
            onRefresh={refreshCharacters}
          />
        )}
        {view === 'profile' && (
          <UserProfile />
        )}
        {view === 'settings' && (
          <Settings />
        )}
      </main>
    </div>
  );
}
