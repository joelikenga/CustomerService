import  { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import { Headset, Mic, Send } from "lucide-react";

// Note: this file replaces the previous App.tsx contents with a chat widget using Tailwind + Framer Motion.
// Ensure Tailwind and framer-motion are installed and configured in your project.

type Position = "left" | "center" | "right";
type IconPos = "left" | "right";

function useMicrophoneLevel(active: boolean) {
  // returns normalized level 0..1 and a boolean whether access is granted
  const [level, setLevel] = useState(0);
  const [granted, setGranted] = useState(false);
  const audioRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let ctx: AudioContext | null = null;
    if (!active) {
      // stop if previously started
      if (audioRef.current) {
        audioRef.current.getTracks().forEach((t) => t.stop());
        audioRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (ctx) {
        (ctx as any)?.close?.();
      }
      return;
    }

    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (!mounted) return;
        setGranted(true);
        audioRef.current = stream;
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        source.connect(analyser);
        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          // compute RMS-ish value
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 255;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          // smooth / damp
          setLevel((prev) => prev * 0.8 + rms * 0.2);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {
        setGranted(false);
      });

    return () => {
      mounted = false;
      if (audioRef.current) {
        audioRef.current.getTracks().forEach((t) => t.stop());
        audioRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      (ctx as any)?.close?.();
    };
  }, [active]);

  return { level, granted };
}

export function adjustColor(
  hex: string,
  percent: number
): string {
  // Remove #
  hex = hex.replace(/^#/, "");

  if (hex.length !== 6) {
    throw new Error("Invalid hex color");
  }

  const num = parseInt(hex, 16);

  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  const amount = Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));

  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
  );
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15a4 4 0 01-4 4H8l-5 3V6a4 4 0 014-4h10a4 4 0 014 4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
    </svg>
  );
}

