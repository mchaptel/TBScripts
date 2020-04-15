////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script ScriptShortcuts/Configure.js v_1.01
//
//     Script Package to add Shortcut entries for every script 
//     in toonboom folders.
//
//     script written by Mathieu Chaptel m.chaptel@gmail.com
//
//
//     v1 - first version
//     v1.01 - added script file name in script list
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


function configure(packageFolder, packageName){
  var scripts = getScriptList();
  for (var i in scripts){
    scriptFunctions = getScriptFunctions(scripts[i]);
    for (var j in scriptFunctions){
      addShortcut("Scripts", scripts[i], scriptFunctions[j]);
    }
  }
}


function getScriptFunctions(scriptFile){
		
  var script = readFile(scriptFile)
  var funcRE = /function ([A-Za-z0-9_ ]+)\(\)/igm
  
  var functionsList = [];
  while(result = funcRE.exec(script)){
    functionsList.push(result[1])
  }
  
  return functionsList;
}


function getScriptList(){
  var userPath = fileMapper.toNativePath(specialFolders.userScripts);
  var varPath = System.getenv("TOONBOOM_GLOBAL_SCRIPT_LOCATION");
  var systemPath = fileMapper.toNativePath (specialFolders.resource+"/scripts");
  
  var userScripts = getFiles("*.js", userPath);
  var varScripts = getFiles("*.js", varPath);
  var systemScripts = getFiles("*.js", systemPath);
  
  var scripts = (userScripts.concat(varScripts)).concat(systemScripts)
  return scripts;
}

//------------------------------
// file handling functions
// -----------------------------


function getFiles(filter, folder){
  // returns the list of URIs in a directory that match a filter
  var dir = new QDir(folder);
  dir.setNameFilters( [filter] );
  dir.setFilter( QDir.Files );

  return files = dir.entryList().map(function(x){return folder+"/"+x});
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

function addShortcut(category, script, functionName){  
  var shortcutID = category+"_"+functionName;
  var launchCommand = functionName+' in '+script;
  var scriptName = script.split("/").pop().split("\\").pop();

  //Create Shortcut
  var shortcut = {id           : shortcutID,
                  text         : scriptName.replace(".js", "")+" : "+functionName,
                  action       : launchCommand,
                  longDesc     : "Runs function "+functionName+" of script "+scriptName,
                  categoryId   : category, 
                  categoryText : category};
                  
  ScriptManager.addShortcut(shortcut);
}

exports.configure = configure;