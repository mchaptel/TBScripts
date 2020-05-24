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
  /*var extensions = store.extensions  
   // log(extensions.map(function(x){return JSON.stringify(x.package, null, "  ")}));
 
   for (var i in extensions){
     log("is extension "+extensions[i].name+" installed? "+localList.isInstalled(extensions[i]))
     //log(store.extensions[i].install());
   }*/
  ////////

  var packageView = ScriptManager.getView("Extension Store");
  var ui = ScriptManager.loadViewUI(packageView, "./store.ui");
  ui.minimumWidth = UiLoader.dpiScale(350);
  ui.minimumHeight = UiLoader.dpiScale(400);

  // set ui and ui responses
  webPreviewsFontFamily = "Arial";
  webPreviewsFontSize = 12;
  webPreviewsStyleSheet = "QWidget { background-color: lightGrey; }";

  // disable tabs until store is loaded
  var storeTab = ui.tabWidget.widget(0);
  var registerTab = ui.tabWidget.widget(1);
  var aboutTab = ui.tabWidget.widget(2);

  var storeLabel = ui.tabWidget.tabText(0)
  var registerLabel = ui.tabWidget.tabText(1)
  var aboutLabel = ui.tabWidget.tabText(2)

  var storeListPanel = storeTab.storeSplitter.widget(0);
  var storeDescriptionPanel = storeTab.storeSplitter.widget(1);
  var extensionsList = storeListPanel.extensionsList;
  extensionsList.setColumnWidth(0, 220);
  extensionsList.setColumnWidth(1, 30);
  extensionsList.setColumnWidth(2, 60);

  
  // Setup description panel -----------------------------------------
  
  // create the webview programmatically
  var descriptionText = new QWebView();
  descriptionText.setStyleSheet(webPreviewsStyleSheet);
  descriptionText.setMinimumSize(0,0);
  descriptionText.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum);
  var settings = descriptionText.settings();
  settings.setFontFamily(QWebSettings.StandardFont, webPreviewsFontFamily);
  settings.setFontSize(QWebSettings.DefaultFontSize, webPreviewsFontSize);

  // setup the scrollArea containing the webview
  var webWidget = storeDescriptionPanel.webContent;
  webWidget.setLayout(new QVBoxLayout());
  webWidget.layout().setContentsMargins(0,0,0,0);
  webWidget.layout().addWidget(descriptionText, 0, Qt.AlignTop);
  // webWidget.setWidget(descriptionText);

  ui.tabWidget.removeTab(1);
  ui.tabWidget.removeTab(0);

  // set default expanded size to half the splitter size
  storeTab.storeSplitter.setSizes([storeTab.storeSplitter.width / 2, storeTab.storeSplitter.width / 2]);
  var storeTabState = storeTab.storeSplitter.saveState();
  storeTab.storeSplitter.setSizes([storeTab.storeSplitter.width, 0]);

  // Setup register panel --------------------------------------------
  
  var registerPanel = registerTab.registerScroll.widget().registerForm;
  var registerDescription = registerPanel.descriptionSplitter.widget(0);
  var htmlPreview = registerPanel.descriptionSplitter.widget(1);
  // registerPanel.descriptionSplitter.widget(1).setWidgetResizable(true);
  registerPanel.descriptionSplitter.setSizes([registerPanel.descriptionSplitter.width, 0]);

  // create the webview programmatically
  var descriptionPreview = new QWebView();
  descriptionPreview.setStyleSheet(webPreviewsStyleSheet);
  descriptionPreview.setMinimumSize(0,0);
  descriptionPreview.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum);
  var previewSettings = descriptionPreview.settings();
  previewSettings.setFontFamily(QWebSettings.StandardFont, webPreviewsFontFamily);
  previewSettings.setFontSize(QWebSettings.DefaultFontSize, webPreviewsFontSize);

  // setup the scrollArea containing the webview
  htmlPreview.setLayout(new QVBoxLayout());
  htmlPreview.layout().setContentsMargins(0,0,0,0);
  htmlPreview.layout().addWidget(descriptionPreview, 0, Qt.AlignTop);
  // htmlPreview.setWidget(descriptionPreview);

  registerDescription.textChanged.connect(this, function () {
    descriptionPreview.setHtml(registerDescription.document().toPlainText())
  })

  // load store button------------------------------------------------

  // Subclass TreeWidgetItem 
  function ExtensionItem(extension) {
    QTreeWidgetItem.call(this, [extension.name, "", extension.version], 1024);
    // store the extension id in the item
    this.setData(0, Qt.UserRole, extension.id);

    // add an icon in the middle column showing if installed and if update present
    if (localList.isInstalled(extension)) {
      var icon = "✓";
      var localExtension = localList.extensions[extension.id];
      if (localExtension.currentVersionIsOlder(extension.version)) icon = "↺";
    } else {
      var icon = "✗";
    }
    this.setText(1, icon)
  }
  ExtensionItem.prototype = Object.create(QTreeWidgetItem.prototype);


  // update the list of extensions
  function updateStoreList() {
    var filter = storeTab.searchStore.text;
    var repos = store.repositories;

    if (extensionsList.selectedItems().length > 0) {
      var currentSelectionId = extensionsList.selectedItems()[0].data(0, Qt.UserRole)
    }

    //remove all widgets from store
    for (var i = extensionsList.topLevelItemCount; i >= 0; i--) {
      extensionsList.takeTopLevelItem(i);
    }

    // populate the extension list
    for (var i in repos) {
      var extensions = repos[i].extensions.filter(function (x) {
        if (storeTab.showInstalledCheckbox.checked && !localList.isInstalled(x)) return false;
        return x.matchesSearch(filter);
      })

      if (extensions.length == 0) continue;

      var reposItem = new QTreeWidgetItem([repos[i].name], 0);
      extensionsList.addTopLevelItem(reposItem);
      reposItem.setExpanded(true);

      for (var j in extensions) {
        var extensionItem = new ExtensionItem(extensions[j]);
        reposItem.addChild(extensionItem);
        if (currentSelectionId && extensions[j].id == currentSelectionId) extensionItem.setSelected(true);
      }
    }
  }

  // connect store init to load button
  aboutTab.loadStoreButton.clicked.connect(this, function () {
    ui.tabWidget.insertTab(0, registerTab, registerLabel);
    ui.tabWidget.insertTab(0, storeTab, storeLabel);
    ui.tabWidget.setCurrentWidget(storeTab);
    updateStoreList();
  })

  // filter the store list --------------------------------------------
  storeTab.searchStore.textChanged.connect(this, function () {
    updateStoreList();
  })

  // filter by installed only -----------------------------------------
  storeTab.showInstalledCheckbox.toggled.connect(this, function () {
    updateStoreList();
  })

  // Clear search button ----------------------------------------------
  storeTab.storeClearSearch.setStyleSheet("QToolButton { background-color: black }")
  storeTab.storeClearSearch.clicked.connect(this, function () {
    storeTab.searchStore.text = "";
  })


  // connect the showing of the description to selection Change -------
  // Update the store slide out panel with info from selection --------
  function updateStoreDescription(extension) {
    storeDescriptionPanel.versionStoreLabel.text = extension.version;
    descriptionText.setHtml(extension.package.description);
    storeDescriptionPanel.storeKeywordsGroup.storeKeywordsLabel.text = extension.package.keywords.join(", ");
    storeDescriptionPanel.authorStoreLabel.text = extension.package.author;
    storeDescriptionPanel.sourceButton.toolTip = extension.repository._url;
    storeDescriptionPanel.websiteButton.toolTip = extension.package.website;

    // update install button to reflect wether or not the extension is already installed
    // storeDescriptionPanel.installButton
  }

  extensionsList.itemSelectionChanged.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (storeTab.storeSplitter.sizes()[1] != 0) storeTabState = storeTab.storeSplitter.saveState();

    if (selection.length > 0 && selection[0].type() != 0) {
      storeTab.storeSplitter.restoreState(storeTabState);
      var id = selection[0].data(0, Qt.UserRole);
      var extension = store.extensions[id];

      // populate the description panel
      updateStoreDescription(extension);
    } else {
      // collapse description
      storeTab.storeSplitter.setSizes([storeTab.storeSplitter.width, 0]);
    }
  })


  // View Source button -----------------------------------------------
  storeDescriptionPanel.sourceButton.clicked.connect(this, function () {
    QDesktopServices.openUrl(new QUrl(storeDescriptionPanel.sourceButton.toolTip))
  });


  // View Website Button ----------------------------------------------
  storeDescriptionPanel.websiteButton.clicked.connect(this, function () {
    QDesktopServices.openUrl(new QUrl(storeDescriptionPanel.websiteButton.toolTip))
  });


  // Install Button ----------------------------------------------
  var installAction = new QAction("Install", this);

  installAction.triggered.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log("installing extension : " + extension.repository.name + extension.name)
    // log(JSON.stringify(extension.package, null, "  "))
    var success = localList.install(extension);
    if (success) {
      MessageBox.information("Extension " + extension.name + " v" + extension.version + "\nwas installed correctly.")
    } else {
      MessageBox.information("There was an error while installing extension\n" + extension.name + " v" + extension.version + ".")
    }
    localList.refreshExtensions();
    updateStoreList();
  })

  storeDescriptionPanel.installButton.setDefaultAction(installAction);

  // Install Button ----------------------------------------------
  var uninstallAction = new QAction("Uninstall", this);

  uninstallAction.triggered.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log("uninstalling extension : " + extension.repository.name + extension.name)
    // log(JSON.stringify(extension.package, null, "  "))
    var success = localList.uninstall(extension);
    if (success) {
      MessageBox.information("Extension " + extension.name + " v" + extension.version + "\nwas uninstalled succesfully.")
    } else {
      MessageBox.information("There was an error while uninstalling extension\n" + extension.name + " v" + extension.version + ".")
    }
    localList.refreshExtensions();
    updateStoreList();
  })

  ui.show();

  function log() {
    var message = []
    for (var i = 0; i < arguments.length; i++) {
      message.push(arguments[i])
    }
    try{
      MessageLog.trace(message.join(" "));
      System.println(message.join(" "));  
    }catch(err){
      MessageLog.trace(message)
      MessageLog.trace("logging error : "+err)
    }
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