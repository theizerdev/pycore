import sqlite3

def migrate():
    conn = sqlite3.connect('medflow.db')
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(empresas)")
    cols = [row[1] for row in cursor.fetchall()]

    new_cols = [
        ('mapbox_api_key', 'TEXT'),
        ('mapbox_active', 'BOOLEAN DEFAULT 0'),
        ('google_maps_api_key', 'TEXT'),
        ('google_maps_active', 'BOOLEAN DEFAULT 0'),
        ('whatsapp_active', 'BOOLEAN DEFAULT 0'),
        ('whatsapp_api_url', "TEXT DEFAULT 'http://localhost:3000'"),
        ('whatsapp_api_key', 'TEXT'),
        ('whatsapp_instance', 'TEXT'),
        ('whatsapp_connected', 'BOOLEAN DEFAULT 0'),
        ('paypal_active', 'BOOLEAN DEFAULT 0'),
        ('paypal_mode', "TEXT DEFAULT 'sandbox'"),
        ('paypal_client_id', 'TEXT'),
        ('paypal_client_secret', 'TEXT'),
        ('stripe_active', 'BOOLEAN DEFAULT 0'),
        ('stripe_mode', "TEXT DEFAULT 'test'"),
        ('stripe_publishable_key', 'TEXT'),
        ('stripe_secret_key', 'TEXT'),
        ('stripe_webhook_secret', 'TEXT'),
        ('mercadopago_active', 'BOOLEAN DEFAULT 0'),
        ('mercadopago_mode', "TEXT DEFAULT 'sandbox'"),
        ('mercadopago_public_key', 'TEXT'),
        ('mercadopago_access_token', 'TEXT'),
        ('bcv_rate_cached', 'FLOAT'),
        ('bcv_rate_updated_at', 'TIMESTAMP')
    ]

    for col_name, col_type in new_cols:
        if col_name not in cols:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE empresas ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()
    print("Migration script finished successfully!")

if __name__ == '__main__':
    migrate()
