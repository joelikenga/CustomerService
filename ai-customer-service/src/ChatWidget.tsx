"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Mail,
  Phone,
} from "lucide-react";
import { adjustColor } from "./utils/helpers";
import { IconChat, X } from "./utils/icons";
import { useMicrophoneLevel } from "./hooks/useMicrophone";

// Types
export type Position = "left" | "center" | "right";
export type IconPos = "left" | "right";
export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "whatsapp"
  | "email"
  | "phone";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

export type Message = {
  role: "user" | "assistant" | "social";
  content: string;
  showSocials?: boolean;
};

export type ChatOptions = {
  position?: Position;
  iconPosition?: IconPos;
  aiName?: string;
  subtitle?: string;
  textColor?: string;
  fontFamily?: string;
  bgStyle?: string;
  firstMessage?: string;
  primaryColor?: string;
  businessContext?: string;
  overlay?: boolean;
  developerEmail?: string;
  apiKey?: string;
  socialLinks?: SocialLink[];
  className?: string;
  voiceRate?: number;
};

const BUSINESS_CONTEXT = `
You are a customer care assistant for this business.
Answer clearly, politely, and concisely.
If you don't know something, say so.
`;

const API_ENDPOINT = "http://localhost:8080/chat";

export function ChatWidget({ opts }: { opts?: ChatOptions }) {
  const defaultOpts: Required<ChatOptions> = {
    position: "center",
    iconPosition: "right",
    aiName: "Jay - AI",
    subtitle: "Ask anything about our services",
    textColor: "#ffffff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto",
    bgStyle: "linear-gradient(135deg, rgba(20,25,40,0.6), rgba(20,15,30,0.45))",
    firstMessage: "Hello! I'm your AI assistant. How can I help today?",
    primaryColor: "#7C3AED",
    businessContext: BUSINESS_CONTEXT,
    overlay: true,
    developerEmail: "",
    apiKey: "",
    socialLinks: [],
    className: "",
    voiceRate: 0.9,
  };
  const options = { ...defaultOpts, ...(opts || {}) };
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
    className,
    voiceRate,
  } = options;

  const resolvedTextColor =
    textColor === "black" ? "#111" : textColor === "white" ? "#fff" : textColor;

  const [showBackdrop, setShowBackdrop] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem("chat_messages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  const { level } = useMicrophoneLevel(listening && isVoiceMode);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("chat_messages", JSON.stringify(messages));
      } catch {}
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const stopAiSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setAiIsSpeaking(false);
    }
  };

  const speakResponse = (content: string) => {
    if (!synthRef.current || !isVoiceMode) return; // Only speak in voice mode
    stopAiSpeech();

    // Split long content into chunks to avoid speech synthesis issues
    const maxChunkLength = 200;
    const sentences = content.split(/(?<=[.!?])\s+/);
    let chunks: string[] = [];
    let currentChunk = "";

    sentences.forEach((sentence) => {
      if ((currentChunk + sentence).length > maxChunkLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    });
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    // Speak all chunks sequentially
    const speakChunk = (index: number) => {
      if (index >= chunks.length) {
        setAiIsSpeaking(false);
        // After speaking, start listening again in voice mode
        if (isVoiceMode) {
          setTimeout(() => {
            // Add a small delay to prevent picking up the speaker's own voice
            setListening(true);
            startSpeechRecognition();
          }, 800); // Increased delay to prevent echo
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = voiceRate;
      utterance.onstart = () => setAiIsSpeaking(true);
      utterance.onend = () => {
        // Speak next chunk
        setTimeout(() => speakChunk(index + 1), 300);
      };
      utterance.onerror = () => {
        // Continue with next chunk even if there's an error
        setTimeout(() => speakChunk(index + 1), 300);
      };
      synthRef.current!.speak(utterance);
    };

    speakChunk(0);
  };

  const startSpeechRecognition = () => {
    if (!isVoiceMode) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        setVoiceText((prev) => prev + final);
        setInterimText("");
      }
      setInterimText(interim);
    };

    recognition.onend = () => {
      if (listening && isVoiceMode && !aiIsSpeaking) {
        // Restart recognition if still in listening mode and AI is not speaking
        setTimeout(() => {
          if (listening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error("Failed to restart recognition:", error);
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setListening(false);
        const errorMessage =
          "Microphone access denied. Please allow microphone access to use voice mode.";
        alert(errorMessage);
        // Speak the error message (only in voice mode)
        if (isVoiceMode) {
          speakResponse(errorMessage);
        }
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setInterimText("");
  };

  useEffect(() => {
    if (listening && isVoiceMode) {
      if (aiIsSpeaking) {
        // Stop speech if user starts talking while AI is speaking
        stopAiSpeech();
        // Small delay before starting recognition
        setTimeout(() => {
          startSpeechRecognition();
        }, 300);
      } else {
        startSpeechRecognition();
      }
    } else {
      stopSpeechRecognition();
    }

    return () => {
      stopSpeechRecognition();
    };
  }, [listening, isVoiceMode, aiIsSpeaking]);

  useEffect(() => {
    // Auto-start listening when switching to voice mode
    if (isVoiceMode && !listening && !aiIsSpeaking && !isProcessingVoice) {
      setTimeout(() => {
        setListening(true);
      }, 500);
    }

    if (!isVoiceMode) {
      stopSpeechRecognition();
      stopAiSpeech();
    }
  }, [isVoiceMode]);

  const handleVoiceSubmit = () => {
    const finalText = (voiceText + interimText).trim();
    if (!finalText) return;

    setIsProcessingVoice(true);
    setListening(false);
    setVoiceText("");
    setInterimText("");

    sendMessage(finalText).finally(() => {
      setIsProcessingVoice(false);
    });
  };

  useEffect(() => {
    // Auto-submit voice text after 1.5 seconds of silence
    if (listening && voiceText && !interimText && !aiIsSpeaking) {
      const timer = setTimeout(() => {
        if (voiceText.trim() && !isProcessingVoice) {
          handleVoiceSubmit();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [voiceText, interimText, listening, isProcessingVoice, aiIsSpeaking]);

  async function sendMessage(userInput: string): Promise<void> {
    if (!userInput.trim()) return Promise.resolve();

    const userMessage: Message = { role: "user", content: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setShowSocialLinks(false);

    try {
      const headers: any = { "Content-Type": "application/json" };
      if (apiKey?.trim()) headers["Authorization"] = `Bearer ${apiKey.trim()}`;

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: `${businessContext}\n\nConversation:\n${updatedMessages
            .filter((m) => m.role !== "social")
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n")}\nUSER: ${userInput}\nASSISTANT:`,
          developer_email: developerEmail?.trim() || undefined,
        }),
      });

      let responseContent = "";
      let showSocials = false;

      if (!res.ok) {
        let errMsg = "Something went wrong. Please try again.";
        try {
          const errJson = await res.json();
          errMsg = errJson.user_message || errJson.error || errMsg;
          showSocials = errJson.show_socials === true;
        } catch {}
        responseContent = errMsg;
        const errorMessage: Message = {
          role: "social",
          content: responseContent,
          showSocials,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setShowSocialLinks(showSocials);
      } else {
        const data = await res.json();
        responseContent = data.answer ?? "No response from server.";
        const aiMessage: Message = {
          role: "assistant",
          content: responseContent,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }

      // SPEAK THE RESPONSE only in voice mode
      if (isVoiceMode) {
        speakResponse(responseContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage =
        "Connection issue. Please check your internet connection and try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
      // SPEAK THE ERROR MESSAGE only in voice mode
      if (isVoiceMode) {
        speakResponse(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (inputText: string) => {
    sendMessage(inputText);
    setText("");
    if (inputRef.current) inputRef.current.focus();
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram size={18} />;
      case "facebook":
        return <Facebook size={18} />;
      case "twitter":
        return <Twitter size={18} />;
      case "linkedin":
        return <Linkedin size={18} />;
      case "whatsapp":
        return <MessageCircle size={18} />;
      case "email":
        return <Mail size={18} />;
      case "phone":
        return <Phone size={18} />;
      default:
        return <MessageCircle size={18} />;
    }
  };

  const getSocialColor = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #515bd4 100%)";
      case "facebook":
        return "#1877F2";
      case "twitter":
        return "#1DA1F2";
      case "linkedin":
        return "#0A66C2";
      case "whatsapp":
        return "#25D366";
      case "email":
        return "#EA4335";
      case "phone":
        return "#34B7F1";
      default:
        return "#6B7280";
    }
  };

  const voiceBgStyle = `radial-gradient(circle at center, ${adjustColor(
    primaryColor,
    level * 100
  )}66 0%, rgba(10,10,15,1) ${70 + level * 20}%)`;

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
                setShowBackdrop(true);
                setShowWidget(true);
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
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <IconChat />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {overlay && (
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
                background: `linear-gradient(180deg, rgba(248,250,252,0.92) 0%, ${adjustColor(
                  primaryColor,
                  0
                )} 100%)`,
                backdropFilter: "blur(8px)",
              }}
              onClick={() => {
                setShowWidget(false);
                setShowBackdrop(false);
              }}
            />
          )}
        </AnimatePresence>
      )}
      <div
        style={{
          position: "fixed",
          zIndex: 999999,
          [position === "left"
            ? "left"
            : position === "right"
            ? "right"
            : "left"]: position === "center" ? "50%" : "1.5rem",
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
                maxHeight: isVoiceMode
                  ? "520px"
                  : showSocialLinks
                  ? "500px"
                  : "420px",
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
                transition:
                  "background 0.3s ease, width 0.4s ease, max-height 0.4s ease",
              }}
              className={className}
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
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
                    {isVoiceMode ? (
                      <Mic size={20} />
                    ) : (
                      <MessageCircle size={18} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {aiName}
                    </div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        color: listening
                          ? "#6ee7b7"
                          : aiIsSpeaking
                          ? "#fbbf24"
                          : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {isVoiceMode
                        ? listening
                          ? "Listening..."
                          : aiIsSpeaking
                          ? "Speaking..."
                          : isProcessingVoice
                          ? "Processing..."
                          : "Voice Mode"
                        : subtitle}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      const newVoiceMode = !isVoiceMode;
                      setIsVoiceMode(newVoiceMode);
                      if (newVoiceMode) {
                        // When switching TO voice mode, start listening
                        setTimeout(() => {
                          setListening(true);
                        }, 300);
                      } else {
                        // When switching FROM voice mode, stop everything
                        setListening(false);
                        stopAiSpeech();
                      }
                      setVoiceText("");
                      setInterimText("");
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
                    {isVoiceMode ? (
                      <MessageCircle size={16} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowWidget(false);
                      setShowBackdrop(false);
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
                    <div
                      style={{ display: "flex", justifyContent: "flex-start" }}
                    >
                      <div
                        style={{
                          maxWidth: "100%",
                          background:
                            "linear-gradient(to right, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1rem",
                          fontSize: "0.875rem",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        Hello, I'm {aiName},{" "}
                        {firstMessage!.replace(/^hello[,.! ]*/i, "")}
                      </div>
                    </div>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent:
                            msg.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            padding: "0.75rem 1rem",
                            fontSize: "0.875rem",
                            borderRadius: "0.75rem",
                            background:
                              msg.role === "user"
                                ? primaryColor
                                : "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                        Jay is typing...
                      </div>
                    )}

                    {/* Social Links Section (only shown when showSocialLinks is true) */}
                    {showSocialLinks && socialLinks!.length > 0 && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "0.5rem",
                          borderTop: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.75rem",
                            opacity: 0.7,
                            marginBottom: "0.5rem",
                          }}
                        >
                          Contact us through:
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}
                        >
                          {socialLinks!.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.375rem 0.75rem",
                                borderRadius: "0.5rem",
                                background: getSocialColor(link.platform),
                                color: "white",
                                textDecoration: "none",
                                fontSize: "0.75rem",
                                transition: "transform 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.transform =
                                  "scale(1.05)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.transform = "scale(1)")
                              }
                            >
                              {getSocialIcon(link.platform)}
                              <span style={{ textTransform: "capitalize" }}>
                                {link.platform === "whatsapp"
                                  ? "WhatsApp"
                                  : link.platform}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <input
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit(text)}
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
                      onClick={() => handleSubmit(text)}
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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
                    animate={{
                      scale: 1 + level * 0.4,
                      opacity: 0.8 + level * 0.2,
                    }}
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
                      boxShadow: `0 0 ${40 + level * 100}px ${primaryColor}${
                        listening ? "66" : aiIsSpeaking ? "44" : "22"
                      }`,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                    onClick={() => {
                      if (aiIsSpeaking) {
                        stopAiSpeech();
                        // After stopping speech, start listening
                        setTimeout(() => {
                          setListening(true);
                        }, 300);
                      } else if (listening) {
                        // If already listening and user clicks, submit the voice text
                        if (voiceText.trim() || interimText.trim()) {
                          handleVoiceSubmit();
                        } else {
                          setListening(false);
                        }
                      } else {
                        // Start listening
                        setListening(true);
                        setVoiceText("");
                        setInterimText("");
                      }
                    }}
                  >
                    <Mic size={56} color="white" />
                  </motion.div>
                  <div
                    style={{
                      height: "80px",
                      textAlign: "center",
                      marginTop: "2rem",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 500,
                        minHeight: "24px",
                      }}
                    >
                      {voiceText ||
                        // interimText ||
                        (listening
                          ? "Speak now..."
                          : aiIsSpeaking
                          ? `${aiName} is speaking...`
                          : isProcessingVoice
                          ? "Thinking..."
                          : "")}
                    </div>
                    {interimText && (
                      <div
                        style={{
                          fontSize: "0.875rem",
                          opacity: 0.7,
                          marginTop: "0.5rem",
                        }}
                      >
                        {interimText}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
