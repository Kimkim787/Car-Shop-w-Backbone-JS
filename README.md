+++++ Dependencies or Package Requirements ++++++
- Python 3
- Flask
- firebase-admin

+++++ Configuration ++++++
1. **Firebase Admin SDK**:
   - Obtain a `serviceAccountKey.json` from your Firebase Console (Project Settings > Service Accounts).
   - Place `serviceAccountKey.json` in the root directory of this project.

2. **Firebase Frontend Config**:
   - Open `js/app.js`.
   - Update the `firebaseConfig` object with your web app's configuration (found in Firebase Console > Project Settings > General > Your Apps).

+++++ How to Run ++++++
1. Install dependencies:
   `pip install -r requirements.txt`
2. Run the server:
   `python server.py`
3. Access the application at: http://localhost:3000
