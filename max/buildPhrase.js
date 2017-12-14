/* 
 * TwittHear - buildPhrase.js
 *	This script is responsible for assembling a musical phrase representing a tweet.
 *
 */

inlets = 1;
outlets = 6;

var userNotes = ["("];
var userDurations = ["("];
var userVelocities = ["("];
var userTies = ["("];

var tweetNotes = ["("];
var tweetDurations = ["("];
var tweetVelocities = ["("];
var tweetTies = ["("];

var tweetID = "";

var OCTOTONIC = [0, 1, 3, 4, 6, 7, 9, 10, 12];
var HARM_MINOR = [0, 2, 3, 5, 7, 8, 10, 12, 14];
var MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14];
var PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19];
var WHOLETONE = [0, 2, 4, 6, 8, 10, 12, 14, 16];

var usernameChordIn = []
var contentChordIn = []

var currentMeasure = {
	measBeats: 0,
	measNotes: ["("],
	measDurations: ["("],
	measVelocities: ["("],
	measTies: ["("]
}	

/* 
 * bang()
 *	arguments: an array of MIDI notes representing a sonified tweet 
 *  outputs:
 *   0 - a list of notes to be read by bach.score
 *   1 - a list of durations to be read by bach.score
 *   2 - a list of velocities to be read by bach.score
 */
function bang()
{
	userNotes.push(")");
	userDurations.push(")");
	userVelocities.push(")");
	userTies.push(")");
	
	userNotes = flatten(userNotes);
	userDurations = flatten(userDurations);
	userVelocities = flatten(userVelocities);
	userTies = flatten(userTies);
	
	tweetNotes.push(")");
	tweetDurations.push(")");
	tweetVelocities.push(")");
	tweetTies.push(")");
	
	tweetNotes = flatten(tweetNotes);
	tweetDurations = flatten(tweetDurations);
	tweetVelocities = flatten(tweetVelocities);
	tweetTies = flatten(tweetTies);
	
	var finalNotes = [];
	finalNotes = finalNotes.concat(tweetNotes);
	finalNotes = finalNotes.concat(userNotes);
	
	var finalDurations = [];
	finalDurations = finalDurations.concat(tweetDurations);
	finalDurations = finalDurations.concat(userDurations);
	
	var finalVelocities = [];
	finalVelocities = finalVelocities.concat(tweetVelocities);
	finalVelocities = finalVelocities.concat(userVelocities);
	
	var finalTies = [];
	finalTies = finalTies.concat(tweetTies);
	finalTies = finalTies.concat(userTies);
	
	outlet(0, finalNotes);
	outlet(1, finalDurations);
	outlet(2, finalVelocities);
	outlet(3, finalTies);
	outlet(4, tweetID);

	userNotes = ["("];
	userDurations = ["("];
	userVelocities = ["("];
	userTies = ["("];
	
	tweetNotes = ["("];
	tweetDurations = ["("];
	tweetVelocities = ["("];
	tweetTies = ["("];
}


/* 
 * createTweetPhrase()
 *	inputs: a string of serialized JSON with the tweet information to sonify 
 *  outputs: a fully formed tweet phrase
 */
function createTweetPhrase()
{
	tweet = JSON.parse(arguments[0]);
	tweetID = tweet.id;

	// Print tweet contents
	for(var e in tweet){
		post(e + ": ");
		post(tweet[e]);
		post();
	}

	// Init current measure
	currentMeasure = {
		measBeats: 0,
		measNotes: ["("],
		measDurations: ["("],
		measVelocities: ["("],
		measTies: ["("]
	}

	// Sonify username of tweeter
	sonifyUsername(tweet.username, 1);
	
	// Sonify the content of the tweet
	sonifyContent(tweet);
	
	// Sonify the mentioned users
	for(var i = 0; i < tweet.mentioned_users.length; i++){
		user = tweet.mentioned_users[i];
		if(i == tweet.mentioned_users.length - 1) {
			if(i % 2 == 1) sonifyUsername(user, 0.5);
 			else sonifyUsername(user, 1);
		}
		else sonifyUsername(user, 0.5);
	}

	outlet(5, bang);
}

function test() 
{
	setContentHarmony({
		sentiment_magnitude: 0.37,
		sentiment_score: 0.12
	});
}

function usernameIn() 
{
	usernameChordIn = arguments;
}

function contentIn() 
{
	contentChordIn = [];
	for(var i in arguments) contentChordIn.push(arguments[i]);
}


/* 
 * sonifyUsername(username)
 *	arguments: username - username to be sonified 
 *  outputs: pushes sonified content into the piece
 */
