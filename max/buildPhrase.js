/* 
 * TwittHear - buildPhrase.js
 *	This script is responsible for assembling a musical phrase representing a tweet.
 *
 */

inlets = 1;
outlets = 4;

var notes = ["("];
var durations = ["("];
var velocities = ["("];


/* 
 * bang()
 *	arguments: an array of MIDI notes representing a sonified username 
 *  outputs:
 *   0 - a list of notes to be read by bach.score
 *   1 - a list of durations to be read by bach.score
 *   2 - a list of velocities to be read by bach.score
 */
function bang()
{
	notes.push(")");
	durations.push(")");
	velocities.push(")");
	outlet(0, flatten(notes));
	outlet(1, flatten(durations));
	outlet(2, flatten(velocities));
	outlet(3, bang);
	notes = ["("];
	durations = ["("];
	velocities = ["("];
}


/* 
 * addUsername()
 *	arguments: an array of MIDI notes representing a sonified username 
 *  outputs: nothing, but adds a measure to the current phrase
 */
function addUsername()
{
	var measNotes = ["("];
	var measDurations = ["("];
	var measVelocities = ["("];
	
	for(var i = 0; i < arguments.length - 1; i++) {
		if(i == arguments.length - 2)
		{
			measNotes.push(arguments[i] * 100);
			var dur = 16 - i;
			measDurations.push(dur.toString() + "/16")
			measVelocities.push(100);
		}
		else
		{
			measNotes.push(arguments[i] * 100);
			measDurations.push("1/16")
			measVelocities.push(80);
		}
		
	}
	
	measNotes.push(")");
	measDurations.push(")");
	measVelocities.push(")");
	
	notes.push(measNotes);
	durations.push(measDurations);
	velocities.push(measVelocities);
	post("Added username @" + arguments[arguments.length - 1]);
	post();
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