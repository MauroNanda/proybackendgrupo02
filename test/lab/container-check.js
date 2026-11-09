'use strict';
// Verificación optativa desde node:22, en la misma red Compose del laboratorio.
const {URL}=require('node:url');
const {spawnSync}=require('node:child_process');
async function main() {
  const url=new URL('postgresql://db-principal:5432/convoca_lab_piloto_v2');
  url.username=process.env.POSTGRES_USER;url.password=process.env.POSTGRES_PASSWORD;
  process.env.DATABASE_URL=url.toString();process.env.DB_SSL='false';process.env.NODE_ENV='test';
  const sequelize=require('../../config/db');
  try {
    await sequelize.authenticate();
    const [rows]=await sequelize.query('SELECT email,password FROM "Usuarios" WHERE email=\'lab.2@convoca.test\'');
    if(!await require('bcrypt').compare('DemoConvoca2026!',rows[0].password)) throw new Error('Hash demo inválido.');
    console.log(`API Sequelize + autenticación PostgreSQL + bcrypt: OK (${process.version})`);
    const result=spawnSync(process.execPath,['node_modules/sequelize-cli/lib/sequelize','db:migrate:status'],{env:process.env,stdio:'inherit'});
    if(result.status!==0) throw new Error('Falló Sequelize CLI.');
  } finally { await sequelize.close(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
