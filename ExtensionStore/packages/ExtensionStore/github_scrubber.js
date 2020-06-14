var webQuery = new NetworkConnexionHandler();

Logger.level = 2;

function test() {
  var store = new Store()
  var localList = new LocalExtensionList(store);
  var extensions = store.extensions;

  var log = new Logger("testing")

  // log(extensions.map(function (x) { return JSON.stringify(x.package, null, "  ") }));

  for (var i in extensions) {
    log.debug(JSON.stringify(extensions[i].package, null, "  "))
    log.log("is extension " + store.extensions[i].name + " installed? " + localList.isInstalled(store.extensions[i]))
    //log(store.extensions[i].install());
  }
}


// Store Class ----------------------------------------------
/**
 * @constructor
 * @classdesc
 * The Store class is used to search the github repos for available extensions
 */
function Store() {
  this.log = new Logger("Store")
  this.log.log("init store")

}



/**
 * The list of repositories urls scrubbed by the scrubber, defined in the REPOSLIST file.
 */
Object.defineProperty(Store.prototype, "sellers", {
  get: function () {
    if (typeof this._sellers === 'undefined') {
      this.log.debug("getting sellers");
      var sellersFile = "https://raw.githubusercontent.com/mchaptel/TBScripts/master/ExtensionStore/packages/ExtensionStore/SELLERSLIST";
      try {
        var sellersList = webQuery.get(sellersFile);
        this.log.debug(sellersList)
      } catch (err) {
        throw new Error("invalid SELLERSLIST file");
      }

      this._sellers = sellersList.map(function (x) { return new Seller(x) });
    }
    return this._sellers;
  }
});


/**
 * The list of repositories objects amongst all the store sellers, defined in the SELLERSLIST file.
 */
Object.defineProperty(Store.prototype, "repositories", {
  get: function () {
    if (typeof this._repositories === 'undefined') {
      this.log.debug("getting repositories");
      var sellers = this.sellers;
      var repositories = [];

      for (var i in sellers) {
        repositories = repositories.concat(sellers[i].repositories)
      }

      this._repositories = repositories;
    }
    return this._repositories;
  }
});


/**
 * The extensions available in the store, as an object with a key for each extension id.
 * @name Store#extensions
 * @type {Object}
 */
Object.defineProperty(Store.prototype, "extensions", {
  get: function () {
    if (typeof this._extensions === 'undefined') {
      this.log.debug("getting the list of  available extensions.")

      var repos = this.repositories;
      var extensions = [];
      this._extensions = {};

      for (var i in repos) {
        var reposExtensions = repos[i].extensions;
        if (reposExtensions == null) continue;

        extensions = extensions.concat(reposExtensions);
      }

      for (var i in extensions) {
        this._extensions[extensions[i].id] = extensions[i];
      }
    }

    return this._extensions;
  }
})


/**
 * The extension object representing the store
 */
Object.defineProperty(Store.prototype, "storeExtension", {
  get: function () {
    if (typeof this._storeExtension === 'undefined') {
      var storePackage = webQuery.get("https://raw.githubusercontent.com/mchaptel/TBScripts/master/ExtensionStore/packages/ExtensionStore/tbpackage.json")
      this._storeRepository = new Repository(storePackage.repository)
      this._storeExtension = new Extension(this._storeRepository, storePackage);
    }
    return this._storeExtension
  }
})



/**
 * The contents of the local tbpackage.json file
 */
Object.defineProperty(Store.prototype, "localPackage", {
  get: function () {
    if (typeof this._localPackage === 'undefined') {
      this._localPackage == {}

      var packageFile = currentFolder + "/tbpackage.json";
      var storePackage = readFile(packageFile);
      if (storePackage == null) return null;
      this._localPackage = JSON.parse(storePackage);
    }
    return this._localPackage;
  }
})


// Seller Class ------------------------------------------------
/**
 * @constructor
 * @classdesc
 * A Seller is a script maker, and can have several repositories.
 * However, each seller has to use a single tbpackage.json file to keep track of them.
 * This file will be used by the store to identify the extensions made by that seller.
 * Note: even though the nomenclature suggests it, there is no money transaction involved.
 * @param {string} repoUrl    the repo thqt contains the file tbpackage.json 
 */
function Seller(repoUrl) {
  this.log = new Logger("Seller");
  this.log.debug("init seller " + repoUrl)
  this._url = repoUrl;
  this.masterRepositoryName = repoUrl.replace("https://github.com/", "");
}


/**
 * The url of the seller master repository, formatted to download the file from the master branch
 * @name Seller#dlUrl
 * @type {string}
 */
Object.defineProperty(Seller.prototype, "dlUrl", {
  get: function () {
    return "https://raw.githubusercontent.com/" + this.masterRepositoryName + "master";
  }
});


/**
 * Gets the package file that describes all the extensions of the seller
 */
