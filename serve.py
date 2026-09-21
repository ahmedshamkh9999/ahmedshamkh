from waitress import serve
from app import app  # يستدعي التطبيق من ملف app.py

if __name__ == '__main__':
    print("POS Server running on http://0.0.0.0:5000")
    serve(app, host='0.0.0.0', port=5000)