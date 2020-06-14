////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_connectAllSellNodes.js v1.0.1
//
//     This script lets user connect all selected nodes to the composite of their choice.
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This script is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


// to call this function no need to select the composite in the node view, it will be chosen with a prompt.
// set Shortcuts to the connect/Disconnect functions for easier use.

// add this function to a button in your scripting toolbar. Click with the Alt key down to disconnect.
function MC_ConnectButton(){
	if (KeyModifiers.IsAlternatePressed()){
		MC_disconnectAllSellNodes()
	}else{
		MC_connectAllSellNodes()
	}
}


function MC_connectAllSellNodes(){
	// connects selected Nodes to a chosen Composite
	scene.beginUndoRedoAccum("connectAllSelNodes");

	// get nodes sorted by coordinates
	var sel = selection.selectedNodes().sort(function (b,a){return (node.coordX(a)*10000+node.coordY(a)) - (node.coordX(b)*10000+node.coordY(b))});

	if (sel.length==0) return;

	var homeGroup = node.parentNode(sel[0])
	var sceneComps = getSceneComposites(homeGroup);

	// prompt for a composite to connect to if there is more than  one
	if (sceneComps.length > 1){
		var compsNames = sceneComps.map(function(x){return node.getName(x)})
		var comp =  homeGroup+"/"+Input.getItem("Select a composite to link to:", compsNames);	
	}else{
		var comp =  sceneComps[0]
	}
 
	// link the nodes to the comp
	for (var i in sel){
		linkNodes(sel[i], comp, 0, node.numberOfInputPorts(comp))
	}

	scene.endUndoRedoAccum();

}


function MC_disconnectAllSellNodes(){

	scene.beginUndoRedoAccum("disconnectAllSelNodes");

	var sel = selection.selectedNodes();
	for (var i in sel){
		for (var j=0; j<node.numberOfOutputPorts(sel[i]); j++){
			for (var k=0; k<node.numberOfOutputLinks(sel[i], j); j++){
				var dstNode = node.dstNode(sel[i], j, k)
				var port = getInputPort(sel[i], dstNode)
				if (port != -1) node.unlink(dstNode, port)
			}
		}
	}

	scene.endUndoRedoAccum();
}

// Helper functions --------------------------------------------------------
function getSceneComposites(group){
	// returns a sorted list of all the composite Nodes in a group
	var nodes = node.subNodes(group).filter(function(x){return node.type(x) == "COMPOSITE"})
	return nodes.sort(function (a,b){return (node.coordY(a)*10000+node.coordX(a)) - (node.coordY(b)*10000+node.coordX(b))});
}


function getInputPort(srcNode, dstNode){
	// find the InPort through wich two nodes are connected
	for (var i=0; i<node.numberOfInputPorts(dstNode); i++){
		var linkedNode = node.srcNode(dstNode, i);
		if (linkedNode == srcNode) return i;
	}
	return -1
}

function linkNodes(node1, node2, srcPort, dstPort, addInPort, addOutPort){
	// links nodes with optional parameters
	if (typeof addInPort === "undefined") addInPort = true
	if (typeof addOutPort === "undefined") addOutPort = true
	if (typeof srcPort === "undefined") srcPort = 0;
	if (typeof dstPort === "undefined")	dstPort = 0;

 	node.link(node1, srcPort, node2, dstPort, addInPort, addOutPort);
}