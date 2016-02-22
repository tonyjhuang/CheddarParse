
module.exports.sendMessage = sendMessage;
module.exports.replayMessages = replayMessages;

// Returns a Promise. 
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
function sendMessage(pubkey, subkey, channel, message) {
    return Parse.Cloud.httpRequest({
        url: getSendMessageUrl(pubkey, subkey, channel, message)
    });
}

function replayMessages(subkey, channel, count) {
    return Parse.Cloud.httpRequest({
        url: getReplayMessageUrl(subkey, channel, count)
    });
}

function getSendMessageUrl(pubkey, subkey, channel, message) {
    return "http://pubsub.pubnub.com" +
        "/publish" +
        "/" + pubkey +
        "/" + subkey +
        "/0" +    // signature
        "/" + channel +
        "/0" +    // callback
        "/" + encodeURIComponent(JSON.stringify(message));
}

function getReplayMessageUrl(subkey, channel, count) {
    return "http://pubsub.pubnub.com" + 
        "/history" +
        "/" + subkey +
        "/" + channel +
        "/0" + // callback
        "/" + count;
}


