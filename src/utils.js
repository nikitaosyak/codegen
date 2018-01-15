const fs = require('fs')
const $ = require('./data')

const typeStrEnumIdx = /^\d+/
const typeStrTypeDef = /[^(\d+:?)].*/

const self = {

    //
    // fs utils
    makeSureDirExists: (v) => {
        if (fs.existsSync(v)) return
        fs.mkdirSync(v)
    },
    writeContent: (className, content, using = [], subPath = '', namespace = 'gen') => {
        const filePath = `./build/${subPath}${className}.cs`
        const nsData = {name: namespace, content: content, using: using}
        fs.writeFileSync(filePath, $.template.namespace(nsData))
    },

    //
    // minor utils
    capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
    typeToInt: (typeStr) => Number.parseInt(typeStr.match(typeStrEnumIdx)),
    typeDefFromTypeStr: (typeStr) => typeStr.match(typeStrTypeDef, ''),
    longToRgbStr: (longColor) => {
        const r = (longColor >> 16) & 0xff
        const g = (longColor >> 8) & 0xff
        const b = longColor & 0xff
        return [r, g, b].join(', ')
    },

    //
    // building utils
    processEnum: (name, members) => {
        const capName = self.capitalize(name)
        $.lookup.enums[capName] = members

        return $.template.enum({
            name: capName,
            fields: members.map((m, i) => {
                if (i === m.length) return {name: m}
                return {name: m, delimiter: true}
            })
        })
    },

    lineValueByColumnType: (column, lineKey, lineValue) => {
        const columnType = self.typeToInt(column.typeStr)
        switch (columnType) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                return `"${lineValue}"`
            case 5:
                const enumName = self.capitalize(lineKey)
                const enumElement = $.lookup.enums[enumName][lineValue]
                return `${enumName}.${enumElement}`
            case 6: return 'Unknown type ' + columnType
            case 7: return 'Unknown type ' + columnType
            case 8: return 'Unknown type ' + columnType
            case 9:
                const customType = self.typeDefFromTypeStr(column.typeStr)
                if (customType in $.lookup.enums) {
                    const enumElement = $.lookup.enums[customType][lineValue[0]]
                    return `${customType}.${enumElement}`
                } else {
                    return 'Unknown custom type ' + columnType
                }
            case 10: return 'Unknown type ' + columnType
            case 11:
                return `new Color(${self.longToRgbStr(lineValue)})`
        }
    },

    columnByLineId: (lineId, columns) => {
        return columns.filter(c => c.name === lineId)[0]
    },

    templateAssignName: (template, line) => {
        const result = {name: self.capitalize(line.id)}
        Object.assign(template, result)
    },

    templateAssignCategory: (template, line, columns) => {
        const result = {
            category: self.lineValueByColumnType(
                self.columnByLineId('category', columns), 'category', line.category
            )
        }
        Object.assign(template, result)
    }
}

module.exports = self