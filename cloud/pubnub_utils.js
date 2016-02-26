var PubNub = require('cloud/pubnub');

module.exports.sendMessage = sendMessage;
module.exports.replayChannel = replayChannel;

// Returns a Promise. 
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
function sendMessage(pubkey, subkey, channel, message, successCallback, errorCallback) {
    // return Parse.Cloud.httpRequest({
    //     url: getSendMessageUrl(pubkey, subkey, channel, message)
    // });
    var pubnub = PubNub({
        publish_key: pubkey,
        subscribe_key: subkey
    });

    pubnub.publish({
        channel: channel,
        message: message,
        callback: function (result) {
          successCallback(result);
        },
        error: function (error) {
          errorCallback(error)
        }
    });
}

function replayChannel(subkey, channel, startTimeToken, endTimeToken, count, successCallback, errorCallback) {
    var pubnub = PubNub({
        subscribe_key: subkey
    });

    pubnub.history({
        channel: channel,
        count: count,
        start:startTimeToken,
        end:endTimeToken,
        callback: function(result){
            successCallback({"results":result[0],
                             "startTimeToken":result[1],
                             "endTimeToken":result[2]});
        },
        error: function (error) {
          errorCallback(error)
        }
     });
}