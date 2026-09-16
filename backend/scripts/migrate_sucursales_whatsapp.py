"""
Migración idempotente para habilitar WhatsApp a nivel de Sucursal
y vincular sucursal_id a whatsapp_messages.
"""
import pymysql

def run_migration():
    conn = pymysql.connect(
        host='127.0.0.1',
        port=3307,
        user='root',
        password='',
        db='pycore_db',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    with conn.cursor() as cursor:
        print("Verificando columnas en tabla 'sucursales'...")
        cursor.execute("DESCRIBE sucursales")
        existing_suc = [row['Field'] for row in cursor.fetchall()]

        sucursales_columns = [
            ("whatsapp_active", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("whatsapp_api_url", "VARCHAR(255) NULL DEFAULT 'https://whatsapp.theizerdev.com'"),
            ("whatsapp_api_key", "VARCHAR(255) NULL"),
            ("whatsapp_instance", "VARCHAR(100) NULL"),
            ("whatsapp_connected", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("whatsapp_status", "VARCHAR(50) NULL DEFAULT 'disconnected'"),
            ("whatsapp_phone", "VARCHAR(50) NULL"),
            ("whatsapp_rate_limit", "INT NULL DEFAULT 300"),
            ("whatsapp_warmup_mode", "TINYINT(1) NULL DEFAULT 1"),
            ("whatsapp_working_hours_enabled", "TINYINT(1) NULL DEFAULT 1"),
            ("whatsapp_working_hours_start", "VARCHAR(10) NULL DEFAULT '08:00'"),
            ("whatsapp_working_hours_end", "VARCHAR(10) NULL DEFAULT '20:00'"),
            ("whatsapp_proxy_url", "VARCHAR(255) NULL"),
        ]

        for col_name, col_def in sucursales_columns:
            if col_name not in existing_suc:
                sql = f"ALTER TABLE sucursales ADD COLUMN `{col_name}` {col_def}"
                print(f"Ejecutando: {sql}")
                cursor.execute(sql)
            else:
                print(f"Columna '{col_name}' ya existe en 'sucursales'.")

        print("\nVerificando columnas en tabla 'whatsapp_messages'...")
        cursor.execute("DESCRIBE whatsapp_messages")
        existing_msg = [row['Field'] for row in cursor.fetchall()]

        if "sucursal_id" not in existing_msg:
            sql = "ALTER TABLE whatsapp_messages ADD COLUMN `sucursal_id` INT NULL, ADD INDEX `idx_wa_msg_sucursal` (`sucursal_id`)"
            print(f"Ejecutando: {sql}")
            cursor.execute(sql)
        else:
            print("Columna 'sucursal_id' ya existe en 'whatsapp_messages'.")

    conn.commit()
    conn.close()
    print("\n✅ Migración de WhatsApp por Sucursal completada exitosamente.")

if __name__ == "__main__":
    run_migration()
