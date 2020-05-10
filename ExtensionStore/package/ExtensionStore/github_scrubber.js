
var webQuery = new NetworkConnexionHandler();
var extensionList = new LocalExtensionList();

function test(){
  var scrubber = new GithubScrubber();
  log(JSON.stringify(scrubber.extensions));
}

// GithubScrubber Class ----------------------------------------------
/**
 * @constructor
 * @classdesc
 * The GithubScrubber class is used to search the github repos for available extensions
 */
function GithubScrubber(){
}


/**
 * 
 */
Object.defineProperty(GithubScrubber.prototype, "repositories", {
  get: function(){
    if (typeof this._repositories === 'undefined'){
      log ("getting repositories")
      var reposFile = __file__.split("/").slice(0, -1).join("/")+"/REPOSLIST";
      var reposList = JSON.parse(readFile(reposFile))
      //log(reposList)
      if (!reposList) throw new Error("invalid REPOSLIST file")

      this._repositories = reposList.map(function(x){return new GithubRepository(x)})
    }
    return this._repositories;
  }
});


/**
 * The extensions available in the store
 * @name GithubScrubber#extensions
 * @type {Extension[]}
 */
Object.defineProperty(GithubScrubber.prototype, "extensions", {
  get: function(){
    if (typeof this._extensions === 'undefined'){
      log ("getting extensions")
      var repos = this.repositories;
      var extensions = []

      for (var i in repos){
        var reposExtensions = repos[i].extensions;
        if (reposExtensions.length == 0) continue;

        extensions = extensions.concat(reposExtensions);
      }

      this._extensions = extensions;
    }

    return this._extensions;
  }
})


// GithubRepository Class --------------------------------------------
/**
 * @constructor
 * @classdesc
 * The class describing and accessing github repositories.
 * @property {string}  apiUrl         the api url of the repo used in the webqueries
 * @property {Package} package        instance of the package class that holds the package informations
 * @property {Object}  contents       parsed json from the api query
 */
function GithubRepository (url){
  this._url = "https://api.github.com/repos/"+url.replace("https://github.com/", "");
}


/**
 * The url of the repository, formatted to be used by the github api
 * @name GithubRepository#apiUrl
 * @type {string}
 */
Object.defineProperty(GithubRepository.prototype, "apiUrl", {
  get: function(){
    //log(this._url)
    return this._url;
  },
  set: function(url){
    // handle repo urls with just name/repo, or with github.com address and format as api url
    this._url = "https://api.github.com/repos/"+url.replace("https://github.com/", "");
  }
});


/**
 * The github url describing the extensions available on this repository
 * @name GithubRepository#package
 * @type {string}
 */
Object.defineProperty(GithubRepository.prototype, "package", {
  get: function(){
    log ("getting repos package")
    if (typeof this._package === 'undefined'){
      var contents = this.contents;

      for (i in contents){
        if (contents[i].hasOwnProperty("name") && contents[i].name == "tbpackage.json") {
          this._package = contents[i].download_url;
          break;
        }
      }
      
      if (typeof this._package === 'undefined') {
        log("Package file not present in repository");
        return null;
      }
    }
    return this._package;
  }
});


/**
 * List the list of files at the root of the repository
 * @name GithubRepository#contents
 * @type {Object}
 */
Object.defineProperty(GithubRepository.prototype, "contents", {
  get: function(){
    log ("getting repos contents")
    if (typeof this._contents === 'undefined'){
      var contents = webQuery.get(this.apiUrl+"contents/");
      // check validity here
      this._contents = contents;
    }
    return this._contents;
  }
});


/**
 * The list of extensions present on the repository
 * @name GithubRepository#extensions
 * @type {Extension[]}
 */
