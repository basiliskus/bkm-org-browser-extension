var currentTab;
var currentBookmark;
var bookmarks;
var catalog;

var port = chrome.runtime.connectNative("com.basiliskus.bkm_org_ext");


function getCatalog() {
  return catalog;
}

function loadBookmarks() {
  port.postMessage({ command: 'get-collection-bookmarks' });
}

function getCurrentBookmark() {
  if (currentBookmark) {
    return { "saved": true, "url": currentBookmark.url, "title": currentBookmark.title, "tags": currentBookmark.tags };
  }
  return { "saved": false, "url": currentTab.url, "title": currentTab.title, "tags": "" };
}

function isSupportedProtocol(urlString) {
  var supportedProtocols = ["https:", "http:", "ftp:", "file:"];
  var url = document.createElement('a');
  url.href = urlString;
  return supportedProtocols.indexOf(url.protocol) != -1;
}

function activateIcon(tabid) {
  chrome.browserAction.setIcon({ path: "icons/bookmark-black-48dp.svg", tabId: tabid });
}

function deactivateIcon(tabid) {
  chrome.browserAction.setIcon({ path: "icons/bookmark_border-black-48dp.svg", tabId: tabid });
}

function addBookmark(url, title, created, tags, cats) {
  console.log("Adding url: " + url);
  // chrome.bookmarks.create({title: title, url: url});
  // created=Date.now();
  message = { command: 'add', url: url, title: title, tags: tags, created: created };
  if (cats) {
    message["categories"] = cats;
  }
  port.postMessage(message);
  activateIcon(currentTab.id);
}

function deleteBookmark(url) {
  console.log("Deleting url: " + url);
  // chrome.bookmarks.remove(bid);
  port.postMessage({ command: 'delete', url: url });
  deactivateIcon(currentTab.id);
}

function updateBookmark(url, title, tags) {
  console.log("Updating url: " + url);
  // chrome.bookmarks.search({ url: url }, (bookmarks) => {
  //     bookmark = bookmarks[0];
  //     if (title) {
  //       bookmark.title = title;
  //     }
  //   }
  // );
  port.postMessage({ command: 'update', url: url, title: title, tags: tags });
}

function saveCurrentCollection() {
  port.postMessage({ command: 'save' });
  loadBookmarks();
}

function changeCurrentCollection(name) {
  port.postMessage({ command: 'set-current-collection', name: name });
  loadBookmarks();
}

function importBrowserBookmarks() {

  function traverse_nodes(node, level, cats) {
    if (node.type === 'bookmark' && isSupportedProtocol(node.url)) {
      // port.postMessage({ command: 'add', url: node.url, title: node.title, created: node.dateAdded, categories: cats });
      addBookmark(node.url, node.title, node.dateAdded, '', cats)
    }
    if (node.type === 'folder') {
      cats = cats.slice(0, level)
      if (cats.length > level) {
        cats[level] = node.title
      } else if (node.title != '') {
        cats.push(node.title)
      }
      level++;
    }
    if (node.children) {
      for (child of node.children) {
        traverse_nodes(child, level, cats);
      }
    }
    level--;
  }

  chrome.bookmarks.getTree(
    function(bookmarkItems) {
      traverse_nodes(bookmarkItems[0], 0, []);
      // port.postMessage({ command: 'save' });
      saveCurrentCollection();
  });
}

/*
 * Updates the browserAction icon to reflect whether the current page
 * is already bookmarked.
 */
// function updateIcon() {
//   console.log("running updateIcon")
//   chrome.browserAction.setIcon({
//     path: currentBookmark ?
//       "icons/bookmark-black-48dp.svg" :
//       "icons/bookmark_border-black-48dp.svg",
//     tabId: currentTab.id
//   });
//   chrome.browserAction.setTitle({
//     // Screen readers can see the title
//     title: currentBookmark ? 'Unbookmark it!' : 'Bookmark it!',
//     tabId: currentTab.id
//   });
// }

