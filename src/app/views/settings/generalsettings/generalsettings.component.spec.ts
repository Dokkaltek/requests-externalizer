import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ToastComponent } from 'src/app/components/toast/toast.component';
import { GlobalSettings, MediaTypes } from 'src/app/model/types.model';
import { CapitalizePipe } from 'src/app/pipes/capitalize.pipe';
import { ApplicationsService } from 'src/app/services/applications.service';
import { SettingsService } from 'src/app/services/settings.service';
import { GeneralsettingsComponent } from './generalsettings.component';
import { DEFAULT_APP } from 'src/app/model/application.model';

describe('GeneralsettingsComponent', () => {
  let component: GeneralsettingsComponent;
  let fixture: ComponentFixture<GeneralsettingsComponent>;
  let appService: ApplicationsService;
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GeneralsettingsComponent, ToastComponent, CapitalizePipe ],
      providers: [SettingsService, ApplicationsService]
    })
    .compileComponents();
    appService = TestBed.inject(ApplicationsService);
    settingsService = TestBed.inject(SettingsService);
    spyOn(settingsService, "loadGlobalSettings").and.returnValue(Promise.resolve(new GlobalSettings()));
    fixture = TestBed.createComponent(GeneralsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update settings on change', () => {
    document.querySelector("input[type='checkbox']")?.dispatchEvent(new Event('click'));
    expect(component.globalSettings.darkMode).toBeTruthy();

    let selectEl = document.querySelector("select")
    if (selectEl) {
      selectEl.selectedIndex = 1;
    }

    selectEl?.dispatchEvent(new Event('change'));
    expect(component.globalSettings.typeToCount).toEqual(Object.keys(new MediaTypes())[1]);
  });

  it('should trigger import input', () => {
    let elementSpy = spyOn(document, "getElementById");
    component.importAppsTrigger();
    expect(elementSpy).toHaveBeenCalled();
  });

  it('should import apps', (done) => {
    const element = <HTMLInputElement>document.getElementById("appsImportInput");

    if (!element) {
      return;
    }

    // Get the file ready
    element.files = generateFileList(JSON.stringify(DEFAULT_APP));
    const fileReader = new FileReader();

    spyOn(appService, "importApplications").and.stub();
    const fileReaderSpy = spyOn(window, "FileReader").and.returnValue(fileReader);

    // Trigger event that calls import
    element.dispatchEvent(new Event("change"));

    expect(fileReaderSpy).toHaveBeenCalled();

    fileReader.onloadend = () => {
      expect(appService.importApplications).toHaveBeenCalled();
      done();
    }
  });

  it('should not import apps on error', (done) => {
    const element = <HTMLInputElement>document.getElementById("appsImportInput");

    if (!element) {
      return;
    }

    // Get the file ready
    element.files = generateFileList("error test");
    const fileReader = new FileReader();

    spyOn(appService, "importApplications").and.stub();
    const fileReaderSpy = spyOn(window, "FileReader").and.returnValue(fileReader);

    // Trigger event that calls import
    element.dispatchEvent(new Event("change"));

    expect(fileReaderSpy).toHaveBeenCalled();

    fileReader.onloadend = () => {
      expect(appService.importApplications).not.toHaveBeenCalled();
      done();
    }
  });

  it('should export apps', fakeAsync(() => {
    spyOn(appService, "loadApplications").and.returnValue(Promise.resolve([DEFAULT_APP]));
    const appendChildSpy = spyOn(document.body, "appendChild").and.callThrough();
    const removeChildSpy = spyOn(document.body, "removeChild").and.callThrough();
    component.exportApps();
    tick();

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  }));

  /**
   * Generates a file list from a string
   * @param content The content to add to the file added to the file list.
   * @returns A file list to add to a {@link FileReader}.
   */
  function generateFileList(content: string) {
    const myFileContent = [content];
    const file = new File(myFileContent, "test.json", { type: "text/plain" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    return dataTransfer.files;
  }
});
