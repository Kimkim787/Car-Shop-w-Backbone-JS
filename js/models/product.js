var Product = Backbone.Model.extend({
    defaults: {
        name: '',
        description: '',
        price: 0,
        stock: 0,
        image: 'imgs/item1.svg'
    }
});