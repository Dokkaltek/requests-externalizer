import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { DEFAULT_APP, NEW_APP } from '../model/application.model';
import { MockTab, SAMPLE_URL } from '../model/mocks.model';
import { APPLICATIONS } from '../model/storage.constants';
import { ApplicationsService } from './applications.service';
import { DateTime } from 'luxon';

const sinonChrome = require('sinon-chrome');
global.chrome = sinonChrome;

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApplicationsService);
    
    sinonChrome.storage.local.set.callCount = 0;
    sinonChrome.storage.local.get.callCount = 0;
    sinonChrome.contextMenus.update.callCount = 0;
    sinonChrome.contextMenus.create.callCount = 0;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load applications', fakeAsync(() => {
    const storageApps = [DEFAULT_APP];
    let appsPromise = Promise.resolve({ [APPLICATIONS]: storageApps });
    sinonChrome.storage.local.get.withArgs(APPLICATIONS).returns(appsPromise);
    let apps = service.loadApplications();
    apps.then(resultApps => {
      expect(resultApps).toEqual(storageApps);
      expect(service.apps).toEqual(storageApps)

      // It should skip the chrome load at this point
      apps = service.loadApplications();
      apps.then(resultApps => {
        expect(resultApps).toEqual(storageApps);
        expect(sinonChrome.storage.local.get.callCount).toEqual(1);
      });
    })
  }));

  it('should save applications', () => {
    const storeApps = [DEFAULT_APP];
    sinonChrome.storage.local.set.returns(Promise.resolve());
    service.saveApplications(storeApps);
    expect(sinonChrome.storage.local.set.callCount).toEqual(1);
  });

  it('should import applications', () => {
    const storeApps = [DEFAULT_APP];
    service.importApplications(storeApps);
    expect(service.apps).toEqual(storeApps);
    expect(sinonChrome.storage.local.set.callCount).toEqual(1);
  });

  it('should find applications by id', () => {
    let storeApps = [{...DEFAULT_APP, id: "1"}];
    service.apps = storeApps;

    let app = service.findApplicationById("1");

    expect(app).not.toBeNull();
    expect(app?.position).toEqual(0);

    app = service.findApplicationById("2");

    expect(app).toBeNull();
  });

  it('should add new applications', fakeAsync(() => {
    sinonChrome.storage.local.set.returns(Promise.resolve());
    service.addNewApplication(NEW_APP);
    tick();

    expect(sinonChrome.storage.local.set.callCount).toEqual(1);
    expect(sinonChrome.contextMenus.update.callCount).toEqual(1);
    expect(sinonChrome.contextMenus.create.callCount).toEqual(1);
  }));

  it('should update registered applications', fakeAsync(() => {
    sinonChrome.storage.local.set.returns(Promise.resolve());
    const appToUpdate = {...NEW_APP, id: "5"};
    const newAppName = "New test name";
    service.apps = [appToUpdate];
    service.updateApplication({...appToUpdate, name: newAppName});
    tick();

    expect(sinonChrome.storage.local.set.callCount).toEqual(1);
    expect(sinonChrome.contextMenus.update.callCount).toEqual(2);
    expect(service.apps[0].name).toEqual(newAppName);
  }));

  it('should check for application duplicates', () => {
    service.apps = [DEFAULT_APP];

    // Check name duplication
    let result = service.checkAppDuplicates(DEFAULT_APP.name);
    expect(result).not.toBeNull();
    expect(result?.duplicated.name).toBeTruthy();
    expect(result?.duplicated.id).toBeUndefined();

    // Check id duplication
    result = service.checkAppDuplicates("Test", DEFAULT_APP.id);
    expect(result).not.toBeNull();
    expect(result?.duplicated.id).toBeTruthy();
    expect(result?.duplicated.name).toBeUndefined();
  });

  it('should replace the command variables', () => {
    let result = service.replaceCommandVariables(SAMPLE_URL, "#{runOnCmd} #{url}");
    let titleElement = document?.querySelector('title');
    
    if (titleElement != null) {
      titleElement.innerHTML = "Fancy title";
    }
    
    expect(result).toEqual("cmd.exe /c start cmd.exe /c https://this.is.a.test.com/test.html#test?param=1");
    
    result = service.replaceCommandVariables(SAMPLE_URL, "test.exe #{origin} -t #{title}-#{date}");
    
    const currentDate = DateTime.local().setLocale("en-US").toFormat("yyyy-MM-dd");
    expect(result).toEqual(`test.exe https://this.is.a.test.com -t ${titleElement?.innerHTML ?? "undefined"}-${currentDate}`);

    result = service.replaceCommandVariables("http://localhost:4200/test.html?param=1#test", 
      "test.exe #{protocol}//#{domain}:#{port}#{path}#{fragment}#{query}");
    expect(result).toEqual(`test.exe http://localhost:4200/test.html#test?param=1`);
  });

  it('should replace function variables', () => {
    let result = service.replaceFunctionVariables("test.exe #{replace:sometext>>some>>my} #{remove:there was something>> something} #{date:yyyy}");
    expect(result).toEqual(`test.exe mytext there was ${new Date().getFullYear()}`);
  });

  it('should get the current tab', fakeAsync(() => {
    const mockTab = new MockTab();
    sinonChrome.tabs.query.returns(Promise.resolve([mockTab]))

    let result = service.getCurrentTab();
    expect(sinonChrome.tabs.query.callCount).toBe(1);
    result.then(res => expect(res).toEqual(mockTab.url));
    sinonChrome.tabs.query.callCount = 0;
  }));

  it('should be able to remove context menu entries', () => {
    service.removeAppContextMenuEntry(DEFAULT_APP);
    expect(sinonChrome.contextMenus.remove.callCount).toEqual(1);

    // Reset the call count to avoid issues on other tests
    sinonChrome.contextMenus.remove.callCount = 0;
  });

  it('should execute the command and send it to the native app', () => {
    service.executeCommand(SAMPLE_URL, "test.exe #{url}");

    expect(sinonChrome.runtime.sendNativeMessage.callCount).toEqual(1);

    // Reset the call count to avoid issues on other tests
    sinonChrome.runtime.sendNativeMessage.callCount = 0;
  });
});
