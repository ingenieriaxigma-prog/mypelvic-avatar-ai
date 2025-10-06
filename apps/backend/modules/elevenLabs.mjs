import ElevenLabs from "elevenlabs-node";
import dotenv from "dotenv";
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

async function convertTextToSpeech({ text, fileName }) {
  console.log(`[ElevenLabs] Solicitud de síntesis para ${fileName}`);
  await voice.textToSpeech({
    fileName: fileName,
    textInput: text,
    voiceId: voiceID,
    stability: 0.5,
    similarityBoost: 0.7,
    modelId: modelID,
    style: 0.2,
    speakerBoost: true,
  });
  console.log(`[ElevenLabs] Síntesis completada para ${fileName}`);
}

export { convertTextToSpeech, voice, DEFAULT_FEMALE_VOICE_ID, DEFAULT_MODEL_ID };
