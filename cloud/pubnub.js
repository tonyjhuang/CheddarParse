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

// Takes: {pubkey, subkey, chatEvent}
function sendMessage(params) {
    params.type = TYPE.MESSAGE;
    return sendChatEvent(params);
}

// Takes: {pubkey, subkey, chatEvent}
function sendPresence(params) {
    params.type = TYPE.PRESENCE;
    return sendChatEvent(params);
}

// Takes: {pubkey, subkey, chatEvent, type}
function sendChatEvent(params) {
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

    var chatRoomId = params.chatEvent.get("alias").get("chatRoomId");

    return publish(pubkey, subkey, chatRoomId, payload);
}

// Publish a message through pubnub, returns a Promise.
function publish(pubkey, subkey, channel, payload) {
    var promise = new Parse.Promise();

    PubNub({
        publish_key: pubkey,
        subscribe_key: subkey
    }).publish({
        channel: channel,
        message: payload,
        callback: promise.resolve,
        error: promise.reject
    });

    return promise;
}

// Replays events from a given pubnub channel.
// Takes: {subkey, channel, startTimeToken, endTimeToken, count}
function replayChannel(params) {
    var pubnub = PubNub({
        subscribe_key: params.subkey
    });

    var promise = new Parse.Promise();

    pubnub.history({
        channel: params.channel,
        count: params.count,
        start: params.startTimeToken,
        end: params.endTimeToken,
        callback: function(result) {
            promise.resolve({"events":result[0],
                             "startTimeToken":result[1],
                             "endTimeToken":result[2]});
        },
        error: promise.reject
    });

    return promise;
}
