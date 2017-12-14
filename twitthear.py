import OSC
import twitter
import threading
import twittercredentials
import dbcredentials
import mapscredentials
import awscredentials
from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types
from google.oauth2 import service_account
import json
from peewee import *
from geolocation.main import GoogleMaps
import boto3
import time
import sys
import nltk
import re
from nltk.corpus import cmudict

##############################################################
# Database and Models
##############################################################
db = MySQLDatabase('twitthear', host="localhost", user=dbcredentials.user, passwd=dbcredentials.passwd)

class TweetPhrase(Model):
    tweet_id = TextField(unique=True)
    filename = TextField()

    class Meta:
        database = db


##############################################################
# Listen to Alexa
##############################################################
class AlexaThread(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)

        # Instantiate AWS client
        region = 'us-east-2'
        self.queue_url = 'https://sqs.us-east-2.amazonaws.com/640585982580/TwitthearQueue'
        self.SQSClient = boto3.client('sqs', aws_access_key_id=awscredentials.aws_access_key_id,
                                      aws_secret_access_key=awscredentials.aws_secret_access_key, region_name=region)

        # Instantiate TwittHear
        self.twitthear = Twitthear()

    def run(self):
        while True:
            response = self.SQSClient.receive_message(QueueUrl=self.queue_url, MaxNumberOfMessages=10)
            try:
                message = response['Messages'][0]['Body']
                receipt = response['Messages'][0]['ReceiptHandle']
            except:
                message = None

            if message:
                message = str(message).lower()
                parsed_message = message.split(' ')

                print "Received Alexa command " + message

                command = parsed_message[0]
                if command == "play":
                    feed = parsed_message[1]
                    if feed == "timeline":
                        threading.Thread(target=self.twitthear.getTweets, args=('timeline', '')).start()
                    elif feed == "search":
                        search_term = ' '.join(parsed_message[2:])
                        threading.Thread(target=self.twitthear.getTweets, args=('search', search_term)).start()
                    elif feed == "location":
                        location = ' '.join(parsed_message[2:])
                        threading.Thread(target=self.twitthear.getTweets, args=('geocode', location)).start()
                    else:
                        print "Play feed " + str(feed) + " not understood."
                elif command == "pause":
                    threading.Thread(target=self.twitthear.pause).start()
                elif command == "resume":
                    threading.Thread(target=self.twitthear.resume).start()
                elif command == "back":
                    threading.Thread(target=self.twitthear.back).start()
                elif command == "forward":
                    threading.Thread(target=self.twitthear.forward).start()
                elif command == "save":
                    threading.Thread(target=self.twitthear.saveTweet).start()
                else:
                    print "Alexa command " + str(command) + " not understood."

                # Delete message from queue
                self.SQSClient.delete_message(QueueUrl=self.queue_url, ReceiptHandle=receipt)

            # Sleep a little
            time.sleep(0.2)

    ##############################################################
    # SQS Functions
    ##############################################################
    '''
      postMessage()
        Posts a message to the SQS Queue
    '''
    def postMessage(self, message_body):
        response = self.SQSClient.send_message(QueueUrl=self.queue_url, MessageBody=message_body)

    '''
      popMessage()
        Retrieves a message from the SQS Queue
    '''
    def popMessage(self):
        response = self.SQSClient.receive_message(QueueUrl=self.queue_url, MaxNumberOfMessages=10)

        # last message posted becomes messages
        message = response['Messages'][0]['Body']
        receipt = response['Messages'][0]['ReceiptHandle']
        self.SQSClient.delete_message(QueueUrl=self.queue_url, ReceiptHandle=receipt)
        return message

