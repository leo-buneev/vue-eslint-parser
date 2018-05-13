/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

/* eslint-disable class-methods-use-this, no-empty-function */
import { Tokenizer as HTMLTokenizer } from "../html/tokenizer"
import { ParseError, Token } from "../ast"

const pugLex = require("pug-lexer") //eslint-disable-line no-restricted-globals

/**
 *
 */
export class PugTokenizer extends HTMLTokenizer {
    private pugTokens: any
    private convertedPugTokens: Token[]
    private pugPosition: number
    private lastToken: any
    private lastOpenedTag: any

    /**
     * Initialize this tokenizer.
     * @param text The source code to tokenize.
     */
    constructor(text: string, code: string, lastToken: any) {
        super(code)

        this.lastOpenedTag = null
        this.pugPosition = 0
        this.lastToken = lastToken
        let sourcePosition = lastToken.range[1]
        // const initialRangeStart = lastToken.range[1]
        // const rangeStart = lastToken.range[1]
        try {
            pugLex.Lexer.prototype.incrementLine = function(increment: any) {
                this.lineno += increment
                sourcePosition += increment
                if (increment) {
                    this.colno = 0
                }
            }
            pugLex.Lexer.prototype.incrementColumn = function(increment: any) {
                sourcePosition += increment
                this.colno += increment
            }
            pugLex.Lexer.prototype.tok = function(type: any, val: any) {
                const res = {
                    type,
                    loc: {
                        start: {
                            line: this.lineno,
                            column: this.colno,
                        },
                        filename: this.filename,
                    },
                    range: [sourcePosition],
                    val: undefined,
                }

                if (val !== undefined) {
                    res.val = val
                }

                return res
            }
            pugLex.Lexer.prototype.tokEnd = function(tok: any) {
                tok.loc.end = {
                    line: this.lineno,
                    column: this.colno,
                }
                tok.range.push(sourcePosition)
                return tok
            }

            this.pugTokens = pugLex(text, { startingLine: lastToken.loc.end.line, startingColumn: lastToken.loc.end.column })
                // plugins: [{
                //     advance(lexer: any) {
                //         console.log("LTL: ", lexer.tokens.length)
                //         if (lexer.tokens.length) {
                //             const lastProcessedToken = lexer.tokens[lexer.tokens.length - 1]
                //             const rangeEnd = lexer.originalInput.length - lexer.input.length + initialRangeStart
                //             lastProcessedToken.range = [rangeStart, rangeEnd]
                //             rangeStart = rangeEnd
                //         }
                //     },
                // }]

            this.convertedPugTokens = []
            this.convertPugTokensToHtmlTokens()
        }
        catch (e) {
            this.errors.push(new ParseError(e.msg, e.code, sourcePosition, e.line, e.column))
            this.convertedPugTokens = []
        }
    }


    /**
     * Get the next token.
     * @returns The next token or null.
     */
    public nextToken(): any {
        if (this.convertedPugTokens.length > this.pugPosition) {
            const result = this.convertedPugTokens[this.pugPosition]
            this.pugPosition++
            return result
        }
        return null
    }

    /**
     * Get the next token.
     * @returns The next token or null.
     */
    private convertPugTokensToHtmlTokens(): any {
        try {
            console.log(JSON.stringify(this.pugTokens, null, 2))
            for (const pt of this.pugTokens) {
                (this as any)[pt.type](pt)
                if (this.convertedPugTokens.length > 0) {
                    this.lastToken = this.convertedPugTokens[this.convertedPugTokens.length - 1]
                }
            }
        }
        catch (e) {
            console.error(e)
        }
    }

    /** */
    protected indent() : any {
    }
    /** */
    protected outdent() : any {
    }

    /** */
    protected newline(pt: any) : any {
        this.closeLastOpenedTag()
        this.convertedPugTokens.push({
            type: "HTMLWhitespace",
            range: [
                pt.range[0] - 1,
                pt.range[1],
            ],
            loc: {
                start: this.lastToken.loc.end,
                end: {
                    line: pt.loc.end.line,
                    column: pt.loc.end.column - 1,
                },
            },
            value: "\n",
        })
    }

    /** */
    protected tag(pt: any) : any {
        this.closeLastOpenedTag()
        this.convertedPugTokens.push({
            type: "HTMLTagOpen",
            range: [
                pt.range[0] - 1,
                pt.range[1],
            ],
            loc: pt.loc,
            value: pt.val,
        })
        this.lastOpenedTag = pt
    }
    /** */
    protected closeLastOpenedTag() : any {
        if (!this.lastOpenedTag) {
            return
        }
        const pt = this.lastOpenedTag
        this.convertedPugTokens.push({
            type: "HTMLTagClose",
            range: [pt.range[1], pt.range[1]],
            loc: {
                start: pt.loc.end,
                end: pt.loc.end,
            },
            value: "",
        })
        this.convertedPugTokens.push({
            type: "HTMLEndTagOpen",
            range: [pt.range[1], pt.range[1]],
            loc: {
                start: pt.loc.end,
                end: pt.loc.end,
            },
            value: pt.val,
        })
        this.convertedPugTokens.push({
            type: "HTMLTagClose",
            range: [pt.range[1], pt.range[1]],
            loc: {
                start: pt.loc.end,
                end: pt.loc.end,
            },
            value: pt.val,
        })
        this.lastOpenedTag = null
    }
    /** */
    protected "start-attributes"() : any {

    }
    /** */
    protected "end-attributes"() : any {
        this.closeLastOpenedTag()
    }
    /** */
    protected attribute(pt: any) : any {
        this.convertedPugTokens.push({
            type: "HTMLIdentifier",
            range: pt.range,
            loc: pt.loc,
            value: pt.name,
        })
    }
    /** */
    protected eos() : any {
        this.closeLastOpenedTag()
    }
}
/* eslint-enable class-methods-use-this, no-empty-function */
