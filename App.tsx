
import React, { useState, useEffect } from 'react';
import { Search, Book, Dumbbell, ArrowLeft, Settings } from 'lucide-react';
import { Word, Story, ViewState, AppSettings, SUPPORTED_LANGUAGES } from './types';
import { WordSearch } from './components/WordSearch';
import { VocabularyList } from './components/VocabularyList';
import { PracticeMode } from './components/PracticeMode';
import { t } from './utils/translations';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SEARCH);
  const [words, setWords] = useState<Word[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    nativeLang: 'Chinese',
    learningLang: 'English'
  });
  const [showSettings, setShowSettings] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
      const savedWords = localStorage.getItem('lingovibe_words');
      if (savedWords) setWords(JSON.parse(savedWords));
      const savedStories = localStorage.getItem('lingovibe_stories');
      if (savedStories) setStories(JSON.parse(savedStories));
  }, []);

  // Save to local storage
  useEffect(() => {
      localStorage.setItem('lingovibe_words', JSON.stringify(words));
  }, [words]);

  useEffect(() => {
      localStorage.setItem('lingovibe_stories', JSON.stringify(stories));
  }, [stories]);

  const handleAddWord = (word: Word) => {
    setWords(prev => [word, ...prev]);
  };

  const handleUpdateWord = (id: string, updates: Partial<Word>) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleRemoveWord = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const handleAddStory = (story: Story) => {
    // If the new story is a draft (not saved), remove other drafts first
    if (!story.isSaved) {
        setStories(prev => [story, ...prev.filter(s => s.isSaved)]);
    } else {
        setStories(prev => [story, ...prev]);
    }
  };

  const handleUpdateStory = (id: string, updates: Partial<Story>) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleRemoveStory = (id: string) => {
      setStories(prev => prev.filter(s => s.id !== id));
  };

  // Navigation Component
  const Navigation = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-6 md:static md:p-0 md:border-0 md:bg-transparent z-50">
        <div className="flex justify-around md:flex-col md:space-y-4 md:w-24 md:fixed md:left-0 md:top-0 md:h-screen md:border-r md:border-slate-200 md:pt-8 bg-white/90 backdrop-blur-sm md:bg-white">
            <button 
                onClick={() => setView(ViewState.SEARCH)}
                className={`p-3 rounded-xl flex flex-col items-center transition-all ${view === ViewState.SEARCH ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <Search size={24} />
                <span className="text-xs mt-1 font-medium md:hidden">{t(settings.nativeLang, 'nav_search')}</span>
            </button>
            <button 
                onClick={() => setView(ViewState.VOCABULARY)}
                className={`p-3 rounded-xl flex flex-col items-center transition-all ${view === ViewState.VOCABULARY ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <Book size={24} />
                <span className="text-xs mt-1 font-medium md:hidden">{t(settings.nativeLang, 'nav_vocab')}</span>
            </button>
            <button 
                onClick={() => setView(ViewState.PRACTICE)}
                className={`p-3 rounded-xl flex flex-col items-center transition-all ${view === ViewState.PRACTICE ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <Dumbbell size={24} />
                <span className="text-xs mt-1 font-medium md:hidden">{t(settings.nativeLang, 'nav_practice')}</span>
            </button>
        </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 md:pl-24">
      <Navigation />

      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">LingoVibe</span>
          </div>
          
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
              <Settings size={20} />
          </button>
      </header>

      {/* Settings Dropdown */}
      {showSettings && (
          <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full m-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">{t(settings.nativeLang, 'settings_title')}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">{t(settings.nativeLang, 'settings_native')}</label>
                          <select 
                            className="w-full p-2 border rounded-lg bg-slate-50"
                            value={settings.nativeLang}
                            onChange={(e) => setSettings({...settings, nativeLang: e.target.value})}
                          >
                              {SUPPORTED_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">{t(settings.nativeLang, 'settings_learning')}</label>
                          <select 
                            className="w-full p-2 border rounded-lg bg-slate-50"
                            value={settings.learningLang}
                            onChange={(e) => setSettings({...settings, learningLang: e.target.value})}
                          >
                              {SUPPORTED_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                      </div>
                      <button 
                        onClick={() => setShowSettings(false)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                      >
                          {t(settings.nativeLang, 'settings_save')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
          <div className={view === ViewState.SEARCH ? 'block' : 'hidden'}>
               <WordSearch 
                  settings={settings} 
                  onAddWord={handleAddWord} 
                  existingWords={words}
               />
          </div>
          <div className={view === ViewState.VOCABULARY ? 'block' : 'hidden'}>
              <VocabularyList 
                words={words} 
                stories={stories}
                settings={settings}
                onRemoveWord={handleRemoveWord}
                onUpdateWord={handleUpdateWord}
                onAddStory={handleAddStory}
                onUpdateStory={handleUpdateStory}
                onRemoveStory={handleRemoveStory}
                onAddWord={handleAddWord}
              />
          </div>
          <div className={view === ViewState.PRACTICE ? 'block' : 'hidden'}>
              <PracticeMode words={words} stories={stories} nativeLang={settings.nativeLang} learningLang={settings.learningLang} />
          </div>
      </main>

      {/* Back Button Logic */}
      {view !== ViewState.SEARCH && (
          <button 
            onClick={() => setView(ViewState.SEARCH)}
            className="fixed top-24 right-4 md:hidden bg-white p-3 rounded-full shadow-lg text-slate-500 z-40"
          >
              <ArrowLeft size={20} />
          </button>
      )}
    </div>
  );
};

export default App;
