var PubNub = require('cloud/utils/pubnub_lib');

module.exports.sendMessage = sendMessage;
module.exports.sendPresence = sendPresence;
module.exports.replayChannel = replayChannel;

var TYPE = {
    MESSAGE: {
        apns_title: "New Message",
        apns_getBody: function(message) {
            return message.get("alias").get("name") + " says: " + message.get("body");
        }
    },
    PRESENCE: {
        apns_title: "Cheddar", // Replace with ChatRoom name.
        apns_getBody: function(presence) {
            return presence.get("body");
        }
    }
}

// Takes: {pubkey, subkey, channel, chatEvent}, response
// Returns: pubnub response
function sendMessage(params, response) {
    params.type = TYPE.MESSAGE;
    sendChatEvent(params, response);
}

// Takes: {pubkey, subkey, channel, chatEvent}, response
// Returns: pubnub response
function sendPresence(params, response) {
    params.type = TYPE.PRESENCE;
    sendChatEvent(params, response);
}

// Returns a Promise.
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
// Takes: {pubkey, subkey, channel, chatEvent, type}, response
function sendChatEvent(params, response) {
    var pubnub = PubNub({
        publish_key: params.pubkey,
        subscribe_key: params.subkey
    });

    var payload = {
        "objectType": "ChatEvent",
        "object": params.chatEvent,
        "pn_apns": {
            "aps": {
                "alert": {
                    "title": params.type.apns_title,
                    "body": params.type.apns_getBody(params.chatEvent)
                }
            }
        },
        "pn_gcm": {
            "data": {
                "payload": {
                    "objectType": "ChatEvent",
                    "object": params.chatEvent
                }
            }
        }
    }

    pubnub.publish({
        channel: params.channel,
        message: payload,
        callback: function (result) {
          response.success(params.chatEvent);
        },
        error: response.error
    });
}

// Takes: {subkey, channel, startTimeToken, endTimeToken, count}, response
function replayChannel(params, response) {
    var pubnub = PubNub({
        subscribe_key: params.subkey
    });

    pubnub.history({
        channel: params.channel,
        count: params.count,
        start: params.startTimeToken,
        end: params.endTimeToken,
        callback: function(result){
            response.success({"events":result[0],
                              "startTimeToken":result[1],
                              "endTimeToken":result[2]});
        },
        error: response.error
     });
}
