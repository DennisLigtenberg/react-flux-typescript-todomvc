/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * TodoStore
 *
 * Typescript port by Bernd Paradies, May 2015
 * @see https://github.com/facebook/flux/blob/master/examples/flux-todomvc/js/stores/TodoStore.js
 *
 */

///<reference path='../../../typings/eventemitter3/eventemitter3.d.ts'/>
///<reference path='../../../typings/todomvc/todomvc.d.ts'/>
///<reference path='../../../typings/object-assign/object-assign.d.ts'/>
///<reference path='../../../typings/store/store.d.ts'/>

import AppDispatcher = require('../dispatcher/AppDispatcher');
import TodoActionID = require('../actions/TodoActionID');
import assign = require('object-assign');
import EventEmitter = require('eventemitter3');
import store = require('store');

var CHANGE_EVENT = 'change';

type TodoMap = MapStringTo<TodoData>;

var keyPrefix = "TodoItem-";

function loadFromStore(): TodoMap
{
  var map: TodoMap = {};
  store.forEach(function(key: string, val: TodoData) {
    if( typeof(key) == 'string' && key.indexOf(keyPrefix) == 0 ) {
      map[key.substring(keyPrefix.length)] = val;
    }
  });
  return map;
}

var _todos: TodoMap = loadFromStore();

interface TodoUpdateData {
  id?: string;
  complete?: boolean;
  text?: string;
}

/**
 * Create a TODO item.
 * @param  {string} text The content of the TODO
 */
function create(text:string): void {
  // Hand waving here -- not showing how this interacts with XHR or persistent
  // server-side storage.
  // Using the current timestamp + random number in place of a real id.
  var id: string = (+new Date() + Math.floor(Math.random() * 999999)).toString(36);
  _todos[id] = {
    id: id,
    complete: false,
    text: text
  };
  store.set(keyPrefix + id, _todos[id]);
}

/**
 * Update a TODO item.
 * @param  {string} id
 * @param {object} updates An object literal containing only the data to be
 *     updated.
 */
function update(id: string, updates: TodoUpdateData): void {
  _todos[id] = assign<TodoData,TodoUpdateData>({}, _todos[id], updates);
  store.set(keyPrefix + id, _todos[id]);
}

/**
 * Update all of the TODO items with the same object.
 *     the data to be updated.	Used to mark all TODOs as completed.
 * @param  {object} updates An object literal containing only the data to be
 *     updated.

 */
function updateAll(updates:TodoUpdateData): void {
  var id: string;
  for (id in _todos) {
    if(_todos.hasOwnProperty(id)) {
      update(id, updates);
    }
  }
}

/**
 * Delete a TODO item.
 * @param  {string} id
 */
function destroy(id: string): void {
  delete _todos[id];
  store.remove(keyPrefix + id);
}

/**
 * Delete all the completed TODO items.
 */
function destroyCompleted(): void {
  var id: string;
  for (id in _todos) {
    if (_todos[id].complete) {
      destroy(id);
    }
  }
}

class TodoStoreStatic extends EventEmitter {

  /**
   * Tests whether all the remaining TODO items are marked as completed.
   * @return {boolean}
   */
  public areAllComplete(): boolean {
    var id: string;

    for(id in _todos) {
      if(!_todos[id].complete) {
	       return false;
      }
    }
    return true;
  }

  /**
   * Get the entire collection of TODOs.
   * @return {object}
   */
  public getAll(): TodoMap {
    return _todos;
  }

  public emitChange(): void {
    this.emit(CHANGE_EVENT);
  }

  /**
   * @param {function} callback
   */
  public addChangeListener(callback: () => void): void {
    this.on(CHANGE_EVENT, callback);
  }

  /**
   * @param {function} callback
   */
  public removeChangeListener(callback: () => void) {
    this.removeListener(CHANGE_EVENT, callback);
  }
}

var TodoStore: TodoStoreStatic =  new TodoStoreStatic();

// Register callback to handle all updates
AppDispatcher.register( function(action:TodoAction): void {
  var text: string;

  switch(action.actionType) {
    case TodoActionID.TODO_CREATE:
      text = action.text.trim();
      if (text !== '') {
	     create(text);
      }
      TodoStore.emitChange();
      break;

    case TodoActionID.TODO_TOGGLE_COMPLETE_ALL:
      if (TodoStore.areAllComplete()) {
	     updateAll({complete: false});
      } else {
	     updateAll({complete: true});
      }
      TodoStore.emitChange();
      break;

    case TodoActionID.TODO_UNDO_COMPLETE:
      update(action.id, {complete: false});
      TodoStore.emitChange();
      break;

    case TodoActionID.TODO_COMPLETE:
      update(action.id, {complete: true});
      TodoStore.emitChange();
      break;

    case TodoActionID.TODO_UPDATE_TEXT:
      text = action.text.trim();
      if (text !== '') {
	     update(action.id, {text: text});
      }
      TodoStore.emitChange();
      break;

    case TodoActionID.TODO_DESTROY:
      destroy(action.id);
      TodoStore.emitChange();
      break;

    case TodoActionID.TODO_DESTROY_COMPLETED:
      destroyCompleted();
      TodoStore.emitChange();
      break;

    // default:
      // no op
  }
});

export = TodoStore;
