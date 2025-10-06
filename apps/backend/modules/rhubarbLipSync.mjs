import path from "path";
import { execCommand, resolveAudioPath } from "../utils/files.mjs";

const getPhonemes = async ({ sourceFilePath }) => {
  if (!sourceFilePath) {
    console.warn("[LipSync] Source file path not provided for phoneme extraction.");
    return null;
  }

  try {
    const resolvedSource = resolveAudioPath(sourceFilePath);
    const directory = path.dirname(resolvedSource);
    const baseName = path.basename(resolvedSource, path.extname(resolvedSource));
    const wavPath = path.join(directory, `${baseName}.wav`);
    const jsonPath = path.join(directory, `${baseName}.json`);
    const startTime = Date.now();

    console.log(`[LipSync] Starting phoneme extraction for ${resolvedSource}`);
    await execCommand({ command: `ffmpeg -y -i "${resolvedSource}" "${wavPath}"` });
    console.log(`[LipSync] Audio converted to wav in ${Date.now() - startTime}ms (${wavPath})`);
    await execCommand({ command: `./bin/rhubarb -f json -o "${jsonPath}" "${wavPath}" -r phonetic` });
    console.log(`[LipSync] Phoneme extraction completed in ${Date.now() - startTime}ms (${jsonPath})`);

    return jsonPath;
  } catch (error) {
    console.error(`[LipSync] Error while getting phonemes for ${sourceFilePath}:`, error);
    return null;
  }
};

export { getPhonemes };