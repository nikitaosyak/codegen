
module.exports = {
    db: JSON.parse(require('fs').readFileSync('db/source.cdb', 'utf-8')),
    lookup: { /*type: 'ENUM|OTHER', ns: 'gen', fields: []*/ }
}