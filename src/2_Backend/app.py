# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import mysql.connector
# from mysql.connector import Error
# import os
# from pathlib import Path

# def load_env():
#     env_path = Path(__file__).resolve().parents[2] / '.env'
#     if not env_path.exists():
#         return
#     for line in env_path.read_text(encoding='utf-8').splitlines():
#         line = line.strip()
#         if not line or line.startswith('#') or '=' not in line:
#             continue
#         key, _, value = line.partition('=')
#         value = value.strip().strip('"').strip("'")
#         os.environ.setdefault(key.strip(), value)

# load_env()

# app = Flask(__name__)
# configured_origins = os.environ.get(
#     'CORS_ORIGINS',
#     'http://localhost:5173,http://127.0.0.1:5173,https://localhost:5173,https://127.0.0.1:5173',
# )
# cors_origins = [origin.strip() for origin in configured_origins.split(',') if origin.strip()]
# CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=False)

# db_config = {
#     'host': os.environ.get('DB_HOST', '127.0.0.1'),
#     'port': int(os.environ.get('DB_PORT', '3306')),
#     'database': os.environ.get('DB_NAME', 'billing_db'),
#     'user': os.environ.get('DB_USER', 'root'),
#     'password': os.environ.get('DB_PASSWORD', ''),
#     'connection_timeout': int(os.environ.get('DB_CONNECTION_TIMEOUT', '5')),
# }

# def get_db_connection():
#     try:
#         conn = mysql.connector.connect(**db_config)
#         if not conn.is_connected():
#             conn.close()
#             return None
#         return conn
#     except Error as e:
#         safe_config = {key: value for key, value in db_config.items() if key != 'password'}
#         print(f"MySQL connection failed for {safe_config}: {e}")
#         return None

# def local_receipts_response():
#     response = jsonify([])
#     response.headers['X-Database-Fallback'] = 'local'
#     return response

# @app.route('/api/save-receipt', methods=['POST'])
# def save_receipt():
#     data = request.get_json(silent=True) or {}
#     customer_name = data.get('customer_name', '').strip()
#     phone_number = data.get('phone_number', '').strip()
#     total_amount = data.get('total_amount', 0)
#     items = data.get('items', [])

#     if not customer_name or not phone_number:
#         return jsonify({'success': False, 'error': 'Customer name and phone number are required'}), 400

#     if not items or len(items) == 0:
#         return jsonify({'success': False, 'error': 'Receipt must contain at least one item'}), 400

#     conn = get_db_connection()
#     if not conn:
#         return jsonify({
#             'success': False,
#             'error': 'Database unavailable. Check DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.',
#         }), 503

#     cursor = conn.cursor()

#     try:
#         cursor.execute("SELECT id FROM customers WHERE phone_number = %s", (phone_number,))
#         customer = cursor.fetchone()

#         if customer:
#             customer_id = customer[0]
#         else:
#             cursor.execute(
#                 "INSERT INTO customers (name, phone_number) VALUES (%s, %s)",
#                 (customer_name, phone_number)
#             )
#             customer_id = cursor.lastrowid

#         cursor.execute(
#             "INSERT INTO receipts (customer_id, total_amount) VALUES (%s, %s)",
#             (customer_id, total_amount)
#         )
#         receipt_id = cursor.lastrowid

#         for item in items:
#             product_name = item.get('product_name', 'Unknown')
#             quantity = int(item.get('quantity', 1))
#             price = float(item.get('price', 0))

#             cursor.execute(
#                 "INSERT INTO receipt_items (receipt_id, product_name, quantity, price) VALUES (%s, %s, %s, %s)",
#                 (receipt_id, product_name, quantity, price)
#             )

#         conn.commit()
#         return jsonify({'success': True, 'receipt_id': receipt_id})

#     except Error as e:
#         conn.rollback()
#         return jsonify({'success': False, 'error': str(e)}), 500
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/receipts', methods=['GET'])
# def get_receipts():
#     conn = get_db_connection()
#     if not conn:
#         return local_receipts_response()

#     cursor = conn.cursor(dictionary=True)

#     try:
#         cursor.execute("""
#             SELECT r.id, r.total_amount, r.created_at, c.name as customer_name, c.phone_number
#             FROM receipts r
#             JOIN customers c ON r.customer_id = c.id
#             ORDER BY r.created_at DESC
#         """)
#         receipts = cursor.fetchall()

