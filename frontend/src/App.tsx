"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Headset, Mic, Send, Instagram, Facebook, Twitter, Linkedin, MessageCircle, Mail, Phone } from "lucide-react"

// Types
type Position = "left" | "center" | "right"
type IconPos = "left" | "right"
type SocialPlatform = "instagram" | "facebook" | "twitter" | "linkedin" | "whatsapp" | "email" | "phone"

type SocialLink = {
  platform: SocialPlatform
  url: string
}

type Message = {
  role: "user" | "assistant" | "social"
  content: string
  showSocials?: boolean
}

type ChatOptions = {
  position?: Position
  iconPosition?: IconPos
  aiName?: string
  subtitle?: string
  textColor?: string
  fontFamily?: string
  bgStyle?: string
  firstMessage?: string
  primaryColor?: string
  businessContext?: string
  overlay?: boolean
  developerEmail?: string
  apiKey?: string
  socialLinks?: SocialLink[]
}

// Helpers
export function adjustColor(hex: string, percent: number): string {
  hex = hex.replace(/^#/, "")
  if (hex.length !== 6) return hex
  const num = Number.parseInt(hex, 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  const amount = Math.round(255 * (percent / 100))
  r = Math.min(255, Math.max(0, r + amount))
  g = Math.min(255, Math.max(0, g + amount))
  b = Math.min(255, Math.max(0, b + amount))
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
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
  )
}

// Hooks
function useMicrophoneLevel(active: boolean, onSpeechEnd?: () => void, onSpeechStart?: () => void) {
  const [level, setLevel] = useState(0)
  const [granted, setGranted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const silenceTimer = useRef<number | null>(null)
  const lastSpoke = useRef<number>(Date.now())

  useEffect(() => {
    let ctx: AudioContext | null = null
    if (!active) {
      if (audioRef.current) {
        audioRef.current.getTracks().forEach((t) => t.stop())
        audioRef.current = null
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current)
        silenceTimer.current = null
      }
      setIsSpeaking(false)
      setLevel(0)
      return
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        setGranted(true)
        audioRef.current = stream
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current = analyser
        dataArrayRef.current = dataArray
        source.connect(analyser)

        const tick = () => {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 255
            sum += v * v
          }
          const rms = Math.sqrt(sum / dataArray.length)
          setLevel((prev) => prev * 0.7 + rms * 0.3)

          if (rms > 0.04) {
            if (!isSpeaking) {
              setIsSpeaking(true)
              onSpeechStart?.()
            }
            lastSpoke.current = Date.now()
            if (silenceTimer.current) {
              clearTimeout(silenceTimer.current)
              silenceTimer.current = null
            }
          } else {
            if (isSpeaking && Date.now() - lastSpoke.current > 400) {
              setIsSpeaking(false)
            }
            if (!silenceTimer.current) {
              silenceTimer.current = window.setTimeout(() => {
                silenceTimer.current = null
                onSpeechEnd?.()
              }, 2500)
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => setGranted(false))

    return () => {
      if (audioRef.current) {
        audioRef.current.getTracks().forEach((t) => t.stop())
        audioRef.current = null
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current)
        silenceTimer.current = null
      }
      if (ctx) ctx.close()
    }
  }, [active, onSpeechEnd, onSpeechStart, isSpeaking])

  return { level, granted, isSpeaking }
}

const BUSINESS_CONTEXT = `
You are a customer care assistant for this business.
Answer clearly, politely, and concisely.
If you don't know something, say so.
`

function ChatWidget({ opts }: { opts?: ChatOptions }) {
  const defaultOpts: Required<ChatOptions> = {
    position: "center",
    iconPosition: "right",
    aiName: "Jay - AI",
    subtitle: "Ask anything about our services",
    textColor: "#ffffff",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto",
    bgStyle: "linear-gradient(135deg, rgba(20,25,40,0.6), rgba(20,15,30,0.45))",
    firstMessage: "Hello! I'm your AI assistant. How can I help today?",
    primaryColor: "#7C3AED",
    businessContext: BUSINESS_CONTEXT,
    overlay: true,
    developerEmail: "",
    apiKey: "",
    socialLinks: [],
  }
  const options = { ...defaultOpts, ...(opts || {}) }
  const {
    position,
    iconPosition,
    aiName,
    firstMessage,
    subtitle,
    textColor,
    fontFamily,
    bgStyle,
    primaryColor,
    businessContext,
    overlay,
    developerEmail,
    apiKey,
    socialLinks,
  } = options

  const resolvedTextColor = textColor === "black" ? "#111" : textColor === "white" ? "#fff" : textColor

  const [showBackdrop, setShowBackdrop] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [text, setText] = useState("")
  const [listening, setListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false)
  const [interimText, setInterimText] = useState("")
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = window.localStorage.getItem("chat_messages")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const inputRef = useRef<HTMLInputElement | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("chat_messages", JSON.stringify(messages))
      } catch {}
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  const stopAiSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setAiIsSpeaking(false)
    }
  }

  const speakResponse = (content: string) => {
    if (!synthRef.current || !isVoiceMode) return
    stopAiSpeech()
    const utterance = new SpeechSynthesisUtterance(content)
    utterance.onstart = () => setAiIsSpeaking(true)
    utterance.onend = () => setAiIsSpeaking(false)
    utterance.onerror = () => setAiIsSpeaking(false)
    synthRef.current.speak(utterance)
  }

  const { level, granted, isSpeaking } = useMicrophoneLevel(
    listening && isVoiceMode,
    () => {
      if (listening && isVoiceMode && (text.trim() || interimText.trim())) {
        const finalText = (text + interimText).trim()
        setText("")
        setInterimText("")
        sendMessage(finalText)
      }
    },
    () => {
      if (aiIsSpeaking && isVoiceMode) stopAiSpeech()
    },
  )

  const voiceBgStyle = `radial-gradient(circle at center, ${adjustColor(primaryColor, level * 100)}66 0%, rgba(10,10,15,1) ${70 + level * 20}%)`

  useEffect(() => {
    if (!listening || !isVoiceMode) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setInterimText("")
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      let final = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript
        else interim += event.results[i][0].transcript
      }
      if (final) setText((prev) => prev + final)
      setInterimText(interim)
    }
    recognition.start()
    return () => recognition.stop()
  }, [listening, isVoiceMode])

  async function sendMessage(userInput: string) {
    if (!userInput.trim()) return
    const userMessage: Message = { role: "user", content: userInput }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      const headers: any = { "Content-Type": "application/json" }
      if (apiKey?.trim()) headers["Authorization"] = `Bearer ${apiKey.trim()}`

      const res = await fetch("http://localhost:8080/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: `${businessContext}\n\nConversation:\n${updatedMessages
            .filter((m) => m.role !== "social")
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n")}\nUSER: ${userInput}\nASSISTANT:`,
          developer_email: developerEmail?.trim() || undefined,
        }),
      })

      if (!res.ok) {
        let errMsg = "Something went wrong. Please try again."
        let showSocials = false
        try {
          const errJson = await res.json()
          errMsg = errJson.user_message || errJson.error || errMsg
          showSocials = errJson.show_socials === true
        } catch {}
        setMessages((prev) => [...prev, { role: "social", content: errMsg, showSocials }])
        return
      }

      const data = await res.json()
      const aiMessage: Message = { role: "assistant", content: data.answer ?? "No response." }
      setMessages((prev) => [...prev, aiMessage])
      if (isVoiceMode) speakResponse(aiMessage.content)
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection issue." }])
    } finally {
      setIsLoading(false)
    }
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram size={18} />
      case "facebook":
        return <Facebook size={18} />
      case "twitter":
        return <Twitter size={18} />
      case "linkedin":
        return <Linkedin size={18} />
      case "whatsapp":
        return <MessageCircle size={18} />
      case "email":
        return <Mail size={18} />
      case "phone":
        return <Phone size={18} />
      default:
        return <MessageCircle size={18} />
    }
  }

  const getSocialColor = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #515bd4 100%)"
      case "facebook":
        return "#1877F2"
      case "twitter":
        return "#1DA1F2"
      case "linkedin":
        return "#0A66C2"
      case "whatsapp":
        return "#25D366"
      case "email":
        return "#EA4335"
      case "phone":
        return "#34B7F1"
      default:
        return "#6B7280"
    }
  }

  return (
    <>
      <AnimatePresence>
        {!showWidget && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              position: "fixed",
              zIndex: 40,
              [iconPosition === "left" ? "left" : "right"]: "1.5rem",
              bottom: "5rem",
            }}
          >
            <button
              onClick={() => {
                setShowBackdrop(true)
                setShowWidget(true)
              }}
              style={{
                width: "3.5rem",
                height: "3.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                backdropFilter: "blur(12px)",
                backgroundColor: primaryColor,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                color: resolvedTextColor,
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <IconChat />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackdrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999998,
              background: `linear-gradient(180deg, rgba(248,250,252,0.92) 0%, ${adjustColor(primaryColor, 0)} 100%)`,
              backdropFilter: "blur(8px)",
            }}
            onClick={() => {
              setShowWidget(false)
              setShowBackdrop(false)
            }}
          />
        )}
      </AnimatePresence>

      <div
        style={{
          position: "fixed",
          zIndex: 999999,
          [position === "left" ? "left" : position === "right" ? "right" : "left"]:
            position === "center" ? "50%" : "1.5rem",
          bottom: "2rem",
          transform: position === "center" ? "translateX(-50%)" : "none",
        }}
      >
        <AnimatePresence mode="wait">
          {showWidget && (
            <motion.div
              key={isVoiceMode ? "voice" : "chat"}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              style={{
                width: isVoiceMode ? "min(28rem, 95vw)" : "min(24rem, 90vw)",
                maxHeight: isVoiceMode ? "520px" : "420px",
                backdropFilter: "blur(12px)",
                borderRadius: "1rem",
                boxShadow: "0 8px 30px rgba(2,6,23,0.6)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: isVoiceMode ? voiceBgStyle : bgStyle,
                border: "1px solid rgba(255,255,255,0.12)",
                color: resolvedTextColor,
                fontFamily,
                transition: "background 0.3s ease, width 0.4s ease, max-height 0.4s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {isVoiceMode ? <Headset size={20} /> : <MessageCircle size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{aiName}</div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        color: listening ? "#6ee7b7" : aiIsSpeaking ? "#fbbf24" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {isVoiceMode
                        ? listening
                          ? "Listening..."
                          : aiIsSpeaking
                            ? "Speaking..."
                            : "Voice Mode"
                        : subtitle}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setIsVoiceMode(!isVoiceMode)
                      setListening(false)
                      stopAiSpeech()
                    }}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.375rem",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: resolvedTextColor,
                      cursor: "pointer",
                    }}
                  >
                    {isVoiceMode ? <MessageCircle size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      setShowWidget(false)
                      setShowBackdrop(false)
                    }}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.375rem",
                      background: "transparent",
                      border: "none",
                      color: resolvedTextColor,
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {!isVoiceMode ? (
                <>
                  <div
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "100%",
                          background: "linear-gradient(to right, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1rem",
                          fontSize: "0.875rem",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        Hello, I'm {aiName}, {firstMessage.replace(/^hello[,.! ]*/i, "")}
                      </div>
                    </div>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            padding: "0.75rem 1rem",
                            fontSize: "0.875rem",
                            borderRadius: "0.75rem",
                            background: msg.role === "user" ? primaryColor : "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isLoading && <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>Jay is typing...</div>}
                    <div ref={messagesEndRef} />
                  </div>
                  <div style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}>
                    <input
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
                      placeholder="Type a message..."
                      style={{
                        flex: 1,
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: resolvedTextColor,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => {
                        sendMessage(text)
                        setText("")
                      }}
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        borderRadius: "0.5rem",
                        background: primaryColor,
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                  }}
                >
                  <motion.div
                    animate={{ scale: 1 + level * 0.4, opacity: 0.8 + level * 0.2 }}
                    style={{
                      width: "140px",
                      height: "140px",
                      borderRadius: "50%",
                      background: listening
                        ? primaryColor
                        : aiIsSpeaking
                          ? adjustColor(primaryColor, 20)
                          : "rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 0 ${40 + level * 100}px ${primaryColor}${listening ? "66" : aiIsSpeaking ? "44" : "22"}`,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (aiIsSpeaking) stopAiSpeech()
                      else setListening(!listening)
                    }}
                  >
                    <Mic size={56} color="white" />
                  </motion.div>
                  <div style={{ height: "80px", textAlign: "center", marginTop: "2rem" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 500 }}>
                      {text + interimText ||
                        (listening ? "Listening..." : aiIsSpeaking ? "AI is speaking..." : "Tap the mic to talk")}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default function Page() {
  return (
    <div>
      <ChatWidget
        opts={{
          position: "center",
          iconPosition: "right",
          aiName: "Jay - AI",
          subtitle: "Ask anything ...",
          textColor: "white",
          fontFamily: "Inter, ui-sans-serif, system-ui",
          bgStyle: "linear-gradient(135deg, rgba(20,25,40,0.6), rgba(20,15,30,0.45))",
          primaryColor: "#800080",
          businessContext: "you are a support ai",
          overlay: true,
          developerEmail: "developer@example.com",
          apiKey: "",
          firstMessage: "How can I assist you today?",
          socialLinks: [
            { platform: "instagram", url: "https://instagram.com/yourcompany" },
            { platform: "facebook", url: "https://facebook.com/yourcompany" },
            { platform: "twitter", url: "https://twitter.com/yourcompany" },
            { platform: "whatsapp", url: "https://wa.me/1234567890" },
            { platform: "email", url: "mailto:support@yourcompany.com" },
            { platform: "phone", url: "tel:+1234567890" },
          ],
        }}
      />
    </div>
  )
}

function X({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
