const $ = require('./data')
const utils = require('./utils')

//
// actually building
//
utils.makeSureDirExists('./build')

//
// build global types
{
    const cat = $.db.customTypes.filter(ct => ct.name === 'Category')[0]
    utils.writeContent(
        'Enum',
        cat.name, 
        utils.processEnum(cat.name, 'public', cat.cases.map(c => c.name))
    )

    utils.writeContent(
        'IEntity',
        `IEntity`, 
        { name: 'Entity', category: true }
    )
}


//
// build table types
const tableTypes = $.db.sheets.filter(sh => /^.+_type$/.test(sh.name))
console.log(tableTypes)
tableTypes.forEach(tableType => {
    console.log(tableType)
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
{
    const entityTables = $.db.sheets.filter(sh => {
        if (/^.+_type$/.test(sh.name)) return undefined
        if (/^.+@.+$/.test(sh.name)) return undefined
        return sh
    })

    entityTables.forEach(entityTable => {
        utils.makeSureDirExists(`./build/${entityTable.name}`)

        const baseInterface = 'Entity'
        const entityName = utils.capitalize(entityTable.name)
        const entityInferface = `I${entityName}`
        const namespace = entityTable.name

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

        utils.writeContent(
            'IEntity',
            entityInferface,
            {
                name: entityName,
                extends: baseInterface,
                child: childInterface
            },
            [], 
            namespace
        )

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
                'Entity',
                templateData.name,
                templateData,
                using,
                namespace
            )
        })
    })
}