#         for receipt in receipts:
#             cursor.execute("""
#                 SELECT product_name, quantity, price FROM receipt_items
#                 WHERE receipt_id = %s
#             """, (receipt['id'],))
#             receipt['items'] = cursor.fetchall()
#             receipt['total_amount'] = float(receipt['total_amount'])

#         return jsonify(receipts)

#     except Error as e:
#         return jsonify({'success': False, 'error': str(e)}), 500
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/health', methods=['GET'])
# def health():
#     return jsonify({'status': 'ok'})

# if __name__ == '__main__':
#     app.run(
#         host=os.environ.get('BACKEND_HOST', '0.0.0.0'),
#         port=int(os.environ.get('PORT', os.environ.get('BACKEND_PORT', '5000'))),
#         debug=os.environ.get('FLASK_DEBUG', '').lower() == 'true',
#     )
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os
from pathlib import Path


# =========================================================
# LOAD .ENV FOR LOCAL DEVELOPMENT
# =========================================================

def load_env():
    env_path = Path(__file__).resolve().parents[2] / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, _, value = line.partition("=")

        key = key.strip()
        value = value.strip().strip('"').strip("'")

        os.environ.setdefault(key, value)


load_env()


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# CORS
# =========================================================

default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

configured_origins = os.environ.get("CORS_ORIGINS", "")

if configured_origins.strip():
    cors_origins = [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
else:
    cors_origins = default_cors_origins


CORS(
    app,
    resources={
        r"/api/*": {
            "origins": cors_origins
        }
    },
    supports_credentials=False,
)


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

db_config = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "port": int(os.environ.get("DB_PORT", "3306")),
    "database": os.environ.get("DB_NAME", "billing_db"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "connection_timeout": int(
        os.environ.get("DB_CONNECTION_TIMEOUT", "10")
    ),
}


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)

        if not conn.is_connected():
            conn.close()
            return None

        return conn

    except Error as e:
        safe_config = {
            key: value
            for key, value in db_config.items()
            if key != "password"
        }

        print(
            f"MySQL connection failed for {safe_config}: {e}"
        )

        return None


# =========================================================
# DATABASE FALLBACK RESPONSE
# =========================================================

def local_receipts_response():
    response = jsonify([])
    response.headers["X-Database-Fallback"] = "local"
    return response


# =========================================================
# ROOT ROUTE
# =========================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "ok",
        "message": "Smart Biller Backend is running"
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/api/health", methods=["GET"])
def health():
    conn = get_db_connection()

    if not conn:
        return jsonify({
            "status": "error",
            "backend": "ok",
            "database": "disconnected"
        }), 503

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()

        return jsonify({
            "status": "ok",
            "backend": "ok",
            "database": "connected"
        })

    except Error as e:
        return jsonify({
            "status": "error",
            "backend": "ok",
            "database": "error",
            "message": str(e)
        }), 503

    finally:
        try:
            cursor.close()
        except Exception:
            pass

        conn.close()


# =========================================================
# SAVE RECEIPT
# =========================================================

