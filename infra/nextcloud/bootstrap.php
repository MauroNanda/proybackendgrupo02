<?php
if (PHP_SAPI !== 'cli') exit(1);
define('OC_CONSOLE', 1);
require_once '/var/www/html/lib/base.php';
$users = array('archivo-convoca'=>'OWNER', 'usuario1'=>'USER1',
    'usuario2'=>'USER2', 'usuario3'=>'USER3', 'usuario4'=>'USER4',
    'usuario5'=>'USER5', 'prueba-ajena'=>'OUTSIDER');
$manager = \OCP\Server::get(\OCP\IUserManager::class);
$groups = \OCP\Server::get(\OCP\IGroupManager::class);
\OCP\Server::get(\OCP\IConfig::class)->setSystemValue('skeletondirectory', '');
$config = \OCP\Server::get(\OCP\IConfig::class);
$config->setAppValue('password_policy','minLength','8');
$config->setAppValue('password_policy','enforceNonCommonPassword','0');
$config->setAppValue('password_policy','enforceHaveIBeenPwned','0');
$group = $groups->get('convoca-g02') ?? $groups->createGroup('convoca-g02');
foreach ($users as $uid=>$key) {
    $user = $manager->get($uid);
    if (!$user) $user = $manager->createUser($uid, getenv('NC_'.$key.'_PASSWORD'));
    if (!$user) throw new RuntimeException('No se pudo crear '.$uid);
    $user->setQuota($uid === 'archivo-convoca' ? '2 GB' : '500 MB');
    if (!in_array($key, array('OWNER','OUTSIDER'))) $group->addUser($user);
}
// Conservar historial y archivos de las cuentas anteriores, sin accesos duplicados.
foreach (array('mauro-nanda','gabriel-calisaya','juan-carrizo','delia-cusipuma','dumbi34') as $oldUid) {
    $old = $manager->get($oldUid);
    if ($old) { $group->removeUser($old); $old->setEnabled(false); }
}
foreach (array('shareapi_allow_links'=>'no', 'shareapi_allow_public_upload'=>'no',
    'shareapi_allow_resharing'=>'no', 'shareapi_allow_share_dialog_user_enumeration'=>'no') as $key=>$value) {
    $config->setAppValue('core',$key,$value);
}
$config->setAppValue('core','backgroundjobs_mode','cron');
$config->setAppValue('firstrunwizard','skip','1');
$config->setSystemValue('default_phone_region','AR');
$config->setSystemValue('maintenance_window_start',3);
$config->setSystemValue('versions_retention_obligation','30, auto');
echo json_encode(array('users'=>array_keys($users),'group'=>$group->getGID(),'publicLinks'=>false,'resharing'=>false))."\n";
