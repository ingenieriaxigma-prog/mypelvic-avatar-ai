import { convertTextToSpeech } from "./elevenLabs.mjs";
import { getPhonemes } from "./rhubarbLipSync.mjs";
import {
  readJsonTranscript,
  ensureAudioDirectory,
  resolveAudioPath,
  buildAudioPublicUrl,
} from "../utils/files.mjs";

const MAX_RETRIES = 10;
const RETRY_DELAY = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lipSync = async ({ messages, hostUrl }) => {
  await ensureAudioDirectory();

  await Promise.all(
    messages.map(async (message, index) => {
      const timestamp = Date.now();
      const requestedFileName = message.audioFileName || `liz_${timestamp}_${index}.mp3`;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const { fileName, audioUrl } = await convertTextToSpeech({
            text: message.text,
            fileName: requestedFileName,
            hostUrl,
          });
          message.audioFileName = fileName;
          if (audioUrl) {
            message.audioUrl = audioUrl;
            console.log(`[ElevenLabs] Audio público disponible en ${audioUrl}`);
          }
          await delay(RETRY_DELAY);
          break;
        } catch (error) {
          if (error.response && error.response.status === 429 && attempt < MAX_RETRIES - 1) {
            await delay(RETRY_DELAY);
          } else {
            console.error(`[ElevenLabs] Failed to synthesize audio for message ${index}:`, error);
            throw error;
          }
        }
      }
      console.log(`[ElevenLabs] Message ${index} converted to speech`);
    })
  );

  await Promise.all(
    messages.map(async (message, index) => {
      const { audioFileName: fileName } = message;
      if (!fileName) {
        console.warn(`[ElevenLabs] Missing audio file name for message ${index}`);
        return;
      }
      const filePath = resolveAudioPath(fileName);

      try {
        const transcriptPath = await getPhonemes({ sourceFilePath: filePath });
        if (!message.audioUrl) {
          const publicUrl = buildAudioPublicUrl({ fileName, hostUrl });
          message.audioUrl = publicUrl || null;
        }
        if (!message.audioUrl) {
          console.warn(`[Audio] Missing audio URL for message ${index}`);
        }
        message.lipsync = transcriptPath
          ? await readJsonTranscript({ fileName: transcriptPath })
          : undefined;
        if (!message.lipsync) {
          console.warn(`[LipSync] Missing lip sync data for message ${index}`);
        }
        delete message.audioFileName;
      } catch (error) {
        console.error(`Error while getting phonemes for message ${index}:`, error);
      }
    })
  );

  return messages;
};

export { lipSync };
