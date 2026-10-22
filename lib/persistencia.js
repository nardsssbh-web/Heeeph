// Uma execução: sem intervalo concorrente entre o pedido e seu índice.
// Redis não desfaz escritas anteriores a erros de execução: validar antes de SET.
module.exports = `-- heeeph:salvar-v1
local tipo=redis.call('TYPE',KEYS[2])
if type(tipo)=='table' then tipo=tipo.ok end
if tipo~='none' and tipo~='zset' then return redis.error_reply('Indice de pedidos invalido') end
local score=tonumber(ARGV[2])
if not score then return redis.error_reply('Data invalida') end
local ttl=ARGV[3]~='' and tonumber(ARGV[3]) or nil
if ARGV[3]~='' and (not ttl or ttl<=0 or ttl~=math.floor(ttl)) then return redis.error_reply('Expiracao invalida') end
if ttl then redis.call('SET',KEYS[1],ARGV[1],'EX',ttl)
else redis.call('SET',KEYS[1],ARGV[1]) end
redis.call('ZADD',KEYS[2],score,ARGV[4])
return 'OK'`;
