"use strict";

var util = require('util');

var marked = require('marked');
var moment = require('moment');
var nunjucks = require('nunjucks');


function nunjucksSetup(views) {
    var env = new nunjucks.Environment(
        new nunjucks.FileSystemLoader(views),
        {
            watch: true,
            autoescape: true,
        }
    );

    env.addFilter('date', function (value, format) {
        return (
            format == null
                ? moment(value).format()
                : moment(value).format(format)
        );
    });

    env.addExtension('MarkdownParser', (function () {
        var ext = {
            tags: ['markdown'],

            parse: function (parser, nodes, lexer) {
                var tok = parser.nextToken();
                var args = parser.parseSignature(null, true);
                parser.advanceAfterBlockEnd(tok.value);

                var body = parser.parseUntilBlocks('endmarkdown');
                parser.advanceAfterBlockEnd();

                return new nodes.CallExtension(ext, 'run', args, [body]);
            },

            run: function (context, body) {
                var md = marked(body());

                return new nunjucks.runtime.SafeString(md);
            },
        };

        return ext;
    })());

    env.addExtension('MetaTags', (function () {
        var ext = {
            tags: ['meta'],

            parse: function (parser, nodes, lexer) {
                var tok = parser.nextToken();
                var args = parser.parseSignature(null, true);
                parser.advanceAfterBlockEnd(tok.value);

                return new nodes.CallExtension(ext, 'run', args);
            },

            run: function (context, metaTags) {
                var res = '';

                if (metaTags != null) {
                    var metaKeys = Object.keys(metaTags);
                    metaKeys.sort();

                    metaKeys.forEach(function (name) {
                        var content = metaTags[name];
                        if (Array.isArray(content)) {
                            content = content.join(',');
                        }

                        res += util.format(
                            '<meta name="%s" content="%s">\n',
                            trim(escape(name)),
                            trim(escape(content))
                        );
                    });
                }

                return new nunjucks.runtime.SafeString(res);
            },
        };

        return ext;
    })());

    env.addExtension('Pagination', (function () {
        var ext = {
            tags: ['pagination'],

            parse: function (parser, nodes, lexer) {
                var tok = parser.nextToken();
                var args = parser.parseSignature(null, true);
                parser.advanceAfterBlockEnd(tok.value);

                var body = parser.parseUntilBlocks('current');
                parser.skipSymbol('current');
                parser.skip(lexer.TOKEN_BLOCK_END);

                var currentBody = parser.parseUntilBlocks('dotdot', 'endpagination');
                var dotdotBody = null;

                if (parser.skipSymbol('dotdot')) {
                    parser.skip(lexer.TOKEN_BLOCK_END);
                    dotdotBody = parser.parseUntilBlocks('endpagination');
                }

                parser.advanceAfterBlockEnd();

                return new nodes.CallExtension(ext, 'run', args, [body, currentBody, dotdotBody]);
            },

            run: function (context, pagination, nrAround, body, currentBody, dotdotBody) {
                var res = '';
                var start = pagination.current - nrAround;
                var end = pagination.current + nrAround;

                // TODO: Is there a nicer way of doing this?
                var pageNoBackup = context.ctx.pageNo;

                if (start < 1) {
                    end += 1 - start;
                    start = 1;
                }

                if (end > pagination.lastPage) {
                    start -= end - pagination.lastPage;
                    end = pagination.lastPage;
                }

                if (start < 1) {
                    start = 1;
                }

                if (dotdotBody && start > 1) {
                    res += dotdotBody();
                }

                for (var i = start; i <= end; i++) {
                    context.ctx.pageNo = i;

                    if (i === pagination.current) {
                        res += currentBody();
                    }
                    else {
                        res += body();
                    }
                }

                if (dotdotBody && end < pagination.lastPage) {
                    res += dotdotBody();
                }

                context.ctx.pageNo = pageNoBackup;

                return new nunjucks.runtime.SafeString(res);
            },
        };

        return ext;
    })());

    return env;
}

// TODO: Doesn't nunjucks have its own escape function?
function escape(str) {
    str = str
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;');

    return str;
}

function trim(str) {
    str = str
        .replace(/^\s+/, '')
        .replace(/\s+$/, '');

    return str;
}

exports = module.exports = nunjucksSetup;
