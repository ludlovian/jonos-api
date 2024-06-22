import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import Parsley from '@ludlovian/parsley'

import { parseElementTexts, parseElementVals } from '../src/parse-element.mjs'

suite('parse-element', { concurrency: false }, () => {
  suite('parseElementTexts', () => {
    let xml
    let exp
    let act
    test('extract texts', () => {
      xml = [
        '<foo>',
        '<bar>Bar</bar>',
        '<NotThis>',
        '<baz>Baz</baz>',
        '</NotThis>',
        '<OrThis />',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        baz: 'Baz'
      }
      act = parseElementTexts(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })

    test('extract texts with namespace', () => {
      xml = [
        '<foo>',
        '<x:bar>Bar</x:bar>',
        '<NotThis>',
        '<y:baz>Baz</y:baz>',
        '</NotThis>',
        '<OrThis />',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        baz: 'Baz'
      }
      act = parseElementTexts(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })

    test('extract multiple texts', () => {
      xml = [
        '<foo>',
        '<bar>Bar</bar>',
        '<NotThis>',
        '<baz>Baz</baz>',
        '</NotThis>',
        '<OrThis />',
        '<baz>Boz</baz>',
        '<baz>Buzz</baz>',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        baz: ['Baz', 'Boz', 'Buzz']
      }
      act = parseElementTexts(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })
  })
  suite('parseElementVals', () => {
    let xml
    let exp
    let act
    test('extract vals', () => {
      xml = [
        '<foo>',
        '<bar val="Bar" />',
        '<NotThis>',
        '<baz val="Baz" />',
        '</NotThis>',
        '<OrThis />',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        baz: 'Baz'
      }
      act = parseElementVals(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })

    test('extract vals with NS', () => {
      xml = [
        '<foo>',
        '<bar val="Bar" />',
        '<NotThis>',
        '<z:baz val="Baz" />',
        '</NotThis>',
        '<OrThis />',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        baz: 'Baz'
      }
      act = parseElementVals(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })

    test('extract multiple vals', () => {
      xml = [
        '<foo>',
        '<bar val="Bar" />',
        '<NotThis>',
        '<baz val="Baz" />',
        '<baz val="Boz" />',
        '<baz val="Buzz" />',
        '</NotThis>',
        '<OrThis />',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        baz: ['Baz', 'Boz', 'Buzz']
      }
      act = parseElementVals(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })

    test('extract val with channel', () => {
      xml = [
        '<foo>',
        '<bar val="Bar" channel="Foo" />',
        '<NotThis>',
        '<baz val="Baz" />',
        '</NotThis>',
        '<OrThis />',
        '</foo>'
      ].join('')
      exp = {
        bar: 'Bar',
        'bar:Foo': 'Bar',
        baz: 'Baz'
      }
      act = parseElementVals(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })
  })
})
