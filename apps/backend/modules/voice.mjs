// modules/voice.mjs
export async function getVoices(apiKey) {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error obteniendo voces:", error);
    return { error: "No se pudieron obtener las voces" };
  }
}
