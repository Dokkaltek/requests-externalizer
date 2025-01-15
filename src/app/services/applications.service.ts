import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AppReference, Application } from '../model/application.model';
import { LOGGING_WARN_COLOR } from '../model/error.constants';
import { DuplicationError } from '../model/errors.model';
import { APPLICATIONS } from '../model/storage.constants';
import { ContextMenu } from '../model/types.model';

const APP_NAME_TOO_LONG = "The app name can't be bigger than 100 chars!";
const DUPLICATE_NAME_ERROR = "An app with that name already exists!";
const MENU_PARENT_ID = 'request-externalizer-ext-parent-menu';
const MENU_CHILD_ID_START = 'req-ext-menuitem-';
const MENU_CONTEXT_LIST: chrome.contextMenus.ContextType[] = ["page", "link", "image", "video", "audio"];
const NATIVE_APP_NAME = "es.requests.externalizer";
const RUNNING_ON_FIREFOX = window.hasOwnProperty("browser");

/**
 * Class that contains all methods related to {@link Application} handling.
 */
@Injectable({
  providedIn: 'root',
})
export class ApplicationsService {
  apps: Application[] = [];
  lastActiveTab: number = 0;

  /**
   * Loads all applications from the storage.
   * @returns A {@link Promise} with the list of all {@link Application} entries.
   */
  async loadApplications(): Promise<Application[]> {
    // If apps were already initialized, we return the service stored apps
    if (this.apps.length >= 1)
      return Promise.resolve(this.apps);

    const result = await chrome.storage.local.get(APPLICATIONS);

    if (result[APPLICATIONS] != null && result[APPLICATIONS].length > 0)
      this.apps = result[APPLICATIONS];

    return this.apps.slice();
  }

  /**
   * Saves all the passed applications and sets them as the list of applications stored.
   * @param registeredApps The list of {@link Application} entries to set as storage.
   * @returns The list of stored applications.
   */
  async saveApplications(registeredApps: Application[]): Promise<Application[]> {
    this.apps = registeredApps;
    return chrome.storage.local.set({ applications: registeredApps }).then(() => registeredApps.slice());
  }

  /**
   * Imports a set of applications into the storage.
   * @param importedApps The applications to import.
   */
  importApplications(importedApps: Application[]) {
    console.info('Importing applications: ', importedApps);
    importedApps.forEach(importedApp => {
      if (!this.apps.find(app => app.id == importedApp.id))
        this.apps.push(importedApp);
    });

    chrome.storage.local.set({ applications: this.apps.slice() });
  }

  /**
   * Finds an application by it's id inside the storage.
   * @param id The id to search an {@link Application} by.
   * @returns An {@link AppReference} which contains the application and it's location in the storage list.
   */
  findApplicationById(id: string): AppReference | null {
    for(let i = 0; i < this.apps.length; i++) {
      if (this.apps[i].id === id)
        return {app: this.apps[i], position: i};
    }
    return null;
  }

  /**
   * Inserts a new application into the storage.
   * @param newApp The {@link Application} to add.
   * @returns The list with all the stored applications after the insertion.
   */
  addNewApplication(newApp: Application): Application[] | Error {
    if (newApp.id == "-1")
      newApp.id = uuidv4();

    // Check if they somehow added a name longer than 100 chars
    if (newApp.name.length > 100)
      return Error(APP_NAME_TOO_LONG);

    // Check other errors
    const duplicationError = this.checkAppDuplicates(newApp.name, newApp.id);

    if (duplicationError?.duplicated.id) {
      newApp.id = uuidv4();
    } else if (duplicationError?.duplicated.name) {
      return Error(DUPLICATE_NAME_ERROR);
    }

    // Save the app and create the context menu after
    let applications = [...this.apps, newApp];
    this.saveApplications(applications).then(apps => {
      this.updateParentContextMenuVisibility(apps);
      this.modifyAppContextMenuEntry(newApp);
    });

    return applications.slice();
  }

