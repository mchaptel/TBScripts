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


MessageLog.trace("Succesfully loaded Extension Store Package.");
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
  var log = new storelib.Logger("UI");
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

  var updateRibbonStyleSheet = "QWidget { background-color: blue; }";

  var folderIcon = specialFolders.resource + "/icons/old/oldfolder.png";
  var selectedFileBackground = new QBrush(new QColor(Qt.darkCyan), Qt.SolidPattern);
  var unselectedFileBackground = new QBrush(new QColor(Qt.transparent), Qt.SolidPattern);
  var includedFileBackground = new QBrush(new QColor(Qt.darkRed), Qt.SolidPattern);

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
      aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion + " ✓ - Store is up to date.");
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
      this.setToolTip(1, "Extension is installed correctly.");
      var localExtension = localList.extensions[extension.id];
      log.debug(extension.id, localList.checkFiles(localExtension));
      if (localExtension.currentVersionIsOlder(extension.version)) {
        icon = "↺";
        this.setToolTip(1, "Update available.");
      } else if (!localList.checkFiles(localExtension)) {
        icon = "!";
        this.setToolTip(1, "Some files from this extension are missing.");
      }
    } else {
      var icon = "✗";
    }
    this.setText(1, icon);
  }
  ExtensionItem.prototype = Object.create(QTreeWidgetItem.prototype);


  // update the list of extensions
  function updateStoreList() {
    if (localList.list.length == 0) localList.createListFile(store);

    var filter = storeFrame.searchStore.text;
    var sellers = store.sellers;

    if (extensionsList.selectedItems().length > 0) {
      var currentSelectionId = extensionsList.selectedItems()[0].data(0, Qt.UserRole);
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
  storeFrame.storeClearSearch.setStyleSheet("QToolButton { background-color: black }");
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
    if (localList.isInstalled(extension)) {
      var localExtension = localList.extensions[extension.id];
      if (!localExtension.currentVersionIsOlder(extension.version) && localList.checkFiles(extension)) {
        storeDescriptionPanel.installButton.removeAction(installAction);
        storeDescriptionPanel.installButton.removeAction(updateAction);
        storeDescriptionPanel.installButton.setDefaultAction(uninstallAction);
      } else {
        //change to update?
        storeDescriptionPanel.installButton.removeAction(installAction);
        storeDescriptionPanel.installButton.removeAction(uninstallAction);
        storeDescriptionPanel.installButton.setDefaultAction(updateAction);
      }
    } else {
      // installAction.setText("Install")
      storeDescriptionPanel.installButton.removeAction(uninstallAction);
      storeDescriptionPanel.installButton.removeAction(updateAction);
      storeDescriptionPanel.installButton.setDefaultAction(installAction);
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
    QDesktopServices.openUrl(new QUrl(storeDescriptionPanel.sourceButton.toolTip));
  });


  // View Website Button ----------------------------------------------
  storeDescriptionPanel.websiteButton.clicked.connect(this, function () {
    QDesktopServices.openUrl(new QUrl(storeDescriptionPanel.websiteButton.toolTip));
  });


  // Install Button ----------------------------------------------
  function installExtension() {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log.log("installing extension : " + extension.repository.name + extension.name);
    // log(JSON.stringify(extension.package, null, "  "))
    try {
      localList.install(extension);
      MessageBox.information("Extension " + extension.name + " v" + extension.version + "\nwas installed correctly.");
    } catch (err) {
      log.error(err);
      MessageBox.information("There was an error while installing extension\n" + extension.name + " v" + extension.version + ":\n\n" + err);
    }
    localList.refreshExtensions();
    updateStoreList();
  }

  var installAction = new QAction("Install", this);
  installAction.triggered.connect(this, installExtension);

  var updateAction = new QAction("Update", this);
  updateAction.triggered.connect(this, installExtension);
  // storeDescriptionPanel.installButton.setDefaultAction(installAction);

  // Install Button ----------------------------------------------------
  var uninstallAction = new QAction("Uninstall", this);

  uninstallAction.triggered.connect(this, function () {
    var selection = extensionsList.selectedItems();
    if (selection.length == 0) return;
    var id = selection[0].data(0, Qt.UserRole);
    var extension = store.extensions[id];

    log.log("uninstalling extension : " + extension.repository.name + extension.name);
    // log(JSON.stringify(extension.package, null, "  "))
    try {
      localList.uninstall(extension);
      MessageBox.information("Extension " + extension.name + " v" + extension.version + "\nwas uninstalled succesfully.");
    } catch (err) {
      log.error(err);
      MessageBox.information("There was an error while uninstalling extension\n" + extension.name + " v" + extension.version + ":\n\n" + err);
    }
    localList.refreshExtensions();
    updateStoreList();
  })

  // Register extension ------------------------------------------------

  function registerExtension() {
    var currentFolder = storelib.currentFolder;
    var form = UiLoader.load(currentFolder + "/register.ui");

    var Seller = storelib.Seller;
    var Repository = storelib.Repository;

    var seller;

    // Setup register panel --------------------------------------------
    var registerPanel = form.registerForm;
    var registerDescription = registerPanel.descriptionSplitter.widget(0);
    var htmlPreview = registerPanel.descriptionSplitter.widget(1);

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

    registerPanel.descriptionSplitter.setSizes([registerPanel.descriptionSplitter.width, 0]);

    registerDescription.textChanged.connect(this, function () {
      descriptionPreview.setHtml(registerDescription.document().toPlainText());
    })

    // Load Package ----------------------------------------------------
    var list = registerPanel.extensionPicker;
    var authorBox = form.authorBox;
    var packageBox = form.packageBox;

    var updating = false;

    authorBox.enabled = false;
    registerPanel.enabled = false;

    // load existing package       
    function loadPackage() {
      log.debug("loading package");
      var packageUrl = packageBox.packageUrl.text;
      if (packageUrl.slice(-1) != "/") {
        packageBox.packageUrl.text += "/";
        packageUrl = packageBox.packageUrl.text;
      }
      var sellerRe = /https:\/\/github.com\/[^\/]*\/[^\/]*\//i;
      var sellerUrl = sellerRe.exec(packageUrl);
      if (!sellerUrl) {
        MessageBox.information("Enter a valid github repository address.");
        return;
      }

      // seller created then stored in the above scope
      seller = new Seller(sellerUrl[0]);
    }

    
    packageBox.loadPackageButton.clicked.connect(this, function () {
      seller = {};
      loadPackage();
      loadSeller(seller);
    })


    packageBox.loadPackageFromFileButton.clicked.connect(this, function () {
      seller = {};
      loadPackage();
      var packageFile = QFileDialog.getOpenFileName(0, "Open Package File", System.getenv("userprofile"), "tbpackage.json")
      if (!packageFile) return;
      seller.loadFromFile(packageFile);
      loadSeller(seller);
    })


    packageBox.newPackageButton.clicked.connect(this, function () {
      seller = {};
      loadPackage();
      seller.package = {}
      loadSeller(seller);
    })


    /**
     * load the info from the seller into the form
     * @param {Seller} seller 
     */
    function loadSeller(seller) {
      if (!seller.package){
        MessageBox.information("No tbpackage.json found in repository.")
        return;
      } 
      var extensions = seller.extensions;
      if (Object.keys(extensions).length == 0) seller.addExtension("");

      log.debug("found extensions", Object.keys(extensions));

      // update seller info
      authorBox.authorField.setText(seller.name);
      authorBox.websiteField.setText(seller.package.website);
      authorBox.socialField.setText(seller.package.social);

      authorBox.enabled = true;
      registerPanel.enabled = true;

      // add extensions to the drop down
      for (var i in extensions) {
        list.addItem(extensions[i].name, extensions[i].id);
      }
      updatePackageInfo(0);

      list["currentIndexChanged(int)"].connect(this, updatePackageInfo);

      // save package when finishing editing any widget
      registerPanel.versionField.editingFinished.connect(this, savePackageInfo);
      registerPanel.compatibilityComboBox["currentIndexChanged(int)"].connect(this, savePackageInfo);
      registerDescription.focusOutEvent = savePackageInfo;
      registerPanel.isPackageCheckBox.stateChanged.connect(this, savePackageInfo);
      registerPanel.keywordsPanel.keywordsField.editingFinished.connect(this, savePackageInfo);
      registerPanel.repoField.editingFinished.connect(this, savePackageInfo);
    }


    /**
     * @Slot
     * Update the information on the form based on the currently selected item in the QComboBox
     * @param {int} index    the index of the selected item in the QComboBox to use to update
     */
    function updatePackageInfo(index) {
      updating = true;  // tell other functions you're updating
      var extensionId = list.itemData(index, Qt.UserRole);
      if (extensionId == undefined) {
        var extension = seller.addExtension(list.currentText);
        list.setItemData(index, extension.id, Qt.UserRole);
      } else {
        var extension = seller.extensions[extensionId];
      }

      log.debug("displaying extension:", extensionId);
      log.debug(JSON.stringify(extension.package, null, " "));

      registerPanel.versionField.setText(extension.package.version);
      var compatIndex = registerPanel.compatibilityComboBox.findText(extension.package.compatibility);
      registerPanel.compatibilityComboBox.setCurrentIndex(compatIndex);
      registerDescription.setPlainText(extension.package.description);
      registerPanel.isPackageCheckBox.checked = extension.package.isPackage;
      registerPanel.keywordsPanel.keywordsField.setText(extension.package.keywords.join(", "));
      registerPanel.repoField.setText(extension.package.repository);
      registerPanel.filesField.setText(extension.package.files.join(", "));
      updating = false;
    }


    /**
     * gather all the info from the form and save into the extension package
     */
    function savePackageInfo() {
      if (updating) return;  // don't respond to signals while updating
      var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
      var extension = seller.extensions[extensionId];

      var extensionPackage = {};
      extensionPackage.name = list.currentText;
      extensionPackage.version = registerPanel.versionField.text;
      extensionPackage.compatibility = registerPanel.compatibilityComboBox.currentText;
      extensionPackage.description = registerDescription.document().toPlainText();
      extensionPackage.isPackage = registerPanel.isPackageCheckBox.checked;
      extensionPackage.keywords = registerPanel.keywordsPanel.keywordsField.text.replace(/ /g, "").split(",");
      extensionPackage.repository = registerPanel.repoField.text;
      extensionPackage.files = registerPanel.filesField.text.replace(/(, | ,)/g, ",").split(",");

      log.debug("saving package:");
      log.debug(JSON.stringify(extensionPackage, null, " "));
      extension.package = extensionPackage;
    }

    // Extension functions ------------------------------------------
    function addExtension() {
      var newName = Input.getText("Enter new extension name:", "", "Prompt");
      if (!newName) return;
      var extension = seller.addExtension(newName);
      list.addItem(newName, extension.id);
      list.setCurrentIndex(list.findText(newName));
    }

    function removeExtension() {
      var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
      var name = seller.extensions[extensionId].name;
      seller.removeExtension[extensionId];
      list.removeItem(list.findText(name));
    }


    list["activated(QString)"].connect(this, function(text){
      var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
      if (list.findText(text) == -1){
        var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
        var name = list.currentText;
        list.setItemText(list.currentIndex, name)
        seller.renameExtension(extensionId, name);
        savePackageInfo();
      }
    })

    registerPanel.addExtensionButton.clicked.connect(this, addExtension);
    registerPanel.removeExtensionButton.clicked.connect(this, removeExtension);
    
    // Pick Files From Repository -----------------------------------
    /**
     * brings up a dialog to select the files to include in the extension from a repository
     */
    function pickFiles() {
      log.debug('pick files');

      var repoUrl = registerPanel.repoField.text;
      var includedFiles = registerPanel.filesField.text.split(",");

      // get a Repository object to fetch the content
      var repository = new Repository(repoUrl);
      var files = repository.contents;

      if (!files) {
        MessageBox.information("Repository url is not valid.");
        return;
      }
      log.debug(JSON.stringify(files, null, " "));

      // load and setup the dialog
      var pickerUi = UiLoader.load(storelib.currentFolder + "/pickFiles.ui");
      var filesPanel = pickerUi.filesSplitter.widget(0);
      var fileList = filesPanel.repoContents;
      var filterField = filesPanel.filterField;
      var addFiles = filesPanel.addFilesButton;
      var includedPanel = pickerUi.filesSplitter.widget(1);
      var includedFilesList = includedPanel.includedFiles;
      var removeFiles = includedPanel.removeFiles;

      pickerUi.repoName.text = repoUrl;

      // add a repo "root" item
      var root = new QTreeWidgetItem(fileList, ["/"], 2048);
      root.setData(0, Qt.UserRole, "/");
      root.setIcon(0, new QIcon(folderIcon));
      root.setExpanded(true);

      // add items from repo to files list
      var items = { "/": root };

      for (var i in files) {
        // format the files to start with "/" and end with it for folder
        var filePath = "/" + files[i].path;
        var path = filePath.split("/");
        var fileName = path.splice(-1, 1, "") + (files[i].type == "tree" ? "/" : ""); // add a slash at the end of folders

        var folder = path.join("/");
        filePath = folder + fileName;
        var parent = items[folder];

        var item = new QTreeWidgetItem(parent, [fileName], 2048);
        if (files[i].type == "tree") item.setIcon(0, new QIcon(folderIcon));
        item.setData(0, Qt.UserRole, filePath);
        item.setExpanded(true);
        items[filePath] = item;
      }

      // add the list of files included in the extension in the bottom list
      for (var i in includedFiles) {
        if (includedFiles[i] == "") continue;
        var fileItem = new QTreeWidgetItem(includedFilesList, [includedFiles[i]], 2048);
        // colorise the included files
        colorizeFiles(searchToRe("/" + includedFiles[i]), includedFileBackground);
      }


      /**
       * highlight files with colors for included files and files that pass the filter when editing 
       */
      function highlightFiles() {
        // remove all colors
        colorizeFiles(/.*/, unselectedFileBackground);

        // colorised files included by searches in includedFilesList
        for (var i = 0; i < includedFilesList.topLevelItemCount; i++) {
          var includedFiles = "/" + includedFilesList.topLevelItem(i).text(0);
          colorizeFiles(searchToRe(includedFiles), includedFileBackground);
        }

        // colorise files currently searched for
        var search = filterField.text;
        if (search == "") search = "*";

        var selection = fileList.selectedItems();
        for (var i in selection) {
          var baseFolder = selection[i].data(0, Qt.UserRole);
          colorizeFiles(searchToRe(baseFolder + search), selectedFileBackground);
        }

      }


      /**
       * converts a file search string with wildcard and extensions to a regex search
       * @param {string} search  the string to convert to a valid regex
       */
      function searchToRe(search) {
        if (search.slice(-1) == "/") search += "*";

        // sanitize input to prevent broken regex
        search = search.replace(/\./g, "\\.")
          // .replace(/\*/g, "[^/]*")   // this is to avoid selecting subfolders contents but do we want that?
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".");

        var searchRe = new RegExp("^" + search + "$", "i");

        return searchRe;
      }

      /**
       * colorise items based on regex
       * @param {RegExp} search   items that pass the filter will be colored 
       * @param {QBrush} color    a QBrush object that defines a background brush for QTreeWidgetItem 
       */
      function colorizeFiles(search, color) {
        for (var i in items) {
          if (!(items[i] instanceof QTreeWidgetItem)) continue;
          if (i.match(search)) items[i].setBackground(0, color);
        }
      }

      filterField.textChanged.connect(this, highlightFiles);
      fileList.itemSelectionChanged.connect(this, highlightFiles);


      // add file search to list
      addFiles.clicked.connect(this, function () {
        var selection = fileList.selectedItems();
        for (var i in selection) {
          var fileSearch = selection[i].data(0, Qt.UserRole) + filterField.text;
          var fileItem = new QTreeWidgetItem(includedFilesList, [fileSearch.slice(1)], 2048);  // we remove the first "/" before saving
        }

        for (var i = selection.length - 1; i >= 0; i--) {
          selection[i].setSelected(false);
        }

        filterField.text = "";
      });


      // remove the selection from the included List
      removeFiles.clicked.connect(this, function () {
        var selection = includedFilesList.selectedItems();
        for (var i = selection.length - 1; i >= 0; i--) {
          var selectedItem = includedFilesList.indexOfTopLevelItem(selection[i]);
          includedFilesList.takeTopLevelItem(selectedItem);
        }
        highlightFiles();
      })


      // gather the selected files, close dialog and update package
      pickerUi.confirmButton.clicked.connect(this, function () {
        var includedFiles = [];
        for (var i = 0; i < includedFilesList.topLevelItemCount; i++) {
          includedFiles.push(includedFilesList.topLevelItem(i).text(0));
        }
        registerPanel.filesField.text = includedFiles.join(",");
        pickerUi.close();
      })

      // cancel dialog
      pickerUi.cancelButton.clicked.connect(this, function () {
        pickerUi.close();
      })

      // Setting the appearance of the splitter
      pickerUi.show();
      pickerUi.filesSplitter.setSizes([pickerUi.filesSplitter.height * 0.8, pickerUi.filesSplitter.height * 0.2]);
    }

    registerPanel.filesPicker.clicked.connect(this, pickFiles);

    // Generate Package ---------------------------------------
    form.generateButton.clicked.connect(this, function () {
      var saveDestination = QFileDialog.getSaveFileName(0, "Save Package", System.getenv("userprofile"), "tbpackage.json");
      seller.package.website = authorBox.websiteField.text;
      seller.package.social = authorBox.socialField.text;
      if (!saveDestination) return; 
      seller.exportPackage(saveDestination);
      MessageBox.information("Export succesful. Upload the file\n"+saveDestination+"\nto the root of the repository\n"+packageBox.packageUrl.text+"\nto register your extensions.\n\nMake sure your repository is present in the list at this address :\nhttps://github.com/mchaptel/TBScripts/blob/master/ExtensionStore/packages/ExtensionStore/SELLERSLIST")
    })

    form.show();
  }

  storeFrame.registerButton.clicked.connect(this, registerExtension);
  ui.show();
}



exports.configure = configure