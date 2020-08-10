import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { Dock } from 'electron';
import { FilesystemManager } from './filesystem-manager';
import * as chokidar from 'chokidar';
import { DatePipe } from '@angular/common';
const EventEmitter = require('events').EventEmitter;
const pretty = require("prettysize");

@Injectable({
  providedIn: 'root',
})
export class FsBrowserService {

  private settings = {
    maxBrowserLimit: 5,

  };

  private initialized = false;
  private localBrowsers: any[] = [];

  private watcher = new FilesystemManager();

  constructor(private ngZone: NgZone) { }

  public async watch(path: string) {
    let brs = this.getLocalBrowser(this.makeBrowser());
    brs = await brs.initialize(path);
    return brs;
  }

  private makeBrowser() {
    return (this.localBrowsers.push(new this.FsBrowser(this.ngZone))) - 1;
  }

  private async addFolder(path) {
    // Utterly ridiculous, if people want to navigate a view they'll send the instruction to the browser
    // this can only be used for adding files for watching
    await this.watcher.add(path)
  }
  private addFile(path) {

  }

  private createLocalManager() {

  }

  public bleat() {
    for (let browser of this.localBrowsers) {
      browser.bleat();
    }
  }

  // private initialize(path) {
  //   this.watcher
  //     .on("ready", (resPkg) => {
  //       let dirMap = resPkg.fs;
  //       let folderNames = Object.keys(dirMap);
  //       let folderContents = Object.values(dirMap);
  //       this.setAllWatched(resPkg.fs);
  //       this.setDriveLetter(folderNames[0]);
  //       this.setAllDirs(folderNames);
  //       this.setAllDirsContents(folderContents);
  //       this.loadLocalBrowser(resPkg.fs);
  //     })
  //     .on("addFolder", (path) => {
  //       if (!this.initialized) { return false; }
  //       // What must be done here is to determine whether incoming additions should be patched in
  //       // to current browsers, or if they should make a new one entirely
  //     })
  //   this.watcher.watchFolder(path);
  //   let lb = this.createLocalBrowser(path);
  //   if (!this.initialized) {
  //     this.initialized = true;
  //   }
  //   return lb;
  // }

  public setMaxBrowsers(maxBrowsers: number) {
    this.settings.maxBrowserLimit = Math.max(0, maxBrowsers);
  }

  // private loadLocalBrowser(map, index?) {
  //   this.localBrowsers[!!index ? index : 0].watch(map);
  // }

  public getLocalBrowser(index: number) {
    return this.localBrowsers[index];
  }

