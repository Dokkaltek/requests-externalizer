import { Application } from "./application.model";

/**
 * Media type for requests
 */
export class MediaTypes {
  document = ['document', 'font', 'other / json', 'other / xml'];
  video = ['video', 'media', 'xmlhttprequest / mpd', 'xmlhttprequest / m3u8', 'media / mp4', 'media / webm'];
  image = ['image', 'xmlhttprequest / svg'];
  audio = ['media / mp3', 'media / opus', 'media / m4a', 'media / flac'];
  script = ['script', 'stylesheet'];
  misc = ['other', 'xmlhttprequest'];
}

/**
 * The global settings for the application
 */
export class GlobalSettings {
  darkMode: boolean = false;
  countType: boolean = false;
  typeToCount: string | null = 'document';
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