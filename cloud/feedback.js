module.exports.feedback = feedback;
module.exports.changeSchoolRequest = changeSchoolRequest;
module.exports.reportUserRequest = reportUserRequest;

const CHANNEL_URL = {
    FEEDBACK: {url: "https://hooks.slack.com/services/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"},
    REPORT_USER: {url: "https://hooks.slack.com/services/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"},
};

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

    return sendToSlackChannel(CHANNEL_URL.FEEDBACK.url, feedbackBody);
}

// Takes: {"schoolName", "email", "platform", "environment"}
function changeSchoolRequest(params) {
    var changeSchoolBody = "Platform: " + params.platform + "\n";
    changeSchoolBody += "Environment: " + params.environment + "\n";
    changeSchoolBody += "Email: " + params.email + "\n";
    changeSchoolBody += "School Request: " + params.schoolName + "\n";
    changeSchoolBody += "-----------------------";

    return sendToSlackChannel(CHANNEL_URL.FEEDBACK.url, changeSchoolBody);
}

// Takes: {"userId", "reportedAliasId", "chatRoomId", "environment"}
function reportUserRequest(params) {
    var reportUserBody = "Reporter UserId: " + params.userId + "\n";
    reportUserBody += "Reported AliasId: " + params.reportedAliasId + "\n";
    reportUserBody += "ChatRoomId: " + params.chatRoomId + "\n";
    reportUserBody += "Environment: " + params.environment + "\n";
    reportUserBody += "-----------------------";

    return sendToSlackChannel(CHANNEL_URL.REPORT_USER.url, reportUserBody);
}

function sendToSlackChannel(channelUrl, body) {
    return Parse.Cloud.httpRequest({
        method: 'POST',
        url: channelUrl,
        body: "{\"text\":\"" + body + "\"}",
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
    }).then(function(response) { return response.text },
            function(response) { return response.text });
}
