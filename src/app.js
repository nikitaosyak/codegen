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
    const enumData = utils.processEnum(
        cat.name, 
        'public', 
        cat.cases.map(c => c.name))

    utils.writeContent(
        'Enum',
        'Category',
        {
            modifier: enumData.modifier,
            name: 'Category',
            fields: enumData.fields
        }
    )

    utils.writeContent(
        'IEntity',
        `IEntity`, 
        { name: 'Entity', category: true }
    )

    utils.writeContent(
        'IHero',
        'IHero')
}


//
// build table custom types

//
// base types builds first
utils.getCustomTypeList(0, 0).forEach(custom => {
    const enumData = utils.processEnum(
            custom.name, 
            'public', 
            custom.cases.map(c=>c.name),
            'types')

    utils.writeContent(
        'Enum',
        enumData.fileName,
        enumData,
        [], 'types'
        )
})

utils.getCustomTypeList(1, 100).forEach(custom => {
    custom.cases.forEach(c => {
        if (c.name in $.lookup) return
        const ns = 'types.' + custom.name.toLowerCase()
        const typeData = utils.processType(
            c.name, 'public',
            c.args, ns
            )

        if (!typeData.template) return
        // console.log(typeData)
        utils.writeContent(
            typeData.template, c.name,
            typeData, typeData.using, ns)
    })
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
            // console.log(line)
            const templateData = {}
            utils.templateAssignName(templateData, entityName, line)
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
            utils.templateAssignFields(templateData, line, entityTable.columns, Object.keys(line).filter(k => ['id', 'category', 'children'].indexOf(k) < 0))

            utils.writeContent(
                'Entity',
                templateData.fileName,
                templateData,
                using,
                namespace
            )
        })
    })
}

// console.log(JSON.stringify($.lookup, null, 2))