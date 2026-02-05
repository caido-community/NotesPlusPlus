<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { Caido } from "@caido/sdk-frontend";

const props = defineProps<{
  sdk: Caido;
}>();

const settingValue = ref("");
const transcription = ref("");
const isTranscribing = ref(false);

// Recording State
const isRecording = ref(false);
const audioUrl = ref<string | null>(null);
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let autoStopTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  const data = props.sdk.storage.get() as Record<string, string>;
  if (data?.["tts-plugin-api-key"]) {
    settingValue.value = data["tts-plugin-api-key"];
  }
});

const saveSettings = async (event?: Event) => {
  if (event) event.preventDefault();

  if (!settingValue.value) {
    props.sdk.window.showToast("Key is empty, nothing to save", {
      variant: "error",
    });
    return;
  }

  try {
    await props.sdk.storage.set({ "tts-plugin-api-key": settingValue.value });
    props.sdk.window.showToast("Saved successfully", { variant: "success" });
  } catch (err) {
    console.error("Storage set failed:", err);
  }
};

const transcribeAudio = async (audioBlob: Blob) => {
  if (!settingValue.value) {
    props.sdk.window.showToast("Please save an OpenAI API Key first", {
      variant: "error",
    });
    return;
  }

  isTranscribing.value = true;
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("model", "whisper-1");

  try {
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${settingValue.value}` },
        body: formData,
      },
    );

    const data = await response.json();
    if (data.text) {
      transcription.value = data.text;
    } else if (data.error) {
      throw new Error(data.error.message);
    }
  } catch (err: any) {
    props.sdk.window.showToast(`Transcription failed: ${err.message}`, {
      variant: "error",
    });
  } finally {
    isTranscribing.value = false;
  }
};

const stopRecording = () => {
  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  isRecording.value = false;

  // STOP HARDWARE: Ensure mic icon disappears
  if (mediaRecorder?.stream) {
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  }
};

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        if (audioUrl.value) window.URL.revokeObjectURL(audioUrl.value);
        audioUrl.value = window.URL.createObjectURL(audioBlob);
        transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      isRecording.value = true;
      transcription.value = "";

      autoStopTimeout = setTimeout(() => {
        if (isRecording.value) {
          props.sdk.window.showToast("Recording reached 1 minute limit.", {
            variant: "info",
          });
          stopRecording();
        }
      }, 60000);
    } catch (err) {
      props.sdk.window.showToast("Microphone access denied", {
        variant: "error",
      });
    }
  }
};

onUnmounted(() => {
  if (autoStopTimeout) clearTimeout(autoStopTimeout);
  if (audioUrl.value) window.URL.revokeObjectURL(audioUrl.value);
  if (mediaRecorder?.stream) {
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  }
});
</script>

<template>
  <div class="p-4 flex flex-col gap-8 max-w-3xl">
    <div>
      <h2 class="text-xl font-bold text-gray-100">
        OpenAI Whisper Integration
      </h2>
      <p class="text-sm text-gray-400">
        Configure your API and test the speech-to-text transcription.
      </p>
    </div>

    <section class="bg-gray-800/20 border border-gray-700 rounded-lg p-5">
      <h3
        class="text-md font-semibold mb-4 text-gray-200 uppercase tracking-wider text-xs"
      >
        Configuration
      </h3>
      <div class="flex flex-col gap-4">
        <label class="block">
          <span class="text-sm text-gray-300">OpenAI API Key</span>
          <input
            v-model="settingValue"
            type="password"
            placeholder="sk-..."
            class="w-full p-2 border rounded mt-1 bg-gray-900 border-gray-600 focus:border-blue-500 outline-none text-sm text-gray-100 shadow-inner"
          />
        </label>
        <button
          @click="saveSettings"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all text-sm font-medium w-fit shadow-md"
        >
          Save API Key
        </button>
      </div>
    </section>

    <section class="border-t border-gray-700 pt-6">
      <h3 class="text-lg font-bold text-gray-100 mb-2">
        Test your Integration
      </h3>

      <div class="flex flex-col gap-6">
        <div class="flex items-center gap-4">
          <button
            @click="toggleRecording"
            :disabled="isTranscribing"
            :class="[
              'px-5 py-2.5 rounded-md font-bold transition-all flex items-center gap-3 shadow-lg',
              isRecording
                ? 'bg-red-600 animate-pulse text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-100',
              isTranscribing ? 'opacity-50 cursor-not-allowed' : '',
            ]"
          >
            <div
              v-if="isRecording"
              class="w-2.5 h-2.5 bg-white rounded-full"
            ></div>
            <span v-else class="text-lg">🎙️</span>
            {{ isRecording ? "Stop & Transcribe" : "Record Audio" }}
          </button>

          <span
            v-if="isRecording"
            class="text-red-500 text-sm font-bold animate-pulse"
          >
            LIVE: Recording...
          </span>

          <div v-if="audioUrl && !isRecording" class="flex-1">
            <audio
              :src="audioUrl"
              controls
              class="w-full h-10 filter invert opacity-80"
            ></audio>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase text-gray-500 tracking-widest"
              >Transcription Result</span
            >
            <span
              v-if="isTranscribing"
              class="text-xs text-blue-400 animate-pulse font-medium"
            >
              Whisper is thinking...
            </span>
          </div>

          <div
            class="min-h-[120px] w-full p-4 bg-gray-900/50 border border-gray-700 rounded-lg shadow-inner relative overflow-hidden"
          >
            <div
              v-if="isTranscribing"
              class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div class="flex flex-col items-center gap-2">
                <div class="flex gap-1">
                  <div
                    class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  ></div>
                  <div
                    class="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"
                  ></div>
                  <div
                    class="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"
                  ></div>
                </div>
                <span class="text-xs text-blue-400 font-bold uppercase"
                  >Transcribing</span
                >
              </div>
            </div>

            <p
              v-if="transcription"
              class="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap"
            >
              {{ transcription }}
            </p>
            <p v-else-if="!isTranscribing" class="text-gray-500 text-sm italic">
              Transcription will appear here...
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
