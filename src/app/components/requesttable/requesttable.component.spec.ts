import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockChromeResource, MockTab, SAMPLE_URL } from 'src/app/model/mocks.model';
import { MediaTypes } from 'src/app/model/types.model';
import { CapitalizePipe } from 'src/app/pipes/capitalize.pipe';
import { RequesttableComponent } from './requesttable.component';

window.global = window;
const sinonChrome = require('sinon-chrome');
global.chrome = sinonChrome;

describe('RequesttableComponent', () => {
  let component: RequesttableComponent;
  let fixture: ComponentFixture<RequesttableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequesttableComponent, CapitalizePipe],
      imports: [FormsModule],
      providers: [ChangeDetectorRef]
    })
    .compileComponents();


    fixture = TestBed.createComponent(RequesttableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get values from the store and set a listener for changes', fakeAsync(() => {
    let mockRequest = {
      pageRequests: {
        tabs: {
          1: {
            "https://this.is.a.test.com": [new MockChromeResource()]
          }
        }
      }
    }
  
    // Mock chrome apis
    sinonChrome.tabs.query.returns(Promise.resolve([new MockTab()]));
    sinonChrome.storage.local.get.returns(Promise.resolve(mockRequest));

    component.ngOnInit();
    tick();

    expect(sinonChrome.tabs.query.called).toBeTruthy();
    expect(sinonChrome.storage.onChanged.addListener.calledOnce).toBeTruthy();
  }));

  it('should parse the request paths', () => {
    let path = component.getRequestPath(SAMPLE_URL)

    expect(path).toEqual("/test.html#test?param=1");
  });

  it('should parse the request origin', () => {
    let path = component.getRequestOrigin(SAMPLE_URL)

    expect(path).toEqual("https://this.is.a.test.com");
  });

  it('should parse the request type', () => {
    let type = "xmlhttprequest";

    expect(component.getRequestType(SAMPLE_URL, type)).toEqual("xmlhttprequest / html");
    expect(component.getRequestType(SAMPLE_URL, type, true)).toEqual("request / html");
    expect(component.getRequestType("https://test.com/test", type, true)).toEqual("request");
  });

  it('should get the media types', () => {
    let mediaTypes = new MediaTypes();

    expect(component.getMediaTypes()).toEqual(Object.keys(mediaTypes));
  });

  it('should get the filtered requests', () => {
    // Check default return for no items
    expect(component.getFilteredRequests()).toEqual([]);

    // Check default return for 1 item and matching filter
    component.requests = [new MockChromeResource()];
    component.activeFilters = ['image'];

    expect(component.getFilteredRequests()).toEqual([new MockChromeResource()]);

    // Check return for 1 item but no matching filter 
    component.activeFilters = ['document'];
    expect(component.getFilteredRequests()).toEqual([]);

    component.activeFilters = ['video'];
    expect(component.getFilteredRequests()).toEqual([]);

    component.activeFilters = ['audio'];
    expect(component.getFilteredRequests()).toEqual([]);

    component.activeFilters = ['script'];
    expect(component.getFilteredRequests()).toEqual([]);

    component.activeFilters = ['misc'];
    expect(component.getFilteredRequests()).toEqual([]);
  });

  it('should set and emit selected items', () => {
    spyOn(component.requestsSelection, "emit");
    let resource = new MockChromeResource();
    component.setSelectedItems(resource);

    expect(component.selectedItems).toEqual([resource]);
    expect(component.requestsSelection.emit).toHaveBeenCalledWith([resource.url]);
  });

  it('should update active filters when pressing the checkboxes', () => {
    let checkbox = document.createElement('input');
    checkbox.onclick = (event: MouseEvent) => component.onUpdateFilter(event);
    checkbox.value = "image";

    // Check that the filter is added when we tick the checkbox
    checkbox.checked = true;
    checkbox.click();
    expect(component.activeFilters).toEqual(["image"]);

    // Check that the filter is removed when we tick the checkbox
    checkbox.checked = false;
    checkbox.click();
    expect(component.activeFilters).toEqual([]);

    checkbox.remove();
  });

  it('should update results on search change', () => {
    spyOn(component, "updateResults");
    spyOn(component, "setSelectedItems");

    component.onSearchRequest();

    expect(component.updateResults).toHaveBeenCalled();
    expect(component.setSelectedItems).toHaveBeenCalled();
  })

  it('should select an item from the table on item select', () => {
    let resource = new MockChromeResource();
    let event = new MouseEvent('click');

    component.fullRequestList.push(resource);
    component.onSelectItem(resource, event);
    expect(component.selectedItems).toEqual([resource]);

    // Add another item
    resource = new MockChromeResource();
    resource.url = "https://localhost:8080/test";
    component.fullRequestList.push(resource);
    event = new MouseEvent('click', { ctrlKey: true });

    component.onSelectItem(resource, event);
    expect(component.selectedItems).toHaveSize(2);

    // Remove item
    component.onSelectItem(resource, event);
    expect(component.selectedItems).toHaveSize(1);

    // Shift selection
    event = new MouseEvent('click', { shiftKey: true });
    component.onSelectItem(resource, event);
    expect(component.selectedItems).toHaveSize(2);

    // Add 1 item with no selection with shift
    component.selectedItems = [];
    component.onSelectItem(resource, event);
    expect(component.selectedItems).toEqual([resource]);
  });

  it('should show the context menu on right click', () => {
    let tableCell = document.createElement('td');
    tableCell.onclick = (event: MouseEvent) => component.onShowContextMenu(event, new MockChromeResource());
    tableCell.click();

    expect(component.copyContextMenu.nativeElement.style.transform).toEqual("translate(0px, 0px)");
    component.copyContextMenu.nativeElement.style.transform = "initial";

    let divEl = document.createElement('div');
    divEl.onclick = (event: MouseEvent) => component.onShowContextMenu(event, new MockChromeResource());
    divEl.click();

    expect(component.copyContextMenu.nativeElement.style.transform).toBe("initial");
  });

  it('should copy the right url when selecting the context menu actions on copy url', () => {
    spyOn(navigator.clipboard, "writeText");
    const resource = new MockChromeResource();

    // Check clicked item action
    component.onCopyUrls(0)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");

    // Check selected items action
    component.selectedItems = [resource];
    component.onCopyUrls(1)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(resource.url);

    // Check all items action
    component.fullRequestList = [resource, new MockChromeResource()];
    component.onCopyUrls(2)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(resource.url + ", " + resource.url);
  });

  it('should correctly return if an item is selected', () => {
    const resource = new MockChromeResource();
    expect(component.isItemSelected(resource)).toBeFalsy();

    // Change selected item
    component.selectedItems = [resource]
    expect(component.isItemSelected(resource)).toBeTruthy();
  });

  it('should update results on input change', () => {
    spyOn(component, "updateTableView");
    const resource = new MockChromeResource();
    let altRes = new MockChromeResource();
    altRes.url = "http://localhost:8080/sample";
    component.fullRequestList = [resource, altRes];

    component.updateResults();

    expect(component.requests).toEqual(component.fullRequestList)

    // Change search query to not return anything
    component.searchQuery = "banana";
    component.updateResults();
    expect(component.requests).toEqual([]);

    // Change search query to return the actual value
    component.searchQuery = resource.url;
    component.updateResults();
    expect(component.requests).toEqual([resource]);
  });

  it('should register the context close event', () => {
    spyOn(document, "addEventListener");
    component.registerContextCloseEvent();

    expect(document.addEventListener).toHaveBeenCalled();
  });

  it('should update the table view', () => {
    spyOn(component, "getFilteredRequests");

    // Since we can't spy on ChangeDetectorRef directly, we have to spy on the prototype
    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef); 
    const detectChangesSpy = spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    component.updateTableView();

    expect(component.getFilteredRequests).toHaveBeenCalled();
    expect(detectChangesSpy).toHaveBeenCalled();
  })
});
