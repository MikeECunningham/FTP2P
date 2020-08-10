// app-routing.module.ts
import { TodoComponent } from '../components/todo/todo.component';
import { DetailRoutingModule } from './detail/detail-routing.module';
import { PageNotFoundComponent } from './shared/components';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {MeComponent} from '../components/me/me.component';
const routes: Routes = [
	{
		path: '',
		component: MeComponent
	},
  {
    path: '**',
    component: PageNotFoundComponent
  }
];
@NgModule({
	imports:
		[
			RouterModule.forRoot(routes, { useHash: true }),
			DetailRoutingModule
		],
	exports: [RouterModule]
})
export class AppRoutingModule { }
