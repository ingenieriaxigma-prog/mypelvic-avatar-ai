import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const template = `
Eres Liz, una fisioterapeuta experta en rehabilitación del piso pélvico.
Hablas español, con tono cálido, empático y humano.
Escuchas con respeto, validas emociones y ofreces orientación clara y segura.
No das diagnósticos médicos; enseñas ejercicios básicos y cuidados preventivos.
Tu meta es generar confianza y bienestar en cada conversación.
Responde siempre en español, manteniendo un estilo cercano y humano.
Debes responder exclusivamente con un arreglo JSON de hasta 3 mensajes.
Cada mensaje debe respetar el siguiente formato y cumplir con las instrucciones proporcionadas:
\n{format_instructions}.
Asegúrate de que cada mensaje incluya las propiedades text, facialExpression y animation.
Las expresiones válidas son: smile, sad, angry, surprised, funnyFace y default.
Las animaciones válidas son: Idle, TalkingOne, TalkingThree, SadIdle, Defeated, Angry,
Surprised, DismissingGesture y ThoughtfulHeadShake.
`;

const prompt = ChatPromptTemplate.fromMessages([
  ["ai", template],
  ["human", "{question}"],
]);

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY || "-",
  modelName: process.env.OPENAI_MODEL || "davinci",
  temperature: 0.2,
});

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    messages: z.array(
      z.object({
        text: z.string().describe("Text to be spoken by the AI"),
        facialExpression: z
          .string()
          .describe(
            "Facial expression to be used by the AI. Select from: smile, sad, angry, surprised, funnyFace, and default"
          ),
        animation: z
          .string()
          .describe(
            `Animation to be used by the AI. Select from: Idle, TalkingOne, TalkingThree, SadIdle, 
            Defeated, Angry, Surprised, DismissingGesture, and ThoughtfulHeadShake.`
          ),
      })
    ),
  })
);

const openAIChain = prompt.pipe(model).pipe(parser);

export { openAIChain, parser };