/*
 * Add or remove the bookmark on the current page.
 */
// function toggleBookmark() {

//   if (currentBookmark) {
//     chrome.bookmarks.remove(currentBookmark.id);
//     console.log("Deleting url: " + currentTab.url);
//     port.postMessage({ command: 'del', url: currentTab.url, title: currentTab.title });
//   } else {
//     chrome.bookmarks.create({title: currentTab.title, url: currentTab.url});
//     console.log("Adding url: " + currentTab.url);
//     port.postMessage({ command: 'add', url: currentTab.url, title: currentTab.title, created: Date.now() });
//   }
//   port.postMessage({ command: 'save' });
// }

// chrome.browserAction.onClicked.addListener(toggleBookmark);

// chrome.browserAction.onClicked.addListener(() => {
//   browser.tabs.query({
//     currentWindow: true,
//     active: true
//   }).then(sendMessageToTabs).catch(onError);
// });

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab(tabs) {
  // console.log("running updateActiveTab")

  // function updateCurrentBookmark(bookmarks) {
  //   currentBookmark = bookmarks[0];
  //   updateIcon();
  // }

  function updateTab(tabs) {
    if (tabs[0]) {
      currentTab = tabs[0];
      if (isSupportedProtocol(currentTab.url)) {
          // chrome.bookmarks.search({ url: currentTab.url }, updateCurrentBookmark);
          bookmark = bookmarks.find(b => b.url === currentTab.url);
          if (bookmark) {
            currentBookmark = bookmark;
            activateIcon(currentTab.id);
          } else {
            currentBookmark = null;
            // console.log(`Didnt find bookmark for: '${currentTab.url}'`)
            deactivateIcon(currentTab.id);
          }
          // updateIcon();
      } else {
        // console.log(`Bookmark it! does not support the '${currentTab.url}' URL.`)
      }
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, updateTab);
}


chrome.runtime.onMessage.addListener((response, sender, sendResponse) => {
  // console.log("[command received] " + response.command);
  switch(response.command) {
    case "set-current-collection":
      changeCurrentCollection(response.name);
      sendResponse({message: "changeCurrentCollection"});
      break;
    case "add":
      created = Date.now();
      addBookmark(response.url, response.title, created, response.tags, '');
      saveCurrentCollection();
      sendResponse({message: "addBookmark"});
      break;
    case "update":
      updateBookmark(response.url, response.title, response.tags);
      saveCurrentCollection();
      sendResponse({message: "updateBookmark"});
      break;
    case "delete":
      deleteBookmark(response.url);
      saveCurrentCollection();
      sendResponse({message: "deleteBookmark"});
      break;
    case "import":
      importBrowserBookmarks();
      saveCurrentCollection();
      sendResponse({message: "importBrowserBookmarks"});
      break;
  }
});

port.onMessage.addListener(response => {
  // console.log("[command received] " + response.command);
  switch(response.command) {
    case "user-message":
      console.log(response.message);
      break;
    case "catalog":
      catalog = response.message;
      break;
    case "bookmarks":
      bookmarks = response.message
      break;
  }
});

port.onDisconnect.addListener(() => {
  console.log("Disconnected!!!!!!!!!!!!!!!!");
});

console.log("loading bookmarks...");
loadBookmarks();

console.log("getting catalog...");
port.postMessage({ command: 'get-catalog' });

// console.log("importing bookmarks...");
// importBrowserBookmarks();


// listen for bookmarks being created
// chrome.bookmarks.onCreated.addListener(updateActiveTab);

// listen for bookmarks being removed
// chrome.bookmarks.onRemoved.addListener(updateActiveTab);

// listen to tab URL changes
chrome.tabs.onUpdated.addListener(updateActiveTab);

// listen to tab switching
chrome.tabs.onActivated.addListener(updateActiveTab);

// listen for window switching
chrome.windows.onFocusChanged.addListener(updateActiveTab);

// update when the extension loads initially
updateActiveTab();

