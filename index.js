'use strict';

const Alexa = require('alexa-sdk');

const APP_ID = 'amzn1.ask.skill.b10d250d-4358-466a-a9b2-4fd5a28db0bb';

const handlers = {
	'LaunchRequest': function () {
		this.attributes.speechOutput='Good morning Rosemary. What would you like to know about your morning?';
		this.attributes.repromptSpeech = 'What would you like to know about your morning?';
		this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
	},

	'GoodMorningIntent': function () {
	    var http = require( 'http' );
        var weatherURL = 'http://api.openweathermap.org/data/2.5/weather?q='+ "palo%20alto" +'&&appid=51e3afe579df8bbb4584badce5bd804a';
        var wordURL = 'http://www.wordsapi.com/mashape/words/{0}?when=2017-07-01T08:43:45.502Z&encrypted=8cfdb28de722949bea9007bfe758babaaeb4280935ff95b8';
        var self = this;
        
        // Callback handler for weather
        var callback = function (responseText) {
            self.emit(':tell', responseText);
        };
        
        var getFaren = function (kelvin) {
            return Math.floor(kelvin * (9/5) - 459.67);
        };
        
		const itemSlot = this.event.request.intent.slots.MorningDetails;
		let itemName;
		if (itemSlot && itemSlot.value) {
			itemName = itemSlot.value.toLowerCase();
		}
		
		this.attributes.repromptSpeech = "Anything else?";

		if (itemName == 'thank you') {
			this.emit(':tell', "Have a great day");
		}
		else {
			var word = ['rock', 'paper', 'scissors', 'lizard', 'spock'];
			var rand = Math.floor(Math.random()*5);
			var alexa_word = word[rand];
			
			var options = {
				commute: function () {
				    self.emit(':ask', "you said commute.", self.attributes.repromptSpeech);
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
				    http.get( wordURL.replace('{0}', word), function( response ) {
                        response.on( 'data', function( text ) {
                            var data = JSON.parse(text);
                            var definition = data.results[0].definition;
                            callback(word + '. ' + definition);
                        } );
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
