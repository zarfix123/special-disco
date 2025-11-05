/**
 * Simplified attention detector for Chrome extension
 * Coordinates with camera.html page for actual detection
 */

import { AttentionState, AttentionSettings } from "./shared/types";
import { getAttentionSettings } from "./attentionSettings";

// Attention state
let currentAttentionState: AttentionState = "awake";
let lastAttentionUpdate: number = 0;
let attentionMetrics: any = {};

/**
 * Initialize attention detection system
 */
export async function initAttentionDetection() {
  const settings = await getAttentionSettings();

  if (!settings.enabled) {
    console.log("[AttentionDetector] Detection disabled");
    return;
  }

  console.log("[AttentionDetector] Initialized with settings:", settings);

  // Listen for attention updates from camera page
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === "ATTENTION_UPDATE") {
      handleAttentionUpdate(message.payload);
    } else if (message.type === "ATTENTION_SETTINGS_UPDATED") {
      handleSettingsUpdate(message.payload);
    }
  });
}

/**
 * Handle attention state update from camera page
 */
function handleAttentionUpdate(data: any) {
  currentAttentionState = data.state;
  lastAttentionUpdate = Date.now();
  attentionMetrics = data.metrics || {};

  console.log(
    `[AttentionDetector] State: ${currentAttentionState}, EAR: ${attentionMetrics.earValue?.toFixed(3) || "N/A"}`
  );

  // Check if we need to trigger alert based on state
  if (shouldTriggerAlert(currentAttentionState, data.confidence)) {
    triggerDrowsinessAlert(data);
  }
}

/**
 * Handle settings update
 */
async function handleSettingsUpdate(newSettings: AttentionSettings) {
  console.log("[AttentionDetector] Settings updated:", newSettings);

  if (!newSettings.enabled && currentAttentionState !== "awake") {
    // Reset state if detection disabled
    currentAttentionState = "awake";
  }
}

/**
 * Check if we should trigger an alert
 */
function shouldTriggerAlert(state: AttentionState, confidence: number): boolean {
  // Only alert on drowsy or microsleep with high confidence
  if (state === "awake" || state === "distracted") {
    return false;
  }

  // Require at least 70% confidence to avoid false positives
  return confidence >= 0.7;
}

/**
 * Trigger drowsiness alert
 */
async function triggerDrowsinessAlert(data: any) {
  console.log("[AttentionDetector] 🚨 Triggering drowsiness alert:", data);

  // Send message to content script to show puzzle
  // BUT don't close the tab - that's the key difference
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "DROWSINESS_ALERT",
      payload: {
        state: data.state,
        metrics: data.metrics,
        keepTabOpen: true, // Important: don't close tab for drowsiness
      },
    });
  }
}

/**
 * Get current attention state
 */
export function getCurrentAttentionState(): {
  state: AttentionState;
  timestamp: number;
  metrics: any;
} {
  return {
    state: currentAttentionState,
    timestamp: lastAttentionUpdate,
    metrics: attentionMetrics,
  };
}

/**
 * Check if attention detection is active
 * (i.e., has received updates recently)
 */
export function isAttentionDetectionActive(): boolean {
  const TIMEOUT_MS = 10000; // 10 seconds
  return Date.now() - lastAttentionUpdate < TIMEOUT_MS;
}
