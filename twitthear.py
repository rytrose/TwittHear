import OSC
import twitter
import threading
import twittercredentials
import dbcredentials
import mapscredentials
import pprint
from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types
from google.oauth2 import service_account
import json
from peewee import *
from datetime import date
from geolocation.main import GoogleMaps

'''
    Database and Models
'''
db = MySQLDatabase('twitthear', host="localhost", user=dbcredentials.user, passwd=dbcredentials.passwd)


class User(Model):
    username = TextField()
    features = TextField()

    class Meta:
        database = db


class TweetPhrase(Model):
    tweet_id = BigIntegerField(unique=True)
    filename = TextField()

    class Meta:
        database = db


class TwittHear:
    def __init__(self):
        self.maxServer = OSC.OSCServer(('127.0.0.1', 7000))
        self.maxServerThread = threading.Thread(target=self.maxServer.serve_forever)
        self.maxServerThread.daemon = False
        self.maxServerThread.start()

        self.maxClient = OSC.OSCClient()
        self.maxClient.connect(('127.0.0.1', 57121))

        self.maxServer.addMsgHandler("/saveTweetPhrase", self.saveTweetPhraseResponder)
        self.maxServer.addMsgHandler("/nextTweet", self.nextTweetPhraseResponder)

        self.tweets = []

        self.maps = GoogleMaps(api_key=mapscredentials.api_key)

        self.twitterAPI = twitter.Api(consumer_key=twittercredentials.consumer_key, consumer_secret=twittercredentials.consumer_secret,
                      access_token_key=twittercredentials.access_token_key, access_token_secret=twittercredentials.access_token_secret,
                      input_encoding=None, tweet_mode="extended")

        # Instantiates a Google NLP client
        cred = service_account.Credentials.from_service_account_file('TwittHear-a204ccf1b234.json')
        cred = cred.with_scopes(
            ['https://www.googleapis.com/auth/cloud-platform'])
        client = language.LanguageServiceClient(credentials=cred)

        # The text to analyze
        text = u'I\'m so happy for you!!!!!!'
        document = types.Document(
            content=text,
            type=enums.Document.Type.PLAIN_TEXT)

        # Detects the sentiment of the text
        # sentiment = client.analyze_sentiment(document=document).document_sentiment
        # print('Text: {}'.format(text))
        # print('Sentiment: {}, {}'.format(sentiment.score, sentiment.magnitude))

        self.setUpDatabase()

    def sendOSCMessage(self, addr, *msgArgs):
        msg = OSC.OSCMessage()
        msg.setAddress(addr)
        msg.append(*msgArgs)
        self.maxClient.send(msg)

    def setUpDatabase(self):
        try:
            db.create_tables([TweetPhrase, User])
        except:
            pass

    def getTweets(self, feed, search=''):
        if feed == "timeline":
            raw_tweets = self.twitterAPI.GetHomeTimeline(count=100)

        elif feed == "geocode":
            location = self.maps.search(location=search).first()
            if location:
                raw_tweets = self.twitterAPI.GetSearch(geocode=[location.lat, location.lng, "2mi"], count=100)
            else:
                print "Location not found."

        elif feed == "search":
            raw_tweets = self.twitterAPI.GetSearch(term=search, count=100)

        if len(raw_tweets) > 0:
            self.tweets = [{
                'id': t.id,
                'username': t.user.screen_name,
                'text': t.full_text,
                'favorites': t.favorite_count,
                'retweets': t.retweet_count,
                'mentioned_users': [u.screen_name for u in t.user_mentions]
            } for t in raw_tweets]
            return True
        else:
            print "No tweets found."
            return False

    '''
    def saveUserFeatures(self, username, features, override=False):
        matching_users = User.select().where(
            User.username == username).count()
        if matching_users > 0 and not override:
            print "User: " + username + " already exists."
        else:
            new_user = User(username=username, features=features)
            new_user.save()
            print "Created user " + username + "."
    '''

    def saveTweetPhraseResponder(self, addr, tags, stuff, source):
        id = long(stuff[0])
        filename = str(stuff[1])
        tweet_phrase = TweetPhrase(tweet_id=id, filename=filename)
        try:
            tweet_phrase.save()
            print "Saved tweet phrase: " + str(stuff[1]) + " for Tweet #" + str(stuff[0])
        except:
            uq = TweetPhrase.update(filename=filename).where(TweetPhrase.tweet_id == id)
            uq.execute()
            print "Updated tweet phrase: " + str(stuff[1]) + " for Tweet #" + str(stuff[0])

    def nextTweetPhraseResponder(self, addr, tags, stuff, source):
        # Get next tweet, called from Max
        pass

    def loadTweetPhrase(self, id):
        try:
            filename = TweetPhrase.get(TweetPhrase.tweet_id == id).filename
        except:
            print "Tweet with id #" + str(id) + " not found."
            return
        self.sendOSCMessage("/loadTweetPhrase", filename)

    def addUsername(self, username):
        to_send = self.sonifyUsername(username)
        to_send.append(username)
        self.sendOSCMessage("/addUsername", to_send)

    def sonifyUsername(self, username):
        notes = []

        for char in username:
            if ord(char) == 95:
                # '_'
                note = 41
                notes.append(note)
            elif ord(char) in range(48, 58):
                # '0-9'
                note = ord(char) + 20
                notes.append(note)
            elif ord(char) in range(97, 123):
                # 'a-z'
                note = ord(char) - 19
                notes.append(note)
            elif ord(char) in range(65, 91):
                # 'A-Z'
                note = ord(char) - 23
                notes.append(note)
            else:
                print "Unrecognized char: " + str(char)

        return notes

    def pause(self):
        self.sendOSCMessage("/pause", ["pause"])

    def resume(self):
        self.sendOSCMessage("/resume", ["resume"])