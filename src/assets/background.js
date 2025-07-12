import { luxon } from "./lib/luxon.min.js";
const DateTime = luxon.DateTime;
const PAGE_REQUESTS = 'pageRequests';
const APPLICATIONS = 'applications';
const MENU_PARENT_ID = 'request-externalizer-ext-parent-menu';
const MENU_CHILD_ID_START = 'req-ext-menuitem-';
const SETTINGS = 'settings';
const MENU_CONTEXT_LIST = ["page", "link", "image", "video", "audio"]
const NATIVE_APP_NAME = "es.requests.externalizer";
const RUNNING_ON_FIREFOX = typeof browser !== "undefined";
const AUDIO_EXTENSIONS = ["mp3", "m4a", "flac", "opus"];
const VIDEO_EXTENSIONS = ["mpd", "m3u8", "mp4", "webm"];
let requestsStore = {tabs: {}};
let previousActiveTabId;
let lastActiveTab;
let badgeValue = '';
let globalSettings = {};
let requestsInProgress = false;
let requestsListener = null;
let tabsUrlMap = {};

/**
 * Stores the incoming request to be used later
 * @param {*} e The tab event.
 */
function storeRequest(e) {
  // Ignore request if it doesn't fulfill all ignore criteria
  
  // The setting for storeRequests must be active, and the request must not be on the ignored domains list
  const requestUrl = new URL(e.url);
  const requestOrigin = requestUrl.origin;
  let requestHostname = requestUrl.hostname;
  if (requestHostname.startsWith("www.")) 
    requestHostname = requestHostname.substring(4);
  if (!globalSettings?.storeRequests || globalSettings?.ignoredDomains.includes(requestHostname))
    return;

  // Must be an existing tab
  const isInvalidTabId = e.tabId === -1;
  // Must not be a frame request
  const isFrame = e.type?.indexOf('frame') !== -1;
  // Must not be an extension url
  const urlOrigin = e.originUrl || e.initiator;
  const isExtensionPath = urlOrigin && urlOrigin?.indexOf('extension://') !== -1;
  // Must have a success status
  const isNotSuccessStatus = e.statusCode < 200 || e.statusCode > 299;
  // Must be a GET request
  const isNotGetRequest = e.method !== "GET";

  // Check all conditions
  if (isInvalidTabId || isFrame || isExtensionPath || isNotSuccessStatus || isNotGetRequest)
    return;

  // Make sure that the domain entry is initialized
  if (requestsStore.tabs[e.tabId] === undefined) requestsStore.tabs[e.tabId] = {};
  if (requestsStore.tabs[e.tabId][requestOrigin] === undefined)
    requestsStore.tabs[e.tabId][requestOrigin] = [];

  // Add request to storage and remove duplicates
  for (let request of requestsStore.tabs[e.tabId][requestOrigin]) {
    if (request.url === e.url) return;
  }

  requestsStore.tabs[e.tabId][requestOrigin].push(e);

  // Only update the storage every second
  if (!requestsInProgress) {
    requestsInProgress = true;

    setTimeout(() => {
      chrome.storage.local.set({ pageRequests: requestsStore });
      requestsInProgress = false;
    }, 500);
  }

  // Add number of found requests for the current tab on the extension icon if they are from the current tab
  if (lastActiveTab === e.tabId) {
    updateBadgeByRequestsType();
  }
}

/**
 * Update the number of requests in the extension icon.
 */
function updateBadgeByRequestsType() {
    if (!lastActiveTab) return;
    let updatedText = '';

    // Get number of requests on the current tab domain
    if (lastActiveTab && requestsStore.tabs[lastActiveTab]) {
      
      try {
        let tabRequests = Object.keys(requestsStore.tabs[lastActiveTab])
            .map(domain => requestsStore.tabs[lastActiveTab][domain]).flat();

        if (tabRequests?.length > 0) {
          if (globalSettings?.countType)
            tabRequests = tabRequests.filter(request => resolveRequestType(request.url, request.type) === globalSettings.typeToCount);

          if (tabRequests.length > 0) updatedText = tabRequests.length + '';
        }
      } catch (err) {
        getCurrentTab().then(tab => {
          console.info(
            `❌ Tab url origin or tab id wasn't valid. Url = ${tab.url}, TabId = ${tab.id}`,
            requestsStore.tabs, err
          );
        });
      }
    }

    // Update badge
    updateBadgeValue(updatedText);
}

