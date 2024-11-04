import { trigger, state, style, transition, animate } from '@angular/animations';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ToastState } from 'src/app/model/types.model';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.sass']
})
export class ToastComponent {
  message = "";
  status = ToastState.INFO;
  hiddenStatus = "hidden";
  pendingTimeouts: Array<NodeJS.Timeout> = [];
  
  constructor(private ref: ChangeDetectorRef) {}

  showToast(toastMessage: string, toastStatus = ToastState.INFO, secondsToHide = 3): void {
    if (this.pendingTimeouts.length >= 1) {
      this.pendingTimeouts.forEach(timeout => clearTimeout(timeout));
    }

    if (this.hiddenStatus === "visible") {
      this.hiddenStatus = "hidden";
      this.ref.detectChanges();
    }

    this.hiddenStatus = "visible";
    this.message = toastMessage;
    this.status = toastStatus;
    this.ref.detectChanges();

    // Hide the toast after a few seconds (3 by default)
    const showTimeout = setTimeout(() => {
      this.pendingTimeouts.pop();
      this.hideToast();
    }, secondsToHide * 1000);
    this.pendingTimeouts.push(showTimeout);
  }

  // Reset message after the animation is finished
  hideToast(): void {
    this.hiddenStatus = "hidden";
    this.ref.detectChanges();

    const hideTimeout = setTimeout(() => {
      this.pendingTimeouts.pop();
      this.message = ""
      this.status = ToastState.INFO;
    }, 300);

    this.pendingTimeouts.push(hideTimeout);
  }
}
