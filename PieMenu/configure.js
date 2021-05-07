////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_pieMenu.js v0.0.1
//
//     This script creates a shortcut to the pie menu.
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This script is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


function configure(packageFolder, packageName) {
  var shortcutID = "PieMenu_MC_PieMenu";
  var launchCommand = 'MC_pieMenu in ' + specialFolders.userScripts + "/packages/PieMenu/MC_pieMenu.js";

  //Create Shortcut
  var shortcut = {
    id: shortcutID,
    text: "Pie Menu Example",
    action: launchCommand,
    longDesc: "Opens the pie menu.",
    categoryId: "PieMenu",
    categoryText: "Pie Menu"
  }

  ScriptManager.addShortcut(shortcut);
}

exports.configure = configure