/**
 * Updates the value of the badge
 * @param {string} value The value to update the badge with.
 */
function updateBadgeValue(value) {
  if (badgeValue !== '' &&value === badgeValue) return;
  if (parseInt(value) < parseInt(badgeValue))
    value = (parseInt(badgeValue) + 1) + '';
  badgeValue = value;
  chrome.action.setBadgeText({
    text: value,
  });
}

/**
 * Updates the global variable storage and the storage itself.
 * @returns The promise of the storage update.
 */
function updateRequestsStorage() {
  return chrome.storage.local.get(PAGE_REQUESTS)
    .then(result => {
      let storage = result[PAGE_REQUESTS];
      if (previousActiveTabId) {
          storage.tabs[previousActiveTabId] = requestsStore.tabs[previousActiveTabId] || {};
          chrome.storage.local.set({ pageRequests: requestsStore });
      }

      if (storage.tabs[lastActiveTab] === undefined)
        requestsStore.tabs[lastActiveTab] = {};
      else
        requestsStore.tabs[lastActiveTab] = storage.tabs[lastActiveTab];
    });
}

/**
 * Clean storage requests from previous session
 * @param {*} result The tabs information that was stored.
 * @returns The requests left that weren't removed.
 */
async function cleanseStorage(result) {
  let cleanResult = result;

  const tabs = await chrome.tabs.query({});
  for (let tab of tabs) {
    if (!tab.url) continue;
    if (!cleanResult.hasOwnProperty(tab.id))
      // Remove the whole tab reference
      delete cleanResult[tab.id];
  }
  return cleanResult;
}

/**
 * Gets the current tab
 * @returns The current tab information.
 */
async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  if (tab === undefined && lastActiveTab) {
    try {
      tab = await chrome.tabs.get(lastActiveTab);
    } catch {
      return undefined;
    }
  }
  return tab;
}

/**
 * Remove unused requests when you visit a new site on a tab (like when clicking a link in a page)
 * @param {*} tabId The tab identifier.
 * @param {*} changedInfo The tab change status.
 * @param {*} tab The tab data.
 * @returns 
 */
function updateTabs(tabId, changedInfo, tab) {
  if (!tab.url) return;
  let newTabOrigin = new URL(tab.url).origin;
  if ((newTabOrigin !== tabsUrlMap[tabId]) && hasTabRequests(tabId)) {
    tabsUrlMap[tabId] = newTabOrigin;
    badgeValue = '';
    if (Object.keys(requestsStore.tabs[tabId]).length > 0) {
      requestsStore.tabs[tabId] = {};
      chrome.storage.local
        .set({ pageRequests: requestsStore });
    }

    if (lastActiveTab === tabId && globalSettings?.storeRequests)
      updateBadgeByRequestsType();
  }
}

/**
 * Check if the passed tab has stored requests
 * @param {*} tabId The tab identifier to check for requests.
 * @returns True if the tab has requests stored, false otherwise.
 */
function hasTabRequests(tabId) {
  if (!tabId) return false;
  return (
    requestsStore.tabs != null &&
    requestsStore.tabs[tabId]
  );
}

/**
 * Removes tab requests from the storage on tab close
 * @param {*} tabId The tab identifier to delete their requests.
 */
function removeTabs(tabId) {
  delete tabsUrlMap[tabId];
  if (!tabId || !hasTabRequests(requestsStore, tabId)) return;

  if (Object.keys(requestsStore.tabs[tabId]).length > 0) {
    delete requestsStore.tabs[tabId];
    chrome.storage.local
      .set({ pageRequests: requestsStore });
  }
}

/**
 * Helper method to get active tab, since chrome api is unreliable
 * @param {*} activeInfo The active tab information.
 */
function storeAndUpdateActiveTab(activeInfo) {
  // We need to store the last active tab since when the active tab is loading,
  // getCurrentTab returns undefined
  previousActiveTabId = lastActiveTab;
  lastActiveTab = activeInfo.tabId;
  badgeValue = '';
  if (globalSettings?.storeRequests)
    updateRequestsStorage().then(() => updateBadgeByRequestsType());
}

/**
   * Gets a date formatted with the given format.
   * @param format The format to use.
   * @returns The given date formatted.
   */
function getFormattedCurrentDate(format) {
  return DateTime.local().setLocale("en-US").toFormat(format);
}

