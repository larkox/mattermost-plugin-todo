// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import marked from 'marked';

import * as TextFormatting from 'utils/text_formatting.jsx';
import {getScheme, isUrlSafe} from 'utils/url.jsx';

export default class Renderer extends marked.Renderer {
    constructor(options, formattingOptions = {}) {
        super(options);

        this.heading = this.heading.bind(this);
        this.paragraph = this.paragraph.bind(this);
        this.text = this.text.bind(this);

        this.formattingOptions = formattingOptions;
    }

    code(code, language) {
        let usedLanguage = language || '';
        usedLanguage = usedLanguage.toLowerCase();

        if (usedLanguage === 'tex' || usedLanguage === 'latex') {
            return `<div data-latex="${TextFormatting.escapeHtml(code)}"></div>`;
        }

        // treat html as xml to prevent injection attacks
        if (usedLanguage === 'html') {
            usedLanguage = 'xml';
        }

        let className = 'post-code';
        let codeClassName = 'hljs hljs-ln';
        className += ' post-code--wrap';
        codeClassName = 'hljs';

        // if we have to apply syntax highlighting AND highlighting of search terms, create two copies
        // of the code block, one with syntax highlighting applied and another with invisible text, but
        // search term highlighting and overlap them
        const content = code;

        return (
            '<div class="' + className + '">' +
                '<code class="' + codeClassName + '">' +
                    content +
                '</code>' +
            '</div>'
        );
    }

    codespan(text) {
        let output = text;

        if (this.formattingOptions.searchPatterns) {
            const tokens = new Map();
            output = TextFormatting.replaceTokens(output, tokens);
        }

        return (
            '<span class="codespan__pre-wrap">' +
                '<code>' +
                    output +
                '</code>' +
            '</span>'
        );
    }

    br() {
        if (this.formattingOptions.singleline) {
            return ' ';
        }

        return super.br();
    }

    heading(text, level) {
        return `<h${level} class="markdown__heading">${text}</h${level}>`;
    }

    link(href, title, text, isUrl) {
        let outHref = href;

        if (!href.startsWith('/')) {
            const scheme = getScheme(href);
            if (!scheme) {
                outHref = `http://${outHref}`;
            } else if (isUrl && this.formattingOptions.autolinkedUrlSchemes) {
                const isValidUrl = this.formattingOptions.autolinkedUrlSchemes.indexOf(scheme.toLowerCase()) !== -1;

                if (!isValidUrl) {
                    return text;
                }
            }
        }

        if (!isUrlSafe(unescapeHtmlEntities(href))) {
            return text;
        }

        let output = '<a class="theme markdown__link';

        if (this.formattingOptions.searchPatterns) {
            for (const pattern of this.formattingOptions.searchPatterns) {
                if (pattern.pattern.test(href)) {
                    output += ' search-highlight';
                    break;
                }
            }
        }

        output += '" href="' + outHref + '" rel="noreferrer"';

        // special case for team invite links, channel links, and permalinks that are inside the app
        let internalLink = false;
        const pattern = new RegExp('^(' + TextFormatting.escapeRegex(this.formattingOptions.siteURL) + ')?\\/(?:signup_user_complete|admin_console|[^\\/]+\\/(?:pl|channels|messages))\\/');
        internalLink = pattern.test(outHref);

        if (internalLink) {
            output += ' data-link="' + outHref.replace(this.formattingOptions.siteURL, '') + '"';
        } else {
            output += ' target="_blank"';
        }

        if (title) {
            output += ' title="' + title + '"';
        }

        // remove any links added to the text by hashtag or mention parsing since they'll break this link
        output += '>' + text.replace(/<\/?a[^>]*>/g, '') + '</a>';

        return output;
    }

    paragraph(text) {
        if (this.formattingOptions.singleline) {
            let result;
            if (text.includes('class="markdown-inline-img"')) {
                /*
                ** use a div tag instead of a p tag to allow other divs to be nested,
                ** which avoids errors of incorrect DOM nesting (<div> inside <p>)
                */
                result = `<div class="markdown__paragraph-inline">${text}</div>`;
            } else {
                result = `<p class="markdown__paragraph-inline">${text}</p>`;
            }
            return result;
        }

        return super.paragraph(text);
    }

    table(header, body) {
        return `<div class="table-responsive"><table class="markdown__table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
    }

    tablerow(content) {
        return `<tr>${content}</tr>`;
    }

    tablecell(content, flags) {
        return marked.Renderer.prototype.tablecell(content, flags).trim();
    }

    listitem(text, bullet) {
        const taskListReg = /^\[([ |xX])] /;
        const isTaskList = taskListReg.exec(text);

        if (isTaskList) {
            return `<li class="list-item--task-list">${'<input type="checkbox" disabled="disabled" ' + (isTaskList[1] === ' ' ? '' : 'checked="checked" ') + '/> '}${text.replace(taskListReg, '')}</li>`;
        }

        if ((/^\d+.$/).test(bullet)) {
            // this is a numbered list item so override the numbering
            return `<li value="${parseInt(bullet, 10)}">${text}</li>`;
        }

        return `<li>${text}</li>`;
    }

    text(txt) {
        return TextFormatting.doFormatText(txt, this.formattingOptions);
    }
}

// Marked helper functions that should probably just be exported

function unescapeHtmlEntities(html) {
    return html.replace(/&([#\w]+);/g, (_, m) => {
        const n = m.toLowerCase();
        if (n === 'colon') {
            return ':';
        } else if (n.charAt(0) === '#') {
            return n.charAt(1) === 'x' ?
                String.fromCharCode(parseInt(n.substring(2), 16)) :
                String.fromCharCode(Number(n.substring(1)));
        }
        return '';
    });
}
