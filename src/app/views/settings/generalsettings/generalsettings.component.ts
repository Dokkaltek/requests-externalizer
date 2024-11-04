import { Component, ViewChild } from '@angular/core';
import { EXTENSION_VERSION } from 'src/app/model/storage.constants';
import { GlobalSettings, MediaTypes, ToastState } from 'src/app/model/types.model';
import { SettingsService } from '../../../services/settings.service';
import { ApplicationsService } from 'src/app/services/applications.service';
import { Application } from 'src/app/model/application.model';
import { ToastComponent } from 'src/app/components/toast/toast.component';

@Component({
  selector: 'app-generalsettings',
  templateUrl: './generalsettings.component.html',
  styleUrls: ['./generalsettings.component.sass'],
})
export class GeneralsettingsComponent {
  globalVersion: string = EXTENSION_VERSION;
  requestTypes: Array<string> = Object.keys(new MediaTypes());
  globalSettings: GlobalSettings = new GlobalSettings();
  settingsLoaded = false;
  @ViewChild(ToastComponent) toast!: ToastComponent;

  constructor(private settingsService: SettingsService, private appsService: ApplicationsService) {
    // Load settings
    this.settingsService.loadGlobalSettings().then(settings => {
      this.globalSettings = settings;
      this.settingsLoaded = true;
    });
  }

  /**
   * Updates the settings object depending on the selected item
   * @param settingToUpdate The setting to update.
   * @param event The value of the input linked to the setting to update from the form. 
   */ 
  onSettingUpdate(settingToUpdate: string, event?: Event) {
    let eventTarget = <HTMLInputElement>event?.target;

    // If checkbox, negate the value the setting had
    if (eventTarget.tagName === 'INPUT' && eventTarget.type === 'checkbox') {
      (this.globalSettings[settingToUpdate as keyof GlobalSettings] as boolean) =
        !this.globalSettings[settingToUpdate as keyof GlobalSettings];
      // If select, update the string value
    } else if (eventTarget.tagName === 'SELECT') {
      (this.globalSettings[settingToUpdate as keyof GlobalSettings] as string) =
        eventTarget.value;
    }

    this.settingsService.saveGlobalSettings(this.globalSettings);
  }

  /**
   * Trigger the app import process.
   */
  importAppsTrigger() {
    document.getElementById("appsImportInput")?.click();
  }

  /**
   * An event triggered when a file is selected to import apps from.
   * @param event The file list with the json of the imported apps.
   */
  onImportApps(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const files = inputElement.files;
    if(files?.length) {
      const importFile = files.item(0);
      const reader = new FileReader();
      if (importFile) {
        reader.readAsText(importFile);
      }

      reader.addEventListener("load", () => {
        const jsonContent = reader.result + ""; // Force string type
        if (jsonContent) {
          try {
            let apps: Application[] = JSON.parse(jsonContent);
            this.appsService.importApplications(apps);
            this.toast.showToast(`Apps imported correctly`, ToastState.INFO);
          } catch (err) {
            this.toast.showToast(`Error while importing the apps.`, ToastState.ERROR);
            console.info("❌ An error happened when importing the apps: ", err);
          }
        }
      }, false);
    }
    
  }

  /**
   * Exports the apps currently saved to a json file.
   */
  exportApps() {
    this.appsService.loadApplications().then(apps => {
      let element = document.createElement('a');
      let dateString = new Date().toISOString()

      element.setAttribute('href', 'data:text/plain;charset=utf8,' + encodeURIComponent(JSON.stringify(apps)));
      element.setAttribute('download', `request-externalizer-apps-${dateString}.json`);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    });
  }
}
