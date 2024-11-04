import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppselectorComponent } from './appselector.component';
import { DEFAULT_APP } from 'src/app/model/application.model';
import { SAMPLE_APPLICATION } from 'src/app/model/mocks.model';

describe('AppselectorComponent', () => {
  let component: AppselectorComponent;
  let fixture: ComponentFixture<AppselectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppselectorComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppselectorComponent);
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

  it('should set the selected app correctly', () => {
    component.apps = [DEFAULT_APP, SAMPLE_APPLICATION];
    component.writeValue(SAMPLE_APPLICATION);
    expect(component.selectedApp).toEqual(SAMPLE_APPLICATION);
  });

  it('should handle app selection correctly', () => {
    component.apps = [DEFAULT_APP, SAMPLE_APPLICATION];
    spyOn(component, 'markAsTouched');
    spyOn(component, 'onChange');
    spyOn(component.selection, 'emit');
    component.onAppSelect(SAMPLE_APPLICATION);
    expect(component.markAsTouched).toHaveBeenCalled();
    expect(component.selectedApp).toEqual(SAMPLE_APPLICATION);
    expect(component.onChange).toHaveBeenCalledWith(SAMPLE_APPLICATION);
    expect(component.selection.emit).toHaveBeenCalledWith(SAMPLE_APPLICATION);
  });
  
  it('should show the select box popup', () => {
    component.onShowApplications(new MouseEvent('click'));
    expect(component.openState).toBe(true);
  });
});