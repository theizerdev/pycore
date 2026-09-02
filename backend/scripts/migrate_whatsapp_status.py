import sqlite3

conn = sqlite3.connect('medflow.db')
cursor = conn.cursor()

cols = [row[1] for row in cursor.execute('PRAGMA table_info(empresas)').fetchall()]
if 'whatsapp_status' not in cols:
    cursor.execute("ALTER TABLE empresas ADD COLUMN whatsapp_status VARCHAR(50) DEFAULT 'disconnected'")
    print('Added whatsapp_status')
if 'whatsapp_phone' not in cols:
    cursor.execute("ALTER TABLE empresas ADD COLUMN whatsapp_phone VARCHAR(50)")
    print('Added whatsapp_phone')

conn.commit()
conn.close()
print('Empresa columns checked successfully!')
