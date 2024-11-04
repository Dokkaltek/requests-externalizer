import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { SettingsService } from './services/settings.service';
import { MockGlobalSettings } from './model/mocks.model';

describe('AppComponent', () => {
  let app: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
      providers: [SettingsService]
    }).compileComponents();

    settingsService = TestBed.inject(SettingsService);
    spyOn(settingsService, "loadGlobalSettings").and.returnValue(Promise.resolve(new MockGlobalSettings()));
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should apply dark mode', () => {
    app.darkMode = true;
    app.applyDarkModeChange();
    expect(document.documentElement.id).toEqual("dark-theme");

    app.darkMode = false;
    app.applyDarkModeChange();
    expect(document.documentElement.hasAttribute("id")).toBeFalsy();
  });
});
