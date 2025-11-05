/**
 * Attention detection settings management
 */

import { AttentionSettings } from "./shared/types";

const DEFAULT_SETTINGS: AttentionSettings = {
  enabled: true,
  detectors: {
    drowsiness: true,
    microsleep: true,
    yawning: false, // Disabled by default - can be noisy
    gazeDirection: false, // Disabled by default - requires calibration
    headPose: false, // Disabled by default
    blinkRate: false, // Disabled by default
  },
  thresholds: {
    earThreshold: 0.22, // Standard EAR threshold
    drowsySeconds: 1.5, // Alert after 1.5 seconds of closed eyes
    microsleepSeconds: 3.0, // Microsleep after 3 seconds
  },
};

const SETTINGS_KEY = "attentionSettings";

/**
 * Get attention detection settings from storage
 */
export async function getAttentionSettings(): Promise<AttentionSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    if (result[SETTINGS_KEY]) {
      // Merge with defaults in case new settings were added
      return {
        ...DEFAULT_SETTINGS,
        ...result[SETTINGS_KEY],
        detectors: {
          ...DEFAULT_SETTINGS.detectors,
          ...(result[SETTINGS_KEY].detectors || {}),
        },
        thresholds: {
          ...DEFAULT_SETTINGS.thresholds,
          ...(result[SETTINGS_KEY].thresholds || {}),
        },
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("[AttentionSettings] Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save attention detection settings to storage
 */
export async function saveAttentionSettings(
  settings: AttentionSettings
): Promise<void> {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    console.log("[AttentionSettings] Settings saved:", settings);
  } catch (error) {
    console.error("[AttentionSettings] Failed to save settings:", error);
    throw error;
  }
}

/**
 * Reset attention detection settings to defaults
 */
export async function resetAttentionSettings(): Promise<AttentionSettings> {
  await saveAttentionSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

/**
 * Check if a specific detector is enabled
 */
export async function isDetectorEnabled(
  detector: keyof AttentionSettings["detectors"]
): Promise<boolean> {
  const settings = await getAttentionSettings();
  return settings.enabled && settings.detectors[detector];
}
