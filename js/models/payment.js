var Payment = Backbone.Model.extend({
    defaults: {
        userId: null,
        alias: '',
        cardNumber: '',
        cardExpiry: '',
        cardCvv: ''
    }
});