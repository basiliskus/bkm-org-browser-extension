const collectionsDrowdown = document.getElementById('collections');
const urlInput = document.getElementById('url');
const titleInput = document.getElementById('title');
const tagsInput = document.getElementById('tags');
const submitButton = document.getElementById('submit');
const deleteButton = document.getElementById('delete');
const importButton = document.getElementById('import');


/*async*/ function setCurrentCollection() {
  let collectionFpath = collectionsDrowdown.options[collectionsDrowdown.selectedIndex].value;
  let message = { command: "set-current-collection", name: collectionFpath };
  /*await */chrome.runtime.sendMessage(message, response => {
    console.log(response.message);
    chrome.runtime.getBackgroundPage(populateBookmarkFields);
  });
}

/*async*/ function saveBookmark() {
  let command = submitButton.value;
  let message = { command: command, url: urlInput.value, title: titleInput.value, tags: tagsInput.value };
  /*await */chrome.runtime.sendMessage(message);
}

/*async*/ function deleteBookmark() {
  let message = { command: "delete", url: urlInput.value };
  /*await */chrome.runtime.sendMessage(message);
}

function importBrowserBookmarks() {
  let message = { command: "import" };
  chrome.runtime.sendMessage(message);
}

function populateCatalog(page) {
  console.log('populateCatalog');
  catalog = page.getCatalog();
  for (let collection of catalog) {
    collectionsDrowdown.options.add(new Option(collection.name, collection.filename, collection.default, collection.default))
  }
}

function populateBookmarkFields(page) {
  console.log('populateBookmarkFields');
  bookmark = page.getCurrentBookmark();
  urlInput.value = bookmark.url;
  titleInput.value = bookmark.title;
  if (bookmark.saved) {
    tagsInput.value = bookmark.tags;
    submitButton.innerText = "Update bookmark";
    submitButton.value = "update";
    deleteButton.style.display = "block";
  } else {
    submitButton.innerText = "Add bookmark";
    submitButton.value = "add";
    deleteButton.style.display = "none";
  }
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
  window.close();
})

chrome.runtime.getBackgroundPage(populateCatalog);
chrome.runtime.getBackgroundPage(populateBookmarkFields);
