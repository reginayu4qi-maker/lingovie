
import React, { useState, useEffect, useRef } from 'react';
import { Search, Volume2, RefreshCw, Plus, Check, Loader2, Image as ImageIcon, BookOpen, Send, Bot, User, MessageCircle } from 'lucide-react';
import { Word, AppSettings } from '../types';
import { lookupWordDetails, generateWordImage, generateSpeech, createWordChat } from '../services/geminiService';
import { playAudio } from '../utils/audioUtils';
import { Chat } from '@google/genai';
import { t } from '../utils/translations';

interface WordSearchProps {
  settings: AppSettings;
  onAddWord: (word: Word) => void;
  existingWords: Word[];
}

export const WordSearch: React.FC<WordSearchProps> = ({ settings, onAddWord, existingWords }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [result, setResult] = useState<Word | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [activeMeaningIndex, setActiveMeaningIndex] = useState(0);

  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Reset active meaning and init chat when result changes
  useEffect(() => {
    if (result) {
        setActiveMeaningIndex(0);
        // Initialize Chat
        const chat = createWordChat(result, settings.nativeLang, settings.learningLang);
        setChatSession(chat);
        // "Hi! I'm your AI tutor..." - kept simple or can be partially localized if needed, keeping english for now as generic start
        setChatMessages([{ role: 'model', text: `Hi! I'm your AI tutor for ${result.text}.` }]);
    }
  }, [result, settings.nativeLang, settings.learningLang]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setRecentlyAdded(false);
    
    try {
      const details = await lookupWordDetails(searchTerm, settings.nativeLang, settings.learningLang);
      
      const newWord: Word = {
        id: crypto.randomUUID(),
        imageUrl: null, // Load async
        createdAt: Date.now(),
        ...details
      };

      setResult(newWord);
      
      // Trigger image generation based on the first/primary definition
      fetchImage(newWord, details.definitionLearning);

    } catch (error) {
      console.error(error);
      alert("Failed to lookup word. Please try again.");
      setResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchImage = async (word: Word, context?: string) => {
    setIsGeneratingImage(true);
    try {
        const base64Image = await generateWordImage(word.text, context || word.definitionLearning);
        // Only update if the current result is still the same word
        setResult(prev => (prev && prev.text === word.text) ? { ...prev, imageUrl: base64Image } : prev);
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
      const audioData = await generateSpeech(text);
      if (audioData) {
          playAudio(audioData);
      }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatSession) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
        const response = await chatSession.sendMessage({ message: userMsg });
        setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (err) {
        console.error("Chat error", err);
    } finally {
        setIsChatLoading(false);
    }
  };

  // Check if the word is already in the existingWords list
  const isAlreadySaved = result 
    ? existingWords.some(w => w.text.toLowerCase() === result.text.toLowerCase())
    : false;

  const handleAdd = () => {
    if (result && !isAlreadySaved) {
      onAddWord(result);
      setRecentlyAdded(true);
      setTimeout(() => setRecentlyAdded(false), 2000);
    }
  };

  const showAddedState = isAlreadySaved || recentlyAdded;
  const isLearningEnglish = settings.learningLang === 'English';
  const NL = settings.nativeLang;
  
  // Get current active meaning to display
  const currentMeaning = result?.meanings?.[activeMeaningIndex] || result;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSearch} className="relative mb-8">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`${t(NL, 'search_placeholder')} ${settings.learningLang}...`}
          className="w-full p-4 pl-12 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium transition-all"
        >
          {isSearching ? <Loader2 className="animate-spin" size={20} /> : t(NL, 'search_button')}
        </button>
      </form>

      {result && currentMeaning && (
        <div className="relative bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
          
          {/* Loading Overlay */}
          {isSearching && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="animate-spin mb-2 text-indigo-600" size={40} />
              <p className="font-medium">{t(NL, 'searching')}</p>
            </div>
          )}

          {/* Header Section */}
          <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                 <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">{result.text}</h2>
                 </div>
                 <div className="flex items-center gap-3 mt-2">
                    <span className="font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 text-sm">{result.pronunciation}</span>
                    <button 
                      onClick={() => handlePlayAudio(result.text)}
                      className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                    >
                       <Volume2 size={20} />
                    </button>
                 </div>
              </div>
              
              <button
                onClick={handleAdd}
                disabled={showAddedState}
                className={`px-4 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-all duration-300 ${
                  showAddedState 
                  ? 'bg-green-100 text-green-700 border border-green-200 cursor-default' 
                  : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:shadow-lg'
                }`}
              >
                {showAddedState ? <Check size={18} /> : <Plus size={18} />}
                <span>{showAddedState ? t(NL, 'added') : t(NL, 'add_word')}</span>
              </button>
            </div>

            {/* Tabs for Parts of Speech */}
            {result.meanings && result.meanings.length > 1 && (
               <div className="flex flex-wrap gap-2 mt-6">
                   {result.meanings.map((meaning, idx) => (
                       <button
                         key={idx}
                         onClick={() => setActiveMeaningIndex(idx)}
                         className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                             activeMeaningIndex === idx 
                             ? 'bg-indigo-600 text-white shadow-md' 
                             : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                         }`}
                       >
                           {meaning.partOfSpeech}
                       </button>
                   ))}
               </div>
            )}
          </div>

          <div className="grid md:grid-cols-2">
             {/* Left Column: Text Content */}
             <div className="p-6 md:p-8 space-y-8">
                <div className="animate-fade-in" key={activeMeaningIndex}> {/* Key change forces animation restart */}
                  <div className="flex items-center space-x-2 mb-2">
                     <BookOpen size={16} className="text-slate-400"/>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t(NL, 'definition')} ({currentMeaning.partOfSpeech})
                     </h3>
                  </div>
                  
                  <div className="space-y-3">
                     {/* Native Definition */}
                     <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <p className="text-xs text-slate-400 uppercase mb-1">{settings.nativeLang}</p>
                         <p className="text-xl font-medium text-slate-800">{currentMeaning.definitionNative}</p>
                     </div>
                     
                     {/* Learning/English Definition */}
                     {isLearningEnglish ? (
                         <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                             <p className="text-xs text-indigo-400 uppercase mb-1">English</p>
                             <p className="text-slate-800">{currentMeaning.definitionEnglish}</p>
                         </div>
                     ) : (
                         <>
                            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-xs text-indigo-400 uppercase mb-1">{settings.learningLang}</p>
                                <p className="text-slate-800">{currentMeaning.definitionLearning}</p>
                            </div>
                            {/* Show English as fallback/reference if different */}
                            {currentMeaning.definitionEnglish && (
                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                    <p className="text-xs text-slate-400 uppercase mb-1">English</p>
                                    <p className="text-slate-600 italic">{currentMeaning.definitionEnglish}</p>
                                </div>
                            )}
                         </>
                     )}
                  </div>
                </div>

                <div className="animate-fade-in" key={`vibe-${activeMeaningIndex}`}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t(NL, 'vibe_check')}</h3>
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                    <p className="text-amber-900 text-sm leading-relaxed">{currentMeaning.vibeCheck}</p>
                  </div>
                </div>

                <div className="animate-fade-in" key={`ex-${activeMeaningIndex}`}>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t(NL, 'example')}</h3>
                   <div className="space-y-3">
                      <div className="flex gap-3 group cursor-pointer" onClick={() => handlePlayAudio(currentMeaning.exampleSentenceLearning || '')}>
                         <div className="mt-1 text-indigo-500"><Volume2 size={16} /></div>
                         <div>
                            <p className="text-lg text-slate-800 font-medium group-hover:text-indigo-700 transition-colors">{currentMeaning.exampleSentenceLearning}</p>
                            <p className="text-slate-500">{currentMeaning.exampleSentenceNative}</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Column: Image & Chat */}
             <div className="bg-slate-100/50 flex flex-col border-l border-slate-100 h-full">
                {/* Image Section */}
                <div className="p-6 md:p-8 flex flex-col items-center justify-center">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-inner bg-slate-200 group">
                    {isGeneratingImage ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
                          <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : result.imageUrl ? (
                        <>
                          <img src={result.imageUrl} alt={result.text} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <button 
                            onClick={() => fetchImage(result, currentMeaning.definitionLearning)}
                            className="absolute bottom-4 right-4 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm hover:bg-white text-slate-600 transition-all opacity-0 group-hover:opacity-100"
                            title="Regenerate Image for this meaning"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon size={48} className="mb-2 opacity-50" />
                          <p className="text-sm">{t(NL, 'no_image')}</p>
                          <button onClick={() => fetchImage(result)} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">{t(NL, 'generate_image_btn')}</button>
                        </div>
                    )}
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-400">
                    {t(NL, 'ai_visualization')}
                  </p>
                </div>

                {/* Chat Section */}
                <div className="flex-1 bg-white border-t border-slate-200 flex flex-col min-h-[350px]">
                    <div className="p-3 border-b border-slate-50 bg-indigo-50/30 flex items-center space-x-2">
                        <MessageCircle size={16} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">{t(NL, 'ask_ai')}</span>
                    </div>
                    
                    <div 
                      ref={chatContainerRef}
                      className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 max-h-[300px]"
                    >
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                             <div className="flex justify-start">
                                 <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
                                     <div className="flex space-x-1">
                                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>

                    <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={t(NL, 'ask_placeholder')}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!chatInput.trim() || isChatLoading}
                            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
