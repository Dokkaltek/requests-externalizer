import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { GlobalSettings } from 'src/app/model/types.model';
import { ApplicationsService } from 'src/app/services/applications.service';
import { SettingsService } from 'src/app/services/settings.service';
import { PopupComponent } from './popup.component';
import { RequesttableComponent } from 'src/app/components/requesttable/requesttable.component';
import { RequestsenderComponent } from 'src/app/components/requestsender/requestsender.component';
import { AppselectorComponent } from 'src/app/components/appselector/appselector.component';
import { FormsModule } from '@angular/forms';
import { CapitalizePipe } from 'src/app/pipes/capitalize.pipe';

const sinonChrome = require('sinon-chrome');
global.chrome = sinonChrome;

describe('PopupComponent', () => {
  let component: PopupComponent;
  let fixture: ComponentFixture<PopupComponent>;
  let appService: ApplicationsService;
  let settingsService: SettingsService;
  let sendToNativeSpy: jasmine.Spy<(message: string) => Promise<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PopupComponent, RequesttableComponent, RequestsenderComponent, AppselectorComponent, CapitalizePipe],
      imports: [FormsModule],
      providers: [ApplicationsService, SettingsService]
    })
    .compileComponents();

    sinonChrome.runtime.openOptionsPage.callCount = 0;
    fixture = TestBed.createComponent(PopupComponent);
    appService = TestBed.inject(ApplicationsService);
    sendToNativeSpy = spyOn(appService, "sendToNativeApp").and.returnValue(Promise.resolve(""));
    settingsService = TestBed.inject(SettingsService);
    spyOn(settingsService, "loadGlobalSettings").and.returnValue(Promise.resolve(new GlobalSettings()));
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.isNativeAppInstalled).toBeTruthy();
    expect(sendToNativeSpy).toHaveBeenCalled();
  });

  it('should open settings page', () => {
    component.openSettingsPage();
    expect(sinonChrome.runtime.openOptionsPage.callCount).toEqual(1);
  });

  it('should toggle the dark theme', () => {
    expect(component.darkMode).toEqual(false);
    spyOn(settingsService, "saveGlobalSettings");
    component.toggleTheme();
    expect(settingsService.saveGlobalSettings).toHaveBeenCalled();
    expect(component.darkMode).toEqual(true);
  });

  it('should change requests selection', () => {
    const selectedRequests = ["http://localhost:8080/sample", "http://localhost:8080/sample2"];
    component.onRequestsSelectionChange(selectedRequests);
    expect(component.requestsSelected).toBe(selectedRequests);
  });

  it('should test the native connection', fakeAsync(() => {
    sendToNativeSpy.and.returnValue(Promise.reject(new Error("test err")));
    component.testNativeAppConnection();
    tick();
    expect(component.isNativeAppInstalled).toBeFalsy();
  }));
});
