var app = app || {};

// Helper to load templates.
// Since we can't easily XHR file://, we will assume they are pre-loaded or we embed them.
// For this environment, I will inline the templates into a helper object here to ensure it works
// without a server, BUT I also created the files in `templates/` as requested.
// This function will try to find the template in the DOM (if we added it) or falls back to
// hardcoded strings if I had them, OR (best effort) tries to fetch.
// Given the constraints, I will use a "fetch or fallback" strategy, but to guarantee functionality
// I will read the files I just created and inject them into index.html or similar.
// Actually, I'll define a map here for simplicity in the "No Server" context if XHR fails.
// WAIT, I can't easily "inject" into index.html from here without being messy.
// Let's use a synchronous XHR or Fetch. If it fails, show an error.

app.templateLoader = {
    get: function(name) {
        // Check if template is already loaded (in js/templates.js)
        if (app.templates && app.templates[name]) {
            return _.template(app.templates[name]);
        }

        // Fallback: Try to fetch from file (might fail with CORS on file://)
        var content = '';
        $.ajax({
            url: 'templates/' + name + '.html',
            async: false,
            success: function(data) {
                content = data;
            },
            error: function() {
                console.error("Could not load template: " + name);
                content = "<h3>Error loading template " + name + "</h3>";
            }
        });
        return _.template(content);
    }
};

// Base View to handle cleanup
app.BaseView = Backbone.View.extend({
    close: function() {
        this.remove();
        this.unbind();
        if (this.onClose) {
            this.onClose();
        }
    }
});

// --- LOGIN VIEW ---
app.LoginView = app.BaseView.extend({
    className: 'login-view',
    template: function() { return app.templateLoader.get('login'); },

    events: {
        'submit #login-form': 'onLogin'
    },

    render: function() {
        this.$el.html(this.template()());
        return this;
    },

    onLogin: function(e) {
        e.preventDefault();
        var email = $('#username').val();
        var password = $('#password').val();
        var self = this;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                var user = userCredential.user;
                return firebase.database().ref('/users/' + user.uid).once('value');
            })
            .then((snapshot) => {
                var userData = snapshot.val();
                var backboneUser = new app.User(userData || {});
                backboneUser.set('id', snapshot.key);

                // Map isAdmin to role if not present, for compatibility
                if (userData && userData.isAdmin === true) {
                    backboneUser.set('role', 'admin');
                } else {
                    backboneUser.set('role', 'client');
                }

                app.router.session.user = backboneUser;

                // Restore cart
                var cart = localStorage.getItem('cart_' + backboneUser.id);
                if (cart) {
                    app.router.session.cart = JSON.parse(cart);
                } else {
                    app.router.session.cart = [];
                }

                app.router.checkAuth();
            })
            .catch((error) => {
                self.$('.error-message').text(error.message).show();
            });
    }
});

// --- REGISTER VIEW ---
app.RegisterView = app.BaseView.extend({
    className: 'register-view',
    template: function() { return app.templateLoader.get('register'); },

    events: {
        'submit #register-form': 'onRegister'
    },

    render: function() {
        this.$el.html(this.template()());
        return this;
    },

    onRegister: function(e) {
        e.preventDefault();
        var username = $('#reg-username').val();
        var password = $('#reg-password').val();
        var fullname = $('#reg-fullname').val();
        var address = $('#reg-address').val();

        if (app.users.findWhere({username: username})) {
            this.$('.error-message').text('Username already exists').show();
            return;
        }

        var newUser = app.users.create({
            username: username,
            password: password,
            fullName: fullname,
            address: address,
            role: 'client'
        });

        // Auto login
        app.router.session.user = newUser;
        localStorage.setItem('loggedInUserId', newUser.id);
        app.router.session.cart = [];
        app.router.checkAuth();
    }
});
