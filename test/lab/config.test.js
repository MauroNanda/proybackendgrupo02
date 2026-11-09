'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {postgresOptions}=require('../../config/postgres-options');
const {profile,localUrl,settings}=require('../../infra/hia/lab');
const manifest=require('../../infra/hia/dataset.json');

test('Neon exige TLS con certificados y la URL no puede reemplazar la política',()=>{
  const p=postgresOptions({DATABASE_URL:'postgresql://u:p@host.neon.tech/db?sslmode=require'});
  assert.deepEqual(p.dialectOptions.ssl,{rejectUnauthorized:true});
  assert.ok(!p.url.includes('sslmode'));
  assert.throws(()=>postgresOptions({DATABASE_URL:'postgres://u:p@host.neon.tech/db',DB_SSL:'false'}));
});
test('Local permite conexión sin TLS; valores ambiguos o contradictorios se rechazan',()=>{
  assert.equal(postgresOptions({DATABASE_URL:'postgresql://u:p@localhost/db',DB_SSL:'false'}).dialectOptions.ssl,false);
  for(const DB_SSL of ['0','False','']) assert.throws(()=>postgresOptions({DATABASE_URL:'postgres://localhost/db',DB_SSL}));
  assert.throws(()=>postgresOptions({DATABASE_URL:'postgres://localhost/db?sslmode=require',DB_SSL:'false'}));
  assert.throws(()=>postgresOptions({DATABASE_URL:'postgres://host/db?sslmode=disable',DB_SSL:'true'}));
  assert.throws(()=>postgresOptions({DATABASE_URL:'postgres://host/db?sslrootcert=file'}));
  assert.throws(()=>postgresOptions({DATABASE_URL:'https://host/db'}));
});
test('Destinos del laboratorio fijos y credenciales con caracteres especiales',()=>{
  assert.throws(()=>profile('neon'));
  assert.throws(()=>profile('__proto__'));
  assert.throws(()=>profile('constructor'));
  const {URL}=require('node:url');
  const url=new URL(localUrl({POSTGRES_USER:'lab',POSTGRES_PASSWORD:'p@ss:/#',LAB_DB_PORT:'5435'},profile('piloto').database));
  assert.equal(url.hostname,'127.0.0.1');
  assert.equal(decodeURIComponent(url.password),'p@ss:/#');
  assert.equal(url.pathname,'/convoca_lab_piloto_v2');
});
test('Distribución mantiene pares únicos, cupos y suficiente cantidad de usuarios',()=>{
  for(const name of Object.keys(manifest.perfiles)) {
    const p=profile(name),hot=p.eventos/10,half=p.inscripciones/2;
    // Cada evento recibe turnos consecutivos: la rotación no se repite antes de u-1.
    assert.ok(Math.ceil(half/hot)<p.usuarios-1);
    const pairs=new Set();
    if(name==='piloto') for(let n=1;n<=p.inscripciones;n++) {
      const width=n<=half?hot:p.eventos-hot;
      const k=n<=half?n-1:n-half-1;
      const event=k%width+1+(n<=half?0:hot);
      const turn=Math.floor(k/width);
      const user=(turn+event*101)%(p.usuarios-1)+2;
      const key=event+':'+user;
      assert.ok(!pairs.has(key));pairs.add(key);
    }
    assert.ok(settings(p).includes(`SET lab.database = '${p.database}'`));
  }
});
test('Las dos cuentas de demostración tienen un hash compatible con el login',async()=>{
  const bcrypt=require('bcrypt');
  assert.ok(await bcrypt.compare('DemoConvoca2026!',manifest.demoHash));
  assert.equal(await bcrypt.compare('incorrecta',manifest.demoHash),false);
});