Object.defineProperty(Seller.prototype, "package", {
  get: function () {
    this.log.debug("getting package for " + this.masterRepositoryName);
    if (typeof this._tbpackage === 'undefined') {
      this._tbpackage = {};
      var tbpackage = webQuery.get(this.dlUrl + "/tbpackage.json");

      if (tbpackage.hasOwnProperty("message")) {
        if (tbpackage.message == "Not Found") {
          this.log.error("Package file not present in repository : " + this._url);
          return null;
        }
        if (tbpackage.message == "400: Invalid request") {
          this.log.error("Couldn't reach repository : " + this._url + ". Make sure it is a valid github address.");
          return null;
        }
      }

      this.log.debug(JSON.stringify(tbpackage, null, "  "));
      this._tbpackage = tbpackage;
    }
    return this._tbpackage;
  },
  set: function (packageObject) {
    this._tbpackage = {
      "name": this.name,
      "website": this._url,
      "social": "",
      "repository": this._url,
      "extensions": [],
    }

    for (var i in packageObject) {
      if (this._tbpackage.hasOwnProperty(i)) this._tbpackage[i] = packageObject[i];
    }

    var extensions = this.extensions;
    for (var i in extensions) {
      this._tbpackage.extensions.push(extensions[i].package)
    }
  }
});


/**
 * The seller name
 */
Object.defineProperty(Seller.prototype, "name", {
  get: function () {
    if (typeof this._name === 'undefined') {
      var tbpackage = this.package;
      if (tbpackage == null) return this.masterRepositoryName;
      this._name = tbpackage.name;
    }
    return this._name;
  }
})


/**
 * get the github url for the user associated with the master Repository.
 * @type {string}
 */
Object.defineProperty(Seller.prototype, "apiUrl", {
  get: function () {
    return "https://api.github.com/users/" + this.masterRepositoryName.split("/")[0];
  }
});


/**
 * Get the icon url for the user associated with the master repository
 * @type {string}
 */
Object.defineProperty(Seller.prototype, "iconUrl", {
  get: function () {
    if (typeof this._icon === 'undefined') {
      var userInfo = webQuery.get(this.apiUrl);
      if (!userInfo.hasOwnProperty("avatar_url")) this._icon = "";
      this._icon = userInfo.avatar_url;
    }
    return this._icon
  }
})


/**
 * Get the repositories for this seller
 * @type {Repository[]}
 */
Object.defineProperty(Seller.prototype, "repositories", {
  get: function () {
    this.log.debug("getting seller repositories for seller " + this._url);
    if (typeof this._repositories === 'undefined') {
      this._repositories = [];
      var tbpackage = this.package;
      if (tbpackage == null) return this._repositories;

      // use a repositories object to avoid duplicates
      var extensionsPackages = tbpackage.extensions;
      var repositories = {};
      for (var i in extensionsPackages) {
        var repoName = extensionsPackages[i].repository;
        if (!repositories.hasOwnProperty(repoName)) {
          repositories[repoName] = new Repository(repoName);
          repositories[repoName]._extensions = [];
          this._repositories.push(repositories[repoName]);
        }

        // add extensions directly when getting repository
        var repository = repositories[repoName];
        var extension = new Extension(repository, extensionsPackages[i]);
        repository._extensions.push(extension);
      }
    }
    return this._repositories;
  }
});


/**
 * Get the object containing all the extensions for this seller. Each key corresponds to an extension id.
 * @type {object}
 */
Object.defineProperty(Seller.prototype, "extensions", {
  get: function () {
    this.log.debug("getting extensions from seller " + this.name)
    if (typeof this._extensions === 'undefined') {
      var extensions = {}
      for (var i in this.repositories) {
        for (var j in this.repositories[i].extensions) {
          var extension = this.repositories[i].extensions[j]
          extensions[extension.id] = extension;
        }
      }
      this._extensions = extensions;
    }
    return this._extensions;
  }
});


/**
 * function used to add a new extension to a seller package. Extensions created that way cannot be installed or downloaded.
 * @param {string}  name     The name to give the new extension
 */
Seller.prototype.addExtension = function (name) {
  var extensions = this.extensions
  for (var i in extensions) {
    if (extensions[i].name == name) {
      throw new Error("Seller " + this.name + " already has an extension named " + name);
    }
  }

  var extension = new Extension(new Repository(this._url), { name: name, version: "1.0.0" });
  extension.package = { name: name, version: "1.0.0" }
  this._extensions[extension.id] = extension;

  return extension
}


/**
 * removes an extension from the seller by providing its id
 */
Seller.prototype.removeExtension = function (id) {
  var repository = this._extensions[id].repository;
  var ids = repository.extensions.map(function (x) { return x.id });
  repository.extensions.splice(ids.indexOf(id), 1);
  delete this._extensions[id];
}


/**
 * renames the given extension
 */
Seller.prototype.renameExtension = function (id, name) {
  var extension = this._extensions[id];
  var repository = extension.repository;

  this.removeExtension(id);
  extension.name = name;

  this._extensions[extension.id] = extension;
  repository._extensions.push(extension);
}


/**
 * Generate a package file from the Seller
 */
Seller.prototype.exportPackage = function (destination) {
  var extensions = this.extensions;
  var tbpackage = { name: this.name, website: this.package.website, social: this.package.social, repository: this._url, extensions: [] }

  for (var i in extensions) {
    tbpackage.extensions.push(extensions[i].package)
  }

  writeFile(destination, JSON.stringify(tbpackage, null, " "));
}


/**
 * @param {string}  packageFile  the path of the file to load the package from
 */
Seller.prototype.loadFromFile = function (packageFile) {
  var tbpackage = JSON.parse(readFile(packageFile));
  this.package = tbpackage;
}

