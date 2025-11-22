import os
import json
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.', static_url_path='')

DATA_DIR = 'data'
IMGS_DIR = 'imgs'
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
PRODUCTS_FILE = os.path.join(DATA_DIR, 'products.json')
ORDERS_FILE = os.path.join(DATA_DIR, 'orders.json')
PAYMENTS_FILE = os.path.join(DATA_DIR, 'payments.json')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMGS_DIR, exist_ok=True)

# Helper to read/write JSON
def read_json(filepath, default=[]):
    if not os.path.exists(filepath):
        return default
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except:
        return default

def write_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

# Seed Data if missing
def seed_data():
    users = read_json(USERS_FILE)
    if not any(u['username'] == 'admin' for u in users):
        users.append({
            "id": "admin-id",
            "username": "admin",
            "password": "password123",
            "role": "admin",
            "fullName": "Administrator",
            "address": "Headquarters"
        })
        write_json(USERS_FILE, users)
        print("Seeded Admin user.")

    products = read_json(PRODUCTS_FILE)
    if not products:
        products = [
            {
                "id": "p1",
                "name": "Running Shoes",
                "description": "Fast and comfortable running shoes.",
                "price": 99.99,
                "stock": 10,
                "image": "imgs/item1.svg"
            },
            {
                "id": "p2",
                "name": "Stylish Shirt",
                "description": "Cotton shirt for casual wear.",
                "price": 29.50,
                "stock": 50,
                "image": "imgs/item2.svg"
            },
            {
                "id": "p3",
                "name": "Leather Bag",
                "description": "Durable leather bag for travel.",
                "price": 149.00,
                "stock": 5,
                "image": "imgs/item3.svg"
            }
        ]
        write_json(PRODUCTS_FILE, products)
        print("Seeded Products.")

seed_data()

# Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- USERS API ---
@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(read_json(USERS_FILE))

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    users = read_json(USERS_FILE)

    # Simple ID generation
    if 'id' not in data:
        data['id'] = str(len(users) + 1000)

    users.append(data)
    write_json(USERS_FILE, users)
    return jsonify(data)

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    users = read_json(USERS_FILE)
    for i, user in enumerate(users):
        if user['id'] == user_id:
            users[i].update(data)
            write_json(USERS_FILE, users)
            return jsonify(users[i])
    return jsonify({"error": "User not found"}), 404

# --- PRODUCTS API ---
@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify(read_json(PRODUCTS_FILE))

@app.route('/api/products', methods=['POST'])
def create_product():
    # Check if this is a multipart request (with file) or JSON
    # Backbone might send JSON by default, but for file upload we use FormData

    products = read_json(PRODUCTS_FILE)
    new_id = str(len(products) + 1000)

    name = request.form.get('name')
    description = request.form.get('description')
    price = float(request.form.get('price', 0))
    stock = int(request.form.get('stock', 0))

    image_path = "imgs/item1.svg" # Default

    if 'imageFile' in request.files:
        file = request.files['imageFile']
        if file.filename != '':
            filename = secure_filename(file.filename)
            file.save(os.path.join(IMGS_DIR, filename))
            image_path = f"imgs/{filename}"
    elif 'image' in request.form:
         # Fallback if just path string sent
         image_path = request.form.get('image')

    new_product = {
        "id": new_id,
        "name": name,
        "description": description,
        "price": price,
        "stock": stock,
        "image": image_path
    }

    products.append(new_product)
    write_json(PRODUCTS_FILE, products)
    return jsonify(new_product)

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    products = read_json(PRODUCTS_FILE)
    product = next((p for p in products if p['id'] == product_id), None)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Handle FormData update
    if request.form:
        product['name'] = request.form.get('name', product['name'])
        product['description'] = request.form.get('description', product['description'])
        product['price'] = float(request.form.get('price', product['price']))
        product['stock'] = int(request.form.get('stock', product['stock']))

        if 'imageFile' in request.files:
            file = request.files['imageFile']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(IMGS_DIR, filename))
                product['image'] = f"imgs/{filename}"
        elif request.form.get('image'):
             product['image'] = request.form.get('image')
    else:
        # Handle JSON update (e.g. stock update from checkout)
        data = request.json
        product.update(data)

    write_json(PRODUCTS_FILE, products)
    return jsonify(product)

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    products = read_json(PRODUCTS_FILE)
    products = [p for p in products if p['id'] != product_id]
    write_json(PRODUCTS_FILE, products)
    return jsonify({"success": True})

# --- ORDERS API ---
@app.route('/api/orders', methods=['GET'])
def get_orders():
    return jsonify(read_json(ORDERS_FILE))

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    orders = read_json(ORDERS_FILE)

    if 'id' not in data:
        data['id'] = str(len(orders) + 1000)

    orders.append(data)
    write_json(ORDERS_FILE, orders)
    return jsonify(data)

# --- PAYMENTS API ---
@app.route('/api/payments', methods=['GET'])
def get_payments():
    return jsonify(read_json(PAYMENTS_FILE))

@app.route('/api/payments', methods=['POST'])
def create_payment():
    data = request.json
    payments = read_json(PAYMENTS_FILE)

    if 'id' not in data:
        data['id'] = str(len(payments) + 1000)

    payments.append(data)
    write_json(PAYMENTS_FILE, payments)
    return jsonify(data)

if __name__ == '__main__':
    # Threaded=True allows concurrent requests, helpful if frontend makes multiple fetches
    app.run(port=3000, debug=True, threaded=True)
