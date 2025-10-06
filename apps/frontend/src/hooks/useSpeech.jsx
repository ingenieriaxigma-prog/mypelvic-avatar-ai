import { createContext, useContext, useEffect, useState, useCallback } from "react";

const backendUrl = "http://localhost:3000";

const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);

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
        if (!Array.isArray(response) || response.length === 0) {
          console.warn("[Speech] Received empty response from STS endpoint.");
        }
        response?.forEach((msg, index) => {
          if (!msg?.audioUrl) {
            console.warn(`[Speech] Missing audio URL in STS response (index ${index}).`, msg);
          }
        });
        setMessages((messages) => [...messages, ...(response || [])]);
      } catch (error) {
        console.error("[Speech] Error sending STS request:", error);
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
      if (!Array.isArray(response) || response.length === 0) {
        console.warn("[Speech] Received empty response from TTS endpoint.");
      }
      response?.forEach((msg, index) => {
        if (!msg?.audioUrl) {
          console.warn(`[Speech] Missing audio URL in TTS response (index ${index}).`, msg);
        }
      });
      setMessages((messages) => [...messages, ...(response || [])]);
    } catch (error) {
      console.error("[Speech] Error sending TTS request:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = useCallback(() => {
    setMessages((messages) => messages.slice(1));
    setCurrentAudio(null);
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
      return;
    }

    const buildPlayableUrl = (audioUrl) => {
      if (!audioUrl) {
        return null;
      }
      if (/^https?:\/\//i.test(audioUrl)) {
        return audioUrl;
      }
      const normalizedBackendUrl = backendUrl.replace(/\/$/, "");
      const normalizedAudioUrl = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;
      return `${normalizedBackendUrl}${normalizedAudioUrl}`;
    };

    const playableUrl = buildPlayableUrl(message.audioUrl);

    if (!playableUrl) {
      console.warn("[Speech] No playable audio URL provided for message.", message);
      onMessagePlayed();
      return;
    }

    console.log(`[Speech] Preparing audio playback for ${playableUrl}`);
    const audio = new Audio(playableUrl);
    audio.crossOrigin = "anonymous";

    const handleEnded = () => {
      console.log(`[Speech] Playback ended for ${playableUrl}`);
      onMessagePlayed();
    };

    const handleError = (event) => {
      console.error(`[Speech] Playback error for ${playableUrl}`, event);
      onMessagePlayed();
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(() => console.log(`[Speech] Playback started for ${playableUrl}`))
        .catch((error) => {
          console.error(`[Speech] Playback failed for ${playableUrl}`, error);
          onMessagePlayed();
        });
    } else {
      console.log(`[Speech] Playback started for ${playableUrl}`);
    }

    setCurrentAudio(audio);

    return () => {
      console.log(`[Speech] Cleaning up audio for ${playableUrl}`);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
    };
  }, [message, onMessagePlayed]);

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
