import { Injectable } from '@angular/core';
import { GlobalSettings } from '../model/types.model';
import { SETTINGS } from '../model/storage.constants';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // Load global settings to use on most pages
  loadGlobalSettings(): Promise<GlobalSettings> {
    let settings = new GlobalSettings();

    return chrome.storage.local.get(SETTINGS).then(result => {
      if (result[SETTINGS]) 
        settings = result[SETTINGS];

      // Check for dark mode activation if it was disabled, checking for prefers-color-scheme
      if (!settings.darkMode) {
        settings.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Update setting if it was changed
        if (settings.darkMode) {
          this.saveGlobalSettings({...settings});
        }
      }

      return settings;
    });
  }

  // Store settings in local storage
  saveGlobalSettings(globalSettings: GlobalSettings) {
    chrome.storage.local.set({ settings: globalSettings })
    .then(() => chrome.runtime.sendMessage({ data: "changedSettings" }));
  }
}
