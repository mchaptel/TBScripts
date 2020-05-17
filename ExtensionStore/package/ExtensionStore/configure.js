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

MessageLog.trace("Succesfully loaded Extension Store Package.")
MessageLog.clearLog();

function configure(packageFolder, packageName) {
  ScriptManager.addView({
    id: "Extension Store",
    text: "Extension Store",
    action: "initStoreUI in ./configure.js"
  })
}

function initStoreUI() {
  var storelib = require("./github_scrubber.js");
  var store = new storelib.Store();
  var localList = new storelib.LocalExtensionList();

  /////// testing
  /* var extensions = store.extensions  
   // log(extensions.map(function(x){return JSON.stringify(x.package, null, "  ")}));
 
   for (var i in extensions){
     log("is extension "+extensions[i].name+" installed? "+localList.isInstalled(extensions[i]))
     //log(store.extensions[i].install());
   }*/
  ////////

  var packageView = ScriptManager.getView("Extension Store");
  var ui = ScriptManager.loadViewUI(packageView, "./store.ui");
  ui.minimumWidth = UiLoader.dpiScale(350);

  // set ui and ui responses

  // disable tabs until store is loaded
  var storeTab = ui.tabWidget.widget(0);
  var installedTab = ui.tabWidget.widget(1);
  var registerTab = ui.tabWidget.widget(2);
  var aboutTab = ui.tabWidget.widget(3);

  var storeLabel = ui.tabWidget.tabText(0)
  var installedLabel = ui.tabWidget.tabText(1)
  var registerLabel = ui.tabWidget.tabText(2)
  var aboutLabel = ui.tabWidget.tabText(3)

  var storeListPanel = storeTab.storeSplitter.widget(0)
  var storeDescriptionPanel = storeTab.storeSplitter.widget(1)
  var extensionsList = storeListPanel.extensionsList;

  ui.tabWidget.removeTab(2);
  ui.tabWidget.removeTab(1);
  ui.tabWidget.removeTab(0);

  // Subclass TreeWidgetItem
  function ExtensionItem(extension) {
    QTreeWidgetItem.call(this, [extension.name, extension.version], 1024);
    this.extension = extension;
    this.setData(0, Qt.UserRole, extension.id)
    // log("init treewidgetitem for " + this.extension.name)
  }
  ExtensionItem.prototype = Object.create(QTreeWidgetItem.prototype);


  function updateStoreList() {
    // CBB: use threading for this function?
    var filter = storeListPanel.searchStore.text;
    var repos = store.repositories;

    //remove all widgets from store
    for (var i = extensionsList.topLevelItemCount; i >= 0; i--) {
      extensionsList.takeTopLevelItem(i);
    }

    // populate the extension list
    for (var i in repos) {
      var extensions = repos[i].extensions.filter(function(x){return x.matchesSearch(filter)})

      if (extensions.length == 0) continue;

      var reposItem = new QTreeWidgetItem([repos[i].name], 0);
      extensionsList.addTopLevelItem(reposItem);
      reposItem.setExpanded(true);

      for (var j in extensions) {
        var extensionItem = new ExtensionItem(extensions[j]);
        reposItem.addChild(extensionItem);
      }
    }
  }


  function updateStoreDescription(extension) {
    storeDescriptionPanel.versionStoreLabel.text = extension.version;
    storeDescriptionPanel.descriptionText.setHtml(extension.package.description);
    storeDescriptionPanel.storeKeywordsGroup.storeKeywordsLabel.text = extension.package.keywords;
    storeDescriptionPanel.sourceButton.toolTip = extension.repository._url;
    storeDescriptionPanel.websiteButton.toolTip = extension.package.website;

    // update install button to reflect wether or not the extension is already installed
    // storeDescriptionPanel.installButton
  }


  // load store button------------------------------------------------
  aboutTab.loadStoreButton.clicked.connect(this, function () {
    ui.tabWidget.insertTab(0, registerTab, registerLabel);
    ui.tabWidget.insertTab(0, installedTab, installedLabel);
    ui.tabWidget.insertTab(0, storeTab, storeLabel);
    ui.tabWidget.setCurrentWidget(storeTab);

    updateStoreList();
  })


  //hide description panel at load ------------------------------------
  var storeTabState = storeTab.storeSplitter.saveState()
  storeTab.storeSplitter.setSizes([storeTab.storeSplitter.width, 0]);


  // filter the store list --------------------------------------------
  storeListPanel.searchStore.textChanged.connect(this, function(){
    updateStoreList();
  })


  //connect the showing/updating of the description to selection Change 
  extensionsList.itemSelectionChanged.connect(this, function () {
    // log("changed selection")
    var selection = extensionsList.selectedItems();

    if (selection.length > 0 && selection[0].type() != 0){
      storeTab.storeSplitter.restoreState(storeTabState);
      var id = selection[0].data(0, Qt.UserRole);
      var extension = store.extensions[id];
      
      // populate the descirption panel
      updateStoreDescription(extension);
    }else{
      if (storeTab.storeSplitter.sizes()[1] != 0){
        storeTabState = storeTab.storeSplitter.saveState()
        storeTab.storeSplitter.setSizes([storeTab.storeSplitter.width, 0]);
      }
    }
  })


  // Clear search button -----------------------------------------------
  storeListPanel.storeClearSearch.clicked.connect(this, function () {
    storeListPanel.searchStore.text = "";
  })


  // View Source button
  storeDescriptionPanel.sourceButton.clicked.connect(this, function () {
    QDesktopServices.openUrl(new QUrl(storeDescriptionPanel.sourceButton.toolTip))
  });
  

  // View Website Button
  storeDescriptionPanel.websiteButton.clicked.connect(this, function () {
    QDesktopServices.openUrl(new QUrl(storeDescriptionPanel.websiteButton.toolTip))
  });


  // Install Button
  storeDescriptionPanel.installButton.clicked.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log("installing extension : " + extension.repository.name + extension.name)
    log(JSON.stringify(extension.package, null, "  "))
    var success = localList.install(extension)
    if (success){
      MessageBox.information("Extension "+extension.name+" v"+extension.version+"\nwas installed correctly.")
    }else{
      MessageBox.information("There was an error while installing extension\n"+extension.name+" v"+extension.version+".")
    }
  });


  ui.show();

  function log() {
    var message = []
    for (var i = 0; i < arguments.length; i++) {
      message.push(arguments[i])
    }
    MessageLog.trace(message.join(" "));
    System.println(message.join(" "));
  }

  function logWidgetHierarchy(widget, prefix) {
    if (typeof prefix === 'undefined') prefix = "";
    var children = widget.children
    for (var i in children) {
      var name = prefix + children[i].opbjectName()
      log(name)
      logWidgetHierarchy(children[i], prefix + children[i].opbjectName() + "/")
    }
  }
}



exports.configure = configure;