@app.route("/api/save-receipt", methods=["POST"])
def save_receipt():

    data = request.get_json(silent=True) or {}

    customer_name = str(
        data.get("customer_name", "")
    ).strip()

    phone_number = str(
        data.get("phone_number", "")
    ).strip()

    total_amount = data.get("total_amount", 0)

    items = data.get("items", [])


    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not customer_name:
        return jsonify({
            "success": False,
            "error": "Customer name is required"
        }), 400


    if not phone_number:
        return jsonify({
            "success": False,
            "error": "Phone number is required"
        }), 400


    if not isinstance(items, list) or len(items) == 0:
        return jsonify({
            "success": False,
            "error": "Receipt must contain at least one item"
        }), 400


    try:
        total_amount = float(total_amount)

    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Invalid total amount"
        }), 400


    # =====================================================
    # DATABASE CONNECTION
    # =====================================================

    conn = get_db_connection()

    if not conn:
        return jsonify({
            "success": False,
            "error": (
                "Database unavailable. "
                "Check DB_HOST, DB_NAME, DB_USER and DB_PASSWORD."
            )
        }), 503


    cursor = conn.cursor()


    try:

        # -------------------------------------------------
        # FIND CUSTOMER
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM customers
            WHERE phone_number = %s
            """,
            (phone_number,)
        )

        customer = cursor.fetchone()


        # -------------------------------------------------
        # CREATE CUSTOMER IF NOT EXISTS
        # -------------------------------------------------

        if customer:
            customer_id = customer[0]

        else:

            cursor.execute(
                """
                INSERT INTO customers
                    (name, phone_number)
                VALUES
                    (%s, %s)
                """,
                (
                    customer_name,
                    phone_number
                )
            )

            customer_id = cursor.lastrowid


        # -------------------------------------------------
        # CREATE RECEIPT
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO receipts
                (customer_id, total_amount)
            VALUES
                (%s, %s)
            """,
            (
                customer_id,
                total_amount
            )
        )

        receipt_id = cursor.lastrowid


        # -------------------------------------------------
        # CREATE RECEIPT ITEMS
        # -------------------------------------------------

        for item in items:

            product_name = str(
                item.get("product_name", "Unknown")
            ).strip()

            if not product_name:
                product_name = "Unknown"


            try:
                quantity = int(
                    item.get("quantity", 1)
                )
            except (TypeError, ValueError):
                quantity = 1


            try:
                price = float(
                    item.get("price", 0)
                )
            except (TypeError, ValueError):
                price = 0


            if quantity <= 0:
                quantity = 1


            if price < 0:
                price = 0


            cursor.execute(
                """
                INSERT INTO receipt_items
                    (
                        receipt_id,
                        product_name,
                        quantity,
                        price
                    )
                VALUES
                    (%s, %s, %s, %s)
                """,
                (
                    receipt_id,
                    product_name,
                    quantity,
                    price
                )
            )


        # -------------------------------------------------
        # COMMIT
        # -------------------------------------------------

        conn.commit()


        return jsonify({
            "success": True,
            "receipt_id": receipt_id
        })


    except Error as e:

        conn.rollback()

        print(
            f"Save receipt database error: {e}"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


    except Exception as e:

        conn.rollback()

        print(
            f"Save receipt error: {e}"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


    finally:

        try:
            cursor.close()
        except Exception:
            pass

        conn.close()


# =========================================================
# GET ALL RECEIPTS
# =========================================================

@app.route("/api/receipts", methods=["GET"])
def get_receipts():

    conn = get_db_connection()


    if not conn:
        return local_receipts_response()


    cursor = conn.cursor(dictionary=True)


    try:

        # -------------------------------------------------
        # GET RECEIPTS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                r.id,
                r.total_amount,
                r.created_at,
                c.name AS customer_name,
                c.phone_number
            FROM receipts r
            JOIN customers c
                ON r.customer_id = c.id
            ORDER BY r.created_at DESC
            """
        )


        receipts = cursor.fetchall()


        # -------------------------------------------------
        # GET ITEMS FOR EACH RECEIPT
        # -------------------------------------------------

        for receipt in receipts:

            cursor.execute(
                """
                SELECT
                    product_name,
                    quantity,
                    price
                FROM receipt_items
                WHERE receipt_id = %s
                """,
                (
                    receipt["id"],
                )
            )


            receipt["items"] = cursor.fetchall()


            receipt["total_amount"] = float(
                receipt["total_amount"] or 0
            )


            for item in receipt["items"]:

                item["quantity"] = int(
                    item["quantity"] or 1
                )

                item["price"] = float(
                    item["price"] or 0
                )


        return jsonify(receipts)


    except Error as e:

        print(
            f"Get receipts database error: {e}"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


    finally:

        try:
            cursor.close()
        except Exception:
            pass

        conn.close()


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    host = os.environ.get(
        "BACKEND_HOST",
        "0.0.0.0"
    )

    port = int(
        os.environ.get(
            "PORT",
            os.environ.get(
                "BACKEND_PORT",
                "5000"
            )
        )
    )

    debug = (
        os.environ
        .get("FLASK_DEBUG", "")
        .lower()
        == "true"
    )


    print("=" * 60)
    print("Smart Biller Backend")
    print("=" * 60)
    print(f"Host       : {host}")
    print(f"Port       : {port}")
    print(f"Database   : {db_config['database']}")
    print(f"DB Host    : {db_config['host']}")
    print(f"DB User    : {db_config['user']}")
    print("=" * 60)


    app.run(
        host=host,
        port=port,
        debug=debug
    )