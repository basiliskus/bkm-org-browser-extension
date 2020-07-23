let currentTab;
let currentBookmark;
let bookmarks;
let catalog;
let jsport;

const pyport = chrome.runtime.connectNative('com.basiliskus.bkm_org_ext');

function loadCatalog() {
  pyport.postMessage({ command: 'get-catalog' });
}

function loadBookmarks() {
  pyport.postMessage({ command: 'get-bookmarks' });
}

function getCurrentBookmark() {
  if (currentBookmark) {
    return {
      saved: true,
      url: currentBookmark.url,
      title: currentBookmark.title,
      tags: currentBookmark.tags
    };
  }

  return {
    saved: false,
    url: currentTab.url,
    title: currentTab.title,
    tags: ''
  };
}

function isSupportedProtocol(urlString) {
  const supportedProtocols = ['https:', 'http:', 'ftp:', 'file:'];
  const url = document.createElement('a');
  url.href = urlString;
  return supportedProtocols.indexOf(url.protocol) !== -1;
}

function activateIcon(tabid) {
  chrome.browserAction.setIcon({ path: 'icons/bookmark-black-48dp.svg', tabId: tabid });
}

function deactivateIcon(tabid) {
  chrome.browserAction.setIcon({ path: 'icons/bookmark_border-black-48dp.svg', tabId: tabid });
}

function addBookmark(url, title, created, tags, cats) {
  console.log(`[background] Adding url: ${url}`);
  // chrome.bookmarks.create({title: title, url: url});
  // created=Date.now();
  message = {
    command: 'add-bookmark',
    url,
    title,
    tags,
    created
  };
  if (cats) {
    message.categories = cats;
  }
  pyport.postMessage(message);
}

function addCurrentBookmark(url, title, created, tags) {
  addBookmark(url, title, created, tags, '');
  activateIcon(currentTab.id);
}

function deleteBookmark(url) {
  console.log(`[background] Deleting url: ${url}`);
  pyport.postMessage({ command: 'delete-bookmark', url });
  deactivateIcon(currentTab.id);
}

function updateBookmark(url, title, tags) {
  console.log(`[background] Updating url: ${url}`);
  pyport.postMessage({
    command: 'update-bookmark',
    url,
    title,
    tags
  });
}

function saveCurrentCollection() {
  pyport.postMessage({ command: 'save-collection' });
  loadBookmarks();
}

function changeCurrentCollection(name) {
  pyport.postMessage({ command: 'set-current-collection', name });
  loadCatalog();
  loadBookmarks();
}

function importBrowserBookmarks() {
  function traverseNodes(node, level, cats) {
    if (node.type === 'bookmark' && isSupportedProtocol(node.url)) {
      addBookmark(node.url, node.title, node.dateAdded, '', cats);
    }
    if (node.type === 'folder') {
      cats = cats.slice(0, level);
      if (cats.length > level) {
        cats[level] = node.title;
      } else if (node.title !== '') {
        cats.push(node.title);
      }
      level += 1;
    }
    node.children.forEach((child) => traverseNodes(child, level, cats));
    level -= 1;
  }

  chrome.bookmarks.getTree(
    (bookmarkItems) => {
      traverseNodes(bookmarkItems[0], 0, []);
      saveCurrentCollection();
    }
  );
}

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab() {
  // console.log('updateActiveTab');

  function updateTab(tabs) {
    // console.log('updateTab');
    if (tabs[0]) {
      console.log('[background] setting currentTab');
      [currentTab] = tabs;
      if (isSupportedProtocol(currentTab.url)) {
        bookmark = bookmarks.find((b) => b.url === currentTab.url);
        if (bookmark) {
          console.log('[background] setting bookmark (found)');
          currentBookmark = bookmark;
          activateIcon(currentTab.id);
        } else {
          console.log('[background] setting bookmark (not found)');
          currentBookmark = null;
          // console.log(`Didnt find bookmark for: '${currentTab.url}'`)
          deactivateIcon(currentTab.id);
        }
        if (jsport) {
          jsport.postMessage({ command: 'set-bookmark', bookmark: getCurrentBookmark() });
        }
        // updateIcon();
      } else {
        // console.log(`Bookmark it! does not support the '${currentTab.url}' URL.`)
      }
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, updateTab);
}

pyport.onMessage.addListener((response) => {
  // console.log('[command received] ' + response.command);
  switch (response.command) {
    case 'user-message':
      console.log(`[background] ${response.message}`);
      break;
    case 'set-catalog':
      console.log('[background] setting catalog');
      catalog = response.message;
      break;
    case 'set-bookmarks':
      console.log('[background] setting bookmarks');
      bookmarks = response.message;
      updateActiveTab();
      break;
  }
});

chrome.runtime.onConnect.addListener((port) => {
  jsport = port;
  jsport.onMessage.addListener((response) => {
    switch (response.command) {
      case 'get-catalog':
        console.log('[background] get catalog');
        jsport.postMessage({ command: 'set-catalog', catalog });
        break;
      case 'get-bookmark':
        console.log('[background] get bookmark');
        jsport.postMessage({ command: 'set-bookmark', bookmark: getCurrentBookmark() });
        break;
      case 'set-current-collection':
        console.log('connected: set current collection');
        changeCurrentCollection(response.name);
        break;
      case 'add-bookmark':
        console.log('[background] add bookmark');
        created = Date.now();
        addCurrentBookmark(response.url, response.title, created, response.tags);
        saveCurrentCollection();
        break;
      case 'update-bookmark':
        console.log('[background] update bookmark');
        updateBookmark(response.url, response.title, response.tags);
        saveCurrentCollection();
        break;
      case 'delete-bookmark':
        console.log('[background] delete bookmark');
        deleteBookmark(response.url);
        saveCurrentCollection();
        break;
      case 'import-bookmarks':
        console.log('[background] import bookmarks');
        importBrowserBookmarks();
        saveCurrentCollection();
        break;
    }
  });
});

console.log('[background] loading bookmarks...');
loadBookmarks();

console.log('[background] getting catalog...');
loadCatalog();

// listen to tab URL changes
chrome.tabs.onUpdated.addListener(updateActiveTab);

// listen to tab switching
chrome.tabs.onActivated.addListener(updateActiveTab);

// listen for window switching
chrome.windows.onFocusChanged.addListener(updateActiveTab);

// update when the extension loads initially
// updateActiveTab();
