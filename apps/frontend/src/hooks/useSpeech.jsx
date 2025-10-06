import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const backendUrl = "http://localhost:3000";

const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  const blockedAudioRef = useRef(null);

  let chunks = [];

  const initiateRecording = () => {
    chunks = [];
  };

  const onDataAvailable = (e) => {
    chunks.push(e.data);
  };

  const sendAudioData = async (audioBlob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async function () {
      const base64Audio = reader.result.split(",")[1];
      setLoading(true);
      try {
        const data = await fetch(`${backendUrl}/sts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audio: base64Audio }),
        });
        const response = (await data.json()).messages;
        console.log("[Frontend] Respuesta STS recibida:", response);
        if (!Array.isArray(response) || response.length === 0) {
          console.warn("[Frontend] Respuesta vacía desde STS.");
        }
        response?.forEach((msg, index) => {
          if (!msg?.audioUrl) {
            console.warn(`[Frontend] Falta audioUrl en STS (índice ${index}).`, msg);
          }
        });
        setMessages((messages) => [...messages, ...(response || [])]);
      } catch (error) {
        console.error("[Frontend] Error al enviar STS:", error);
      } finally {
        setLoading(false);
      }
    };
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const newMediaRecorder = new MediaRecorder(stream);
          newMediaRecorder.onstart = initiateRecording;
          newMediaRecorder.ondataavailable = onDataAvailable;
          newMediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: "audio/webm" });
            try {
              await sendAudioData(audioBlob);
            } catch (error) {
              console.error(error);
              alert(error.message);
            }
          };
          setMediaRecorder(newMediaRecorder);
        })
        .catch((err) => console.error("Error accessing microphone:", err));
    }
  }, []);

  const startRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.start();
      setRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const tts = async (message) => {
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const response = (await data.json()).messages;
      console.log("[Frontend] Respuesta TTS recibida:", response);
      if (!Array.isArray(response) || response.length === 0) {
        console.warn("[Frontend] Respuesta vacía desde TTS.");
      }
      response?.forEach((msg, index) => {
        if (!msg?.audioUrl) {
          console.warn(`[Frontend] Falta audioUrl en TTS (índice ${index}).`, msg);
        }
      });
      setMessages((messages) => [...messages, ...(response || [])]);
    } catch (error) {
      console.error("[Frontend] Error al enviar TTS:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = useCallback(() => {
    setMessages((messages) => messages.slice(1));
    setCurrentAudio(null);
    setVoiceStatus("idle");
    setAutoplayBlocked(false);
    setPlaybackError(null);
    blockedAudioRef.current = null;
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  useEffect(() => {
    if (!message) {
      setCurrentAudio(null);
      setVoiceStatus("idle");
      setAutoplayBlocked(false);
      setPlaybackError(null);
      return;
    }

    const { audioUrl } = message;

    if (!audioUrl) {
      console.warn("[Frontend] No se proporcionó audioUrl reproducible.", message);
      onMessagePlayed();
      return;
    }

    console.log("🎧 Playing audio:", audioUrl);
    setVoiceStatus("loading");
    setAutoplayBlocked(false);
    setPlaybackError(null);

    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    audio.autoplay = true;

    const handleEnded = () => {
      console.log(`[Frontend] Reproducción finalizada para ${audioUrl}`);
      onMessagePlayed();
    };

    const handleError = (event) => {
      console.error(`[Frontend] Error de reproducción para ${audioUrl}`, event);
      onMessagePlayed();
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    const startPlayback = async () => {
      try {
        await audio.play();
        console.log("✅ Playback started");
        setVoiceStatus("playing");
        setAutoplayBlocked(false);
        blockedAudioRef.current = null;
      } catch (error) {
        console.error("⚠️ Playback error:", error);
        setVoiceStatus("error");
        setPlaybackError(error);
        const isAutoplayBlock =
          error?.name === "NotAllowedError" || error?.message?.toLowerCase().includes("gesture");
        if (isAutoplayBlock) {
          setAutoplayBlocked(true);
          blockedAudioRef.current = audio;
        } else {
          onMessagePlayed();
        }
      }
    };

    startPlayback();

    setCurrentAudio(audio);

    return () => {
      console.log(`[Frontend] Limpieza de audio para ${audioUrl}`);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      if (blockedAudioRef.current === audio) {
        blockedAudioRef.current = null;
      }
    };
  }, [message, onMessagePlayed]);

  const resumePlayback = useCallback(async () => {
    const audio = blockedAudioRef.current;
    if (!audio) {
      return;
    }
    try {
      console.log("[Frontend] Reintentando reproducción manual");
      await audio.play();
      console.log("✅ Playback started");
      setVoiceStatus("playing");
      setAutoplayBlocked(false);
      setPlaybackError(null);
      blockedAudioRef.current = null;
    } catch (error) {
      console.error("⚠️ Playback error:", error);
      setPlaybackError(error);
    }
  }, []);

  return (
    <SpeechContext.Provider
      value={{
        startRecording,
        stopRecording,
        recording,
        tts,
        message,
        onMessagePlayed,
        loading,
        currentAudio,
        voiceStatus,
        autoplayBlocked,
        playbackError,
        resumePlayback,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error("useSpeech must be used within a SpeechProvider");
  }
  return context;
};
