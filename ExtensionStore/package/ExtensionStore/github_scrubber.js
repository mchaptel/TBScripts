
var webQuery = new NetworkConnexionHandler();

function test(){
  var store = new Store()
  var localList = new LocalExtensionList();
  var extensions = store.extensions;

  log(extensions.map(function(x){return JSON.stringify(x.package, null, "  ")}));

  for (var i in extensions){
    log("is extension "+store.extensions[i].name+" installed? "+localList.isInstalled(store.extensions[i]))
    //log(store.extensions[i].install());
  }
}


// Store Class ----------------------------------------------
/**
 * @constructor
 * @classdesc
 * The Store class is used to search the github repos for available extensions
 */
function Store(){
  log("init store") 
}


/**
 * The list of repositories urls scrubbed by the scrubber, defined in the REPOSLIST file.
 */
Object.defineProperty(Store.prototype, "repositories", {
  get: function(){
    if (typeof this._repositories === 'undefined'){
      log ("getting repositories");
      var reposFile = currentFolder+"/REPOSLIST";
      try{
      var reposList = JSON.parse(readFile(reposFile));
      //log(reposList)
      }catch(err){
        throw new Error("invalid REPOSLIST file");
      }

      this._repositories = reposList.map(function(x){return new Repository(x)});
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
  get: function(){
    if (typeof this._extensions === 'undefined'){
      log ("getting the list of  available extensions.")
      var repos = this.repositories;
      var extensions = [];
      this._extensions = {};

      for (var i in repos){
        var reposExtensions = repos[i].extensions;
        if (reposExtensions == null) continue;

        extensions = extensions.concat(reposExtensions);
      }

      for (var i in extensions){
        this._extensions[extensions[i].id] = extensions[i];
      }
    }

    return this._extensions;
  }
})


// Repository Class --------------------------------------------
/**
 * @constructor
 * @classdesc
 * The class describing and accessing github repositories.
 * @property {string}  apiUrl         the api url of the repo used in the webqueries
 * @property {Package} package        instance of the package class that holds the package informations
 * @property {Object}  contents       parsed json from the api query
 */
function Repository (url){
  this._url = url;
  this.name = this._url.replace("https://github.com/", "")
}


/**
 * The url of the repository, formatted to be used by the github api
 * @name Repository#apiUrl
 * @type {string}
 */
Object.defineProperty(Repository.prototype, "apiUrl", {
  get: function(){
    return "https://api.github.com/repos/"+this.name;
  }
});


/**
 * The url of the repository, formatted to download the file from the master branch
 * @name Repository#dlUrl
 * @type {string}
 */
Object.defineProperty(Repository.prototype, "dlUrl", {
  get: function(){
    return "https://raw.githubusercontent.com/"+this.name+"master/";
  }
});


/**
 * The github url describing the extensions available on this repository
 * @name Repository#package
 * @type {object}  the json object contained in the tbpackage.json file on the repository
 */
Object.defineProperty(Repository.prototype, "package", {
  get: function(){
    log ("getting repos package for repo "+this.apiUrl);
    if (typeof this._package === 'undefined'){
      var tbpackage = webQuery.get(this.dlUrl+"tbpackage.json");

      if (tbpackage.hasOwnProperty("message")){
        if (tbpackage.message == "Not Found"){
          log("Package file not present in repository : "+this._url);
          return null;
        }
        if (tbpackage.message == "400: Invalid request"){
          log("Couldn't reach repository : "+this._url+". Make sure it is a valid github address.")
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
  get: function(){
    log ("getting repos contents for repo "+this.apiUrl);
    if (typeof this._contents === 'undefined'){
      var contents = webQuery.get(this.tree+"?recursive=true");
      if (contents) this._contents = contents;
    }
    return this._contents;
  }
});


/**
 * The list of extensions present on the repository
 * @name Repository#extensions
 * @type {Extension[]}
 */
Object.defineProperty(Repository.prototype, "extensions", {
  get: function(){
    log ("getting repos extensions for repo "+this.apiUrl);
    if (typeof this._extensions === 'undefined'){
      this._extensions = [];
      
      // read package file from repository
      var packageFile = this.package;
      if (!packageFile) return this._extensions;

      var extensions = [];
      for (var i in packageFile){
        extensions.push(new Extension(this, packageFile[i]));
      }

      this._extensions = extensions;
    }

    return this._extensions;
  }
});


Object.defineProperty(Repository.prototype, "masterBranchTree", {
  get:function(){
    if (typeof this._tree === 'undefined'){
      var tree = webQuery(this.apiUrl+"branches/master");
      if (tree) this._tree = tree.tree.url;
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
Repository.prototype.getFiles = function(folder, filter){
  if (typeof filter === 'undefined') var filter = /.*/;
  if (typeof filter === 'string'){
    if (filter == "") filter = "*"           // empty string for filter is a matchall expression
    filter = filter.replace(/\./g, "\\.");   // escape dots in filter before changing into regex
    filter = filter.replace(/\*/g, ".*");  // transform * into regex wildcard search
    filter = RegExp(filter, "i");            // add ignore case flag and convert string to regex
  }

  log("getting files inside "+folder+" that match filter "+filter)

  var url = this.apiUrl+"contents/"+folder;

  var search = [];

  var files = webQuery.get(url);
  for (var i in files){
    if (files[i].type == "file" && files[i].name.match(filter)) search.push(files[i]);
    if (files[i].type == "dir") search = search.concat(this.getFiles(folder+"/"+files[i].name));
  }

  return search;
}


// Extension Class ---------------------------------------------------
/**
 * @classdesc
 * The Extension Class models a single extension from a repository. It allows reading of the package file, the list of files, to install it, etc.
 * @property
 * @param {object} tbpackage     The part of a tbpackage object describing this extension
 */
function Extension(repository, tbpackage){
  this.repository = repository
  this.name = tbpackage.name;
  this.version = tbpackage.version;

  // set properties based on json
  this.package = tbpackage;
}


/**
 * The complete list of files corresponding to this extension
 * @name Extension#rootFolder
 * @type {object}
 */
Object.defineProperty(Extension.prototype, "rootFolder", {
  get: function(){
    if (typeof this._rootFolder === 'undefined'){
      this._rootFolder = "";
      var files = this.package.files;
      for (var i in files){
        // looking for a folder in the package files list
        if (files[i].slice(-1) == "/"){
          this._rootFolder = files[i];
          break;
        }
      }
    }

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
  get: function(){
    if (typeof this._files === 'undefined'){
      var packageFiles = this.package.files;
      var files = [];

      for (var i in packageFiles){
        var file = packageFiles[i].split("/");
        var search = file.pop();
        var folder = file.join("/");  
        
        // log (folder, search)

        var results = this.repository.getFiles(folder, search)
        if (results.length > 0) files = files.concat(results);
      }

      this._files = files;
    }
    return this._files;
  }
})


/**
 * @name Extension#localPaths
 * @type {string[]}
 */
Object.defineProperty(Extension.prototype, "id", {
  get: function(){
    if (typeof this._id === 'undefined'){
      this._id = (this.repository.name+this.name).replace(/ /g, "_")
    }
    return this._id;
  }
})

/**
 * @name Extension#localPaths
 * @type {string[]}
 */
Object.defineProperty(Extension.prototype, "localPaths", {
  get: function(){
    if (typeof this._localPaths === 'undefined'){
      var rootFolder = this.rootFolder;
      this._localPaths = this.files.map(function(x){return x.path.replace(rootFolder, "")})
      // log ("file paths : "+this._localPaths)
    }
    return this._localPaths;
  }
})


/**
 * Convert to a string
 */
Extension.prototype.toString = function(){
  return JSON.stringify(this.package, null, "  ");
}


/**
 * Checks wether an extension matches a search term
 */
Extension.prototype.matchesSearch = function(search){
  if (search == "") return true;
  return (this.name.indexOf(search)!= -1 || this.package.keywords.join("").indexOf(search) != -1);
}

// LocalExtensionList Class ----------------------------------------------
/**
 * @classdesc
 * The LocalExtensionList holds the locally installed extensions list and updates it.
 */
function LocalExtensionList(){
  this._installFolder = specialFolders.userScripts+"/";   // default install folder, can be modified with installFolder property
  this._listFile = specialFolders.userConfig+"/.extensionsList";
}


/**
 * Set a customised install folder
 * @name LocalExtensionList#installFolder
 * @type {string}
 */
Object.defineProperty(LocalExtensionList.prototype, "installFolder", {
  get: function(){
    return this._installFolder;
  },
  set: function(newLocation){
    this._installFolder = newLocation;
  }
});


/**
 * @name LocalExtensionList#extensions
 * @type {Extension[]}
 */
Object.defineProperty(LocalExtensionList.prototype, "extensions", {
  get: function(){
    log("getting list of locally installed extensions")
    if (typeof this._extensions ==='undefined'){
      this._extensions = {};

      var list = this.list;
      if (!list) return this._extensions;
      var extensions = list.map(function(x){return new Extension("local", x)})
      for (var i in extensions){
        this._extensions[extensions[i].id] = extensions[i];
      }
    }
    return this._extensions;
  }
});


/**
 * @name LocalExtensionList#list
 * @type {string}
 */
Object.defineProperty(LocalExtensionList.prototype, "list", {
  get: function(){
    if (typeof this._list === 'undefined'){
      this._list == [];
      var listFile = this._listFile;
      var list = readFile(listFile);
      if (!list) return this._list;
      
      try{
        var json = JSON.parse(list);
        this._list = json;
      }catch(error){
        log("Couldn't parse extension list. List file might be corrupted.");
        //make a backup and delete?
      }
    }
    return this._list;
  }
});


/**
 * Checks whether the extension is in the list of installed extensions.
 */
LocalExtensionList.prototype.isInstalled = function(extension){
  var installList = this.extensions;
  return installList.hasOwnProperty(extension.id);
}


/**
 * Installs the extension
 * @returns {bool}  the success of the installation
 */
LocalExtensionList.prototype.install = function(extension){
  if (extension.repository == "local") return; // extension is already installed
  var downloader = new ExtensionDownloader(extension);  // dedicated object to implement threaded download later
  var installLocation = this.installFolder+(extension.package.isPackage?"packages/"+extension.name+"/":"")
  log(installLocation)

  try{
    var files = downloader.downloadFiles();
    log ("downloaded files :\n"+ files.join("\n"));
    var tempFolder = files[0];
    // move the files into the script folder or package folder
    recursiveFileCopy(tempFolder, installLocation);
  }catch(err){
    log (err.lineNumber+" : "+err);
    return false;
  }

  this.addToList(extension, installLocation); // create a record of this installation
  return true;
}


/**
 * Adds an extension to the installed list
 */
LocalExtensionList.prototype.addToList = function(extension, installLocation){
  var installList = this.list;
  var installedPackage = deepCopy(extension.package);

  var files = extension.localPaths.map(function(x){return installLocation+x});

  installedPackage.localFiles = files;
  installList.push(installedPackage);
  installList = JSON.stringify(installList, null, "  ");

  writeFile(this._listFile, installList);

  // create new local extension object and add to this.extensions property
  var extension = new Extension("local", installedPackage)
  this.extensions[extension.id] = extension;
}


// ScriptDownloader Class --------------------------------------------
/**
 * @classdesc
 * @constructor
 */
function ExtensionDownloader(extension){
  this.repository = extension.repository;
  this.extension = extension;
  this.destFolder = specialFolders.temp+"/"+extension.name+"_"+extension.version+"/";
}


/**
 * Downloads the files of the extension from the repository set in the object instance.
 * @returns [string[]]    an array of paths of the downloaded files location, as well as the destination folder at index 0 of the array.
 */
ExtensionDownloader.prototype.downloadFiles = function(){
  log ("starting download of files from extension "+this.extension.name);
  var destFolder = this.destFolder;
  log(this.extension 
    instanceof Extension)
  var destPaths = this.extension.localPaths.map(function(x){return destFolder+x});
  var dlFiles = [this.destFolder];

  // log ("destPaths: "+destPaths)

  var files = this.extension.files;

  for (var i=0; i<files.length; i++){
    // make the directory
    var dest = destPaths[i].split("/").slice(0,-1).join("/")
    var dir = new QDir(dest);
    if (!dir.exists()) dir.mkpath(dest);

    webQuery.download(files[i].download_url, destPaths[i]);
    var dlFile = new File(destPaths[i]);
    if (dlFile.size == files[i].size) {
      // download complete!
      log ("successfully downloaded "+files[i].name+" to location : "+destPaths[i])
      dlFiles.push(destPaths[i])
    }else{
      throw new Error("Downloaded file "+destPaths[i]+" size does not match expected size : "+dlFile.size+" "+files[i].size)
    }
  }

  return dlFiles;
}


// NetworkConnexionHandler Class --------------------------------------
/**
 * @constructor
 * @classdesc
 * The NetworkConnexionHandler class handles web queries and downloads. It uses curl for communicating with the remote apis. <br>
 * This class extends QObject so it can broadcast signals and be threaded.
 * @extends QObject
 */
function NetworkConnexionHandler (){
  this.curl = new CURL()
}


/**
 *
 */
NetworkConnexionHandler.prototype.get = function(command){
  if (typeof command == "string") command = [command]
  var result = this.curl.get(command);
  // handle errors
  try{
    json = JSON.parse(result)
    return json;
  }
  catch(error){
    log("command "+command+" did not return a valid JSON : "+result);
    return {error:error, message:result};
  }
}


/**
 *
 */
NetworkConnexionHandler.prototype.download = function(url, destinationPath){
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
function CURL(){
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
CURL.prototype.query = function(query, wait){
  if (typeof wait === 'undefined') var wait = 5000;
  try{
    var p = new QProcess();
    var bin = this.bin;

    //log ("starting process :"+bin+" "+command);
    var command = ["-H", "Authorization: Bearer YOUR_JWT", "-H", "Content-Type: application/json", "-X", "POST", "-d"];
    query = query.replace(/\n/gm, "\\\\n").replace(/"/gm, '\\"');
    command.push('" \\\\n'+query+'"');
    command.push("https://api.github.com/graphql");

    p.start(bin, command);

    p.waitForFinished(wait);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    //log ("json: "+output);

    return output;
  }catch(err){
    log(err);
    return null;
  }
}


/**
 * Queries the REST Github API v3 with a curl process
 */
CURL.prototype.get = function(command, wait){
  if (typeof wait === 'undefined') var wait = 5000;
  try{
    var p = new QProcess();
    var bin = this.bin;

    // log ("starting process :"+bin+" "+command);
    p.start(bin, command);

    p.waitForFinished(wait);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    // log ("json: "+output);

    return output;
  }catch(err){
    log(err);
    return null;
  }
}



/**
 * find the curl executable
 */
Object.defineProperty(CURL.prototype, "bin", {
  get: function(){
    //log("getting curl bin")
    if (typeof CURL.__proto__.bin === 'undefined') {
      if (about.isWindowsArch()){
        var curl = [System.getenv("windir")+"/system32/curl.exe", System.getenv("ProgramFiles")+"/Git/mingw64/bin/curl.exe"];
      }else{
        var curl = ["/usr/bin/curl", "/usr/local/bin/curl"];
      }

      for (var i in curl){
        if((new File(curl[i])).exists) {
          CURL.__proto__.bin = curl[i];
          return curl[i];
        }
      }

      throw new Error("cURL wasn't found. Install cURL first.");
    }else{
      return CURL.__proto__.bin;
    }
  }
})


// Helper functions ---------------------------------------------------

// log a series of values to the messageLog and command line window. Can pass as many arguments as necessary.
function log(){
  var message = []
  for (var i=0; i<arguments.length; i++){
    message.push(arguments[i])
  }
  MessageLog.trace(message.join(" "));
  System.println(message.join(" "));
}


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
  } catch (err) {}
  return null;
}


// writes the contents to the specified filename.
function writeFile(filename, content, append){
  if (typeof append === 'undefined') var append = false;

  log("writing file "+filename)

  var file = new File(filename);
  try {
      if (append){
          file.open(FileAccess.Append);
      }else{
          file.open(FileAccess.WriteOnly);
      }
      file.write(content);
      file.close();
      return true
  } catch (err) {return false;}
}


// returns the folder of this file
var currentFolder = __file__.split("/").slice(0, -1).join("/");


// make a deep copy of an object
function deepCopy(object){
  var copy = Object.create(object.constructor)

  for (var i in object){
    var original = object[i]
    if (object[i] instanceof Object){
      original = deepCopy(object[i])
    }
    copy[i] = original;
  }

  return copy
}


// recursive copy of folders content
function recursiveFileCopy(folder, destination){
  log ("copying files from folder "+folder+" to destination "+destination)
  try{
    var p = new QProcess();

    if (about.isWindowsArch()){
      var bin = "robocopy";
      var command = ["/E", "/TEE", "/MOV", folder, destination];
    }else{
      var bin = "cp";
      var command = ["-R", folder, destination];
    }

    // log ("starting process :"+bin+" "+command);
    p.start(bin, command);

    p.waitForFinished(-1);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    log ("copy results: "+output);

    return output;
  }catch(err){
    log(err);
    return null;
  }
}


exports.Store = Store;
exports.LocalExtensionList = LocalExtensionList;