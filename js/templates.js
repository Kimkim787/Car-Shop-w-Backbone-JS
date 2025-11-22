// Pre-loaded templates for environments that block file:// AJAX or for performance
var app = app || {};
app.templates = {};

app.templates['login'] = `<!-- Login Template -->
<div class="auth-container">
    <h2>Login</h2>
    <form id="login-form">
        <div class="form-group">
            <label>Username</label>
            <input type="text" id="username" required>
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" required>
        </div>
        <button type="submit" class="btn">Login</button>
        <p class="error-message" style="display:none; color:red;"></p>
    </form>
    <p>Don't have an account? <a href="#register">Register</a></p>
</div>`;

app.templates['register'] = `<!-- Register Template -->
<div class="auth-container">
    <h2>Register</h2>
    <form id="register-form">
        <div class="form-group">
            <label>Username</label>
            <input type="text" id="reg-username" required>
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" id="reg-password" required>
        </div>
        <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="reg-fullname" required>
        </div>
        <div class="form-group">
            <label>Address</label>
            <textarea id="reg-address" required></textarea>
        </div>
        <button type="submit" class="btn">Register</button>
        <p class="error-message" style="display:none; color:red;"></p>
    </form>
    <p>Already have an account? <a href="#login">Login</a></p>
</div>`;

app.templates['product-list'] = `<!-- Product List (Client) -->
<div class="shop-header">
    <h2>Shop Products</h2>
    <div class="cart-summary">
        <a href="#cart" class="btn btn-secondary">View Cart (<span id="cart-count">0</span>)</a>
    </div>
</div>
<div class="product-grid" id="product-list-container"></div>`;

app.templates['product-item'] = `<!-- Product Item (Client) -->
<div class="product-card">
    <div class="product-image">
        <img src="<%= image %>" alt="<%= name %>">
    </div>
    <div class="product-details">
        <h3><%= name %></h3>
        <p><%= description %></p>
        <p class="price">$<%= price.toFixed(2) %></p>
        <p class="stock">Stock: <%= stock %></p>
        <% if (stock > 0) { %>
            <button class="add-to-cart btn">Add to Cart</button>
        <% } else { %>
            <button class="btn btn-disabled" disabled>Out of Stock</button>
        <% } %>
    </div>
</div>`;

app.templates['cart'] = `<!-- Cart Template -->
<h2>Shopping Cart</h2>
<div class="cart-container">
    <% if (items.length > 0) { %>
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <% _.each(items, function(item, index) { %>
                    <tr>
                        <td><%= item.name %></td>
                        <td>$<%= item.price.toFixed(2) %></td>
                        <td><%= item.quantity %></td>
                        <td>$<%= (item.price * item.quantity).toFixed(2) %></td>
                        <td><button class="remove-item btn btn-danger" data-index="<%= index %>">Remove</button></td>
                    </tr>
                <% }); %>
            </tbody>
        </table>
        <div class="cart-total">
            <h3>Total: $<%= total.toFixed(2) %></h3>
            <a href="#checkout" class="btn btn-primary">Proceed to Checkout</a>
        </div>
    <% } else { %>
        <p>Your cart is empty. <a href="#shop">Go Shopping</a></p>
    <% } %>
</div>`;

app.templates['billing'] = `<!-- Billing Template -->
<h2>Manage Billing</h2>
<div class="billing-container">
    <div class="saved-methods">
        <h3>Saved Payment Methods</h3>
        <% if (methods.length > 0) { %>
            <ul class="method-list">
                <% _.each(methods, function(method) { %>
                    <li>
                        <strong><%= method.alias %></strong>:
                        <%= method.cardNumber %> (Exp: <%= method.cardExpiry %>)
                    </li>
                <% }); %>
            </ul>
        <% } else { %>
            <p>No saved payment methods.</p>
        <% } %>
    </div>

    <hr>

    <h3>Add New Payment Method</h3>
    <form id="billing-form">
        <div class="form-group">
            <label>Alias (e.g., Personal Visa)</label>
            <input type="text" id="bill-alias" required>
        </div>
        <div class="form-group">
            <label>Card Number</label>
            <input type="text" id="bill-card-number" placeholder="1234 5678 9101 1121" required>
        </div>
        <div class="form-group">
            <label>Expiry Date</label>
            <input type="text" id="bill-card-expiry" placeholder="MM/YY" required>
        </div>
        <div class="form-group">
            <label>CVV</label>
            <input type="text" id="bill-card-cvv" placeholder="123" required>
        </div>
        <button type="submit" class="btn btn-primary">Save Payment Method</button>
        <p class="success-message" style="display:none; color:green;">Payment method saved!</p>
    </form>
</div>`;

