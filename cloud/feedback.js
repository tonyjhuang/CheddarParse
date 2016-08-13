module.exports.feedback = feedback;
module.exports.changeSchoolRequest = changeSchoolRequest;

// Takes: {"version", "build", "userId", "chatRoomId","aliasName",
//         "body", "platform", "environment"}
function feedback(params) {
    var feedbackBody = "Platform: " + params.platform + "\n";
    feedbackBody += "Environment: " + params.environment + "\n";
    feedbackBody += "Version: " + params.version + "\n";
    feedbackBody += "Build: " + params.build + "\n";
    feedbackBody += "UserId: " + params.userId + "\n";
    if (params.chatRoomId)
        feedbackBody += "ChatRoomId: " + params.chatRoomId + "\n";
    if (params.aliasName)
        feedbackBody += "AliasName: " + params.aliasName + "\n";
    feedbackBody += params.body + "\n";
    feedbackBody += "-----------------------";

    return sendToFeedbackChannel(feedbackBody);
}

// Takes: {"schoolName", "email", "platform", "environment"}
function changeSchoolRequest(params) {
    var changeSchoolBody = "Platform: " + params.platform + "\n";
    changeSchoolBody += "Environment: " + params.environment + "\n";
    changeSchoolBody += "Email: " + params.email + "\n";
    changeSchoolBody += "School Request: " + params.schoolName + "\n";
    changeSchoolBody += "-----------------------";

    return sendToFeedbackChannel(changeSchoolBody);
}

function sendToFeedbackChannel(body) {
    return Parse.Cloud.httpRequest({
        method: 'POST',
        url: 'https://hooks.slack.com/services/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',
        body: "{\"text\":\"" + body + "\"}",
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
    }).then(function(response) { return response.text },
            function(response) { return response.text });
}
