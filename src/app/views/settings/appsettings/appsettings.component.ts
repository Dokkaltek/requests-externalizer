import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ToastComponent } from 'src/app/components/toast/toast.component';
import { Application, DEFAULT_APP } from 'src/app/model/application.model';
import { AppChangeEvent, AppEventType, ToastState } from 'src/app/model/types.model';
import { ApplicationsService } from 'src/app/services/applications.service';

@Component({
  selector: 'app-appsettings',
  templateUrl: './appsettings.component.html',
  styleUrls: ['./appsettings.component.sass'],
})
export class AppsettingsComponent implements OnInit {
  formData: FormGroup;
  iconData = '';
  selectedApps: Application[];
  registeredApps: Application[] = [];
  @ViewChild(ToastComponent) toast!: ToastComponent;

  constructor(private appService: ApplicationsService) {
    // Load form defaults and validations
    this.formData = new FormGroup({
      applications: new FormControl(this.registeredApps), // This contains all the applications, not just the selected ones
      name: new FormControl('', [Validators.required, this.isAppNameValid()]),
      description: new FormControl(''),
      icon: new FormControl(''),
      command: new FormControl('', Validators.required),
      showInPage: new FormControl(false),
      showInLinks: new FormControl(false),
      showInImages: new FormControl(false),
      showInVideos: new FormControl(false),
      showInAudios: new FormControl(false)
    });
    this.formData.disable();
    this.appService = appService;
    this.selectedApps = [];
  }

  ngOnInit(): void {
    this.appService.loadApplications().then(apps => {
      this.registeredApps = apps;
    });

    this.selectedApps = [];
  }

  /**
   * Event thrown when the user tries to upload an icon.
   * @param event The file dialog event.
   */
  onIconUpload(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList) {
      const reader = new FileReader();
      reader.readAsDataURL(fileList[0]);

      reader.onload = (e) => {
        this.iconData = e.target?.result?.toString() ?? "";
      }
    }
  }

  /**
   * Event triggered when the application selection changes.
   * @param selectedApps The new selection of applications.
   */
  onSelectedAppChange(selectedApps: Application[]) {
    this.selectedApps = selectedApps;
    if (selectedApps.length != 1) {
      this.resetForm();
      this.formData.disable();
      return
    }

    if (this.formData.disabled)
      this.formData.enable();

    // Set the values stored in the form
    this.formData.markAsUntouched();
    this.formData.controls['name'].setValue(selectedApps[0].name);
    this.formData.controls['description'].setValue(selectedApps[0].description);
    this.formData.controls['command'].setValue(selectedApps[0].command);
    this.iconData = selectedApps[0].icon; // This is the icon value that will be saved and shown
    this.formData.controls['icon'].reset(); // This is the file input, we just clear it since it's not needed unless uploading.
    this.formData.controls['showInPage'].setValue(selectedApps[0].contextMenu.showInPage);
    this.formData.controls['showInLinks'].setValue(selectedApps[0].contextMenu.showInLinks);
    this.formData.controls['showInImages'].setValue(selectedApps[0].contextMenu.showInImages);
    this.formData.controls['showInVideos'].setValue(selectedApps[0].contextMenu.showInVideos);
    this.formData.controls['showInAudios'].setValue(selectedApps[0].contextMenu.showInAudios);
  }

  /**
   * Event triggered when the application list changes due to a deletion or changing the position of an application.
   * @param appChangeEvent The event data.
   */
  onAppListChange(appChangeEvent: AppChangeEvent) {
    this.appService.saveApplications(appChangeEvent.applications).then(apps => {
      if (appChangeEvent.eventType === AppEventType.DELETE) {
        this.appService.updateParentContextMenuVisibility(apps, () => {
          appChangeEvent.affectedApps.forEach(appToRemove => this.appService.removeAppContextMenuEntry(appToRemove));
        });
      } else if (appChangeEvent.eventType === AppEventType.MOVE) {
        let movedIndexArr: number[] = [];

        // Get the position of the upmost moved item to remove and re-add all lower ones
        for (const app of appChangeEvent.affectedApps) {
          movedIndexArr.push(this.appService.findApplicationById(app.id)?.position ?? 0);
        };

        movedIndexArr.sort((a, b) => a - b);

        // Apply the new order
        for (let i = movedIndexArr[0]; i < apps.length; i++) {
          this.appService.removeAppContextMenuEntry(apps[i]);
          this.appService.modifyAppContextMenuEntry(apps[i], false);
        }
      }
    });
  }

  /**
   * Validator that checks if the name of the application is valid and doesn't exist already.
   * @returns The {@link ValidatorFn} that will validate the input.
   */
  isAppNameValid(): ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null => {
      const value = control.value;

      if (!value || !control.touched)
        return null;

      if (value.length > 100)
        return {contentTooLong: true};

      return this.appService.checkAppDuplicates(control.value) ? {duplicateName: true} : null;
    }
  }

  /**
   * Checks if no apps are selected. Mostly to be used on the template.
   * @returns If there are applications selected or not.
   */
  areNoAppsSelected() {
    return this.selectedApps.length === 0;
  }

  /**
   * Event triggered when an application is submitted to be saved.
   */
  onAppSubmit() {
    if (this.areNoAppsSelected())
      return;

    this.formData.markAllAsTouched();
    if (this.formData.status == "INVALID") 
      return;
    
    let newApp: Application = {
      id: this.selectedApps[0].id,
      name: this.formData.value.name,
      description: this.formData.value.description,
      icon: this.iconData ? this.iconData : './assets/img/add-img.png',
      command: this.formData.value.command,
      contextMenu: {
        showInPage: this.formData.value.showInPage,
        showInImages: this.formData.value.showInImages,
        showInLinks: this.formData.value.showInLinks,
        showInVideos: this.formData.value.showInVideos,
        showInAudios: this.formData.value.showInAudios
      },
      shortcut: null,
    }

    let resultApps: Application[] | Error = [];
    if (newApp.id === "-1")
      resultApps = this.appService.addNewApplication(newApp);
    else
      resultApps = this.appService.updateApplication(newApp);

    if (resultApps instanceof Error) {
      const errorMessage = "❌ There was an error while saving the new app. ";
      
      // Show a toast and log 
      this.toast.showToast(errorMessage, ToastState.ERROR, 5);
      console.info(errorMessage, resultApps);
      return;
    
      // Update the id of the new element if it didn't error out  
    } else if (newApp.id === "-1")
      this.selectedApps[0].id = resultApps.at(-1)?.id ?? "-1";
    
    this.registeredApps = resultApps;
    this.toast.showToast(`App ${this.formData.value.name} saved correctly`, ToastState.INFO);
    this.formData.controls["applications"].setValue(this.registeredApps);
    this.resetForm();
  }

  /**
   *  Resets the variables of the form.
   * 
   */
  resetVariables() {
    this.iconData = "";
    this.selectedApps = [];
  }

  /**
   * Resets the form.
   */
  resetForm() {
    this.iconData = "";
    this.formData.reset();
  }
}
