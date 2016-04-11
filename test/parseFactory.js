SavedUsers = new Set();
module.exports = {
    User : function () {
        this.set = function(type, value) {
            this[type] = value;
        }
        this.save = function() {
            SavedUsers.add(this.username);
        }
        return this;
    },
    Query : function() {
        this.get = function(type) {
            switch (type) {
                case "User":
                    return SavedUsers.has()
            }
        }
    }

}