// Repository Class --------------------------------------------
/**
 * @constructor
 * @classdesc
 * The class describing and accessing github repositories.
 * @property {String}  apiUrl         the api url of the repo used in the webqueries
 * @property {Package} package        instance of the package class that holds the package informations
 * @property {Object}  contents       parsed json from the api query
 */
function Repository(url) {
  this.log = new Logger("Repository")
  if (url.slice(-1) != "/") url += "/";
  this._url = url;
  this.name = this._url.replace("https://github.com/", "")
}


/**
 * The url of the repository, formatted to be used by the github api
 * @name Repository#apiUrl
 * @type {string}
 */
Object.defineProperty(Repository.prototype, "apiUrl", {
  get: function () {
    return "https://api.github.com/repos/" + this.name;
  }
});


/**
 * The url of the repository, formatted to download the file from the master branch
 * @name Repository#dlUrl
 * @type {string}
 */
Object.defineProperty(Repository.prototype, "dlUrl", {
  get: function () {
    return "https://raw.githubusercontent.com/" + this.name + "master";
  }
});


/**
 * The github url describing the extensions available on this repository
 * @name Repository#package
 * @type {object}  the json object contained in the tbpackage.json file on the repository
 * @deprecated json packages are now the responsibility of the Seller class
 */
Object.defineProperty(Repository.prototype, "package", {
  get: function () {
    this.log.debug("getting repos package for repo " + this.apiUrl);
    if (typeof this._package === 'undefined') {
      var tbpackage = webQuery.get(this.dlUrl + "/tbpackage.json");

      if (tbpackage.hasOwnProperty("message")) {
        if (tbpackage.message == "Not Found") {
          this.log.error("Package file not present in repository : " + this._url);
          return null;
        }
        if (tbpackage.message == "400: Invalid request") {
          this.log.error("Couldn't reach repository : " + this._url + ". Make sure it is a valid github address.")
          return null;
        }
      }

      this._package = tbpackage;
    }
    return this._package;
  }
});


/**
 * List the list of files at the root of the repository
 * @name Repository#contents
 * @type {Object}
 */
Object.defineProperty(Repository.prototype, "contents", {
  get: function () {
    this.log.debug("getting repos contents for repo " + this.apiUrl);
    if (typeof this._contents === 'undefined') {
      var contents = webQuery.get(this.masterBranchTree + "?recursive=true");
      if (!contents) return null;

      var tree = contents.tree;

      this.log.debug(JSON.stringify(tree, null, " "));
      // this._contents = tree;

      var files = tree.map(function (file) {
        if (file.type == "tree") return {path:"/" + file.path + "/", size: file.size};
        if (file.type == "blob") return {path:"/" + file.path, size: file.size};
      })
      this._contents = files;
    }
    return this._contents;
  }
});


/**
 * The list of extensions present on the repository. This can also be set by passing a list of json packages.
 * @name Repository#extensions
 * @type {Extension[]}
 * @deprecated This function was building extensions based on package but Seller now takes that role
 */
Object.defineProperty(Repository.prototype, "extensions", {
  get: function () {
    this.log.debug("getting repos extensions for repo " + this.apiUrl);
    if (typeof this._extensions === 'undefined') {
      this._extensions = [];

      // read package file from repository
      var packageFile = this.package;
      if (!packageFile) return this._extensions;

      var extensions = [];
      for (var i in packageFile) {
        extensions.push(new Extension(this, packageFile[i]));
      }

      this._extensions = extensions;
    }

    return this._extensions;
  }
});



/**
 * The git tree url for the master branch of this repository
 * @type {string} The url of the tree file representing the contents of a repository
 */
Object.defineProperty(Repository.prototype, "masterBranchTree", {
  get: function () {
    if (typeof this._tree === 'undefined') {
      this.log.debug(this.apiUrl + "branches/master")
      var tree = webQuery.get(this.apiUrl + "branches/master");
      if (tree) this._tree = tree.commit.commit.tree.url;   // the query returns a big object in which this is the address of the contents tree
    }
    return this._tree
  }
});


/**
 * Gets the list of file descriptions matching the filter in the specified folder of the repository.
 * @param {string} folder    The subfolder related to the root of the repo in which to look for files
 * @param {string} filter    A file search filter
 * @example
 * // files json contain the following fields:
 * {
 *  "path": "openHarmony_install.js",
 *  "mode": "100644",
 *  "type": "blob",
 *  "sha": "4bede358579e1a6faee72ccf37f8c84228bd742f",
 *  "size": 8683,
 *  "url": "https://api.github.com/repos/cfourney/OpenHarmony/git/blobs/4bede358579e1a6faee72ccf37f8c84228bd742f"
 * }
 */
Repository.prototype.getFiles = function (filter) {
  if (typeof filter === 'undefined') var filter = /.*/;

  var contents = this.contents;
  var paths = this.contents.map(function(x){return x.path})

  this.log.debug(paths.join("\n"))
  var search = this.searchToRe(filter)

  this.log.debug("getting files in repository that match search " + search)

  var results = []
  for (var i in paths) {
    // add files that match the filter but not folders
    if (paths[i].match(search) && paths[i].slice(-1)!="/") results.push(contents[i])
  }

  return results;
}