var sonifyUsername = function(username, len)
{
	
	// Get username harmony nodes
	var unH = this.patcher.getnamed("usernameHarmony");
	var nodesObject = unH.subpatcher().getnamed("usernameNodes");
	var uHMessager = unH.subpatcher().getnamed("usernameHarmonyMessager");
	var numberOfNodes = nodesObject.getattr("nodenumber");
	var nodeSizes = nodesObject.getattr("nsize");
	var nodeXs = nodesObject.getattr("xplace");
	var nodeYs = nodesObject.getattr("yplace");
	var nodes = [];
	for(var i = 0; i < numberOfNodes; i++) {
		nodes.push({
			x: nodeXs[i],
			y: nodeYs[i],
			r: nodeSizes[i]
		});
	}
	
	// Set username harmony
	var nameHalfOne = username.slice(0, Math.floor(username.length /2));
	var nameHalfTwo = username.slice(Math.floor(username.length /2), username.length);
	
	var harmonyHalfOne = getUsernameHarmony(nameHalfOne);
	var harmonyHalfTwo = getUsernameHarmony(nameHalfTwo);
	
	uHMessager.message("setChord1", harmonyHalfOne.chord);
	uHMessager.message("setChord2", harmonyHalfTwo.chord);

	// Get a chord in each node and in their overlap
	// Set y value based on offset
	var offset = (harmonyHalfOne.offset + harmonyHalfTwo.offset) % 10;
	
	p_y = 0.155 + (offset * 0.069);
	uHMessager.message("setPoint", [0.3, p_y]);
	var chord1 = ["("];
	for(var i in usernameChordIn) chord1.push(usernameChordIn[i]);
	chord1.push(")");
	
	uHMessager.message("setPoint", [0.5, p_y]);
	var chord2 = ["("];	
	for(var i in usernameChordIn) chord2.push(usernameChordIn[i]);
	chord2.push(")");
	
	uHMessager.message("setPoint", [0.7, p_y]);
	var chord3 = ["("];		
	for(var i in usernameChordIn) chord3.push(usernameChordIn[i]);
	chord3.push(")");	
	
	currentMeasure = addToMeasure("user", currentMeasure, chord1, 100, 0.0625)
	currentMeasure = addToMeasure("user", currentMeasure, chord2, 100, 0.0625)
	currentMeasure = addToMeasure("user", currentMeasure, chord3, 100, 0.25)
}


var getUsernameHarmony = function(username) {
	var octave = 0;
	var notes = [];
	var scale = [];
	var triadIndex = 0;
	var root = 0;
	var offset = 0;
	for(var i = 0; i < username.length; i++) {
		var char = username.charAt(i);
		var ord = username.charCodeAt(i);
		
		if(ord == 95) {
            // '_'
        	octave -= 1;
		}
        else if(ord > 47 && ord < 58) {
            // '0-9'
            offset += parseInt(char);
		}
        else if(ord > 96 && ord < 123) {
            // 'a-z'
            if(scale.length == 0) {
				if(ord > 96 && ord < 102) scale = OCTOTONIC;
				if(ord > 101 && ord < 107) scale = HARM_MINOR;
				if(ord > 106 && ord < 112) scale = MAJOR;
				if(ord > 111 && ord < 117) scale = PENTATONIC;
				if(ord > 116 && ord < 123) scale = WHOLETONE;
				
				var adjusted = ord - 96;
				root = (48 + (adjusted % 12)) * 100;
			}
			if(notes.length < 5) {
				notes.push(root + (scale[triadIndex] * 100));
				triadIndex += 2;
			}
		}
        else if(ord > 64 && ord < 91) {
            // 'A-Z'
            octave += 1;
		}
        else {
            post("Unrecognized char: " + char);
			post();
		}
	}
	if(notes.length == 0) notesOne = [6000];
	
	if(octave < -3) octave = -3;
 	if(octave > 3) octave = 3;
	notes = notes.map(function(x) { return x + (1200 * octave) });
	
	return {
		chord: notes,
		offset: offset
	}
}


/* 
 * sonifyContent(tweet)
 *	arguments: tweet - contains the metadata of the tweet to sonify 
 *  outputs: nothing, adds to current tweet phrase
 */
