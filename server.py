import os
import json
import logging
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import firebase_admin
from firebase_admin import credentials, db, auth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='.', static_url_path='')

DATA_DIR = 'data'
IMGS_DIR = 'imgs'
# USERS_FILE, PRODUCTS_FILE are deprecated for database operations but kept for safe file serving/other parts if needed?
# Actually, we should stop using products.json completely as per instructions.
ORDERS_FILE = os.path.join(DATA_DIR, 'orders.json')
PAYMENTS_FILE = os.path.join(DATA_DIR, 'payments.json')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMGS_DIR, exist_ok=True)

# Helper to read/write JSON (kept for Orders/Payments)
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

# --- FIREBASE SETUP ---
# Attempt to initialize Firebase Admin
# We expect credentials in environment or a specific file.
# Since user said "connected using .env", we assume standard Google Cloud credential lookup
# OR a `serviceAccountKey.json` if they provide it eventually.
# For this code to run without crashing in an environment without keys, we wrap in try/except or conditional.

try:
    # Check for service account file
    cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': os.getenv('FIREBASE_DATABASE_URL', 'https://YOUR_PROJECT_ID.firebaseio.com')
        })
        logger.info("Firebase Admin Initialized with Certificate.")
    else:
        # Fallback for "already connected via .env" logic if it implies auto-discovery
        # or maybe we just init with default options if on GCP?
        # But for local dev without file, this might fail.
        # We will attempt default init.
        firebase_admin.initialize_app(options={
             'databaseURL': os.getenv('FIREBASE_DATABASE_URL', 'https://YOUR_PROJECT_ID.firebaseio.com')
        })
        logger.info("Firebase Admin Initialized with Default Credentials.")
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin: {e}")
    # In a real app we might exit, but here we keep running to serve static files even if DB fails
    pass