/**
 * @private
 * converts a file system type search to a regex
 */
Repository.prototype.searchToRe = function (search) {
  if (search.slice(-1) == "/") search += "*";

  // sanitize input to prevent broken regex
  search = search.replace(/\./g, "\\.")
                 // .replace(/\*/g, "[^/]*")   // this is to avoid selecting subfolders contents but do we want that?
                 .replace(/\*/g, ".*")
                 .replace(/\?/g, ".");

  var searchRe = new RegExp("^" + search + "$", "i");

  return searchRe;
}



// Extension Class ---------------------------------------------------
/**
 * @classdesc
 * The Extension Class models a single extension from a repository. It allows reading of the package file, the list of files, to install it, etc.
 * @property
 * @param {object} tbpackage     The part of a tbpackage object describing this extension
 */
function Extension(repository, tbpackage) {
  this.log = new Logger("Extension")
  this.repository = repository
  this._name = tbpackage.name;
  this.version = tbpackage.version;
  this.package = tbpackage;
}


Object.defineProperty(Extension.prototype, "name", {
  get: function () {
    return this._name;
  },
  set: function (newName) {
    this._name = newName;
    this.package.name = newName;
  }
})

/**
 * Get the json package describing this extension. Thanks to this getter setter, we can ensure the package file is complete even with an obsolete json
 */
Object.defineProperty(Extension.prototype, "package", {
  get: function () {
    return this._package;
  },
  set: function (packageObject) {
    this._package = {
      "name": this.name,
      "version": this.version,
      "compatibility": "Harmony Premium 16",
      "description": "",
      "repository": this.repository._url,
      "isPackage": false,
      "files": [],
      "keywords": [],
      "author": "",
      "license": "",
      "website": this.repository._url,
      "localFiles": ""
    };

    // we remove the obsolete/ extra entries
    for (var i in packageObject) {
      if (this._package.hasOwnProperty(i)) this._package[i] = packageObject[i];
    }
  }
})


/**
 * The highest level folder on the repository that includes files included in this extension
 * @name Extension#rootFolder
 * @type {object}
 */
Object.defineProperty(Extension.prototype, "rootFolder", {
  get: function () {
    if (typeof this._rootFolder === 'undefined') {
      var files = this.package.files;
      if (files.length == 1) {
        this._rootFolder = files[0].slice(0, files[0].lastIndexOf("/")+1);
      } else {
        var folders = files[0].split("/");
        var rootFolder = "";

        mainLoop:
        for (var i = 0; i < folders.length; i++) {
          var folder = folders.slice(0, i).join("/")+"/";
          for (var j in files) {
            if (files[j].indexOf(folder) == -1) break mainLoop;
          }
          rootFolder = folder;
        }
        this._rootFolder = rootFolder;
      }
    }
    this.log.debug("rootfolder: "+this._rootFolder)
    return this._rootFolder;
  }
});


/**
 * The complete list of files corresponding to this extension
 * @name Extension#files
 * @type {object}
 * @example
 * // files json contain the following fields:
 * {
 *   "name": "configure.js",
 *   "path": "ScriptsShortcuts/packages/ScriptsShortcuts/configure.js",
 *   "sha": "1ad6843dfddd6d296fa69861707e482db2629c3d",
 *   "size": 2890,
 *   "url": "https://api.github.com/repos/mchaptel/TBScripts/contents/ScriptsShortcuts/packages/ScriptsShortcuts/configure.js?ref=master",
 *   "html_url": "https://github.com/mchaptel/TBScripts/blob/master/ScriptsShortcuts/packages/ScriptsShortcuts/configure.js",
 *   "git_url": "https://api.github.com/repos/mchaptel/TBScripts/git/blobs/1ad6843dfddd6d296fa69861707e482db2629c3d",
 *   "download_url": "https://raw.githubusercontent.com/mchaptel/TBScripts/master/ScriptsShortcuts/packages/ScriptsShortcuts/configure.js",
 *   "type": "file",
 *   "_links": {
 *     "self": "https://api.github.com/repos/mchaptel/TBScripts/contents/ScriptsShortcuts/packages/ScriptsShortcuts/configure.js?ref=master",
 *     "git": "https://api.github.com/repos/mchaptel/TBScripts/git/blobs/1ad6843dfddd6d296fa69861707e482db2629c3d",
 *     "html": "https://github.com/mchaptel/TBScripts/blob/master/ScriptsShortcuts/packages/ScriptsShortcuts/configure.js"
 *   }
 * }
 */
Object.defineProperty(Extension.prototype, "files", {
  get: function () {
    if (typeof this._files === 'undefined') {
      var packageFiles = this.package.files;
      var files = [];

      for (var i in packageFiles) {
        this.log.debug("getting extension files matching : "+packageFiles[i])
        var results = this.repository.getFiles("/"+ packageFiles[i]);
        if (results.length > 0) files = files.concat(results);
      }

      this._files = files;
    }
    return this._files;
  }
})


/**
 * The id of this extension. Made of the repo name+extension name; 
 * @name Extension#id
 * @type {string}
 */
Object.defineProperty(Extension.prototype, "id", {
  get: function () {
    if (typeof this._id === 'undefined'){
      var repoName = this.package.repository.replace("https://github.com/", "")
      var id = (repoName + this.name).replace(/ /g, "_")
      this._id = id;
    }

    return this._id;
  }
})


