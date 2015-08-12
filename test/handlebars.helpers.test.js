"use strict";
require('../src/handlebarsSetup');


var path = require('path');

var expect = require('chai').expect;
var Handlebars = require('handlebars');
var moment = require('moment');
var should = require('chai').should();


describe('Handlebar helpers', function () {
    it('the date helper should properly format dates', function() {
        var dateString = '1995-12-17T03:24:00+00:00';
        var date = new Date(dateString);
        var parsed;

        parsed = getParsed('{{date d}}', date);
        expect(parsed).to.equal(moment(date).format());

        parsed = getParsed('{{date d "YYYYMMDD"}}', date);
        expect(parsed).to.equal(moment(date).format('YYYYMMDD'));

        parsed = getParsed('{{date d}}', dateString);
        expect(parsed).to.equal(moment(dateString).format());

        parsed = getParsed('{{date d "YYYYMMDD"}}', dateString);
        expect(parsed).to.equal(moment(dateString).format('YYYYMMDD'));


        function getParsed(template) {
            var compiled = Handlebars.compile(template);
            return compiled({d: date});
        }
    });

    it('the yield helper should leave its input alone', function () {
        var template = Handlebars.compile('{{yield "<h1>{{foo}}</h1>"}}');
        var parsed = template({foo: 'bar'});

        expect(parsed).to.equal('<h1>{{foo}}</h1>');
    });

    it('the meta helper should print meta headers', function () {
        var template = Handlebars.compile('{{meta}}');
        var parsed = template({
            $meta: {
                metaTags: {
                    description: 'test',
                    author: 'test <test@test.com>',
                },
            }
        });

        var metaTags = [
            '<meta name="description" content="test">',
            '<meta name="author" content="test &lt;test@test.com&gt;">',
        ];

        expect(parsed).to.satisfy(function (val) {
            if (val === metaTags[0] + '\n' + metaTags[1] + '\n') {
                return true;
            }

            if (val === metaTags[1] + '\n' + metaTags[0] + '\n') {
                return true;
            }

            return false;
        });
    });

    it('the markdown helper should parse markdown', function () {
        var template = Handlebars.compile('<p>test</p>\n{{#markdown}}# Title{{/markdown}}');
        var parsed = template({});

        expect(parsed).to.equal('<p>test</p>\n<h1 id="title">Title</h1>\n');
    });

    it('the paginator helper should generate a paginator', function () {
        var template = Handlebars.compile(
            '<ul>{{#paginator p 2}}' +
                '{{#if dotdot}}' +
                    '<li>...</li>' +
                '{{else}}' +
                    '{{#if current}}' +
                        '<li>{{pageNo}}</li>' +
                    '{{else}}' +
                        '<li><a href="?pageNo={{pageNo}}">{{pageNo}}</a></li>' +
                    '{{/if}}' +
                '{{/if}}' +
            '{{/paginator}}</ul>'
        );
        var parsed = template({
            p: {
                current: 4,
                previous: 3,
                next: 5,
                lastPage: 12,
            },
        });

        expect(parsed).to.equal('<ul><li>...</li><li><a href="?pageNo=2">2</a></li><li><a href="?pageNo=3">3</a></li><li>4</li><li><a href="?pageNo=5">5</a></li><li><a href="?pageNo=6">6</a></li><li>...</li></ul>');

        parsed = template({
            p: {
                current: 1,
                previous: null,
                next: 2,
                lastPage: 12,
            },
        });

        expect(parsed).to.equal('<ul><li>1</li><li><a href="?pageNo=2">2</a></li><li><a href="?pageNo=3">3</a></li><li><a href="?pageNo=4">4</a></li><li><a href="?pageNo=5">5</a></li><li>...</li></ul>');

        parsed = template({
            p: {
                current: 10,
                previous: 9,
                next: 11,
                lastPage: 12,
            },
        });

        expect(parsed).to.equal('<ul><li>...</li><li><a href="?pageNo=8">8</a></li><li><a href="?pageNo=9">9</a></li><li>10</li><li><a href="?pageNo=11">11</a></li><li><a href="?pageNo=12">12</a></li></ul>');

        parsed = template({
            p: {
                current: 12,
                previous: 11,
                next: null,
                lastPage: 12,
            },
        });

        expect(parsed).to.equal('<ul><li>...</li><li><a href="?pageNo=8">8</a></li><li><a href="?pageNo=9">9</a></li><li><a href="?pageNo=10">10</a></li><li><a href="?pageNo=11">11</a></li><li>12</li></ul>');
    });
});
