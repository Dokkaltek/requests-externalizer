import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DEFAULT_APP } from 'src/app/model/application.model';
import { SAMPLE_APPLICATION } from 'src/app/model/mocks.model';
import { ApplicationsService } from 'src/app/services/applications.service';
import { AppselectorComponent } from '../appselector/appselector.component';
import { RequestsenderComponent } from './requestsender.component';

window.global = window;
const chrome = require('sinon-chrome');
global.chrome = chrome;

describe('RequestsenderComponent', () => {
  let component: RequestsenderComponent;
  let fixture: ComponentFixture<RequestsenderComponent>;
  let appService: ApplicationsService;
  const testUrl = "https://testing.com";

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestsenderComponent, AppselectorComponent],
      providers: [ApplicationsService]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestsenderComponent);
    appService = TestBed.inject(ApplicationsService);
    spyOn(appService, "loadApplications").and.returnValue(Promise.resolve([{...SAMPLE_APPLICATION}]));
    spyOn(appService, "executeCommand");
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.selectedApp).toEqual(SAMPLE_APPLICATION);
    expect(component.selectorApps).toEqual([SAMPLE_APPLICATION]);
  });

  it('should send the current open page if no url was sent', fakeAsync(() => {
    spyOn(appService, "getCurrentTab").and.returnValue(Promise.resolve(testUrl));
    component.onRequestSend();
    tick();
    
    expect(appService.getCurrentTab).toHaveBeenCalled();
    expect(appService.executeCommand).toHaveBeenCalledWith(testUrl, SAMPLE_APPLICATION.command);
  }));

  it('should send the passed urls if it had any to the executeCommand', () => {
    component.urlsToSend.push(testUrl);
    component.onRequestSend();
    expect(appService.executeCommand).toHaveBeenCalledWith(testUrl, SAMPLE_APPLICATION.command);
  });

  it('should open the app creation page on new app selection', () => {
    spyOn(window, "close");
    component.selectedApp.command = "#{show_app_creation}";
    component.onRequestSend();
    expect(window.close).toHaveBeenCalled();
    expect(chrome.tabs.create.withArgs({'url': "/index.html#/apps"})).toBeTruthy();
  });

  it('should update the selected app on selection change', () => {
    component.selectedApp = DEFAULT_APP;
    component.onSelectionChange(SAMPLE_APPLICATION);
    expect(component.selectedApp).toEqual(SAMPLE_APPLICATION);
  });
});
