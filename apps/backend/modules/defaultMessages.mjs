import { audioFileToBase64, readJsonTranscript } from "../utils/files.mjs";
import dotenv from "dotenv";
dotenv.config();

const openAIApiKey = process.env.OPENAI_API_KEY;
const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

async function sendDefaultMessages({ userMessage }) {
  let messages;
  if (!userMessage) {
    messages = [
      {
        text: "¡Hola! Qué alegría verte.",
        audio: await audioFileToBase64({ fileName: "audios/intro_0.wav" }),
        lipsync: await readJsonTranscript({ fileName: "audios/intro_0.json" }),
        facialExpression: "smile",
        animation: "TalkingOne",
      },
      {
        text: "Soy Liz, tu asistente virtual en salud y bienestar pélvica. Estoy aquí para acompañarte paso a paso, con empatía y claridad, en todo lo que necesites aprender sobre tu salud íntima.",
        audio: await audioFileToBase64({ fileName: "audios/intro_1.wav" }),
        lipsync: await readJsonTranscript({ fileName: "audios/intro_1.json" }),
        facialExpression: "smile",
        animation: "TalkingTwo",
      },
    ];
    return messages;
  }
  if (!elevenLabsApiKey || !openAIApiKey) {
    messages = [
      {
        text: "Please my friend, don't forget to add your API keys!",
        audio: await audioFileToBase64({ fileName: "audios/api_0.wav" }),
        lipsync: await readJsonTranscript({ fileName: "audios/api_0.json" }),
        facialExpression: "angry",
        animation: "TalkingThree",
      },
      {
        text: "You don't want to ruin Jack with a crazy ChatGPT and ElevenLabs bill, right?",
        audio: await audioFileToBase64({ fileName: "audios/api_1.wav" }),
        lipsync: await readJsonTranscript({ fileName: "audios/api_1.json" }),
        facialExpression: "smile",
        animation: "Angry",
      },
    ];
    return messages;
  }
}

const defaultResponse = [
  {
    text: "I'm sorry, there seems to be an error with my brain, or I didn't understand. Could you please repeat your question?",
    facialExpression: "sad",
    animation: "Idle",
  },
];

export { sendDefaultMessages, defaultResponse };
