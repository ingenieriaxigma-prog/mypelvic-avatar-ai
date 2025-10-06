import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ensureAudioDirectory, AUDIO_PUBLIC_ROUTE } from "./utils/files.mjs";
import { openAIChain, parser } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";
import * as voice from "./modules/voice.mjs";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

const resolveHostUrl = (req) => {
  const publicUrl = process.env.HOST_URL || process.env.PUBLIC_BACKEND_URL;
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }
  const host = req.get("host");
  if (!host) {
    return `http://localhost:${port}`;
  }
  return `${req.protocol}://${host}`;
};

const audioStaticOptions = {
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "audio/mpeg");
  },
};

ensureAudioDirectory()
  .then(() => {
    console.log(`[Audio] Directory ready at ${path.join(__dirname, "public/audios")}`);
  })
  .catch((error) => {
    console.error("[Audio] Failed to prepare audio directory:", error);
  });
const staticAudioPath = path.join(__dirname, "public/audios");
console.log(`[Audio] Serving static files from ${staticAudioPath}`);
app.use(AUDIO_PUBLIC_ROUTE, express.static(staticAudioPath, audioStaticOptions));

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

app.post("/tts", async (req, res) => {
  const hostUrl = resolveHostUrl(req);
  const userMessage = await req.body.message;
  const defaultMessages = await sendDefaultMessages({ userMessage, hostUrl });
  if (defaultMessages) {
    res.send({ messages: defaultMessages });
    return;
  }
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
  } catch (error) {
    openAImessages = defaultResponse;
  }
  openAImessages = await lipSync({ messages: openAImessages.messages, hostUrl });
  res.send({ messages: openAImessages });
});

app.post("/sts", async (req, res) => {
  const hostUrl = resolveHostUrl(req);
  const base64Audio = req.body.audio;
  const audioData = Buffer.from(base64Audio, "base64");
  const userMessage = await convertAudioToText({ audioData });
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
  } catch (error) {
    openAImessages = defaultResponse;
  }
  openAImessages = await lipSync({ messages: openAImessages.messages, hostUrl });
  res.send({ messages: openAImessages });
});
app.get("/test", async (req, res) => {
  const openaiStatus = process.env.OPENAI_API_KEY ? "✅ Cargada" : "❌ Faltante";
  const elevenStatus = process.env.ELEVEN_LABS_API_KEY ? "✅ Cargada" : "❌ Faltante";
  res.send({
    message: "Estado de las integraciones",
    OpenAI: openaiStatus,
    ElevenLabs: elevenStatus,
  });
});
app.listen(port, () => {
  console.log(`Jack are listening on port ${port}`);
});