/**
 * The list of the locations where all the extension files would be installed
 * @name Extension#localPaths
 * @type {string[]}
 */
Object.defineProperty(Extension.prototype, "localPaths", {
  get: function () {
    if (typeof this._localPaths === 'undefined') {
      var rootFolder = this.rootFolder;
      this._localPaths = this.files.map(function (x) { return x.path.replace(rootFolder, "") })
      // log ("file paths : "+this._localPaths)
    }
    return this._localPaths;
  }
})


/**
 * Output a json of the package of the extension
 */
Extension.prototype.toString = function () {
  return JSON.stringify(this.package, null, "  ");
}


/**
 * Checks wether an extension matches a search term
 * @param {string} search     the search term for the extension. Can use wildcard and partial matches.
 */
Extension.prototype.matchesSearch = function (search) {
  if (search == "") return true;

  // match all of the terms in the search, in any order, amongst the name and keywords
  search = RegExp("(?=.*" + search.split(" ").join(")(?=.*") + (").*"), "ig")

  var searchableString = this.name + "," + this.package.keywords.join(",")
  return (search.exec(searchableString));
}


/**
 * Check if the extension version is older than the specified version string
 * @param {string} version    a semantic version string separated by dots.
 */
Extension.prototype.currentVersionIsOlder = function (version) {
  version = version.split(".");
  var ownVersion = this.version.split(".");

  var length = Math.max(version.length > ownVersion.length);

  while (version.length < length) {
    version.push(0)
  }
  while (ownVersion.length < length) {
    ownVersion.push(0)
  }

  for (var i = 0; i < ownVersion.length; i++) {
    if (version[i] > ownVersion[i]) return true;
    if (version[i] < ownVersion[i]) return false;
  }
  return false;
}


// LocalExtensionList Class ----------------------------------------------
/**
 * @classdesc
 * The LocalExtensionList holds the locally installed extensions list and updates it.
 * @param {Store}   store    the store object that contains the available extensions
 */
function LocalExtensionList(store) {
  this.log = new Logger("LocalExtensionList")
  this._installFolder = specialFolders.userScripts;             // default install folder, can be modified with installFolder property
  this._listFile = specialFolders.userConfig + "/.extensionsList";
  this._ini = specialFolders.userConfig + "/.extensionStorePrefs"
  // if (this.list.length == 0) this.createListFile(store);              // initialize the list file that contains the extensions (!heavy! CBB: do it at a different time?)
}


/**
 * Set a customised install folder
 * @name LocalExtensionList#installFolder
 * @type {string}
 */
Object.defineProperty(LocalExtensionList.prototype, "installFolder", {
  get: function () {
    return this._installFolder;
  },
  set: function (newLocation) {
    this._installFolder = newLocation;
  }
});


/**
 * @name LocalExtensionList#extensions
 * @type {Extension[]}
 */
Object.defineProperty(LocalExtensionList.prototype, "extensions", {
  get: function () {
    if (typeof this._extensions === 'undefined') {
      this._extensions = {};

      var list = this.list;
      if (!list) return this._extensions;
      var extensions = list.map(function (x) { return new Extension("local", x) })
      for (var i in extensions) {
        this.log.debug("found installed extension " + extensions[i].id)
        this._extensions[extensions[i].id] = extensions[i];
      }
    }
    return this._extensions;
  }
});


/**
 * The contents of the local .extensionList file
 * @name LocalExtensionList#list
 * @type {string}
 */
Object.defineProperty(LocalExtensionList.prototype, "list", {
  get: function () {
    if (typeof this._list === 'undefined') {
      this._list = [];
      var listFile = this._listFile;
      var list = readFile(listFile);
      if (!list) return this._list;

      try {
        var json = JSON.parse(list);
        this._list = json;
      } catch (error) {
        this.log.error("Couldn't parse extension list. List file might be corrupted.");
        //make a backup and delete?
      }
    }
    return this._list;
  }
});


/**
 * gets the install location for a given extension
 */
LocalExtensionList.prototype.installLocation = function (extension) {
  return this.installFolder + (extension.package.isPackage ? "/packages/" + extension.name : "")
}


/**
 * Checks whether the extension is in the list of installed extensions.
 */
LocalExtensionList.prototype.isInstalled = function (extension) {
  var installList = this.extensions;
  return installList.hasOwnProperty(extension.id);
}


/**
 * Checks the integrity of the files of the locally installed extension
 */
LocalExtensionList.prototype.checkFiles = function (extension) {
  if (!this.isInstalled(extension)) return false;
  var localExtension = this.extensions[extension.id];
  var files = localExtension.package.localFiles;

  for (var i in files) {
    if (!(new File(files[i])).exists) return false;
  }

  return true;
}


/**
 * Installs the extension
 * @returns {bool}  the success of the installation
 */
LocalExtensionList.prototype.install = function (extension) {
  // if (this.isInstalled(extension)) return true;         // extension is already installed
  var downloader = new ExtensionDownloader(extension);  // dedicated object to implement threaded download later
  var installLocation = this.installLocation(extension)

  var files = downloader.downloadFiles();
  this.log.debug("downloaded files :\n" + files.join("\n"));
  var tempFolder = files[0];
  // move the files into the script folder or package folder
  recursiveFileCopy(tempFolder, installLocation);
  this.addToList(extension); // create a record of this installation

  return true;

}


