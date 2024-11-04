import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SettingsService } from './services/settings.service';
import { SETTINGS } from './model/storage.constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
})
export class AppComponent implements OnInit {
  darkMode = false;

  constructor(private settingsService: SettingsService, private ref: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Load dark mode initially if set
    this.settingsService.loadGlobalSettings().then(settings => {
      this.darkMode = settings.darkMode;
      this.applyDarkModeChange();
    });

    // Change the dark mode class when the store changes
    chrome.storage.onChanged.addListener(changes => {
      for (let [key, { newValue }] of Object.entries(changes)) {
        if (key === SETTINGS) {
          if (newValue) {
            this.darkMode = newValue.darkMode;
            this.applyDarkModeChange();

            // Force detect changes
            this.ref.detectChanges();
          }
        }
      }
    });
  }

  /**
   * Toggles dark mode at body level.
   */
  applyDarkModeChange() {
    if (this.darkMode) {
      document.documentElement.id = "dark-theme";
    } else {
      document.documentElement.removeAttribute("id");
    }
  }
}
