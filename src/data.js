const fs = require('fs')
const handlebars = require('handlebars')
module.exports = {
    db: JSON.parse(fs.readFileSync('db/source.cdb', 'utf-8')),
    handlebars: handlebars,
    template: {
        enum: handlebars.compile(fs.readFileSync('cs-templates/Enum.template', 'utf-8'), {noEscape: true}),
        namespace: handlebars.compile(fs.readFileSync('cs-templates/Namespace.template', 'utf-8'), {noEscape: true}),
        tableType: handlebars.compile(fs.readFileSync('cs-templates/TableType.template', 'utf-8'), {noEscape: true}),
        activity: handlebars.compile(fs.readFileSync('cs-templates/Activity.template', 'utf-8'), {noEscape: true}),
    },
    lookup: {
        enums: {}
    }
}