/**
   * Parses variables from the command and replaces it with parts of the tab url.
   * 
   * The variables supported are:
   * - #{url} -> The full url (http://localhost:4200/home?id=1#2)
   * - #{rawUrl} -> The url without query params or fragment (http://localhost:4200/home)
   * - #{origin} -> The domain, protocol, and port of the complete url (http://localhost:4200)
   * - #{protocol} -> The protocol used (http: or https:)
   * - #{domain} -> Only the domain (localhost)
   * - #{port} -> Only the port (4200)
   * - #{path} -> Only the path (/home)
   * - #{query} -> Only the search query (?id=1)
   * - #{fragment} -> The fragment or part after the hash in the url (#2)
   * - #{title} -> The title of the current page (Some super title of the webpage)
   * - #{runOnCmd} -> Runs the command on windows cmd terminal
   * @param {string} url The url to use for replacements.
   * @param {string} command The command which contains variables to replace.
   * @param {chrome.tabs.Tab | undefined} tab - The tab information
   * @returns The parsed command after replacing the variables with their value.
   */
function replaceCommandVariables(url, command, tab) {
  const regex = /#{(?:url|rawUrl|origin|protocol|domain|port|path|query|fragment|title|date|runOnCmd)}/gm;
  const pathUrl = new URL(url);

  let match;

  while ((match = regex.exec(command)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
          regex.lastIndex++;
      }
      
      // The result can be accessed through the `match`-variable.
      match.forEach(matchFound => {
        switch(matchFound) {
          case "#{url}":
            command = command.replaceAll("#{url}", pathUrl.href);
            break;
          case "#{rawUrl}":
            command = command.replaceAll("#{rawUrl}", pathUrl.origin + pathUrl.pathname);
            break;
          case "#{origin}":
            command = command.replaceAll("#{origin}", pathUrl.origin);
            break;
          case "#{protocol}":
            command = command.replaceAll("#{protocol}", pathUrl.protocol);
            break;
          case "#{domain}":
            command = command.replaceAll("#{domain}", pathUrl.hostname);
            break;
          case "#{port}":
            command = command.replaceAll("#{port}", pathUrl.port);
            break;
          case "#{path}":
            command = command.replaceAll("#{path}", pathUrl.pathname);
            break;
          case "#{query}":
            command = command.replaceAll("#{query}", pathUrl.search);
            break;
          case "#{fragment}":
            command = command.replaceAll("#{fragment}", pathUrl.hash);
            break;
          case "#{title}":
            command = command.replaceAll("#{title}", tab?.title ?? "");
            break;
          case "#{date}":
            command = command.replaceAll("#{date}", getFormattedCurrentDate("yyyy-MM-dd"));
            break;
          case "#{runOnCmd}":
            // Add 2 calls to cmd so that it instanciates a cmd terminal (the first one is required since the first command must be a program)
            command = command.replaceAll("#{runOnCmd}", "cmd.exe /c start cmd.exe /c");
            break;
          default:
            break;
        }
      });
  }

  return command;
}

/**
     * Replaces the text from the function variables with the text provided in them.
     * @param text The full match text to parse for replacements.
     * @param functionStartLength The index of the start of the function input parameters.
     * @returns The text with the text replaced.
     */
function replaceFunctionVariablesText(text, functionStartLength) {
  let inputParams = text.substring(functionStartLength, text.length - 1).split(">>");

  if (inputParams.length === 3) {
    return inputParams[0].replaceAll(inputParams[1], inputParams[2]);
  } else if (inputParams.length === 2) {
    return inputParams[0].replaceAll(inputParams[1], "");
  }

  return text;
}

/**
   * Replaces the function variables on the command text with their value.
   * @param command The command to parse for function variables
   * @returns The parsed command.
   */
