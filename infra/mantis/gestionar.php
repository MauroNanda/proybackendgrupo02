<?php
// Registro retrospectivo por APIs de Mantis: preserva historial y no escribe tickets por SQL.
if (PHP_SAPI !== 'cli') { exit(1); }
require '/var/www/html/core.php';
require_api('bug_api.php'); require_api('bugnote_api.php'); require_api('project_api.php');
require_api('category_api.php'); require_api('user_api.php'); require_api('history_api.php');
$action = $argv[1] ?? '';
$admin = user_get_id_by_name('administrator');
if (!auth_does_password_match($admin, getenv('MANTIS_ADMIN_PASSWORD'))) {
    // Solo primer arranque: cambia la clave pública del instalador. No pisa otra instalación.
    if (!auth_does_password_match($admin, 'root')) { fwrite(STDERR,"La clave administrativa no coincide. Se conserva la base.\n"); exit(1); }
    user_set_password($admin, getenv('MANTIS_ADMIN_PASSWORD'), true);
    user_clear_cache($admin);
}
auth_attempt_script_login('administrator', getenv('MANTIS_ADMIN_PASSWORD')) || exit(1);
$users = array('gabriel-calisaya'=>array('GABRIEL','Gabriel Calisaya'),
    'mauro-nanda'=>array('MAURO','Mauro Gutierrez Nanda'),
    'juan-carrizo'=>array('JUAN','Juan Carrizo'), 'delia-cusipuma'=>array('DELIA','Delia Cusipuma'),
    'dumbi34'=>array('DUMBI','Dumbi34'));
$project = project_get_id_by_name('Convoca - A11 reproducible');
if ($action === 'seed') {
    if (!$project) $project = project_create('Convoca - A11 reproducible',
        'Registro retrospectivo del laboratorio. Importar no equivale a volver a ejecutar fallas. No reemplaza la instancia histórica de Gabriel.', 10, VS_PRIVATE);
    foreach ($users as $login=>$details) {
        $id = user_get_id_by_name($login);
        if (!$id) { user_create($login, getenv('MANTIS_'.$details[0].'_PASSWORD'), '', MANAGER, false, true, $details[1]); $id=user_get_id_by_name($login); }
        project_add_user($project, $id, MANAGER);
    }
    $catalog = json_decode(file_get_contents('/opt/a11/casos.json'), true, 512, JSON_THROW_ON_ERROR);
    foreach ($catalog['casos'] as $case) {
        $summary = '['.$case['id'].'] '.$case['titulo'];
        db_param_push();
        $exists=db_query('SELECT id FROM {bug} WHERE project_id='.db_param().' AND summary='.db_param(), array($project,$summary));
        $existing=db_fetch_array($exists);
        if ($existing) {
            continue; // Nunca cambiar ni cerrar de nuevo un ticket editado/reabierto por el equipo.
        } else {
        $category=category_get_id_by_name($case['categoria'],$project,false);
        if (!$category) $category=category_add($project,$case['categoria']);
        auth_attempt_script_login('gabriel-calisaya',getenv('MANTIS_GABRIEL_PASSWORD')) || exit(1);
        $bug = new BugData();
        $bug->project_id=$project; $bug->reporter_id=user_get_id_by_name('gabriel-calisaya');
        $bug->summary=$summary; $bug->category_id=$category; $bug->priority=$case['prioridad'];
        $bug->severity=MINOR; $bug->reproducibility=REPRODUCIBILITY_ALWAYS;
        $bug->description=$case['problema']."\nTipo: ".$case['tipo'];
        $bug->steps_to_reproduce=$case['reproduccion'];
        $bug->additional_information='Registro retrospectivo importado desde infra/mantis/casos.json. Origen: '.$case['origen']."\n".implode("\n",$case['vinculos']);
        $id=$bug->create();
        $bug=bug_get($id,true); $bug->handler_id=user_get_id_by_name('gabriel-calisaya'); $bug->status=ASSIGNED; $bug->update(true,true);
        bugnote_add($id, "Tratamiento documentado: ".$case['tratamiento']."\n".$case['origen'], '0:00',false,BUGNOTE,'',null,false);
        }
        if (!empty($case['verificado'])) {
            $bug=bug_get($id,true); $bug->resolution=FIXED; $bug->status=RESOLVED; $bug->update(true,true);
            auth_attempt_script_login('mauro-nanda',getenv('MANTIS_MAURO_PASSWORD')) || exit(1);
            bugnote_add($id, 'Verificación y cierre retrospectivo del ensayo: '.$case['verificacion']."\nEvidencia: ".$case['evidencia']."\nLa importación no ejecuta estas pruebas ni afirma despliegue productivo. Corregido en rama no equivale a integrado en develop.", '0:00',false,BUGNOTE,'',null,false);
            $bug=bug_get($id,true); $bug->status=CLOSED; $bug->update(true,true);
        }
    }
}
if (!$project) { fwrite(STDERR,"Proyecto A11 inexistente. Ejecutar mantis:up.\n"); exit(1); }
db_param_push();
$rows=db_query('SELECT b.id,b.summary,b.status,b.resolution,b.priority,c.name AS category,u.username AS handler FROM {bug} b JOIN {category} c ON c.id=b.category_id JOIN {user} u ON u.id=b.handler_id WHERE b.project_id='.db_param().' ORDER BY b.id',array($project));
$tickets=array(); $ok=true;
while ($row=db_fetch_array($rows)) {
    db_param_push();
    $notes=db_query('SELECT t.note FROM {bugnote} n JOIN {bugnote_text} t ON t.id=n.bugnote_text_id WHERE n.bug_id='.db_param().' ORDER BY n.id',array($row['id']));
    $row['notes']=array(); while ($n=db_fetch_array($notes)) $row['notes'][]=$n['note'];
    db_param_push();
    $history=db_query('SELECT h.field_name,h.old_value,h.new_value,h.date_modified,u.username AS actor FROM {bug_history} h JOIN {user} u ON u.id=h.user_id WHERE h.bug_id='.db_param().' ORDER BY h.id',array($row['id']));
    $row['history']=array(); while ($h=db_fetch_array($history)) $row['history'][]=$h;
    $states=array_column(array_filter($row['history'],fn($h)=>$h['field_name']==='status'),'new_value');
    $row['verified']=((int)$row['status']===CLOSED && count($row['notes'])>=2 && $row['handler']==='gabriel-calisaya' && (int)$row['priority']>=NORMAL && in_array((string)ASSIGNED,$states) && in_array((string)RESOLVED,$states) && in_array((string)CLOSED,$states) && in_array('mauro-nanda',array_column($row['history'],'actor')));
    if (!$row['verified']) $ok=false;
    $tickets[]=$row;
}
echo json_encode(array('ok'=>$ok && count($tickets)===10,'project'=>$project,'tickets'=>$tickets),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
