////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_linkPaletteToElements.js v1.0.0
//
//     This script links the selected palette to all selected nodes.
//     If shift is pressed and the selected palette is an element 
//     palette, it will be unlinked from all elements.
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

function MC_linkPaletteToElements(){

  $.beginUndo("link palettes");

  var doc = $.scn;
  var palette = doc.selectedPalette;

  if (!palette) return;

  var selectedNodes = doc.getSelectedNodes(true).filter(function(x){return x.type == "READ"});
  for (var i in selectedNodes){
    if (KeyModifiers.IsShiftPressed()){
      selectedNodes[i].unlinkPalette(palette);    
    }else{
      selectedNodes[i].linkPalette(palette);
    }      
  }

  $.endUndo();
}