import OSC
import twitter
import threading
import twittercredentials
import dbcredentials
import pprint
from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types
from google.oauth2 import service_account
import json
from peewee import *
from datetime import date

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

        # self.twitterAPI = twitter.Api(consumer_key=twittercredentials.consumer_key, consumer_secret=twittercredentials.consumer_secret,
        #               access_token_key=twittercredentials.access_token_key, access_token_secret=twittercredentials.access_token_secret,
        #               input_encoding=None, tweet_mode="extended")
        #
        # tweets = self.twitterAPI.GetHomeTimeline(trim_user=True)
        # print tweets[0]
        # print tweets[0].full_text[:-24]

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

    def setUpDatabase(self):
        try:
            db.create_tables([TweetPhrase, User])
        except:
            pass

    def saveUserFeatures(self, username, features, override=False):
        matching_users = User.select().where(
            User.username == username).count()
        if matching_users > 0 and not override:
            print "User: " + username + " already exists."
        else:
            new_user = User(username=username, features=features)
            new_user.save()
            print "Created user " + username + "."

    def sendOSCMessage(self, addr, *msgArgs):
        msg = OSC.OSCMessage()
        msg.setAddress(addr)
        msg.append(*msgArgs)
        self.maxClient.send(msg)

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