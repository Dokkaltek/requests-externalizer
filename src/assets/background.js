const PAGE_REQUESTS = 'pageRequests';
const APPLICATIONS = 'applications';
const MENU_PARENT_ID = 'request-externalizer-ext-parent-menu';
const MENU_CHILD_ID_START = 'req-ext-menuitem-';
const SETTINGS = 'settings';
const MENU_CONTEXT_LIST = ["page", "link", "image", "video", "audio"]
const NATIVE_APP_NAME = "es.requests.externalizer";
let lastActiveTab;

/**
 * Stores the requests of the current page to be used later
 * @param {*} e The tab event.
 */
function storeRequests(e) {
  // Ignore request if it doesn't fulfill all ignore criteria

  // Must be an existing tab
  const isInvalidTabId = e.tabId === -1;
  // Must not be a frame request
  const isFrame = e.type?.indexOf('frame') !== -1;
  // Must not be an extension url
  const isExtensionPath = e.initiator?.indexOf('extension://') !== -1;
  // Must have a success status
  const isNotSuccessStatus = e.statusCode < 200 || e.statusCode > 299;
  // Must be a GET request
  const isNotGetRequest = e.method !== "GET";
  // Check all conditions
  if (isInvalidTabId || isFrame || isExtensionPath || isNotSuccessStatus || isNotGetRequest)
    return;

  chrome.storage.local.get(PAGE_REQUESTS).then(result => {
    let newResult = result.pageRequests || {};
    chrome.tabs.get(e.tabId).then(requestTab => {
      let requestOrigin = new URL(requestTab.url).origin;

      // Make sure that the domain entry is initialized
      if (newResult.tabs[e.tabId] === undefined) newResult.tabs[e.tabId] = {};
      if (newResult.tabs[e.tabId][requestOrigin] === undefined)
        newResult.tabs[e.tabId][requestOrigin] = [];

      // Add request to storage and remove duplicates
      for (let request of newResult.tabs[e.tabId][requestOrigin]) {
        if (request.url === e.url) return;
      }

      newResult.tabs[e.tabId][requestOrigin].push(e);
      chrome.storage.local.set({ pageRequests: newResult });

      // Add number of found requests for the current tab on the extension icon
      updateBadgeIfNecessary(e.tabId);
    });
  });
}

/**
 * Update the number of requests in the extension icon
 */
function updateBadge() {
  getCurrentTab()
    .then(tab => {
      if (!tab) return;

      chrome.storage.local.get(PAGE_REQUESTS).then(result => {
        let updatedText = '';

        // Get number of requests on the current tab domain
        if (tab.url && tab.id && result[PAGE_REQUESTS].tabs[tab.id]) {
          let tabOrigin = '';
          try {
            tabOrigin = new URL(tab.url).origin;
            let originRequests = result[PAGE_REQUESTS].tabs[tab.id][tabOrigin];
            if (originRequests) updatedText = originRequests.length + '';
          } catch (err) {
            console.info(
              `❌ Tab url origin or tab id wasn't valid. Url = ${tabOrigin}, TabId = ${tab.id}`,
              result[PAGE_REQUESTS].tabs,
            );
          }
        }

        // Update badge
        chrome.action.setBadgeText({
          text: updatedText,
        });
      });
    })
    .catch(err => console.info("❌ Couldn't update the badge.", err));
}

/**
 * Clean storage requests from previous session
 * @param {*} result The tabs information that was stored.
 * @returns The requests left that weren't removed.
 */
function cleanseStorage(result) {
  let cleanResult = result;

  chrome.tabs.query({}).then(tabs => {
    for (let tab of tabs) {
      if (!tab.url) continue;
      let urlOrigin = new URL(tab.url).origin;
      if (
        cleanResult.hasOwnProperty(tab.id) &&
        cleanResult[tab.id].hasOwnProperty(urlOrigin)
      ) {
        // Clean orfan url origins from a tab reference
        let tabSessions = Object.keys(cleanResult[tab.id]);
        if (tabSessions.length > 1) {
          tabSessions.forEach(tabSession => {
            if (tabSession !== urlOrigin)
              delete cleanResult[tab.id][tabSession];
          });
        }
      } else {
        // Remove the whole tab reference
        delete cleanResult[tab.id];
      }
    }
  });

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
  if (changedInfo.status !== 'complete') return;

  chrome.storage.local.get(PAGE_REQUESTS).then(result => {
    if (!hasTabRequests(result, tabId)) return;

    if (Object.keys(result[PAGE_REQUESTS].tabs[tabId]).length > 0) {
      let newResult = result[PAGE_REQUESTS];
      let newTabOrigin = new URL(tab.url).origin;
      let registeredDomains = Object.keys(newResult.tabs[tabId]);

      if (registeredDomains.length >= 2) {
        if (!registeredDomains.includes(newTabOrigin)) {
          newResult.tabs[tabId] = {};
        } else {
          registeredDomains.forEach(domain => {
            if (domain !== newTabOrigin) delete newResult.tabs[tabId][domain];
          });
        }
        chrome.storage.local
          .set({ pageRequests: newResult });
      }
    }
  });
  updateBadgeIfNecessary(tabId);
}

