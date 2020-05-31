////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script ExtensionStore/Configure.js v_1.01
//
//     Extension store that scrubs a list of github accounts 
//     and allows easy installation/uninstallation/updates.
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This store is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
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
  var log = new storelib.Logger("UI")
  var store = new storelib.Store();
  var localList = new storelib.LocalExtensionList(store);

  /////// testing
  /*var extensions = store.extensions
   log(extensions.map(function(x){return JSON.stringify(x.package, null, "  ")}));
 
   for (var i in extensions){
     log("is extension "+extensions[i].name+" installed? "+localList.isInstalled(extensions[i]))
     //log(store.extensions[i].install());
   }*/
  ////////

  // setting up UI ---------------------------------------------------

  var packageView = ScriptManager.getView("Extension Store");
  var ui = ScriptManager.loadViewUI(packageView, "./store.ui");
  ui.minimumWidth = UiLoader.dpiScale(350);
  ui.minimumHeight = UiLoader.dpiScale(400);

  log.debug("loading UI")

  // set ui and ui responses
  var webPreviewsFontFamily = "Arial";
  var webPreviewsFontSize = 12;
  var webPreviewsStyleSheet = "QWebView { background-color: lightGrey; }";

  updateRibbonStyleSheet = "QWidget { background-color: blue; }";

  // disable store frame until store is loaded
  var storeFrame = ui.storeFrame;
  var aboutFrame = ui.aboutFrame;

  var storeListPanel = storeFrame.storeSplitter.widget(0);
  var storeDescriptionPanel = storeFrame.storeSplitter.widget(1);
  var extensionsList = storeListPanel.extensionsList;
  extensionsList.setColumnWidth(0, 220);
  extensionsList.setColumnWidth(1, 30);

  // check for updates -----------------------------------------------

  if (localList.list.length > 0) {
    // we only do this if a local install List exists so as to not load the store until the user has clicked the button 
    var storeExtension = store.storeExtension;
    var installedStore = localList.extensions[storeExtension.id];
    var currentVersion = installedStore.version;
    var storeVersion = storeExtension.version;

    function updateStore() {
      var success = localList.install(storeExtension);
      if (success) {
        MessageBox.information("Store succesfully updated to version v" + storeVersion + ".\n\nPlease restart Harmony for changes to take effect.");
        aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion);
        aboutFrame.updateRibbon.setStyleSheet("");
        aboutFrame.updateRibbon.updateButton.hide();
      } else {
        MessageBox.information("There was a problem updating to v" + storeVersion + ".\n\n The update was not successful.");
      }
    }

    // if a more recent version of the store exists on the repo, activate the update ribbon
    if (installedStore.currentVersionIsOlder(storeVersion)) {
      aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion + "  ⓘ New version available: v" + storeVersion);
      aboutFrame.updateRibbon.setStyleSheet(updateRibbonStyleSheet);
      aboutFrame.updateRibbon.updateButton.toolTip = storeExtension.package.description;
      aboutFrame.updateRibbon.updateButton.clicked.connect(updateStore);
    } else {
      aboutFrame.updateRibbon.updateButton.hide();
      aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion + " ✓ - Store is up to date.")
    }

    storeFrame.storeVersionLabel.setText("v" + currentVersion);
  } else {
    // in case of missing list file, we find out the current version by parsing the json ?
    var json = store.localPackage;
    if (json != null) {
      var currentVersion = json.version;
      aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion);
      storeFrame.storeVersionLabel.setText("v" + currentVersion);
    }
    aboutFrame.updateRibbon.updateButton.hide();
  }

  // Setup description panel -----------------------------------------
  log.debug("setting up store description panel")

  // create the webview programmatically
  var descriptionText = new QWebView();
  descriptionText.setStyleSheet(webPreviewsStyleSheet);
  descriptionText.setMinimumSize(0, 0);
  descriptionText.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum);
  var settings = descriptionText.settings();
  settings.setFontFamily(QWebSettings.StandardFont, webPreviewsFontFamily);
  settings.setFontSize(QWebSettings.DefaultFontSize, webPreviewsFontSize);

  // setup the scrollArea containing the webview
  var webWidget = storeDescriptionPanel.webContent;
  webWidget.setLayout(new QVBoxLayout());
  webWidget.layout().setContentsMargins(0, 0, 0, 0);
  webWidget.layout().addWidget(descriptionText, 0, Qt.AlignTop);

  // set default expanded size to half the splitter size
  storeFrame.storeSplitter.setSizes([storeFrame.width / 2, storeFrame.width / 2]);
  var storeFrameState = storeFrame.storeSplitter.saveState();
  storeFrame.storeSplitter.setSizes([storeFrame.storeSplitter.width, 0]);

  storeFrame.hide();

  // load store button -----------------------------------------------

  // Subclass TreeWidgetItem 
  function ExtensionItem(extension) {
    QTreeWidgetItem.call(this, [extension.name + " v" + extension.version, ""], 1024);
    // store the extension id in the item
    this.setData(0, Qt.UserRole, extension.id);

    // add an icon in the middle column showing if installed and if update present
    if (localList.isInstalled(extension)) {
      var icon = "✓";
      this.setToolTip(1, "Extension is installed correctly.")
      var localExtension = localList.extensions[extension.id];
      log.debug(extension.id, localList.checkFiles(localExtension))
      if (localExtension.currentVersionIsOlder(extension.version)) {
        icon = "↺";
        this.setToolTip(1, "Update available.")
      } else if (!localList.checkFiles(localExtension)) {
        icon = "!";
        this.setToolTip(1, "Some files from this extension are missing.")
      }
    } else {
      var icon = "✗";
    }
    this.setText(1, icon)
  }
  ExtensionItem.prototype = Object.create(QTreeWidgetItem.prototype);


  // update the list of extensions
  function updateStoreList() {
    if (localList.list.length == 0) localList.createListFile(store);

    var filter = storeFrame.searchStore.text;
    var sellers = store.sellers;

    if (extensionsList.selectedItems().length > 0) {
      var currentSelectionId = extensionsList.selectedItems()[0].data(0, Qt.UserRole)
    }

    //remove all widgets from store
    for (var i = extensionsList.topLevelItemCount; i >= 0; i--) {
      extensionsList.takeTopLevelItem(i);
    }

    // populate the extension list
    for (var i in sellers) {
      var extensions = [];
      var sellerExtensions = sellers[i].extensions;
      for (var j in sellerExtensions) {
        var extension = sellerExtensions[j];
        if (storeFrame.showInstalledCheckbox.checked && !localList.isInstalled(extension)) continue;
        if (extension.matchesSearch(filter)) extensions.push(extension);
      }

      if (extensions.length == 0) continue;

      var sellerItem = new QTreeWidgetItem([sellers[i].name], 0);
      extensionsList.addTopLevelItem(sellerItem);
      sellerItem.setExpanded(true);

      for (var j in extensions) {
        var extensionItem = new ExtensionItem(extensions[j]);
        sellerItem.addChild(extensionItem);
        if (currentSelectionId && extensions[j].id == currentSelectionId) extensionItem.setSelected(true);
      }
    }
  }

  // connect store init to load button
  aboutFrame.loadStoreButton.clicked.connect(this, function () {
    storeFrame.show();
    aboutFrame.hide();
    updateStoreList();
  })

  // filter the store list --------------------------------------------
  storeFrame.searchStore.textChanged.connect(this, function () {
    updateStoreList();
  })

  // filter by installed only -----------------------------------------
  storeFrame.showInstalledCheckbox.toggled.connect(this, function () {
    updateStoreList();
  })

  // Clear search button ----------------------------------------------
  storeFrame.storeClearSearch.setStyleSheet("QToolButton { background-color: black }")
  storeFrame.storeClearSearch.clicked.connect(this, function () {
    storeFrame.searchStore.text = "";
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
    if (localList.isInstalled(extension)) {
      var localExtension = localList.extensions[extension.id];
      if (!localExtension.currentVersionIsOlder(extension.version) && localList.checkFiles(extension)) {
        storeDescriptionPanel.installButton.removeAction(installAction)
        storeDescriptionPanel.installButton.removeAction(updateAction)
        storeDescriptionPanel.installButton.setDefaultAction(uninstallAction)
      } else {
        //change to update?
        // installAction.setText("Update")
        storeDescriptionPanel.installButton.removeAction(installAction)
        storeDescriptionPanel.installButton.removeAction(uninstallAction)
        storeDescriptionPanel.installButton.setDefaultAction(updateAction)
      }
    } else {
      // installAction.setText("Install")
      storeDescriptionPanel.installButton.removeAction(uninstallAction)
      storeDescriptionPanel.installButton.removeAction(updateAction)
      storeDescriptionPanel.installButton.setDefaultAction(installAction)
    }
  }

  // update and display the description panel when selection changes
  extensionsList.itemSelectionChanged.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (storeFrame.storeSplitter.sizes()[1] != 0) storeFrameState = storeFrame.storeSplitter.saveState();

    if (selection.length > 0 && selection[0].type() != 0) {
      storeFrame.storeSplitter.restoreState(storeFrameState);
      var id = selection[0].data(0, Qt.UserRole);
      var extension = store.extensions[id];

      // populate the description panel
      updateStoreDescription(extension);
    } else {
      // collapse description
      storeFrame.storeSplitter.setSizes([storeFrame.storeSplitter.width, 0]);
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
  function installExtension() {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log.log("installing extension : " + extension.repository.name + extension.name)
    // log(JSON.stringify(extension.package, null, "  "))
    try{
      localList.install(extension);
      MessageBox.information("Extension " + extension.name + " v" + extension.version + "\nwas installed correctly.")
    }catch(err){
      log.error(err)
      MessageBox.information("There was an error while installing extension\n" + extension.name + " v" + extension.version + ":\n\n"+err)
    }
    localList.refreshExtensions();
    updateStoreList();
  }

  var installAction = new QAction("Install", this);
  installAction.triggered.connect(this, installExtension)

  var updateAction = new QAction("Update", this);
  updateAction.triggered.connect(this, installExtension)
  // storeDescriptionPanel.installButton.setDefaultAction(installAction);

  // Install Button ----------------------------------------------------
  var uninstallAction = new QAction("Uninstall", this);

  uninstallAction.triggered.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log.log("uninstalling extension : " + extension.repository.name + extension.name)
    // log(JSON.stringify(extension.package, null, "  "))
    try{
      localList.uninstall(extension);
      MessageBox.information("Extension " + extension.name + " v" + extension.version + "\nwas uninstalled succesfully.")
    }catch(err){
      log.error(err)
      MessageBox.information("There was an error while uninstalling extension\n" + extension.name + " v" + extension.version + ":\n\n"+err)
    }
    localList.refreshExtensions();
    updateStoreList();
  })

  // Register extension ------------------------------------------------

  function registerExtension() {
    var currentFolder = storelib.currentFolder
    var form = UiLoader.load(currentFolder + "/register.ui");

    var Seller = storelib.Seller;
    var Repository = storelib.Repository;

    var seller;

    // Setup register panel --------------------------------------------
    var registerPanel = form.registerScroll.widget().registerForm;
    var registerDescription = registerPanel.descriptionSplitter.widget(0);
    var htmlPreview = registerPanel.descriptionSplitter.widget(1);

    registerPanel.descriptionSplitter.setSizes([registerPanel.descriptionSplitter.width, 0]);

    // create the webview programmatically
    var descriptionPreview = new QWebView();
    descriptionPreview.setStyleSheet(webPreviewsStyleSheet);
    descriptionPreview.setMinimumSize(0, 0);
    descriptionPreview.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum);
    var previewSettings = descriptionPreview.settings();
    previewSettings.setFontFamily(QWebSettings.StandardFont, webPreviewsFontFamily);
    previewSettings.setFontSize(QWebSettings.DefaultFontSize, webPreviewsFontSize);

    htmlPreview.setLayout(new QVBoxLayout());
    htmlPreview.layout().setContentsMargins(0, 0, 0, 0);
    htmlPreview.layout().addWidget(descriptionPreview, 0, Qt.AlignTop);

    registerDescription.textChanged.connect(this, function () {
      descriptionPreview.setHtml(registerDescription.document().toPlainText())
    })

    // Load Package ----------------------------------------------------

    var list = form.extensionPicker;

    // load existing package 
    form.loadPackageButton.clicked.connect(this, function () {
      log.debug("loading package");
      var package = form.packageUrl.text;
      var sellerRe = /https:\/\/github.com\/[^\/]*\/[^\/]*\//i;
      var sellerUrl = sellerRe.exec(package);
      if (!sellerUrl) {
        MessageBox.information("Not a valid github repository address.");
        return;
      }

      seller = new Seller(sellerUrl[0]);
      log.log(sellerUrl[0])
      var extensions = seller.extensions;
      log.log("found extensions", Object.keys(extensions))

      // update seller info
      form.authorField.setText(seller.name);
      form.websiteField.setText(seller.package.website);

      // add extensions to the drop down
      var index = 0;
      for (var i in extensions) {
        list.addItem(extensions[i].name);
        log.debug("adding data :")
        // log.debug(JSON.stringify(extensions[i].package, null, " "))
        log.debug(extensions[i].id)
        list.setItemData(index, extensions[i].id, Qt.UserRole);
        index++;
      }
      updatePackageInfo(0);

      list["currentIndexChanged(int)"].connect(this, updatePackageInfo)
    })


    // populate description with info from extension package
    function updatePackageInfo(index) {
      var extensionId = list.itemData(index, Qt.UserRole)
      var extension = seller.extensions[extensionId]

      log.debug("displaying extension:", extensionId)
      log.debug(JSON.stringify(extension.package, null, " "))

      registerPanel.versionField.setText(extension.package.version)
      var compatIndex = registerPanel.compatibiltyComboBox.findText(extension.package.compatibility)
      registerPanel.compatibiltyComboBox.setCurrentIndex(compatIndex)
      registerDescription.setPlainText(extension.package.description)
      registerPanel.isPackageCheckBox.setChecked(extension.package.isPackage)
      registerPanel.keywordsPanel.keywordsField.setText(extension.package.keywords.join(", "))
      form.repoField.setText(extension.package.repository);
      form.filesField.setText(extension.package.files.join(", "));
    }

    // gather all the info from the form
    function getPackageInfo() {
      var extensionPackage = {};
      extensionPackage.name = list.currentText;
      extensionPackage.version = registerPanel.versionField.text
      extensionPackage.compatiblity = registerPanel.compatibiltyComboBox.currentText
      extensionPackage.description = registerDescription.document().toPlainText()
      extensionPackage.isPackage = registerPanel.isPackageCheckBox.checked
      extensionPackage.keywords = registerPanel.keywordsPanel.keywordsField.text.replace(/ /g, "").split(",");
      extensionPackage.repository = form.repoField.text
      extensionPackage.files = form.filesField.text.replace(/(, | ,)/g, ",").split(",");
      return extensionPackage;
    }

    // Pick Files From Repository -----------------------------------

    function pickFiles(){
      log.log('pick files')
      var repository = new Repository(form.repoField.text);
        
      var currentFolder = storelib.currentFolder;
      var pickerUi = UiLoader.load(currentFolder + "/pickFiles.ui");
      var files = repository.contents;
      log.debug(JSON.stringify(files, null, " "))

      pickerUi.show();
    }

    form.filesPicker.clicked.connect(this, pickFiles);

    form.show();
  }

  storeFrame.registerButton.clicked.connect(this, registerExtension)

  ui.show();
}



exports.configure = configure;