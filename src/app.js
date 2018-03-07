const $ = require('./data')
const utils = require('./utils')

//
// actually building
//
utils.makeSureDirExists('./build')

//
// build global enums if any
const globalEnums = $.db.customTypes.filter(ct => {
    const zeroArgsCases = ct.cases.filter(member => member.args.length === 0)
    return ct.cases.length === zeroArgsCases.length
})

globalEnums.forEach(gEnum => {
    console.log(gEnum.name)
    const result = utils.processEnum(gEnum.name, '', gEnum.cases.map(m => m.name))
    utils.writeContent(gEnum.name, {item: result})
})

return

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
        content.push({item: utils.processEnum(en.name, 'public', en.typeStr.match(/[^(\d+:?)].*/)[0].split(','))})
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

// entity base interface
const baseInterface = 'Entity'
utils.writeContent(`I${baseInterface}`, {item: $.template.iEntity({ name: baseInterface, category: true })})

// find entity tables
const entityTables = $.db.sheets.filter(sh => {
    if (/^.+_type$/.test(sh.name)) return undefined
    if (/^.+@.+$/.test(sh.name)) return undefined
    return sh
})

entityTables.forEach(entityTable => {
    utils.makeSureDirExists(`./build/${entityTable.name}`)

    const entityName = utils.capitalize(entityTable.name)
    const entityInferface = `I${entityName}`
    const directory = `${entityTable.name}/`
    const namespace = `gen.${entityTable.name}`

    const childLookup = []
    const entityChildren = $.db.sheets.filter(_ =>
        new RegExp(`^${entityTable.name}@children$`).test(_.name)
    )
    if (entityChildren.length === 1) {
        entityChildren[0].columns.forEach(column => {
            const tableLink = column.typeStr.replace(/^\d+:?/, '')
            childLookup.push({link: tableLink, using: `gen.${tableLink}`})
        })
    } else if (entityChildren.length > 1) {
        throw `Impossible children count of ${entityChildren.length} found in entity ${entityName}`
    }

    const childInterface = childLookup.length === 0 ? undefined :
        childLookup.length > 1 ? baseInterface :
            utils.capitalize(childLookup[0].link)

    utils.writeContent(entityInferface, {item:
            $.template.iEntity({
                name: entityName,
                extends: baseInterface,
                childInterface: childInterface
            })},
        [], directory, namespace)

    //
    // actually create each entity by line definitions
    entityTable.lines.forEach(line => {
        const templateData = {}
        utils.templateAssignName(templateData, line)
        utils.templateAssignImplementation(templateData, entityInferface)
        utils.templateAssignCategory(templateData, line, entityTable.columns)

        const using = line.children ? ['System.Collections.Generic'] : []
        const childrenList = []
        line.children && line.children.forEach(ch => {
            Object.keys(ch).forEach(k => {
                using.push(childLookup.filter(l => l.link === k).map(l => l.using)[0])
                childrenList.push(utils.capitalize(ch[k]))
            })
        })
        utils.templateAssignChildList(templateData, childrenList, childInterface)

        utils.writeContent(
            templateData.name,
            {item: $.template.entity(templateData)},
            using, directory, namespace)
    })
})

console.log($.lookup.enums)