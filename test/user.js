var chai = require('chai');
var User = require('../cloud/user.js');
var should = chai.should();
Parse = require('./parseFactory.js');


describe('User Creation Test', function() {
    it('should create a user on Parse', function() {
        User.create("test");
    });
})
