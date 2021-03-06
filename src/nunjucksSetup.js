'use strict'

const marked = require('marked')
const moment = require('moment')
const nunjucks = require('nunjucks')


function nunjucksSetup(views) {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(views, {
      watch: true,
    }),
    {
      autoescape: true,
    }
  )

  env.addFilter('date', (value, format) => format == null
    ? moment(value).format()
    : moment(value).format(format)
  )

  env.addExtension('MarkdownParser', (() => {
    const ext = {
      tags: [ 'markdown' ],

      parse(parser, nodes, lexer) {
        const tok = parser.nextToken()
        const args = parser.parseSignature(null, true)
        parser.advanceAfterBlockEnd(tok.value)

        const body = parser.parseUntilBlocks('endmarkdown')
        parser.advanceAfterBlockEnd()

        return new nodes.CallExtension(ext, 'run', args, [ body ])
      },

      run(context, body) {
        const md = marked(body())

        return new nunjucks.runtime.SafeString(md)
      },
    }

    return ext
  })())

  env.addExtension('MetaTags', (() => {
    const ext = {
      tags: [ 'meta' ],

      parse(parser, nodes, lexer) {
        const tok = parser.nextToken()
        const args = parser.parseSignature(null, true)
        parser.advanceAfterBlockEnd(tok.value)

        return new nodes.CallExtension(ext, 'run', args)
      },

      run(context, metaTags) {
        let res = ''

        if (metaTags != null) {
          const metaKeys = Object.keys(metaTags)
          metaKeys.sort()

          for (const name of metaKeys) {
            let content = metaTags[name]
            if (Array.isArray(content)) {
              content = content.join(',')
            }

            res += trimAndEscape`<meta name="${name}" content="${content}">\n`
          }
        }

        return new nunjucks.runtime.SafeString(res)
      },
    }

    return ext
  })())

  env.addExtension('Pagination', (() => {
    const ext = {
      tags: [ 'pagination' ],

      parse(parser, nodes, lexer) {
        const tok = parser.nextToken()
        const args = parser.parseSignature(null, true)
        parser.advanceAfterBlockEnd(tok.value)

        const body = parser.parseUntilBlocks('current')
        parser.skipSymbol('current')
        parser.skip(lexer.TOKEN_BLOCK_END)

        const currentBody = parser.parseUntilBlocks('dotdot', 'endpagination')
        let dotdotBody = null

        if (parser.skipSymbol('dotdot')) {
          parser.skip(lexer.TOKEN_BLOCK_END)
          dotdotBody = parser.parseUntilBlocks('endpagination')
        }

        parser.advanceAfterBlockEnd()

        return new nodes.CallExtension(ext, 'run', args, [ body, currentBody, dotdotBody ])
      },

      run(context, pagination, nrAround, body, currentBody, dotdotBody) {
        let res = ''
        let start = pagination.current - nrAround
        let end = pagination.current + nrAround

        // TODO: Is there a nicer way of doing this?
        const pageNoBackup = context.ctx.pageNo

        if (start < 1) {
          end += 1 - start
          start = 1
        }

        if (end > pagination.lastPage) {
          start -= end - pagination.lastPage
          end = pagination.lastPage
        }

        if (start < 1) {
          start = 1
        }

        if (dotdotBody && start > 1) {
          res += dotdotBody()
        }

        for (let i = start; i <= end; i++) {
          context.ctx.pageNo = i

          if (i === pagination.current) {
            res += currentBody()
          }
          else {
            res += body()
          }
        }

        if (dotdotBody && end < pagination.lastPage) {
          res += dotdotBody()
        }

        context.ctx.pageNo = pageNoBackup

        return new nunjucks.runtime.SafeString(res)
      },
    }

    return ext
  })())

  return env
}

// TODO: Doesn't nunjucks have its own escape function?
function escape(str) {
  str = str
    .replace('&', '&amp;')
    .replace('<', '&lt;')
    .replace('>', '&gt;')
    .replace('"', '&quot;')

  return str
}

function trim(str) {
  str = str
    .replace(/^\s+/, '')
    .replace(/\s+$/, '')

  return str
}

function trimAndEscape(strings, ...values) {
  let result = strings[0]
  const valuesL = values.length

  for (let i = 0; i < valuesL; i += 1) {
    const value = values[i]
    const string = strings[i + 1]

    result += escape(trim(value)) + string
  }

  return result
}

exports = module.exports = nunjucksSetup
