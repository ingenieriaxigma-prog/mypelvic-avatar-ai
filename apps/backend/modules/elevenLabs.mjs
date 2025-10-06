import ElevenLabs from "elevenlabs-node";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Cargar el .env correcto del backend
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ✅ Verificar variables cargadas
console.log("🧩 Verificando ElevenLabs:");
console.log("🔑 API Key:", process.env.ELEVEN_LABS_API_KEY ? "✅ Cargada" : "❌ Vacía");
console.log("🎤 Voice ID:", process.env.ELEVEN_LABS_VOICE_ID);
console.log("🧠 Model ID:", process.env.ELEVEN_LABS_MODEL_ID);

// 🗣️ Inicializar el cliente ElevenLabs con la API Key
const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = process.env.ELEVEN_LABS_VOICE_ID;
const modelID = process.env.ELEVEN_LABS_MODEL_ID;

if (!elevenLabsApiKey) {
  console.error("❌ Error: ELEVEN_LABS_API_KEY no está definida en .env");
  throw new Error("Missing API key for ElevenLabs");
}

const voice = new ElevenLabs({
  apiKey: elevenLabsApiKey,
  voiceId: voiceID,
});

// 🎧 Función para convertir texto a audio
async function convertTextToSpeech({ text, fileName }) {
  try {
    console.log(`🎙 Generando audio para: "${text}"`);
    await voice.textToSpeech({
      fileName: fileName,
      textInput: text,
      voiceId: voiceID,
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: modelID,
      style: 1,
      speakerBoost: true,
    });
    console.log(`✅ Audio generado y guardado como: ${fileName}`);
  } catch (error) {
    console.error("❌ Error en convertTextToSpeech:", error.message);
    throw error;
  }
}

export { convertTextToSpeech, voice };
