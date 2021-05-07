////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_pieMenu.js v0.0.1
//
//     This script shows a pie menu example using openHarmony.
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This script is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

try{
  include(specialFolders.userScripts + "/openHarmony.js");
}catch(err){
  MessageBox.information ("Problem loading OpenHarmony. Check that it is installed or get it here: \nhttps://github.com/cfourney/OpenHarmony")
}


function MC_pieMenu(){
  // we start a list of widgets to display in our pieMenu.
  var mainWidgets = [];

  // create a custom widget that change onion skin opacity
  var onionSkinSelect = new QWidget();
  var onionSkinLayout = new QVBoxLayout(onionSkinSelect);
  onionSkinLayout.addWidget(new QLabel("Onion skin"), 0, Qt.AlignHCenter);
  var onionSkinSlider = new QSlider(Qt.Horizontal);
  onionSkinSlider.minimum = 0;
	onionSkinSlider.maximum = 256;
  onionSkinSlider.maximumWidth = 70;
  onionSkinSlider.valueChanged.connect(function(value){
    preferences.setDouble("DRAWING_ONIONSKIN_MAX_OPACITY",
      value/256.0);
    view.refreshViews();
  })
  onionSkinLayout.addWidget(onionSkinSlider, 0, Qt.AlignHCenter);
  onionSkinSelect.setStyleSheet("background-color: rgba(0, 0, 0, 0%);");
  mainWidgets.push(onionSkinSelect);

  // add some buttons that activate tools
  mainWidgets.push(new $.oToolButton("Brush"))
  mainWidgets.push(new $.oToolButton("Pencil"))
  mainWidgets.push(new $.oToolButton("Line"))
  mainWidgets.push(new $.oToolButton("Eraser"))


  // we create a list of tool widgets for our submenu
  var toolSubMenuWidgets = [
    new $.oActionButton(
      "onActionChooseSelectToolInColorMode()",
      "scene",
      "",
      specialFolders.resource + "/icons/toolproperties/selectbycolour.svg"
    ),
    new $.oActionButton(
      "onActionChooseSelectToolInNormalMode()",
      "scene",
      "",
      specialFolders.resource + "/icons/drawingtool/select.svg"
    ),
    new $.oToolButton("Contour Editor"),
    // Fast Ellipse is a great tool from https://github.com/jonathan-fontaine/TBScripts
    // install it first for it to show up.
    new $.oToolButton("Fast Ellipse", specialFolders.userScripts + "/packages/FastEllipse/icons/circle.png"),
  ];
  // we initialise our submenu
  var toolSubMenu = new $.oPieSubMenu("More Tools", toolSubMenuWidgets);
  mainWidgets.push(toolSubMenu);


  // we create a list of color widgets for our submenu
  // with the colors of the current palette
  var colorSubMenuWidgets = [];
  var currentPalette = $.scn.selectedPalette;
  if (currentPalette){
    var colors = currentPalette.colors;
    for (var i in colors){
      colorSubMenuWidgets.push(new $.oColorButton(currentPalette.name, colors[i].name));
    }
    var colorSubMenu = new $.oPieSubMenu("colors", colorSubMenuWidgets);
    mainWidgets.push(colorSubMenu);
  }


  // we create a list of tool widgets for our submenu
  // (check out the scripts from http://raindropmoment.com and http://www.cartoonflow.com, they are great!)
  var ScriptSubMenuWidgets = [
    new $.oScriptButton(specialFolders.userScripts + "/CF_CopyPastePivots_1.0.1.js", "CF_CopyPastePivots" ),
    new $.oScriptButton(specialFolders.userScripts + "/ANM_Paste_In_Place.js", "ANM_Paste_In_Place"),
    new $.oScriptButton(specialFolders.userScripts + "/ANM_Set_Layer_Pivots_At_Center_Of_Drawings.js", "ANM_Set_Layer_Pivots_At_Center_Of_Drawings"),
    new $.oScriptButton(specialFolders.userScripts + "/DEF_Copy_Deformation_Values_To_Resting.js", "DEF_Copy_Deformation_Values_To_Resting"),
  ];
  var scriptsSubMenu = new $.oPieSubMenu("scripts", ScriptSubMenuWidgets);
  mainWidgets.push(scriptsSubMenu)


  // widget calling an action
  var applyAllButton = new $.oActionButton(
    "onActionToggleApplyToolToAllLayers()",
    "drawingView",
    "Apply To All",
    specialFolders.resource + "/icons/drawing/applytoalllevel.png"
  )
  mainWidgets.push(applyAllButton);

  // widget calling an action
  var flattenSettingButton = new $.oActionButton(
    "onActionFlatten()",
    "drawingView",
    "Flatten",
    specialFolders.resource + "/icons/drawingtool/flattentool.png"
  )
  mainWidgets.push(flattenSettingButton);

  // widget calling another widget from the Harmony UI
  var joinLinesButton = new $.oPieButton(
    specialFolders.resource + "/icons/toolproperties/join_pencil_line.svg",
    "Join Pencil Lines"
  )
  joinLinesButton.activate = function(){
    button = $.app.getWidgetByName("buttonJoinPencilLine", "frameOperations")
    button.clicked()
    MessageLog.trace(joinLinesButton)
    joinLinesButton.closeMenu()
  }
  mainWidgets.push(joinLinesButton);

  // we initialise our main menu. The numerical values are for the minimum and maximum angle of the
  // circle in multiples of Pi. Going counterClockwise, 0 is right, 1 is left, -0.5 is the bottom from the right,
  // and 1.5 is the bottom from the left side. 0.5 is the top of the circle.
  var menu = new $.oPieMenu("menu", mainWidgets, false, -0.2, 1.2);

  // configurating the look of it by adding gradients (any type supported by QBrush can be used)
  // this can be helpful to visually identify the different pie menus
  var backgroundGradient = new QRadialGradient (new QPointF(menu.center.x, menu.center.y), menu.maxRadius);
  var menuBg = menu.backgroundColor;
  backgroundGradient.setColorAt(1, new QColor(menuBg.red(), menuBg.green(), menuBg.blue(), 230));
  backgroundGradient.setColorAt(0, menuBg);

  var sliceGradient = new QRadialGradient (new QPointF(menu.center.x, menu.center.y), menu.maxRadius);
  var menuColor = menu.sliceColor;
  sliceGradient.setColorAt(1, new QColor(menuColor.red(), menuColor.green(), menuColor.blue(), 80));
  sliceGradient.setColorAt(0, menuColor);

  menu.backgroundColor = backgroundGradient;
  menu.sliceColor = sliceGradient

  // we show it!
  menu.show();
}