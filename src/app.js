const $ = require('./data')
const utils = require('./utils')

//
// actually building
//
utils.makeSureDirExists('./build')

//
// build global enums if any
const globalEnums = $.db.customTypes.filter(ct => {
    return ct.cases.filter(member => {
        return member.args.length === 0
    }).length > 0
})

globalEnums.forEach(gEnum => {
    const result = utils.processEnum(gEnum.name, gEnum.cases.map(m => m.name))
    utils.writeContent(gEnum.name, {item: result})
})

//
// build table types
const tableTypes = $.db.sheets.filter(sh => /^.+_type$/.test(sh.name))
tableTypes.forEach(tableType => {

    const typeName = tableType.name.replace('_type', '')
    let content = []
    let using = []
    let definingField = -1

    const templateData = {
        name: utils.capitalize(typeName),
        fields: tableType.columns.length > 0 ? [] : null,
        constructors: tableType.lines.length > 0 ? [] : null
    }

    const localEnums = tableType.columns.filter(column => {
        return Number.parseInt(column.typeStr.match(/^\d+/)) === 5
    })
    localEnums.forEach(en => {
        content.push({item: utils.processEnum(en.name, en.typeStr.match(/[^(\d+:?)].*/)[0].split(','))})
    })

    tableType.columns.forEach((column, i) => {
        const columnType = utils.typeToInt(column.typeStr)
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
                    type: utils.capitalize(column.name)
                }
                break
            case 6: break
            case 7: break
            case 8: break
            case 9: break
            case 10: break
            case 11:
                using.push('UnityEngine')
                templateData.fields[i] = {
                    name: column.name,
                    type: 'Color'
                }
                break
        }
        if (!column.opt) {
            if (definingField > -1)
                throw 'Cannot have more then one defining fields in type ' + utils.capitalize(typeName)
            definingField = i
        }
    })

    tableType.lines.forEach(line => {
        const values = []
        tableType.columns.forEach(column => {
            values.push(utils.lineValueByColumnType(column, column.name, line[column.name]))
        })
        templateData.constructors.push({
            name: line.name.toUpperCase(),
            values: values
        })
    })
    content.push({item: $.template.tableType(templateData)})
    utils.writeContent(utils.capitalize(typeName), content, using)
    // console.log(templateData)
})

//
// build base entities

const entityTables = $.db.sheets.filter(sh => {
    if (/^.+_type$/.test(sh.name)) return undefined
    if (/^.+@.+$/.test(sh.name)) return undefined
    return sh
})

entityTables.forEach(entityTable => {
    utils.makeSureDirExists(`./build/${entityTable.name}`)

    //
    // create interface for entity class
    const entityName = utils.capitalize(entityTable.name)
    const entityInferface = `I${entityName}`
    const directory = `${entityTable.name}/`
    const namespace = `gen.${entityTable.name}`

    utils.writeContent(entityInferface, {item: $.template.iEntity({name: entityName})},
        [], directory, namespace)

    //
    // actually create each entity by line definitions
    entityTable.lines.forEach(line => {
        const templateData = {}
        utils.templateAssignName(templateData, line)
        utils.templateAssignImplementation(templateData, entityInferface)
        utils.templateAssignCategory(templateData, line, entityTable.columns)

        utils.writeContent(
            templateData.name,
            {item: $.template.entity(templateData)},
            [], directory, namespace)
    })
})

console.log($.lookup.enums)