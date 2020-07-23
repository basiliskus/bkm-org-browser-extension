const collectionsDrowdown = document.getElementById('collections');
const urlInput = document.getElementById('url');
const titleInput = document.getElementById('title');
const tagsInput = document.getElementById('tags');
const submitButton = document.getElementById('submit');
const deleteButton = document.getElementById('delete');
const importButton = document.getElementById('import');
const userMessageSection = document.getElementById('user-message');

const port = chrome.runtime.connect({ name: 'bookmark' });

function setCurrentCollection() {
  port.postMessage({ command: "set-current-collection", name: collectionFpath });
  const collectionFpath = collectionsDrowdown.options[collectionsDrowdown.selectedIndex].value;
}

function saveBookmark() {
  port.postMessage({ command: command, url: urlInput.value, title: titleInput.value, tags: tagsInput.value });
  const command = submitButton.value;
}

function deleteBookmark() {
  port.postMessage({ command: "delete-bookmark", url: urlInput.value });
}

function importBrowserBookmarks() {
  port.postMessage({ command: "import-bookmarks" });
}

function getCatalog() {
  port.postMessage({command: "get-catalog"});
}

function getBookmark() {
  port.postMessage({command: "get-bookmark"});
}

function populateCatalog(catalog) {
  console.log("[popup] populateBookmarkFields")
  for (let collection of catalog) {
    collectionsDrowdown.options.add(new Option(collection.name, collection.filename, collection.default, collection.default))
  }
}

function populateBookmarkFields(bookmark) {
  console.log("[popup] populateBookmarkFields: " + bookmark.saved)
  urlInput.value = bookmark.url;
  titleInput.value = bookmark.title;
  if (bookmark.saved) {
    tagsInput.value = bookmark.tags;
    submitButton.innerText = "Update bookmark";
    submitButton.value = "update-bookmark";
    deleteButton.style.display = "block";
  } else {
    tagsInput.value = "";
    submitButton.innerText = "Add bookmark";
    submitButton.value = "add-bookmark";
    deleteButton.style.display = "none";
  }
}

function displayUserMessage(message) {
  userMessageSection.innerHTML = message;
  userMessageSection.classList.remove('hidden');
}


collectionsDrowdown.addEventListener('change', () => {
  setCurrentCollection();
});

submitButton.addEventListener('click', () => {
  saveBookmark();
  window.close();
})

deleteButton.addEventListener('click', () => {
  deleteBookmark();
  window.close();
})

importButton.addEventListener('click', () => {
  importBrowserBookmarks();
})


port.onMessage.addListener(response => {
  switch(response.command) {
    case "user-message":
      displayUserMessage(response.message);
      break;
    case "set-catalog":
      populateCatalog(response.catalog);
      break;
    case "set-bookmark":
      populateBookmarkFields(response.bookmark);
      break;
  }
});

getCatalog();
getBookmark();
