import { useEffect, useRef, useState } from "react";

export function useMicrophoneLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const [granted, setGranted] = useState(false);
  const audioRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let ctx: AudioContext | null = null;

    if (!active) {
      if (audioRef.current) {
        audioRef.current.getTracks().forEach((t) => t.stop());
        audioRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLevel(0);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
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
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 255;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setLevel((prev) => prev * 0.7 + rms * 0.3);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => setGranted(false));

    return () => {
      if (audioRef.current) {
        audioRef.current.getTracks().forEach((t) => t.stop());
        audioRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (ctx) ctx.close();
    };
  }, [active]);

  return { level, granted };
}
