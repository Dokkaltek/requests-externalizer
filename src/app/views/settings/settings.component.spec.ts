import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ToastComponent } from 'src/app/components/toast/toast.component';
import { ToastState } from 'src/app/model/types.model';
import { ApplicationsService } from 'src/app/services/applications.service';
import { SettingsComponent } from './settings.component';

import { RouterTestingModule } from '@angular/router/testing';
import { MockChangeDetectorRef } from 'src/app/model/mocks.model';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let appService: ApplicationsService;
  let promiseResolve: boolean;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SettingsComponent, ToastComponent],
      imports: [RouterTestingModule],
      providers: [ApplicationsService],
    }).compileComponents();

    promiseResolve = true;
    fixture = TestBed.createComponent(SettingsComponent);
    appService = TestBed.inject(ApplicationsService);
    spyOn(appService, 'sendToNativeApp').and.callFake(() => {
      if (promiseResolve)
        return Promise.resolve();
      return Promise.reject(new Error("test err"))}
    );
    component = fixture.componentInstance;
    component.toast = new ToastComponent(new MockChangeDetectorRef())
    fixture.detectChanges();
  });

  it('should create', fakeAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('should test native app connection and update if it is available', () => {
    component.testNativeAppConnection(true, false);
    expect(appService.sendToNativeApp).toHaveBeenCalled();
    expect(component.isNativeAppFound).toBe(true);
  });

  it('should test native app connection and show error toast if it is not available', fakeAsync(() => {
    spyOn(component.toast, "showToast").and.stub();
    promiseResolve = false;
    component.testNativeAppConnection(true, true);
    tick()

    expect(appService.sendToNativeApp).toHaveBeenCalled();
    expect(component.toast.showToast).toHaveBeenCalledWith('Native app wasn\'t found', ToastState.ERROR, 2);
  }));
});
