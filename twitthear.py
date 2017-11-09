import OSC
import twitter
import threading
import twittercredentials
import pprint
from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types
from google.oauth2 import service_account
import json

class TwittHear:
    def __init__(self):
        self.maxServer = OSC.OSCServer(('127.0.0.1', 7000))
        self.maxServerThread = threading.Thread(target=self.maxServer.serve_forever)
        self.maxServerThread.daemon = True
        self.maxServerThread.start()

        self.maxClient = OSC.OSCClient()
        self.maxClient.connect(('127.0.0.1', 57121))

        self.maxServer.addMsgHandler("/hello", self.testResponder)

        self.twitterAPI = twitter.Api(consumer_key=twittercredentials.consumer_key, consumer_secret=twittercredentials.consumer_secret,
                      access_token_key=twittercredentials.access_token_key, access_token_secret=twittercredentials.access_token_secret,
                      input_encoding=None, tweet_mode="extended")

        tweets = self.twitterAPI.GetHomeTimeline(trim_user=True)
        print tweets[0].full_text

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

    def sendOSCMessage(self, addr, *msgArgs):
        msg = OSC.OSCMessage()
        msg.setAddress(addr)
        msg.append(*msgArgs)
        self.maxClient.send(msg)

    def testResponder(self):
        pass

TwittHear()