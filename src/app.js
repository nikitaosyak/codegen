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

    const resolveValueByColumnType = (column, lineKey, lineValue) => {
        const columnType = utils.typeToInt(column.typeStr)
        switch (columnType) {
            case 0: break
            case 1:
                return `"${lineValue}"`
            case 2: break
            case 3: break
            case 4: break
            case 5:
                const enumName = utils.capitalize(lineKey)
                const enumElement = $.lookup.enums[enumName][lineValue]
                return `${enumName}.${enumElement}`
            case 6: break
            case 7: break
            case 8: break
            case 9: break
            case 10: break
            case 11:
                return `new Color(${utils.longToRgbStr(lineValue)})`
        }
    }

    tableType.lines.forEach((line, i) => {
        const values = []
        tableType.columns.forEach(column => {
            values.push(resolveValueByColumnType(column, column.name, line[column.name]))
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
// build activities
const activities = $.db.sheets.filter(sh => sh.name === "activity")[0]

utils.makeSureDirExists('./build/activity')

activities.lines.forEach(line => {
    const templateData = {
        name: utils.capitalize(line.id),
        categoryType: 'Category',
        categoryValue: $.lookup.enums['Category'][line.category[0]]
    }

    utils.writeContent(utils.capitalize(line.id), {item: $.template.activity(templateData)},
        [], 'activity/', 'gen.activity')
})


console.log($.lookup.enums)