function replaceFunctionVariables(command) {
  const regex = /#{(?:(replace|date|remove)):.+?}/gm;
  let match;
  let parsedCommand = command;

  while ((match = regex.exec(command)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (match.index === regex.lastIndex) {
        regex.lastIndex++;
    }

    match.forEach(matchFound => {
      if (matchFound.startsWith("#{replace:")) {
        parsedCommand = parsedCommand.replace(matchFound, replaceFunctionVariablesText(matchFound, 10));
      } else if (matchFound.startsWith("#{remove:")) {
        parsedCommand = parsedCommand.replace(matchFound, replaceFunctionVariablesText(matchFound, 9));
      } else {
        // Parse the date format
        let format = matchFound.substring(7, matchFound.length - 1);
        parsedCommand = parsedCommand.replaceAll(matchFound, getFormattedCurrentDate(format));
      }
    });
  }

  return parsedCommand;
}

/**
 * Resolves the type of the request.
 * @param {string} request The request url to resolve the type of.
 * @param {string} type The type to resolve.
 * @returns The resolved type of the request.
 */
function resolveRequestType(request, type) {
  let extension = "";
  let reqArray = request.split('/');
  let reqLastPath = reqArray[reqArray.length - 1]
    .split('#')[0]
    .split('?')[0]
    .split('=')[0];
  if (reqLastPath.indexOf('.') !== -1)
    extension = reqLastPath.split('.')[reqLastPath.split('.').length - 1]
    
  let resultingType;
  switch(type) {
    case "xmlhttprequest":
      if (VIDEO_EXTENSIONS.includes(extension))
        resultingType = "video";
      else if (extension === "svg")
        resultingType = "image";
      else resultingType = "misc";
      break;
    case "font": 
      resultingType = "document";
      break;
    case "media":
      if (AUDIO_EXTENSIONS.includes(extension))
        resultingType = "audio";
      else resultingType = "video";
      break;
    case "stylesheet":
      resultingType = "script";
      break;
    case "other":
      if (extension === "json" || extension === "xml") 
        resultingType = "document";
      else resultingType = "misc";
      break;
    default:
      resultingType = type;
      break;
  }

  return resultingType;
}

/**
 * Creates the context menu parent where store all the children apps.
 * @param {Array} applications The applications to create context menu entries of.
 */
function createContextMenuEntries(applications) {
  // Create parent entry (Even if the contexts are empty)
  chrome.contextMenus.create({
    title: 'Requests externalizer',
    id: MENU_PARENT_ID,
    contexts: [MENU_CONTEXT_LIST[0]],
    visible: false
  });

  // Initialize apps if required
  if (applications.length !== 0) {
    const childProps = generateChildrenContextMenuProps(applications);

    // If some children required items to be created, we create the parent first and then all the children
    let parentContext = [];
    childProps.filter(prop => prop.visible === true).forEach(prop => parentContext.push(...prop.contexts));

    // Filter out duplicates
    parentContext = parentContext.filter((item, i, ar) => ar.indexOf(item) === i);

    // Update parent entry if required
    if (parentContext.length > 0) {
      chrome.contextMenus.update(MENU_PARENT_ID, {
        contexts: parentContext,
        visible: true
      });
    }

    if (childProps.length > 0) {
      // Create the children after the parent
      childProps.forEach(contextMenuProp => 
        chrome.contextMenus.create(contextMenuProp)
      )
    }
  }
}

/**
 * Creates context menu children for each app that was created in the settings.
 * @param {Array} applications The applications to create context menu entries of.
 * @return Returns the contexts of all the apps.
 */
function generateChildrenContextMenuProps(applications) {
  let allAppsProps = [];
  applications.forEach(app => {
    let contexts = getContextsOfApp(app);
    
    let contextMenuProperties = {
      title: app.name,
      contexts: contexts.length === 0 ? [MENU_CONTEXT_LIST[0]] : contexts,
      id: MENU_CHILD_ID_START + app.id,
      parentId: MENU_PARENT_ID,
      visible: contexts.length > 0
    }

    // On firefox we need to set the icons for the context menu
    if (RUNNING_ON_FIREFOX) {
      contextMenuProperties.icons = {
        "16": app.icon,
        "32": app.icon
      }
    }

    // Set context menu entry
    allAppsProps.push(contextMenuProperties);
  });

  // Return all the contexts after filtering the duplicates
  return allAppsProps;
}

/**
 * Gets the contexts of each application.
 * @param {*} app The application to get the contexts of. 
 * @returns The contexts of the application passed.
 */
function getContextsOfApp(app) {
  let contexts = [];

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
 * Performs the context menu command that is set for the application clicked.
 * @param {chrome.contextMenus.OnClickData} info The information object of the context menu clicked.
 * @param {chrome.tabs.Tab | undefined} tab - The tab information
 */
function performContextMenuCommand(info, tab) {
  if (info.parentMenuItemId !== MENU_PARENT_ID) {
    return;
  }

  
  let urlToSend = info.pageUrl;
  const appId = info.menuItemId.substring(MENU_CHILD_ID_START.length);
  
  // Set the link as source if it had a link
  urlToSend = info.linkUrl || info.pageUrl;
  
  // Override the link url with the media source if it had any
  if (info.mediaType) {
    urlToSend = info.srcUrl || info.pageUrl;
  }

  // Load the app from storage and execute the command
  chrome.storage.local.get(APPLICATIONS).then(result => {
    let app = result[APPLICATIONS].filter(item => item.id === appId)
    if (app.length > 0) {
      let passedCommand = replaceCommandVariables(urlToSend, app[0].command.trim(), tab);
      passedCommand = replaceFunctionVariables(passedCommand);
      console.info(`The command to send was '${passedCommand}'.`);

      // Perform the command
      chrome.runtime.sendNativeMessage(NATIVE_APP_NAME, {value: passedCommand}).catch(err => console.info(
        "❌An unexpected error happened while sending the command to the native app.", err));
    }
  })
}

/**
 * Start storage object if required and clean storage of old entries
 */
function initialize() {
  // Give initial values to the page requests object
  chrome.storage.local.get(PAGE_REQUESTS).then(result => {
    let requestsObj = result[PAGE_REQUESTS] ?? {};

    if (requestsObj === 0) requestsObj = {};
    if (requestsObj.tabs === undefined) requestsObj.tabs = {};

    cleanseStorage(requestsObj.tabs).then((requestTabs) => {
      requestsObj.tabs = requestTabs

        // Initialize only if required
      if (!result[PAGE_REQUESTS])
        chrome.storage.local.set({ pageRequests: requestsObj });

      requestsStore = requestsObj;

      console.info('Starting Externalizer with requests storage: ', requestsObj)
    });
  });

  // Give initial values to the registered applications object
  chrome.storage.local.get(APPLICATIONS).then(result => {
    let applicationsObj = result[APPLICATIONS] ?? [];

    if (applicationsObj === 0) applicationsObj = [];

    // Initialize only if required
    if (!result[APPLICATIONS])
      chrome.storage.local.set({ applications: applicationsObj });

    console.info('Starting Externalizer with registered applications: ', applicationsObj)
    
    createContextMenuEntries(applicationsObj);
  });

  // Give initial values to the global settings object
  chrome.storage.local.get(SETTINGS).then(result => {
    let defaultSettings = {
      darkMode: null,
      countType: false,
      typeToCount: 'document',
      storeRequests: false,
      ignoredDomainsRawText: '',
      ignoredDomains: []
    };

    let settingsObj = result[SETTINGS] ?? defaultSettings;

    if (settingsObj === 0) settingsObj = defaultSettings;

    console.info('Starting Externalizer with global settings: ', settingsObj);

    // Initialize only if required
    if (!result[SETTINGS]) chrome.storage.local.set({ settings: settingsObj });
    globalSettings = settingsObj;

    // Store all requests per url
    if (globalSettings !== undefined && globalSettings.storeRequests) {
      requestsListener = chrome.webRequest.onCompleted.addListener(storeRequest, {
        urls: ['<all_urls>'],
      });
    }
  });

  // Add the first current tab
  getCurrentTab().then(tab => {
    lastActiveTab = tab;
  });
}

/**
 * Updates the global settings of the app.
 * @param {*} message The message sent from the content script.
 */
function updateSettings(message) {
  if (message.data === "changedSettings") {
    chrome.storage.local.get(SETTINGS).then(result => {
      let defaultSettings = {
        darkMode: null,
        countType: false,
        typeToCount: 'document',
      };

      let settingsObj = result[SETTINGS] ?? defaultSettings;
      if (settingsObj === 0) settingsObj = defaultSettings;

      // Initialize only if required
      globalSettings = settingsObj;

      if (globalSettings.storeRequests) {
        requestsListener = chrome.webRequest.onCompleted.addListener(storeRequest, {
          urls: ['<all_urls>'],
        });
      } else {
        badgeValue = '';
        updateBadgeValue(badgeValue);
        if (requestsListener) {
          chrome.webRequest.onCompleted.removeListener(requestsListener);
          requestsListener = null;
        }
      }
    });
  }
}

// Update extension badge text on tab change
chrome.tabs.onActivated.addListener(storeAndUpdateActiveTab);

// Remove tab entries when required
chrome.tabs.onUpdated.addListener(updateTabs);
chrome.tabs.onRemoved.addListener(removeTabs);

// Initializes the settings and creates the context menu entries on browser restart and on extension install
chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

// Add the listener for all elements
chrome.contextMenus.onClicked.addListener(performContextMenuCommand);

// Update global settings when they change
chrome.runtime.onMessage.addListener(updateSettings);
