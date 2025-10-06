import { buildAudioPublicUrl, readJsonTranscript } from "../utils/files.mjs";
import dotenv from "dotenv";
dotenv.config();

const openAIApiKey = process.env.OPENAI_API_KEY;
const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const getDefaultMessage = async ({
  text,
  audioFile,
  lipsyncFile,
  facialExpression,
  animation,
  hostUrl,
}) => {
  const audioUrl = buildAudioPublicUrl({ fileName: audioFile, hostUrl });
  if (!audioUrl) {
    console.warn(`[DefaultMessages] Missing audio URL for file ${audioFile}`);
  }
  return {
    text,
    audioUrl,
    lipsync: await readJsonTranscript({ fileName: lipsyncFile }),
    facialExpression,
    animation,
  };
};

async function sendDefaultMessages({ userMessage, hostUrl }) {
  let messages;
  if (!userMessage) {
    messages = [
      await getDefaultMessage({
        text: "Hey there... How was your day?",
        audioFile: "intro_0.wav",
        lipsyncFile: "intro_0.json",
        facialExpression: "smile",
        animation: "TalkingOne",
        hostUrl,
      }),
      await getDefaultMessage({
        text: "I'm Jack, your personal AI assistant. I'm here to help you with anything you need.",
        audioFile: "intro_1.wav",
        lipsyncFile: "intro_1.json",
        facialExpression: "smile",
        animation: "TalkingTwo",
        hostUrl,
      }),
    ];
    return messages;
  }
  if (!elevenLabsApiKey || !openAIApiKey) {
    messages = [
      await getDefaultMessage({
        text: "Please my friend, don't forget to add your API keys!",
        audioFile: "api_0.wav",
        lipsyncFile: "api_0.json",
        facialExpression: "angry",
        animation: "TalkingThree",
        hostUrl,
      }),
      await getDefaultMessage({
        text: "You don't want to ruin Jack with a crazy ChatGPT and ElevenLabs bill, right?",
        audioFile: "api_1.wav",
        lipsyncFile: "api_1.json",
        facialExpression: "smile",
        animation: "Angry",
        hostUrl,
      }),
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
