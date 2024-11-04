import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_APP, NEW_APP } from 'src/app/model/application.model';
import { SAMPLE_APPLICATION } from 'src/app/model/mocks.model';
import { ApporganizerComponent } from './apporganizer.component';

describe('ApporganizerComponent', () => {
  let component: ApporganizerComponent;
  let fixture: ComponentFixture<ApporganizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApporganizerComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApporganizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set disabled state correctly', () => {
    const disabledState = true;
    component.setDisabledState(disabledState);
    expect(component.disabled).toBe(disabledState);
  });

  it('should mark as touched when touched is false', () => {
    component.touched = false;
    spyOn(component, 'onTouched');
    component.markAsTouched();
    expect(component.onTouched).toHaveBeenCalled();
    expect(component.touched).toBe(true);
  });

  it('should set the initial apps correctly', () => {
    component.apps = [DEFAULT_APP, SAMPLE_APPLICATION];
    component.writeValue([SAMPLE_APPLICATION]);
    expect(component.apps).toHaveSize(1);
  });

  it('should emit selection event when app is selected', () => {
    spyOn(component.selection, 'emit');
    component.onAppSelect(new MouseEvent('click'), SAMPLE_APPLICATION);
    expect(component.selection.emit).toHaveBeenCalledWith([SAMPLE_APPLICATION]);
  });

  it('should append selected app when selecting with ctrl held down', () => {
    component.selectedApps = [DEFAULT_APP];
    spyOn(component.selection, 'emit');
    component.onAppSelect(new MouseEvent('click', {ctrlKey: true}), SAMPLE_APPLICATION);
    expect(component.selectedApps).toContain(SAMPLE_APPLICATION);
    expect(component.selectedApps).toContain(DEFAULT_APP)
    expect(component.selection.emit).toHaveBeenCalledWith([DEFAULT_APP, SAMPLE_APPLICATION]);
  });

  it('should de-select clicked app if already selected when holding ctrl', () => {
    component.selectedApps = [DEFAULT_APP, SAMPLE_APPLICATION];
    spyOn(component.selection, 'emit');
    component.onAppSelect(new MouseEvent('click', {ctrlKey: true}), SAMPLE_APPLICATION);
    expect(component.selectedApps).not.toContain(SAMPLE_APPLICATION);
    expect(component.selectedApps).toContain(DEFAULT_APP)
    expect(component.selection.emit).toHaveBeenCalledWith([DEFAULT_APP]);
  });

  it('should emit appListChange event when a new app is created', () => {
    spyOn(component.selection, 'emit');
    component.apps = [SAMPLE_APPLICATION]
    component.onAppCreate();
    const newApps = [NEW_APP];
    expect(component.selectedApps).toContain(NEW_APP)
    expect(component.apps).toContain(NEW_APP)
    expect(component.apps).toContain(SAMPLE_APPLICATION)
    expect(component.selection.emit).toHaveBeenCalledWith(newApps);
  });

  it('should emit appListChange event and select the already created app if clicking create again', () => {
    const newApps = [NEW_APP];
    spyOn(component.selection, 'emit');
    component.apps = newApps;
    component.onAppCreate();
    expect(component.selectedApps).toContain(NEW_APP)
    expect(component.apps).toEqual(newApps)
    expect(component.selection.emit).toHaveBeenCalledWith([NEW_APP]);
  });

  it('should remove app from list when onAppRemove is called', () => {
    component.selectedApps = [SAMPLE_APPLICATION];
    component.apps = [SAMPLE_APPLICATION];
    spyOn(component.appListChange, 'emit');
    component.onAppRemove();
    expect(component.selectedApps).toHaveSize(0);
    expect(component.apps).toHaveSize(0);
    expect(component.appListChange.emit).toHaveBeenCalled();
  });
});