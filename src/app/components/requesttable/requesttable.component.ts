import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MediaTypes } from 'src/app/model/types.model';
import { PAGE_REQUESTS } from '../../model/storage.constants';
import { LOGGING_WARN_COLOR } from 'src/app/model/error.constants';

@Component({
  selector: 'app-requesttable',
  templateUrl: './requesttable.component.html',
  styleUrls: ['./requesttable.component.sass'],
})
export class RequesttableComponent implements OnInit {
  // Event that triggers when element selection changes
  @Output() requestsSelection: EventEmitter<string[]> = new EventEmitter();
  @ViewChild("copyContext") copyContextMenu: ElementRef = new ElementRef(null);
  // List of all unfiltered requests for the tab
  fullRequestList: chrome.webRequest.ResourceRequest[] = [];
  // List of tag-filtered requests
  requests: chrome.webRequest.ResourceRequest[] = [];
  // List of the last filtered requests through input and tags
  filteredRequests: chrome.webRequest.ResourceRequest[] = [];
  // Selected requests to send to an app
  selectedItems: chrome.webRequest.ResourceRequest[] = [];
  // Helper mediatype object to get available types to filter for
  mediaTypes: MediaTypes = new MediaTypes();
  // Active tags to filter for
  activeFilters: string[] = [];
  // The current tab domain
  currentDomain: string = '';
  // The search query returned from the input box
  searchQuery: string = '';
  // The request clicked to be copied
  requestToCopy: string = '';

  constructor(private changeDetection: ChangeDetectorRef) {}

  ngOnInit() {
    this.getCurrentTab().then((tab: chrome.tabs.Tab) => {
      if (tab.id !== undefined && tab.url !== undefined) {
        let domain = new URL(tab.url);
        let tabId = tab.id || 0;
        this.currentDomain = domain.origin;

        // Set initial popup values from the store
        chrome.storage.local.get(PAGE_REQUESTS).then((result) => {
          if (result?.[PAGE_REQUESTS]?.tabs?.[tabId]) {
            this.fullRequestList =
              result[PAGE_REQUESTS].tabs[tabId][this.currentDomain] ?? [];
            
            this.requests = [...this.fullRequestList];

            // Force table re-draw
            this.updateTableView();
          }
        });

        // Set listener for changes on the store
        chrome.storage.onChanged.addListener((changes) => {
          for (let [key, { newValue }] of Object.entries(changes)) {
            if (key == PAGE_REQUESTS) {
              const domainTabs = newValue.tabs?.[tabId]?.[this.currentDomain];
              if (domainTabs && JSON.stringify(this.fullRequestList) !== JSON.stringify(domainTabs)) {
                // Update the list with all unfiltered requests for the tab
                this.fullRequestList = newValue.tabs[tabId][this.currentDomain];

                // Force table re-draw
                this.updateResults();
              }
            }
          }
        });
      } else {
        console.info("%c⚠️ URL origin couldn't be found for the current tab.", LOGGING_WARN_COLOR);
      }
    });

    // Hide the context menu when clicking anywhere on the table
    window.onclick = () => this.copyContextMenu.nativeElement.close();
  }

