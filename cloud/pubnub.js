var PubNub = require('cloud/utils/pubnub_lib');

module.exports.sendMessage = sendMessage;
module.exports.sendPresence = sendPresence;
module.exports.sendChangeRoomName = sendChangeRoomName;
module.exports.replayChannel = replayChannel;

var TYPE = {
    MESSAGE: {
        apns_title: "New Message",
        apns_getBody: function(message) {
            return message.get("alias").get("name") + " says: " + message.get("body");
        },
        apns_sound: "default"
    },
    PRESENCE: {
        apns_title: "Cheddar", // Replace with ChatRoom name.
        apns_getBody: function(presence) {
            return presence.get("body");
        },
        apns_sound: "default"
    },
    CHANGE_ROOM_NAME: {
        apns_title: "Cheddar",
        apns_getBody: function(chatEvent) {
            return chatEvent.get("body");
        },
        apns_sound: "default"
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

// Takes: {pubkey, subkey, chatEvent}
function sendChangeRoomName(params) {
    params.type = TYPE.CHANGE_ROOM_NAME;
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
                },
                "sound": params.type.apns_sound
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
    var pubkey = params.pubkey;
    var subkey = params.subkey;
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
        callback: function(result) {
            promise.resolve(result);
        },
        error: function(result) {
            promise.reject(result);
        }
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
        error: function(result) {
            promise.reject(result);
        }
    });

    return promise;
}
