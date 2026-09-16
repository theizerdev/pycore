"""
Migración idempotente para crear las tablas del Chat Clínico Interno:
- chat_canales
- chat_participantes
- chat_mensajes
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
        print("Creando tabla 'chat_canales' si no existe...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS `chat_canales` (
                `id` INT NOT NULL AUTO_INCREMENT,
                `empresa_id` INT NOT NULL,
                `sucursal_id` INT NOT NULL,
                `tipo` VARCHAR(30) NOT NULL DEFAULT 'canal_sucursal',
                `nombre` VARCHAR(150) NULL,
                `descripcion` VARCHAR(255) NULL,
                `activo` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_chat_canales_empresa` (`empresa_id`),
                INDEX `idx_chat_canales_sucursal` (`sucursal_id`),
                INDEX `idx_chat_canales_tipo` (`tipo`),
                CONSTRAINT `fk_chat_canales_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_chat_canales_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        print("Creando tabla 'chat_participantes' si no existe...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS `chat_participantes` (
                `id` INT NOT NULL AUTO_INCREMENT,
                `canal_id` INT NOT NULL,
                `usuario_id` INT NOT NULL,
                `ultimo_leido_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
                `activo` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_chat_part_canal` (`canal_id`),
                INDEX `idx_chat_part_usuario` (`usuario_id`),
                UNIQUE KEY `idx_canal_usuario` (`canal_id`, `usuario_id`),
                CONSTRAINT `fk_chat_part_canal` FOREIGN KEY (`canal_id`) REFERENCES `chat_canales` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_chat_part_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        print("Creando tabla 'chat_mensajes' si no existe...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS `chat_mensajes` (
                `id` INT NOT NULL AUTO_INCREMENT,
                `canal_id` INT NOT NULL,
                `empresa_id` INT NOT NULL,
                `sucursal_id` INT NOT NULL,
                `remitente_id` INT NOT NULL,
                `tipo` VARCHAR(20) NOT NULL DEFAULT 'texto',
                `contenido` TEXT NULL,
                `archivo_url` VARCHAR(500) NULL,
                `archivo_nombre` VARCHAR(255) NULL,
                `archivo_tamano` INT NULL,
                `archivo_tipo` VARCHAR(100) NULL,
                `duracion_audio` FLOAT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_chat_msg_canal` (`canal_id`),
                INDEX `idx_chat_msg_empresa` (`empresa_id`),
                INDEX `idx_chat_msg_sucursal` (`sucursal_id`),
                INDEX `idx_chat_msg_remitente` (`remitente_id`),
                INDEX `idx_chat_msg_created` (`created_at`),
                INDEX `idx_chat_msg_canal_created` (`canal_id`, `created_at`),
                CONSTRAINT `fk_chat_msg_canal` FOREIGN KEY (`canal_id`) REFERENCES `chat_canales` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_chat_msg_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_chat_msg_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_chat_msg_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

    conn.commit()
    conn.close()
    print("[OK] Tablas de Chat Clinico creadas exitosamente en la base de datos.")

if __name__ == "__main__":
    run_migration()
