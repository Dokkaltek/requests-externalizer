import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ReactiveFormsModule } from '@angular/forms';
import { ApporganizerComponent } from 'src/app/components/apporganizer/apporganizer.component';
import { ToastComponent } from 'src/app/components/toast/toast.component';
import { DEFAULT_APP } from 'src/app/model/application.model';
import { ApplicationsService } from 'src/app/services/applications.service';
import { AppsettingsComponent } from './appsettings.component';
import { AppEventType } from 'src/app/model/types.model';

describe('AppsettingsComponent', () => {
  let component: AppsettingsComponent;
  let fixture: ComponentFixture<AppsettingsComponent>;
  let appService: ApplicationsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppsettingsComponent, ApporganizerComponent, ToastComponent],
      imports: [ReactiveFormsModule],
      providers: [ApplicationsService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppsettingsComponent);
    appService = TestBed.inject(ApplicationsService);
    spyOn(appService, 'loadApplications').and.returnValue(Promise.resolve([DEFAULT_APP]));
    component = fixture.componentInstance;
    component.resetForm();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should should load icons to the storage', () => {
    let element = document.createElement('input');
    element.setAttribute('type', 'file');
    component.iconData = "beforeTest";

    // Get the file ready
    const myFileContent = ["test"];
    const file = new File(myFileContent, "test.png", {type: 'image/png'});
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const fileList = dataTransfer.files;
    element.files = fileList;
    

    // Custom file reader
    let fileReader = new FileReader();

    let fileReaderSpy = spyOn(window, "FileReader").and.returnValue(fileReader);

    // Trigger event
    element.onclick = (event) => component.onIconUpload(event);
    element.click();
    
    expect(fileReaderSpy).toHaveBeenCalled();

    let progressEvent = new ProgressEvent("load");
    fileReader.dispatchEvent(progressEvent);

    expect(component.iconData).toEqual("");
  });

  it('should select applications', () => {
    component.onSelectedAppChange([]);

    expect(component.selectedApps).toEqual([]);
    expect(component.formData.disabled).toBeTruthy();

    component.onSelectedAppChange([DEFAULT_APP]);

    expect(component.selectedApps).toEqual([DEFAULT_APP]);
    expect(component.formData.disabled).toBeFalsy();
    expect(component.formData.controls['name'].getRawValue()).toEqual(DEFAULT_APP.name);
    expect(component.formData.controls['description'].getRawValue()).toEqual(DEFAULT_APP.description);
    expect(component.formData.controls['command'].getRawValue()).toEqual(DEFAULT_APP.command);
    expect(component.formData.untouched).toBeTruthy();
  });

  it('should update the applications list on app storage change', fakeAsync(() => {
    let apps = [DEFAULT_APP, {...DEFAULT_APP, id: "1", name: "test"}];
    spyOn(appService, "saveApplications").and.returnValue(Promise.resolve([DEFAULT_APP, {...DEFAULT_APP, id: "1", name: "test"}]));
    spyOn(appService, "updateParentContextMenuVisibility").and.stub();
    // Test delete path
    component.onAppListChange({applications: [apps[1]], eventType: AppEventType.DELETE, affectedApps: [DEFAULT_APP]});
    tick();

    expect(appService.saveApplications).toHaveBeenCalled();
    expect(appService.updateParentContextMenuVisibility).toHaveBeenCalled();

    // Test move path
    let appByIdSpy = spyOn(appService, "findApplicationById");
    appByIdSpy.withArgs(apps[0].id).and.returnValue({app: apps[0], position: 0});
    appByIdSpy.withArgs(apps[1].id).and.returnValue({app: apps[1], position: 1});
    spyOn(appService, "removeAppContextMenuEntry").and.stub();
    spyOn(appService, "modifyAppContextMenuEntry").and.stub();
    component.onAppListChange({applications: apps, eventType: AppEventType.MOVE, affectedApps: apps});
    tick();

    expect(appService.findApplicationById).toHaveBeenCalled();
    expect(appService.removeAppContextMenuEntry).toHaveBeenCalled();
    expect(appService.modifyAppContextMenuEntry).toHaveBeenCalled();
  }));

  it('should validate the app name', () => {
    const nameControl = component.formData.controls['name'];
    const duplicateSpy = spyOn(appService, "checkAppDuplicates");
    duplicateSpy.and.returnValue(null)

    // Validate valid name
    component.formData.controls['name'].setValue("test");
    component.formData.controls['name'].markAsTouched();
    let validator = component.isAppNameValid();
    let result = validator.call(this, nameControl);
    expect(appService.checkAppDuplicates).toHaveBeenCalled();
    expect(result).toEqual(null);

    // Validate duplicate name
    duplicateSpy.and.returnValue({duplicated: {name: true}});
    result = validator.call(this, nameControl);
    expect(result).toEqual({duplicateName: true});
    
    // Validate a name longer than 100 chars
    component.formData.controls['name'].setValue("test".repeat(26));
    result = validator.call(this, nameControl);
    expect(result).toEqual({contentTooLong: true});
  });

  it('should submit the form', () => {
    component.registeredApps = [];
    component.selectedApps = [{...DEFAULT_APP, id: "-1"}];
    fillInComponentData();
    spyOn(appService, "addNewApplication").and.returnValue([DEFAULT_APP]);

    // Validate new app creation
    component.onAppSubmit();
    expect(component.formData.status).not.toEqual("INVALID");
    expect(appService.addNewApplication).toHaveBeenCalled();
    expect(component.registeredApps.length).toEqual(1);

    // Validate updating an app
    let newApp = component.registeredApps[0];
    component.selectedApps = [newApp];
    fillInComponentData();
    let updateSpy = spyOn(appService, "updateApplication");
    updateSpy.and.returnValue([newApp])

    component.onAppSubmit();
    expect(appService.updateApplication).toHaveBeenCalled();
    expect(component.registeredApps).toEqual([newApp]);

    // Validate error while adding an app
    component.selectedApps = [newApp];
    fillInComponentData();
    component.formData.controls['command'].setValue("newValue");
    updateSpy.and.returnValue(new Error());

    component.onAppSubmit();
    expect(component.registeredApps[0].command).toEqual("#{show_app_creation}");
  });

  it('should not submit the form when invalid or no app is selected', () => {
    component.registeredApps = [];
    component.selectedApps = [];

    // Validate no app selected
    spyOn(appService, "addNewApplication");
    component.onAppSubmit();
    expect(appService.addNewApplication).not.toHaveBeenCalled();

    // Validate invalid form
    component.selectedApps = [{...DEFAULT_APP, id: "-1"}];

    const nameControl = component.formData.controls['name'];
    nameControl.setValue("test".repeat(30));
    nameControl.enable();

    component.onAppSubmit();
    expect(appService.addNewApplication).not.toHaveBeenCalled();
    expect(nameControl.status).toBe("INVALID");

  });

  it('should reset variables', () => {
    component.iconData = "TEST";
    component.selectedApps = [DEFAULT_APP];

    component.resetVariables();

    expect(component.iconData).toEqual("");
    expect(component.selectedApps).toEqual([]);
  })

  function fillInComponentData() {
    component.formData.controls['name'].setValue("test");
    component.formData.controls['description'].setValue("test");
    component.formData.controls['command'].setValue("test");
    component.formData.controls['showInPage'].setValue(true);
    component.formData.controls['showInImages'].setValue(true);
    component.formData.controls['showInLinks'].setValue(true);
    component.formData.controls['showInVideos'].setValue(true);
    component.formData.controls['showInAudios'].setValue(true);
  }
});
