
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCw, Volume2, Mic, Square, Star, Award, ArrowRight, HelpCircle, AlertCircle, Settings2, Shuffle, Repeat, CheckCircle, PlayCircle, Languages, Wand2 } from 'lucide-react';
import { Word, Story, PracticeType, PronunciationResult } from '../types';
import { playAudio, blobToBase64 } from '../utils/audioUtils';
import { generateSpeech, generateVocabularyQuiz, evaluatePronunciation } from '../services/geminiService';
import { t } from '../utils/translations';

interface PracticeModeProps {
  words: Word[];
  stories: Story[];
  nativeLang: string;
  learningLang: string; // Added learningLang support
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ words, stories, nativeLang, learningLang = "English" }) => {
  const [mode, setMode] = useState<PracticeType>(PracticeType.FLASHCARD);
  
  // Flashcard Specific State
  const [fcPhase, setFcPhase] = useState<'setup' | 'playing' | 'complete'>('setup');
  const [fcGroup, setFcGroup] = useState<string>('All');
  const [fcShuffle, setFcShuffle] = useState<boolean>(false);
  const [fcQueue, setFcQueue] = useState<Word[]>([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Global Index for other modes (Pronunciation)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Quiz State
  const [quizPhase, setQuizPhase] = useState<'setup' | 'playing'>('setup');
  const [quizGroup, setQuizGroup] = useState<string>('All');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: string}>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [visibleTranslations, setVisibleTranslations] = useState<Set<number>>(new Set());

  // Pronunciation State
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const NL = nativeLang;

  // Derived Groups for Setup
  const allGroups = useMemo(() => {
      const g = new Set<string>();
      words.forEach(w => w.groups?.forEach(grp => g.add(grp)));
      return Array.from(g).sort();
  }, [words]);

  const handlePlayAudio = async (text: string, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      const audio = await generateSpeech(text);
      if(audio) playAudio(audio);
  };

  // --- Flashcard Logic ---
  
  const startFlashcardSession = () => {
      let list = fcGroup === 'All' ? words : words.filter(w => w.groups?.includes(fcGroup));
      
      if (list.length === 0) {
          alert("No words found in this group.");
          return;
      }

      if (fcShuffle) {
          // Fisher-Yates shuffle
          list = [...list];
          for (let i = list.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [list[i], list[j]] = [list[j], list[i]];
          }
      }

      setFcQueue(list);
      setFcIndex(0);
      setIsFlipped(false);
      setFcPhase('playing');
  };

  const nextCard = () => {
      setIsFlipped(false);
      if (fcIndex < fcQueue.length - 1) {
          setFcIndex(prev => prev + 1);
      } else {
          setFcPhase('complete');
      }
  };

  const restartSession = () => {
      startFlashcardSession(); // Re-runs logic (including shuffle if enabled)
  };

  const endSession = () => {
      setFcPhase('setup');
      setFcQueue([]);
      setFcIndex(0);
  };

  // --- Pronunciation Logic ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
              const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
              await handleEvaluation(audioBlob);
              stream.getTracks().forEach(track => track.stop());
          };

          recorder.start();
          setIsRecording(true);
          setPronunciationResult(null);
      } catch (err) {
          console.error("Mic error:", err);
          alert("Could not access microphone. Please ensure you have granted permission.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleEvaluation = async (blob: Blob) => {
      setIsEvaluating(true);
      try {
          const base64 = await blobToBase64(blob);
          const currentWord = words[currentIndex]; // Use global index for pronunciation
          const result = await evaluatePronunciation(base64, currentWord.text, nativeLang);
          setPronunciationResult(result);
      } catch (error) {
          console.error(error);
          alert("Evaluation failed. Please try again.");
      } finally {
          setIsEvaluating(false);
      }
  };

  const nextPronunciationWord = () => {
      setPronunciationResult(null);
      setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  // --- Quiz Logic ---
  const startQuizSession = async () => {
      let list = quizGroup === 'All' ? words : words.filter(w => w.groups?.includes(quizGroup));
      
      if (list.length === 0) {
          alert("No words found in this group.");
          return;
      }

      setQuizLoading(true);
      setQuizPhase('playing');
      setQuizQuestions([]);
      setQuizAnswers({});
      setVisibleTranslations(new Set());

      try {
          // generateVocabularyQuiz handles random selection internally or we can slice here
          const qs = await generateVocabularyQuiz(list, nativeLang, learningLang);
          setQuizQuestions(qs);
      } catch (e) {
          console.error(e);
          alert("Failed to generate quiz.");
          setQuizPhase('setup');
      } finally {
          setQuizLoading(false);
      }
  };

  const toggleTranslation = (idx: number) => {
      const newSet = new Set(visibleTranslations);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      setVisibleTranslations(newSet);
  };

  // Helper for Pronunciation Mode to get current word
  const pronunciationWord = words[currentIndex];
  
  // Helper for Flashcard Mode to get current word
  const flashcardWord = fcQueue[fcIndex];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      {/* Mode Selector */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <button 
            onClick={() => setMode(PracticeType.FLASHCARD)}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all ${mode === PracticeType.FLASHCARD ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
            {t(NL, 'flashcards')}
        </button>
        <button 
            onClick={() => setMode(PracticeType.PRONUNCIATION)}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all ${mode === PracticeType.PRONUNCIATION ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
            {t(NL, 'pronunciation')}
        </button>
        <button 
            onClick={() => setMode(PracticeType.VOCAB_QUIZ)}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all ${mode === PracticeType.VOCAB_QUIZ ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
            {t(NL, 'fill_blanks')}
        </button>
      </div>

      {words.length === 0 && (
          <div className="text-center text-slate-400 mt-20">
              <HelpCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t(NL, 'start_practice_prompt')}</p>
          </div>
      )}

      {/* 
        ====================================
        FLASHCARD MODE
        ====================================
      */}
      {mode === PracticeType.FLASHCARD && words.length > 0 && (
          <div className="flex flex-col items-center w-full">
             
             {/* PHASE: SETUP */}
             {fcPhase === 'setup' && (
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full text-center animate-fade-in">
                     <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                         <Settings2 size={32} />
                     </div>
                     <h2 className="text-2xl font-bold text-slate-800 mb-2">{t(NL, 'fc_setup_title')}</h2>
                     <p className="text-slate-500 mb-8">{t(NL, 'fc_setup_desc')}</p>

                     <div className="space-y-4 mb-8 text-left">
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1.5">{t(NL, 'select_group')}</label>
                             <select 
                                value={fcGroup}
                                onChange={(e) => setFcGroup(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             >
                                 <option value="All">{t(NL, 'all')} ({words.length})</option>
                                 {allGroups.map(g => (
                                     <option key={g} value={g}>
                                         {g} ({words.filter(w => w.groups?.includes(g)).length})
                                     </option>
                                 ))}
                             </select>
                         </div>

                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1.5">{t(NL, 'order')}</label>
                             <div className="grid grid-cols-2 gap-2">
                                 <button 
                                    onClick={() => setFcShuffle(false)}
                                    className={`p-3 rounded-xl flex items-center justify-center gap-2 font-medium border transition-all ${!fcShuffle ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                 >
                                     <Repeat size={16} /> {t(NL, 'sequential')}
                                 </button>
                                 <button 
                                    onClick={() => setFcShuffle(true)}
                                    className={`p-3 rounded-xl flex items-center justify-center gap-2 font-medium border transition-all ${fcShuffle ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                 >
                                     <Shuffle size={16} /> {t(NL, 'shuffle')}
                                 </button>
                             </div>
                         </div>
                     </div>

                     <button 
                        onClick={startFlashcardSession}
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                     >
                         <PlayCircle size={20} />
                         {t(NL, 'start_session')}
                     </button>
                 </div>
             )}

             {/* PHASE: PLAYING */}
             {fcPhase === 'playing' && flashcardWord && (
                 <div className="w-full flex flex-col items-center animate-fade-in">
                     <div className="mb-6 flex items-center space-x-2 text-slate-400 text-sm font-medium">
                         <span>{t(NL, 'card_count')} {fcIndex + 1} / {fcQueue.length}</span>
                         <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                                style={{ width: `${((fcIndex + 1) / fcQueue.length) * 100}%` }}
                             />
                         </div>
                     </div>

                     <div 
                        className="relative w-full max-w-xl aspect-[3/4] md:aspect-[4/3] perspective-1000 cursor-pointer group"
                        onClick={() => setIsFlipped(!isFlipped)}
                     >
                         <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d rounded-3xl shadow-xl ${isFlipped ? 'rotate-y-180' : ''}`} 
                            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                         >
                             {/* Front */}
                             <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl flex flex-col items-center justify-center p-8 border border-slate-100 text-center">
                                <h2 className="text-6xl md:text-7xl font-bold text-slate-800 mb-6">{flashcardWord.text}</h2>
                                <p className="text-xl text-slate-500 font-mono bg-slate-50 px-4 py-2 rounded-xl mb-8">{flashcardWord.pronunciation}</p>
                                <button 
                                    onClick={(e) => handlePlayAudio(flashcardWord.text, e)}
                                    className="p-5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors mb-8"
                                >
                                    <Volume2 size={32} />
                                </button>
                                <p className="absolute bottom-8 text-sm font-medium text-slate-300 uppercase tracking-widest">{t(NL, 'click_flip')}</p>
                             </div>

                             {/* Back */}
                             <div className="absolute w-full h-full backface-hidden bg-slate-900 rounded-3xl text-white p-8 md:p-12 flex flex-col rotate-y-180"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                             >
                                 <div className="flex-1 grid md:grid-cols-2 gap-6 items-center">
                                     {flashcardWord.imageUrl && (
                                         <div className="h-48 md:h-full rounded-2xl overflow-hidden border-4 border-white/10 shadow-inner bg-black/20">
                                            <img src={flashcardWord.imageUrl} alt="Meaning" className="w-full h-full object-cover opacity-90" />
                                         </div>
                                     )}
                                     <div className="flex flex-col justify-center space-y-6 text-left h-full">
                                         <div>
                                             <h3 className="text-indigo-300 text-xs uppercase font-bold tracking-widest mb-2">{t(NL, 'meaning')}</h3>
                                             <p className="text-3xl font-bold leading-tight">{flashcardWord.definitionNative}</p>
                                         </div>
                                         <div>
                                             <h3 className="text-indigo-300 text-xs uppercase font-bold tracking-widest mb-2">{t(NL, 'context')}</h3>
                                             <p className="text-indigo-50 text-lg italic leading-relaxed border-l-4 border-indigo-500 pl-4">"{flashcardWord.exampleSentenceLearning}"</p>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                     
                     <div className="mt-10 flex gap-4">
                         <button onClick={endSession} className="px-6 py-4 text-slate-400 hover:text-slate-600 font-medium">
                             {t(NL, 'end_session')}
                         </button>
                         <button onClick={nextCard} className="flex items-center space-x-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all font-bold text-lg">
                            <span>{fcIndex === fcQueue.length - 1 ? t(NL, 'finish') : t(NL, 'next_word')}</span>
                            <ArrowRight size={20} />
                         </button>
                     </div>
                  </div>
             )}

             {/* PHASE: COMPLETE */}
             {fcPhase === 'complete' && (
                 <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full text-center animate-fade-in">
                     <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                         <CheckCircle size={40} />
                     </div>
                     <h2 className="text-3xl font-bold text-slate-800 mb-2">{t(NL, 'session_complete')}</h2>
                     <p className="text-slate-500 mb-8">{t(NL, 'reviewed_all')}</p>

                     <div className="space-y-3">
                         <button 
                            onClick={restartSession}
                            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                         >
                             <RotateCw size={20} />
                             {t(NL, 'start_over')}
                         </button>
                         <button 
                            onClick={endSession}
                            className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-all"
                         >
                             {t(NL, 'new_session')}
                         </button>
                     </div>
                 </div>
             )}
          </div>
      )}

      {/* 
        ====================================
        PRONUNCIATION MODE
        ====================================
      */}
      {mode === PracticeType.PRONUNCIATION && words.length > 0 && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-center animate-fade-in">
             <div className="mb-8">
                 <p className="text-slate-400 font-medium uppercase tracking-widest text-xs mb-4">{t(NL, 'pron_title')}</p>
                 {pronunciationWord && (
                     <>
                        <h2 className="text-6xl font-bold text-slate-800 mb-4">{pronunciationWord.text}</h2>
                        <div className="flex items-center justify-center gap-3">
                            <p className="text-2xl text-slate-500 font-mono">{pronunciationWord.pronunciation}</p>
                            <button onClick={() => handlePlayAudio(pronunciationWord.text)} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-full"><Volume2 /></button>
                        </div>
                     </>
                 )}
             </div>

             <div className="flex justify-center mb-10">
                 {isEvaluating ? (
                     <div className="w-24 h-24 rounded-full border-4 border-slate-100 flex items-center justify-center">
                         <div className="w-16 h-16 bg-indigo-500 rounded-full animate-pulse flex items-center justify-center">
                             <div className="w-12 h-12 bg-indigo-400 rounded-full animate-ping"></div>
                         </div>
                     </div>
                 ) : isRecording ? (
                     <button 
                        onClick={stopRecording}
                        className="w-24 h-24 rounded-full bg-red-500 shadow-lg shadow-red-200 flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 ring-4 ring-red-100"
                     >
                         <Square size={32} fill="currentColor" />
                     </button>
                 ) : (
                    <button 
                        onClick={startRecording}
                        className="w-24 h-24 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 ring-4 ring-indigo-100"
                    >
                        <Mic size={36} />
                    </button>
                 )}
             </div>
             
             <p className="text-slate-500 mb-8 h-6">
                 {isRecording ? t(NL, 'listening') : isEvaluating ? t(NL, 'analyzing') : t(NL, 'tap_mic')}
             </p>

             {pronunciationResult && (
                 <div className="animate-fade-in bg-slate-50 rounded-2xl p-6 text-left border border-slate-100">
                     <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                         <span className="text-slate-500 font-medium">{t(NL, 'ai_score')}</span>
                         <div className={`flex items-center space-x-2 text-2xl font-bold ${pronunciationResult.score > 80 ? 'text-green-600' : pronunciationResult.score > 50 ? 'text-orange-500' : 'text-red-500'}`}>
                             {pronunciationResult.score > 90 ? <Award size={28} /> : <Star size={28} />}
                             <span>{pronunciationResult.score}/100</span>
                         </div>
                     </div>
                     <div>
                         <p className="text-xs uppercase font-bold text-slate-400 mb-2">{t(NL, 'feedback')}</p>
                         <p className="text-slate-700 leading-relaxed">{pronunciationResult.feedback}</p>
                     </div>
                 </div>
             )}

             <div className="mt-10 border-t border-slate-100 pt-8">
                 <button onClick={nextPronunciationWord} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center mx-auto space-x-2">
                    <span>{t(NL, 'skip_next')}</span>
                    <ArrowRight size={18} />
                 </button>
             </div>
          </div>
      )}

      {/* 
        ====================================
        VOCAB QUIZ MODE (Replaced Story Fill)
        ====================================
      */}
      {mode === PracticeType.VOCAB_QUIZ && (
          <div className="w-full">
              {/* QUIZ SETUP */}
              {quizPhase === 'setup' && (
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full text-center mx-auto animate-fade-in">
                     <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                         <Wand2 size={32} />
                     </div>
                     <h2 className="text-2xl font-bold text-slate-800 mb-2">{t(NL, 'quiz_setup_title')}</h2>
                     <p className="text-slate-500 mb-8">{t(NL, 'quiz_setup_desc')}</p>

                     <div className="space-y-4 mb-8 text-left">
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1.5">{t(NL, 'select_group')}</label>
                             <select 
                                value={quizGroup}
                                onChange={(e) => setQuizGroup(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             >
                                 <option value="All">{t(NL, 'all')} ({words.length})</option>
                                 {allGroups.map(g => (
                                     <option key={g} value={g}>
                                         {g} ({words.filter(w => w.groups?.includes(g)).length})
                                     </option>
                                 ))}
                             </select>
                         </div>
                     </div>

                     <button 
                        onClick={startQuizSession}
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                     >
                         <PlayCircle size={20} />
                         {t(NL, 'generate_quiz')}
                     </button>
                 </div>
              )}

              {/* QUIZ PLAYING */}
              {quizPhase === 'playing' && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 max-w-3xl mx-auto animate-fade-in">
                      {quizLoading ? (
                          <div className="text-center py-20">
                              <RotateCw className="animate-spin inline-block text-indigo-500 mb-4" size={32} /> 
                              <p className="text-slate-500">{t(NL, 'writing_sentences')}</p>
                          </div>
                      ) : quizQuestions.length === 0 ? (
                          <div className="text-center py-12">
                              <AlertCircle className="mb-2 mx-auto text-red-400" size={32}/>
                              <p className="text-slate-500">{t(NL, 'failed_quiz')}</p>
                              <button onClick={() => setQuizPhase('setup')} className="mt-4 text-indigo-600 font-medium">{t(NL, 'back_setup')}</button>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
                                  <div>
                                      <h3 className="text-xl font-bold text-slate-800">{t(NL, 'fill_blanks_title')}</h3>
                                      <p className="text-slate-500 text-sm">{t(NL, 'fill_blanks_desc')}</p>
                                  </div>
                                  <button onClick={() => setQuizPhase('setup')} className="text-sm text-slate-400 hover:text-slate-600">
                                      {t(NL, 'new_quiz')}
                                  </button>
                              </div>
                              
                              {quizQuestions.map((q, idx) => (
                                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                      <p className="text-lg font-medium text-slate-800 mb-4 leading-relaxed">
                                          {q.sentence?.split('_____').map((part: string, i: number) => (
                                              <React.Fragment key={i}>
                                                  {part}
                                                  {i < q.sentence.split('_____').length - 1 && (
                                                      <span className={`inline-flex items-center justify-center h-8 min-w-[100px] px-3 border-b-2 mx-1 text-center font-bold transition-colors rounded-t-md ${
                                                        quizAnswers[idx] 
                                                            ? quizAnswers[idx] === q.correctAnswer 
                                                                ? 'border-green-500 text-green-700 bg-green-50' 
                                                                : 'border-red-400 text-red-600 bg-red-50'
                                                            : 'border-indigo-300 text-indigo-600 bg-white'
                                                      }`}>
                                                          {quizAnswers[idx] || '?'}
                                                      </span>
                                                  )}
                                              </React.Fragment>
                                          ))}
                                      </p>

                                      {/* Options */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                          {q.options?.map((opt: string) => {
                                              const isSelected = quizAnswers[idx] === opt;
                                              const isCorrect = opt === q.correctAnswer;
                                              const showResult = !!quizAnswers[idx];
                                              
                                              let btnClass = "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50";
                                              
                                              if (showResult) {
                                                  if (isSelected) {
                                                      btnClass = isCorrect 
                                                        ? "bg-green-100 border-green-300 text-green-700 ring-1 ring-green-300" 
                                                        : "bg-red-100 border-red-300 text-red-700 ring-1 ring-red-300";
                                                  } else if (isCorrect) {
                                                      btnClass = "bg-green-50 border-green-200 text-green-600 border-dashed";
                                                  } else {
                                                      btnClass = "opacity-50 cursor-not-allowed bg-slate-50";
                                                  }
                                              }

                                              return (
                                                  <button
                                                    key={opt}
                                                    onClick={() => !showResult && setQuizAnswers(prev => ({...prev, [idx]: opt}))}
                                                    disabled={showResult}
                                                    className={`py-3 px-4 rounded-xl border transition-all font-medium text-sm ${btnClass}`}
                                                  >
                                                      {opt}
                                                  </button>
                                              )
                                          })}
                                      </div>

                                      {/* Translation Toggle */}
                                      <div className="flex justify-start">
                                          {visibleTranslations.has(idx) ? (
                                              <div 
                                                className="text-slate-600 text-sm italic bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                                                onClick={() => toggleTranslation(idx)}
                                              >
                                                  {q.translation}
                                              </div>
                                          ) : (
                                              <button 
                                                onClick={() => toggleTranslation(idx)}
                                                className="text-slate-400 hover:text-indigo-500 text-xs flex items-center gap-1 font-medium transition-colors"
                                              >
                                                  <Languages size={14} />
                                                  {t(NL, 'show_translation')}
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
