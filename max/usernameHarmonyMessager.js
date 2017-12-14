inlets = 1;
outlets = 3;

function setChord1() {
	var args = []
	for(var i = 0; i < arguments.length; i++) args.push(arguments[i]);
	outlet(0, args);
}

function setChord2() {
	var args = []
	for(var i = 0; i < arguments.length; i++) args.push(arguments[i]);
	outlet(1, args);
}

function setPoint() {
	var args = []
	for(var i = 0; i < arguments.length; i++) args.push(arguments[i]);
	outlet(2, args);
}