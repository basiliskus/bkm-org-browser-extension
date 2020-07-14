import sys
from datetime import datetime
from pathlib import Path

from modules import nativemessaging as nm

sys.path.append('../../digorg/')
from modules import log
from modules import utils
from modules import config
from bookmark import Bookmark, BookmarkCollection, BookmarkCollectionCatalog


config = config.get_config('config')
log_path = Path(config['global']['log_path'])
logger = log.get_logger('bkm-org', log_path=log_path)
collection_home = Path(config['bkm-org']['plain_home'])
default_collection_fpath = Path(config['bkm-org']['collection_fpath'])

ignore_categories = [ 'Bookmarks Menu', 'Bookmarks Toolbar', 'Mobile Bookmarks' ]

current_collection = BookmarkCollection(default_collection_fpath)

while True:
  receivedMessage = nm.getMessage()
  if receivedMessage:
    command = receivedMessage['command']
    if command == 'add':
      created = utils.get_date_from_unix_timestamp(str(receivedMessage['created']))
      bookmark = Bookmark(receivedMessage['url'], receivedMessage['title'], created)
      if 'categories' in receivedMessage:
        bookmark.categories = utils.get_category_hierarchy_str(receivedMessage['categories'])
        bookmark.tags = [ utils.get_tag_from_category(c) for c in receivedMessage['categories'] if not c in ignore_categories ]
      if 'tags' in receivedMessage and receivedMessage['tags']:
        bookmark.add_tags(receivedMessage['tags'].split(','))
      success = current_collection.add(bookmark)
      if success:
        nm.send("user-message", f"added bookmark: {receivedMessage['url']}")
      continue
    if command == 'delete':
      success = current_collection.delete_url(receivedMessage['url'])
      if success:
        nm.send("user-message", f"deleted bookmark: {receivedMessage['url']}")
      continue
    if command == 'update':
      bookmark = current_collection.find(receivedMessage['url'])
      if bookmark:
        if receivedMessage['title']:
          bookmark.title = receivedMessage['title']
        if receivedMessage['tags']:
          bookmark.add_tags(receivedMessage['tags'].split(','))
        nm.send("user-message", f"updated bookmark: {receivedMessage['url']}")
      continue
    if command == 'save':
      current_collection.write()
      nm.send("user-message", f'saved to: {current_collection.fpath}')
      continue
    if command == 'get-catalog':
      catalog = []
      bcc = BookmarkCollectionCatalog(collection_home)
      for collection in bcc.collections:
        isdefault = (collection.fpath.name == current_collection.fpath.name)
        catalog.append({ "filename": collection.fpath.name, "name": collection.name, "description": collection.description, "default": isdefault })
      nm.send("catalog", catalog)
      continue
    if command == 'get-collection-bookmarks':
      bookmarks = []
      for b in current_collection.bookmarks:
        bookmarks.append({ "url": b.url, "title": b.title, "tags": b.tags })
      nm.send("bookmarks", bookmarks)
      continue
    if command == 'set-current-collection':
      collection_fpath = collection_home / receivedMessage['name']
      current_collection = BookmarkCollection(collection_fpath)
      nm.send("user-message", f'set current collection to: {collection_fpath}')
