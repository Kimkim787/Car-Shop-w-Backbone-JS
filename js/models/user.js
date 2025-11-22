var User = Backbone.Model.extend({
    defaults: {
        username: '',
        password: '',
        role: 'client', // 'client' or 'admin'
        fullName: '',
        address: ''
    }
});