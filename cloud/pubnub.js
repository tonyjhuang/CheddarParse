var PubNub = require('cloud/utils/pubnub_lib');

module.exports.sendMessage = sendMessage;
module.exports.sendPresence = sendPresence;
module.exports.replayChannel = replayChannel;

// Returns a Promise.
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
function sendMessage(pubkey, subkey, message) {
    var pubnub = PubNub({
        publish_key: pubkey,
        subscribe_key: subkey
    });

    var messageEvent = {
        "objectType": "messageEvent",
        "object": message,
        "pn_apns": {
            "aps": {
                "alert": {
                    "title":"New Message",
                    "body": message.get("alias").get("name") + " says: " + message.get("body")
                }
            }
        },
        "pn_gcm": {
            "data": {
                "payload": {
                "objectType": "messageEvent",
                    "object": message
                }
            }
        }
    }

    return publish(pubkey, subkey, message.get("alias").get("chatRoomId"), messageEvent);
}

function sendPresence(pubkey, subkey, alias, action) {
    var verb = action == "join" ? "Joined" : "Left";

    var presenceEvent = {
        "objectType": "presenceEvent",
        "object": {
            "action": action,
            "alias": alias
        },
        "pn_gcm": {
            "data": {
                "payload": {
                    "objectType": "presenceEvent",
                    "object": {
                        "action": action,
                        "alias": alias
                    }
                }
            }
        },
        "pn_apns": {
            "aps": {
                "alert": {
                    "title":verb,
                    "body":alias.get("name") + " " + verb.toLowerCase()
                }
            }
        }
    }

    return publish(pubkey, subkey, alias.get("chatRoomId"), presenceEvent);
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
        callback: function (result) {
            promise.resolve(result);
        },
        error: function(error) {
            promise.reject(error);
        }
    });

    return promise;
}

function replayChannel(subkey, channel, startTimeToken, endTimeToken, count) {
    var pubnub = PubNub({
        subscribe_key: subkey
    });

    var promise = new Parse.Promise();

    pubnub.history({
        channel: channel,
        count: count,
        start:startTimeToken,
        end:endTimeToken,
        callback: function(result) {
            promise.resolve({"events":result[0],
                             "startTimeToken":result[1],
                             "endTimeToken":result[2]});
        },
        error: function(error) {
            promise.reject(error);
        }
    });

    return promise;
}
