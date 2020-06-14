////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_KeyFrameJumper.js v1.0.1
//
//     This script makes the timeline jump from a key exposure to the next, 
//     even if the number in the XSheet is the same. Set to a shortcut for
//     easier use. Helpful in puppet animation for example!
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This script is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


function PreviousDrawing(){
	selNode = selection.selectedNode(0);

	if (selection.selectedNodes().length == 0) return;
	
	if (node.type(selNode) == "READ"){
		var curFrame = frame.current()
		var drawingColumn = node.linkedColumn(selNode, "DRAWING.ELEMENT");
		var keys = getColumnKeys(drawingColumn)

		if (keys.length == 0) return;

		if (keys[curFrame].startFrame>1){
			if (!keys[curFrame].isKeyFrame){
				var previousFrame = keys[curFrame].startFrame
			}else{
				var previousFrame = keys[keys[curFrame].startFrame-1].startFrame;
			}
			frame.setCurrent(previousFrame)
		}
	}
}


function NextDrawing(){
	selNode = selection.selectedNode(0);

	if (selection.selectedNodes().length == 0) return;

	if (node.type(selNode) == "READ"){
		var keysColumn = node.linkedColumn(selNode, "DRAWING.ELEMENT");
	} else if (node.type(selNode)){
		var keysColumn = node.linkedColumn(selNode, "DRAWING.ELEMENT");
	}

	var curFrame = frame.current()
	var keys = getColumnKeys(keysColumn)
	
	if (keys.length == 0) return;

	if (keys[curFrame].startFrame+keys[curFrame].duration < frame.numberOf()){
		var nextFrame = keys[curFrame].startFrame+keys[curFrame].duration;
		frame.setCurrent(nextFrame)
	}
}


function getColumnKeys(myColumn){
  var keys = new Array (frame.numberOf()+1)
  keys[1] = {isKeyFrame: true, duration: 0, startFrame:0, drawing: column.getEntry(myColumn, 1, 1)};
  var lastKey = 1
  var frameLength = 0

  for (var f=1; f<frame.numberOf()+1; f++){

    var isKey = !column.getTimesheetEntry(myColumn, 1, f).heldFrame
    var value = column.getEntry(myColumn, 1, f)

    if (isKey){
      frameLength = f-lastKey
      lastKey = f

      for (var i=1; i<=frameLength; i++){
        keys[f-i].duration = frameLength;
      }
    }

    keys[f] = {isKeyFrame: isKey, duration:0, startFrame: lastKey, drawing: value};
  }

  frameLength = frame.numberOf()-lastKey

  for (var i=lastKey; i<frame.numberOf(); i++){
    keys[i].duration = frameLength;
  }

  return keys;
}