import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RequesttableComponent } from './components/requesttable/requesttable.component';
import { CapitalizePipe } from './pipes/capitalize.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RequestsenderComponent } from './components/requestsender/requestsender.component';
import { AppselectorComponent } from './components/appselector/appselector.component';
import { PopupComponent } from './views/popup/popup.component';
import { SettingsComponent } from './views/settings/settings.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { GeneralsettingsComponent } from './views/settings/generalsettings/generalsettings.component';
import { AppsettingsComponent } from './views/settings/appsettings/appsettings.component';
import { AboutComponent } from './views/settings/about/about.component';
import { ApporganizerComponent } from './components/apporganizer/apporganizer.component';
import { ToastComponent } from './components/toast/toast.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent,
    RequesttableComponent,
    CapitalizePipe,
    RequestsenderComponent,
    AppselectorComponent,
    PopupComponent,
    SettingsComponent,
    GeneralsettingsComponent,
    AppsettingsComponent,
    AboutComponent,
    ApporganizerComponent,
    ToastComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule
  ],
  providers: [
    // This is needed because the manifest loads the index.html file, followed by a #,
    { provide: LocationStrategy, useClass: HashLocationStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
