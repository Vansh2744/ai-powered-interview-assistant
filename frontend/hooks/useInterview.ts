import { useState, useRef, useCallback, useEffect } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_FASTAPI_WS_URL || "ws://localhost:8000";

export type InterviewStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "question"
  | "recording"
  | "processing"
  | "evaluating"
  | "complete"
  | "error";

export interface QAPair {
  question: string;
  answer: string;
}
export interface Feedback {
  overall_score: number;
  summary: string;
  cv_feedback: string;
  strengths: string[];
  improvements: string[];
}

interface ExtendedWebSocket extends WebSocket {
  _pendingAudioResolver: ((blob: Blob) => void) | null;
  _stopAndSend: () => Promise<void>;
}

export function useInterview(getToken: () => Promise<string | null>) {
  const ws = useRef<ExtendedWebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const isStarting = useRef(false);

  const [status, setStatus] = useState<InterviewStatus>("idle");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<QAPair[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      closeWS();
    };
  }, []);

  function closeWS() {
    if (ws.current) {
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.close();
      ws.current = null;
    }
  }

  const playAudio = useCallback(async (bytes: ArrayBuffer) => {
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(bytes);
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
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
    if (mediaRecorder.current?.state === "recording")
      mediaRecorder.current.stop();
  }, []);

  const disconnect = useCallback(() => {
    closeWS();
    isStarting.current = false;
    setStatus("idle");
  }, []);

  const startInterview = useCallback(
    async (docId: string, fileId: number, numQuestions: number = 5) => {
      if (isStarting.current) return;
      isStarting.current = true;

      closeWS();
      setStatus("connecting");
      setError(null);
      setHistory([]);
      setFeedback(null);

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
        if (ws.current !== wsInstance) {
          wsInstance.close();
          return;
        }
        wsInstance.send(
          JSON.stringify({
            type: "init",
            doc_id: docId,
            file_id: fileId,
            num_questions: numQuestions,
          }),
        );
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

      wsInstance.onmessage = async (event) => {
        if (ws.current !== wsInstance) return;

        if (event.data instanceof Blob) {
          const bytes = await event.data.arrayBuffer();
          await playAudio(bytes);
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
        if (msg.type === "evaluating") {
          setStatus("evaluating");
        }
        if (msg.type === "complete") {
          setHistory(msg.summary);
          setFeedback(msg.feedback);
          setStatus("complete");
        }
        if (msg.type === "error") {
          setError(msg.message);
          setStatus("error");
        }
      };

      wsInstance._stopAndSend = async () => {
        const blob: Blob = await new Promise((resolve) => {
          wsInstance._pendingAudioResolver = resolve;
          stopRecording();
        });
        const bytes = await blob.arrayBuffer();
        if (ws.current === wsInstance) {
          wsInstance.send(bytes);
          setStatus("processing");
        }
      };
    },
    [getToken, playAudio, recordAnswer, stopRecording],
  );

  return {
    status,
    currentQuestion,
    currentIndex,
    totalQuestions,
    transcript,
    history,
    feedback,
    error,
    startInterview,
    stopRecording: () => ws.current?._stopAndSend?.(),
    disconnect,
  };
}