  /**
   * Updates an application.
   * @param appToUpdate The {@link Application} to update.
   * @returns Returns an array with all the applications after updating the application or an error.
   */
  updateApplication(appToUpdate: Application): Application[] | Error {
    let registeredApp = this.findApplicationById(appToUpdate.id);
    if (appToUpdate.id == "-1" || registeredApp === null)
      return Error("Application wasn't registered.");

    // Check if they somehow added a name longer than 100 chars
    if (appToUpdate.name.length > 100)
      return Error(APP_NAME_TOO_LONG);

    // Check duplicates
    if (registeredApp.app.name != appToUpdate.name) {
      const duplicationError = this.checkAppDuplicates(appToUpdate.name);

      if (duplicationError?.duplicated.name)
        return Error(DUPLICATE_NAME_ERROR);
    }

    // Store the apps if everything was correct
    this.apps[registeredApp.position] = appToUpdate;
    
    // Update the app storage and the context menu after
    this.saveApplications(this.apps).then(apps => {
      this.updateParentContextMenuVisibility(apps);
      this.modifyAppContextMenuEntry(appToUpdate, true);
    });

    return this.apps.slice();
  }

  /**
   * Checks if there are duplicates in the storage for an app.
   * @param appName The app name to check for duplicates.
   * @param appId The app id to check for duplicates.
   * @returns Returns a {@link DuplicationError} if there was one, or null otherwise.
   */
  checkAppDuplicates(appName: string, appId: string | undefined = undefined): DuplicationError | null {
    for (const element of this.apps) {
      if (element.name == appName) {
        console.info(`%c⚠️ An app with the name '${appName}' already exists!`, LOGGING_WARN_COLOR);
        return {duplicated: {name: true}};
      } else if (appId != undefined && element.id == appId) {
        console.info(`%c⚠️ An app with the id '${appId}' already exists.`, LOGGING_WARN_COLOR);
        return {duplicated: {id: true}};
      }
    }
    return null;
  }

