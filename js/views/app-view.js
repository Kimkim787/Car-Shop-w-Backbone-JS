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
        var email = $('#email').val();
        var password = $('#password').val();
        var self = this;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                var user = userCredential.user;
                // app.router.checkAuth() will be called by onAuthStateChanged
            })
            .catch((error) => {
                var errorCode = error.code;
                var errorMessage = error.message;
                self.$('.error-message').text(errorMessage).show();
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
        var email = $('#reg-email').val();
        var password = $('#reg-password').val();
        var fullname = $('#reg-fullname').val();
        var address = $('#reg-address').val();
        var self = this;

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                var user = userCredential.user;

                // Create user profile in backend (which saves to Firebase DB)
                // We use the UID as the ID.
                var newUserProfile = {
                    id: user.uid,
                    username: email, // Legacy field
                    email: email,
                    role: 'client',
                    fullName: fullname,
                    address: address
                };

                app.users.create(newUserProfile, {
                    wait: true,
                    success: function() {
                        // Profile created
                    },
                    error: function(model, response) {
                        console.error("Failed to create profile", response);
                    }
                });
            })
            .catch((error) => {
                var errorCode = error.code;
                var errorMessage = error.message;
                self.$('.error-message').text(errorMessage).show();
            });
    }
});
