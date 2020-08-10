import { Component, OnInit, NgZone, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import * as fsExtra from 'fs-extra';
import * as fs from 'fs';
import { BehaviorSubject } from 'rxjs';
import { stringify } from 'querystring';
import { FsBrowserService } from '../../services/fs-browser.service';

@NgModule({
  imports: [CommonModule]
})
@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss']
})
export class FolderComponent implements OnInit {

  private browser;
  private bIndex;
  displayedColumns: string[] = ["name", "size", "dateModified", "dateCreated"];
  obs: any = {};
  //driveLetter: BehaviorSubject<string>;
  dirMap: BehaviorSubject<object>;
  highestDir: BehaviorSubject<string>;
  currentViewDir: BehaviorSubject<string>;
  currentViewDirContents: BehaviorSubject<string[]>;
  // allDirs: BehaviorSubject<string[]>;
  // allDirsContents: BehaviorSubject<any[]>;
  history: BehaviorSubject<string[]>;
  stats: BehaviorSubject<{ [key: string]: { type: string, size: string, dateCreated: Date, dateModified: Date } }>;

  constructor(private fsBrowserService: FsBrowserService, private ngZone: NgZone) { }

  async ngOnInit() {
    //fs.mkdtemp() - LITERALLY A VIRTUAL DIRECTORY
    await this.reload();
  }

  populateObservables(obs) {
    this.ngZone.run(() => {
      console.log("ready")
      this.dirMap = obs.dirMap;
      this.highestDir = obs.highestDir;
      this.currentViewDir = obs.currentViewDir;
      this.currentViewDirContents = obs.currentViewDirContents;
      this.history = obs.history;
      this.stats = obs.stats;
    });
  }

  async reload() {
    let path = `C:\\ftptptest`
    this.browser = await this.fsBrowserService.watch(path);
    if (!this.browser) { console.log("Bad path"); return; }
    this.populateObservables(this.browser.getLocalFSObservables());
  }

  clickFile(fileName) {
    this.browser.goInFolder(fileName)
  }

  up() {
    this.browser.goUpFolder()
  }

  back() {
    this.browser.back();
  }

  async add() {
    await this.fsBrowserService.watch(`C:\\ftptptestalt`)
  }

  debugReport() {
    this.fsBrowserService.bleat();
  }

  nameToPathName(name: string): string {
    return this.browser.pathByName(name);
  }

  stringify(obj) {
    return JSON.stringify(obj);
  }

  // clearInput(event: MouseEvent) {
  //   if ((<HTMLElement>event.target).nodeName === 'MAT-ICON') {
  //     // this.value = '';
  //   }
  // }

  // deleteTask(index: number) {
  //   this.folder.removeDir
  // }

  // onAreaListControlChanged(index: number) {
  //   setTimeout(() => {
  //     const task = this.sample.splice(index, 1);
  //     //this.done.unshift(task[0]);
  //   }, 1000);
  // }

  // drop(event: CdkDragDrop<string[]>, type: string) {
  //   if (event.previousContainer !== event.container) {
  //     transferArrayItem(event.previousContainer.data, event.container.data,
  //       event.previousIndex, event.currentIndex);
  //   } else {
  //     if (type === 'file') {
  //       moveItemInArray(this.sample, event.previousIndex, event.currentIndex)
  //     } else {
  //       moveItemInArray(this.sample, event.previousIndex, event.currentIndex);
  //     }
  //   }
  // }
}
