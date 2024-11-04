import { fakeAsync, TestBed } from '@angular/core/testing';

import { SettingsService } from './settings.service';
import { GlobalSettings } from '../model/types.model';
import { MockMediaQueryList } from '../model/mocks.model';

const sinonChrome = require('sinon-chrome');
global.chrome = sinonChrome;

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load the global settings', fakeAsync(() => {
    let defSettings = new GlobalSettings();
    sinonChrome.storage.local.get.returns(Promise.resolve({ settings: defSettings }));
    spyOn(window, "matchMedia").and.returnValue(new MockMediaQueryList());

    service.loadGlobalSettings().then(result => {
      expect(result.countType).toBeFalsy();
      expect(result.typeToCount).toEqual(defSettings.typeToCount);
      expect(sinonChrome.storage.local.get.callCount).toEqual(1);
      expect(sinonChrome.storage.local.set.callCount).toEqual(1);
    });
  }));
});
