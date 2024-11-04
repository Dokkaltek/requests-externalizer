import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastState } from 'src/app/model/types.model';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ToastComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the toast', () => {
    component.showToast("Test message", ToastState.INFO, 0.5);
    expect(component.pendingTimeouts.length).toEqual(1);
    expect(component.hiddenStatus).toEqual("visible");
  });

  it('should hide the toast', () => {
    component.hideToast();
    expect(component.pendingTimeouts.length).toEqual(1);
    expect(component.hiddenStatus).toEqual("hidden");
  });
});
