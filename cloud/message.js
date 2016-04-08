module.exports.create = create;

function create(alias, body, response) {
    var Message = Parse.Object.extend("Message");
    var message = new Message();

    message.set("body", body);
    message.set("alias", alias);

    return message.save(null);
}
