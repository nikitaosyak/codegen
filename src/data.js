const fs = require('fs')
const pug = require('pug')
module.exports = {
    db: JSON.parse(fs.readFileSync('db/source.cdb', 'utf-8')),
    template: {
        enum: pug.compileFile('templates/Enum.pug'),
        // namespace: handlebars.compile(fs.readFileSync('cs-templates/Namespace.template', 'utf-8'), {noEscape: true}),
        // tableType: handlebars.compile(fs.readFileSync('cs-templates/TableType.template', 'utf-8'), {noEscape: true}),
        // entity: handlebars.compile(fs.readFileSync('cs-templates/Entity.template', 'utf-8'), {noEscape: true}),
        // iEntity: handlebars.compile(fs.readFileSync('cs-templates/IEntity.template', 'utf-8'), {noEscape: true})
    },
    lookup: {
        enums: {}
    }
}