/**
 * Remove the installation from the hard drive
 */
LocalExtensionList.prototype.uninstall = function (extension) {
  if (!this.isInstalled(extension)) return true    // extension isn't installed
  var localExtension = this.extensions[extension.id];

  var files = localExtension.package.localFiles;
  for (var i in files) {
    this.log.debug("removing file " + files[i])
    var file = new File(files[i])
    if (file.exists) file.remove();

    // remove containing folder if all files were removed
    var folder = files[i].slice(0, files[i].lastIndexOf("/") + 1);
    if (listFiles(folder).length == 0) (new Dir(folder)).rmdirs();
  }
  if (extension.package.isPackage) {
    var folder = new Dir(this.installFolder + "packages/" + extension.name);
    this.log.debug("removing folder " + folder.path)
    if (folder.exists) folder.rmdirs();
  }
  this.removeFromList(extension);

  return true;
}


/**
 * Adds an extension to the installed list
 */
LocalExtensionList.prototype.addToList = function (extension) {
  var installList = this.list;
  var installedPackage = deepCopy(extension.package);
  var installLocation = this.installLocation(extension)

  var files = extension.localPaths.map(function (x) { return installLocation + x });

  installedPackage.id = extension.id;
  installedPackage.localFiles = files;

  if (!this.isInstalled(extension)) {
    this.log.debug("adding to installed list " + extension.name);
    installList.push(installedPackage);
  } else {
    // if already installed, we update instead
    var index = installList.map(function (x) { return x.id }).indexOf(extension.id)
    installList.splice(index, 1, installedPackage)
  }

  installList = JSON.stringify(installList, null, "  ");

  writeFile(this._listFile, installList);

  // create new local extension object and add to this.extensions property
  var extension = new Extension("local", installedPackage)
  this.extensions[extension.id] = extension;
}


/**
 * Removes an extension from the install list
 */
LocalExtensionList.prototype.removeFromList = function (extension) {
  var installList = this.list;
  if (!this.isInstalled(extension)) return;

  var index = installList.map(function (x) { return x.id }).indexOf(extension.id);
  installList.splice(index, 1)

  installList = JSON.stringify(installList, null, "  ");

  writeFile(this._listFile, installList);
  delete this.extensions[extension.id];
}


/**
 * Clears the cached values of local installs to refresh the list
 */
LocalExtensionList.prototype.refreshExtensions = function () {
  delete this._extensions;
  var extensions = this.extensions;
  return extensions;
}



/**
 * goes through the store extensions and checks whether it is already installed even if not in the list
 */
LocalExtensionList.prototype.findInstalledExtensions = function (store) {
  var installedExtensions = [];
  for (var i in store.extensions) {
    var extension = store.extensions[i];
    var destPath = this.installLocation(extension);
    var extensionFiles = extension.localPaths.map(function (x) { return destPath + x });
    for (var i in extensionFiles) {
      if (new File(extensionFiles[i]).exists) {
        // found an extension, we add it to the list
        installedExtensions.push(extension);
        continue;
      }
    }
  }
  return installedExtensions;
}


/**
 * Creates a default list file by detecting existing extensions and adding the store extension
 * @param {Store} store    the store that contains extensions
 */
LocalExtensionList.prototype.createListFile = function (store) {
  var list = this.list;
  if (list.length == 0) this.addToList(store.storeExtension);
  var installedExtensions = this.findInstalledExtensions(store);
  for (var i in installedExtensions) {
    // isInstalled checks if the extension is in the list, so we'll use this to detect if we need to add it or not
    if (!this.isInstalled(installedExtensions[i])) this.addToList(installedExtensions[i]);
  }
  this.refreshExtensions();  // reload the new list and updates the extensions list
  return this.list;
}

/**
 * Access the custom settings
 */
Object.defineProperty(LocalExtensionList.prototype, "settings", {
  get: function(){
    if (typeof this._settings === 'undefined'){
      var ini = readFile(this._ini)
      if (!ini){
        var prefs = {};
      }else{
        var prefs = JSON.parse(ini);
      }
      this._settings = prefs;
    }
    return this._settings;
  },
  set: function(settingsObject){
    writeFile(this._ini, JSON.stringify(settingsObject, null, "  "))
  }
})

/**
 * Saves the specified data to a local file.
 * @param {string} name 
 * @param {string} value 
 */
LocalExtensionList.prototype.saveData = function(name, value){
  this.log.debug("saving data ", JSON.stringify(value, null, "  "), "under name", name)
  var prefs = this.settings;
  prefs[name] = value;
  this.settings = prefs;
}


/**
 * Loads data saved from a previous session.
 * @param {string} name           The key to retrieve the local data
 * @param {string} defaultValue   The default value in case the local data doesn't exist
 */
LocalExtensionList.prototype.getData = function(name, defaultValue){
  if (typeof defaultValue === 'undefined') defaultValue = "";
  this.log.debug("getting data", name, "defaultvalue:", (typeof defaultValue))
  var prefs = this.settings;
  if (typeof prefs[name] === 'undefined') return defaultValue;
  return prefs[name];
}


