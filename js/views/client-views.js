var app = app || {};

// --- SHOP / PRODUCT LIST VIEW ---
app.ProductListView = app.BaseView.extend({
    className: 'product-list-view',
    template: function() { return app.templateLoader.get('product-list'); },
    itemTemplate: function() { return app.templateLoader.get('product-item'); },
    modalTemplate: function() { return app.templateLoader.get('add-to-cart-modal'); },

    initialize: function() {
        this.listenTo(app.products, 'reset sync', this.render);
    },

    events: {
        'click .add-to-cart': 'showAddToCartModal',
        'click .cancel-modal': 'closeModal',
        'submit #add-to-cart-form': 'addToCart',
        'input #cart-qty': 'validateQty',
        'click #logout-btn': 'logout' // If we add a header later
    },

    validateQty: function(e) {
        var val = $(e.target).val();
        val = val.replace(/\D/g, '');
        $(e.target).val(val);
    },

    render: function() {
        this.$el.html(this.template()());

        // Render Header/Nav (Simple version)
        // Ideally this should be a separate view, but keeping it simple
        this.$el.prepend('<div class="nav-bar">Welcome, ' + app.router.session.user.get('fullName') + ' | <a href="#profile">Profile</a> | <a href="#logout">Logout</a></div>');

        var container = this.$('#product-list-container');
        var itemTmpl = this.itemTemplate();

        app.products.each(function(product) {
            container.append(itemTmpl(product.toJSON()));
        });

        // Update cart count
        var count = _.reduce(app.router.session.cart, function(memo, item){ return memo + item.quantity; }, 0);
        this.$('#cart-count').text(count);

        return this;
    },

    showAddToCartModal: function(e) {
        var productName = $(e.target).closest('.product-card').find('h3').text();
        this.currentProduct = app.products.findWhere({name: productName});

        if (this.currentProduct && this.currentProduct.get('stock') > 0) {
            this.$el.append(this.modalTemplate()(this.currentProduct.toJSON()));
        }
    },

    closeModal: function() {
        this.$('.modal-overlay').remove();
        this.currentProduct = null;
    },

    addToCart: function(e) {
        e.preventDefault();
        var qty = parseInt($('#cart-qty').val(), 10);
        var product = this.currentProduct;

        if (product && qty > 0 && qty <= product.get('stock')) {
             // Add to session cart
            var cart = app.router.session.cart;
            var existingItem = _.findWhere(cart, {productId: product.id});

            // Check if we are exceeding stock in cart
            var currentQtyInCart = existingItem ? existingItem.quantity : 0;
            if (currentQtyInCart + qty > product.get('stock')) {
                alert("Cannot add more. Stock limit reached.");
                return;
            }

            if (existingItem) {
                existingItem.quantity += qty;
            } else {
                cart.push({
                    productId: product.id,
                    name: product.get('name'),
                    price: product.get('price'),
                    quantity: qty
                });
            }

            // Save cart
            localStorage.setItem('cart_' + app.router.session.user.id, JSON.stringify(cart));

            this.closeModal();
            this.render(); // Re-render to update cart count
        }
    }
});

// --- CART VIEW ---
app.CartView = app.BaseView.extend({
    className: 'cart-view',
    template: function() { return app.templateLoader.get('cart'); },

    events: {
        'click .remove-item': 'removeItem'
    },

    render: function() {
        var cart = app.router.session.cart;
        var total = _.reduce(cart, function(memo, item){ return memo + (item.price * item.quantity); }, 0);

        this.$el.html(this.template()({
            items: cart,
            total: total
        }));
         this.$el.prepend('<div class="nav-bar"><a href="#shop">Back to Shop</a> | <a href="#logout">Logout</a></div>');
        return this;
    },

    removeItem: function(e) {
        var index = $(e.target).data('index');
        app.router.session.cart.splice(index, 1);
        localStorage.setItem('cart_' + app.router.session.user.id, JSON.stringify(app.router.session.cart));
        this.render();
    }
});

