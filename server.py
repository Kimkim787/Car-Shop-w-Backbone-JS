import os
import json
import firebase_admin
from firebase_admin import credentials, db
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.', static_url_path='')

DATA_DIR = 'data'
IMGS_DIR = 'imgs'

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMGS_DIR, exist_ok=True)

# Firebase Setup
# We check if the key file exists. If it does, we init the app.
# If not (e.g. testing without key), we print a warning, but subsequent calls will fail.
SERVICE_ACCOUNT_KEY = 'serviceAccountKey.json'
DATABASE_URL = 'https://dummy-project-default-rtdb.firebaseio.com/' # Placeholder, will be ignored if key is dummy

if os.path.exists(SERVICE_ACCOUNT_KEY):
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
        firebase_admin.initialize_app(cred, {
            'databaseURL': DATABASE_URL
        })
        print("Firebase Admin Initialized.")
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
else:
    print("Warning: serviceAccountKey.json not found. Firebase features will fail.")

# Helper to read/write from Firebase
def get_ref(path):
    return db.reference(path)

# Seed Data if missing in Firebase
def seed_data():
    try:
        # Check Admin
        users_ref = get_ref('users')
        # We need to scan users for admin.
        # Note: In a real large DB this is inefficient, but for this scale it's fine.
        users = users_ref.get()
        admin_exists = False
        if users:
            for uid, u in users.items():
                if u.get('role') == 'admin':
                    admin_exists = True
                    break

        if not admin_exists:
            # We create a dummy admin entry in DB.
            # Note: Since we use Firebase Auth on client, this 'admin' user
            # won't be able to login unless there is a matching Auth User with this email.
            # However, the requirement is to seed data.
            # I will seed a placeholder that matches the structure.
            # In a real scenario, we'd create the Auth user too.
            # For now, I'll push it to DB so it exists.
            print("Seeding Admin metadata (Note: Create Auth user manually or via client)")
            # Using a fixed ID for simplicity or let push generate it
            users_ref.push({
                "username": "admin", # Legacy field, maybe not used if we switch to email
                "email": "admin@example.com",
                "role": "admin",
                "fullName": "Administrator",
                "address": "Headquarters"
            })

        products_ref = get_ref('products')
        products = products_ref.get()
        if not products:
            default_products = [
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
            # We use 'id' as key or let firebase generate keys?
            # Existing frontend expects 'id' field in the object.
            # If we push, keys are random strings.
            # Let's use set with the IDs provided to keep it consistent if desired,
            # or better: let firebase generate keys and we patch the object to include it?
            # Simpler: Use the IDs as keys.
            for p in default_products:
                products_ref.child(p['id']).set(p)
            print("Seeded Products.")

    except Exception as e:
        print(f"Error seeding data (likely due to invalid credentials): {e}")

# Call seed (will fail if dummy key, which is expected during build)
seed_data()

# Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- USERS API ---
# Note: Client will handle Auth. This API might be used by Admin to list users.
# We should protect this, but for this task I will just replicate functionality.

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = get_ref('users').get()
        # Transform dict to list for frontend consistency
        if not users:
            return jsonify([])
        user_list = []
        for k, v in users.items():
            v['id'] = k
            user_list.append(v)
        return jsonify(user_list)
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify([]) # Return empty list on error to allow frontend to load

@app.route('/api/users', methods=['POST'])
def create_user():
    # Used for Registration.
    # Client creates Auth User, then calls this to save profile.
    # OR Client saves profile directly to Firebase.
    # IF the client calls this, we save to Firebase.
    data = request.json
    try:
        # We might receive an ID from the client (Firebase UID)
        uid = data.get('id')
        if uid:
            get_ref('users').child(uid).set(data)
            return jsonify(data)
        else:
            # Fallback if no ID provided (legacy flow)
            new_ref = get_ref('users').push(data)
            data['id'] = new_ref.key
            return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    try:
        get_ref('users').child(user_id).update(data)
        # Return updated
        updated = get_ref('users').child(user_id).get()
        updated['id'] = user_id
        return jsonify(updated)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- PRODUCTS API ---
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = get_ref('products').get()
        if not products:
            return jsonify([])
        product_list = []
        for k, v in products.items():
            v['id'] = k
            product_list.append(v)
        return jsonify(product_list)
    except Exception as e:
        print(f"Error fetching products: {e}")
        return jsonify([])

@app.route('/api/products', methods=['POST'])
def create_product():
    try:
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
             image_path = request.form.get('image')

        new_product = {
            "name": name,
            "description": description,
            "price": price,
            "stock": stock,
            "image": image_path
        }

        # Push to Firebase
        new_ref = get_ref('products').push(new_product)
        new_product['id'] = new_ref.key

        return jsonify(new_product)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product_ref = get_ref('products').child(product_id)
        product = product_ref.get()

        if not product:
            return jsonify({"error": "Product not found"}), 404

        updates = {}
        # Handle FormData update
        if request.form:
            updates['name'] = request.form.get('name', product.get('name'))
            updates['description'] = request.form.get('description', product.get('description'))
            updates['price'] = float(request.form.get('price', product.get('price')))
            updates['stock'] = int(request.form.get('stock', product.get('stock')))

            if 'imageFile' in request.files:
                file = request.files['imageFile']
                if file.filename != '':
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(IMGS_DIR, filename))
                    updates['image'] = f"imgs/{filename}"
            elif request.form.get('image'):
                 updates['image'] = request.form.get('image')
        else:
            # Handle JSON update
            data = request.json
            updates.update(data)

        if updates:
            product_ref.update(updates)

        # Return full object
        updated_product = product_ref.get()
        updated_product['id'] = product_id
        return jsonify(updated_product)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        get_ref('products').child(product_id).delete()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ORDERS API ---
@app.route('/api/orders', methods=['GET'])
def get_orders():
    try:
        orders = get_ref('orders').get()
        if not orders:
            return jsonify([])
        order_list = []
        for k, v in orders.items():
            v['id'] = k
            order_list.append(v)
        return jsonify(order_list)
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return jsonify([])

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    try:
        new_ref = get_ref('orders').push(data)
        data['id'] = new_ref.key
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- PAYMENTS API ---
@app.route('/api/payments', methods=['GET'])
def get_payments():
    try:
        payments = get_ref('payments').get()
        if not payments:
            return jsonify([])
        payment_list = []
        for k, v in payments.items():
            v['id'] = k
            payment_list.append(v)
        return jsonify(payment_list)
    except Exception as e:
        print(f"Error fetching payments: {e}")
        return jsonify([])

@app.route('/api/payments', methods=['POST'])
def create_payment():
    data = request.json
    try:
        new_ref = get_ref('payments').push(data)
        data['id'] = new_ref.key
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True, threaded=True)
