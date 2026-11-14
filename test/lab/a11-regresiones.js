'use strict';
// Se ejecuta en el contenedor Node sin red. Baselines obtenidos con git show, sin datos reales.
const fs=require('node:fs'),Module=require('node:module'),assert=require('node:assert/strict');
const root='/revision',out=root+'/infra/mantis/resultados';
function baseline(name,filename){const m=new Module(root+'/'+filename);m.filename=root+'/'+filename;m.paths=Module._nodeModulePaths(require('node:path').dirname(m.filename));m._compile(fs.readFileSync(out+'/'+name,'utf8'),m.filename);return m.exports;}
const {Evento,sequelize}=require(root+'/models');
const result={fecha:new Date().toISOString(),tipo:'Regresiones de código con dependencias reales y persistencia sustituida; no son mediciones HTTP'};
async function main(){
  const oldCreate=Evento.create,oldFind=Evento.findByPk;
  let captured;
  Evento.create=async data=>{captured=data;return {id:'regresion',...data};};
  Evento.findByPk=async()=>({id:'regresion',...captured,categorias:[]});
  try{
    const old=baseline('evento-antes.js','services/evento.service.js');
    await old.crear({titulo:'Regresion'});assert.equal(captured.descripcion,undefined);
    await require(root+'/services/evento.service').crear({titulo:'Regresion'});assert.equal(captured.descripcion,'');
    result['A11-01']={antes:'descripcion ausente',despues:'cadena vacia',ok:true};
  }finally{Evento.create=oldCreate;Evento.findByPk=oldFind;}
  const oldLog=console.error;console.error=()=>{};
  try{
    process.env.NODE_ENV='development';
    function run(handler){let code=200,body;handler(Object.assign(new Error('Autenticacion requerida'),{status:401}),{}, {status(c){code=c;return this;},json(b){body=b;}},()=>{});return {code,body};}
    const before=run(baseline('errores-antes.js','middlewares/error-handler.middleware.js'));
    const after=run(require(root+'/middlewares/error-handler.middleware'));
    assert.ok(before.body.error.stack);assert.equal(Object.hasOwn(after.body.error,'stack'),false);
    result['A11-02']={antesExponeStack:true,despuesExponeStack:false,http:after.code,ok:true};
    const original=sequelize.authenticate;sequelize.authenticate=async()=>{throw new Error('Detalle interno de conexion');};
    try{
      const router=baseline('health-antes.js','routes/health.routes.js');
      let code=200,body;const res={status(c){code=c;return this;},json(b){body=b;}};
      await router.stack.find(l=>l.route).route.stack[0].handle({},res);
      assert.equal(code,200);assert.equal(body.status,'ok');
      await require(root+'/utils/health-check').healthCheck(sequelize.authenticate,{})({},res);
      assert.equal(code,503);assert.equal(body.database,'down');
      result['A11-04']={antesHttp:200,antesStatus:'ok',despuesHttp:code,despuesDatabase:body.database,ok:true};
    }finally{sequelize.authenticate=original;}
  }finally{console.error=oldLog;}
  result.ok=true;
  fs.writeFileSync('/tmp/regresiones.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
