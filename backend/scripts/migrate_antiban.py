import sqlite3

def run_migration():
    conn = sqlite3.connect('medflow.db')
    cursor = conn.cursor()

    columns = [
        ('whatsapp_rate_limit', 'INTEGER DEFAULT 300'),
        ('whatsapp_warmup_mode', 'BOOLEAN DEFAULT 1'),
        ('whatsapp_working_hours_enabled', 'BOOLEAN DEFAULT 1'),
        ('whatsapp_working_hours_start', "VARCHAR(10) DEFAULT '08:00'"),
        ('whatsapp_working_hours_end', "VARCHAR(10) DEFAULT '20:00'"),
        ('whatsapp_proxy_url', 'VARCHAR(255) NULL')
    ]

    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE empresas ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            print(f"Column {col_name} already exists or error: {e}")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == '__main__':
    run_migration()
