import { useEffect, useRef, useState } from "react";
import axios from "axios";
import socket from "../socket/socket";

const OFFLINE_SOS_KEY = "pendingSOSAlerts";

export default function SOSButton() {
  /* =========================
      STATES
  ========================= */
  const [sosActive, setSOSActive] = useState(false);
  const [loading, setLoading] = useState(false);

  /* =========================
      REFS
  ========================= */
  const watchIdRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Ref tracking to circumvent asynchronous state closure lag
  const currentAlertIdRef = useRef(null);

  // Tracks the unique ID of the current SOS
  const currentSOSClientEventIdRef = useRef(null);

  /* =========================
      SMART HIGH-ACCURACY GPS ENGINE
  ========================= */
  const getAccurateLocation = async (
    maxAttempts = 3,
    delayMs = 1500
  ) => {
    const fetchSnapshot = () => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      });
    };

    let bestPosition = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(
        `📡 GPS Acquisition attempt ${attempt} of ${maxAttempts}...`
      );

      try {
        const position = await fetchSnapshot();
        const accuracy = position.coords.accuracy;

        console.log(
          `🎯 Attempt ${attempt} accuracy: ${Math.round(
            accuracy
          )} meters.`
        );

        if (accuracy && accuracy <= 30) {
          return position;
        }

        if (
          !bestPosition ||
          accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
        }
      } catch (err) {
        console.warn(
          `GPS Attempt ${attempt} failed:`,
          err.message
        );
      }

      if (attempt < maxAttempts) {
        await new Promise((res) =>
          setTimeout(res, delayMs)
        );
      }
    }

    if (bestPosition) return bestPosition;

    throw new Error(
      "Could not acquire location metrics from hardware layer."
    );
  };

  /* =========================
      GENERATE UNIQUE SOS ID
  ========================= */
  const generateEventId = () => {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;
  };

  /* =========================
      SAVE SOS LOCALLY
  ========================= */
  const saveSOSOffline = (sosData) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem(OFFLINE_SOS_KEY) || "[]"
      );

      const alreadyExists = existing.some(
        (item) =>
          item.clientEventId === sosData.clientEventId
      );

      if (alreadyExists) {
        console.log(
          "⚠️ SOS already exists in offline queue."
        );
        return;
      }

      existing.push(sosData);

      localStorage.setItem(
        OFFLINE_SOS_KEY,
        JSON.stringify(existing)
      );

      console.log("💾 SOS saved to offline queue.");
    } catch (error) {
      console.error(
        "Failed to save SOS offline:",
        error
      );
    }
  };

  /* =========================
      SYNC OFFLINE SOS
  ========================= */
  const syncOfflineSOS = async () => {
    try {
      const pending = JSON.parse(
        localStorage.getItem(OFFLINE_SOS_KEY) || "[]"
      );

      if (pending.length === 0) return;

      const token = localStorage.getItem("token");

      if (!token) {
        console.log(
          "❌ No authentication token available."
        );
        return;
      }

      console.log(
        `🌐 Syncing ${pending.length} offline SOS alert(s)...`
      );

      const remaining = [];

      for (const sos of pending) {
        try {
          const res = await axios.post(
            "http://localhost:5000/api/sos/trigger",
            {
              location: sos.location,
              tripId: sos.tripId || null,
              audioUrl: null,
              isOfflineSync: true,
              clientEventId: sos.clientEventId,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log(
            "✅ Offline SOS synchronized:",
            res.data
          );

          // If this is the currently active SOS
          if (
            sos.clientEventId ===
            currentSOSClientEventIdRef.current
          ) {
            currentAlertIdRef.current =
              res.data.alert._id;
          }
        } catch (error) {
          console.log(
            "⏳ SOS sync failed. Keeping it in queue."
          );

          remaining.push(sos);
        }
      }

      localStorage.setItem(
        OFFLINE_SOS_KEY,
        JSON.stringify(remaining)
      );
    } catch (error) {
      console.error(
        "Offline SOS synchronization failed:",
        error
      );
    }
  };

  /* =========================
      INTERNET RETURN HANDLER
  ========================= */
  useEffect(() => {
    const handleOnline = () => {
      console.log(
        "🌐 Internet restored. Syncing SOS..."
      );

      syncOfflineSOS();
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    if (navigator.onLine) {
      syncOfflineSOS();
    }

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, []);

  /* =========================
      START SOS
  ========================= */
  const startSOS = async () => {
    try {
      setLoading(true);

      /* =========================
          MICROPHONE START
      ========================= */
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();

      console.log("🎤 Recording started");

      /* =========================
          GET GPS LOCATION
      ========================= */
      let position;

      try {
        position =
          await getAccurateLocation(3, 1500);
      } catch (err) {
        console.log("GPS ERROR:", err);

        alert(
          "Unable to acquire reliable location. Ensure location features are turned on and step outside."
        );

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((t) => t.stop());
        }

        setLoading(false);
        return;
      }

      const accuracy =
        position.coords.accuracy;

      console.log(
        "✅ Optimal GPS Position resolved:",
        position.coords
      );

      const isLocalhost =
        window.location.hostname ===
          "localhost" ||
        window.location.hostname ===
          "127.0.0.1";

      const accuracyHardCap =
        isLocalhost ? 150000 : 1000;

      const lowAccuracyWarningThreshold =
        isLocalhost ? 150000 : 60;

      if (
        !accuracy ||
        accuracy > accuracyHardCap
      ) {
        alert(
          "❌ Location telemetry too inaccurate. Please move to an open area and try again."
        );

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((t) => t.stop());
        }

        setLoading(false);
        return;
      }

      if (
        accuracy >
        lowAccuracyWarningThreshold
      ) {
        const proceed = window.confirm(
          `⚠️ Low accuracy (${Math.round(
            accuracy
          )}m). Your device is likely using cell-towers instead of GPS satellites. Do you still want to dispatch?`
        );

        if (!proceed) {
          if (streamRef.current) {
            streamRef.current
              .getTracks()
              .forEach((t) => t.stop());
          }

          setLoading(false);
          return;
        }
      }

      const currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      /* =========================
          CREATE UNIQUE SOS ID
      ========================= */
      const clientEventId =
        generateEventId();

      currentSOSClientEventIdRef.current =
        clientEventId;

      const sosData = {
        location: currentLocation,
        tripId: null,
        clientEventId,
        createdAt:
          new Date().toISOString(),
      };

      /* =========================
          TRIGGER SOS API
      ========================= */
      const token =
        localStorage.getItem("token");

      let serverAlertCreated = false;

      try {
        const res = await axios.post(
          "http://localhost:5000/api/sos/trigger",
          {
            ...sosData,
            audioUrl: null,
            isOfflineSync: false,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        window.dispatchEvent(
          new CustomEvent("sos-created")
        );

        currentAlertIdRef.current =
          res.data.alert._id;

        serverAlertCreated = true;

        console.log(
          "🚨 SOS CREATED:",
          res.data
        );
      } catch (error) {
        console.log(
          "🌐 Internet/backend unavailable."
        );

        saveSOSOffline(sosData);

        alert(
          "🚨 SOS saved offline. It will be synchronized when internet connection is restored."
        );
      }

      setSOSActive(true);

      /* =========================
          LIVE TRACKING
      ========================= */
      watchIdRef.current =
        navigator.geolocation.watchPosition(
          (pos) => {
            const location = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };

            // Don't send location until alert exists on server
            if (!currentAlertIdRef.current) {
              console.log(
                "⏳ Waiting for SOS synchronization..."
              );
              return;
            }

            socket.emit("send-location", {
              alertId:
                currentAlertIdRef.current,
              location,
              timestamp: new Date(),
            });

            console.log(
              "📍 Live Streamed Position:",
              location
            );
          },
          (err) => {
            console.log(
              "GPS WATCH ERROR:",
              err
            );
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 20000,
          }
        );

      if (serverAlertCreated) {
        alert("🚨 SOS ACTIVATED");
      }
    } catch (err) {
      console.error(err);

      alert("Failed to start SOS");

      setSOSActive(false);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
      STOP SOS
  ========================= */
  const stopSOS = async () => {
    try {
      setSOSActive(false);

      const activeAlertId =
        currentAlertIdRef.current;

      /* STOP GPS */
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }

      /* STOP RECORDING & UPLOAD */
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current.onstop =
          async () => {
            try {
              const blob = new Blob(
                chunksRef.current,
                {
                  type: "audio/webm",
                }
              );

              const formData =
                new FormData();

              formData.append(
                "audio",
                blob,
                "recording.webm"
              );

              const uploadRes =
                await axios.post(
                  "http://localhost:5000/api/recordings/upload",
                  formData,
                  {
                    headers: {
                      "Content-Type":
                        "multipart/form-data",
                    },
                  }
                );

              const audioUrl =
                uploadRes.data.audioUrl;

              if (activeAlertId) {
                await axios.put(
                  `http://localhost:5000/api/alerts/${activeAlertId}/audio`,
                  { audioUrl }
                );

                console.log(
                  "🎤 Audio successfully bound to active alert record."
                );
              }

              chunksRef.current = [];
            } catch (err) {
              console.log(
                "UPLOAD ERROR:",
                err
              );
            }
          };

        mediaRecorderRef.current.stop();
      }

      /* STOP MIC STREAM */
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((t) => t.stop());
      }

      /* END TRIP */
      if (activeAlertId) {
        socket.emit("end-trip", {
          alertId: activeAlertId,
          endedAt: new Date(),
        });
      }

      currentAlertIdRef.current = null;
      currentSOSClientEventIdRef.current =
        null;

      alert("✅ SOS STOPPED");
    } catch (err) {
      console.log(err);

      alert("Failed to stop SOS");
    }
  };

  /* =========================
      UI
  ========================= */
  return (
    <div>
      {!sosActive ? (
        <button
          onClick={startSOS}
          disabled={loading}
        >
          {loading
            ? "Acquiring Precision GPS..."
            : "🚨 START SOS"}
        </button>
      ) : (
        <button onClick={stopSOS}>
          ✅ STOP SOS
        </button>
      )}
    </div>
  );
}