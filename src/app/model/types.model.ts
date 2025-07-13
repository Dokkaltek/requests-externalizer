import { Application } from "./application.model";

/**
 * Media type for requests
 */
export class MediaTypes {
  document = ['document', 'font'];
  video = ['video', 'media'];
  image = ['image'];
  audio = ['media / mp3', 'media / opus', 'media / m4a', 'media / flac'];
  script = ['script', 'stylesheet'];
  misc = ['other', 'xmlhttprequest'];
}

/**
 * Extension types for content media types.
 */
export class ExtensionTypes {
  document = ['json', 'xml'];
  video = ['mpd', 'm3u8', 'mp4', 'webm'];
  image = ['svg', 'png', 'jpg', 'gif', 'webp', 'avif', 'jpeg', 'tif', 'tiff', 'heif', 'apng'];
  audio = ['mp3', 'opus', 'm4a', 'flac'];
}

/**
 * The global settings for the application
 */
export class GlobalSettings {
  darkMode: boolean = false;
  countType: boolean = false;
  typeToCount: string | null = 'document';
  storeRequests: boolean = false;
  ignoredDomainsRawText: string = '';
  ignoredDomains: string[] = [];
}

/**
 * Event types for application actions.
 */
export enum AppEventType {
  MOVE = "move",
  DELETE = "delete"
}

/**
 * The event data on application change.
 */
export type AppChangeEvent = {
  applications: Application[];
  eventType: AppEventType;
  affectedApps: Application[];
}

/**
 * The type for the context menus.
 */
export type ContextMenu = {
  title: string,
  contexts: chrome.contextMenus.ContextType[],
  parentId?: string,
  visible: boolean,
  icons?: {
    "16": string,
    "32": string
  }
}

/**
 * Valid levels for toast messages.
 */
export enum ToastState {
  INFO = "info",
  WARN = "warn",
  ERROR = "error"
}