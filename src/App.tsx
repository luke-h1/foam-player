/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";

type Orientation = "portrait" | "landscape";

// Extend HTMLVideoElement with custom properties
interface ExtendedVideoElement extends HTMLVideoElement {
  _foamConfigured?: boolean;
  _foamListenersAdded?: boolean;
  _foamInitialized?: boolean;
}

interface PlayerState {
  isPaused: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  isReady: boolean;
}

function App() {
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContentGate, setHasContentGate] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPaused: true,
    muted: false,
    volume: 1.0,
    currentTime: 0,
    duration: 0,
    isBuffering: true,
    isReady: false,
  });
  const [channelName, setChannelName] = useState<string>("");
  
  const observerRef = useRef<MutationObserver | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<ExtendedVideoElement | null>(null);
  const stuckCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);

  // Detect orientation from window dimensions
  const detectOrientation = useCallback((): Orientation => {
    return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
  }, []);

  // Update orientation state
  const updateOrientation = useCallback(() => {
    const newOrientation = detectOrientation();
    setOrientation(newOrientation);
    console.log("[Foam Player] Orientation changed:", newOrientation, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Apply orientation-specific styles
    applyOrientationStyles(newOrientation);
  }, [detectOrientation]);

  // Apply orientation-specific styles
  const applyOrientationStyles = useCallback(
    (orient: Orientation) => {
      const root = document.documentElement;
      const body = document.body;

      if (orient === "landscape") {
        root.classList.add("landscape");
        root.classList.remove("portrait");
        body.style.overflow = "hidden";

        // Ensure full screen in landscape
        const playerContainer = document.querySelector(
          '[data-a-target="player-container"]',
        );
        if (playerContainer) {
          (playerContainer as HTMLElement).style.width = "100vw";
          (playerContainer as HTMLElement).style.height = "100vh";
        }
      } else {
        root.classList.add("portrait");
        root.classList.remove("landscape");

        // Allow scrolling if content gate is present
        if (hasContentGate) {
          body.style.overflow = "auto";
          (body.style as any).webkitOverflowScrolling = "touch";
        } else {
          body.style.overflow = "hidden";
        }
      }
    },
    [hasContentGate],
  );


  // Detect content classification gates
  const detectContentGate = useCallback(() => {
    const selectors = [
      '[data-a-target="player-overlay-content-gate"]',
      '[data-a-target*="content-classification-gate"]',
      ".content-classification-gate",
      '[class*="content-gate"]',
      '[class*="ContentGate"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        ) {
          console.log("[Foam Player] Content gate detected:", selector);
          setHasContentGate(true);
          applyContentGateStyles();
          return true;
        }
      }
    }

    // Check if video is playing - if so, no content gate
    const video = document.querySelector("video");
    if (video && video.readyState >= 2 && !video.paused) {
      if (hasContentGate) {
        console.log("[Foam Player] Content gate cleared - video playing");
        setHasContentGate(false);
        removeContentGateStyles();
      }
    }

    return false;
  }, [hasContentGate]);

  // Apply styles when content gate is present
  const applyContentGateStyles = useCallback(() => {
    const styleId = "foam-content-gate-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement;

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    // Scale content gate to fit viewport and allow scrolling
    style.textContent = `
      [data-a-target="player-overlay-content-gate"] {
        transform: scale(0.85) !important;
        transform-origin: center center !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
      }
      
      body, html {
        overflow: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      [data-a-target="player-container"] {
        overflow: visible !important;
      }
    `;
  }, []);

  // Remove content gate styles when gate is gone
  const removeContentGateStyles = useCallback(() => {
    const style = document.getElementById("foam-content-gate-styles");
    if (style) {
      style.remove();
    }

    // Restore normal overflow
    if (orientation === "portrait") {
      document.body.style.overflow = "hidden";
    }
  }, [orientation]);

  // Apply custom styles to hide Twitch UI elements
  const applyCustomStyles = useCallback(() => {
    const styleId = "foam-custom-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement;

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    // Hide Twitch UI elements
    style.textContent = `
      /* Hide Twitch navigation and controls */
      .top-bar,
      .player-controls,
      #channel-player-disclosures,
      [data-a-target="player-overlay-preview-background"],
      [data-a-target="player-overlay-video-stats"],
      .chat-input,
      .chat-room,
      .right-column,
      .left-column:not([data-a-target="player-container"]) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      
      /* Player container styling */
      [data-a-target="player-container"],
      [data-a-target="player-container"] > div {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Video element styling */
      video {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        max-width: 100% !important;
        max-height: 100% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        margin: 0 auto !important;
      }
      
      /* Orientation-specific styles */
      html.landscape body,
      html.landscape #root {
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
      }
      
      html.landscape [data-a-target="player-container"] {
        width: 100vw !important;
        height: 100vh !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
      }
      
      html.landscape video {
        width: 100vw !important;
        height: 100vh !important;
        object-fit: contain !important;
      }
      
      html.portrait [data-a-target="player-container"] {
        width: 100% !important;
        max-width: 100vw !important;
      }
      
      html.portrait video {
        width: 100% !important;
        max-width: 100vw !important;
        height: auto !important;
      }
      
      /* Fullscreen styles */
      html.fullscreen body,
      html.fullscreen #root {
        width: 100vw !important;
        height: 100vh !important;
      }
      
      html.fullscreen [data-a-target="player-container"] {
        width: 100vw !important;
        height: 100vh !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 9999 !important;
      }
      
      html.fullscreen video {
        width: 100vw !important;
        height: 100vh !important;
        object-fit: contain !important;
      }
    `;
  }, []);

  // Configure video element
  const configureVideoElement = useCallback(
    (videoElement: HTMLVideoElement) => {
      const extendedVideo = videoElement as ExtendedVideoElement;
      if (extendedVideo._foamConfigured) return;
      extendedVideo._foamConfigured = true;

      // Disable text tracks (captions)
      if (videoElement.textTracks) {
        for (let i = 0; i < videoElement.textTracks.length; i++) {
          videoElement.textTracks[i].mode = "hidden";
        }
      }

      // Set up event listeners
      if (!extendedVideo._foamListenersAdded) {
        extendedVideo._foamListenersAdded = true;

        videoElement.addEventListener("pause", () => {
          setPlayerState((prev) => ({ ...prev, isPaused: true }));
        });

        videoElement.addEventListener("playing", () => {
          setPlayerState((prev) => ({
            ...prev,
            isPaused: false,
            muted: false,
            volume: 1.0,
          }));
          videoElement.muted = false;
          videoElement.volume = 1.0;

          // Hide captions
          if (videoElement.textTracks && videoElement.textTracks.length > 0) {
            videoElement.textTracks[0].mode = "hidden";
          }
        });

        videoElement.addEventListener("ended", () => {
          setPlayerState((prev) => ({ ...prev, isPaused: true }));
        });

        videoElement.addEventListener("waiting", () => {
          setPlayerState((prev) => ({ ...prev, isBuffering: true }));
        });

        videoElement.addEventListener("canplay", () => {
          setPlayerState((prev) => ({ ...prev, isBuffering: false }));
        });

        videoElement.addEventListener("loadedmetadata", () => {
          setPlayerState((prev) => ({
            ...prev,
            duration: videoElement.duration || 0,
            isReady: true,
          }));
        });

        videoElement.addEventListener("timeupdate", () => {
          setPlayerState((prev) => ({
            ...prev,
            currentTime: videoElement.currentTime || 0,
          }));
        });

        videoElement.addEventListener("volumechange", () => {
          setPlayerState((prev) => ({
            ...prev,
            muted: videoElement.muted,
            volume: videoElement.volume,
          }));
        });
      }
    },
    [],
  );

  // Check for stuck playback
  const checkPlaybackStuck = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) {
      stuckCountRef.current = 0;
      lastTimeRef.current = -1;
      return;
    }

    const currentTime = video.currentTime;
    if (
      lastTimeRef.current >= 0 &&
      Math.abs(currentTime - lastTimeRef.current) < 0.1
    ) {
      stuckCountRef.current++;
      if (stuckCountRef.current >= 3) {
        console.log("[Foam Player] Playback stuck, attempting recovery");
        video.pause();
        setTimeout(() => {
          video.play().catch((e) => {
            console.error("[Foam Player] Recovery play failed:", e);
          });
        }, 100);
        stuckCountRef.current = 0;
      }
    } else {
      stuckCountRef.current = 0;
    }
    lastTimeRef.current = currentTime;
  }, []);

  // Check for errors
  const checkForErrors = useCallback(() => {
    const errorSelectors = [
      ".channel-status-info--offline",
      ".offline-recommendations",
      '[data-test-selector="video-player__video-error"]',
      ".video-player__error",
      ".player-error",
    ];

    for (const selector of errorSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        console.log("[Foam Player] Error detected:", selector);
      }
    }

    const bodyText = document.body?.innerText || "";
    if (
      bodyText.includes("is offline") ||
      bodyText.includes("Channel is not live")
    ) {
      console.log("[Foam Player] Stream appears to be offline");
    }
  }, []);

  // Enable low latency mode
  const enableLowLatency = useCallback(() => {
    try {
      // Try Twitch Player API
      const twitchPlayer = (window as any).Twitch?.Player?.INSTANCES;
      if (twitchPlayer && twitchPlayer.length > 0) {
        const player = twitchPlayer[0];
        if (player.setOption) {
          player.setOption("lowlatency", true);
          console.log("[Foam Player] Low latency enabled via Twitch API");
        }
      }

      // Try settings toggle
      const settingsButton = document.querySelector(
        '[data-a-target="player-settings-button"]',
      );
      if (settingsButton) {
        const lowLatencyToggle = document.querySelector(
          '[data-a-target="player-settings-submenu-low-latency-toggle"]',
        );
        if (
          lowLatencyToggle &&
          !(lowLatencyToggle as HTMLInputElement).checked
        ) {
          (lowLatencyToggle as HTMLElement).click();
          console.log("[Foam Player] Low latency enabled via settings");
        }
      }

    } catch (e) {
      console.log("[Foam Player] Could not enable low latency:", e);
    }
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);

      const root = document.documentElement;
      if (isCurrentlyFullscreen) {
        root.classList.add("fullscreen");
      } else {
        root.classList.remove("fullscreen");
      }

      console.log("[Foam Player] Fullscreen changed:", isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange,
      );
    };
  }, []);

  // Handle orientation changes
  useEffect(() => {
    updateOrientation();

    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        updateOrientation();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateOrientation, 100);
    });

    if (screen.orientation) {
      const handleOrientationChange = () => {
        updateOrientation();
      };
      screen.orientation.addEventListener("change", handleOrientationChange);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", updateOrientation);
        screen.orientation.removeEventListener(
          "change",
          handleOrientationChange,
        );
        clearTimeout(resizeTimeout);
      };
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", updateOrientation);
      clearTimeout(resizeTimeout);
    };
  }, [updateOrientation]);

  // Embed Twitch player iframe
  const embedTwitchPlayer = useCallback((channel: string) => {
    // Check if iframe already exists
    const existingIframe = document.querySelector('iframe[data-twitch-player]');
    if (existingIframe) {
      return;
    }

    // Wait for DOM to be ready
    const tryEmbed = () => {
      const playerWrapper = document.querySelector('.player-wrapper');
      if (!playerWrapper) {
        setTimeout(tryEmbed, 100);
        return;
      }

      // Create Twitch embed iframe
      const iframe = document.createElement('iframe');
      iframe.setAttribute('data-twitch-player', 'true');
      // For localhost, use 'localhost' as parent, otherwise use hostname
      const parent = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'localhost' 
        : window.location.hostname;
      iframe.src = `https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=false`;
      iframe.allowFullscreen = true;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      
      playerWrapper.appendChild(iframe);
      console.log('[Foam Player] Twitch player iframe embedded for channel:', channel, 'parent:', parent);
    };

    tryEmbed();
  }, []);

  // Get parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // Support both 'channel' and 'channelName' for backward compatibility
    const channel = urlParams.get("channelName") || urlParams.get("channel");

    if (channel) {
      setChannelName(channel);
      // Embed Twitch player iframe
      embedTwitchPlayer(channel);
    }
  }, [embedTwitchPlayer]);

  // Initialize video element when found
  useEffect(() => {
    const initVideo = () => {
      const videoElement = document.querySelector(
        "video",
      ) as ExtendedVideoElement;
      if (videoElement && !videoElement._foamInitialized) {
        videoElement._foamInitialized = true;
        videoRef.current = videoElement;
        configureVideoElement(videoElement);
        console.log("[Foam Player] Video element initialized");
      }
    };

    // Initial check
    initVideo();

    // Watch for video element
    const observer = new MutationObserver(() => {
      initVideo();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [configureVideoElement]);

  // Monitor DOM for content gates and apply styles
  useEffect(() => {
    applyCustomStyles();
    detectContentGate();

    observerRef.current = new MutationObserver(() => {
      detectContentGate();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-a-target"],
    });

    checkIntervalRef.current = window.setInterval(() => {
      detectContentGate();
      checkForErrors();
      checkPlaybackStuck();
    }, 2000);

    // Enable low latency
    setTimeout(enableLowLatency, 3000);
    const lowLatencyInterval = setInterval(enableLowLatency, 10000);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      clearInterval(lowLatencyInterval);
    };
  }, [
    detectContentGate,
    applyCustomStyles,
    checkForErrors,
    checkPlaybackStuck,
    enableLowLatency,
  ]);

  // Update styles when orientation or content gate changes
  useEffect(() => {
    applyOrientationStyles(orientation);
    if (hasContentGate) {
      applyContentGateStyles();
    } else {
      removeContentGateStyles();
    }
  }, [
    orientation,
    hasContentGate,
    applyOrientationStyles,
    applyContentGateStyles,
    removeContentGateStyles,
  ]);

  // Expose player controls globally
  useEffect(() => {
    (window as any).playerControls = {
      play: () => {
        const v = videoRef.current;
        if (v) {
          v.play().catch(() => {});
          v.muted = false;
          v.volume = 1.0;
        }
      },
      pause: () => {
        const v = videoRef.current;
        if (v) v.pause();
      },
      mute: () => {
        const v = videoRef.current;
        if (v) v.muted = true;
      },
      unmute: () => {
        const v = videoRef.current;
        if (v) {
          v.muted = false;
          v.volume = 1.0;
        }
      },
      setVolume: (vol: number) => {
        const v = videoRef.current;
        if (v) {
          v.volume = vol;
          if (vol > 0) v.muted = false;
        }
      },
      seek: (time: number) => {
        const v = videoRef.current;
        if (v) v.currentTime = time;
      },
      getState: () => playerState,
    };

    return () => {
      delete (window as any).playerControls;
    };
  }, [playerState]);

  return (
    <div
      className={`app-container ${orientation} ${isFullscreen ? "fullscreen" : ""} ${hasContentGate ? "content-gate" : ""}`}
    >
      <div className="player-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
        {!channelName && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            color: '#fff',
            fontSize: '18px'
          }}>
            No channel specified. Add ?channel=CHANNELNAME to the URL.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
