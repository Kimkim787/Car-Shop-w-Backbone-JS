var app = app || {};

$(function() {
    // Initialize Firebase
    // TODO: Replace with your actual Firebase project configuration
    var firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // if already initialized, use that one
    }

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
