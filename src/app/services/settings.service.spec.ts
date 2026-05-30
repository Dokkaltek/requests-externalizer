import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { SettingsService } from './settings.service';
import { GlobalSettings } from '../model/types.model';
import { MockMediaQueryList } from '../model/mocks.model';

const sinonChrome = require('sinon-chrome');

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    global.chrome = sinonChrome;
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    sinonChrome.reset();
  })

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load the global settings', fakeAsync(() => {
    let defSettings = new GlobalSettings();
    sinonChrome.storage.local.get.returns(Promise.resolve({ settings: defSettings }));
    sinonChrome.storage.local.set.returns(Promise.resolve());
    global.chrome = sinonChrome;
    spyOn(window, "matchMedia").and.returnValue(new MockMediaQueryList());

    service.loadGlobalSettings()?.then(result => {
      expect(result.countType).toBeFalsy();
      expect(result.typeToCount).toEqual(defSettings.typeToCount);
      expect(result.storeRequests).toBeFalsy();
      expect(result.ignoredDomains.length).toEqual(0);
      expect(result.ignoredDomainsRawText).toEqual("");
      expect(sinonChrome.storage.local.get.callCount).toEqual(1);
      expect(sinonChrome.storage.local.set.callCount).toEqual(1);
    });
  }));
});