app.templates['checkout'] = `<!-- Checkout Template -->
<h2>Checkout</h2>
<div class="checkout-container">
    <div class="order-summary">
        <h3>Order Total: $<%= total.toFixed(2) %></h3>
    </div>

    <% if (savedMethods.length > 0) { %>
        <div class="saved-methods-selection">
            <h4>Select Saved Card</h4>
            <select id="saved-card-select">
                <option value="">-- Manual Entry --</option>
                <% _.each(savedMethods, function(method) { %>
                    <option value="<%= method.id %>"><%= method.alias %> - <%= method.cardNumber %></option>
                <% }); %>
            </select>
        </div>
        <hr>
    <% } %>

    <form id="checkout-form">
        <div class="form-group">
            <label>Card Number</label>
            <input type="text" id="card-number" placeholder="1234 5678 9101 1121" required>
        </div>
        <div class="form-group">
            <label>Expiry Date</label>
            <input type="text" id="card-expiry" placeholder="MM/YY" required>
        </div>
        <div class="form-group">
            <label>CVV</label>
            <input type="text" id="card-cvv" placeholder="123" required>
        </div>
        <div class="form-buttons">
            <button type="submit" class="btn btn-success">Confirm Purchase</button>
            <a href="#cart" class="btn btn-secondary">Back to Cart</a>
        </div>
    </form>
</div>`;

app.templates['profile'] = `<!-- Profile Template -->
<h2>My Profile</h2>
<div class="profile-container">
    <form id="profile-form">
        <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="profile-fullname" value="<%= fullName %>" required>
        </div>
        <div class="form-group">
            <label>Address</label>
            <textarea id="profile-address" required><%= address %></textarea>
        </div>
        <button type="submit" class="btn">Update Profile</button>
        <p class="success-message" style="display:none; color:green;">Profile updated!</p>
    </form>
    <br>
    <a href="#billing" class="btn btn-secondary">Manage Billing Methods</a>
</div>

<hr>

<h3>Purchase History</h3>
<div class="history-container">
    <% if (orders.length > 0) { %>
        <table class="history-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Items</th>
                </tr>
            </thead>
            <tbody>
                <% _.each(orders, function(order) { %>
                    <tr>
                        <td><%= new Date(order.date).toLocaleString() %></td>
                        <td>$<%= order.total.toFixed(2) %></td>
                        <td>
                            <ul>
                            <% _.each(order.items, function(item) { %>
                                <li><%= item.name %> (x<%= item.quantity %>)</li>
                            <% }); %>
                            </ul>
                        </td>
                    </tr>
                <% }); %>
            </tbody>
        </table>
    <% } else { %>
        <p>No past purchases.</p>
    <% } %>
</div>`;

app.templates['admin-product-list'] = `<!-- Admin Product List -->
<h2>Manage Products</h2>
<div class="admin-actions">
    <button id="add-new-product" class="btn btn-primary">Add New Product</button>
</div>
<table class="admin-table">
    <thead>
        <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody id="admin-product-list"></tbody>
</table>`;

app.templates['admin-product-row'] = `<!-- Admin Product Row -->
<td><img src="<%= image %>" alt="<%= name %>" width="50"></td>
<td><%= name %></td>
<td>$<%= price.toFixed(2) %></td>
<td><%= stock %></td>
<td>
    <button class="edit-product btn btn-sm">Edit</button>
    <button class="delete-product btn btn-sm btn-danger">Delete</button>
</td>`;

app.templates['product-form'] = `<!-- Product Form (Add/Edit) -->
<div class="modal-overlay">
    <div class="modal-content">
        <h3><%= id ? 'Edit Product' : 'Add New Product' %></h3>
        <form id="product-form" enctype="multipart/form-data">
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="prod-name" value="<%= name %>" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="prod-desc" required><%= description %></textarea>
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" step="0.01" id="prod-price" value="<%= price %>" required>
            </div>
            <div class="form-group">
                <label>Stock</label>
                <input type="number" id="prod-stock" value="<%= stock %>" required>
            </div>
            <div class="form-group">
                <label>Image File</label>
                <input type="file" id="prod-image-file" accept="image/*">
                <small>Current: <%= image %></small>
                <input type="hidden" id="prod-image-current" value="<%= image %>">
            </div>
            <div class="form-buttons">
                <button type="submit" class="btn btn-primary">Save</button>
                <button type="button" class="btn btn-secondary cancel-modal">Cancel</button>
            </div>
        </form>
    </div>
</div>`;

app.templates['admin-clients'] = `<!-- Admin Clients List -->
<h2>Registered Clients</h2>
<table class="admin-table">
    <thead>
        <tr>
            <th>Full Name</th>
            <th>Username</th>
            <th>Address</th>
        </tr>
    </thead>
    <tbody>
        <% _.each(clients, function(client) { %>
            <tr>
                <td><%= client.fullName %></td>
                <td><%= client.username %></td>
                <td><%= client.address %></td>
            </tr>
        <% }); %>
    </tbody>
</table>`;

app.templates['add-to-cart-modal'] = `<!-- Add to Cart Modal -->
<div class="modal-overlay">
    <div class="modal-content">
        <h3>Add to Cart</h3>
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="<%= image %>" alt="<%= name %>" style="max-height: 150px; object-fit: contain;">
            <h4><%= name %></h4>
        </div>
        <form id="add-to-cart-form">
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" id="cart-qty" value="1" min="1" max="<%= stock %>" required>
            </div>
            <div class="form-buttons">
                <button type="button" class="btn btn-secondary cancel-modal">Cancel</button>
                <button type="submit" class="btn btn-success">Continue Order</button>
            </div>
        </form>
    </div>
</div>`;
