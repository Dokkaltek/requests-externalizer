export interface Application {
  id: string;
  name: string;
  icon: string;
  command: string;
  description: string;
  contextMenu: ContextMenus;
  shortcut: string | null;
}

export interface ContextMenus {
  showInPage: boolean;
  showInLinks: boolean;
  showInImages: boolean;
  showInVideos: boolean;
  showInAudios: boolean;
}

export interface AppReference {
  app: Application, 
  position: number
}

export const DEFAULT_APP: Application = {
  id: "0",
  name: 'Create new app',
  icon: '',
  command: '#{show_app_creation}',
  description: 'Triggers creation of a new app',
  contextMenu: {
    showInPage: true,
    showInLinks: false,
    showInImages: false,
    showInVideos: false,
    showInAudios: false
  },
  shortcut: '',
};

Object.freeze(DEFAULT_APP);

export const NEW_APP: Application = {
  id: "-1",
  name: 'New application',
  icon: '',
  command: '',
  description: '',
  contextMenu: {
    showInPage: true,
    showInLinks: false,
    showInImages: false,
    showInVideos: false,
    showInAudios: false
  },
  shortcut: '',
};