/**
 * Triggers a badge update if the tab to update is the same as the active tab
 * @param {*} updatedTabId The id of the tab that is being changed to.
 */
function updateBadgeIfNecessary(updatedTabId) {
  getCurrentTab()
    .then(tab => {
      if (tab && tab.id === updatedTabId) updateBadge();
    })
    .catch(err =>
      console.info(
        "❌ There was an error and couldn't update the extension badge. ",
        err,
      ),
    );
}

/**
 * Check if the passed tab has stored requests
 * @param {*} storeObject The local storage object to check requests in.
 * @param {*} tabId The tab identifier to check for requests.
 * @returns True if the tab has requests stored, false otherwise.
 */
function hasTabRequests(storeObject, tabId) {
  if (!tabId) return false;
  return (
    storeObject[PAGE_REQUESTS].tabs != null &&
    storeObject[PAGE_REQUESTS].tabs[tabId]
  );
}

/**
 * Removes tab requests from the storage on tab close
 * @param {*} tabId The tab identifier to delete their requests.
 */
function removeTabs(tabId) {
  if (!tabId) return;

  chrome.storage.local.get(PAGE_REQUESTS).then(result => {
    if (!hasTabRequests(result, tabId)) return;

    if (Object.keys(result[PAGE_REQUESTS].tabs[tabId]).length > 0) {
      let newResult = result[PAGE_REQUESTS];
      delete newResult.tabs[tabId];
      chrome.storage.local
        .set({ pageRequests: newResult });
    }
  });
}

/**
 * Helper method to get active tab, since chrome api is unreliable
 * @param {*} activeInfo The active tab information.
 */
function storeAndUpdateActiveTab(activeInfo) {
  // We need to store the last active tab since when the active tab is loading,
  // getActiveTab returns undefined
  lastActiveTab = activeInfo.tabId;
  updateBadge();
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
   * @param {string} url The url to use for replacements.
   * @param {string} command The command which contains variables to replace.
   * @param {chrome.tabs.Tab | undefined} tab - The tab information
   * @returns The parsed command after replacing the variables with their value.
   */
function replaceCommandVariables(url, command, tab) {
  const regex = /#{(?:url|origin|protocol|domain|port|path|query|fragment|title|runOnCmd)}/gm;
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

    // Set context menu entry
    allAppsProps.push(contextMenuProperties);
  });

  // Add the listener for all elements
  chrome.contextMenus.onClicked.addListener(performContextMenuCommand);

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
      const passedCommand = replaceCommandVariables(urlToSend, app[0].command.trim(), tab);

      // Perform the command
      chrome.runtime.sendNativeMessage(NATIVE_APP_NAME, {value: passedCommand});
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

    requestsObj.tabs = cleanseStorage(requestsObj.tabs);

    // Initialize only if required
    if (!result[PAGE_REQUESTS])
      chrome.storage.local.set({ pageRequests: requestsObj });

    console.info('Starting Externalizer with requests storage: ', requestsObj)
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
    };

    let settingsObj = result[SETTINGS] ?? defaultSettings;

    if (settingsObj === 0) settingsObj = defaultSettings;

    console.info('Starting Externalizer with global settings: ', settingsObj);

    // Initialize only if required
    if (!result[SETTINGS]) chrome.storage.local.set({ settings: settingsObj });
  });
}

// Store all requests per url
chrome.webRequest.onCompleted.addListener(storeRequests, {
  urls: ['<all_urls>'],
});

// Update extension badge text on tab change
chrome.tabs.onActivated.addListener(storeAndUpdateActiveTab);

// Remove tab entries when required
chrome.tabs.onUpdated.addListener(updateTabs);
chrome.tabs.onRemoved.addListener(removeTabs);

// Initializes the settings and creates the context menu entries
chrome.runtime.onInstalled.addListener(initialize);
