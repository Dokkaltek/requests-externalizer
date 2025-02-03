import { Component } from '@angular/core';
import { ApplicationsService } from 'src/app/services/applications.service';

@Component({
  selector: 'app-howto',
  templateUrl: './howto.component.html',
  styleUrls: ['./howto.component.sass']
})
export class HowtoComponent {
  constructor(private readonly appService: ApplicationsService) {}

  /**
   * Gets the date with the given format.
   * @param format The format to get the current date as.
   * @returns The current date in the given format.
   */
  getDate(format: string) {
    return this.appService.getFormattedCurrentDate(format);
  }
}
