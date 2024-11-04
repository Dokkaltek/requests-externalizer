import { ChangeDetectorRef } from "@angular/core";
import { Application } from "./application.model";
import { GlobalSettings } from "./types.model";

export class MockChangeDetectorRef extends ChangeDetectorRef {
    override markForCheck(): void {
      return;
    }
    override detach(): void {
      return;
    }
    override detectChanges(): void {
      return;
    }
    override checkNoChanges(): void {
      return;
    }
    override reattach(): void {
      return;
    }
  }

export class MockGlobalSettings implements GlobalSettings {
  darkMode: boolean = false;
  countType: boolean = false;
  typeToCount: string | null = null;
}

export class MockMediaQueryList implements MediaQueryList {
  matches: boolean = true;
  media: string = "document";
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null;
  addListener(callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null): void {
    throw new Error("Method not implemented.");
  }
  removeListener(callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null): void {
    throw new Error("Method not implemented.");
  }
  addEventListener<K extends keyof MediaQueryListEventMap>(type: K, listener: (this: MediaQueryList, ev: MediaQueryListEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: unknown, listener: unknown, options?: unknown): void {
    throw new Error("Method not implemented.");
  }
  removeEventListener<K extends keyof MediaQueryListEventMap>(type: K, listener: (this: MediaQueryList, ev: MediaQueryListEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: unknown, listener: unknown, options?: unknown): void {
    throw new Error("Method not implemented.");
  }
  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.");
  }
}

export class MockTab implements chrome.tabs.Tab {
  status?: string;
  index: number = 1;
  openerTabId?: number;
  title?: string = "Test tab";
  url: string = "https://this.is.a.test.com";
  pendingUrl?: string;
  pinned: boolean = false;
  highlighted: boolean = false;
  windowId: number = 1;
  active: boolean = true;
  favIconUrl?: string;
  id?: number = 1;
  incognito: boolean = false;
  selected: boolean = true;
  audible?: boolean = false;
  discarded: boolean = false;
  autoDiscardable: boolean = false;
  mutedInfo?: chrome.tabs.MutedInfo;
  width?: number;
  height?: number;
  sessionId?: string;
  groupId: number = 1;
}

export class MockChromeResource implements chrome.webRequest.ResourceRequest {
  url: string = new MockTab().url + "/something.png";
  requestId: string = "1";
  frameId: number = 1;
  parentFrameId: number = 1;
  tabId: number = 1;
  type: chrome.webRequest.ResourceType = "image";
  timeStamp: number = new Date().getTime();
  initiator?: string;
}

export const SAMPLE_APPLICATION: Application = {
  id: "",
  name: "test app",
  icon: "",
  command: "echo 'hello world'",
  description: "A sample application",
  contextMenu: {
    showInPage: true,
    showInLinks: false,
    showInImages: false,
    showInVideos: false,
    showInAudios: false
  },
  shortcut: null
}

export const SAMPLE_URL = "https://this.is.a.test.com/test.html#test?param=1";