function ChatWidget({
  position = "center",
  iconPosition = "right",
  aiName = "AI Customer Assistant",
  subtitle = "Ask anything about orders, returns, and more",
  textColor = "#ffffff",
  fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto",
  bgStyle = "linear-gradient(135deg, rgba(20,25,40,0.6), rgba(20,15,30,0.45))",
  firstMessage = "Hello! I'm your AI assistant. How can I help today?",
  primaryColor , // new prop: affects send button and initiating icon
}: {
  position?: Position;
  iconPosition?: IconPos;
  aiName?: string;
  subtitle?: string;
  textColor?: string;
  fontFamily?: string;
  bgStyle?: string;
  firstMessage?: string;
  primaryColor: string;
}) {
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const { granted } = useMicrophoneLevel(listening);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openSequence = () => {
    // show backdrop first
    setShowBackdrop(true);
    // then show widget slightly after backdrop animation starts
    window.setTimeout(() => setShowWidget(true), 160);
  };

  const closeSequence = () => {
    // hide widget first
    setShowWidget(false);
    // then remove backdrop after widget has started its exit
    window.setTimeout(() => setShowBackdrop(false), 220);
  };

  // compute widget placement classes
  const containerPosClass =
    position === "left"
      ? "left-6 bottom-8"
      : position === "right"
      ? "right-6 bottom-8"
      : "left-1/2 transform -translate-x-1/2 bottom-8";

  useEffect(() => {
    if (showWidget) {
      // small auto-focus on open
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [showWidget]);

  return (
    <>
      {/* trigger icon */}
      {!showBackdrop && !showWidget && (
        <div
          className={`fixed z-40 ${
            iconPosition === "left" ? "left-6" : "right-6"
          } bottom-20`}
        >
          <button
            onClick={() => openSequence()}
            className="w-14 h-14 flex items-center justify-center rounded-full backdrop-blur-md bg-black/8 border border-white/10 shadow-lg text-white hover:scale-105 transform-gpu transition"
            aria-label="Open chat"
            title="Open chat"
          >
            <div
              className="w-10 h-10 hidden lg:flex items-center justify-center cursor-pointer"
              style={{ color: primaryColor,fontSize: 20  }} // icon stroke uses currentColor
            >
              {showWidget ? <span style={{ fontSize: 20 }}>✕</span> : <div><IconChat /></div>}
            </div>
          </button>
        </div>
      )}

      {/* backdrop (animated) and widget (animated after backdrop) */}
      <div className={`fixed inset-0 pointer-events-none`}>
        <AnimatePresence>
          {showBackdrop && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-999998 pointer-events-auto flex items-center justify-center"
            >
              <div
                className="min-h-screen w-full h-full flex items-center justify-center p-6"
                style={{
                  // runtime gradient using primaryColor (Tailwind cannot handle dynamic classes)
                  background: `linear-gradient(180deg, rgba(248,250,252,0.92) 0%, ${adjustColor(primaryColor, 0)} 100%)`,
                  color: "white",
                  backdropFilter: "blur(8px)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={`fixed z-999999 ${containerPosClass} `}
        style={{ pointerEvents: "auto" }}
      >
        <AnimatePresence>
          {showWidget && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-80 md:w-96 max-h-100 bg-white/6 backdrop-blur-md border border-white/12 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{
                background:
                  bgStyle ??
                  "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                boxShadow: "0 8px 30px rgba(2,6,23,0.6)",
                color: textColor,
                fontFamily,
              }}
            >
              {/* header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/6 border border-white/8">
                    <Headset/>
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: textColor }}
                    >
                      {aiName}
                    </div>

                    {/* subtitle acts as the listening toggle per request */}
                    <div
                      // onClick={() => setListening((s) => !s)}
                      className={`text-[11px] ${
                        listening ? "text-emerald-300" : "text-white/60"
                      } underline-offset-2`}
                      style={{
                        color: listening ? undefined : textColor,
                        background: "transparent",
                        padding: 0,
                      }}
                      aria-pressed={listening}
                    >
                      {listening
                        ? granted
                          ? `Listening...`
                          : "Requesting mic…"
                        : subtitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => closeSequence()}
                    className="p-2 rounded-md hover:bg-white/4 transition cursor-pointer"
                    aria-label="Close"
                  >
                    <span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M6 6l12 12M18 6L6 18"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {/* messages / body */}
              <div className="flex-1 px-4 overflow-auto py-3 space-y-3">
                {/* Use the configurable firstMessage prop for the initial assistant message */}
                <div className="flex justify-start">
                  <div className="max-w-[75%] bg-linear-to-r from-white/4 to-white/2 backdrop-blur-sm border border-white/6 rounded-tl-lg rounded-br-xl rounded-tr-lg rounded-bl-md px-4 py-3 text-sm">
                    {firstMessage}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-white/8 border border-white/6 rounded-tl-xl rounded-br-lg rounded-tr-md rounded-bl-lg px-4 py-3 text-sm">
                    I want to check an order status.
                  </div>
                </div>
              </div>

              {/* footer: removed non-displayed spectrum and replaced with compact listening indicator */}
              <div className="px-3 pb-3 pt-2">
                <div className="px-2 mb-2">
                  <div className="flex items-center justify-end gap-2">
                    {/* <div className="text-[11px] text-white/50">
                      Max 400px height
                    </div> */}
                    <div className="text-[12px] text-white/70">
                      {listening
                        ? "Click mic to stop listening."
                        : "Click mic to use voice search."}
                    </div>
                  </div>

                  {/* Simple listening indicator (clickable to stop listening) */}
                  {listening && (
                    <div className="mt-3 w-full flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        {" "}
                        <button
                          onClick={() => setListening(false)}
                          className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center border animate-pulse cursor-pointer"
                          aria-label="Stop listening"
                          title="Click to stop listening"
                        >
                          <Mic />
                        </button>{" "}
                      </div>
                    </div>
                  )}
                </div>

                {/* input row: hidden when listening */}
                {!listening && (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Type a message or speak..."
                      className="flex-1 px-4 py-2 rounded-lg bg-white/6 border border-white/8 placeholder:text-white/50 text-sm outline-none focus:ring-2 focus:ring-white/10 w-[80%]"
                    />
                    <button
                      onClick={() => {
                        if (text.trim().length === 0) {
                          // activate quick listen if mic available
                          setListening((s) => !s);
                        } else {
                          // handle send
                          setText("");
                        }
                      }}
                      aria-label={
                        text.trim().length ? "Send" : "Start/stop mic"
                      }
                      style={{
                        background: `${adjustColor(primaryColor, 20)}`,
                        boxShadow: `0 8px 20px ${primaryColor}33`,
                        color: "#fff",
                      }}
                      className="w-11 h-11 rounded-lg flex items-center justify-center shadow-lg"
                    >
                      {text.trim().length ? <Send /> : <Mic />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function App() {
  // example usage: you can change position and iconPosition props and customize appearance
  return (
    <div className="">
      <ChatWidget
        position="center"
        iconPosition="right"
        aiName="Jay - AI"
        subtitle="Ask anything ..."
        textColor="#EAF2FF"
        fontFamily={`Inter, ui-sans-serif, system-ui`}
        bgStyle={
          "linear-gradient(135deg, rgba(20,25,40,0.6), rgba(20,15,30,0.45))"
        }
        primaryColor="#800080" 
      />
    </div>
  );
}
