module.exports.get = get;
module.exports.getNextAvailableChatRoom = getNextAvailableChatRoom;

function get(chatRoomId, response) {
    var query = new Parse.Query("ChatRoom");
    query.get(chatRoomId, response);
}

// Retrieves the next available ChatRoom for the user with the
// given id. Creates a new ChatRoom if none exist.
function getNextAvailableChatRoom(userId, maxOccupancy, response) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", userId);

    var chatRoomQuery = new Parse.Query("ChatRoom");
    /*
    // Don't return ChatRooms that this User already has an Alias for.
    chatRoomQuery.doesNotMatchKeyInQuery("objectId", "chatRoomId", aliasQuery);
    chatRoomQuery.equalTo("maxOccupancy", maxOccupancy);
    chatRoomQuery.notEqualTo("numOccupants", 0);
    chatRoomQuery.ascending("numOccupants");
    */
    /////////// FOR BETA, JUST RETURN THE FIRST CHAT ROOM. THIS IS OUR BETA ROOM.
    chatRoomQuery.first({
        success: function(chatRoom) {
            if (chatRoom == undefined) {
                createChatRoom(maxOccupancy, response);
            } else {
                response.success(chatRoom);
            }
        },
        error: response.error
    });
}

// Creates and returns a new ChatRoom.
function createChatRoom(maxOccupancy, response) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var chatRoom = new ChatRoom();

    chatRoom.set("maxOccupancy", maxOccupancy);
    chatRoom.set("numOccupants", 0);

    chatRoom.save(null, {
        success: response.success,
        error: function(chatRoom, error) {
            response.error(error);
        }
    });
}