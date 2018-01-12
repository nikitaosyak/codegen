
//
// reading templates and database
const fs = require('fs')
const templates = {
    enum: fs.readFileSync('cs-templates/Enum.template', 'utf8'),
    ns: fs.readFileSync('cs-templates/Namespace.template', 'utf8'),
    tt: fs.readFileSync('cs-templates/TableType.template', 'utf8')
}
const db = JSON.parse(fs.readFileSync('db/source.cdb'))

const handlebars = require('handlebars')
const nsTemplate = handlebars.compile(templates.ns)

//
// ensuring output directory
if (!fs.existsSync('./build')) {
    fs.mkdirSync('./build')
}

//
// helper functions
const enumsLookup = {}

const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

const processEnum = (name, members) => {
    const capName = capitalize(name)
    enumsLookup[capName] = members

    return handlebars.compile(templates.enum)({
        name: capName,
        fields: members.map((m, i) => {
            if (i === m.length) return {name: m}
            return {name: m, delimiter: true}
        })
    })
}

const writeContent = (className, content, using = undefined) => {
    const filePath = './build/' + className + '.cs'
    const nsData = {name: 'gen', content: content, using: using}
    fs.writeFileSync(filePath, nsTemplate(nsData))
}


//
// actually building
//


//
// build global enums if any
const globalEnums = db.customTypes.filter(ct => {
    return ct.cases.filter(member => {
        return member.args.length === 0
    }).length > 0
})

globalEnums.forEach(gEnum => {
    const result = processEnum(gEnum.name, gEnum.cases.map(m => m.name))
    writeContent(gEnum.name, {item: result})
})

//
// build table types
const tableTypes = db.sheets.filter(sh => /^.+_type$/.test(sh.name))
tableTypes.forEach(tableType => {

    const typeName = tableType.name.replace('_type', '')
    let content = []
    let using = []
    let constructorParametrization = []

    const templateData = {
        name: capitalize(typeName),
        fields: tableType.columns.length > 0 ? [] : null,
        constructors: tableType.lines.length > 0 ? [] : null
    }

    const localEnums = tableType.columns.filter(column => {
        return Number.parseInt(column.typeStr.match(/^\d+/)) === 5
    })
    localEnums.forEach(en => {
        content.push({item: processEnum(en.name, en.typeStr.match(/[^(\d+:?)].*/)[0].split(','))})
    })

    tableType.columns.forEach((column, i) => {
        const columnType = Number.parseInt(column.typeStr.match(/^\d+/))
        switch (columnType) {
            case 0: break
            case 1:
                templateData.fields[i] = {
                    name: column.name,
                    type: 'String'
                }
                break
            case 2: break
            case 3: break
            case 4: break
            case 5:
                templateData.fields[i] = {
                    name: column.name,
                    type: capitalize(column.name)
                }
                break
            case 6: break
            case 7: break
            case 8: break
            case 9: break
            case 10: break
            case 11:
                using.push({type: 'UnityEngine'})
                templateData.fields[i] = {
                    name: column.name,
                    type: 'Color'
                }
                break
        }
        if (!column.opt) constructorParametrization.push(i)
    })


    tableType.lines.forEach((line, i) => {
        templateData.constructors.push({
            parameters: constructorParametrization.length > 0 ? [] : null,
            definedFields: []
        })
        constructorParametrization.forEach(paramIdx => {
            templateData.constructors[i].parameters.push({
                name: tableType.columns[paramIdx].name
            })
        })
    })
    content.push({item: handlebars.compile(templates.tt)(templateData)})
    writeContent(capitalize(typeName), content, using)
    console.log(templateData)
})

// console.log(enumsLookup)