// --- CHECKOUT VIEW ---
app.CheckoutView = app.BaseView.extend({
    className: 'checkout-view',
    template: function() { return app.templateLoader.get('checkout'); },

    events: {
        'submit #checkout-form': 'onCheckout',
        'change #saved-card-select': 'onCardSelect',
        'input #card-number': 'validateCardNumber',
        'input #card-expiry': 'validateExpiry',
        'input #card-cvv': 'validateCVV'
    },

    render: function() {
        var cart = app.router.session.cart;
        var total = _.reduce(cart, function(memo, item){ return memo + (item.price * item.quantity); }, 0);

        // Get saved methods for this user
        var userMethods = app.payments.where({userId: app.router.session.user.id});
        var userMethodsJSON = _.map(userMethods, function(m) { return m.toJSON(); });

        this.$el.html(this.template()({
            total: total,
            savedMethods: userMethodsJSON
        }));
        this.$el.prepend('<div class="nav-bar"><a href="#cart">Back to Cart</a></div>');
        return this;
    },

    onCardSelect: function(e) {
        var selectedId = $(e.target).val();
        if (selectedId) {
            var method = app.payments.get(selectedId);
            $('#card-number').val(method.get('cardNumber'));
            $('#card-expiry').val(method.get('cardExpiry'));
            $('#card-cvv').val(method.get('cardCvv'));
        } else {
            $('#card-number').val('');
            $('#card-expiry').val('');
            $('#card-cvv').val('');
        }
    },

    validateCardNumber: function(e) {
        var val = $(e.target).val();
        val = val.replace(/\D/g, '');
        if (val.length > 16) val = val.substring(0, 16);
        $(e.target).val(val);
    },

    validateExpiry: function(e) {
        var val = $(e.target).val();

        // Remove non-digits/slash
        val = val.replace(/[^\d]/g, '');

        // Add slash automatically
        if (val.length >= 2) {
             // Validate month
             var month = parseInt(val.substring(0, 2));
             if (month > 12) month = 12;
             if (month < 1) month = 1; // though strict typing might make this weird, let's just leave 01-12

             // We can't easily rewrite the user's input for logic like '13' -> '12' while they type without being annoying.
             // Better strategy: Just format with slash
             val = val.substring(0, 2) + '/' + val.substring(2);
        }

        if (val.length > 5) val = val.substring(0, 5);

        $(e.target).val(val);
    },

    validateCVV: function(e) {
        var val = $(e.target).val();
        val = val.replace(/\D/g, '');
        if (val.length > 4) val = val.substring(0, 4);
        $(e.target).val(val);
    },

    onCheckout: function(e) {
        e.preventDefault();

        var cardDetails = $('#card-number').val() + ' | ' + $('#card-expiry').val() + ' | ' + $('#card-cvv').val();
        var cart = app.router.session.cart;
        var total = _.reduce(cart, function(memo, item){ return memo + (item.price * item.quantity); }, 0);

        // 1. Deduct Stock
        var stockError = false;
        _.each(cart, function(item) {
            var product = app.products.get(item.productId);
            if (product.get('stock') < item.quantity) {
                stockError = true;
                alert("Not enough stock for " + item.name);
            }
        });

        if (stockError) return;

        _.each(cart, function(item) {
            var product = app.products.get(item.productId);
            var newStock = product.get('stock') - item.quantity;
            product.save({stock: newStock});
        });

        // 2. Create Order
        app.orders.create({
            userId: app.router.session.user.id,
            date: new Date().toISOString(),
            items: cart,
            total: total,
            cardDetails: cardDetails
        });

        // 3. Clear Cart
        app.router.session.cart = [];
        localStorage.removeItem('cart_' + app.router.session.user.id);

        alert("Purchase Successful!");
        app.router.navigate('profile', {trigger: true});
    }
});

// --- PROFILE VIEW ---
app.ProfileView = app.BaseView.extend({
    className: 'profile-view',
    template: function() { return app.templateLoader.get('profile'); },

    events: {
        'submit #profile-form': 'updateProfile'
    },

    render: function() {
        var user = app.router.session.user;

        // Get orders for this user
        var myOrders = app.orders.where({userId: user.id});
        // Sort by date desc
        myOrders.sort(function(a, b) {
            return new Date(b.get('date')) - new Date(a.get('date'));
        });
        var ordersJSON = _.map(myOrders, function(o) { return o.toJSON(); });

        this.$el.html(this.template()({
            fullName: user.get('fullName'),
            address: user.get('address'),
            orders: ordersJSON
        }));

        this.$el.prepend('<div class="nav-bar"><a href="#shop">Back to Shop</a> | <a href="#logout">Logout</a></div>');
        return this;
    },

    updateProfile: function(e) {
        e.preventDefault();
        var user = app.router.session.user;
        var newFullName = $('#profile-fullname').val();
        var newAddress = $('#profile-address').val();

        user.save({
            fullName: newFullName,
            address: newAddress
        });

        this.$('.success-message').show().delay(2000).fadeOut();
    }
});

// --- BILLING VIEW ---
app.BillingView = app.BaseView.extend({
    className: 'billing-view',
    template: function() { return app.templateLoader.get('billing'); },

    events: {
        'submit #billing-form': 'saveMethod',
        'input #bill-card-number': 'validateCardNumber',
        'input #bill-card-expiry': 'validateExpiry',
        'input #bill-card-cvv': 'validateCVV'
    },

    render: function() {
        var userMethods = app.payments.where({userId: app.router.session.user.id});
        var methodsJSON = _.map(userMethods, function(m) { return m.toJSON(); });

        this.$el.html(this.template()({
            methods: methodsJSON
        }));

        this.$el.prepend('<div class="nav-bar"><a href="#profile">Back to Profile</a> | <a href="#logout">Logout</a></div>');
        return this;
    },

    validateCardNumber: function(e) {
        var val = $(e.target).val();
        // Remove non-digits
        val = val.replace(/\D/g, '');
        // Limit to 16
        if (val.length > 16) val = val.substring(0, 16);
        $(e.target).val(val);
    },

    validateExpiry: function(e) {
        var val = $(e.target).val();
        // Remove non-digits
        val = val.replace(/[^\d]/g, '');

        // Add slash
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2);
        }

        if (val.length > 5) val = val.substring(0, 5);
        $(e.target).val(val);
    },

    validateCVV: function(e) {
        var val = $(e.target).val();
        val = val.replace(/\D/g, '');
        if (val.length > 4) val = val.substring(0, 4);
        $(e.target).val(val);
    },

    saveMethod: function(e) {
        e.preventDefault();

        var alias = $('#bill-alias').val();
        var number = $('#bill-card-number').val();
        var expiry = $('#bill-card-expiry').val();
        var cvv = $('#bill-card-cvv').val();

        app.payments.create({
            userId: app.router.session.user.id,
            alias: alias,
            cardNumber: number,
            cardExpiry: expiry,
            cardCvv: cvv
        });

        // Re-render to show new list
        // Since create is async, we might want to wait or listen to add event.
        // For simplicity, we assume optimistic UI or simple reload.
        // Actually, app.payments.create adds to collection immediately.
        this.render();
        this.$('.success-message').show().delay(2000).fadeOut();
    }
});