// ScriptDownloader Class --------------------------------------------
/**
 * @classdesc
 * @constructor
 */
function ExtensionDownloader(extension) {
  this.log = new Logger("ExtensionDownloader")
  this.log.level = this.log.LEVEL.LOG;
  this.repository = extension.repository;
  this.extension = extension;
  this.destFolder = specialFolders.temp + "/" + extension.name + "_" + extension.version;
}


/**
 * Downloads the files of the extension from the repository set in the object instance.
 * @returns [string[]]    an array of paths of the downloaded files location, as well as the destination folder at index 0 of the array.
 */
ExtensionDownloader.prototype.downloadFiles = function () {
  this.log.log("starting download of files from extension " + this.extension.name);
  var destFolder = this.destFolder;
  this.log.debug(this.extension instanceof Extension)
  var destPaths = this.extension.localPaths.map(function (x) { return destFolder + x });
  var dlFiles = [this.destFolder];

  // log ("destPaths: "+destPaths)

  var files = this.extension.files;

  this.log.debug("downloading files : "+files.map(function(x){return x.path}).join("\n"))

  for (var i = 0; i < files.length; i++) {
    // make the directory
    var dest = destPaths[i].split("/").slice(0, -1).join("/")
    var dir = new QDir(dest);
    if (!dir.exists()) dir.mkpath(dest);

    webQuery.download(this.getDownloadUrl(files[i].path), destPaths[i]);
    var dlFile = new File(destPaths[i]);
    if (dlFile.size == files[i].size) {
      // download complete!
      this.log.debug("successfully downloaded " + files[i].path + " to location : " + destPaths[i])
      dlFiles.push(destPaths[i])
    } else {
      throw new Error("Downloaded file " + destPaths[i] + " size does not match expected size : " + dlFile.size + " " + files[i].size)
    }
  }

  return dlFiles;
}


ExtensionDownloader.prototype.getDownloadUrl = function (filePath) {
  return this.extension.repository.dlUrl + filePath;
}


// NetworkConnexionHandler Class --------------------------------------
/**
 * @constructor
 * @classdesc
 * The NetworkConnexionHandler class handles web queries and downloads. It uses curl for communicating with the remote apis. <br>
 * This class extends QObject so it can broadcast signals and be threaded.
 * @extends QObject
 */
function NetworkConnexionHandler() {
  this.curl = new CURL()
}


/**
 * Makes a network request and get the result as a parsed JSON.
 */
NetworkConnexionHandler.prototype.get = function (command) {
  if (typeof command == "string") command = [command]
  var result = this.curl.get(command);
  // handle errors
  try {
    json = JSON.parse(result)
    return json;
  }
  catch (error) {
    this.curl.log.error("command " + command + " did not return a valid JSON : " + result);
    return { error: error, message: result };
  }
}


/**
 * Makes a download request for the given file url, and downloads it to the chosen location
 */
NetworkConnexionHandler.prototype.download = function (url, destinationPath) {
  url = url.replace(/ /, "%20")
  destinationPath = destinationPath.replace(/ /, "%20")
  
  var command = ["-L", "-o", destinationPath, url];
  var result = this.curl.get(command, 30000); // 30s timeout
  return result
}


// CURL Class --------------------------------------------------------
/**
 * Curl class to launch curl queries
 * @classdesc
 * @constructor
 * @param {string[]} command
 */
function CURL() {
  this.log = new Logger("CURL")
}


/**
 * Queries the GraphQL Github API V4 with a curl process (requires authentication)
 * @param {string}  query     a query object that will be wrapped in an object and converted to JSON.
 * @example
 * // query the files list
 *  var query = "\"query\" : \"{ repository(name: $repoName) { commit(rev: \"HEAD\") { tree(path: \"$folder\", recursive: true) { entries { path isDirectory url } } } } }\""
 *
 * // query a file content
 *  var query = query "{ repository(name: $repoName) { defaultBranch { target { commit { blob(path: "$path") { content } } } } } }"
 *
 * // more : https://docs.sourcegraph.com/api/graphql/examples
 * // more info about authentication : https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/
 */
