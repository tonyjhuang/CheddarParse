
module.exports.sendMessage = sendMessage;

// Returns a Promise. 
// See https://parse.com/docs/cloudcode/guide#cloud-code-advanced
function sendMessage(pubkey, subkey, channel, message) {
    return Parse.Cloud.httpRequest({
        url: getSendMessageUrl(pubkey, subkey, channel, message)
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
