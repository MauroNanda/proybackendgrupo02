<?php
// Usa el instalador oficial de la versión fijada, únicamente desde CLI.
if (PHP_SAPI !== 'cli') { exit(1); }
$db = new mysqli('mariadb', 'mantis', getenv('MANTIS_DB_PASSWORD'), 'mantis');
$r = $db->query("SHOW TABLES LIKE 'mantis_config_table'");
if ($r->num_rows > 0) {
    $version = $db->query("SELECT value FROM mantis_config_table WHERE config_id='database_version'")->fetch_row();
    if (!$version) { fwrite(STDERR, "Esquema incompleto; no se borra la base.\n"); exit(1); }
    echo "Esquema existente: se conserva.\n";
    exit(0);
}
if ($db->query('SHOW TABLES')->num_rows !== 0) {
    fwrite(STDERR, "Base no vacía y ajena a Mantis: instalación rechazada.\n"); exit(1);
}
$db->close();
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = array('install' => 3, 'hostname' => 'mariadb', 'db_type' => 'mysqli',
    'database_name' => 'mantis', 'db_username' => 'mantis',
    'db_password' => getenv('MANTIS_DB_PASSWORD'), 'admin_username' => 'mantis',
    'admin_password' => getenv('MANTIS_DB_PASSWORD'), 'db_exists' => 1,
    'timezone' => 'America/Argentina/Buenos_Aires', 'path' => getenv('MANTIS_URL'));
ob_start();
require '/var/www/html/admin/install.php';
$output = ob_get_clean();
if ($g_failed) { fwrite(STDERR, "Falló el instalador oficial; revisar compatibilidad de imagen/esquema.\n"); exit(1); }
echo "Esquema instalado con el instalador oficial.\n";
