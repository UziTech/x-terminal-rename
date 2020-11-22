/** @babel */
/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Copyright 2017-2018 Andres Mejia <amejia004@gmail.com>. All Rights Reserved.
 * Copyright (c) 2020 UziTech All Rights Reserved.
 * Copyright (c) 2020 bus-stop All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { configDefaults } from '../src/config'
import { XTerminalModel, isXTerminalModel, currentItemIsXTerminalModel } from '../src/model'
import { XTerminalProfilesSingleton } from '../src/profiles'

import fs from 'fs-extra'
import path from 'path'

import temp from 'temp'

temp.track()

describe('XTerminalModel', () => {
	let model, pane, element, tmpdir

	beforeEach(async () => {
		const uri = 'x-terminal://somesessionid/'
		spyOn(XTerminalProfilesSingleton.instance, 'generateNewUri').and.returnValue(uri)
		const terminalsSet = new Set()
		model = new XTerminalModel({
			uri: uri,
			terminals_set: terminalsSet,
		})
		await model.initializedPromise
		pane = jasmine.createSpyObj('pane',
			['destroyItem', 'getActiveItem'])
		element = jasmine.createSpyObj('element',
			['destroy', 'refitTerminal', 'focusOnTerminal', 'clickOnCurrentAnchor', 'getCurrentAnchorHref', 'restartPtyProcess', 'clear'])
		element.terminal = jasmine.createSpyObj('terminal',
			['getSelection'])
		element.ptyProcess = jasmine.createSpyObj('ptyProcess',
			['write'])
		tmpdir = await temp.mkdir()
	})

	afterEach(async () => {
		await temp.cleanup()
	})

	it('constructor with previous active item that has no getPath() method', async () => {
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue({})
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(configDefaults.cwd)
	})

	it('constructor with valid cwd passed in uri', async () => {
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue({})
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData({})
		url.searchParams.set('cwd', tmpdir)
		const model = new XTerminalModel({
			uri: url.href,
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(tmpdir)
	})

	it('use projectCwd with valid cwd passed in uri', async () => {
		const expected = await temp.mkdir('projectCwd')
		spyOn(atom.project, 'getPaths').and.returnValue([expected])
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue({})
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData({})
		url.searchParams.set('projectCwd', true)
		url.searchParams.set('cwd', tmpdir)
		const model = new XTerminalModel({
			uri: url.href,
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(expected)
	})

	it('constructor with invalid cwd passed in uri', async () => {
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue({})
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData({})
		url.searchParams.set('cwd', path.join(tmpdir, 'non-existent-dir'))
		const model = new XTerminalModel({
			uri: url.href,
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(configDefaults.cwd)
	})

	it('constructor with previous active item that has getPath() method', async () => {
		const previousActiveItem = jasmine.createSpyObj('somemodel', ['getPath'])
		previousActiveItem.getPath.and.returnValue(tmpdir)
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue(previousActiveItem)
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(tmpdir)
	})

	it('constructor with previous active item that has getPath() method returns file path', async () => {
		const previousActiveItem = jasmine.createSpyObj('somemodel', ['getPath'])
		const filePath = path.join(tmpdir, 'somefile')
		await fs.writeFile(filePath, '')
		previousActiveItem.getPath.and.returnValue(filePath)
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue(previousActiveItem)
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(tmpdir)
	})

	it('constructor with previous active item that has getPath() returning invalid path', async () => {
		const previousActiveItem = jasmine.createSpyObj('somemodel', ['getPath'])
		previousActiveItem.getPath.and.returnValue(path.join(tmpdir, 'non-existent-dir'))
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue(previousActiveItem)
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(configDefaults.cwd)
	})

	it('constructor with previous active item which exists in project path', async () => {
		const previousActiveItem = jasmine.createSpyObj('somemodel', ['getPath'])
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue(previousActiveItem)
		const expected = ['/some/dir', null]
		spyOn(atom.project, 'relativizePath').and.returnValue(expected)
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.getPath()).toBe(expected[0])
	})

	it('constructor with custom title', async () => {
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/?title=foo',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		expect(model.title).toBe('foo')
	})

	it('serialize() no cwd set', async () => {
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData(model.profile)
		const expected = {
			deserializer: 'XTerminalModel',
			version: '2017-09-17',
			uri: url.href,
		}
		expect(model.serialize()).toEqual(expected)
	})

	it('serialize() cwd set in model', async () => {
		const model = new XTerminalModel({
			uri: 'x-terminal://somesessionid/',
			terminals_set: new Set(),
		})
		await model.initializedPromise
		model.profile.cwd = '/some/dir'
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData(model.profile)
		const expected = {
			deserializer: 'XTerminalModel',
			version: '2017-09-17',
			uri: url.href,
		}
		expect(model.serialize()).toEqual(expected)
	})

	it('serialize() cwd set in uri', async () => {
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData({})
		url.searchParams.set('cwd', tmpdir)
		const model = new XTerminalModel({
			uri: url.href,
			terminals_set: new Set(),
		})
		await model.initializedPromise
		const url2 = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData(model.profile)
		const expected = {
			deserializer: 'XTerminalModel',
			version: '2017-09-17',
			uri: url2.href,
		}
		expect(url2.searchParams.get('cwd')).toEqual(tmpdir)
		expect(model.serialize()).toEqual(expected)
	})

	it('destroy() check element is destroyed when set', () => {
		model.element = element
		model.destroy()
		expect(model.element.destroy).toHaveBeenCalled()
	})

	it('destroy() check model removed from terminals_set', () => {
		spyOn(model.terminals_set, 'delete').and.callThrough()
		model.destroy()
		expect(model.terminals_set.delete.calls.allArgs()).toEqual([[model]])
	})

	it('getTitle() with default title', () => {
		expect(model.getTitle()).toBe('X Terminal')
	})

	it('getTitle() with new title', () => {
		const expected = 'some new title'
		model.title = expected
		expect(model.getTitle()).toBe(expected)
	})

	it('getTitle() when active', () => {
		spyOn(model, 'isActiveTerminal').and.returnValue(true)
		expect(model.getTitle()).toBe('* X Terminal')
	})

	it('getElement()', () => {
		const expected = { somekey: 'somevalue' }
		model.element = expected
		expect(model.getElement()).toBe(expected)
	})

	it('getURI()', async () => {
		const uri = 'x-terminal://somesessionid/'
		const terminalsSet = new Set()
		const model = new XTerminalModel({
			uri: uri,
			terminals_set: terminalsSet,
		})
		await model.initializedPromise
		expect(model.getURI()).toBe(uri)
	})

	it('getLongTitle() with default title', () => {
		expect(model.getLongTitle()).toBe('X Terminal')
	})

	it('getLongTitle() with new title', () => {
		const expected = 'X Terminal (some new title)'
		model.title = 'some new title'
		expect(model.getLongTitle()).toBe(expected)
	})

	it('onDidChangeTitle()', () => {
		let callbackCalled = false
		const disposable = model.onDidChangeTitle(() => {
			callbackCalled = true
		})
		model.emitter.emit('did-change-title')
		expect(callbackCalled).toBe(true)
		disposable.dispose()
	})

	it('getIconName()', () => {
		expect(model.getIconName()).toBe('terminal')
	})

	it('isModified()', () => {
		expect(model.isModified()).toBe(false)
	})

	it('isModified() modified attribute set to true', () => {
		model.modified = true
		expect(model.isModified()).toBe(true)
	})

	it('getPath()', () => {
		expect(model.getPath()).toBe(configDefaults.cwd)
	})

	it('getPath() cwd set', () => {
		const expected = '/some/dir'
		model.profile.cwd = expected
		expect(model.getPath()).toBe(expected)
	})

	it('onDidChangeModified()', () => {
		let callbackCalled = false
		const disposable = model.onDidChangeModified(() => {
			callbackCalled = true
		})
		model.emitter.emit('did-change-modified')
		expect(callbackCalled).toBe(true)
		disposable.dispose()
	})

	it('handleNewDataArrival() current item is active item', () => {
		pane.getActiveItem.and.returnValue(model)
		model.pane = pane
		model.handleNewDataArrival()
		expect(model.modified).toBe(false)
	})

	it('handleNewDataArrival() current item is not active item', () => {
		pane.getActiveItem.and.returnValue({})
		model.pane = pane
		model.handleNewDataArrival()
		expect(model.modified).toBe(true)
	})

	it('handleNewDataArrival() current item is not in any pane', () => {
		model.pane = null
		model.handleNewDataArrival()
		expect(model.modified).toBe(true)
	})

	it('handleNewDataArrival() model initially has no pane set', () => {
		pane.getActiveItem.and.returnValue({})
		spyOn(atom.workspace, 'paneForItem').and.returnValue(pane)
		model.handleNewDataArrival()
		expect(atom.workspace.paneForItem).toHaveBeenCalled()
	})

	it('handleNewDataArrival() modified value of false not changed', () => {
		pane.getActiveItem.and.returnValue(model)
		model.pane = pane
		spyOn(model.emitter, 'emit')
		model.handleNewDataArrival()
		expect(model.emitter.emit).toHaveBeenCalledTimes(0)
	})

	it('handleNewDataArrival() modified value of true not changed', () => {
		pane.getActiveItem.and.returnValue({})
		model.pane = pane
		model.modified = true
		spyOn(model.emitter, 'emit')
		model.handleNewDataArrival()
		expect(model.emitter.emit).toHaveBeenCalledTimes(0)
	})

	it('handleNewDataArrival() modified value changed', () => {
		pane.getActiveItem.and.returnValue({})
		model.pane = pane
		spyOn(model.emitter, 'emit')
		model.handleNewDataArrival()
		expect(model.emitter.emit).toHaveBeenCalled()
	})

	it('getSessionId()', async () => {
		const expected = 'somesessionid'
		const uri = 'x-terminal://' + expected + '/'
		const terminalsSet = new Set()
		const model = new XTerminalModel({
			uri: uri,
			terminals_set: terminalsSet,
		})
		await model.initializedPromise
		expect(model.getSessionId()).toBe(expected)
	})

	it('getSessionParameters() when no parameters set', async () => {
		const uri = 'x-terminal://somesessionid/'
		const terminalsSet = new Set()
		const model = new XTerminalModel({
			uri: uri,
			terminals_set: terminalsSet,
		})
		await model.initializedPromise
		const url = XTerminalProfilesSingleton.instance.generateNewUrlFromProfileData(model.profile)
		url.searchParams.sort()
		expect(model.getSessionParameters()).toBe(url.searchParams.toString())
	})

	it('refitTerminal() without element set', () => {
		// Should just work.
		model.refitTerminal()
	})

	it('refitTerminal() with element set', () => {
		model.element = element
		model.refitTerminal()
		expect(model.element.refitTerminal).toHaveBeenCalled()
	})

	it('focusOnTerminal()', () => {
		model.element = element
		model.focusOnTerminal()
		expect(model.element.focusOnTerminal).toHaveBeenCalled()
	})

	it('focusOnTerminal() reset modified value old modified value was false', () => {
		model.element = element
		model.focusOnTerminal()
		expect(model.modified).toBe(false)
	})

	it('focusOnTerminal() reset modified value old modified value was true', () => {
		model.element = element
		model.modified = true
		model.focusOnTerminal()
		expect(model.modified).toBe(false)
	})

	it('focusOnTerminal() no event emitted old modified value was false', () => {
		model.element = element
		spyOn(model.emitter, 'emit')
		model.focusOnTerminal()
		expect(model.emitter.emit).toHaveBeenCalledTimes(0)
	})

	it('focusOnTerminal() event emitted old modified value was true', () => {
		model.element = element
		model.modified = true
		spyOn(model.emitter, 'emit')
		model.focusOnTerminal()
		expect(model.emitter.emit).toHaveBeenCalled()
	})

	it('exit()', () => {
		model.pane = pane
		model.exit()
		expect(model.pane.destroyItem.calls.allArgs()).toEqual([[model, true]])
	})

	it('restartPtyProcess() no element set', () => {
		model.restartPtyProcess()
		expect(element.restartPtyProcess).not.toHaveBeenCalled()
	})

	it('restartPtyProcess() element set', () => {
		model.element = element
		model.restartPtyProcess()
		expect(model.element.restartPtyProcess).toHaveBeenCalled()
	})

	it('copyFromTerminal()', () => {
		model.element = element
		model.copyFromTerminal()
		expect(model.element.terminal.getSelection).toHaveBeenCalled()
	})

	it('runCommand(cmd)', () => {
		model.element = element
		const expectedText = 'some text'
		model.runCommand(expectedText)
		expect(model.element.ptyProcess.write.calls.allArgs()).toEqual([[expectedText + (process.platform === 'win32' ? '\r' : '\n')]])
	})

	it('pasteToTerminal(text)', () => {
		model.element = element
		const expectedText = 'some text'
		model.pasteToTerminal(expectedText)
		expect(model.element.ptyProcess.write.calls.allArgs()).toEqual([[expectedText]])
	})

	it('clear()', () => {
		model.element = element
		model.clear()
		expect(model.element.clear).toHaveBeenCalled()
	})

	it('setActive()', async function () {
		const pane = atom.workspace.getCenter().getActivePane()
		const uri = 'x-terminal://somesessionid/'
		const terminalsSet = new Set()
		const model1 = new XTerminalModel({
			uri: uri,
			terminals_set: terminalsSet,
		})
		await model1.initializedPromise
		pane.addItem(model1)
		model1.setNewPane(pane)
		const model2 = new XTerminalModel({
			uri: uri,
			terminals_set: terminalsSet,
		})
		await model2.initializedPromise
		pane.addItem(model2)
		model2.setNewPane(pane)
		expect(model1.activeIndex).toBe(0)
		expect(model2.activeIndex).toBe(1)
		model2.setActive()
		expect(model1.activeIndex).toBe(1)
		expect(model2.activeIndex).toBe(0)
	})

	describe('setNewPane', () => {
		it('(mock)', async () => {
			const expected = { getContainer: () => ({ getLocation: () => {} }) }
			model.setNewPane(expected)
			expect(model.pane).toBe(expected)
			expect(model.dock).toBe(null)
		})

		it('(center)', async () => {
			const pane = atom.workspace.getCenter().getActivePane()
			model.setNewPane(pane)
			expect(model.pane).toBe(pane)
			expect(model.dock).toBe(null)
		})

		it('(left)', async () => {
			const dock = atom.workspace.getLeftDock()
			const pane = dock.getActivePane()
			model.setNewPane(pane)
			expect(model.pane).toBe(pane)
			expect(model.dock).toBe(dock)
		})

		it('(right)', async () => {
			const dock = atom.workspace.getRightDock()
			const pane = dock.getActivePane()
			model.setNewPane(pane)
			expect(model.pane).toBe(pane)
			expect(model.dock).toBe(dock)
		})

		it('(bottom)', async () => {
			const dock = atom.workspace.getBottomDock()
			const pane = dock.getActivePane()
			model.setNewPane(pane)
			expect(model.pane).toBe(pane)
			expect(model.dock).toBe(dock)
		})
	})

	it('isVisible() in pane', () => {
		const pane = atom.workspace.getCenter().getActivePane()
		model.setNewPane(pane)
		expect(model.isVisible()).toBe(false)
		pane.setActiveItem(model)
		expect(model.isVisible()).toBe(true)
	})

	it('isVisible() in dock', () => {
		const dock = atom.workspace.getBottomDock()
		const pane = dock.getActivePane()
		model.setNewPane(pane)
		pane.setActiveItem(model)
		expect(model.isVisible()).toBe(false)
		dock.show()
		expect(model.isVisible()).toBe(true)
	})

	it('isActiveTerminal() visible and active', () => {
		model.activeIndex = 0
		spyOn(model, 'isVisible').and.returnValue(true)
		expect(model.isActiveTerminal()).toBe(true)
	})

	it('isActiveTerminal() visible and not active', () => {
		model.activeIndex = 1
		spyOn(model, 'isVisible').and.returnValue(true)
		expect(model.isActiveTerminal()).toBe(false)
	})

	it('isActiveTerminal() invisible and active', () => {
		model.activeIndex = 0
		spyOn(model, 'isVisible').and.returnValue(false)
		expect(model.isActiveTerminal()).toBe(false)
	})

	it('isActiveTerminal() allowHiddenToStayActive', () => {
		atom.config.set('x-terminal.terminalSettings.allowHiddenToStayActive', true)
		model.activeIndex = 0
		spyOn(model, 'isVisible').and.returnValue(false)
		expect(model.isActiveTerminal()).toBe(true)
	})

	it('toggleProfileMenu()', () => {
		model.element = jasmine.createSpyObj('element', ['toggleProfileMenu'])
		model.toggleProfileMenu()
		expect(model.element.toggleProfileMenu).toHaveBeenCalled()
	})

	it('getProfile()', () => {
		const mock = jasmine.createSpy('mock')
		model.profile = mock
		expect(model.getProfile()).toBe(mock)
	})

	it('applyProfileChanges() element queueNewProfileChanges() called', () => {
		model.element = jasmine.createSpyObj('element', ['queueNewProfileChanges'])
		model.applyProfileChanges({})
		expect(model.element.queueNewProfileChanges).toHaveBeenCalled()
	})

	it('applyProfileChanges() profileChanges = {}', () => {
		model.element = jasmine.createSpyObj('element', ['queueNewProfileChanges'])
		const expected = model.profilesSingleton.deepClone(model.profile)
		model.applyProfileChanges({})
		expect(model.profile).toEqual(expected)
	})

	it('applyProfileChanges() profileChanges = {fontSize: 24}', () => {
		model.element = jasmine.createSpyObj('element', ['queueNewProfileChanges'])
		const expected = model.profilesSingleton.deepClone(model.profile)
		expected.fontSize = 24
		model.applyProfileChanges({ fontSize: 24 })
		expect(model.profile).toEqual(expected)
	})
})

describe('XTerminalModel utilities', () => {
	it('isXTerminalModel() item is not XTerminalModel', () => {
		const item = document.createElement('div')
		expect(isXTerminalModel(item)).toBe(false)
	})

	it('isXTerminalModel() item is XTerminalModel', () => {
		const item = new XTerminalModel({
			uri: 'x-terminal://',
			terminals_set: new Set(),
		})
		expect(isXTerminalModel(item)).toBe(true)
	})

	it('currentItemIsXTerminalModel() item is not XTerminalModel', () => {
		const item = document.createElement('div')
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue(item)
		expect(currentItemIsXTerminalModel()).toBe(false)
	})

	it('currentItemIsXTerminalModel() item is XTerminalModel', () => {
		const item = new XTerminalModel({
			uri: 'x-terminal://',
			terminals_set: new Set(),
		})
		spyOn(atom.workspace, 'getActivePaneItem').and.returnValue(item)
		expect(currentItemIsXTerminalModel()).toBe(true)
	})
})
