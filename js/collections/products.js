var Products = Backbone.Collection.extend({
    model: Product,
    url: '/api/products'
});

var app = app || {};
app.products = new Products();