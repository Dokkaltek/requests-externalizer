import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Application, DEFAULT_APP } from 'src/app/model/application.model';

@Component({
  selector: 'app-appselector',
  templateUrl: './appselector.component.html',
  styleUrls: ['./appselector.component.sass'],
  // Required for reactive forms
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: AppselectorComponent,
    },
  ],
})
export class AppselectorComponent implements ControlValueAccessor {
  @Input()
  apps: Application[] = [DEFAULT_APP];
  @Output()
  selection = new EventEmitter<Application>();
  @Input()
  selectedApp = DEFAULT_APP;
  openState = false;
  touched = false;
  disabled = false;

  onChange = (value: Application) => {};
  onTouched = () => {};

  // Selects one item
  onAppSelect(app: Application) {
    this.markAsTouched()
    this.selectedApp = app;
    this.onChange(this.selectedApp);
    this.selection.emit(app);
  }

  // Opens the popup
  onShowApplications(event: MouseEvent) {
    event.stopPropagation();
    
    this.openState = !this.openState;

    // Close the popup once the user clicks anywhere just once
    // We use this instead of {once: true} for better browser compatibility
    let handler = () => {
      this.openState = false; 
      document.removeEventListener("click", handler);
    };

    document.addEventListener("click", handler)
  }

  // ------------------------------------------------------------
  // These are required to make it accesible from reactive forms
  // ------------------------------------------------------------

  registerOnChange(onChange: any) {
    this.onChange = onChange;
  }

  // Sets the initial selected value
  writeValue(newSelection: Application) {
    if (newSelection != null)
      this.selectedApp = newSelection;
  }

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
}
