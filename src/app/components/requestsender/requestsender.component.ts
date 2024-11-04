import { Component, Input, OnInit } from '@angular/core';
import { Application, DEFAULT_APP } from 'src/app/model/application.model';
import { ApplicationsService } from 'src/app/services/applications.service';

@Component({
  selector: 'app-requestsender',
  templateUrl: './requestsender.component.html',
  styleUrls: ['./requestsender.component.sass'],
})
export class RequestsenderComponent implements OnInit {
  @Input() urlsToSend: string[] = [];
  selectorApps: Application[] = [];
  selectedApp: Application = DEFAULT_APP;

  constructor(private appService: ApplicationsService) {
  }

  ngOnInit() {
    this.appService.loadApplications().then(apps => {
      this.selectorApps = apps;
      if (apps.length > 0)
        this.selectedApp = apps[0];
    });
  }

  /**
   * Event that triggers when sending a command from the popup
   */
  onRequestSend() {
    // Open the app creation page if the default application was there
    if (this.selectedApp.command.trim() === "#{show_app_creation}") {
      chrome.tabs.create({'url': "/index.html#/apps"});
      window.close();
      return;
    }

    // If there are urls selected we send those, otherwise we send the active tab url
    if (this.urlsToSend.length > 0) {
      this.urlsToSend.forEach(url => this.sendRequest(url));
    } else {
      this.appService.getCurrentTab().then(activeUrl => {
        if (activeUrl)
          this.sendRequest(activeUrl);
      });
    } 
  }

  /**
   * Updates the selection on selection change.
   * @param app The info of the app selected.
   */
  onSelectionChange(app: Application) {
    this.selectedApp = app;
  }

  /**
   * Sends the request to the specified command.
   * @param urlToSend The url to parse and then send with the command.
   */
  sendRequest(urlToSend: string): void {
    this.appService.executeCommand(urlToSend, this.selectedApp.command);
  }
  
}
