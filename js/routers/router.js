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
        // Try to restore session from LocalStorage (if we were using session storage, but here simple variable)
        // For simplicity in this SPA, reload clears session unless we persist it.
        // Let's persist the logged in user ID to keep login on refresh.
        var loggedInUserId = localStorage.getItem('loggedInUserId');
        if (loggedInUserId) {
            var user = app.users.findWhere({id: loggedInUserId});
            if (user) {
                this.session.user = user;
                // Restore cart as well if persisted? Let's use localStorage for cart too
                var cart = localStorage.getItem('cart_' + loggedInUserId);
                if (cart) {
                    this.session.cart = JSON.parse(cart);
                }
            }
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
        this.session.user = null;
        this.session.cart = [];
        localStorage.removeItem('loggedInUserId');
        this.navigate('login', {trigger: true});
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