var sonifyContent = function(tweet) {
	
	// Establish velocity possibilities
	var velocities = [];
	
	if(tweet.sentiment_magnitude > 0.8) for(var i = 90; i < 111; i += 2) velocities.push(i);
	if(tweet.sentiment_magnitude > 0.6 && tweet.sentiment_magnitude <= 0.8) for(var i = 70; i < 91; i += 2) velocities.push(i);	
	if(tweet.sentiment_magnitude > 0.4 && tweet.sentiment_magnitude <= 0.6) for(var i = 50; i < 71; i += 2) velocities.push(i);	
	if(tweet.sentiment_magnitude > 0.2 && tweet.sentiment_magnitude <= 0.4) for(var i = 30; i < 51; i += 2) velocities.push(i);	
	if(tweet.sentiment_magnitude > 0 && tweet.sentiment_magnitude <= 0.2) for(var i = 10; i < 31; i += 2) velocities.push(i);	
	
	for(var i = 0; i < tweet.syllables.length; i++) {		
		var numNotes = tweet.syllables[i];
		
		// Choose the value to rest for after this word
		var wordRest = chooseRandom([0.0625, 0.0625, 0.03125]);
		
		for(var j = 0; j < numNotes; j++){
			// Establish chord context
			if(contentChordIn.length == 0) setContentHarmony(tweet);
			
			var noteInd = Math.floor(contentChordIn.length * Math.random());
			var cents = contentChordIn.splice(noteInd, 1);
			var vel = chooseRandom(velocities);
			var dur = chooseRandom([0.0625, 0.0625]);
			
			// Add the syllable chord
			currentMeasure = addToMeasure("tweet", currentMeasure, cents, vel, dur);
		}
		
		// Add rest after each word
		currentMeasure = addToMeasure("tweet", currentMeasure, "nil", -1, wordRest);
	}
	
	// Reset harmony
	contentChordIn = [];
	
	// End current measure
	if(currentMeasure.measBeats != 0) currentMeasure = addToMeasure("tweet", currentMeasure, "nil", -1, 1 - currentMeasure.measBeats);
}


var setContentHarmony = function(tweet) {
	var mode;
	if(tweet.sentiment_score > 0) mode = MAJOR;
	else mode = HARM_MINOR;
	
	var root = (Math.floor((100 * tweet.sentiment_score) % 6) * 100) + 6000;
	
	// Root triad
	var triadIndex = 0;
	var chord5 = [];
	for(var i = 0; i < 3; i++) {
		chord5.push(root + (mode[triadIndex] * 100));
		triadIndex += 2;
 	}

	// vii
	triadIndex = 0;
	var chord1 = [];
	for(var i = 0; i < 3; i++) {
		if(mode == HARM_MINOR) {
			if(i == 2) chord1.push(chord5[i] - 200);
			else chord1.push(chord5[i] - 100);
		}
		else {
			if(i == 0) chord1.push(chord5[i] - 100);
			else chord1.push(chord5[i] - 200);
		}
 	}

	// V
	triadIndex = 0;
	var chord2 = [];
	for(var i = 0; i < 3; i++) {
		chord2.push(chord5[i] + 700);
 	}

	// vi
	triadIndex = 0;
	var chord3 = [];
	for(var i = 0; i < 3; i++) {
		if(mode == HARM_MINOR) chord3.push(chord5[i] - 300);
		else {
			if(i == 1) chord3.push(chord5[i] - 400);
			else chord3.push(chord5[i] - 300);
		}
 	}

	// IV
	triadIndex = 0;
	var chord4 = [];
	for(var i = 0; i < 3; i++) {
		chord4.push(chord5[i] - 700);
 	}

	// Get content harmony nodes
	var conH = this.patcher.getnamed("contentHarmony");
	var nodesObject = conH.subpatcher().getnamed("contentNodes");
	var conHMessager = conH.subpatcher().getnamed("contentHarmonyMessager");
	
	conHMessager.message("setChord1", chord1);
	conHMessager.message("setChord2", chord2);
	conHMessager.message("setChord3", chord3);
	conHMessager.message("setChord4", chord4);
	conHMessager.message("setChord5", chord5);
	
	if(tweet.sentiment_score > 0 && tweet.sentiment_magnitude > 0) conHMessager.message("setPoint", [0.5 + (Math.random()/2),  Math.random()/2]);
	else if(tweet.sentiment_score > 0 && tweet.sentiment_magnitude < 0) conHMessager.message("setPoint", [0.5 + (Math.random()/2),  0.5 + (Math.random()/2)]);
	else if(tweet.sentiment_score < 0 && tweet.sentiment_magnitude > 0) conHMessager.message("setPoint", [Math.random()/2,  Math.random()/2]);
	else conHMessager.message("setPoint", [Math.random()/2,  0.5 + (Math.random()/2)]);
}


/* 
 * addToMeasure(voice, measBeats, measNotes, measDurations, measVelocities, measTies, cents, vel, dur)
 *	inputs: voice - whether the measure to be added to is for the user or tweet voice
 *          measNotes - the notes of the measure
 *          measDurations - the durations of the measure
 *          measVelocities - the velocities of the measure
 *          measTies - the ties of the measure
 *			cents - the cent value(s) to add to the measure
 *			vel - the velocity value to add to the measure
 *			dur - the duration value to add to the measure
 *  outputs: nothing, but adds to the measure buffers
 */
