/* 
 * TwittHear - buildPhrase.js
 *	This script is responsible for assembling a musical phrase representing a tweet.
 *
 */

inlets = 1;
outlets = 4;

var userNotes = ["("];
var userDurations = ["("];
var userVelocities = ["("];

var tweetNotes = ["("];
var tweetDurations = ["("];
var tweetVelocities = ["("];


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
	
	userNotes = flatten(userNotes);
	userDurations = flatten(userDurations);
	userVelocities = flatten(userVelocities);
	
	tweetNotes.push(")");
	tweetDurations.push(")");
	tweetVelocities.push(")");
	
	tweetNotes = flatten(tweetNotes);
	tweetDurations = flatten(tweetDurations);
	tweetVelocities = flatten(tweetVelocities);
	
	var finalNotes = [];
	finalNotes = finalNotes.concat(tweetNotes);
	finalNotes = finalNotes.concat(userNotes);
	
	var finalDurations = [];
	finalDurations = finalDurations.concat(tweetDurations);
	finalDurations = finalDurations.concat(userDurations);
	
	var finalVelocities = [];
	finalVelocities = finalVelocities.concat(tweetVelocities);
	finalVelocities = finalVelocities.concat(userVelocities);
		
	outlet(0, finalNotes);
	outlet(1, finalDurations);
	outlet(2, finalVelocities);

	tweetNotes = ["("];
	tweetDurations = ["("];
	tweetVelocities = ["("];
	
	tweetNotes = ["("];
	tweetDurations = ["("];
	tweetVelocities = ["("];
}


/* 
 * createTweetPhrase()
 *	inputs: a string of serialized JSON with the tweet information to sonify 
 *  outputs: a fully formed tweet phrase
 */
function createTweetPhrase()
{
	tweet = JSON.parse(arguments[0]);

	// Sonify username of tweeter
	sonifyUsername(tweet.username);
	
	// Sonify the content of the tweet
	
	// Sonify the mentioned users

}


/* 
 * addUsername(notes)
 *	inputs: notes - an array of MIDI notes representing a sonified username 
 *  outputs: nothing, but adds a measure to the current phrase
 */
var addUsername = function(username, notes)
{
	var measNotes = ["("];
	var measDurations = ["("];
	var measVelocities = ["("];
	
	for(var i = 0; i < notes.length; i++) {
		if(i == notes.length - 1)
		{
			measNotes.push(notes[i] * 100);
			var dur = 16 - i;
			measDurations.push(dur.toString() + "/16")
			measVelocities.push(100);
		}
		else
		{
			measNotes.push(notes[i] * 100);
			measDurations.push("1/16")
			measVelocities.push(80);
		}
		
	}
	
	measNotes.push(")");
	measDurations.push(")");
	measVelocities.push(")");
	
	userNotes.push(measNotes);
	userDurations.push(measDurations);
	userVelocities.push(measVelocities);
	
	tweetNotes.push(["(", "nil", ")"]);
	tweetDurations.push(["(", -4, ")"]);
	tweetVelocities.push(["(", 1, ")"]);	

	post("Added username @" + username);
	post();
	
	outlet(3, bang);	
}


/* 
 * sonifyUsername(username)
 *	arguments: username - username to be sonified 
 *  outputs: nothing, calls addUsername()
 */
var sonifyUsername = function(username)
{
        var notes = [];

		for(var i = 0; i < username.length; i++) {
			var char = username.charAt(i);
			var ord = username.charCodeAt(i);
			
            if(ord == 95) {
                // '_'
                var note = 41
                notes.push(note)
			}
            else if(ord > 47 && ord < 58) {
                // '0-9'
                var note = ord + 20
                notes.push(note)
			}
            else if(ord > 96 && ord < 123) {
                // 'a-z'
                var note = ord - 19
                notes.push(note)
			}
            else if(ord > 64 && ord < 91) {
                // 'A-Z'
                var note = ord - 23
                notes.push(note)
			}
            else {
                post("Unrecognized char: " + char);
				post();
			}
		}
		
        addUsername(username, notes);
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