  /**
   * Gets the current tab.
   * @returns A reference to the current tab.
   */
  async getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }

  /**
   * Gets path of request
   * @param request The request to parse the path of.
   * @returns The path of a request.
   */
  getRequestPath(request: string) {
    return request.replace(new URL(request).origin, '');
  }

  /**
   * Gets origin of request
   * @param request The request to parse the origin of.
   * @returns The origin {@link URL}.
   */
  getRequestOrigin(request: string) {
    return new URL(request).origin;
  }

  /**
   * Gets request type, and appends extension if present
   * @param request The request to parse the type of.
   * @param type The type to parse.
   * @returns The parsed type of the request.
   */
  getRequestType(request: string, type: string, shorten: boolean = false) {
    if (shorten) {
      type = type.replace("xmlhttprequest", "request");
    }

    let reqArray = request.split('/');
    let reqLastPath = reqArray[reqArray.length - 1]
      .split('#')[0]
      .split('?')[0]
      .split('=')[0];
    if (reqLastPath.indexOf('.') !== -1)
      return (
        type + ' / ' + reqLastPath.split('.')[reqLastPath.split('.').length - 1]
      );
    else return type;
  }

  /**
   * Returns media types from the MediaTypes object
   * @returns The media type
   */
  getMediaTypes() {
    return Object.keys(this.mediaTypes);
  }

  /**
   * Returns the filtered requests after checking them against the activeFilters array
   * @returns The filtered requests compared to what the filters are.
   */
  getFilteredRequests() {
    let filteredRequests = this.requests.filter((request) => {
      if (this.activeFilters.length === 0) return true;

      let type: string = request.type;
      if (type === 'media' || type === 'xmlhttprequest')
        type = this.getRequestType(request.url, type);

      for (const filter of this.activeFilters) {
        // Check the type of element to filter the ticked ones
        let isOnNonMiscType =
          this.mediaTypes[filter as keyof MediaTypes]?.includes(type);
        let containsOddMediaExt =
          type.includes('mpd') || type.includes('m3u8') || type.includes('mp3');
        let isMiscType = filter === 'misc';
        let containsMediaTypes =
          type.startsWith('media') || type.startsWith('xmlhttprequest');
        let isMediaType = type === 'media' || type === 'xmlhttprequest';

        if (
          isOnNonMiscType ||
          (isMiscType &&
            ((containsMediaTypes && !containsOddMediaExt) || isMediaType))
        )
          return true;
      }
      return false;
    });
    return filteredRequests;
  }

  /**
   * Sets the selected items and emits them to the event.
   * @param newSelectedItems The item(s) to select.
   */
  setSelectedItems(
    newSelectedItems:
      | chrome.webRequest.ResourceRequest[]
      | chrome.webRequest.ResourceRequest
  ) {
    if (!Array.isArray(newSelectedItems)) newSelectedItems = [newSelectedItems];
    this.selectedItems = [...new Set(newSelectedItems)];
    this.changeDetection.detectChanges();
    this.requestsSelection.emit(this.selectedItems.map(item => item.url));
  }

  // --- EVENTS --- //

  /**
   * Updates the filters with the pressed checkboxes.
   * @param event The checkbox click event.
   */
  onUpdateFilter(event: MouseEvent) {
    let checkboxEl = <HTMLInputElement>event.target;
    if (!checkboxEl.checked && this.activeFilters.includes(checkboxEl.value)) {
      while (this.activeFilters.includes(checkboxEl.value)) {
        this.activeFilters.splice(
          this.activeFilters.indexOf(checkboxEl.value),
          1
        );
      }
    } else if (checkboxEl.checked) {
      this.activeFilters.push(checkboxEl.value);
    }

    // Reset selected items
    this.setSelectedItems([]);

    // Update table view
    this.updateResults();
  }

  /**
   * Triggered when the input box value changes. 
   * Updates the results and resets the selected items.
   */
  onSearchRequest() {
    this.updateResults();

    // Reset selected items
    this.setSelectedItems([]);
  }

  /**
   * Selects an item from the table.
   * @param request The request to select.
   * @param event The clicking event.
   */
  onSelectItem(request: chrome.webRequest.ResourceRequest, event: MouseEvent) {
    let isItemSelected = this.selectedItems.includes(request);

    // Check if control is pressed for multi-selection
    if (event.ctrlKey) {
      if (isItemSelected)
        this.selectedItems.splice(this.selectedItems.indexOf(request), 1);
      else
        this.selectedItems.push(request);

    // Check if shift is pressed for multi-selection  
    } else if (event.shiftKey) {
      if (this.selectedItems.length === 0)
        this.selectedItems.push(request);
      else {
        // Sort items to then find the first and last items
        let sortedItems = [...this.selectedItems].sort((prev, next) => prev.timeStamp - next.timeStamp);
        const firstSelIndex = this.fullRequestList.findIndex(item => item.url === sortedItems[0].url);
        const selectedItemIndex = this.fullRequestList.findIndex(item => item.url === request.url);
        
        sortedItems = [];
        const maxIndex = Math.max(firstSelIndex, selectedItemIndex);
        const minIndex = Math.min(firstSelIndex, selectedItemIndex);

        // Perform shift selection
        for(let i = minIndex; i <= maxIndex; i++) {
          sortedItems.push(this.fullRequestList[i]);
        }

        // Update selection
        this.selectedItems = sortedItems;
      }

    // If nothing extra is pressed, we just change the request
    } else
      this.selectedItems = isItemSelected && this.selectedItems.length == 1 ? [] : [request]

    // Make sure no item is duplicated
    this.setSelectedItems(this.selectedItems);
  }

  /**
   * Replaces the default context menu with a new context menu to copy elements
   * @param Event The mouse event that was triggered.
   */
  onShowContextMenu(event: MouseEvent, request: chrome.webRequest.ResourceRequest) {
    const clickTarget = <HTMLInputElement> event.target;

    event.preventDefault();

    const nodeTag = clickTarget.tagName;
    if (nodeTag === "TR" || nodeTag === "TD") {
      const popupRect = this.copyContextMenu.nativeElement.getBoundingClientRect();
      const pageWidth = document.documentElement.clientWidth;
      const pageVisibleHeight = document.documentElement.clientHeight;
      let popupX = event.clientX;
      let popupY = event.clientY;

      // Make the dialog appear on the left side of the mouse instead of the right if it's overflowing
      if (popupX + popupRect.width > pageWidth) {
        popupX = popupX - popupRect.width;
      }

      // Make the dialog appear above the mouse in case it's overflowing from the bottom (which shouldn't happen often)
      if (popupY + popupRect.height > pageVisibleHeight) {
        popupY = popupY - popupRect.height;
      }

      this.copyContextMenu.nativeElement.style.transform = `translate(${popupX}px, ${popupY}px)`;
      this.requestToCopy = request.url;
      
      this.copyContextMenu.nativeElement.show();

      // Make sure the element is closed if they try to open the native context menu
      this.registerContextCloseEvent();
    }

    // Forces hiding the context menu
    return false;
  }

  /**
   * Copies urls to the clipboard.
   * @param action The action number to perform.
   * - 0 -> Copies the clicked url.
   * - 1 -> Copies the selected urls.
   * - 2 -> Copies all urls in the table.
   */
  onCopyUrls(action: number) {
    let urlToCopy = "";
    switch(action) {
      case 0:
        urlToCopy = this.requestToCopy;
        break;
      case 1:
        urlToCopy = this.selectedItems.map(item => item.url).join(", ");
        break;
      case 2:
        urlToCopy = this.fullRequestList.map(item => item.url).join(", ");
        break;
      default:
        break;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(urlToCopy);
  }

  // --- HELPER FUNCTIONS --- //

  /**
   * Checks if an element is already selected.
   * @param item The item to check for selection.
   * @returns Returns if the item is selected.
   */
  isItemSelected(item: chrome.webRequest.ResourceRequest) {
    for (let req of this.selectedItems) {
      if (item.url === req.url) return true;
    }
    return false;
  }

  /**
   * Updates the requests object to only contain the requests that match the text of the input box
   */
  updateResults() {
    let searchValue = this.searchQuery;

    if (
      !searchValue ||
      this.fullRequestList.length === 0
    ) {
      this.requests = this.fullRequestList;
    } else {
      this.requests = this.fullRequestList.filter((request) => {
        let regexReturn = null;
        try {
          regexReturn = RegExp(searchValue).exec(request.url);
        } catch (err) {
          console.info('%c⚠️ Incorrect regex entered.', LOGGING_WARN_COLOR);
        }

        // Check if the search matches either the url or the type of the request
        if (regexReturn !== null || request.type.indexOf(searchValue) !== -1)
          return true;
        return false;
      });
    }

    // Update the view
    this.updateTableView();
  }

  /**
   * Registers the event to close the context menu when required.
   */
  registerContextCloseEvent() {
    document.addEventListener("contextmenu", (ev) => {
      const targetTag = (<HTMLInputElement> ev.target).tagName;
      if (targetTag != "TR" && targetTag != "TD")
        this.copyContextMenu.nativeElement.close();
      else
        this.registerContextCloseEvent();
    }, { once: true })
  }

  /**
   * Update the view
   */
  updateTableView() {
    this.filteredRequests = this.getFilteredRequests();
    this.changeDetection.detectChanges();
  }
}
