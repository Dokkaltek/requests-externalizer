import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupComponent } from './views/popup/popup.component';
import { SettingsComponent } from './views/settings/settings.component';
import { GeneralsettingsComponent } from './views/settings/generalsettings/generalsettings.component';
import { AppsettingsComponent } from './views/settings/appsettings/appsettings.component';
import { AboutComponent } from './views/settings/about/about.component';
import { HowtoComponent } from './views/settings/howto/howto.component';

const routes: Routes = [
  {path: 'popup', component: PopupComponent },
  {path: "", component: SettingsComponent, children: [
    {path: "", component: GeneralsettingsComponent, pathMatch: "full"},
    {path: "apps", component: AppsettingsComponent},
    {path: "about", component: AboutComponent},
    {path: "how-to", component: HowtoComponent},
  ]},
  {path: '**', redirectTo: '/'},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
