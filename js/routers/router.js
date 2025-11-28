var app = app || {};

app.Router = Backbone.Router.extend({
    routes: {
        "": "checkAuth",
        "login": "login",
        "register": "register",
        "logout": "logout",
        "shop": "shop",
        "cart": "cart",
        "checkout": "checkout",
        "profile": "profile",
        "billing": "billing",
        "admin/products": "adminProducts",
        "admin/clients": "adminClients"
    },

    initialize: function() {
        this.currentView = null;
        // Simple session management
        this.session = {
            user: null,
            cart: [] // Array of {productId, quantity, price, name}
        };

        var self = this;
        // Listen for Firebase Auth changes
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // User is signed in.
                console.log("Firebase Auth: Signed in as " + user.email);

                // Fetch user profile from app.users (synced from DB)
                // We might need to fetch if not already loaded, but app.js fetches all users on load currently.
                // Optimally we only fetch current user, but preserving current architecture:
                var userProfile = app.users.findWhere({id: user.uid});

                if (userProfile) {
                    self.session.user = userProfile;
                    self.restoreCart(user.uid);
                    self.checkAuth(); // Redirect if needed
                } else {
                    // Profile might not be loaded yet or doesn't exist.
                    // If newly registered, it should exist shortly.
                    // If returning, maybe fetch again?
                    // For now, let's assume app.users is synced.
                    // If not found, maybe fetch specifically?
                    // Actually, let's fetch this specific user to be sure.
                    var fetchedUser = new User({id: user.uid});
                    fetchedUser.fetch({
                        success: function(model) {
                            app.users.add(model);
                            self.session.user = model;
                            self.restoreCart(user.uid);
                            self.checkAuth();
                        },
                        error: function() {
                            console.error("Could not fetch user profile");
                        }
                    });
                }
            } else {
                // User is signed out.
                console.log("Firebase Auth: Signed out");
                self.session.user = null;
                self.session.cart = [];
                // If we are on a protected page, checkAuth will handle redirect
                // But checkAuth is usually called on route change.
                // If we logout while on a page, we should reload or go to login.
                // Only redirect if we are not already on login/register
                var fragment = Backbone.history.getFragment();
                if (fragment !== 'login' && fragment !== 'register') {
                    self.navigate('login', {trigger: true});
                }
            }
        });
    },

    restoreCart: function(userId) {
        var cart = localStorage.getItem('cart_' + userId);
        if (cart) {
            this.session.cart = JSON.parse(cart);
        } else {
            this.session.cart = [];
        }
    },

    execute: function(callback, args, name) {
        // Guard: If not logged in and trying to access restricted pages
        if (!this.session.user && name !== 'login' && name !== 'register') {
            this.navigate('login', {trigger: true});
            return false;
        }
        // Guard: If logged in as Client and trying to access Admin
        if (this.session.user && this.session.user.get('role') === 'client' && name && name.indexOf('admin') === 0) {
            this.navigate('shop', {trigger: true});
            return false;
        }
        // Guard: If logged in as Admin and trying to access Shop (optional, but user said Admin views clients)
        // Let's allow Admin to see Shop but maybe strictly redirect to admin dashboard
        if (this.session.user && this.session.user.get('role') === 'admin' && (name === 'shop' || name === 'cart' || name === 'checkout' || name === 'profile')) {
             // Admin doesn't shop or have a profile in this spec?
             // Spec: "Admin can only view the list of registered clients." + "Add, update, delete products".
             // I'll redirect admin to admin/products default
             this.navigate('admin/products', {trigger: true});
             return false;
        }

        if (callback) callback.apply(this, args);
    },

    checkAuth: function() {
        if (this.session.user) {
            if (this.session.user.get('role') === 'admin') {
                this.navigate('admin/products', {trigger: true});
            } else {
                this.navigate('shop', {trigger: true});
            }
        } else {
            this.navigate('login', {trigger: true});
        }
    },

    login: function() {
        this.loadView(new app.LoginView());
    },

    register: function() {
        this.loadView(new app.RegisterView());
    },

    logout: function() {
        firebase.auth().signOut().then(() => {
            // Sign-out successful.
            // onAuthStateChanged will handle the rest
        }).catch((error) => {
            // An error happened.
            console.error("Logout error", error);
        });
    },

    shop: function() {
        this.loadView(new app.ProductListView());
    },

    cart: function() {
        this.loadView(new app.CartView());
    },

    checkout: function() {
        if (this.session.cart.length === 0) {
            this.navigate('shop', {trigger: true});
            return;
        }
        this.loadView(new app.CheckoutView());
    },

    profile: function() {
        this.loadView(new app.ProfileView());
    },

    billing: function() {
        this.loadView(new app.BillingView());
    },

    adminProducts: function() {
        this.loadView(new app.AdminProductListView());
    },

    adminClients: function() {
        this.loadView(new app.AdminClientListView());
    },

    loadView: function(view) {
        if (this.currentView) {
            if (this.currentView.close) {
                this.currentView.close();
            } else {
                this.currentView.remove();
            }
        }
        this.currentView = view;
        $('#app').html(view.render().el);
    }
});