var addToMeasure = function(voice, currentMeasure, cents, vel, dur) {

	// Add rhythm to measure, see if it needs to be tied
	currentMeasure.measBeats += dur;
	
	if(currentMeasure.measBeats >= 1) {
		// Needs to be tied
		// Find the duration of the extra
		var extra = currentMeasure.measBeats - 1;
		var thisMeas = dur - extra;
		
		// Finish this measure
		currentMeasure.measNotes.push(cents);
		currentMeasure.measDurations.push(decimalToFrac(thisMeas));
		currentMeasure.measVelocities.push(vel);
		if(currentMeasure.measBeats == 1) currentMeasure.measTies.push(0); 
		else currentMeasure.measTies.push(1);
		
		currentMeasure = finishMeasure(voice, currentMeasure);
		
		currentMeasure.measBeats = extra;	
		
		// Start new measure
		if(extra != 0) {
			currentMeasure.measNotes.push(cents);
			currentMeasure.measDurations.push(decimalToFrac(extra));
			currentMeasure.measVelocities.push(vel);
			currentMeasure.measTies.push(0);
		}
	}
	else {
		// Does not need to be tied
		currentMeasure.measNotes.push(cents);
		currentMeasure.measDurations.push(decimalToFrac(dur));
		currentMeasure.measVelocities.push(vel);
		currentMeasure.measTies.push(0);
	}
	
	return currentMeasure;
}


/* 
 * finishMeasure(voice, measNotes, measDurations, measVelocities, measTies)
 *	inputs: voice - whether the measure to be finished is for the user or tweet voice
 *          measNotes - the notes of the measure
 *          measDurations - the durations of the measure
 *          measVelocities - the velocities of the measure
 *          measTies - the ties of the measure
 *  outputs: nothing, but resets the measure
 */
var finishMeasure = function(voice, currentMeasure){
	
	currentMeasure.measNotes.push(")");
	currentMeasure.measDurations.push(")");
	currentMeasure.measVelocities.push(")");
	currentMeasure.measTies.push(")");
	
	if(voice == "user") {
		userNotes.push(currentMeasure.measNotes);
		userDurations.push(currentMeasure.measDurations);
		userVelocities.push(currentMeasure.measVelocities);
		userTies.push(currentMeasure.measTies);
		
		tweetNotes.push(["(", "nil", ")"]);
		tweetDurations.push(["(", -1, ")"]);
		tweetVelocities.push(["(", 1, ")"]);
		tweetTies.push(["(", 0, ")"]);
	} else {
		tweetNotes.push(currentMeasure.measNotes);
		tweetDurations.push(currentMeasure.measDurations);
		tweetVelocities.push(currentMeasure.measVelocities);
		tweetTies.push(currentMeasure.measTies);
		
		userNotes.push(["(", "nil", ")"]);
		userDurations.push(["(", -1, ")"]);
		userVelocities.push(["(", 1, ")"]);
		userTies.push(["(", 0, ")"]);
	}
	
	return {
		measBeats: 0,
		measNotes: ["("],
		measDurations: ["("],
		measVelocities: ["("],
		measTies: ["("]		
	}
}


/* 
 * inNode(x_c, y_c, x_p, y_p, r)
 *	input:  x_c, y_c - coordinates of the node
 *		 	x_p, y_p - coordinates of the point to check
 *          r - radius of the node
 *  outputs: an array with depth of one
 */
var inNode = function(x_c, y_c, x_p, y_p, r) {
	return Math.pow(x_p - x_c, 2) + Math.pow(y_p - y_c, 2) < Math.pow(r, 2);
}


/* 
 * flatten(arr)
 *	input: an array to be flattened
 *  outputs: an array with depth of one
 */
var flatten = function(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}


/* 
 * chooseRandom(arr)
 *	input: array from which to choose a random element
 *  outputs: a random element from the array
 */
var chooseRandom = function(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}


/* 
 * gcd(decimal)
 *	helper gcd function
 */
var gcd = function(a, b) {
  if (b < 0.0000001) return a;      // Since there is a limited precision we need to limit the value.
  return gcd(b, Math.floor(a % b)); // Discard any fractions due to limitations in precision.
}


/* 
 * decimalToFrac(decimal)
 *	input: decimal to convert to fraction
 *  outputs: converted fraction as a string
 */
var decimalToFrac = function(decimal){
	var len = decimal.toString().length - 2;
	var denominator = Math.pow(10, len);
	var numerator = decimal * denominator;
	var divisor = gcd(numerator, denominator);
	
	numerator /= divisor;
	denominator /= divisor;
	
	return Math.floor(numerator) + '/' + Math.floor(denominator);
}
