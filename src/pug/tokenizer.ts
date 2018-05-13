/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
import { Tokenizer as HTMLTokenizer } from "../html/tokenizer"

const pugLex = require("pug-lexer") //eslint-disable-line no-restricted-globals

/**
 *
 */
export class PugTokenizer extends HTMLTokenizer {
    private pugTokens: any
    private convertedPugTokens: any
    private pugPosition: number
    private lastToken: any

    /**
     * Initialize this tokenizer.
     * @param text The source code to tokenize.
     */
    constructor(text: string, code: string, lastToken: any) {
        super(code)

        this.pugPosition = 0
        this.lastToken = lastToken
        const initialRangeStart = lastToken.range[1]
        let rangeStart = lastToken.range[1]
        this.pugTokens = pugLex(text, { plugins: [{
            advance(lexer: any) {
                if (lexer.tokens.length) {
                    const lastProcessedToken = lexer.tokens[lexer.tokens.length - 1]
                    const rangeEnd = lexer.originalInput.length - lexer.input.length + initialRangeStart
                    lastProcessedToken.range = [rangeStart, rangeEnd]
                    rangeStart = rangeEnd
                }
            },
        }] })

        this.convertedPugTokens = this.convertPugTokensToHtmlTokens()
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
            // console.log(JSON.stringify(this.pugTokens, null, 2))
            const result = []
            for (const pt of this.pugTokens) {
                if (pt.type === "newline") {
                    result.push({
                        type: "HTMLWhitespace",
                        range: pt.range,
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
                else if (pt.type === "tag") {
                    result.push({
                        type: "HTMLTagOpen",
                        range: [
                            pt.range[0] - 1,
                            pt.range[1],
                        ],
                        loc: {
                            start: {
                                line: pt.loc.start.line,
                                column: pt.loc.start.column - 1,
                            },
                            end: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                        },
                        value: pt.val,
                    })
                    result.push({
                        type: "HTMLTagClose",
                        range: [pt.range[1], pt.range[1]],
                        loc: {
                            start: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                            end: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                        },
                        value: "",
                    })
                    result.push({
                        type: "HTMLEndTagOpen",
                        range: [pt.range[1], pt.range[1]],
                        loc: {
                            start: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                            end: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                        },
                        value: pt.val,
                    })
                    result.push({
                        type: "HTMLTagClose",
                        range: [pt.range[1], pt.range[1]],
                        loc: {
                            start: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                            end: {
                                line: pt.loc.end.line,
                                column: pt.loc.end.column - 1,
                            },
                        },
                        value: pt.val,
                    })
                }
                else if (pt.type === "start-attributes") {
                    // nothing
                }
                else if (pt.type === "start-attributes") {
                    // nothing
                }
                else if (pt.type === "eos") {
                    // nothing
                }
                else {
                    result.push(pt)
                }
                if (result.length > 0) {
                    this.lastToken = result[result.length - 1]
                }
            }
            return result
        }
        catch (e) {
            console.error(e)
        }
        return []
    }
}
