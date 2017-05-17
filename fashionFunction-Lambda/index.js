'use strict';
 
const Alexa = require('alexa-sdk');
const APP_ID = 'amzn1.ask.skill.5538d155-8cba-4f07-b206-f86e62b6f2db';
const Https = require('https');
var http = require('https');
//WEATHER
var temp;
var apparentTemp;
var description;
//LOCATION
var lat;
var long;
var zip;
var bottomColor;
var topColor;

 
const ALL_ADDRESS_PERMISSION = "read::alexa:device:all:address";
const PERMISSIONS = [ALL_ADDRESS_PERMISSION];
 
 
 
/**
 * This is a small wrapper client for the Alexa Address API.
 */
 
class AlexaDeviceAddressClient {
 
    /**
     * Retrieve an instance of the Address API client.
     * @param apiEndpoint the endpoint of the Alexa APIs.
     * @param deviceId the device ID being targeted.
     * @param consentToken valid consent token.
     */
    constructor(apiEndpoint, deviceId, consentToken) {
        console.log("Creating AlexaAddressClient instance.");
        this.deviceId = deviceId;
        this.consentToken = consentToken;
        this.endpoint = apiEndpoint.replace(/^https?:\/\//i, "");
    }
 
    /**
     * This will make a request to the Address API using the device ID and
     * consent token provided when the Address Client was initialized.
     * This will retrieve the country and postal code of a device.
     * @return {Promise} promise for the request in flight.
     */
    getCountryAndPostalCode() {
        const options = this.__getRequestOptions(
            `/v1/devices/${this.deviceId}/settings/address/countryAndPostalCode`);
 
        return new Promise((fulfill, reject) => {
            this.__handleDeviceAddressApiRequest(options, fulfill, reject);
        });
    }
   
    getFullAddress() {
        const options = this.__getRequestOptions(`/v1/devices/${this.deviceId}/settings/address`);
 
        return new Promise((fulfill, reject) => {
            this.__handleDeviceAddressApiRequest(options, fulfill, reject);
        });
    }
    /**
     * This is a helper method that makes requests to the Address API and handles the response
     * in a generic manner. It will also resolve promise methods.
     * @param requestOptions
     * @param fulfill
     * @param reject
     * @private
     */
    __handleDeviceAddressApiRequest(requestOptions, fulfill, reject) {
        Https.get(requestOptions, (response) => {
            console.log(`Device Address API responded with a status code of : ${response.statusCode}`);
 
            response.on('data', (data) => {
                let responsePayloadObject = JSON.parse(data);
 
                const deviceAddressResponse = {
                    statusCode: response.statusCode,
                    address: responsePayloadObject
                };
 
                fulfill(deviceAddressResponse);
            });
        }).on('error', (e) => {
            console.error(e);
            reject();
        });
    }
 
    /**
     * Private helper method for retrieving request options.
     * @param path the path that you want to hit against the API provided by the skill event.
     * @return {{hostname: string, path: *, method: string, headers: {Authorization: string}}}
     * @private
     */
    __getRequestOptions(path) {
        return {
            hostname: this.endpoint,
            path: path,
            method: 'GET',
            'headers': {
                'Authorization': 'Bearer ' + this.consentToken
            }
        };
    }
}

 
 
var handlers = {
    'LaunchRequest': function () {
        console.log('yo did it get here?');
        this.emit('GetFashionAdvice');
    },
    'GetFashionAdvice': function() {
        var currentWeather = this;
        console.info("Starting getFashionAdvice()");
        console.log(JSON.stringify(this.event));
        
        const consentToken = this.event.context.System.user.permissions.consentToken;
        // If we have not been provided with a consent token, this means that the user has not
        // authorized your skill to access this information. In this case, you should prompt them
        // that you don't have permissions to retrieve their address.
        if(!consentToken) {
            this.emit(":tell", "We currently have no information on your current location. Please turn location permissions on for the Fashion Assistant skill in  your Alexa App.");
            // Lets terminate early since we can't do anything else.
            console.log("User did not give us permissions to access their address.");
            console.info("Ending getAddressHandler()");
            return;
        }
        const deviceId = this.event.context.System.device.deviceId;
        const apiEndpoint = this.event.context.System.apiEndpoint;

        const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);
        let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();
        deviceAddressRequest.then((addressResponse) => {
            switch(addressResponse.statusCode) {
                case 200:
                    //fetching zip
                    console.log("Address successfully retrieved, now responding to user.");
                    const address = addressResponse.address;
                    zip = address.postalCode;
                    console.log(zip);
                    //converting zip to latitude and longitude
                    var locationUrl = "https://www.zipcodeapi.com/rest/6vTjI3HySJalh3zZ9Q4d71M58OKZkGyqbsJUvrtnaEJrHjrR9w5gxSmGG6F1MerY/info.json/"+zip+"/degrees";
                    console.log(locationUrl);
                    parseLatLong(locationUrl, function(local){
                        lat = local.lat;
                        long = local.lng;
                        console.log("Lat: "+lat+" Long: "+long);
                        //using latitude and longitude to find local weather data
                        var weatherUrl = "https://api.darksky.net/forecast/0bd83559f6e8f1fa67b50984f6789cff/"+lat+","+long+"?UNITS=US";
                        parseJsonWeather(weatherUrl, function(weather) {
                            console.log(currentWeather);
                            temp = Math.round(weather.currently.temperature);
                            apparentTemp = Math.round(weather.currently.apparentTemperature);
                            console.log(apparentTemp);
                            description = weather.currently.summary;
                            //use local weather to determine what to tell a user
                            var speechText = "Since it feels like "+ apparentTemp +" degrees farenheit and " + description + " now, ";
                            var clothingChoice = "an outfit";
                            if(apparentTemp<20){
                                clothingChoice = "a warm outfit, like a long sleeved shirt, jacket, and long pants";
                            }
                            if(apparentTemp>=20 && apparentTemp<30){
                                clothingChoice = "a warm outfit, like a long sleeved shirt, jacket, and jeans";
                            }
                            if(apparentTemp>=30 && apparentTemp<40){
                                clothingChoice = "a warm outfit, like a long sleeved shirt and long pants";
                            }
                            if(apparentTemp>=40 && apparentTemp<50){
                                clothingChoice = "a warmer outfit, something like a long sleeved shirt and jeans";
                            }
                            if(apparentTemp>=50 && apparentTemp<60){
                                clothingChoice = "a t-shirt, jacket, and jeans. Today is perfect weather for it!";
                            }
                            if(apparentTemp>=60 && apparentTemp<70){
                                clothingChoice = "a room-temperature outfit. Maybe a t-shirt and jeans";
                            }
                            if(apparentTemp>=70 && apparentTemp<80){
                                clothingChoice = "a room-temperature outfit. Maybe a t-shirt and capris?";
                            }
                            if(apparentTemp>=80 && apparentTemp<90){
                                clothingChoice = "a lightweight outfit. Maybe a t-shirt and shorts?";
                            }
                            if(apparentTemp>=90){
                                clothingChoice = "a lightweight outfit. Maybe a tank top and shorts or a maxi-dress?";
                            }
                            speechText += "you should wear "+ clothingChoice;
                            currentWeather.emit(':tell', speechText);
                        });
                    });
                   
                    break;
                case 204:
                    // This likely means that the user didn't have their address set via the companion app.
                    console.log("Successfully requested from the device address API, but no address was returned.");
                    this.emit(":tell", "You have accepted permissions in the Alexa app but do not have an address set. Please set your address in the Alexa App");
                    break;
            }
        });
 
        deviceAddressRequest.catch((error) => {
            //this.emit(":tell", "there was an error yo");
            console.error(error);
            console.info("Ending getFashionAdvice()");
        });
    },
    'GetColorAdvice': function() {
        console.info("Starting getColorAdvice()");
        var currentWeather = this;
        console.log(currentWeather.event.request.intent.slots.ColorTwo.value);
        console.log(currentWeather.event.request.intent.slots.ColorOne.value);
        bottomColor = currentWeather.event.request.intent.slots.ColorOne.value.toLowerCase();
        topColor = currentWeather.event.request.intent.slots.ColorTwo.value.toLowerCase();
        var darkColor = [ 'leather', 'dark green', 'dark blue','burgundy','black','brown'];
        var lightColor = ['white','yellow','light green','neon green','turquoise','light pink','khaki'];
        var suggestion=false;
        console.log(JSON.stringify(this.event));
        
        const consentToken = this.event.context.System.user.permissions.consentToken;
        // If we have not been provided with a consent token, this means that the user has not
        // authorized your skill to access this information. In this case, you should prompt them
        // that you don't have permissions to retrieve their address.
        if(!consentToken) {
            this.emit(":tell", "We currently have no information on your current location. Please turn location permissions on for the Fashion Assistant skill in  your Alexa App.");
            // Lets terminate early since we can't do anything else.
            console.log("User did not give us permissions to access their address.");
            console.info("Ending getAddressHandler()");
            return;
        }
        const deviceId = this.event.context.System.device.deviceId;
        const apiEndpoint = this.event.context.System.apiEndpoint;

        const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);
        let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();
        deviceAddressRequest.then((addressResponse) => {
            switch(addressResponse.statusCode) {
                case 200:
                    //fetching zip
                    console.log("Address successfully retrieved, now responding to user.");
                    const address = addressResponse.address;
                    zip = address.postalCode;
                    console.log(zip);
                    //converting zip to latitude and longitude
                    var locationUrl = "https://www.zipcodeapi.com/rest/6vTjI3HySJalh3zZ9Q4d71M58OKZkGyqbsJUvrtnaEJrHjrR9w5gxSmGG6F1MerY/info.json/"+zip+"/degrees";
                    console.log(locationUrl);
                    parseLatLong(locationUrl, function(local){
                        lat = local.lat;
                        long = local.lng;
                        console.log("Lat: "+lat+" Long: "+long);
                        //using latitude and longitude to find local weather data
                        var weatherUrl = "https://api.darksky.net/forecast/0bd83559f6e8f1fa67b50984f6789cff/"+lat+","+long+"?UNITS=US";
                        parseJsonWeather(weatherUrl, function(weather) {
                            temp = Math.round(weather.currently.temperature);
                            apparentTemp = Math.round(weather.currently.apparentTemperature);
                            var speechText = "Since it feels like "+ apparentTemp +" degrees farenheit,";
           
                            if(apparentTemp<=50){
                                for(var i=0;i<=6;i++){
                                    if(lightColor[i]==topColor || lightColor[i]==bottomColor){
                                        suggestion=true;
                                    }
                                }
                                if(suggestion===true){
                                    speechText += "I would suggest wearing darker colors";
                                }
                                else if(suggestion===false){
                                    speechText += "I think that color combination is practical";
                                }
                                currentWeather.emit(':tell', speechText);
                            }
                            if(apparentTemp>50){
                                for(var j=0;j<=6;j++){
                                    if(darkColor[j]==topColor || darkColor[j]==bottomColor){
                                        suggestion=true;
                                    }
                                }
                                if(suggestion===true){
                                    speechText += "I would suggest wearing lighter colors";
                                }
                                else if(suggestion===false){
                                    speechText += "I think that color combination is practical";
                                }
                                currentWeather.emit(':tell', speechText);
                            }
                            currentWeather.emit(':tell', speechText);
                        });
                    });
                   
                    break;
                case 204:
                    // This likely means that the user didn't have their address set via the companion app.
                    console.log("Successfully requested from the device address API, but no address was returned.");
                    this.emit(":tell", "You have accepted permissions in the Alexa app but do not have an address set. Please set your address in the Alexa App");
                    break;
            }
        });
 
