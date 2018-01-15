const fs = require('fs')
const $ = require('./data')

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
    typeToInt: (typeStr) => Number.parseInt(typeStr.match(/^\d+/)),
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
    }
}

module.exports = self