
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Book, Play, Pause, Square, Wand2, Languages, Volume2, Loader2, X, RefreshCw, Plus, Check, Tag, Filter, Save, Bookmark, ArrowLeft, Library } from 'lucide-react';
import { Word, Story, AppSettings, Difficulty } from '../types';
import { generateStoryFromWords, generateSpeech, lookupWordDetails } from '../services/geminiService';
import { playAudio, decodeBase64, decodeAudioData } from '../utils/audioUtils';
import { t } from '../utils/translations';

interface VocabularyListProps {
  words: Word[];
  stories: Story[];
  settings: AppSettings;
  onRemoveWord: (id: string) => void;
  onUpdateWord: (id: string, updates: Partial<Word>) => void;
  onAddStory: (story: Story) => void;
  onUpdateStory: (id: string, updates: Partial<Story>) => void;
  onRemoveStory: (id: string) => void;
  onAddWord: (word: Word) => void;
}

export const VocabularyList: React.FC<VocabularyListProps> = ({ 
    words, stories, settings, 
    onRemoveWord, onUpdateWord, 
    onAddStory, onUpdateStory, onRemoveStory, onAddWord 
}) => {
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  
  // Story View State
  const [storyTab, setStoryTab] = useState<'draft' | 'library'>('draft');
  const [viewingStory, setViewingStory] = useState<Story | null>(null); // If set, shows "Reader Mode" in Library

  // Playback State
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopPlaybackFlag = useRef<boolean>(false);
  
  // Grouping State
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('All');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Word Lookup Modal State
  const [lookedUpWord, setLookedUpWord] = useState<Partial<Word> | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [modalPosition, setModalPosition] = useState<{x: number, y: number} | null>(null);

  const NL = settings.nativeLang;

  // Clean up Audio Context on unmount
  useEffect(() => {
      return () => {
          if (audioCtxRef.current) {
              audioCtxRef.current.close();
          }
      };
  }, []);

  // Derived State
  const allGroups = useMemo(() => {
      const groups = new Set<string>();
      words.forEach(w => w.groups?.forEach(g => groups.add(g)));
      return Array.from(groups).sort();
  }, [words]);

  const filteredWords = useMemo(() => {
      if (activeGroupFilter === 'All') return words;
      return words.filter(w => w.groups?.includes(activeGroupFilter));
  }, [words, activeGroupFilter]);

  const currentDraftStory = useMemo(() => stories.find(s => !s.isSaved), [stories]);
  const savedStories = useMemo(() => stories.filter(s => s.isSaved).sort((a,b) => b.createdAt - a.createdAt), [stories]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedWords);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedWords(newSet);
  };

  // Group Handlers
  const handleAddToGroup = () => {
      if (!newGroupName.trim()) return;
      
      selectedWords.forEach(wordId => {
          const word = words.find(w => w.id === wordId);
          if (word) {
              const currentGroups = word.groups || [];
              if (!currentGroups.includes(newGroupName)) {
                  onUpdateWord(wordId, { groups: [...currentGroups, newGroupName] });
              }
          }
      });
      setNewGroupName('');
      setShowGroupModal(false);
      setSelectedWords(new Set()); 
  };

  const handleRemoveFromGroup = (wordId: string, group: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const word = words.find(w => w.id === wordId);
      if (word && word.groups) {
          onUpdateWord(wordId, { groups: word.groups.filter(g => g !== group) });
      }
  };

  // Story Generation Handlers
  const handleGenerateStory = async () => {
    if (selectedWords.size === 0) return;
    setIsGenerating(true);
    setStoryTab('draft'); // Switch to draft tab
    try {
        const selectedWordObjects = words.filter(w => selectedWords.has(w.id));
        const storyData = await generateStoryFromWords(selectedWordObjects, settings.nativeLang, settings.learningLang, difficulty);
        
        const newStory: Story = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            isSaved: false, 
            ...storyData
        };
        onAddStory(newStory);
    } catch (e) {
        alert("Failed to generate story");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRegenerateStory = async (story: Story) => {
    setIsGenerating(true);
    try {
        const usedWords = words.filter(w => story.wordsUsed.includes(w.id));
        if (usedWords.length === 0) {
            alert("Cannot regenerate: Original words have been removed.");
            return;
        }

        const storyData = await generateStoryFromWords(usedWords, settings.nativeLang, settings.learningLang, difficulty);
        
        const newStory: Story = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            isSaved: false, 
            ...storyData
        };
        onAddStory(newStory);
        setStoryTab('draft'); // Always jump to draft to show result
    } catch (e) {
        alert("Failed to regenerate story");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveStory = (storyId: string) => {
      onUpdateStory(storyId, { isSaved: true });
      // Optional: switch to library? 
      // Let's keep user in draft view but visually it moves to library.
      // For clarity, let's switch them to library view:
      setStoryTab('library');
      setViewingStory(stories.find(s => s.id === storyId) || null);
  };

  // Playback Logic
  const splitSentences = (text: string) => {
      if(!text) return [];
      // Split by punctuation (. ! ?) followed by space or end of string.
      // Keep the punctuation attached to the sentence.
      return text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [text];
  };

  const handleStopPlayback = async () => {
      stopPlaybackFlag.current = true;
      if (audioCtxRef.current) {
          await audioCtxRef.current.suspend();
          setPlaybackState('idle');
          setCurrentSentenceIdx(-1);
      }
  };

  const handlePausePlayback = async () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          await audioCtxRef.current.suspend();
          setPlaybackState('paused');
      }
  };

  const handleResumePlayback = async () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
          setPlaybackState('playing');
      }
  };

  const handlePlayStory = async (text: string) => {
      // If already paused, resume
      if (playbackState === 'paused') {
          handleResumePlayback();
          return;
      }

      // Start fresh
      if (playbackState === 'playing') {
          await handleStopPlayback();
          // Wait a tick for cleanup
          await new Promise(r => setTimeout(r, 50));
      }

      setPlaybackState('playing');
      stopPlaybackFlag.current = false;
      setCurrentSentenceIdx(-1);

      // Initialize Context
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
      }

      const sentences = splitSentences(text);
      
      for (let i = 0; i < sentences.length; i++) {
          if (stopPlaybackFlag.current) break;
          
          setCurrentSentenceIdx(i);
          
          try {
              // Clean sentence for TTS (remove brackets)
              const cleanText = sentences[i].replace(/[\[\]]/g, '');
              const audioBase64 = await generateSpeech(cleanText);
              
              if (stopPlaybackFlag.current) break;
              if (!audioBase64) continue;

              const bytes = decodeBase64(audioBase64);
              const buffer = await decodeAudioData(bytes, audioCtxRef.current);

              await new Promise<void>((resolve) => {
                  if (stopPlaybackFlag.current || !audioCtxRef.current) {
                      resolve();
                      return;
                  }

                  const source = audioCtxRef.current.createBufferSource();
                  source.buffer = buffer;
                  source.connect(audioCtxRef.current.destination);
                  source.onended = () => resolve();
                  source.start();
              });

          } catch (e) {
              console.error("Playback error", e);
          }
      }

      setPlaybackState('idle');
      setCurrentSentenceIdx(-1);
  };

  // Word Lookup Logic
  const handleWordClick = async (text: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const cleanText = text.replace(/[\[\].,!?]/g, '').trim();
      if (!cleanText) return;

      const existingWord = words.find(w => w.text.toLowerCase() === cleanText.toLowerCase());
      
      if (existingWord) {
          setLookedUpWord(existingWord);
          setModalPosition({ x: e.clientX, y: e.clientY });
          return;
      }

      setModalPosition({ x: e.clientX, y: e.clientY });
      setIsLookingUp(true);
      setLookedUpWord({ text: cleanText });

      try {
          const details = await lookupWordDetails(cleanText, settings.nativeLang, settings.learningLang);
          setLookedUpWord({ ...details, id: 'temp' });
      } catch (err) {
          console.error(err);
          setLookedUpWord(null);
          setModalPosition(null);
      } finally {
          setIsLookingUp(false);
      }
  };

  const handleSaveLookedUpWord = () => {
      if (lookedUpWord && lookedUpWord.text && !words.some(w => w.text.toLowerCase() === lookedUpWord.text!.toLowerCase())) {
          const newWord: Word = {
              id: crypto.randomUUID(),
              imageUrl: null,
              createdAt: Date.now(),
              ...lookedUpWord as Omit<Word, 'id' | 'createdAt' | 'imageUrl'>,
              definitionNative: lookedUpWord.definitionNative || '',
              definitionLearning: lookedUpWord.definitionLearning || '',
              definitionEnglish: lookedUpWord.definitionEnglish || '',
              exampleSentenceLearning: lookedUpWord.exampleSentenceLearning || '',
              exampleSentenceNative: lookedUpWord.exampleSentenceNative || '',
              pronunciation: lookedUpWord.pronunciation || '',
              vibeCheck: lookedUpWord.vibeCheck || '',
          };
          onAddWord(newWord);
      }
  };

  // Renderers
  const renderStoryContent = (text: string) => {
      const sentences = splitSentences(text);
      return sentences.map((sentence, sIdx) => {
          const isCurrentSentence = playbackState !== 'idle' && currentSentenceIdx === sIdx;
          
          return (
              <span 
                key={sIdx} 
                className={`transition-colors duration-300 rounded px-1 inline ${isCurrentSentence ? 'bg-yellow-200/70' : ''}`}
              >
                  {sentence.split(/([\s\[\]]+)/).map((chunk, cIdx) => {
                       if (!chunk.trim()) return <span key={cIdx}>{chunk}</span>;

                       const isSeedWord = chunk.startsWith('[') && chunk.endsWith(']');
                       const displayWord = chunk.replace(/[\[\]]/g, '');

                       return (
                           <span 
                             key={cIdx} 
                             className={`inline-block cursor-pointer rounded px-0.5 mx-0.5 transition-all duration-200 ${
                                 isSeedWord 
                                 ? 'text-indigo-700 font-extrabold border-b-2 border-indigo-300 hover:text-indigo-900' 
                                 : 'text-slate-700 hover:text-indigo-600'
                             }`}
                             onClick={(e) => handleWordClick(displayWord, e)}
                           >
                               {displayWord}
                           </span>
                       )
                  })}
                  {' '}
              </span>
          );
      });
  };

  // Story Component (Reusable)
  const StoryCard = ({ story, readOnly = false }: { story: Story, readOnly?: boolean }) => {
      const [showTranslation, setShowTranslation] = useState(false);
      
      return (
        <div className={`h-full flex flex-col ${readOnly ? '' : 'bg-white rounded-3xl shadow-sm border border-slate-100 p-6'}`}>
            <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                <div>
                        <h3 className="text-2xl font-bold text-slate-800 leading-tight">{story.title}</h3>
                        <div className="flex items-center space-x-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            story.difficulty === 'Advanced' ? 'bg-red-50 text-red-600 border-red-100' :
                            story.difficulty === 'Intermediate' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                            'bg-green-50 text-green-600 border-green-100'
                        }`}>
                            {story.difficulty ? t(NL, story.difficulty.toLowerCase() as any) : story.difficulty}
                        </span>
                        <span className="text-xs text-slate-400">
                            {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                        </div>
                </div>
                
                <div className="flex items-center space-x-2">
                        {!story.isSaved && (
                            <button 
                            onClick={() => handleSaveStory(story.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium"
                            >
                                <Save size={16} />
                                {t(NL, 'save')}
                            </button>
                        )}
                        {story.isSaved && (
                            <button 
                            onClick={() => {
                                if (confirm(t(NL, 'confirm_delete_story'))) {
                                    onRemoveStory(story.id);
                                    if (viewingStory?.id === story.id) setViewingStory(null);
                                }
                            }}
                            className="p-2 rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete Story"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button 
                        onClick={() => handleRegenerateStory(story)}
                        className="p-2 rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Regenerate"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-fit">
                 {playbackState === 'playing' ? (
                     <button onClick={handlePausePlayback} className="p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-all">
                         <Pause size={20} fill="currentColor" />
                     </button>
                 ) : (
                     <button onClick={() => handlePlayStory(story.contentLearning)} className="p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-all">
                         <Play size={20} fill="currentColor" className="ml-1"/>
                     </button>
                 )}
                 
                 {playbackState !== 'idle' && (
                     <button onClick={handleStopPlayback} className="p-2 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all">
                         <Square size={16} fill="currentColor"/>
                     </button>
                 )}

                 <div className="h-6 w-px bg-slate-200 mx-1"></div>

                 <button 
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showTranslation ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 border border-slate-200'}`}
                >
                    <Languages size={14} />
                    {t(NL, 'translate')}
                </button>
            </div>
            
            <div className="prose prose-slate max-w-none mb-6 flex-1 overflow-y-auto pr-2">
                <p className="text-lg leading-loose text-slate-700 font-serif">
                    {renderStoryContent(story.contentLearning)}
                </p>
                
                {showTranslation && (
                    <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in">
                        <p className="text-slate-500 leading-relaxed italic">{story.contentNative}</p>
                    </div>
                )}
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                {story.wordsUsed && story.wordsUsed.map((wid, i) => {
                    const w = words.find(wd => wd.id === wid);
                    // Safe check if w exists
                    if(!w) return null;
                    return <span key={wid+i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">{w.text}</span>
                })}
            </div>
        </div>
      );
  };

  const isWordSaved = lookedUpWord && words.some(w => w.text.toLowerCase() === lookedUpWord.text?.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-12 gap-8 lg:h-[calc(100vh-100px)] h-auto relative">
      
      {/* Left Column: Word List & Grouping */}
      <div className="lg:col-span-4 flex flex-col lg:h-full h-[500px] bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header with Filters & Actions */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-700 mb-3">{t(NL, 'my_vocab')} ({filteredWords.length})</h2>
            
            {/* Group Filters */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                <button 
                    onClick={() => setActiveGroupFilter('All')}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        activeGroupFilter === 'All' 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                >
                    {t(NL, 'all')}
                </button>
                {allGroups.map(g => (
                    <button 
                        key={g}
                        onClick={() => setActiveGroupFilter(g)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                            activeGroupFilter === g 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-3">
                {selectedWords.size > 0 && (
                    <div className="flex gap-2 animate-fade-in">
                         <button
                             onClick={() => setShowGroupModal(true)} 
                             className="flex-1 text-xs bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1"
                         >
                             <Tag size={14} />
                             {t(NL, 'add_to_group')}
                         </button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <select 
                        value={difficulty} 
                        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                        className="text-sm p-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full"
                    >
                        <option value="Beginner">{t(NL, 'beginner')}</option>
                        <option value="Intermediate">{t(NL, 'intermediate')}</option>
                        <option value="Advanced">{t(NL, 'advanced')}</option>
                    </select>
                    <button 
                        onClick={handleGenerateStory}
                        disabled={selectedWords.size === 0 || isGenerating}
                        className="text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center font-medium transition-colors w-full"
                    >
                        {isGenerating ? <Loader2 size={14} className="animate-spin mr-1"/> : <Wand2 size={14} className="mr-1" />}
                        {t(NL, 'story_button')} ({selectedWords.size})
                    </button>
                </div>
            </div>
        </div>

        {/* Word List */}
        <div className="overflow-y-auto flex-1 p-2">
            {filteredWords.length === 0 ? (
                <p className="text-center text-slate-400 mt-10 text-sm">{t(NL, 'no_words')}</p>
            ) : (
                filteredWords.map(word => (
                    <div key={word.id} className="flex items-start p-3 hover:bg-slate-50 rounded-xl group transition-colors cursor-pointer border-b border-slate-50 last:border-0" onClick={() => toggleSelection(word.id)}>
                        <input 
                            type="checkbox" 
                            checked={selectedWords.has(word.id)}
                            onChange={() => toggleSelection(word.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 mr-3 cursor-pointer"
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-slate-800">{word.text}</p>
                                <div className="flex gap-1">
                                    {word.groups?.map(g => (
                                        <span key={g} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {g}
                                            <button onClick={(e) => handleRemoveFromGroup(word.id, g, e)} className="ml-1 hover:text-indigo-900"><X size={10}/></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{word.definitionNative}</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveWord(word.id); }}
                            className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Right Column: Stories */}
      <div className="lg:col-span-8 flex flex-col lg:h-full h-[600px] overflow-hidden mt-4 lg:mt-0">
         {/* Story Tabs */}
         <div className="flex items-center space-x-4 mb-4 border-b border-slate-200 pb-2">
             <button 
                onClick={() => { setStoryTab('draft'); setViewingStory(null); }}
                className={`flex items-center gap-2 pb-2 px-2 font-medium text-sm transition-all ${storyTab === 'draft' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 <Wand2 size={16} />
                 {t(NL, 'current_draft')}
             </button>
             <button 
                onClick={() => { setStoryTab('library'); setViewingStory(null); }}
                className={`flex items-center gap-2 pb-2 px-2 font-medium text-sm transition-all ${storyTab === 'library' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 <Library size={16} />
                 {t(NL, 'my_library')}
             </button>
         </div>

         {/* Draft View */}
         {storyTab === 'draft' && (
             <div className="flex-1 overflow-y-auto h-full">
                 {currentDraftStory ? (
                     <div className="h-full">
                        <StoryCard story={currentDraftStory} />
                     </div>
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Book size={48} className="mb-4 opacity-20" />
                        <p>{t(NL, 'select_words_prompt')}</p>
                     </div>
                 )}
             </div>
         )}

         {/* Library View */}
         {storyTab === 'library' && (
             <div className="flex-1 overflow-y-auto h-full relative">
                 {viewingStory ? (
                     <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                         <div className="p-4 border-b border-slate-100 flex items-center">
                             <button onClick={() => { setViewingStory(null); handleStopPlayback(); }} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-medium">
                                 <ArrowLeft size={16} /> {t(NL, 'back_to_library')}
                             </button>
                         </div>
                         <div className="flex-1 overflow-hidden p-6">
                             <StoryCard story={viewingStory} readOnly={true} />
                         </div>
                     </div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {savedStories.length === 0 ? (
                             <div className="col-span-2 text-center py-20 text-slate-400">
                                 <Bookmark className="mx-auto mb-2 opacity-20" size={40}/>
                                 <p>{t(NL, 'no_saved_stories')}</p>
                             </div>
                         ) : (
                             savedStories.map(story => (
                                 <div 
                                    key={story.id} 
                                    onClick={() => setViewingStory(story)}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                                 >
                                     <h4 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{story.title}</h4>
                                     <div className="flex items-center justify-between text-xs text-slate-400">
                                         <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                                         <span className={`px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100`}>{story.difficulty ? t(NL, story.difficulty.toLowerCase() as any) : story.difficulty}</span>
                                     </div>
                                     <p className="mt-3 text-sm text-slate-500 line-clamp-2">
                                         {story.contentLearning.replace(/[\[\]]/g, '')}
                                     </p>
                                 </div>
                             ))
                         )}
                     </div>
                 )}
             </div>
         )}
      </div>

      {/* Group Add Modal */}
      {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowGroupModal(false)}>
              <div className="bg-white p-6 rounded-2xl shadow-xl w-80" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-slate-800 mb-4">{t(NL, 'add_to_group')}</h3>
                  <div className="flex flex-col gap-3">
                      {/* Existing Groups List */}
                      {allGroups.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                              {allGroups.map(g => (
                                  <button 
                                    key={g} 
                                    onClick={() => setNewGroupName(g)}
                                    className={`px-2 py-1 text-xs rounded border ${newGroupName === g ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200'}`}
                                  >
                                      {g}
                                  </button>
                              ))}
                          </div>
                      )}
                      
                      <input 
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={t(NL, 'enter_group_name')}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button 
                        onClick={handleAddToGroup}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700"
                      >
                          {t(NL, 'save_group')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Word Detail Modal */}
      {modalPosition && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setModalPosition(null)}></div>
            <div 
                className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-80 md:w-96 animate-fade-in"
                style={{ 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)' 
                }}
            >
                <button onClick={() => setModalPosition(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
                
                {isLookingUp ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                        <p className="text-slate-500 text-sm">Looking up "{lookedUpWord?.text}"...</p>
                    </div>
                ) : lookedUpWord ? (
                    <div>
                        <div className="flex justify-between items-start pr-8 mb-2">
                             <h3 className="text-2xl font-bold text-slate-900">{lookedUpWord.text}</h3>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                             <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{lookedUpWord.pronunciation}</span>
                             <button onClick={() => { if(lookedUpWord.text) handlePlayStory(lookedUpWord.text) }} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-full">
                                 <Volume2 size={16} />
                             </button>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">{t(NL, 'definition')}</p>
                                <p className="text-slate-800 font-medium">{lookedUpWord.definitionNative}</p>
                                <p className="text-slate-600 text-sm">{lookedUpWord.definitionLearning}</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveLookedUpWord}
                            disabled={isWordSaved}
                            className={`w-full py-2 rounded-xl flex items-center justify-center space-x-2 font-medium transition-colors ${
                                isWordSaved ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                        >
                            {isWordSaved ? <Check size={18} /> : <Plus size={18} />}
                            <span>{isWordSaved ? t(NL, 'added') : t(NL, 'add_word')}</span>
                        </button>
                    </div>
                ) : (
                    <p className="text-red-500 text-center py-4">Failed to load word details.</p>
                )}
            </div>
          </>
      )}
    </div>
  );
};
