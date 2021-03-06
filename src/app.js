require('dotenv').config()

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
        { name: 'Entity', category: true, restrict: true }
    )

    utils.writeContent(
        'IHero',
        'IHero')

    utils.writeContent(
        'restriction/IRestriction',
        'IRestriction',
        {}, [], 'types.restrictions')

    utils.writeContent(
        'restriction/RestrictionSolver',
        'RestrictionSolver',
        {}, [], 'types.restrictions')
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
    custom.cases.forEach((c, i) => {
        if (c.name in $.lookup) return
        const ns = 'types.' + custom.name.toLowerCase()
        const typeData = utils.processType(
            c.name, i, 'public',
            c.args, ns
            )

        typeData.forEach(td => {
            utils.writeContent(
                td.template, td.fileName,
                td, td.using, ns)    
        })
        
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
        utils.makeSureDirExists(`${process.env.BUILD_DIR}/${entityTable.name}`)

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

        const childInterface = childLookup.length === 0 ? baseInterface :
            childLookup.length > 1 ? baseInterface :
                utils.capitalize(childLookup[0].link)

        const childImports = childLookup.length === 1 ? [childLookup[0].using] : []
        // console.log(entityInferface, childInterface, childImports)
        utils.writeContent(
            'IEntity',
            entityInferface,
            {
                name: entityName,
                extends: baseInterface,
                child: childInterface
            },
            childImports,
            namespace
        )
        // console.log('---------?')

        //
        // actually create each entity by line definitions
        entityTable.lines.forEach(line => {
            // console.log(line)
            const templateData = {}
            utils.templateAssignName(templateData, entityName, line)
            utils.templateAssignImplementation(templateData, entityInferface)
            utils.templateAssignCategory(templateData, line, entityTable.columns)

            let using = [].concat(childImports)
            const childrenList = []
            line.children && line.children.forEach(ch => {
                Object.keys(ch).forEach(k => {
                    // using.push(childLookup.filter(l => l.link === k).map(l => l.using)[0])
                    using = using.concat(childLookup.map(cl => cl.using))
                    childrenList.push(utils.capitalize(ch[k]))
                })
            })
            utils.templateAssignChildList(templateData, childrenList, childInterface)
            utils.templateAssignFields(
                templateData, 
                line, entityTable.columns, 
                Object.keys(line).filter(k => ['id', 'category', 'children'].indexOf(k) < 0),
                using)

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
