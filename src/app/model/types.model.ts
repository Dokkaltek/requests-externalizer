import { Application } from "./application.model";

/**
 * Media type for requests
 */
export class MediaTypes {
  document = ['document', 'font'];
  video = ['video', 'xmlhttprequest / mpd', 'xmlhttprequest / m3u8'];
  image = ['image'];
  audio = ['media / mp3'];
  script = ['script', 'stylesheet'];
  misc = ['other'];
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
 * Valid levels for toast messages.
 */
export enum ToastState {
  INFO = "info",
  WARN = "warn",
  ERROR = "error"
}