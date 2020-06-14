////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_createColoredBackdrop.js v1.0.0
//
//     This script allows user to create a backdrop of any color.
//     Select nodes to create the backdrop around the selection.
//
//     This script requires the openHarmony library to be installed.
//     Get it here: https://github.com/cfourney/OpenHarmony
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This script is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

try{
  include("openHarmony.js");
}catch(err){
  MessageBox.information ("OpenHarmony is not installed. Get it here: \nhttps://github.com/cfourney/OpenHarmony")
}

function createColoredBackdrop() {
  // This script will prompt for a color and create a backdrop around the selection
  $.beginUndo("create colored backdrop")
  
  var doc = $.scn; 
  
  var nodes = doc.selectedNodes; 
  if (!nodes) return 
  
  var color = pickColor(); 
  var group = doc.root
  var backdrop = group.addBackdropToNodes(nodes, "BackDrop", "", color)
  
  $.endUndo();

  // function to get the color chosen by the user
  function pickColor() {
    var d = new QColorDialog;
    d.exec();
    var color = d.selectedColor();
    return new $.oColorValue({ r: color.red(), g: color.green(), b: color.blue(), a: color.alpha() })
  }
}