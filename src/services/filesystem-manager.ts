import config from '../config'
import { Inject, Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { FSWatcher } from 'fs-extra';
import * as chokidar from 'chokidar';
import { FsBrowserService } from './fs-browser.service'
const EventEmitter = require('events').EventEmitter;
const readLastLines = require('read-last-lines');
import * as fsExtra from 'fs-extra';

/** Directory means the active working directory, folder means any subdirectory item within our working directory */
export class FilesystemManager extends EventEmitter {

  constructor() {
    super();
  }

  private watcher: chokidar.FSWatcher;

  async watchFile(targetFile) {
    try {
      this.watcher = chokidar.watch(targetFile, this.localDefaultOptions);
      await this.useDefaultEvents();
      this.emit('watchFile', this.responsePackage("watchFile"));
    } catch (error) {
      console.log(error);
    }
  }

  bleat() {
    console.log("Bleat: " + JSON.stringify(this.watcher.getWatched()))
  }

  async watchFolder(targetFolder, options?) {
    try {
      this.watcher = await chokidar.watch(targetFolder, this.localDefaultOptions);
      await this.useDefaultEvents();
      this.emit('watchFolder', this.responsePackage(targetFolder));
    } catch (error) {
      console.log(error);
    }
  }

  private responsePackage(event: string): any {
    return { msg: event, fs: this.watcher.getWatched() }
  }

  private defaultLocalEvents = {
    add: (path, stats): any => {
      console.log("Chokidar emitting addFile: " + path + "\nFull map: " + JSON.stringify(this.watcher.getWatched()) + "\nStats: " + JSON.stringify(stats))
      this.emit('addFile', path, stats);
    },
    addDir: (path, stats): any => {
      console.log("Chokidar emitting addFolder: " + path + "\nFull map: " + JSON.stringify(this.watcher.getWatched()) + "\nStats: " + JSON.stringify(stats))
      this.emit('addFolder', path, stats);
    },
    ready: (): any => {
      this.emit('ready', this.responsePackage("ready"));
    },
    change: (path, stats): any => {
      console.log("Chokidar emitting change: " + path + "\nFull map: " + JSON.stringify(this.watcher.getWatched()) + "\nStats: " + JSON.stringify(stats))
      this.emit('change', path, stats);
    },
    unlink: (path): any => {
      this.emit('unlink', console.log("Chokidar emitting unlink: " + path + "\nFull map: " + JSON.stringify(this.watcher.getWatched())));
    },
    unlinkDir: (path): any => {
      this.emit('unlinkDir', console.log("Chokidar emitting unlinkDir: " + path + "\nFull map: " + JSON.stringify(this.watcher.getWatched())));
    },
    error: (error): any => { console.log("WE HIT AN ERROR"), this.emit('error', { msg: error }); },
    all: (path): any => { this.emit('all', console.log("all here, gettin' pinged!: " + path)) },
  };

  onError(func: (error) => Promise<any>) { this.watcher.on('error', func); }
  onAdd(func: (path: string, stats) => Promise<any>) { this.watcher.on("add", func); }
  onAddDir(func: (path: string, stats) => Promise<any>) { this.watcher.on("addDir", func); }
  onChange(func: (path: string, stats) => Promise<any>) { this.watcher.on("change", func); }
  onReady(func: () => Promise<any>) { this.watcher.on("ready", func); }
  onUnlink(func: (path: string) => Promise<any>) { this.watcher.on("unlink", func); }
  onUnlinkDir(func: (path: string) => Promise<any>) { this.watcher.on("unlinkDir", func); }

  async useDefaultEvents() {
    this.onAdd(this.defaultLocalEvents.add);
    this.onAddDir(this.defaultLocalEvents.addDir);
    this.onReady(this.defaultLocalEvents.ready);
    this.onChange(this.defaultLocalEvents.change);
    this.onUnlink(this.defaultLocalEvents.unlink);
    this.onUnlinkDir(this.defaultLocalEvents.unlinkDir);
    this.onError(this.defaultLocalEvents.error);
  }

  /** Adds a file to be tracked */
  async add(path: string | string[]) {
    await this.watcher.add(path);
  }
  close() {
    return this.watcher.close();
  }
  async unwatch(path: string | string[]): Promise<any> {
    return this.watcher.unwatch(path);
  }

  private localDefaultOptions = {
    persistent: true, //makes watcher do more than presumably just validating urls

    ignored: /(^|[\/\\])\../, //regex to ignore files with dots in front of them
    ignoreInitial: false, //we're built around false | FALSE makes add and addDir events ping when it's loading a folder for the first time
    followSymlinks: true, //don't set this to false
    cwd: '.', //working directory for when you load a dir into watcher, . keeps the paths obfuscated
    disableGlobbing: false, //this makes it string-only, learn about globbing

    usePolling: true, //high demand, needed for network drives that don't send OS events to remotes
    interval: 100, //millisecond polling rate for checking most files
    binaryInterval: 300, //ms polling rate for checking binary files
    alwaysStat: false, //always return stat object to avoid errors in code that depends on stat presence
    depth: 20, //subdirectory traversal
    awaitWriteFinish: { //hold up on firing add and change events while writing until writing is finished
      stabilityThreshold: 1000, //how long to wait after the last change to a file before it's considered "done"
      pollInterval: 100 //how often to ping a file for write progress
    },

    ignorePermissionErrors: false, //what it says on the box - don't ignore errors kids
    atomic: true //for editor file jank, or use a custom 'atomicity delay', in milliseconds (default 100)
  }
}


//   // Read content of new file
//   var fileContent = await fsExtra.readFile(path);

//   // emit an event when new file has been added
//   this.emit('file-added', {
//     message: fileContent.toString()
//   });

//   // remove file error.log
//   await fsExtra.unlink(path);
//   console.log(
//     `[${new Date().toLocaleString()}] ${path} has been removed.`
