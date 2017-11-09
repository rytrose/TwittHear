# TwittHear
## Usage
User determines input between:

* Timeline
* Search Term
* Trending

The program then collects tweets according to the input and begins "playing" them.

## Mappings
Things to note:

* There needs to be a reproducible mapping between a handle and a generated sequence
    * e.g. ASCII <--> MIDI
    * This can (and should) be used for in-tweet user tags as well
* The generation should be deterministic, so that seeking between Tweets is reproducible just from feature extraction
