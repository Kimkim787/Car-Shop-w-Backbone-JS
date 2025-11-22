var Orders = Backbone.Collection.extend({
    model: Order,
    url: '/api/orders'
});

var app = app || {};
app.orders = new Orders();