
/**
 * Decodes a base64 string into a Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw audio data into an AudioBuffer
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Gemini TTS returns raw PCM usually.
  // Note: The Gemini TTS output is often raw PCM.
  // If the header is missing, we treat it as PCM 16-bit LE.
  
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert int16 to float [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Plays a base64 audio string using Web Audio API
 * supports passing an existing context for lifecycle management (pause/resume)
 */
export const playAudio = async (
  base64Audio: string, 
  sampleRate: number = 24000,
  existingContext?: AudioContext
) => {
  try {
    const audioContext = existingContext || new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate
    });
    
    const bytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(bytes, audioContext, sampleRate, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    return new Promise<{source: AudioBufferSourceNode, finished: Promise<void>}>((resolve) => {
        const finished = new Promise<void>((res) => {
            source.onended = () => res();
        });
        source.start(0);
        resolve({ source, finished });
    });
  } catch (error) {
    console.error("Failed to play audio", error);
    throw error;
  }
};

/**
 * Convert a Blob to a Base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
