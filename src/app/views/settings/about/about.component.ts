import { Component } from '@angular/core';
import { EXTENSION_VERSION } from 'src/app/model/storage.constants';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.sass'],
})
export class AboutComponent {
  globalVersion: string = EXTENSION_VERSION;
}
