var app = app || {};

// --- ADMIN PRODUCT LIST VIEW ---
app.AdminProductListView = app.BaseView.extend({
    className: 'admin-product-list',
    template: function() { return app.templateLoader.get('admin-product-list'); },
    rowTemplate: function() { return app.templateLoader.get('admin-product-row'); },

    initialize: function() {
        this.listenTo(app.products, 'reset sync destroy add change', this.render);
    },

    events: {
        'click #add-new-product': 'addProduct',
        'click .edit-product': 'editProduct',
        'click .delete-product': 'deleteProduct'
    },

    render: function() {
        this.$el.html(this.template()());
        this.$el.prepend('<div class="nav-bar">Admin Panel | <a href="#admin/clients">Clients</a> | <a href="#logout">Logout</a></div>');

        var container = this.$('#admin-product-list');
        var rowTmpl = this.rowTemplate();

        app.products.each(function(product) {
            var row = $('<tr>').html(rowTmpl(product.toJSON()));
            // Store ID on the row for easy access
            row.data('id', product.id);
            container.append(row);
        });

        return this;
    },

    addProduct: function() {
        var formView = new app.ProductFormView();
        this.$el.append(formView.render().el);
    },

    editProduct: function(e) {
        var id = $(e.target).closest('tr').data('id');
        var product = app.products.get(id);
        var formView = new app.ProductFormView({model: product});
        this.$el.append(formView.render().el);
    },

    deleteProduct: function(e) {
        if (confirm('Are you sure you want to delete this product?')) {
            var id = $(e.target).closest('tr').data('id');
            var product = app.products.get(id);

            if (firebase.auth().currentUser) {
                firebase.auth().currentUser.getIdToken(true).then(function(idToken) {
                    // Override Backbone destroy to include headers
                    product.destroy({
                        headers: {
                            'Authorization': 'Bearer ' + idToken
                        },
                        wait: true, // Wait for server success
                        error: function(model, xhr) {
                             alert('Error deleting product: ' + (xhr.responseJSON ? xhr.responseJSON.error : xhr.statusText));
                        }
                    });
                });
            }
        }
    }
});

// --- PRODUCT FORM VIEW (Modal) ---
app.ProductFormView = app.BaseView.extend({
    className: 'product-form-view',
    template: function() { return app.templateLoader.get('product-form'); },

    events: {
        'submit #product-form': 'saveProduct',
        'click .cancel-modal': 'closeModal',
        'input #prod-price': 'validatePrice',
        'input #prod-stock': 'validateStock'
    },

    validatePrice: function(e) {
         var val = $(e.target).val();
         // Remove non digits/dots
         val = val.replace(/[^0-9.]/g, '');

         // Ensure only one dot
         var parts = val.split('.');
         if (parts.length > 2) {
             val = parts[0] + '.' + parts.slice(1).join('');
         }

         $(e.target).val(val);
    },

    validateStock: function(e) {
         // Integer only
         var val = $(e.target).val();
         val = val.replace(/\D/g, '');
         $(e.target).val(val);
    },

    render: function() {
        var data = this.model ? this.model.toJSON() : {
            id: null, name: '', description: '', price: 0, stock: 0, image: ''
        };
        this.$el.html(this.template()(data));
        return this;
    },

    saveProduct: function(e) {
        e.preventDefault();

        var formData = new FormData();
        formData.append('name', $('#prod-name').val());
        formData.append('description', $('#prod-desc').val());
        formData.append('price', parseFloat($('#prod-price').val()));
        formData.append('stock', parseInt($('#prod-stock').val()));

        var fileInput = $('#prod-image-file')[0];
        if (fileInput.files.length > 0) {
            formData.append('imageFile', fileInput.files[0]);
        } else {
            // If editing and no new file, keep old path
            formData.append('image', $('#prod-image-current').val());
        }

        var self = this;
        var method = this.model ? 'PUT' : 'POST';
        var url = this.model ? '/api/products/' + this.model.id : '/api/products';

        // Get ID Token
        if (firebase.auth().currentUser) {
            firebase.auth().currentUser.getIdToken(true).then(function(idToken) {
                $.ajax({
                    url: url,
                    type: method,
                    data: formData,
                    headers: {
                        'Authorization': 'Bearer ' + idToken
                    },
                    processData: false,  // tell jQuery not to process the data
                    contentType: false,  // tell jQuery not to set contentType
                    success: function(data) {
                        if (self.model) {
                            self.model.set(data);
                        } else {
                            app.products.add(data);
                        }
                        self.closeModal();
                        app.products.fetch(); // Refresh list to be safe
                    },
                    error: function(xhr) {
                        alert('Error saving product: ' + (xhr.responseJSON ? xhr.responseJSON.error : xhr.statusText));
                    }
                });
            }).catch(function(error) {
                 alert('Authentication error: ' + error.message);
            });
        } else {
            alert('You must be logged in to save products.');
        }
    },

    closeModal: function() {
        this.remove();
    }
});

// --- ADMIN CLIENT LIST VIEW ---
app.AdminClientListView = app.BaseView.extend({
    className: 'admin-client-list',
    template: function() { return app.templateLoader.get('admin-clients'); },

    render: function() {
        var clients = app.users.where({role: 'client'});
        var clientsJSON = _.map(clients, function(c) { return c.toJSON(); });

        this.$el.html(this.template()({
            clients: clientsJSON
        }));
        this.$el.prepend('<div class="nav-bar">Admin Panel | <a href="#admin/products">Products</a> | <a href="#logout">Logout</a></div>');

        return this;
    }
});