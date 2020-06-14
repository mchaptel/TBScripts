////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
//
//           Script MC_linkNodes.js v1.0.0
//
//     This script allows user to link nodes with a shortcut.
//     The node higher in the node view will be connected on top.
//     Use Shift to invert the direction of the connexion.
//
//     written by Mathieu Chaptel m.chaptel@gmail.com
//
//   This script is made available under the Mozilla Public license 2.0.
//   https://www.mozilla.org/en-US/MPL/2.0/
//
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


function MC_linkNodes (){
	var nodes = selection.selectedNodes();

	if (node.coordY(nodes[1])<node.coordY(nodes[0])){
		var node1 = nodes[1];
		var node2 = nodes[0];
	}else{
		var node2 = nodes[1]; 
		var node1 = nodes[0];
	}

	if (KeyModifiers.IsShiftPressed ()){
		var temp = node1;
		node1 = node2;
		node2 = temp;
	}

	srcPort = node.numberOfOutputPorts(node1)-1;
	if (srcPort < 0) srcPort = 0;

	dstPort = node.numberOfInputPorts(node2)-1;
	if (dstPort < 0) dstPort = 0;

	node.link(node1, srcPort, node2, dstPort, true ,true); 
}