##############################################################
# Main Class
##############################################################
class Twitthear():
    def __init__(self):
        # Setup OSC
        self.maxServer = OSC.OSCServer(('127.0.0.1', 7000))
        self.maxServerThread = threading.Thread(target=self.maxServer.serve_forever)
        self.maxServerThread.daemon = False
        self.maxServerThread.start()

        self.maxClient = OSC.OSCClient()
        self.maxClient.connect(('127.0.0.1', 57121))

        self.maxServer.addMsgHandler("/saveTweetPhrase", self.saveTweetPhraseResponder)
        self.maxServer.addMsgHandler("/nextTweetPhrase", self.nextTweetPhraseResponder)

        self.nodeClient = OSC.OSCClient()
        self.nodeClient.connect(('127.0.0.1', 6000))

        # Current tweets to be sonified
        self.tweets = []
        self.tweetIndex = 0

        # Instantiate a Google Maps client for geocoding
        self.maps = GoogleMaps(api_key=mapscredentials.api_key)

        # Instantiate a Twitter client
        self.twitterClient = twitter.Api(consumer_key=twittercredentials.consumer_key, consumer_secret=twittercredentials.consumer_secret,
                                         access_token_key=twittercredentials.access_token_key, access_token_secret=twittercredentials.access_token_secret,
                                         input_encoding=None, tweet_mode="extended")

        # Instantiate a Google NLP client
        cred = service_account.Credentials.from_service_account_file('TwittHear-a204ccf1b234.json')
        cred = cred.with_scopes(
            ['https://www.googleapis.com/auth/cloud-platform'])
        self.NLPClient = language.LanguageServiceClient(credentials=cred)

        # Instantiate CMU Pronunciation Dictionary
        try:
            self.dict = cmudict.dict()
        except:
            print "Downloading cmudict..."
            nltk.download('cmudict')
            print "Downloaded cmudict."
            self.dict = cmudict.dict()

        # Attempt to create databases
        self.setUpDatabase()

    '''
      setUpDatabase()
        Initializes database tables
    '''
    def setUpDatabase(self):
        try:
            db.create_tables([TweetPhrase])
        except:
            pass

    '''
      sendOSCMessage()
        Sends a message to the OSC client (Max/MSP)
        inputs:
          addr - OSC address to send to
          *msgArgs - message contents
    '''
    def sendOSCMessage(self, addr, client=0, *msgArgs):
        msg = OSC.OSCMessage()
        msg.setAddress(addr)
        msg.append(*msgArgs)
        if client == 0:
            self.maxClient.send(msg)
        else:
            self.nodeClient.send(msg)

    ##############################################################
    # OSC Responder Functions
    ##############################################################
    '''
      saveTweetPhraseResponder()
        Saves a tweet phrase to database
        inputs:
          stuff[0] - filename of the tweet to save, formatted as {id}.txt
    '''
    def saveTweetPhraseResponder(self, addr, tags, stuff, source):
        filename = str(stuff[0])
        id = str(filename[:-4])
        tweet_phrase = TweetPhrase(tweet_id=id, filename=filename)
        try:
            tweet_phrase.save()
            print "Saved tweet phrase: " + str(filename) + " for Tweet #" + str(id)
        except:
            uq = TweetPhrase.update(filename=filename).where(TweetPhrase.tweet_id == id)
            uq.execute()
            print "Updated tweet phrase: " + str(filename) + " for Tweet #" + str(id)

    '''
      nextTweetPhraseResponder()
        Queues up another tweet to be played
        inputs:
          None
    '''
    def nextTweetPhraseResponder(self, addr, tags, stuff, source):
        # Get next tweet, called from Max
        if self.tweetIndex == len(self.tweets) - 1:
            self.sendOSCMessage("/finished", 0, ["finished"])
        else:
            self.tweetIndex += 1
            self.playTweet()


    ##############################################################
    # Twitter Function
    ##############################################################
    '''
      getTweets()
        Gathers tweets to sonify based on user input
        inputs:
          feed - expects 'timeline', 'geocode', or 'search'
          term - search term or location
    '''
    def getTweets(self, feed, term=''):
        if feed == "timeline":
            raw_tweets = self.twitterClient.GetHomeTimeline(count=100)

        elif feed == "geocode":
            location = self.maps.search(location=term).first()
            if location:
                raw_tweets = self.twitterClient.GetSearch(geocode=[location.lat, location.lng, "2mi"], count=100)
            else:
                print "Location not found."

        elif feed == "search":
            raw_tweets = self.twitterClient.GetSearch(term=term, count=100)

        if len(raw_tweets) > 0:

            self.tweets = [{
                'id': str(t.id),
                'username': t.user.screen_name,
                'text': t.full_text,
                'favorites': t.favorite_count,
                'retweets': t.retweet_count,
                'mentioned_users': [u.screen_name for u in t.user_mentions]
            } for t in raw_tweets]

            # Stop previous playback, start playing
            self.pause()
            self.tweetIndex = 0
            self.playTweet()
        else:
            print "No tweets found."
            return False


    ##############################################################
    # Transport Functions
    ##############################################################
    '''
      pause()
        Pauses playback in Max
    '''
    def pause(self):
        self.sendOSCMessage("/pause", 0, ["pause"])

    '''
      resume()
        Resumes playback in Max
    '''
    def resume(self):
        self.sendOSCMessage("/resume", 0, ["resume"])

    '''
      back()
        Queues the previously played tweet phrase
    '''
    def back(self):
        self.sendOSCMessage("/pause", 0, ["pause"])
        print "Back, tweetIndex going from " + str(self.tweetIndex) + "to " + str(max(0, self.tweetIndex - 1))
        self.tweetIndex = max(0, self.tweetIndex - 1)
        self.playTweet()

    '''
      forward()
        Queues the next tweet phrase
    '''
    def forward(self):
        self.sendOSCMessage("/pause", 0, ["pause"])
        self.tweetIndex = min(len(self.tweets) - 1, self.tweetIndex + 1)
        self.playTweet()

    ##############################################################
    # Phrase Generation and Functions
    ##############################################################
    '''
      playTweet()
        Queues and plays a tweet phrase
    '''
    def playTweet(self):
        # Get tweet to play
        tweet = self.tweets[self.tweetIndex]

        # Check if its phrase exists and load/play it if it does
        exists = self.loadTweetPhrase(tweet['id'])

        if(exists):
            # Tweet phrase exists, and is now playing
            print "Playing " + str(tweet['id'])
            return
        else:
            # Tweet doesn't exist, create/play new tweet phrase
            self.createTweetPhrase(tweet)

    '''
      createTweetPhrase()
        Generate a new tweet phrase in Max
          inputs:
            tweet - Twitthear representation of tweet information
    '''
    def createTweetPhrase(self, tweet):
        # Create document for Google sentiment analysis
        document = types.Document(
            content=tweet['text'],
            type=enums.Document.Type.PLAIN_TEXT)

        # Detect the sentiment of the text
        try:
            sentiment = self.NLPClient.analyze_sentiment(document=document).document_sentiment
            tweet['sentiment_score'] = sentiment.score
            tweet['sentiment_magnitude'] = sentiment.magnitude
        except:
            print "Language not understood for sentiment analysis."
            tweet['sentiment_score'] = 0
            tweet['sentiment_magnitude'] = 0

        tweet['syllables'] = []

        split = tweet['text'].encode('ascii', 'ignore').split(' ')

        for w in split:
            try:
                # Strip of non-alphanumeric characters
                word = re.sub('[\W_]', '', w)

                num_syl = self.nsyl(word)
                tweet['syllables'].append(num_syl)
            except:
                try:
                    pass
                    # print "Could not get the number of syllables in " + str(w)
                except:
                    pass
                    # print "Could not get the number of syllables in word."

        # Serialize the tweet
        serialized_tweet = json.dumps(tweet)

        # Send tweet to Max
        self.sendOSCMessage("/createTweetPhrase", 0, [serialized_tweet])

    def nsyl(self, word):
        return [len(list(y for y in x if y[-1].isdigit())) for x in self.dict[word.lower()]][0]

    '''
      loadTweetPhrase()
        Attempts to load a tweet phrase in Max given a tweet id
          inputs:
            id - tweet id to be loaded
          outputs:
            True if phrase was successfully loaded, False otherwise
    '''
    def loadTweetPhrase(self, id):
        try:
            # Check if tweet exists in database
            filename = TweetPhrase.get(TweetPhrase.tweet_id == id).filename
        except:
            print "Tweet with id #" + str(id) + " not found."
            return False

        # Send the file to load to Max
        self.sendOSCMessage("/loadTweetPhrase", 0, [filename])
        return True

    '''
      saveTweet()
        Saves a tweet by sending it to the visual interface
    '''
    def saveTweet(self):
        # Get currently playing tweet id
        try:
            id = self.tweets[self.tweetIndex]['id']
        except:
            print "No tweet currently playing."
            return

        # Get tweet embed html
        html = self.twitterClient.GetStatusOembed(status_id=id, omit_script=True)['html']

        if(html):
            # Send html to node
            self.sendOSCMessage("/showTweet", 1, [html.encode('ascii', 'ignore')])
        else:
            print "Unable to get HTML for this tweet."
            return