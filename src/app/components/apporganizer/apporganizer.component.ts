import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Application, DEFAULT_APP, NEW_APP } from 'src/app/model/application.model';
import { AppChangeEvent, AppEventType } from 'src/app/model/types.model';

@Component({
  selector: 'app-apporganizer',
  templateUrl: './apporganizer.component.html',
  styleUrls: ['./apporganizer.component.sass'],
  // Required for reactive forms
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ApporganizerComponent,
    },
  ],
})
export class ApporganizerComponent implements ControlValueAccessor {
  @Input()
  apps: Application[] = [DEFAULT_APP];
  @Input()
  selectedApps: Application[] = [];
  @Output()
  selection = new EventEmitter<Application[]>();
  @Output()
  appListChange = new EventEmitter<AppChangeEvent>();
  @ViewChild("appList")
  appList: ElementRef = new ElementRef(null);

  touched = false;
  disabled = false;

  onChange = (value: Application[]) => {};
  onTouched = () => {};

  // Selects items
  onAppSelect(event: MouseEvent, selectedApp: Application) {
    this.markAsTouched();

    if (event.ctrlKey) {
      // Deselect the app if holding ctrl and the app was already selected
      if (this.selectedApps.includes(selectedApp)) {
        let elToRemoveIndex = this.selectedApps.indexOf(selectedApp);
        this.selectedApps.splice(elToRemoveIndex, 1);
      // Do multiple selection if holding the ctrl key and item wasn't selected
      } else 
        this.selectedApps.push(selectedApp);
    // Plain select the application by itself if not holding ctrl
    } else
      this.selectedApps = [selectedApp];
    
    this.selection.emit(this.selectedApps);
    this.onChange(this.selectedApps);
  }

  // Checks if an app is selected
  checkAppSelection(app: Application) {
    return this.selectedApps.map(selApp => selApp.id).includes(app.id);
  }

  // Registers a new app
  onAppCreate() {
    // If the app already exists we just select it and nothing else
    let existingNewApps = this.apps.filter(app => app.id === "-1");
    let newApp = NEW_APP;

    if (existingNewApps.length === 0)
      this.apps.push(newApp);
    else
      newApp = existingNewApps[0];

    this.selectedApps = [newApp];
    
    this.onChange(this.selectedApps);

    this.selection.emit(this.selectedApps);

    // Since the list size is updated, we need to scroll the new app into view after a short delay
    setTimeout(() => this.scrollSelectedAppIntoView(), 50);
  }
  
  // Removes a registered app
  onAppRemove() {
    if (this.selectedApps.length == 0)
      return

    // Remove each selected item one by one in case the selection isn't secuential
    this.selectedApps.forEach(app => {
      let appToRemoveIndex = this.apps.indexOf(app);
      this.apps.splice(appToRemoveIndex, 1);
    });

    // Clear selection
    let appsDeleted = [...this.selectedApps];
    this.selectedApps = [];
    this.selection.emit(this.selectedApps);
    this.onChange(this.selectedApps);

    let removeEvent = {
      applications: this.apps,
      eventType: AppEventType.DELETE,
      affectedApps: appsDeleted
    }

    this.appListChange.emit(removeEvent);
  }

  // Reorders apps
  onAppMove(direction: string) {
    if (this.selectedApps.length === 0)
      return

    // Function to swap positions of elements in an array
    const swapPositions = (a: number, b: number) => {
      [this.apps[a], this.apps[b]] = [this.apps[b], this.apps[a]]
    }

    // Sort the selected items first to be in the right order
    this.selectedApps.sort((app, nextApp) => {
      if (this.apps.indexOf(app) < this.apps.indexOf(nextApp))
        return -1
      else return 1
    })
    
    // Moving element up
    if (direction === "up") {
      if (this.selectedApps.includes(this.apps[0])) 
        return;
        
      this.selectedApps.forEach(app => {
        const elementIndex = this.apps.indexOf(app);
        swapPositions(elementIndex, elementIndex - 1);
      })
    
    // Moving element down
    } else {
      const lastApp = this.apps.at(-1);
      if (lastApp != undefined && this.selectedApps.includes(lastApp))
        return;
      
      this.selectedApps.forEach(app => {
        const elementIndex = this.apps.indexOf(app);
        swapPositions(elementIndex, elementIndex + 1);
      })
    }

    let moveEvent = {
      applications: this.apps,
      eventType: AppEventType.MOVE,
      affectedApps: this.selectedApps
    }

    this.appListChange.emit(moveEvent);
    this.scrollSelectedAppIntoView();
  }

  /**
   * Scrolls the selected app into view
   */
  scrollSelectedAppIntoView() {
    const selectedApp = this.appList.nativeElement.getElementsByClassName("selected-item")[0];
    if (selectedApp != undefined) {
      selectedApp.scrollIntoView({ behavior: "smooth" });
    }
  }

  // ------------------------------------------------------------
  // These are required to make it accesible from reactive forms
  // ------------------------------------------------------------

  // Registers changes
  registerOnChange(onChange: any) {
    this.onChange = onChange;
  }

  // Sets the initial selected value
  writeValue(appList: Application[]) {
    if (appList != null)
      this.apps = appList;
  }

  // Marks form control as touched
  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  registerOnTouched(onTouched: any) {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }

  // Resets the selection
  reset() {
    if (this.selectedApps.length > 0) {
      this.selectedApps = [];
      this.selection.emit(this.selectedApps);
      this.onChange(this.selectedApps);
    }
  }
}
