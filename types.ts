
export interface WordMeaning {
  partOfSpeech: string;
  definitionNative: string;
  definitionLearning: string;
  definitionEnglish: string;
  exampleSentenceLearning: string;
  exampleSentenceNative: string;
  vibeCheck: string;
}

export interface Word {
  id: string;
  text: string;
  nativeLang: string;
  learningLang: string;
  pronunciation: string; // IPA or phonetic
  partOfSpeech?: string; // Added to distinguish meanings
  
  // Primary display data (usually the first meaning or the selected one)
  definitionNative: string;
  definitionLearning: string;
  definitionEnglish: string; 
  exampleSentenceLearning: string;
  exampleSentenceNative: string;
  vibeCheck: string; 
  
  imageUrl: string | null;
  createdAt: number;
  
  // Support for multiple parts of speech
  meanings?: WordMeaning[];
  
  // Grouping/Tagging
  groups?: string[];
}

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Story {
  id: string;
  title: string;
  contentLearning: string;
  contentNative: string;
  wordsUsed: string[]; // IDs of words
  createdAt: number;
  difficulty: Difficulty;
  isSaved?: boolean; // If false, it's a draft that gets replaced
}

export enum ViewState {
  SEARCH = 'SEARCH',
  VOCABULARY = 'VOCABULARY',
  PRACTICE = 'PRACTICE',
  STORY_VIEW = 'STORY_VIEW'
}

export enum PracticeType {
  FLASHCARD = 'FLASHCARD',
  VOCAB_QUIZ = 'VOCAB_QUIZ',
  PRONUNCIATION = 'PRONUNCIATION'
}

export interface AppSettings {
  nativeLang: string;
  learningLang: string;
}

export interface PronunciationResult {
  score: number;
  feedback: string;
}

export const SUPPORTED_LANGUAGES = [
  "English", "Chinese", "Spanish", "Japanese", "French", "German", "Korean", "Italian"
];