# --- AUTH HELPER ---
def verify_admin_request():
    """
    Verifies the Firebase ID Token in the Authorization header.
    Returns the user object if verified and isAdmin=True.
    Raises or returns None/Error otherwise.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "Missing or invalid Authorization header"

    token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']

        # Check isAdmin in Realtime Database
        user_ref = db.reference(f'users/{uid}')
        user_data = user_ref.get()

        if user_data and user_data.get('isAdmin') is True:
            return user_data, None
        else:
            return None, "User is not an admin"

    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None, "Invalid token"

# Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- USERS API (Deprecated/Frontend handled via Firebase Auth, but kept for legacy if needed) ---
# NOTE: The frontend should now get user data from Firebase directly.
# However, if we need to list users for some reason we could rewrite this.
# Leaving as is for now as the task focused on Products.

# --- PRODUCTS API (Firebase) ---
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        ref = db.reference('products')
        products_dict = ref.get()
        # Firebase returns a dict with keys as IDs or a list.
        # Our frontend expects a list.
        if products_dict:
            if isinstance(products_dict, list):
                # Filter out None values which can happen in Firebase lists
                return jsonify([p for p in products_dict if p])
            else:
                return jsonify(list(products_dict.values()))
        else:
            return jsonify([])
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        # Fallback/Empty
        return jsonify([])

@app.route('/api/products', methods=['POST'])
def create_product():
    # Verify Admin
    user, error = verify_admin_request()
    if error:
        return jsonify({"error": error}), 403

    # Handle Request
    name = request.form.get('name')
    description = request.form.get('description')
    price = float(request.form.get('price', 0))
    stock = int(request.form.get('stock', 0))
    image_path = "imgs/item1.svg"

    if 'imageFile' in request.files:
        file = request.files['imageFile']
        if file.filename != '':
            filename = secure_filename(file.filename)
            file.save(os.path.join(IMGS_DIR, filename))
            image_path = f"imgs/{filename}"
    elif 'image' in request.form:
         image_path = request.form.get('image')

    try:
        ref = db.reference('products')
        new_product_ref = ref.push() # Generate ID
        new_id = new_product_ref.key

        new_product = {
            "id": new_id,
            "name": name,
            "description": description,
            "price": price,
            "stock": stock,
            "image": image_path
        }

        new_product_ref.set(new_product)
        return jsonify(new_product)

    except Exception as e:
        logger.error(f"Error creating product: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    # Verify Admin (unless it's just a stock update from checkout?
    # Requirement says "Product management includes adding/editing/deleting products only".
    # Buying stuff decreases stock. That should be allowed for users.
    # We need to distinguish between ADMIN UPDATE and USER STOCK UPDATE.
    # Typically we'd separate endpoints or check payload.
    # For now, if it's a multipart form (admin edit), we enforce admin.
    # If it's JSON (checkout stock update), we might allow it?
    # BUT "Product management... accessible to accounts with isAdmin = true only".
    # User stock update is technically "Product Management"?? No, it's "Order Placement".
    # Let's check headers. If Admin Token provided, allow full edit.
    # If not, check if it's only stock deduction?
    # Simplified: Strict Admin for PUT. Checkout might break.
    # Let's see... CheckoutView calls product.save({stock: newStock}).
    # This will fail if we protect PUT globally.
    # Solution: We should allow stock updates for authenticated users, but full edits only for admin.

    # Check if admin
    admin_user, admin_error = verify_admin_request()
    is_admin = (admin_error is None)

    try:
        ref = db.reference(f'products/{product_id}')
        # We can't easily query by child 'id' unless structure is dict of IDs.
        # But we saved it with `push()` which uses key as ID.
        # Wait, get_products returns values. If we used push(), the key is the ID.
        # But we also stored "id": new_id inside the object.
        # So we need to find the node where child "id" == product_id.
        # OR we assume product_id passed in URL IS the firebase key.
        # Let's assume URL param is the Firebase Key.

        # If the frontend sends the internal ID (e.g. "p1") from the old seed data, this will fail.
        # But we are replacing all products.

        # However, we need to handle the query if the ID is not the key.
        # Ideally, we structure data so Key == ID.
        # In create_product, we did `new_product_ref.set(new_product)`.
        # So Key is distinct from the ID field? Yes.
        # But usually `id` field matches key.

        # If we can't guarantee key == id, we search.
        product_ref = None

        # Try direct access first (optimization)
        snapshot = ref.get()
        if snapshot and snapshot.get('id') == product_id:
             product_ref = ref
        else:
            # Query
            products_ref = db.reference('products')
            # Order by child 'id' equal to product_id
            query = products_ref.order_by_child('id').equal_to(product_id).get()
            if query:
                key = list(query.keys())[0]
                product_ref = products_ref.child(key)
                snapshot = query[key]
            else:
                return jsonify({"error": "Product not found"}), 404

        current_data = snapshot

        # If Form Data (Admin Edit)
        if request.form:
            if not is_admin:
                 return jsonify({"error": "Unauthorized"}), 403

            updates = {}
            if 'name' in request.form: updates['name'] = request.form.get('name')
            if 'description' in request.form: updates['description'] = request.form.get('description')
            if 'price' in request.form: updates['price'] = float(request.form.get('price'))
            if 'stock' in request.form: updates['stock'] = int(request.form.get('stock'))

            if 'imageFile' in request.files:
                file = request.files['imageFile']
                if file.filename != '':
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(IMGS_DIR, filename))
                    updates['image'] = f"imgs/{filename}"
            elif request.form.get('image'):
                updates['image'] = request.form.get('image')

            product_ref.update(updates)
            current_data.update(updates)
            return jsonify(current_data)

        else:
            # JSON update (Stock update vs Admin update)
            data = request.json

            if is_admin:
                product_ref.update(data)
                current_data.update(data)
                return jsonify(current_data)
            else:
                # Non-admin: Allow update ONLY if only 'stock' changes
                # Backbone sends the whole model, so we must compare values.

                # Check for attempts to change protected fields
                protected_fields = ['name', 'description', 'price', 'image', 'id']
                unauthorized_change = False

                for field in protected_fields:
                    if field in data:
                        # Allow if the value is the same as existing (Backbone sends all fields)
                        # We use strict equality or flexible depending on types.
                        # JSON types should match.
                        if data[field] != current_data.get(field):
                            unauthorized_change = True
                            break

                if unauthorized_change:
                    return jsonify({"error": "Unauthorized to change product details"}), 403

                # If we are here, protected fields are untouched or match.
                # Allow stock update.
                if 'stock' in data:
                    product_ref.update({'stock': data['stock']})
                    current_data['stock'] = data['stock']
                    return jsonify(current_data)
                else:
                    # Nothing changed?
                    return jsonify(current_data)

    except Exception as e:
        logger.error(f"Error updating product: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    user, error = verify_admin_request()
    if error:
        return jsonify({"error": error}), 403

    try:
        products_ref = db.reference('products')
        query = products_ref.order_by_child('id').equal_to(product_id).get()
        if query:
            key = list(query.keys())[0]
            products_ref.child(key).delete()
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Product not found"}), 404

    except Exception as e:
        logger.error(f"Error deleting product: {e}")
        return jsonify({"error": str(e)}), 500

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
    app.run(port=3000, debug=True, threaded=True)
