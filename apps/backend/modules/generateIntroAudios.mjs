import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { convertTextToSpeech } from "./elevenLabs.mjs";

// ===============================
// 🧭 Configurar rutas absolutas
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env del backend
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ===============================
// 🧠 Mensajes de bienvenida
// ===============================
const mensajes = [
  {
    text: "¡Hola! Qué alegría verte en MyPelvic.",
    file: path.resolve(__dirname, "../audios/intro_0.wav"),
  },
  {
    text: "Soy Liz, tu asistente virtual en salud y bienestar pélvica. Estoy aquí para acompañarte paso a paso, con empatía y claridad, en todo lo que necesites aprender sobre tu salud íntima.",
    file: path.resolve(__dirname, "../audios/intro_1.wav"),
  },
];

// ===============================
// 🔊 Generar audios con ElevenLabs
// ===============================
async function generarAudiosDeLiz() {
  console.log("🎧 Iniciando generación de audios con la voz de Liz...");

  for (const mensaje of mensajes) {
    try {
      console.log(`🎙 Generando audio para: "${mensaje.text}"`);

      await convertTextToSpeech({
        text: mensaje.text,
        fileName: mensaje.file,
      });

      console.log(`✅ Archivo creado: ${mensaje.file}`);
    } catch (error) {
      console.error("❌ Error generando audio:", error.message);
    }
  }

  console.log("✅ Todos los audios fueron generados correctamente con la voz de Liz 🎉");
}

// Ejecutar función principal
generarAudiosDeLiz();
