import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastComponent } from 'src/app/components/toast/toast.component';
import { LOGGING_WARN_COLOR, NATIVE_APP_ERROR } from 'src/app/model/error.constants';
import { EXTENSION_VERSION } from 'src/app/model/storage.constants';
import { ToastState } from 'src/app/model/types.model';
import { ApplicationsService } from 'src/app/services/applications.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.sass'],
})
export class SettingsComponent implements OnInit {
  globalVersion: string = EXTENSION_VERSION;
  isNativeAppFound: boolean = true;
  @ViewChild(ToastComponent) toast!: ToastComponent;

  constructor(private appService: ApplicationsService) {
  }

  ngOnInit() {
    this.testNativeAppConnection(true, false);
  }

  /**
   * Tests the native app connection and updates if it's available or not.
   * @param shouldTest If the native app connection should be tested.
   */
  testNativeAppConnection(shouldTest: boolean, showToast: boolean = true) {
    if (shouldTest) {
      this.appService.sendToNativeApp("").catch(error => {
        this.isNativeAppFound = false

        // Set the console message with a yellow color instead of console.warn to avoid the extension from showing the "errors" button on extensions page
        console.info(NATIVE_APP_ERROR + error, LOGGING_WARN_COLOR);

        // Show error toast
        if (showToast) {
          this.toast.showToast("Native app wasn't found", ToastState.ERROR, 2);
        }
      });
    }
  }
}
