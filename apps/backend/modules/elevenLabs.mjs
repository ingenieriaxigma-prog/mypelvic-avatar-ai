import { randomUUID } from "crypto";
import path from "path";
import ElevenLabs from "elevenlabs-node";
import dotenv from "dotenv";
import { buildAudioPublicUrl, resolveAudioPath } from "../utils/files.mjs";

dotenv.config();

const DEFAULT_FEMALE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Clara - Spanish
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = process.env.ELEVEN_LABS_VOICE_ID || DEFAULT_FEMALE_VOICE_ID;
const modelID = process.env.ELEVEN_LABS_MODEL_ID || DEFAULT_MODEL_ID;

const voice = new ElevenLabs({
  apiKey: elevenLabsApiKey,
  voiceId: voiceID,
});

async function convertTextToSpeech({ text, fileName, hostUrl }) {
  const resolvedFileName = fileName ? path.basename(fileName) : `${randomUUID()}.mp3`;
  const filePath = resolveAudioPath(resolvedFileName);

  console.log(`[ElevenLabs] Solicitud de síntesis para ${filePath}`);
  await voice.textToSpeech({
    fileName: filePath,
    text,
    textInput: text,
    voiceId: voiceID,
    stability: 0.5,
    similarityBoost: 0.7,
    modelId: modelID,
    style: 0.2,
    speakerBoost: true,
  });

  const fallbackHost = (hostUrl || process.env.HOST_URL || "http://localhost:3000").replace(/\/$/, "");
  const audioUrl = buildAudioPublicUrl({ fileName: resolvedFileName, hostUrl: fallbackHost });
  console.log(`✅ Audio generated: ${audioUrl}`);

  return {
    fileName: resolvedFileName,
    filePath,
    audioUrl,
  };
}

export { convertTextToSpeech, voice, DEFAULT_FEMALE_VOICE_ID, DEFAULT_MODEL_ID };
