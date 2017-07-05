'use strict';

const http = require('http');
const https = require('https');
const Alexa = require('alexa-sdk');

const APP_ID = 'amzn1.ask.skill.b10d250d-4358-466a-a9b2-4fd5a28db0bb';

const speech = {
    'sayAudio': function (src) {
        return "<audio src='" + src + "'/> ";
    },
    'sayPause':  function (time) {
        return "<break time=\"" + time + "\"/> ";
    },
    'output': function (outputSpeech, context) {
        context.attributes.repromptSpeech = " Anything else?";
        outputSpeech += context.attributes.repromptSpeech;
        context.emit(':ask', outputSpeech, context.attributes.repromptSpeech);
    }
};

const Vocab = {
    'sayWord': function (word) {
        var output = "";
        output += speech.sayAudio(word.sound);
        output += speech.sayPause('1000ms');
        output += word.item.response.text;
        output += speech.sayPause('1000ms');
        
        return output;
    },
    'saySentence': function (sentence) {
        if (!sentence) {
            return "";
        }
        
        var output = "";
        output += speech.sayAudio(sentence.sound);
        output += speech.sayPause('1000ms');
        output += speech.sayAudio(sentence.sound);
        output += speech.sayPause('1000ms');
        output += sentence.response.text;
        output += speech.sayPause('1000ms');
        output += speech.sayAudio(sentence.sound);
        output += speech.sayPause('2000ms');
        
        return output;
    },
    'sayVocab': function (data) {
        // handler for word of the day
        var day = this.getDayCount("7/2/2017") * 10;
        var output = "Vocabulary of the day: ";
        
        for (var i = day; i < day + 10; i++) {
            var word = data.goal_items[i];
            output += this.sayWord(word);
            
            var exampleSentence1 = word.sentences[0];
            var exampleSentence2 = word.sentences[1];
            output += this.saySentence(exampleSentence1);
            output += this.saySentence(exampleSentence2);
        }
        
        return output;
    },
    'getDayCount': function (sinceDateString) {
        // Get days passed sinceDateString
        var mdy = sinceDateString.split('/');
        var sinceDate = new Date(mdy[2], mdy[0]-1, mdy[1]);
        
        return Math.round((new Date() - sinceDate)/(1000*60*60*24));
    },
    'url': function () {
        return 'http://iknow.jp/api/v2/goals/566921?';
    }
};

const Weather = {
    'getFaren': function (kelvin) {
        return Math.floor(kelvin * (9/5) - 459.67);
    },
    'sayWeather': function (data) {
        var forecast = "Weather: The weather in " + data.name + " is " + data.weather[0].main + " with a high of " +
        this.getFaren(data.main.temp_max) + " and a low of " + this.getFaren(data.main.temp_min) + ". ";
        forecast += "It is currently " + this.getFaren(data.main.temp) + " degrees.";
        
        return forecast;
    },
    'url': function () {
        var city = "palo%20alto";
        var weatherURL = 'http://api.openweathermap.org/data/2.5/weather?q='+ city +'&&appid=51e3afe579df8bbb4584badce5bd804a';
        return weatherURL;
    }
};

const Commute = {
    'sayCommute': function (data) {
        var duration = data.rows[0].elements[0].duration.text;
        var num = duration.split(' ')[0];
        var commute = "Commute: ";
        
        if (num >= 50) {
            commute += "Oh damn. ";
        }
        else {
            commute += "Nice. ";
        }
        commute += "Looks like it will take " + duration + " to get to work this morning. ";
        return commute;
    },
    'url': function () {
        var origin = "214+Madison+St,+San+Francisco,+CA+94134";
        var destination = "3420+Hillview+Ave,+Palo+Alto,+CA+94304";
        var commuteURL = 'https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='+origin+'&destinations='+destination+'&key=AIzaSyDYAxLj15xgJEo8jiKHyV2lIzDDt7M21Ro';
        return commuteURL;
    }
};

const handlers = {
    'LaunchRequest': function () {
        this.attributes.repromptSpeech = ' What would you like to know about your morning?';
        this.attributes.speechOutput = 'Good morning Rosemary.' + this.attributes.repromptSpeech;
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },

    'GoodMorningIntent': function () {
        var self = this;
        const itemSlot = this.event.request.intent.slots.MorningDetails;
        
        let itemName;
        if (itemSlot && itemSlot.value) {
            itemName = itemSlot.value.toLowerCase();
        }

        if (itemName == 'thank you' || itemName == 'no') {
            this.emit(':tell', "Have a great day");
        }
        else {
            var options = {
                commute: function (callback) {
                    https.get( Commute.url(), function( response ) {
                        response.on('data', function( text ) {
                            var data = JSON.parse(text);
                            var commute = Commute.sayCommute(data);
                            callback(commute, self);
                        });
                        response.on('error', (e) => {
                            callback('error', self);
                        });
                    } );
                },
                weather: function (callback) {
                    http.get( Weather.url(), function( response ) {
                        response.on('data', function( text ) {
                            var data = JSON.parse(text);
                            var forecast = Weather.sayWeather(data);
                            callback(forecast, self);
                        });
                        response.on('error', (e) => {
                            callback('error', self);
                        });
                    } );
                },
                "word of the day": function (callback) {
                    http.get( Vocab.url(), function(response) {
                        var body = '';
                        response.on('data', function (chunk) {
                            body += chunk;
                        });
                        response.on('end', function() {
                            var data = JSON.parse(body);
                            var speechOutput = Vocab.sayVocab(data);
                            callback(speechOutput, self);
                        }).on('error', (e) => {
                            callback('error', self);
                        });
                    } );
                },
                everything: function () {
                    var outputSpeech = "";
                    var countDown = 2;

                    var promise = new Promise( (resolve, reject) => {
                        var callback = function (output, context) {
                            if (output == 'error') {
                                reject('Failed');
                            }

                            outputSpeech += output + ' ';
                            countDown--;

                            if (countDown === 0) {
                                resolve("Success");
                            }
                        };
                        options['commute'](callback);
                        options['weather'](callback);
                    });

                    promise.then(() => {
                        console.log('yyayyyy');
                        self.emit(':tell', outputSpeech);
                    }).catch(() => {
                        console.log('noooo0o');
                        self.emit(':tell', 'error: ' + outputSpeech);
                    });
                }
            };
            
            options[itemName](speech.output);
        }
    }
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
