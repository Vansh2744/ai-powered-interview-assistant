import { useState, useRef, useCallback, useEffect } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_FASTAPI_WS_URL || "ws://localhost:8000";

export type InterviewStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "question"
  | "recording"
  | "processing"
  | "complete"
  | "error";

export interface QAPair {
  question: string;
  answer: string;
}

interface ExtendedWebSocket extends WebSocket {
  _pendingAudioResolver: ((blob: Blob) => void) | null;
  _stopAndSend: () => Promise<void>;
}

export function useInterview(getToken: () => Promise<string | null>) {
  const ws = useRef<ExtendedWebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const isStarting = useRef(false); // ✅ prevent concurrent startInterview calls

  const [status, setStatus] = useState<InterviewStatus>("idle");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [transcript, setTranscript] = useState<string>("");
  const [history, setHistory] = useState<QAPair[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.onerror = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, []);

  const playAudio = useCallback(async (audioBytes: ArrayBuffer) => {
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(audioBytes);
    const source = audioCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(audioCtx.destination);
    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }, []);

  const recordAnswer = useCallback((): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunks.current = [];
        mediaRecorder.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.current.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(audioChunks.current, { type: "audio/webm" }));
        };
        recorder.start();
        setStatus("recording");
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  const handleMessage = useCallback(
    (wsInstance: ExtendedWebSocket) => {
      wsInstance.onmessage = async (event) => {
        // ✅ ignore messages from stale/replaced sockets
        if (ws.current !== wsInstance) return;

        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          await playAudio(arrayBuffer);
          const audioBlob = await recordAnswer();
          wsInstance._pendingAudioResolver?.(audioBlob);
          return;
        }

        const msg = JSON.parse(event.data);

        if (msg.type === "ready") {
          setTotalQuestions(msg.total_questions);
          setStatus("ready");
        }
        if (msg.type === "question") {
          setCurrentQuestion(msg.text);
          setCurrentIndex(msg.index);
          setTranscript("");
          setStatus("question");
        }
        if (msg.type === "transcription") {
          setTranscript(msg.text);
          setStatus("processing");
        }
        if (msg.type === "complete") {
          setHistory(msg.summary);
          setStatus("complete");
        }
        if (msg.type === "error") {
          setError(msg.message);
          setStatus("error");
        }
      };
    },
    [playAudio, recordAnswer],
  );

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.onmessage = null; // ✅ stop processing messages immediately
      ws.current.onclose = null; // ✅ don't trigger onclose handler
      ws.current.onerror = null;
      ws.current.close();
      ws.current = null;
    }
    isStarting.current = false;
    setStatus("idle");
  }, []);

  const startInterview = useCallback(
    async (docId: string) => {
      // ✅ prevent double-start
      if (isStarting.current) {
        console.log("[WS] Already starting, skipping duplicate call");
        return;
      }
      isStarting.current = true;

      // ✅ close any existing connection first
      if (ws.current) {
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.onerror = null;
        ws.current.close();
        ws.current = null;
      }

      setStatus("connecting");
      setError(null);
      setHistory([]);

      const freshToken = await getToken();
      if (!freshToken) {
        setError("Not authenticated");
        setStatus("error");
        isStarting.current = false;
        return;
      }

      const wsInstance = new WebSocket(
        `${WS_BASE}/interview/ws?token=${freshToken}`,
      ) as ExtendedWebSocket;

      ws.current = wsInstance;
      wsInstance._pendingAudioResolver = null;

      wsInstance.onopen = () => {
        // ✅ check this socket is still the current one before proceeding
        if (ws.current !== wsInstance) {
          wsInstance.close();
          return;
        }
        console.log("[WS] Connected, sending init with doc_id:", docId);
        wsInstance.send(JSON.stringify({ type: "init", doc_id: docId }));
        isStarting.current = false;
      };

      wsInstance.onclose = () => {
        if (ws.current === wsInstance) {
          setStatus((prev) => (prev !== "complete" ? "idle" : prev));
          ws.current = null;
        }
      };

      wsInstance.onerror = () => {
        if (ws.current === wsInstance) {
          setError("WebSocket connection failed.");
          setStatus("error");
          isStarting.current = false;
        }
      };

      handleMessage(wsInstance);

      wsInstance._stopAndSend = async () => {
        const blob: Blob = await new Promise((resolve) => {
          wsInstance._pendingAudioResolver = resolve;
          stopRecording();
        });
        const arrayBuffer = await blob.arrayBuffer();
        if (ws.current === wsInstance) {
          wsInstance.send(arrayBuffer);
          setStatus("processing");
        }
      };
    },
    [getToken, handleMessage, stopRecording],
  );

  return {
    status,
    currentQuestion,
    currentIndex,
    totalQuestions,
    transcript,
    history,
    error,
    startInterview,
    stopRecording: () => ws.current?._stopAndSend?.(),
    disconnect,
  };
}