CURL.prototype.query = function (query, wait) {
  if (typeof wait === 'undefined') var wait = 5000;
  try {
    var p = new QProcess();
    var bin = this.bin;

    this.log.debug("starting process :" + bin + " " + command);
    var command = ["-H", "Authorization: Bearer YOUR_JWT", "-H", "Content-Type: application/json", "-X", "POST", "-d"];
    query = query.replace(/\n/gm, "\\\\n").replace(/"/gm, '\\"');
    command.push('" \\\\n' + query + '"');
    command.push("https://api.github.com/graphql");

    p.start(bin, command);

    p.waitForFinished(wait);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    //log ("json: "+output);

    return output;
  } catch (err) {
    this.log.error("Error with curl command: \n"+command.join(" ")+"\n"+err);
    return null;
  }
}


/**
 * Queries the REST Github API v3 with a curl process
 */
CURL.prototype.get = function (command, wait) {
  if (typeof wait === 'undefined') var wait = 5000;
  try {
    var p = new QProcess();
    var bin = this.bin;

    // The toonboom bundled curl doesn't seem to be equiped for ssh so we have to use unsafe mode
    if (bin.indexOf("ToonBoom") != -1) command = ["-k"].concat(command)

    this.log.debug("starting process :" + bin + " " + command);
    p.start(bin, command);

    p.waitForFinished(wait);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    this.log.debug("json: " + output);

    return output;
  } catch (err) {
    this.log.error("Error with curl command: \n"+command.join(" ")+"\n"+err);
    return null;
  }
}



/**
 * find the curl executable
 */
Object.defineProperty(CURL.prototype, "bin", {
  get: function () {
    this.log.debug("getting curl bin")

    if (typeof CURL.__proto__.bin === 'undefined') {
      if (about.isWindowsArch()) {
        var curl = [System.getenv("windir") + "/system32/curl.exe",
        System.getenv("ProgramFiles") + "/Git/mingw64/bin/curl.exe",
        specialFolders.bin + "/bin_3rdParty/curl.exe"];
      } else {
        var curl = ["/usr/bin/curl",
          "/usr/local/bin/curl",
          specialFolders.bin + "/bin_3rdParty/curl"];
      }

      for (var i in curl) {
        if ((new File(curl[i])).exists) {
          CURL.__proto__.bin = curl[i];
          return curl[i];
        }
      }

      throw new Error("cURL wasn't found. Install cURL first.");
    } else {
      return CURL.__proto__.bin;
    }
  }
})


// log a series of values to the messageLog and command line window. Can pass as many arguments as necessary.

// Logger class -------------------------------------------------------
/**
 * @constructor
 * @classdesc
 * The Logger class allows to output messages to the log with different levels
 * @param {string} [name]
 */
function Logger(name) {
  if (typeof name === 'undefined') var name = "";
  this.name = name;
  // by default will only output errors and log
  this.LEVEL = { "ERROR": 0, "LOG": 1, "DEBUG": 2 };
  if (typeof Logger.level === 'undefined') Logger.level = this.LEVEL.LOG;
}


/**
 * Outputs a message only if the logger is set to output a level of verbosity equal to LOG
 */
Logger.prototype.log = function () {
  if (Logger.level >= this.LEVEL.LOG) this.trace([].slice.call(arguments));
}

/**
 * Outputs a message only if the logger is set to output a level of verbosity equal to DEBUG
 */
Logger.prototype.debug = function () {
  if (Logger.level >= this.LEVEL.DEBUG) this.trace([].slice.call(arguments));
}


/**
 * Outputs a message only if the logger is set to output a level of verbosity equal to ERROR
 */
Logger.prototype.error = function () {
  if (Logger.level >= this.LEVEL.ERROR) this.trace([].slice.call(arguments));
}


/**
 * Outputs the given message. Used internally.
 */
Logger.prototype.trace = function (message) {
  if (this.name) var message = this.name + ": " + message.join(" ");
  try {
    MessageLog.trace(message);
    System.println(message);
  } catch (err) {
    for (var i in message) {
      this.trace(message)
    }
  }
}


// Helper functions ---------------------------------------------------

// reads a local file and return the contents
function readFile(filename) {
  var file = new File(filename);

  try {
    if (file.exists) {
      file.open(FileAccess.ReadOnly);
      var string = file.read();
      file.close();
      return string;
    }
  } catch (err) { }
  return null;
}


// writes the contents to the specified filename.
function writeFile(filename, content, append) {
  var log = new Logger("helpers");
  if (typeof append === 'undefined') var append = false;

  log.debug("writing file " + filename);

  var file = new File(filename);
  try {
    if (append) {
      file.open(FileAccess.Append);
    } else {
      file.open(FileAccess.WriteOnly);
    }
    file.write(content);
    file.close();
    return true;
  } catch (err) { return false; }
}


// gets the list of files in the folder that match the filter
function listFiles(folder, filter) {
  if (typeof filter === 'undefined') var filter = "*"

  var dir = new QDir;
  dir.setPath(folder);
  dir.setNameFilters([filter]);
  dir.setFilter(QDir.Files);
  var files = dir.entryList();

  return files;
}

// returns the folder of this file
var currentFolder = __file__.split("/").slice(0, -1).join("/");
if (currentFolder.indexOf("repo") == -1) Logger.level = 1;   // disable logging if extension isn't in a repository


// make a deep copy of an object
function deepCopy(object) {
  var copy = JSON.parse(JSON.stringify(object))
  return copy;
}


// recursive copy of folders content
function recursiveFileCopy(folder, destination) {
  var log = new Logger("helpers")
  log.debug("copying files from folder " + folder + " to destination " + destination);
  try {
    var p = new QProcess();

    if (about.isWindowsArch()) {
      var bin = "robocopy";
      var command = ["/E", "/TEE", "/MOV", folder, destination];
    } else {
      var bin = "cp";
      var command = ["-Rv", folder, destination];
    }

    // log ("starting process :"+bin+" "+command);
    p.start(bin, command);

    p.waitForFinished(-1);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    log.debug("copy results: " + output);

    return output;
  } catch (err) {
    log.error("error on line "+err.lineNumber+" of file "+err.fileName+": \n"+err);
    return null;
  }
}


exports.Store = Store;
exports.LocalExtensionList = LocalExtensionList;
exports.Seller = Seller;
exports.Repository = Repository;
exports.Logger = Logger;
exports.currentFolder = currentFolder;