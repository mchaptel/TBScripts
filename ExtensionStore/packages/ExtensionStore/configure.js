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
  ui.minimumHeight = UiLoader.dpiScale(200);

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

  aboutFrame.updateRibbon.storeVersion.textFormat = Qt.RichText;
  storeFrame.storeVersionLabel.textFormat = Qt.RichText;
  var deprecatedMessage = ' - This version of the store is no longer supported. <br>Download it from <a href="https://github.com/mchaptel/ExtensionStore/"><span style=" text-decoration: underline; color:#55aaff;">https://github.com/mchaptel/ExtensionStore</span></a><br>and reinstall it to receive future updates.'

  if (localList.list.length > 0) {
    // we only do this if a local install List exists so as to not load the store until the user has clicked the button
    var storeExtension = store.storeExtension;

    if (storeExtension.hasOwnProperty(storeExtension.id)){
      var installedStore = localList.extensions[storeExtension.id];
    }else{
      // in case id changed (repo changed), we search by name
      for (var i in localList.extensions){
        if (localList.extensions[i].name == storeExtension.name) var installedStore = localList.extensions[i];
      }
    }

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
      aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion + " ✓ - Store is up to date."+deprecatedMessage);
    }

    storeFrame.storeVersionLabel.setText("v" + currentVersion+deprecatedMessage)
  } else {
    // in case of missing list file, we find out the current version by parsing the json ?
    var json = store.localPackage;
    if (json != null) {
      var currentVersion = json.version;
      aboutFrame.updateRibbon.storeVersion.setText("v" + currentVersion+deprecatedMessage);
      storeFrame.storeVersionLabel.setText("v" + currentVersion+deprecatedMessage);
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
    var newExtensions = localList.getData("newExtensions", []);
    var extensionLabel = extension.name + " v" + extension.version;

    if (newExtensions.indexOf(extension.id) != -1) extensionLabel += " ★new!"

    QTreeWidgetItem.call(this, [extensionLabel, icon], 1024);
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

    // store the extension id in the item
    this.setData(0, Qt.UserRole, extension.id);
  }
  ExtensionItem.prototype = Object.create(QTreeWidgetItem.prototype);


  // update the list of extensions
  function updateStoreList() {
    if (localList.list.length == 0) localList.createListFile(store);

    var filter = storeFrame.searchStore.text;
    var sellers = store.sellers;

    // save selection
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

    // expensive loading operation, maybe we could show a progress bar here somehow
    // (instead of doing it one line, do it seller by seller then extension by extension and update progress?)
    var extensions = store.extensions;

    // saving the list of extensions so we can pinpoint the new ones at next startup and highlight them
    var oldExtensions = localList.getData("extensions", [])
    var newExtensions = localList.getData("newExtensions", [])
    oldExtensions = oldExtensions.concat(newExtensions); // saving the new extensions from last time as old
    newExtensions = [];

    for (var i in extensions) {
      if (oldExtensions.indexOf(extensions[i].id) == -1) newExtensions.push(extensions[i].id);
    }

    localList.saveData("extensions", oldExtensions);
    localList.saveData("newExtensions", newExtensions);

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
    storeDescriptionPanel.sourceButton.toolTip = extension.package.repository;
    storeDescriptionPanel.websiteButton.toolTip = extension.package.website;

    // update install button to reflect whether or not the extension is already installed
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
    storeDescriptionPanel.installButton.enabled = (extension.package.files.length > 0)

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

    // converts the line breaks and double line breaks to html so they appear properly
    function htmlFromDescription(descriptionString){
      log.debug("converting string to html")
      var htmlString = "<p>"+descriptionString+"</p>";
      htmlString = htmlString.replace(/\n\n/g, "</p><p>")
                             .replace(/\n/g, "<br>");
      return htmlString;
    }

    function descriptionStringFromHtml(html){
      log.debug("converting html to string")
      var descriptionString = html.replace(/\\n/g, "")
                                  .replace(/\<\/p\>\<p\>/g, "\n\n")
                                  .replace(/\<br\>/g, "\n")
                                  .replace(/^\<p\>/g, "")
                                  .replace(/\<\/p\>$/g, "");

      log.debug(descriptionString);
      return descriptionString;
    }

    registerDescription.textChanged.connect(this, function () {
      descriptionPreview.setHtml(htmlFromDescription(registerDescription.document().toPlainText()));
    })

    // Load Package ----------------------------------------------------
    var list = registerPanel.extensionPicker;
    var authorBox = form.authorBox;
    var packageBox = form.packageBox;

    var updating = false;

    authorBox.enabled = false;
    registerPanel.enabled = false;

    // complete url textfield if previously entered
    var repoUrl = localList.getData("recentGithubUrl", "");
    log.debug(repoUrl);
    if (repoUrl) packageBox.packageUrl.setText(repoUrl);

    // load existing package
    // CBB : Change this into a validator for first line edit
    function getRepoUrl() {
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
        packageBox.packageUrl.text = "";
        return null;
      }

      // seller created then stored in the above scope
      var repoUrl = sellerUrl[0];
      localList.saveData("recentGithubUrl", repoUrl);
      return repoUrl;
    }


    /**
     * @Slot
     * loading a tbpackage from the repository url
     */
    packageBox.loadPackageButton.clicked.connect(this, function () {
      var url = getRepoUrl();
      if (!url) return;

      seller = new Seller(url);
      loadSeller(seller);
    })


    /**
     * @Slot
     * loading a tbpackage from a local json file
     */
    packageBox.loadPackageFromFileButton.clicked.connect(this, function () {
      var url = getRepoUrl();
      if (!url) return;

      seller = new Seller(url);
      var packageFile = QFileDialog.getOpenFileName(0, "Open Package File", System.getenv("userprofile"), "tbpackage.json")
      if (!packageFile) return;
      seller.loadFromFile(packageFile);
      loadSeller(seller);
    })


    /**
     * @Slot
     * creates a new empty package.
     */
    packageBox.newPackageButton.clicked.connect(this, function () {
      var url = getRepoUrl();
      if (!url) return

      seller = new Seller(url);
      seller.package = {}
      seller.addExtension("my first extension")
      loadSeller(seller);
    })


    /**
     * load the info from the seller into the form
     * @param {Seller} seller
     */
    function loadSeller(seller) {
      if (!seller.package) {
        MessageBox.information("No tbpackage.json found in repository.")
        return;
      }

      resetPanel();

      // update seller info
      authorBox.authorField.setText(seller.name);
      authorBox.websiteField.setText(seller.package.website);
      authorBox.socialField.setText(seller.package.social);

      authorBox.enabled = true;
      registerPanel.enabled = true;

      var extensions = seller.extensions;
      log.debug("found extensions", Object.keys(extensions));

      // add extensions to the drop down
      for (var i in extensions) {
        log.debug("adding extension " + extensions[i].name)
        list.addItem(extensions[i].name, extensions[i].id);
      }
      updatePackageInfo(0);
    }


    // Clears all values from the register panel
    function resetPanel() {
      updating = true
      authorBox.authorField.setText("");
      authorBox.websiteField.setText("");
      authorBox.socialField.setText("");

      // in case of reloading, first delete all existing items in drop down
      while (list.count) {
        list.removeItem(0);
      }

      registerPanel.versionField.setText("");
      registerPanel.compatibilityComboBox.setCurrentIndex(0);
      registerDescription.setPlainText("");
      registerPanel.isPackageCheckBox.checked = false;
      registerPanel.keywordsPanel.keywordsField.setText("");
      registerPanel.repoField.setText("");
      registerPanel.filesField.setText("");
      registerPanel.licenseType.setText("")

      updating = false
    }


    /**
     * @Slot
     * Update the information on the form based on the currently selected item in the QComboBox
     * @param {int} index    the index of the selected item in the QComboBox to use to update
     */
    function updatePackageInfo(index) {
      if (updating) return;
      updating = true;  // tell other functions you're updating
      if (list.count == 0) return
      var extensionId = list.itemData(index, Qt.UserRole);
      var extension = seller.extensions[extensionId];

      log.debug("displaying extension:", extensionId);
      log.debug(JSON.stringify(extension.package, null, " "));

      authorBox.authorField.setText(seller.name);
      registerPanel.authorName.setText(extension.package.author);
      registerPanel.versionField.setText(extension.package.version);
      var compatIndex = registerPanel.compatibilityComboBox.findText(extension.package.compatibility);
      registerPanel.compatibilityComboBox.setCurrentIndex(compatIndex);
      registerDescription.setPlainText(descriptionStringFromHtml(extension.package.description));
      registerPanel.isPackageCheckBox.checked = extension.package.isPackage;
      registerPanel.keywordsPanel.keywordsField.setText(extension.package.keywords.join(", "));
      registerPanel.repoField.setText(extension.package.repository);
      registerPanel.filesField.setText(extension.package.files.join(", "));
      registerPanel.licenseType.setText(extension.package.license)
      updating = false;
    }

    list["currentIndexChanged(int)"].connect(this, updatePackageInfo);
    /**
     * gather all the info from the form and save into the extension package
     */
    function savePackageInfo() {
      if (updating) return;  // don't respond to signals while updating
      var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
      var extension = seller.extensions[extensionId];

      var extensionPackage = {};

      extensionPackage.name = list.currentText;
      extensionPackage.author = registerPanel.authorName.text;
      extensionPackage.version = registerPanel.versionField.text;
      extensionPackage.compatibility = registerPanel.compatibilityComboBox.currentText;
      extensionPackage.isPackage = registerPanel.isPackageCheckBox.checked;
      extensionPackage.keywords = registerPanel.keywordsPanel.keywordsField.text.replace(/ /g, "").split(",");
      extensionPackage.repository = registerPanel.repoField.text;
      extensionPackage.license = registerPanel.licenseType.text;
      extensionPackage.files = registerPanel.filesField.text.replace(/(, | ,)/g, ",").split(",");
      extensionPackage.description = htmlFromDescription(registerDescription.document().toPlainText());
      extensionPackage.website = authorBox.websiteField.text;

      log.debug("saving package:");
      log.debug(JSON.stringify(extensionPackage, null, " "));
      extension.package = extensionPackage;
    }

    registerPanel.versionField.editingFinished.connect(this, savePackageInfo);
    registerPanel.licenseType.editingFinished.connect(this, savePackageInfo);
    registerPanel.compatibilityComboBox["currentIndexChanged(int)"].connect(this, savePackageInfo);
    registerDescription.focusOutEvent = savePackageInfo;
    registerPanel.isPackageCheckBox.stateChanged.connect(this, savePackageInfo);
    registerPanel.keywordsPanel.keywordsField.editingFinished.connect(this, savePackageInfo);
    registerPanel.repoField.editingFinished.connect(this, savePackageInfo);

    // Extension functions ------------------------------------------
    /**
     * @Slot
     * adds a new extension to the seller
     */
    function addExtension() {
      savePackageInfo()
      var newName = Input.getText("Enter new extension name:", "", "Prompt");
      if (!newName) return;
      var extension = seller.addExtension(newName);
      list.addItem(newName, extension.id);
      list.setCurrentIndex(list.findText(newName));
    }


    /**
     * @Slot
     * removes the extension described by the currently active item of the ComboBox
     */
    function removeExtension() {
      var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
      var name = seller.extensions[extensionId].name;
      seller.removeExtension[extensionId];
      list.removeItem(list.findText(name));
    }


    /**
     * @Slot
     * Rename the extension when activating the comboBox with a field that isn't part of the existing values
     */
    function renameExtension() {
      savePackageInfo()
      if (list.count == 0) return
      var newName = Input.getText("Rename extension:", list.currentText, "Prompt");
      if (!newName) return;
      log.debug("renaming to " + newName)

      var extensionId = list.itemData(list.currentIndex, Qt.UserRole);
      var extension = seller.extensions[extensionId];

      seller.renameExtension(extensionId, newName);
      list.setItemText(list.currentIndex, newName);
      list.setItemData(list.currentIndex, extension.id, Qt.UserRole);
    }

    registerPanel.addExtensionButton.clicked.connect(this, addExtension);
    registerPanel.removeExtensionButton.clicked.connect(this, removeExtension);
    registerPanel.renameExtensionButton.clicked.connect(this, renameExtension);

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
        // get the file/folder name and the parent folder
        var filePath = files[i].path;
        var isFolder = (filePath.slice(-1) == "/");
        if (isFolder) filePath = filePath.slice(0, -1); // remove the last slash for the split

        log.debug(filePath)

        var path = filePath.split("/");
        log.debug(path)
        var fileName = path.pop() + (isFolder ? "/" : "")// add a slash at the end of folders
        var folder = path.join("/") + "/";

        filePath = folder + fileName;
        var parent = items[folder];

        log.debug(folder)
        log.debug(fileName)

        var item = new QTreeWidgetItem(parent, [fileName], 2048);
        if (isFolder) item.setIcon(0, new QIcon(folderIcon));
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
        savePackageInfo();
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
      savePackageInfo()

      var saveFolder = localList.getData("packageLastSaved", System.getenv("userprofile")); // start from folder chosen last time
      var saveDestination = QFileDialog.getSaveFileName(0, "Save Package", saveFolder, "tbpackage.json");
      seller.package.name = authorBox.authorField.text;
      seller.package.website = authorBox.websiteField.text;
      seller.package.social = authorBox.socialField.text;
      if (!saveDestination) return;

      var saveFolder = saveDestination.slice(0, saveDestination.lastIndexOf("/"))
      localList.saveData("packageLastSaved", saveFolder) // save chosen folder for next time
      seller.exportPackage(saveDestination);

      var message = '<html><head /><body>'
      message += '<p>Export succesful.</p><p>Upload the file: '
      message += '<a href="' + saveFolder + '"><span style=" text-decoration: underline; color:#55aaff;">' + saveDestination + '</span></a>'
      message += ' to the root of the repository: '
      message += '<a href="' + packageBox.packageUrl.text + '"><span style=" text-decoration: underline; color:#55aaff;">' + packageBox.packageUrl.text + '</span></a>'
      message += ' to register your extensions.</p>'
      message += '<p>Make sure your repository is present in the list at this address:<br>'
      message += '<a href="https://github.com/mchaptel/TBScripts/blob/master/ExtensionStore/packages/ExtensionStore/SELLERSLIST"><span style=" text-decoration: underline; color:#55aaff;">https://github.com/mchaptel/TBScripts/blob/master/ExtensionStore/packages/ExtensionStore/SELLERSLIST</span></a></p>'
      message += "</body></html>"

      MessageBox.information(message)
    })

    form.show();
  }

  storeFrame.registerButton.clicked.connect(this, registerExtension);
  ui.show();
}



exports.configure = configure