  private FsBrowser = class extends EventEmitter {

    private watcher = new FilesystemManager();

    private localView = new BehaviorSubject<any>({
      dirMap: new BehaviorSubject<object>({}),
      highestDir: new BehaviorSubject<string>(""),
      currentViewDir: new BehaviorSubject<string>(``),
      currentViewDirContents: new BehaviorSubject<string[]>([]),
      history: new BehaviorSubject<string[]>([]),
      stats: new BehaviorSubject<{
        [key: string]: {
          size: string,
          dateCreated: Date,
          dateModified: Date
        }
      }>({})
    });

    private initialized: boolean = false;
    private watching: boolean = false;

    constructor(private ngZone: NgZone) { super(); }

    public getLocalFSObservables() { return this.localView.getValue(); }
    public getLocalFSObject() { return this.localView; }

    private setDirMap(dir: object) { this.ngZone.run(() => { this.getLocalFSObservables().dirMap.next(dir); }); }
    private setHighestDir(dir: string) { this.ngZone.run(() => { this.getLocalFSObservables().highestDir.next(dir); }); }
    private setCurrentViewDir(dir: string) { this.ngZone.run(() => { this.getLocalFSObservables().currentViewDir.next(dir); }); }
    private setCurrentViewDirContents(contents: any) { this.ngZone.run(() => { this.getLocalFSObservables().currentViewDirContents.next(contents); }); }
    private setHistory(dirs: string[]) { this.ngZone.run(() => { this.getLocalFSObservables().history.next(dirs); return dirs; }); }
    private setStats(allStats: object) { this.ngZone.run(() => { this.getLocalFSObservables().stats.next(allStats) }); }

    private getDirMap(): object { return this.getLocalFSObservables().dirMap.getValue(); }
    private getHighestDir(): object { return this.getLocalFSObservables().highestDir.getValue(); }
    private getCurrentViewDir(): string { return this.getLocalFSObservables().currentViewDir.getValue(); }
    private getCurrentViewDirContents(): string[] { return this.getLocalFSObservables().currentViewDirContents.getValue(); }
    private getHistory(): string[] { return this.getLocalFSObservables().history.getValue(); }
    private getStats(): object { return this.getLocalFSObservables().stats.getValue(); }

    private patchStats(path: string, stats, rm?: boolean) {
      let statList = this.getStats();
      console.log(stats);
      if (!rm) { // Add or modify stats listing
        if (!statList[path]) { statList[path] = {} }
        statList[path].size = stats.size;
        statList[path].dateModified = stats.atime;
        statList[path].dateCreated = stats.birthtime;
      } else { // Delete stats listing
        delete statList[path];
      }
      this.setStats(statList);
      console.log(this.getStats());
    }

    private async initialize(watcher: (FilesystemManager | string)) {
      if (!this.initialized) {
        if (typeof (watcher) === "object") { console.log("AAAAAAYYYYYYYYYYYYY"); this.watcher = watcher; }
        this.watcher.on("change", (path, stats) => {
          console.log("Change");
        });
        this.watcher.on("ready", (res) => {
          console.log("ready in browser")
          this.refresh(res.fs);
        })
        this.watcher.on("addFolder", (path, stats) => {
          this.patchStats(path, stats);
        })
        this.watcher.on("addFile", (path, stats) => {
          this.patchStats(path, stats);
        });

        if (typeof (watcher) === "object") {
          this.refresh(this.watcher.getValue());
        } else {
          console.log("watchFolder")
          await this.watcher.watchFolder(watcher);
        }
        this.initialized = true;
      }
      return this;
    }

    public isInitialized(): boolean {
      return this.initialized;
    }

    public bleat() {
      if (!this.initialized) {
        console.log(this.getDirMap());
      }
    }

    public refresh(folder?, stats?) {
      console.log("browsing");
      if (!!folder) {
        let folderNames = Object.keys(folder);
        this.setDirMap(folder);
        this.setHighestDir(folderNames[1]);
        this.goToFolder(folderNames[1]);
      }

      if (!!stats) {
        this.patchStats(stats.path, stats.stats)
      }
    }

    public pathByName(name: string): string {
      return this.getCurrentViewDir() + `\\` + name;
    }

    public isFolderByPath(path: string): boolean {
      return (!!this.getDirMap()[path]);
    }

    /** Slow string match against dir map */
    private contentsByPath(path): string[] {
      return this.getDirMap()[path];
    }

    /** Stuff related to dir nav */

    public goInFolder(folderName) {
      // This folder is being selected in the context of the current directory
      // So we need to find the current dir + folderName to make this a path, then send it to goToFolder
      this.goToFolder(this.pathByName(folderName));
    }

    public goToFolder(path) {
      this.pushHistory(path);
      this.viewFolder(path);
    }

    private viewFolder(path) {
      this.setCurrentViewDir(path);
      this.setCurrentViewDirContents(this.contentsByPath(path));
    }

    public goUpFolder() {
      this.goToFolder(this.getCurrentViewDir().substring(0, this.getCurrentViewDir().lastIndexOf(`\\`)));
    }

    public back() {
      let cn = this.popHistory();
      if (!cn) { return false; }
      this.viewFolder(cn);
    }

    private pushHistory(path) {
      let hs = this.getHistory();
      hs.push(path);
      this.setHistory(hs);
    }

    private popHistory() {
      let hs = this.getHistory();
      let ln = hs.length - 1;
      if (hs.length > 1) {
        hs.length = ln;
        this.setHistory(hs);
        return this.getHistory()[ln - 1];
      }
      else {
        return false;
      }
    }
    // let popped = this.getHistory().pop();
    // this.setHistory(this.getHistory().splice(this.getHistory().length - 1));
    // return popped;
  };
}