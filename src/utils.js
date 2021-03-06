const fs = require('fs')
const $ = require('./data')
const ejs = require('ejs')

const typeStrEnumIdx = /^\d+/
const typeStrTypeDef = /[^(\d+:?)].*/

const self = {

    //
    // fs utils
    makeSureDirExists: (v) => {
        if (fs.existsSync(v)) return
        //fs.mkdirSync(v)
        require('mkdirp').sync(v)
    },
    writeContent: (template, className, content, using = [], namespace = null) => {

        // get rid of using duplicates
        const actualUsing = []
        using.forEach(u => {
            if (actualUsing.indexOf(u) > -1) return
            actualUsing.push(u)
        })

        // write file on given path
        const renderData = {
            using: actualUsing,
            name: namespace ? `gen.${namespace}` : 'gen', 
            typePath: template,
            typeData: content
        }
        // console.log(renderData)

        const subPath = namespace ? namespace.split('.').join('/') + '/' : ''
        self.makeSureDirExists(`${process.env.BUILD_DIR}/${subPath}`)
        ejs.renderFile(`templates/Namespace.ejs`, renderData, undefined, (err, str) => {
            if (err) {
                console.log(renderData.typeData)
                throw err
            }
            fs.writeFileSync(
                `${process.env.BUILD_DIR}/${subPath}${className}.cs`, 
                str.replace(/\t/g, '    ')
            )
        })
    },

    //
    // minor utils
    decapitalize: str => str.charAt(0).toLowerCase() + str.slice(1),
    capitalize: str => str.charAt(0).toUpperCase() + str.slice(1),
    typeToInt: typeStr => Number.parseInt(typeStr.match(typeStrEnumIdx)),
    typeDefFromTypeStr: typeStr => typeStr.match(typeStrTypeDef, ''),
    longToRgbStr: longColor => {
        const r = (longColor >> 16) & 0xff
        const g = (longColor >> 8) & 0xff
        const b = longColor & 0xff
        return [r, g, b].join(', ')
    },

    //
    // building utils
    getCustomTypeList: (minArgs, maxArgs) => {
        return $.db.customTypes
            .filter(ct => ct.name !== 'Category')
            .filter(ct => {
                const args = ct.cases.map(c=>c.args)
                    .reduce((acc, current) => acc + current.length, 0)
                return args >= minArgs && args <= maxArgs
            })
    },

    processEnum: (name, modifier, members, ns = null) => {
        const capName = self.capitalize(name)
        $.lookup[capName] = {
            type: 'enum',
            ns: ns ? `gen.${ns}` : 'gen',
            fields: members
        }

        return {
            fileName: `${name}Enum`,
            modifier: modifier,
            name: `${name}Enum`,
            fields: members
        }
    },

    processType: (name, idx, modifier, members, ns = null) => {
        $.lookup[name] = {
            ns: ns ? `gen.${ns}` : 'gen',
            fields: members
        }

        //console.log('--', name)
        switch (name) {
            case 'IntRange':
            case 'FloatRange':
                $.lookup[name].type = 'range'
                const numeric = name.replace('Range', '')
                return [{
                    fileName: name,
                    template: 'sub/Range',
                    modifier: 'public',
                    numericCap: numeric,
                    numeric: numeric.toLowerCase()
                }]
            case 'Raw':
            case 'RawNegation':
            case 'NumericMin':
            case 'NumericMax':
            case 'Enumeric':
            case 'EnumericNegation':
                const lookup = $.lookup[name]
                lookup.type = 'restriction'
                lookup.variations = ['']

                let className = ''
                let template = ''
                let sign = ''
                let using = ['gen.statistic']
                switch(name) {
                    case 'Raw': 
                        className = `RestrictStat`;
                        template = 'Raw'
                        break;
                    case 'RawNegation': 
                        className = `RestrictStatNegation`;
                        template = 'Raw'
                        sign = '!'
                        break;
                    case 'NumericMin': 
                        className = `RestrictStatMin`;
                        template = 'Quantified'
                        lookup.variations = ['float']
                        sign = '>='
                        break;
                    case 'NumericMax': 
                        className = `RestrictStatMax`;
                        template = 'Quantified'
                        lookup.variations = ['float']
                        sign = '>='
                        break;
                    case 'Enumeric':
                        className = `RestrictEnum`;
                        lookup.variations = Object.entries($.lookup).filter(e => {
                            return e[1].type === 'enum'
                        }).map(f => f[0]).filter(f => f !== 'Category')
                        template = 'Enum'
                        sign = '=='
                        using.push('gen.types')
                        break;
                    case 'EnumericNegation': 
                        className = `RestrictEnumNegation`;
                        lookup.variations = Object.entries($.lookup).filter(e => {
                            return e[1].type === 'enum'
                        }).map(f => f[0]).filter(f => f !== 'Category')
                        template = 'Enum'
                        sign = '!='
                        using.push('gen.types')
                        break;
                }
                // console.log(name, className, lookup.variations)
                lookup.className = className

                const restrictions = []
                lookup.variations.forEach(variation => {
                    const fName = lookup.variations.length > 1 ? 
                        `${className}${variation}` : `${className}`
                    restrictions.push({
                        fileName: fName,
                        name: fName,
                        template: `restriction/Restriction${template}`,
                        sign: sign,
                        tvalue: template === 'Enum' ? `${variation}Enum` : variation,
                        tstat: variation,
                        using: using
                    })
                })
                // variations.forEach((TValue, i) => {
                //             restrictions.push({
                //                 fileName: variationsClassNames[i],
                //                 name: variationsClassNames[i],
                //                 template: `restriction/Restriction${templateName}`,
                //                 sign: sign,
                //                 tvalue: `${TValue}Enum`,
                //                 tstat: TValue
                //             })
                //         })
                // $.db.sheets.forEach(sh => {
                //     const lines = sh.lines.filter(l => 'restrictions' in l)
                //     if (lines.length === 0) return
                //     lines.forEach(l => l.restrictions.forEach(rsTable => {
                //         if (rsTable.values[0] !== idx) return
                //         // console.log(l.restrictions)
                        
                //         l.restrictions.forEach(r => {
                //             let sign = ''
                //             let variations = ['___']
                //             let variationsClassNames = [className]
                //             let templateName = name
                //             switch(name) {
                //                 case 'RawNegation':
                //                     templateName = 'Raw' 
                //                     sign = '!'; 
                //                     break;
                //                 case 'NumericMin':
                //                     templateName = 'Quantified'
                //                     variations = ['int']
                //                     sign = '>='; 
                //                     break;
                //                 case 'NumericMax': 
                //                     templateName = 'Quantified'
                //                     variations = ['int']
                //                     sign = '<='; 
                //                     break;
                //                 case 'Enumeric':
                //                     templateName = 'Enum'
                //                     variations = l.restrictions.map(r => self.capitalize(r.values[1]))
                //                     variationsClassNames = variations.map(v => `${className}${v}`)
                //                     sign = '=='; 
                //                     break;
                //                 case 'EnumericNegation': 
                //                     templateName = 'Enum'
                //                     variations = l.restrictions.map(r => self.capitalize(r.values[1]))
                //                     variationsClassNames = variations.map(v => `${className}${v}`)
                //                     sign = '!='; 
                //                     break;
                //             }

                //             // console.log(name, r)
                //         })
                        

                        
                    // }))
                // })
                return restrictions
                break
        }
        return []
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
                const enumElement = $.lookup[enumName].fields[lineValue]
                return `${enumName}.${enumElement}`
            case 6: return 'Unknown type ' + columnType
            case 7: return 'Unknown type ' + columnType
            case 8: return 'Unknown type ' + columnType
            case 9:
                const customType = self.typeDefFromTypeStr(column.typeStr)[0]
                // console.log('cstmtype', customType, lineValue)
                if (customType in $.lookup && $.lookup[customType].type === 'enum') {
                    const enumElement = $.lookup[customType].fields[lineValue[0]]
                    return `${customType}.${enumElement}`
                } else {
                    const complexType = $.db.customTypes.filter(ct => ct.name === customType)[0]
                    const typeVariation = complexType.cases[lineValue[0]]

                    if (typeVariation.name in $.lookup) {
                        return typeVariation.name
                    }
                    // console.log('VARIATIONS', complexType, typeVariation)
                }
            case 10: return 'Unknown type ' + columnType
            case 11:
                return `new Color(${self.longToRgbStr(lineValue)})`
        }
    },

    columnByLineId: (lineId, columns) => {
        return columns.filter(c => c.name === lineId)[0]
    },

    templateAssignName: (template, entityName, line) => {
        const result = {
            name: `${self.capitalize(line.id)}`,
            fileName: `${self.capitalize(line.id)}`
        }
        Object.assign(template, result)
    },

    templateAssignImplementation: (template, implementation) => {
        const result = {entityType: implementation}
        Object.assign(template, result)
    },

    templateAssignCategory: (template, line, columns) => {
        const column = self.columnByLineId('category', columns)
        const customType = self.typeDefFromTypeStr(column.typeStr)[0]
        if (customType in $.lookup && $.lookup[customType].type === 'enum') {
            const enumElement = $.lookup[customType].fields[line.category[0]]
            Object.assign(template, {category: `${customType}.${enumElement}`})
        }
    },

    templateAssignChildList: (template, childrenList, childInterface) => {
        // if (childrenList.length === 0) return
        Object.assign(template, {
            children: childrenList,
            childInterface: childInterface
        })
    },

    templateAssignFields: (template, line, columns, fieldKeys, using) => {
        if (fieldKeys.length === 0) return

        const fields = []
        const restrictions = []
        fieldKeys.map(fk => {
            const column = self.columnByLineId(fk, columns)
            const intType = self.typeToInt(column.typeStr)
            switch(intType) {
                case 4:
                    fields.push({
                        type: 'int', 
                        name: self.capitalize(column.name),
                        value: Number.parseInt(line[fk]),
                        assign: 'constant',
                    })
                break
                case 8:
                    if (column.name !== 'restrictions') break
                    using.push('gen.types.restrictions')
                    line[fk].forEach(lineValue => {
                        const v = lineValue.values
                        const complexType = $.db.customTypes.filter(ct => ct.name === 'Restrictions')[0]
                        const complexTypeCase = complexType.cases[v[0]]
                        const ctClassName = $.lookup[complexTypeCase.name].className
                        const statT = self.capitalize(v[1])

                        switch(v[0]) {
                            case 0: //Raw
                            case 1: //RawNegation
                                restrictions.push(`new ${ctClassName}<${statT}>()`)
                                using.push('gen.statistic')
                            break
                            case 2: //StatMin
                            case 3: //StatMax
                                restrictions.push(`new ${ctClassName}<${statT}>(${v[2]})`)
                                using.push('gen.statistic')
                            break
                            case 4: //Enum
                            case 5: //EnumNegation
                                // console.log(v, ctClassName)
                                restrictions.push(`new ${ctClassName}${statT}(${statT}Enum.${v[2]})`)
                                using.push('gen.statistic')
                                using.push('gen.types')
                            break

                        }
                    })
                break
                case 9:
                    const customType = self.typeDefFromTypeStr(column.typeStr)[0]
                    const complexType = $.db.customTypes.filter(ct => ct.name === customType)[0]
                    const complexTypeCase = complexType.cases[Number.parseInt(line[fk][0])]
                    const name = complexTypeCase.name
                    if (name in $.lookup) {
                        using.push($.lookup[name].ns)
                        if ($.lookup[name].type === 'enum') {
                            fields.push({
                                type: `${name}Enum`,
                                name: 'Value',
                                assign: 'simple'
                            })
                        } else if ($.lookup[name].type === 'range') {
                            const rangeType = name.indexOf('Int') > -1 ? 'int' : 'float'
                            fields.push({
                                type: rangeType,
                                lowerName: 'value',
                                upperName: 'Value',
                                assign: 'constrained',
                                constrain: {
                                    type: name,
                                    args: line[fk].splice(1)
                                        .map(a => `${a}${rangeType === 'float' ? 'f' : ''}`)
                                }
                            })
                        }
                    }
            }
        })

        Object.assign(template, {
            fields: fields,
            restrictions: restrictions.length > 0 ? restrictions : undefined
        })
    }
}

module.exports = self
