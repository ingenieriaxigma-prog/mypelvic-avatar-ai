import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execCommand = ({ command }) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_DIRECTORY = path.resolve(__dirname, "../audios");
const AUDIO_PUBLIC_ROUTE = "/audios";

const ensureAudioDirectory = async () => {
  await fs.mkdir(AUDIO_DIRECTORY, { recursive: true });
};

const resolveAudioPath = (fileName) => {
  if (!fileName) {
    return AUDIO_DIRECTORY;
  }
  return path.isAbsolute(fileName) ? fileName : path.join(AUDIO_DIRECTORY, fileName);
};

const buildAudioPublicUrl = ({ fileName, hostUrl }) => {
  if (!fileName) {
    return null;
  }
  const base = hostUrl ? hostUrl.replace(/\/$/, "") : "";
  const route = fileName.startsWith("/") ? fileName : `${AUDIO_PUBLIC_ROUTE}/${fileName}`;
  return `${base}${route}`;
};

const readJsonTranscript = async ({ fileName }) => {
  const targetPath = resolveAudioPath(fileName);
  const data = await fs.readFile(targetPath, "utf8");
  return JSON.parse(data);
};

export {
  execCommand,
  readJsonTranscript,
  ensureAudioDirectory,
  resolveAudioPath,
  buildAudioPublicUrl,
  AUDIO_DIRECTORY,
  AUDIO_PUBLIC_ROUTE,
};
