var app = app || {};

$(function() {
    // Initialize Collections
    app.users = new Users();
    app.products = new Products();
    app.orders = new Orders();
    app.payments = new Payments();

    // Fetch data from Server
    $.when(
        app.users.fetch(),
        app.products.fetch(),
        app.orders.fetch(),
        app.payments.fetch()
    ).then(function() {
        console.log("Data loaded from server.");

        // Start the app
        app.router = new app.Router();
        Backbone.history.start();
    });
});
