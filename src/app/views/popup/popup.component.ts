import { Component, OnInit } from '@angular/core';
import { LOGGING_WARN_COLOR, NATIVE_APP_ERROR } from 'src/app/model/error.constants';
import { GlobalSettings } from 'src/app/model/types.model';
import { ApplicationsService } from 'src/app/services/applications.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-popup',
  templateUrl: './popup.component.html',
  styleUrls: ['./popup.component.sass'],
})
export class PopupComponent implements OnInit {
  requestsSelected: string[] = [];
  settings: GlobalSettings | undefined;
  darkMode = false;
  isNativeAppInstalled = true;

  constructor(private settingsService: SettingsService, private appService: ApplicationsService) {}

  /**
   * Initialize dark theme mode.
   */
  ngOnInit(): void {
    this.settingsService.loadGlobalSettings().then(settings => { 
      this.settings = settings;
      this.darkMode = settings.darkMode;
    });

    // Make sure that the native app is installed and running
    this.testNativeAppConnection();
  }

  /**
   * Opens the settings page for the extension.
   */
  openSettingsPage() {
    chrome.runtime.openOptionsPage(() => close());
  }

  /**
   * Toggles the dark theme.
   */
  toggleTheme() {
    this.darkMode = !this.darkMode;

    // Update the settings
    if (this.settings) {
      this.settings.darkMode = this.darkMode;
      this.settingsService.saveGlobalSettings({...this.settings})
    }
  }

  /**
   * Stores the urls to be sent to the request sender.
   * @param newUrls The urls to store in the component to be sent to the request sender. 
   */
  onRequestsSelectionChange(newUrls: string[]) {
    this.requestsSelected = newUrls;
  }

  /**
   * Tests the native app connection and updates if it's available or not.
   */
  testNativeAppConnection() {
    this.appService.sendToNativeApp("").then(() => this.isNativeAppInstalled = true).catch(err => {
        this.isNativeAppInstalled = false

        // Set the console message with a yellow color instead of console.warn to avoid the extension from showing the "errors" button on extensions page
        console.info(NATIVE_APP_ERROR + err, LOGGING_WARN_COLOR);
    })
  }
}
