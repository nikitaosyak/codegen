const fs = require('fs')
const ejs = require('ejs')

const getStr = fileName => {
    return fs.readFileSync(`templates/${fileName}.ejs`, 'utf-8')
}

module.exports = {
    db: JSON.parse(fs.readFileSync('db/source.cdb', 'utf-8')),
    template: {
        enum: ejs.compile(getStr('Enum')),
        // namespace: handlebars.compile(fs.readFileSync('cs-templates/Namespace.template', 'utf-8'), {noEscape: true}),
        // tableType: handlebars.compile(fs.readFileSync('cs-templates/TableType.template', 'utf-8'), {noEscape: true}),
        // entity: handlebars.compile(fs.readFileSync('cs-templates/Entity.template', 'utf-8'), {noEscape: true}),
        // iEntity: handlebars.compile(fs.readFileSync('cs-templates/IEntity.template', 'utf-8'), {noEscape: true})
    },
    lookup: {
        enums: {}
    }
}