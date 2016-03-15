var PubNub = require('cloud/pubnub');

module.exports.sendMessage = sendMessage;
module.exports.sendPresence = sendPresence;
module.exports.replayChannel = replayChannel;

// Returns a Promise. 
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
function sendMessage(pubkey, subkey, channel, message, response) {
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
                    "body":message.get("alias").get("name") + " - " + message.get("body"),
                },
                "category":"ACTIONABLE_REPLY"
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

    pubnub.publish({
        channel: channel,
        message: messageEvent,
        callback: function (result) {
          response.success(messageEvent);
        },
        error: response.error
    });
}

function sendPresence(pubkey, subkey, alias, action, response) {
    var pubnub = PubNub({
        publish_key: pubkey,
        subscribe_key: subkey
    });

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
        }
    }

    pubnub.publish({
        channel: alias.get("chatRoomId"),
        message: presenceEvent,
        callback: function (result) {
          response.success(presenceEvent);
        },
        error: response.error
    });
}

function replayChannel(subkey, channel, startTimeToken, endTimeToken, count, response) {
    var pubnub = PubNub({
        subscribe_key: subkey
    });

    pubnub.history({
        channel: channel,
        count: count,
        start:startTimeToken,
        end:endTimeToken,
        callback: function(result){
            response.success({"events":result[0],
                              "startTimeToken":result[1],
                              "endTimeToken":result[2]});
        },
        error: response.error
     });
}
