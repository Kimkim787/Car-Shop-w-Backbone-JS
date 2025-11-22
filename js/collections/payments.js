var Payments = Backbone.Collection.extend({
    model: Payment,
    url: '/api/payments'
});

var app = app || {};
app.payments = new Payments();