        deviceAddressRequest.catch((error) => {
            this.emit(":tell", "there was an error yo");
            console.error(error);
            console.info("Ending getColorAdvice()");
        });
        
    },
    'AMAZON.StopIntent': function() {
        this.emit(':tell', 'Goodbye!');
    },
    'SessionEndedRequest': function() {
        this.emit('AMAZON.StopIntent');
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMT');
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
 
    'AMAZON.CancelIntent': function () {
        this.emit('SessionEndedRequest');
    },
};
function parseLatLong(url, eventCallBack){
    http.get(url, function(res) {
        var body = "";
 
        res.on("data", function(chunk) {
            body += chunk;
            console.log(body);
        });
       
        res.on("end", function() {
            var result = JSON.parse(body);
            eventCallBack(result);
        });
    }).on("error", function(err) {
        console.log(err);
    });
}
function parseJsonWeather(url, eventCallBack) {
    http.get(url, function(res) {
        var body = "";
 
        res.on("data", function(chunk) {
            body += chunk;
        });
       
        res.on("end", function() {
            var result = JSON.parse(body);
            eventCallBack(result);
        });
    }).on("error", function(err) {
        console.log(err);
    });
}
 
 
console.log('Loading function');
 
exports.handler = function index(event, context, callback){
   
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    var permissionArray = ['read::alexa:device:all:address'];
    alexa.registerHandlers(handlers);
    alexa.execute();
};