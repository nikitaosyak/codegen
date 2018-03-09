const fs = require('fs')

module.exports = {
    db: JSON.parse(fs.readFileSync('db/source.cdb', 'utf-8')),
    lookup: {
        enums: {}
    }
}