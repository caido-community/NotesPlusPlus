import { sendTextToNote } from "./actions/actions";
import type { FrontendSDK } from "./types";
import Settings from "./views/Settings.vue";

export const registerVoiceNotes = (sdk: FrontendSDK) => {
  const COMMAND_KEY = "notesplusplus:tts-toggle-recording";
  const MAX_RECORDING_TIME = 60000; // 1 minute

  sdk.settings.addToSlot("plugins-section", {
    type: "Custom",
    name: "TTS",
    definition: { component: Settings, props: { sdk } },
  });

  let isRecording = false;
  let mediaRecorder: any = null;
  let audioChunks: any[] = [];
  let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

  const stopRecordingAction = () => {
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
      autoStopTimer = null;
    }

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    isRecording = false;
  };

  sdk.commands.register(COMMAND_KEY, {
    name: "Toggle Voice Recording",
    run: async () => {
      if (isRecording) {
        stopRecordingAction();
        sdk.window.showToast("Recording stopped. Transcribing...", {
          variant: "info",
        });
        return;
      }

      try {
        const stream = await window.navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          // STOP HARDWARE
          if (mediaRecorder.stream) {
            mediaRecorder.stream
              .getTracks()
              .forEach((track: { stop: () => void }) => track.stop());
          }

          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

          const storage = sdk.storage.get() as Record<string, string>;
          const apiKey = storage?.["tts-plugin-api-key"];

          if (!apiKey) {
            sdk.window.showToast("API Key missing! Check settings.", {
              variant: "error",
            });
            return;
          }

          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          formData.append("model", "whisper-1");

          try {
            const response = await fetch(
              "https://api.openai.com/v1/audio/transcriptions",
              {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}` },
                body: formData,
              },
            );

            const data = await response.json();
            if (data.text) {
              sendTextToNote(sdk, data.text);
            } else {
              throw new Error(data.error?.message || "Unknown error");
            }
          } catch (err: any) {
            console.error("OpenAI Whisper Error:", err);
            sdk.window.showToast(`Transcription failed: ${err.message}`, {
              variant: "error",
            });
          }
        };

        mediaRecorder.start();
        isRecording = true;
        sdk.window.showToast("Recording started...", { variant: "info" });

        // AUTO-STOP AFTER 1 MINUTE
        autoStopTimer = setTimeout(() => {
          if (isRecording) {
            sdk.window.showToast("Time limit reached (1 min).", {
              variant: "info",
            });
            stopRecordingAction();
          }
        }, MAX_RECORDING_TIME);
      } catch (err) {
        console.error("Microphone Access Error:", err);
        sdk.window.showToast("Microphone access denied.", { variant: "error" });
      }
    },
  });

  sdk.commandPalette.register(COMMAND_KEY);
  sdk.shortcuts.register(COMMAND_KEY, ["alt", "shift", "V"]);
};
