import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { LoadingOverlay } from "./LoadingOverlay";
import { FaPlay, FaPause } from "react-icons/fa";
import styles from "./TwitchPlayer.module.css";

declare global {
  interface Window {
    Twitch: {
      Player: new (
        elementId: string,
        options: TwitchPlayerOptions
      ) => TwitchPlayerInstance;
    };
  }
}

interface TwitchPlayerOptions {
  channel?: string;
  video?: string;
  collection?: string;
  width?: number | string;
  height?: number | string;
}

interface TwitchPlayerInstance {
  addEventListener: (event: string, callback: () => void) => void;
  removeEventListener: (event: string, callback: () => void) => void;
  pause: () => void;
  play: () => void;
  seek: (timestamp: number) => void;
  setChannel: (channel: string) => void;
  setCollection: (collectionId: string, videoId?: string) => void;
  setVideo: (videoId: string, timestamp?: number) => void;
  getMuted: () => boolean;
  setMuted: (muted: boolean) => void;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  getPlaybackStats: () => unknown;
  getChannel: () => string;
  getCurrentTime: () => number;
  getDuration: () => number;
  getEnded: () => boolean;
  getQuality: () => string;
  getQualities: () => string[];
  setQuality: (quality: string) => void;
  destroy: () => void;
}

interface TwitchPlayerProps {
  channel?: string;
  video?: string;
  collection?: string;
  width?: number | string;
  height?: number | string;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onSeek?: (position: number) => void;
}

export interface TwitchPlayerRef {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  isPaused: () => boolean;
  seek: (timestamp: number) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  setMuted: (muted: boolean) => void;
  getMuted: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  getChannel: () => string;
  setChannel: (channel: string) => void;
  setVideo: (videoId: string, timestamp?: number) => void;
  isReady: () => boolean;
}

export const TwitchPlayer = forwardRef<TwitchPlayerRef, TwitchPlayerProps>(
  (
    {
      channel,
      video,
      collection,
      width = "100%",
      height = "100%",
      onReady,
      onPlay,
      onPause,
      onEnded,
      onSeek,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<TwitchPlayerInstance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearHideTimeout = () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = null;
      }
    };

    const handleMouseActivity = () => {
      setShowControls(true);
      clearHideTimeout();
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        hideControlsTimeoutRef.current = null;
      }, 3000);
    };

    const handleMouseLeave = () => {
      setShowControls(false);
      clearHideTimeout();
    };

    const handlePlayPause = () => {
      if (playerRef.current && isPlayerReady) {
        if (isPaused) {
          playerRef.current.play();
        } else {
          playerRef.current.pause();
        }
      }
      handleMouseActivity();
    };

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.play();
          }
        },
        pause: () => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.pause();
          }
        },
        togglePlayPause: () => {
          if (playerRef.current && isPlayerReady) {
            if (isPaused) {
              playerRef.current.play();
            } else {
              playerRef.current.pause();
            }
          }
        },
        isPaused: () => isPaused,
        seek: (timestamp: number) => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.seek(timestamp);
          }
        },
        setVolume: (volume: number) => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.setVolume(volume);
          }
        },
        getVolume: () => {
          if (playerRef.current && isPlayerReady) {
            return playerRef.current.getVolume();
          }
          return 0;
        },
        setMuted: (muted: boolean) => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.setMuted(muted);
          }
        },
        getMuted: () => {
          if (playerRef.current && isPlayerReady) {
            return playerRef.current.getMuted();
          }
          return false;
        },
        getCurrentTime: () => {
          if (playerRef.current && isPlayerReady) {
            return playerRef.current.getCurrentTime();
          }
          return 0;
        },
        getDuration: () => {
          if (playerRef.current && isPlayerReady) {
            return playerRef.current.getDuration();
          }
          return 0;
        },
        getChannel: () => {
          if (playerRef.current && isPlayerReady) {
            return playerRef.current.getChannel();
          }
          return "";
        },
        setChannel: (channel: string) => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.setChannel(channel);
          }
        },
        setVideo: (videoId: string, timestamp?: number) => {
          if (playerRef.current && isPlayerReady) {
            playerRef.current.setVideo(videoId, timestamp);
          }
        },
        isReady: () => isPlayerReady,
      }),
      [isPlayerReady, isPaused]
    );

    useEffect(() => {
      const loadTwitchPlayer = () => {
        if (!containerRef.current) return;

        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
          setIsPlayerReady(false);
        }

        const playerId = `twitch-player-${Date.now()}`;
        containerRef.current.innerHTML = `<div id="${playerId}"></div>`;

        try {
          const player = new window.Twitch.Player(playerId, {
            channel,
            video,
            collection,
            width,
            height,
          });

          playerRef.current = player;

          player.addEventListener("ready", () => {
            setIsLoading(false);
            setError(null);
            setIsPlayerReady(true);
            setIsPaused(false);
            onReady?.();
          });

          player.addEventListener("play", () => {
            setIsPaused(false);
            onPlay?.();
          });

          player.addEventListener("pause", () => {
            setIsPaused(true);
            onPause?.();
          });

          player.addEventListener("ended", () => {
            setIsPaused(true);
            onEnded?.();
          });

          player.addEventListener("seek", () => {
            const currentTime = player.getCurrentTime();
            onSeek?.(currentTime);
          });
        } catch (err) {
          setError("Failed to initialize Twitch player");
          setIsLoading(false);
          setIsPlayerReady(false);
          console.error("Twitch Player Error:", err);
        }
      };

      if (!window.Twitch) {
        const script = document.createElement("script");
        script.src = "https://embed.twitch.tv/embed/v1.js";
        script.onload = loadTwitchPlayer;
        script.onerror = () => {
          setError("Failed to load Twitch embed script");
          setIsLoading(false);
          setIsPlayerReady(false);
        };
        document.head.appendChild(script);
      } else {
        loadTwitchPlayer();
      }

      return () => {
        clearHideTimeout();
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
          setIsPlayerReady(false);
        }
      };
    }, [
      channel,
      video,
      collection,
      width,
      height,
      onReady,
      onPlay,
      onPause,
      onEnded,
      onSeek,
    ]);

    if (error) {
      return (
        <div
          className={styles.errorContainer}
          style={{
            width,
            height,
          }}
        >
          <p className={styles.errorText}>Error: {error}</p>
        </div>
      );
    }

    return (
      <div
        className={styles.container}
        style={{
          width,
          height,
        }}
        onMouseMove={handleMouseActivity}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseActivity}
      >
        {isLoading && <LoadingOverlay />}

        <div
          ref={containerRef}
          style={{ pointerEvents: showControls ? "none" : "auto" }}
        />

        {isPlayerReady && (
          <>
            <div
              className={`${styles.controlsOverlay} ${
                showControls ? styles.controlsOverlayVisible : ""
              }`}
            >
              <button
                onClick={handlePlayPause}
                className={styles.playPauseButton}
              >
                {isPaused ? <FaPlay /> : <FaPause />}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
);

TwitchPlayer.displayName = "TwitchPlayer";
