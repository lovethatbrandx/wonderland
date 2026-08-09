import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Save, X, Feather, BookOpen, Palette, Tag, FileText, Sparkles, PenTool } from 'lucide-react';
import { getProfile, saveProfile } from '../store';

const PROFILE_FIELDS = [
  { key: 'name', label: 'Your Name', icon: PenTool, placeholder: 'Your name or pen name' },
  { key: 'bio', label: 'About You', icon: Feather, placeholder: 'A bit about yourself — interests, background, what you enjoy in stories...', multiline: true },
  { key: 'writingStyle', label: 'Preferred Writing Style', icon: Palette, placeholder: 'e.g. Dark and atmospheric, lighthearted and whimsical, epic and grandiose...', multiline: true },
  { key: 'preferredGenres', label: 'Preferred Genres / Themes', icon: Tag, placeholder: 'e.g. High fantasy, political intrigue, coming-of-age' },
  { key: 'backgroundNotes', label: 'Notes for the AI', icon: FileText, placeholder: 'Any additional context the AI should know about your preferences, favorite tropes, or world details...', multiline: true },
];

export default function UserProfile() {
  const [profile, setProfile] = useState(getProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...profile });

  function handleSave(e) { e.preventDefault(); saveProfile(draft); setProfile({ ...draft }); setEditing(false); }
  function handleCancel() { setDraft({ ...profile }); setEditing(false); }
  const hasContent = PROFILE_FIELDS.some(f => profile[f.key]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>Your Profile</h1>
            <p className="text-base text-[var(--color-text-secondary)]">Tell the AI about yourself so it can personalize your stories</p>
          </div>
          {!editing && <button className="btn btn-primary text-sm px-6 py-3" onClick={() => { setEditing(true); setDraft({ ...profile }); }}><Edit3 className="w-5 h-5" /> Edit Profile</button>}
        </div>

        <div className="card p-5 mb-6" style={{ borderLeft: '4px solid var(--color-accent)', background: 'linear-gradient(135deg, var(--color-bg-card) 0%, rgba(201, 160, 220, 0.05) 100%)' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(201, 160, 220, 0.2) 0%, rgba(126, 202, 195, 0.2) 100%)' }}>
              <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed pt-1.5">This information is included in the AI system prompt so the LLM knows your preferences when co-writing stories.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {editing ? (
            <motion.form key="edit-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handleSave} className="space-y-6">
              <div className="card p-6 space-y-6">
                <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>Edit Your Profile</h2>
                {PROFILE_FIELDS.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key}>
                      <label className="flex items-center gap-3 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                        <Icon className="w-5 h-5 text-[var(--color-accent)]" />
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea value={draft[field.key] || ''} onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })} placeholder={field.placeholder} rows={6} className="textarea text-sm py-3 px-4" />
                      ) : (
                        <input type="text" value={draft[field.key] || ''} onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })} placeholder={field.placeholder} className="input text-sm py-3 px-4" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3"><button type="button" className="btn btn-secondary text-sm px-5 py-3" onClick={handleCancel}><X className="w-5 h-5" /> Cancel</button><button type="submit" className="btn btn-primary text-sm px-6 py-3"><Save className="w-5 h-5" /> Save Profile</button></div>
            </motion.form>
          ) : (
            <motion.div key="display" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {hasContent ? (
                <div className="space-y-5">
                  {PROFILE_FIELDS.filter(f => profile[f.key]).map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="card p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent-muted)' }}>
                            <Icon className="w-5 h-5 text-[var(--color-accent)]" />
                          </div>
                          <h3 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{field.label}</h3>
                        </div>
                        <p className="text-lg text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-family-display)' }}>{profile[field.key]}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state py-24">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto" style={{ background: 'linear-gradient(135deg, rgba(201, 160, 220, 0.15) 0%, rgba(126, 202, 195, 0.15) 100%)', border: '2px solid var(--color-border)' }}>
                    <BookOpen className="w-10 h-10 text-[var(--color-accent)]" />
                  </div>
                  <p className="text-xl text-[var(--color-text-secondary)] mb-3">No profile info yet</p>
                  <p className="text-base text-[var(--color-text-muted)] mb-8">Add your preferences so the AI writes stories tailored to you</p>
                  <button className="btn btn-primary text-base px-6 py-3" onClick={() => { setEditing(true); setDraft({ ...profile }); }}><Edit3 className="w-5 h-5" /> Add Your Details</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
