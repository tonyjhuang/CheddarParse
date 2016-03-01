var PubNub = require('cloud/pubnub');

module.exports.sendMessage = sendMessage;
module.exports.replayChannel = replayChannel;

// Returns a Promise. 
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
function sendMessage(pubkey, subkey, channel, message, response) {
    var pubnub = PubNub({
        publish_key: pubkey,
        subscribe_key: subkey
    });

    pubnub.publish({
        channel: channel,
        message: message,
        callback: function (result) {
          response.success(message);
        },
        error: function (error) {
          response.error(error)
        }
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
        error: function (error) {
            response.error(error)
        }
     });
}