Object.defineProperty(GithubRepository.prototype, "extensions", {
  get: function(){
    log ("getting repos extensions")
    if (typeof this._extensions === 'undefined'){
      // read package file from repository 
      var packageUrl = this.package;
      var packageFile = webQuery.get(packageUrl);

      this._extensions = [];
      for (var i in packageFile){
        this._extensions.push(new Extension(packageFile[i]));
      }
    }
    return this._extensions;
  }
});


/**
 * 
 */
GithubRepository.prototype.getFiles = function(folder, filter){
  if (typeof filter === 'undefined') var filter = /.*/;
  if (typeof filter === 'string'){
    filter = filter.replace(/\./g, "\\.")    // ignore dots in filter before changing into regex
    filter = filter.replace(/\*/g, "\\.*")   // transform * into regex wildcard search
    filter = RegExp(filter);
  } 

  var url = this.apiUrl+"contents/"+folder
  
  var search = [];

  var files = webQuery.get(url);
  for (var i in files){
    if (files[i].type == "file" && filter.match(files[i].name)) search.push(files[i]);
    if (files[i].type == "dir") search = search.concat(this.getFiles(folder+"/"+files[i].name));
  }

  return search;
}


// Extension Class ---------------------------------------------------
/**
 * @classdesc
 * @property
 * @param {object} jsonObject 
 */
function Extension(jsonObject){
  this.name = "";
  this.version = "";
  this.compatibility = "";
  this.description = "";
  this.files = "";
  this.repository = "";
  this.keywords = "";
  this.author = "";
  this.license = "";
  this.website = "";

  // set properties based on json
  for (property in jsonObject){
    this[property] = jsonObject[property]
  }
}


/**
 * Check if the extension is installed
 * @name Extension#installed
 * @type {bool}
 */
Object.defineProperty(Extension.prototype, "installed", {
  get: function(){
    
  }
})


/**
 * 
 */
Extension.prototype.install = function(){

}


// LocalExtensionList Class ----------------------------------------------
/**
 * 
 */
function LocalExtensionList(){

}


/**
 * @name LocalExtensionList#installFolder
 * @type {string}
 */
Object.defineProperty(LocalExtensionList.prototype, "installFolder", {
  get: function(){
    if (typeof this._installFolder === 'undefined'){
      this._installFolder = specialFolders.userScripts;
    }
    return this._installFolder;
  },
  set: function(newLocation){
    this._installFolder = newLocation;
  }
});


// NetworkConnexionHandler Class --------------------------------------
/**
 * 
 * @param {string} url 
 */
function NetworkConnexionHandler (command){
  if (typeof command == "string") command = [command]
  this.command = command
  this.curl = new CURL()
}


/**
 * 
 */
NetworkConnexionHandler.prototype.get = function(command){
  if (typeof command == "string") command = [command]
  result = this.curl.get(command);
  // handle errors
  return result
}


/**
 * 
 */
NetworkConnexionHandler.prototype.download = function(url, destinationPath){
  command = ["-L", "-o", url, destinationPath];
  this.curl.query(command);
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
 */
CURL.prototype.query = function(query){
  try{
    var p = new QProcess();
    var bin = this.bin;

    //log ("starting process :"+bin+" "+command);
    var command = ["-H", "Content-Type: application/json", "-X", "POST", "-d"];
    query = query.replace(/\n/gm, "\\\\n").replace(/"/gm, '\\"');
    command.push('" \\\\n'+query+'"');
    command.push("https://api.github.com/graphql");
    
    p.start(bin, command);

    p.waitForFinished(10000);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    //log ("json: "+output);

    return JSON.parse(output);
  }catch(err){
    log(err);
    return null;
  }
}


/**
 * Queries the REST Github API v3 with a curl process
 */
CURL.prototype.get = function(command){
  try{
    var p = new QProcess();
    var bin = this.bin;

    //log ("starting process :"+bin+" "+command);
    p.start(bin, command);

    p.waitForFinished(10000);

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    //log ("json: "+output);

    return JSON.parse(output);
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
function log(message){
  MessageLog.trace(message);
  System.println(message);
}



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