  /**
   * Parses variables from the command and replaces it with parts of the tab url.
   * 
   * The variables supported are:
   * - #{url} -> The full url (http://localhost:4200/home?id=1#2)
   * - #{origin} -> The domain, protocol, and port of the complete url (http://localhost:4200)
   * - #{protocol} -> The protocol used (http: or https:)
   * - #{domain} -> Only the domain (localhost)
   * - #{port} -> Only the port (4200)
   * - #{path} -> Only the path (/home)
   * - #{query} -> Only the search query (?id=1)
   * - #{fragment} -> The fragment or part after the hash in the url (#2)
   * - #{title} -> The title of the current page (Some super title of the webpage)
   * - #{runOnCmd} -> Runs the command on windows cmd terminal
   * @param url The url to use for replacements.
   * @param command The command which contains variables to replace.
   * @returns The parsed command after replacing the variables with their value.
   */
  replaceCommandVariables(url: string, command: string): string {
    const regex = /#{(?:url|origin|protocol|domain|port|path|query|fragment|title|runOnCmd)}/gm;
    let pathUrl : URL;

    try {
      pathUrl = new URL(url);
    } catch (err) {
      console.warn(`%c${url} is not a valid url.`, LOGGING_WARN_COLOR);
      return command;
    }

    let match;
    let parsedCommand = command;

    while ((match = regex.exec(command)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (match.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        // The result can be accessed through the `match`-variable.
        match.forEach(matchFound => {
          switch(matchFound) {
            case "#{url}":
              parsedCommand = parsedCommand.replaceAll("#{url}", pathUrl.href);
              break;
            case "#{origin}":
              parsedCommand = parsedCommand.replaceAll("#{origin}", pathUrl.origin);
              break;
            case "#{protocol}":
              parsedCommand = parsedCommand.replaceAll("#{protocol}", pathUrl.protocol);
              break;
            case "#{domain}":
              parsedCommand = parsedCommand.replaceAll("#{domain}", pathUrl.hostname);
              break;
            case "#{port}":
              parsedCommand = parsedCommand.replaceAll("#{port}", pathUrl.port);
              break;
            case "#{path}":
              parsedCommand = parsedCommand.replaceAll("#{path}", pathUrl.pathname);
              break;
            case "#{query}":
              parsedCommand = parsedCommand.replaceAll("#{query}", pathUrl.search);
              break;
            case "#{fragment}":
              parsedCommand = parsedCommand.replaceAll("#{fragment}", pathUrl.hash);
              break;
            case "#{title}":
              parsedCommand = parsedCommand.replaceAll("#{title}", document.querySelector("title")?.innerHTML ?? "undefined");
              break;
            case "#{runOnCmd}":
              // Add 2 calls to cmd so that it instanciates a cmd terminal (the first one is required since the first command must be a program)
              parsedCommand = parsedCommand.replaceAll("#{runOnCmd}", "cmd.exe /c start cmd.exe /c");
              break;
            default:
              break;
          }
        });
    }

    return parsedCommand;
  }

  /**
   * Gets the current tab as a promise.
   * @returns Returns a promise with the url of the current tab or undefined.
   */
  getCurrentTab(): Promise<string | undefined> {
    let queryOptions = { active: true, lastFocusedWindow: true };
    return chrome.tabs.query(queryOptions).then(tabs => tabs[0]?.url);
  }

  /**
   * Creates or updates a context menu entry.
   * @param app The application of which we should create or modify the context menu entry.
   * @param isUpdate If the modification is an update.
   */
  modifyAppContextMenuEntry(app: Application, isUpdate: boolean = false) {
    let contexts = this.getContextsOfApp(app);

    let contextMenuProperties : ContextMenu = {
      title: app.name,
      contexts: contexts.length === 0 ? [MENU_CONTEXT_LIST[0]] : contexts,
      parentId: MENU_PARENT_ID,
      visible: contexts.length > 0,
    }

    // On firefox we need to set the icons for the context menu
    if (RUNNING_ON_FIREFOX) {
      contextMenuProperties.icons = {
        "16": app.icon,
        "32": app.icon
      }
    }

    const contextId = MENU_CHILD_ID_START + app.id;

    if (isUpdate)
      chrome.contextMenus.update(contextId, contextMenuProperties);
    else
      chrome.contextMenus.create({...contextMenuProperties, id: contextId});
  }

  /**
   * Removes a context menu entry.
   * @param app The application of to remove the context menu entry of.
   */
  removeAppContextMenuEntry(app: Application) {
    const contextId = MENU_CHILD_ID_START + app.id;
    chrome.contextMenus.remove(contextId);
  }

  /**
   * Gets the contexts of each application.
   * @param {Application} app The application to get the contexts of. 
   * @returns The contexts of the application passed.
   */
  getContextsOfApp(app: Application) {
    let contexts: chrome.contextMenus.ContextType[] = [];

      if (app.contextMenu?.showInPage)
        contexts.push(MENU_CONTEXT_LIST[0]);

      if (app.contextMenu?.showInLinks)
        contexts.push(MENU_CONTEXT_LIST[1]);

      if (app.contextMenu?.showInImages)
        contexts.push(MENU_CONTEXT_LIST[2]);

      if (app.contextMenu?.showInVideos)
        contexts.push(MENU_CONTEXT_LIST[3]);

      if (app.contextMenu?.showInAudios)
        contexts.push(MENU_CONTEXT_LIST[4]);

    return contexts;
  }

  /**
   * Update the visibility of the parent menu entry for the given contexts.
   * @param applications All the saved applications.
   */
  updateParentContextMenuVisibility(applications: Application[], callback?: (() => void) | undefined) {
    let allAppContexts: chrome.contextMenus.ContextType[] = [];
    applications.forEach(app => allAppContexts.push(...this.getContextsOfApp(app)));
    allAppContexts = allAppContexts.filter((item, i, ar) => ar.indexOf(item) === i);

    chrome.contextMenus.update(MENU_PARENT_ID, {
      contexts: allAppContexts.length === 0 ? [MENU_CONTEXT_LIST[0]] : allAppContexts,
      visible: allAppContexts.length > 0
    }, callback);
  }

  /**
   * Executes a command and sends it to the required program
   * @param urlToSend The url of to send.
   * @param command The command to execute.
   * @param contextInfo The information of where was the action called from if applies.
   */
  executeCommand(urlToSend: string, command: string) {
    const passedCommand = this.replaceCommandVariables(urlToSend, command.trim());
    console.info(`The command to send was '${passedCommand}'.`);

    // Send the parsed command to the native app
    this.sendToNativeApp(passedCommand);
  }

  /**
   * Sends a command to the terminal.
   * @param message The command to send to the terminal to be executed.
   */
  sendToNativeApp(message: string) {
      return chrome.runtime.sendNativeMessage(NATIVE_APP_NAME, {value: message});
  }
}
