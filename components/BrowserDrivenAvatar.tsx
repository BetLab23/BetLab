"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AvatarPerson = "alfred" | "lara";

type BrowserDrivenAvatarProps = {
  person: AvatarPerson;
  image: string;
  name: string;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: number;
  className?: string;
};

const EYES = {
  alfred: {
    left: { x: 39.2, y: 36.5, width: 12.7, height: 4.6, rotate: -2 },
    right: { x: 57.3, y: 36.1, width: 12.7, height: 4.6, rotate: 2 },
  },
  lara: {
    left: { x: 39.7, y: 36.1, width: 12.4, height: 4.4, rotate: -1 },
    right: { x: 57.4, y: 35.8, width: 12.4, height: 4.4, rotate: 1 },
  },
} as const;

export function BrowserDrivenAvatar({
  person,
  image,
  name,
  isSpeaking = false,
  isListening = false,
  size = 116,
  className = "",
}: BrowserDrivenAvatarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [motion, setMotion] = useState({ x: 0, y: 0 });

  const eyes = useMemo(() => EYES[person], [person]);

  useEffect(() => {
    let stopped = false;
    let timeoutId: number | undefined;

    function scheduleBlink() {
      const delay = 2400 + Math.random() * 3400;

      timeoutId = window.setTimeout(() => {
        if (stopped) return;

        setBlink(true);
        window.setTimeout(() => {
          if (!stopped) setBlink(false);
        }, 145);

        scheduleBlink();
      }, delay);
    }

    scheduleBlink();

    return () => {
      stopped = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    function animate() {
      const current = currentRef.current;
      const target = targetRef.current;

      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;

      if (
        Math.abs(current.x - motion.x) > 0.015 ||
        Math.abs(current.y - motion.y) > 0.015
      ) {
        setMotion({ x: current.x, y: current.y });
      }

      frameRef.current = window.requestAnimationFrame(animate);
    }

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [motion.x, motion.y]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reduceMotion.matches) {
      targetRef.current = { x: 0, y: 0 };
    }
  }, []);

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX =
      ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normalizedY =
      ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    targetRef.current = {
      x: Math.max(-1, Math.min(1, normalizedX)),
      y: Math.max(-1, Math.min(1, normalizedY)),
    };
  }

  function handlePointerLeave() {
    targetRef.current = { x: 0, y: 0 };
  }

  function handleTouchReaction() {
    targetRef.current = {
      x: Math.random() * 0.7 - 0.35,
      y: Math.random() * 0.45 - 0.2,
    };

    window.setTimeout(() => {
      targetRef.current = { x: 0, y: 0 };
    }, 700);
  }

  const imageTransform = `
    translate3d(${motion.x * 1.8}px, ${motion.y * 1.1}px, 0)
    scale(${isSpeaking ? 1.024 : 1.018})
    rotateX(${-motion.y * 1.1}deg)
    rotateY(${motion.x * 1.5}deg)
  `;

  return (
    <div
      ref={rootRef}
      className={[
        "browser-avatar",
        `browser-avatar-${person}`,
        isSpeaking ? "is-speaking" : "",
        isListening ? "is-listening" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--avatar-size": `${size}px`,
          "--look-x": motion.x,
          "--look-y": motion.y,
        } as React.CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") {
          handleTouchReaction();
        }
      }}
      aria-label={name}
    >
      <div className="browser-avatar-breath">
        <img
          className="browser-avatar-image"
          src={image}
          alt={name}
          draggable={false}
          style={{ transform: imageTransform }}
        />

        <span
          className={`browser-avatar-eyelid ${
            blink ? "blink" : ""
          }`}
          style={{
            left: `${eyes.left.x}%`,
            top: `${eyes.left.y}%`,
            width: `${eyes.left.width}%`,
            height: `${eyes.left.height}%`,
            transform: `translate(-50%, -50%) rotate(${eyes.left.rotate}deg)`,
          }}
        />

        <span
          className={`browser-avatar-eyelid ${
            blink ? "blink" : ""
          }`}
          style={{
            left: `${eyes.right.x}%`,
            top: `${eyes.right.y}%`,
            width: `${eyes.right.width}%`,
            height: `${eyes.right.height}%`,
            transform: `translate(-50%, -50%) rotate(${eyes.right.rotate}deg)`,
          }}
        />

        <span className="browser-avatar-speech-light" />
      </div>

      <style jsx>{`
        .browser-avatar {
          position: relative;
          width: var(--avatar-size);
          height: var(--avatar-size);
          overflow: hidden;
          border-radius: 34px;
          background: #111820;
          perspective: 700px;
          transform: translateZ(0);
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
        }

        .browser-avatar-breath {
          position: absolute;
          inset: -2.4%;
          animation: avatarBreathing 5.8s ease-in-out infinite;
          transform-origin: 50% 82%;
        }

        .browser-avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 22%;
          backface-visibility: hidden;
          transition: filter 240ms ease;
          will-change: transform;
          pointer-events: none;
        }

        .browser-avatar-eyelid {
          position: absolute;
          z-index: 4;
          border-radius: 999px;
          opacity: 0;
          background:
            linear-gradient(
              180deg,
              rgba(69, 48, 38, 0.98),
              rgba(35, 24, 20, 0.96)
            );
          box-shadow:
            0 1px 1px rgba(255, 255, 255, 0.08) inset,
            0 1px 2px rgba(0, 0, 0, 0.34);
          transform-origin: center;
          pointer-events: none;
        }

        .browser-avatar-lara .browser-avatar-eyelid {
          background:
            linear-gradient(
              180deg,
              rgba(105, 72, 58, 0.98),
              rgba(51, 34, 29, 0.96)
            );
        }

        .browser-avatar-eyelid.blink {
          animation: browserBlink 145ms ease-in-out;
        }

        .browser-avatar-speech-light {
          position: absolute;
          z-index: 5;
          right: 13%;
          bottom: 12%;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(231, 198, 111, 0);
          box-shadow: 0 0 0 rgba(231, 198, 111, 0);
          pointer-events: none;
        }

        .browser-avatar.is-speaking
          .browser-avatar-speech-light {
          background: #e7c66f;
          box-shadow: 0 0 15px rgba(231, 198, 111, 0.88);
          animation: speakingLight 620ms ease-in-out infinite;
        }

        .browser-avatar.is-listening
          .browser-avatar-image {
          filter: brightness(1.035) saturate(1.025);
        }

        .browser-avatar.is-listening::after {
          content: "";
          position: absolute;
          z-index: 6;
          inset: 4px;
          border: 1px solid rgba(91, 222, 176, 0.55);
          border-radius: 30px;
          animation: listeningRing 1.45s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes avatarBreathing {
          0%,
          100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.008) translateY(-0.45px);
          }
        }

        @keyframes browserBlink {
          0%,
          100% {
            opacity: 0;
            scale: 1 0.18;
          }
          42%,
          58% {
            opacity: 1;
            scale: 1 1;
          }
        }

        @keyframes speakingLight {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.25);
          }
        }

        @keyframes listeningRing {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.985);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.015);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .browser-avatar-breath,
          .browser-avatar-eyelid,
          .browser-avatar-speech-light,
          .browser-avatar.is-listening::after {
            animation: none !important;
          }

          .browser-avatar-image {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
