/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
import * as path from "path"
import * as AST from "./ast"
import { LocationCalculator } from "./common/location-calculator"
import { HTMLParser, HTMLTokenizer } from "./html"
import { PugTokenizer } from "./pug/tokenizer"
import { parseScript, parseScriptElement } from "./script"
import * as services from "./parser-services"

const STARTS_WITH_LT = /^\s*</

/**
 * Check whether the code is a Vue.js component.
 * @param code The source code to check.
 * @param options The parser options.
 * @returns `true` if the source code is a Vue.js component.
 */
function isVueFile(code: string, options: any): boolean {
    const filePath = (options.filePath as string | undefined) || "unknown.js"
    return path.extname(filePath) === ".vue" || STARTS_WITH_LT.test(code)
}

/**
 * Check whether the node is a `<template>` element.
 * @param node The node to check.
 * @returns `true` if the node is a `<template>` element.
 */
function isTemplateElement(node: AST.VNode): node is AST.VElement {
    return node.type === "VElement" && node.name === "template"
}

/**
 * Check whether the node is a `<script>` element.
 * @param node The node to check.
 * @returns `true` if the node is a `<script>` element.
 */
function isScriptElement(node: AST.VNode): node is AST.VElement {
    return node.type === "VElement" && node.name === "script"
}

/**
 * Check whether the node is a raw text element.
 * @param node The node to check.
 * @returns `true` if the node is a raw text element.
 */
function isTextElement(node: AST.VNode): node is AST.VText {
    return node.type === "VText"
}

/**
 * Check whether the attribute node is a `lang` attribute.
 * @param attribute The attribute node to check.
 * @returns `true` if the attribute node is a `lang` attribute.
 */
function isLang(attribute: AST.VAttribute | AST.VDirective): attribute is AST.VAttribute {
    return attribute.directive === false && attribute.key.name === "lang"
}

/**
 * Parse the given source code.
 * @param code The source code to parse.
 * @param options The parser options.
 * @returns The parsing result.
 */
export function parseForESLint(code: string, options: any): AST.ESLintExtendedProgram {
    options = Object.assign({
        comment: true,
        ecmaVersion: 2015,
        loc: true,
        range: true,
        tokens: true,
    }, options || {})

    let result: AST.ESLintExtendedProgram
    if (!isVueFile(code, options)) {
        result = parseScript(code, options)
    }
    else {
        const tokenizer = new HTMLTokenizer(code)
        const rootAST = new HTMLParser(tokenizer, options).parse()
        const locationCalcurator = new LocationCalculator(tokenizer.gaps, tokenizer.lineTerminators)
        const script = rootAST.children.find(isScriptElement)
        const template = rootAST.children.find(isTemplateElement)
        const templateLangAttr = template && template.startTag.attributes.find(isLang)
        const templateLang = (templateLangAttr && templateLangAttr.value && templateLangAttr.value.value) || "html"
        const concreteInfo: AST.HasConcreteInfo = {
            tokens: rootAST.tokens,
            comments: rootAST.comments,
            errors: rootAST.errors,
        }

        result = (script != null)
            ? parseScriptElement(script, locationCalcurator, options)
            : parseScript("", options)

        result.ast.templateBody = undefined
        if (template != null) {
            if (templateLang === "html") {
                result.ast.templateBody = Object.assign(template, concreteInfo)
            }
            else if (templateLang === "pug") {
                const pugTextNode = template.children.find(isTextElement)
                const pugText = pugTextNode && pugTextNode.value
                if (pugText) {
                    let lastTemplateTagRelatedToken = null
                    let lastTemplateTagRelatedPosition = null
                    for (let i = 0; i < concreteInfo.tokens.length; i++) {
                        const token = concreteInfo.tokens[i]
                        if (token.type === "HTMLTagClose") {
                            lastTemplateTagRelatedToken = token
                            lastTemplateTagRelatedPosition = i
                            break
                        }
                    }
                    if (lastTemplateTagRelatedPosition !== null && lastTemplateTagRelatedToken !== null) {
                        const pugTokenizer = new PugTokenizer(pugText, code, lastTemplateTagRelatedToken)
                        const pugAST = new HTMLParser(pugTokenizer, options).parse()
                        let spliceArguments: Array<any> = [lastTemplateTagRelatedPosition + 1, concreteInfo.tokens.length - lastTemplateTagRelatedPosition - 1]
                        spliceArguments = spliceArguments.concat(pugAST.tokens)
                        Array.prototype.splice.apply(concreteInfo.tokens, spliceArguments)


                        concreteInfo.comments = concreteInfo.comments.concat(pugAST.comments)
                        concreteInfo.errors = concreteInfo.errors.concat(pugAST.errors)
                        if (pugAST) {
                            result.ast.templateBody = Object.assign(template, concreteInfo, { children: pugAST.children })
                        }
                    }
                }
            }
        }
    }

    result.services = Object.assign(result.services || {}, services.define(result.ast))

    return result
}

/**
 * Parse the given source code.
 * @param code The source code to parse.
 * @param options The parser options.
 * @returns The parsing result.
 */
export function parse(code: string, options: any): AST.ESLintProgram {
    return parseForESLint(code, options).ast
}

export { AST }
