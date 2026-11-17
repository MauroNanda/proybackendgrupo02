<?php
// Solo CLI: cuenta tecnica restringida al proyecto de Convoca, sin administracion global.
if (PHP_SAPI !== 'cli') { exit(1); }
require '/var/www/html/core.php';
require_api('user_api.php'); require_api('project_api.php'); require_api('api_token_api.php');
auth_attempt_script_login('administrator', getenv('MANTIS_ADMIN_PASSWORD')) || exit(1);
$project = project_get_id_by_name('Convoca - A11 reproducible');
if (!$project) { fwrite(STDERR, "Preparar A11 primero.\n"); exit(1); }
$name = 'automatizacion-a13';
$id = user_get_id_by_name($name);
if (!$id) {
    user_create($name, bin2hex(random_bytes(24)), '', REPORTER, false, true, 'Automatizacion A13');
    $id = user_get_id_by_name($name);
}
project_add_user($project, $id, DEVELOPER);
// La CLI conserva el token local; no vuelve a invocar este archivo si ya lo tiene.
echo api_token_create('A13-' . bin2hex(random_bytes(6)), $id);
