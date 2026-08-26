from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
CORS(app)

db_config = {
    'host': 'localhost',
    'database': 'billing_db',
    'user': 'root',
    'password': ''
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

@app.route('/api/save-receipt', methods=['POST'])
def save_receipt():
    data = request.get_json()
    customer_name = data.get('customer_name', '').strip()
    phone_number = data.get('phone_number', '').strip()
    total_amount = data.get('total_amount', 0)
    items = data.get('items', [])

    if not customer_name or not phone_number:
        return jsonify({'success': False, 'error': 'Customer name and phone number are required'}), 400

    if not items or len(items) == 0:
        return jsonify({'success': False, 'error': 'Receipt must contain at least one item'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM customers WHERE phone_number = %s", (phone_number,))
        customer = cursor.fetchone()

        if customer:
            customer_id = customer[0]
        else:
            cursor.execute(
                "INSERT INTO customers (name, phone_number) VALUES (%s, %s)",
                (customer_name, phone_number)
            )
            customer_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO receipts (customer_id, total_amount) VALUES (%s, %s)",
            (customer_id, total_amount)
        )
        receipt_id = cursor.lastrowid

        for item in items:
            product_name = item.get('product_name', 'Unknown')
            quantity = int(item.get('quantity', 1))
            price = float(item.get('price', 0))

            cursor.execute(
                "INSERT INTO receipt_items (receipt_id, product_name, quantity, price) VALUES (%s, %s, %s, %s)",
                (receipt_id, product_name, quantity, price)
            )

        conn.commit()
        return jsonify({'success': True, 'receipt_id': receipt_id})

    except Error as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/receipts', methods=['GET'])
def get_receipts():
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT r.id, r.total_amount, r.created_at, c.name as customer_name, c.phone_number
            FROM receipts r
            JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        """)
        receipts = cursor.fetchall()

        for receipt in receipts:
            cursor.execute("""
                SELECT product_name, quantity, price FROM receipt_items
                WHERE receipt_id = %s
            """, (receipt['id'],))
            receipt['items'] = cursor.fetchall()
            receipt['total_amount'] = float(receipt['total_amount'])

        return jsonify(receipts)

    except Error as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
