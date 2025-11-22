var Users = Backbone.Collection.extend({
    model: User,
    url: '/api/users'
});

var app = app || {};
app.users = new Users();