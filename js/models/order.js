var Order = Backbone.Model.extend({
    defaults: {
        userId: null,
        date: new Date().toISOString(),
        items: [], // Array of {productId, quantity, price, name}
        total: 0,
        cardDetails: '' // Plain text as requested
    }
});