import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import { Word, Story, Difficulty, PronunciationResult } from "../types";

// Initialize API Client
// NOTE: apiKey is expected to be in process.env.API_KEY
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const lookupWordDetails = async (
  term: string,
  nativeLang: string,
  learningLang: string
): Promise<Omit<Word, 'id' | 'imageUrl' | 'createdAt'>> => {
  const ai = getClient();
  
  const prompt = `
    Analyze the word "${term}" for a learner (Native: ${nativeLang}, Target: ${learningLang}).
    Provide a comprehensive list of its meanings grouped by part of speech (e.g., Noun, Verb, Adjective).
    
    For EACH meaning/part of speech, provide:
    - partOfSpeech (abbreviated, e.g., n., v., adj.)
    - definitionNative (meaning in ${nativeLang})
    - definitionLearning (meaning in ${learningLang})
    - definitionEnglish (meaning in English)
    - exampleSentenceLearning (example in ${learningLang})
    - exampleSentenceNative (translation in ${nativeLang})
    - vibeCheck (A brief, practical tip on how/when native speakers use this specific meaning, tone, or nuance, written in ${nativeLang})
    
    Also provide the general IPA pronunciation.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pronunciation: { type: Type.STRING },
          meanings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partOfSpeech: { type: Type.STRING },
                definitionNative: { type: Type.STRING },
                definitionLearning: { type: Type.STRING },
                definitionEnglish: { type: Type.STRING },
                exampleSentenceLearning: { type: Type.STRING },
                exampleSentenceNative: { type: Type.STRING },
                vibeCheck: { type: Type.STRING },
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  const data = JSON.parse(text);
  
  // Fallback if meanings array is empty (shouldn't happen with good prompt)
  const primaryMeaning = data.meanings?.[0] || {
      partOfSpeech: '?',
      definitionNative: '?',
      definitionLearning: '?',
      definitionEnglish: '?',
      exampleSentenceLearning: '?',
      exampleSentenceNative: '?',
      vibeCheck: '?'
  };

  return {
    text: term,
    nativeLang,
    learningLang,
    pronunciation: data.pronunciation,
    
    // Populate flat fields with the primary (first) meaning for backward compatibility
    partOfSpeech: primaryMeaning.partOfSpeech,
    definitionNative: primaryMeaning.definitionNative,
    definitionLearning: primaryMeaning.definitionLearning,
    definitionEnglish: primaryMeaning.definitionEnglish,
    exampleSentenceLearning: primaryMeaning.exampleSentenceLearning,
    exampleSentenceNative: primaryMeaning.exampleSentenceNative,
    vibeCheck: primaryMeaning.vibeCheck,
    
    // Store the full list
    meanings: data.meanings || [primaryMeaning]
  };
};

export const createWordChat = (
  word: Word,
  nativeLang: string,
  learningLang: string
): Chat => {
  const ai = getClient();
  const systemInstruction = `You are a helpful and encouraging language tutor assisting a student learning ${learningLang}. 
   The student is native in ${nativeLang}.
   The current word being studied is "${word.text}" (Pronunciation: ${word.pronunciation}). 
   Primary Definition: ${word.definitionLearning}.
   Context/Vibe: ${word.vibeCheck}.
   
   Your goal is to answer the student's follow-up questions about this specific word, its usage, synonyms, grammar, or cultural context.
   Keep your answers concise, conversational, and easy to understand. Use emojis occasionally to keep it fun.`;

  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction,
    },
  });
};

export const evaluatePronunciation = async (
  audioBase64: string,
  word: string,
  nativeLang: string
): Promise<PronunciationResult> => {
  const ai = getClient();

  const prompt = `
    Listen to the audio pronunciation of the word "${word}".
    Rate the pronunciation on a scale of 0 to 100.
    Provide constructive feedback and tips on how to improve the pronunciation in ${nativeLang}.
    
    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/webm;codecs=opus", // Assuming standard browser recording format
            data: audioBase64
          }
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response for pronunciation evaluation");
  return JSON.parse(text);
};

export const generateWordImage = async (term: string, context?: string): Promise<string | null> => {
  const ai = getClient();
  
  const prompt = `Generate a clear, minimalist, illustrative image representing the concept of the word: "${term}". ${context ? `Context: ${context}` : ''} No text in image.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
           // No specific config needed for basic generation
        }
    });

    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null; 
  }
};

export const generateStoryFromWords = async (
  words: Word[],
  nativeLang: string,
  learningLang: string,
  difficulty: Difficulty = 'Beginner'
): Promise<Omit<Story, 'id' | 'createdAt'>> => {
  const ai = getClient();
  const wordList = words.map(w => w.text).join(", ");

  const prompt = `
    Write a ${difficulty} level, short, engaging story (approx 100-150 words) in ${learningLang} using the following words: ${wordList}.
    Then provide a translation in ${nativeLang}.
    Mark the used words (from the provided list) in the story text using square brackets, e.g., [word].
    
    Output JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          contentLearning: { type: Type.STRING },
          contentNative: { type: Type.STRING },
        }
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    title: data.title || "New Story",
    contentLearning: data.contentLearning || "",
    contentNative: data.contentNative || "",
    wordsUsed: words.map(w => w.id),
    difficulty
  };
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = getClient();
  
  try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio || null;
  } catch (e) {
      console.error("TTS failed", e);
      return null;
  }
};

export const generateVocabularyQuiz = async (
    words: Word[], 
    nativeLang: string, 
    learningLang: string
) => {
    const ai = getClient();
    // We pick a random subset if the list is too long to avoid token limits
    // But since we want to quiz "these words", let's limit to 5 random words for a session
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, 5);
    
    const wordsPrompt = selectedWords.map(w => w.text).join(", ");

    const prompt = `
        Create a fill-in-the-blank quiz for these specific words: ${wordsPrompt}.
        Target Language: ${learningLang}.
        Translation Language: ${nativeLang}.
        
        For each word, create ONE sentence in ${learningLang}.
        Replace the target word in the sentence with "_____".
        Provide 4 options (the correct word + 3 distinct wrong words).
        Provide the translation of the FULL sentence in ${nativeLang}.
        
        Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                sentence: { type: Type.STRING },
                                translation: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                correctAnswer: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    const data = JSON.parse(response.text || "{}");
    return data.questions || [];
};