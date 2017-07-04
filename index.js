'use strict';

const Alexa = require('alexa-sdk');

const APP_ID = 'amzn1.ask.skill.b10d250d-4358-466a-a9b2-4fd5a28db0bb';

const handlers = {
	'LaunchRequest': function () {
		this.attributes.repromptSpeech = ' What would you like to know about your morning?';
		this.attributes.speechOutput = 'Good morning Rosemary.' + this.attributes.repromptSpeech;
		this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
	},

	'GoodMorningIntent': function () {
	    var http = require( 'http' );
	    var https = require( 'https' );
	    var city = "palo%20alto";
	    var origin = "214+Madison+St,+San+Francisco,+CA+94134";
	    var destination = "3420+Hillview+Ave,+Palo+Alto,+CA+94304";
	    
        var weatherURL = 'http://api.openweathermap.org/data/2.5/weather?q='+ city +'&&appid=51e3afe579df8bbb4584badce5bd804a';
        var wordURL = 'http://iknow.jp/api/v2/goals/566921?';
        var commuteURL = 'https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='+origin+'&destinations='+destination+'&key=AIzaSyDYAxLj15xgJEo8jiKHyV2lIzDDt7M21Ro';
        var self = this;
        this.attributes.repromptSpeech = " Anything else?";
        
        // generic callback handler
        var callback = function (responseText) {
            responseText += self.attributes.repromptSpeech;
            self.emit(':ask', responseText, self.attributes.repromptSpeech);
        };
        
        var getAudio = function (src) {
            return "<audio src='" + src + "'/> ";
        };
        
        var getPause = function (time) {
            return "<break time=\"" + time + "\"/> ";
        };
        
        var sayWord = function (word) {
            var speech = "";
            
            speech += getAudio(word.sound);
            speech += getPause('1000ms');
            speech += word.item.response.text;
            speech += getPause('1000ms');
            
            return speech;
        };
        
        var saySentence = function (sentence) {
            if (!sentence) {
                return;
            }
            
            var speech = "";
            
            speech += getAudio(sentence.sound);
            speech += getPause('1000ms');
            speech += getAudio(sentence.sound);
            speech += getPause('1000ms');
            speech += sentence.response.text;
            speech += getPause('1000ms');
            speech += getAudio(sentence.sound);
            speech += getPause('2000ms');
            
            return speech;
        };
        
        // vocabCallback handler for word of the day
        var vocabCallback = function (data) {
            var day = getDayCount("7/2/2017") * 10;
            var speech = "";
            
            for (var i = day; i < day + 10; i++) {
                var word = data.goal_items[i];
                speech += sayWord(word);
                
                var exampleSentence1 = word.sentences[0];
                var exampleSentence2 = word.sentences[1];
                speech += saySentence(exampleSentence1);
                speech += saySentence(exampleSentence2);
            }
            
            speech += self.attributes.repromptSpeech;
            self.emit(':ask', speech, self.attributes.repromptSpeech); 
        }
        
        // Get days passed sinceDateString
        var getDayCount = function (sinceDateString) {
            var mdy = sinceDateString.split('/');
            var sinceDate = new Date(mdy[2], mdy[0]-1, mdy[1]);
            
            return Math.round((new Date() - sinceDate)/(1000*60*60*24));
        }
        
        var getFaren = function (kelvin) {
            return Math.floor(kelvin * (9/5) - 459.67);
        };
        
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
				commute: function () {
				    https.get( commuteURL, function( response ) {
                        response.on( 'data', function( text ) {
                            var data = JSON.parse(text);
                            var duration = data.rows[0].elements[0].duration.text;
                            var num = duration.split(' ')[0];
                            
                            var commute = "";
                            if (num >= 50) {
                                commute += "Oh damn. ";
                            }
                            else {
                                commute += "Nice. ";
                            }
                            commute += "Looks like it will take " + duration + " to get to work this morning. ";
                            callback(commute);
                        } );
                    } );
				},
				weather: function () {
				    http.get( weatherURL, function( response ) {
                        response.on( 'data', function( text ) {
                            var data = JSON.parse(text);
                            var forecast = "The weather in " + data.name + " is " + data.weather[0].main + " with a high of " +
                                getFaren(data.main.temp_max) + " and a low of " + getFaren(data.main.temp_min) + ". ";
                            forecast += "It is currently " + getFaren(data.main.temp) + " degrees.";
                            callback(forecast);
                        } );
                    } );
				},
				"word of the day": function () {
				    var word = "random";
				    http.get( wordURL, function(response) {
			            var body = '';
                        response.on('data', function (chunk) {
                            body += chunk;
                        });
                        response.on( 'end', function() {
                            var data = JSON.parse(body);
                            vocabCallback(data);
                        }).on('error', (e) => {
                            self.emit(':ask', 'error. ' + e.message, self.attributes.repromptSpeech);
                        });
                    } );
				},
				everything: function () {
				    this["commute"]();
				    this["weather"]();
				    this["word of the day"]();
				}
			};
			
			options[itemName]();
		}
	}
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
