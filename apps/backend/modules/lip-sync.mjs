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
      const fileName = `message_${index}.mp3`;
      const filePath = resolveAudioPath(fileName);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`[Audio] Generating speech for message ${index} -> ${filePath}`);
          await convertTextToSpeech({ text: message.text, fileName: filePath });
          console.log(`[Audio] Speech synthesis completed for message ${index}`);
          await delay(RETRY_DELAY);
          break;
        } catch (error) {
          if (error.response && error.response.status === 429 && attempt < MAX_RETRIES - 1) {
            await delay(RETRY_DELAY);
          } else {
            console.error(`[Audio] Failed to synthesize audio for message ${index}:`, error);
            throw error;
          }
        }
      }
      console.log(`Message ${index} converted to speech`);
    })
  );

  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `message_${index}.mp3`;
      const filePath = resolveAudioPath(fileName);

      try {
        const transcriptPath = await getPhonemes({ sourceFilePath: filePath });
        const publicUrl = buildAudioPublicUrl({ fileName, hostUrl });
        message.audioUrl = publicUrl ? `${publicUrl}?v=${Date.now()}` : null;
        if (!message.audioUrl) {
          console.warn(`[Audio] Missing audio URL for message ${index}`);
        }
        message.lipsync = transcriptPath
          ? await readJsonTranscript({ fileName: transcriptPath })
          : undefined;
        if (!message.lipsync) {
          console.warn(`[LipSync] Missing lip sync data for message ${index}`);
        }
      } catch (error) {
        console.error(`Error while getting phonemes for message ${index}:`, error);
      }
    })
  );

  return messages;
};

export { lipSync };
